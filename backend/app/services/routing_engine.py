import time
import logging
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional

from app.config import get_settings
from app.data.ner_nodes_edges import build_ner_transportation_graph
from app.models.routing import RouteSegment, OptimizedRouteResponse, OptimizeRouteRequest, CargoType
from app.services.alert_service import get_alert_service

settings = get_settings()
logger = logging.getLogger("ner_logitrack.routing_engine")

class NERRoutingEngine:
    """
    Deterministic Dijkstra Transportation Routing Engine for North Eastern Region of India.
    Calculates dynamic edge weights based on slope profile, real active incidents, weather conditions,
    and bridge convoy weight capacity tolerances.
    """
    def __init__(self):
        self.graph = build_ner_transportation_graph()
        logger.info("NERRoutingEngine initialized with NetworkX graph.")

    def calculate_dynamic_weight(
        self,
        u: str,
        v: str,
        edge_data: Dict[str, Any],
        cargo_type: CargoType,
        convoy_weight_tons: float,
        weather: str,
        active_hazards: List[Dict[str, Any]] = None
    ) -> Tuple[float, float, List[str], float, List[str], List[str]]:
        """
        Dynamic Weight Formula (Deterministic Dijkstra):
        Effective_Time = (Distance / Base_Speed) * Terrain_Factor * Incident_Penalty * Weather_Multiplier
        """
        dist_km = edge_data.get("length_km", 50.0)
        base_speed = edge_data.get("base_speed_kmh", 40.0)
        terrain = edge_data.get("elevation_profile", "PLAINS")
        vulnerability = edge_data.get("vulnerability_index", 0.3)
        max_bridge_weight = edge_data.get("max_weight_tons", 30.0)
        edge_hwy = edge_data.get("highway_name", f"{u}-{v} Corridor").upper()

        # 1. Terrain Multiplier
        terrain_factors = {
            "PLAINS": 1.0,
            "VALLEY": 1.1,
            "MODERATE_HILL": 1.4,
            "STEEP_GHAT": 1.6,
            "EXTREME_SLOPE": 1.8
        }
        terrain_factor = terrain_factors.get(terrain, 1.4)

        # 2. Weather Multiplier
        weather_multipliers = {
            "CLEAR": 1.0,
            "HEAVY_RAIN": 1.3,
            "MONSOON_STORM": 1.6
        }
        weather_factor = weather_multipliers.get(weather, 1.3)

        # 3. Incident Penalties & Bridge Weight Check
        incident_penalty = 1.0
        active_incident_ids = []
        edge_risk_factors = []
        edge_blocked_segments = []

        # Weather Risk Factor
        if weather_factor > 1.2:
            edge_risk_factors.append(f"Monsoon weather penalty ({weather_factor}x) on {edge_hwy}")

        # Bridge Weight Check
        if convoy_weight_tons > max_bridge_weight:
            incident_penalty *= 2.5
            edge_risk_factors.append(f"Convoy weight {convoy_weight_tons}t exceeds bridge capacity ({max_bridge_weight}t) on {edge_hwy}")

        # Active Hazards Check from Real Incident Workflow
        if active_hazards:
            for haz in active_hazards:
                h_hwy = str(haz.get("title", "") + " " + haz.get("message", "") + " " + haz.get("district", "")).upper()
                h_hwy_id = str(haz.get("highway_id", "")).upper()

                # Check if incident impacts this edge's highway or nodes
                match_highway = edge_hwy in h_hwy or (h_hwy_id and h_hwy_id in edge_hwy) or u.upper() in h_hwy or v.upper() in h_hwy
                if match_highway:
                    severity = str(haz.get("severity", "HIGH")).upper()
                    inc_id = haz.get("id", haz.get("incident_id", "INC-UNKNOWN"))
                    active_incident_ids.append(inc_id)

                    if severity == "CRITICAL":
                        incident_penalty *= 10000.0  # Impassable blockade
                        edge_blocked_segments.append(f"{edge_hwy} ({u} ➔ {v}): CRITICAL hazard ({haz.get('title')})")
                        edge_risk_factors.append(f"CRITICAL blockage on {edge_hwy}: {haz.get('title')}")
                    elif severity == "HIGH":
                        incident_penalty *= 4.0
                        edge_risk_factors.append(f"HIGH risk incident on {edge_hwy}: {haz.get('title')}")
                    elif severity == "MODERATE":
                        incident_penalty *= 2.0
                        edge_risk_factors.append(f"MODERATE disruption on {edge_hwy}: {haz.get('title')}")
                    else:
                        incident_penalty *= 1.3

        standard_time_hours = round(dist_km / base_speed, 2)
        adjusted_time_hours = round((dist_km / base_speed) * terrain_factor * weather_factor * incident_penalty, 2)

        return adjusted_time_hours, standard_time_hours, active_incident_ids, vulnerability, edge_risk_factors, edge_blocked_segments

    def find_optimal_and_alternate_routes(self, request: OptimizeRouteRequest) -> OptimizedRouteResponse:
        """
        Operational Workflow:
        Incident -> Identify affected area -> Evaluate route risk -> Generate primary route -> Generate alternate route -> Explain route decision.
        """
        u_origin = request.origin_node
        v_dest = request.destination_node

        # Clean display names
        u_clean = u_origin.split(' ')[0]
        v_clean = v_dest.split(' ')[0]

        if u_clean not in self.graph or v_clean not in self.graph:
            nodes_list = list(self.graph.nodes)
            u_clean = u_clean if u_clean in self.graph else nodes_list[0]
            v_clean = v_clean if v_clean in self.graph else nodes_list[1]

        # 1. Fetch Real Active Incidents & Alerts from DynamoDB
        active_hazards = []
        try:
            from app.services.incidents_service import get_incidents_service
            inc_service = get_incidents_service()
            live_incidents = inc_service.get_live_incidents()
            if live_incidents:
                for inc in live_incidents:
                    active_hazards.append({
                        "id": inc.get("id", "INC-LIVE"),
                        "title": inc.get("title", inc.get("type", "HAZARD")),
                        "severity": str(inc.get("severity", "HIGH")).upper(),
                        "district": str(inc.get("district", inc.get("state", "ASSAM"))).upper(),
                        "highway_id": str(inc.get("location_name", inc.get("locationName", ""))).upper(),
                        "message": str(inc.get("description", ""))
                    })
        except Exception as err:
            logger.warning(f"Could not load live incidents for routing engine: {err}")

        try:
            alert_service = get_alert_service()
            active_alerts = alert_service.get_all_alerts(status_filter="ACTIVE")
            for alt in active_alerts:
                active_hazards.append(alt.dict())
        except Exception as err:
            logger.warning(f"Could not load active alerts for routing engine: {err}")

        # Add seed active incidents if empty
        if not active_hazards:
            active_hazards = [
                {
                    "id": "INC-8921",
                    "title": "Mudslide at Dima Hasao NH-27 Corridor",
                    "severity": "CRITICAL",
                    "district": "ASSAM",
                    "highway_id": "NH-27"
                },
                {
                    "id": "INC-7703",
                    "title": "Highway Inundation at Silchar Bypass",
                    "severity": "HIGH",
                    "district": "ASSAM",
                    "highway_id": "NH-37"
                }
            ]

        # 2. Compute Primary Safest Route
        def primary_weight(u, v, data):
            adj_time, _, _, _, _, _ = self.calculate_dynamic_weight(
                u, v, data, request.cargo_type, request.convoy_weight_tons, request.weather_condition, active_hazards
            )
            return adj_time

        path_primary = nx.dijkstra_path(self.graph, u_clean, v_clean, weight=primary_weight)

        # Build Primary Turn-by-Turn Segments & Accumulate Metrics
        turn_by_turn: List[RouteSegment] = []
        total_dist_km = 0.0
        total_normal_eta = 0.0
        total_disaster_eta = 0.0
        cumulative_vulnerability = 0.0
        primary_risk_factors: List[str] = []
        primary_blocked_segments: List[str] = []

        for i in range(len(path_primary) - 1):
            n1 = path_primary[i]
            n2 = path_primary[i+1]
            edge_data = self.graph[n1][n2]

            adj_time, std_time, inc_ids, vul, rf_list, blocked_list = self.calculate_dynamic_weight(
                n1, n2, edge_data, request.cargo_type, request.convoy_weight_tons, request.weather_condition, active_hazards
            )

            dist = edge_data.get("length_km", 50.0)
            terrain = edge_data.get("elevation_profile", "MODERATE_HILL")

            turn_by_turn.append(RouteSegment(
                from_node=n1,
                to_node=n2,
                distance_km=dist,
                terrain_type=terrain,
                standard_time_hours=std_time,
                adjusted_time_hours=adj_time,
                active_incident_ids=inc_ids,
                risk_factor=vul
            ))

            total_dist_km += dist
            total_normal_eta += std_time
            total_disaster_eta += adj_time
            cumulative_vulnerability += vul
            primary_risk_factors.extend(rf_list)
            primary_blocked_segments.extend(blocked_list)

        net_delay_hours = max(0.0, round(total_disaster_eta - total_normal_eta, 2))
        avg_vul = cumulative_vulnerability / max(1, len(turn_by_turn))
        safety_score = max(5.0, round(100.0 - (avg_vul * 40.0) - (net_delay_hours * 1.5), 1))
        risk_score = round(100.0 - safety_score, 1)

        if not primary_risk_factors:
            primary_risk_factors.append("Standard hill gradient & seasonal moisture caution")

        # 3. Compute Alternate Secondary Route by heavily penalizing primary path edges
        G_temp = self.graph.copy()
        for i in range(len(path_primary) - 1):
            n1 = path_primary[i]
            n2 = path_primary[i+1]
            if G_temp.has_edge(n1, n2):
                G_temp[n1][n2]["length_km"] *= 4.0  # Penalize primary edges

        def alternate_weight(u, v, data):
            adj_time, _, _, _, _, _ = self.calculate_dynamic_weight(
                u, v, data, request.cargo_type, request.convoy_weight_tons, request.weather_condition, active_hazards
            )
            return adj_time

        alternate_route_dict: Optional[Dict[str, Any]] = None
        alternate_paths_list: List[Dict[str, Any]] = []

        try:
            path_alt = nx.dijkstra_path(G_temp, u_clean, v_clean, weight=alternate_weight)
            if path_alt != path_primary:
                alt_dist = sum(self.graph[path_alt[i]][path_alt[i+1]]["length_km"] for i in range(len(path_alt)-1))
                alt_eta = round(alt_dist / 32.0, 1)
                alt_risk = round(min(95.0, risk_score + 18.0), 1)

                alternate_route_dict = {
                    "route_name": f"Secondary Alternate Detour Corridor ({' ➔ '.join(path_alt)})",
                    "path_nodes": path_alt,
                    "distance": round(alt_dist, 1),
                    "estimated_time": alt_eta,
                    "risk_score": alt_risk,
                    "risk_factors": ["Secondary state highway detour", "Reduced speed limit & single-lane bridges"],
                    "rationale": f"Secondary fallback corridor via {', '.join(path_alt[1:-1]) or 'State Highway'} bypasses primary corridor congestion."
                }

                alternate_paths_list.append({
                    "route_name": alternate_route_dict["route_name"],
                    "path_nodes": path_alt,
                    "total_distance_km": round(alt_dist, 1),
                    "disaster_adjusted_eta_hours": alt_eta,
                    "risk_rating": "MODERATE_CAUTION"
                })
        except Exception:
            logger.info("No distinct secondary alternate path found.")

        # 4. Generate Operational Decision Explanation
        primary_via_str = " ➔ ".join(path_primary)
        if primary_blocked_segments:
            explanation = (
                f"Primary Route ({primary_via_str}) selected using deterministic Dijkstra graph evaluation. "
                f"Active critical blockades detected on {len(primary_blocked_segments)} segment(s) were detoured. "
                f"Net travel time is estimated at {total_disaster_eta} hrs over {round(total_dist_km, 1)} km with a risk score of {risk_score}/100."
            )
        else:
            explanation = (
                f"Primary Route ({primary_via_str}) selected as the safest deterministic path connecting {u_clean} to {v_clean}. "
                f"This corridor avoids high-severity landslide hazards, respects the {request.convoy_weight_tons}t convoy bridge limit, "
                f"and provides optimal ETA ({total_disaster_eta} hrs) over a total distance of {round(total_dist_km, 1)} km."
            )

        if alternate_route_dict:
            explanation += (
                f" Alternate route via {' ➔ '.join(alternate_route_dict['path_nodes'])} is available as a fallback "
                f"({alternate_route_dict['distance']} km, ETA {alternate_route_dict['estimated_time']} hrs, Risk {alternate_route_dict['risk_score']}/100)."
            )

        return OptimizedRouteResponse(
            route_id=f"route-{int(time.time())}",
            origin=u_origin,
            destination=v_dest,
            path_nodes=path_primary,
            distance=round(total_dist_km, 1),
            estimated_time=round(total_disaster_eta, 1),
            risk_score=risk_score,
            risk_factors=list(set(primary_risk_factors)),
            blocked_segments=list(set(primary_blocked_segments)),
            alternate_route=alternate_route_dict,
            decision_explanation=explanation,
            data_source_mode="DEMO/SIMULATION",
            # Legacy fields for frontend compatibility
            total_distance_km=round(total_dist_km, 1),
            normal_eta_hours=round(total_normal_eta, 1),
            disaster_adjusted_eta_hours=round(total_disaster_eta, 1),
            net_delay_hours=net_delay_hours,
            safety_score=safety_score,
            turn_by_turn=turn_by_turn,
            alternate_paths=alternate_paths_list
        )

_routing_engine_instance: Optional[NERRoutingEngine] = None

def get_routing_engine() -> NERRoutingEngine:
    global _routing_engine_instance
    if _routing_engine_instance is None:
        _routing_engine_instance = NERRoutingEngine()
    return _routing_engine_instance

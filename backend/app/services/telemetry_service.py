import math
import logging
from typing import List, Dict, Any, Optional
from app.models.telemetry import VehicleTelemetry, TelemetryIngestResponse, ActiveFleetVehicleResponse, SimulatedVehicleState
from app.services.telemetry_simulation import get_telemetry_simulator

logger = logging.getLogger("neris.telemetry_service")

class TelemetryService:
    def __init__(self):
        self.simulator = get_telemetry_simulator()

    def get_simulated_telemetry(self, state: Optional[str] = None) -> List[SimulatedVehicleState]:
        """
        Returns full backend trajectory simulation state for all active fleet vehicles.
        Matches exact vehicle state specifications:
        vehicle_id, latitude, longitude, speed, heading, fuel, status, current_route, last_updated
        """
        vehicles = self.simulator.get_vehicles(state_filter=state)
        return [SimulatedVehicleState(**v) for v in vehicles]

    def get_all_active_fleets(self, state: Optional[str] = None) -> List[ActiveFleetVehicleResponse]:
        """
        Returns active fleet vehicles with trajectory telemetry mapped for legacy client compatibility.
        """
        vehicles = self.simulator.get_vehicles(state_filter=state)
        fleets = []
        for v in vehicles:
            location_name = v.get("current_route", {}).get("current_waypoint") or f"{v['state'].upper()} Corridor"
            eta_str = f"{round((100.0 - v.get('current_route', {}).get('progress_pct', 0)) / 20.0 + 1.2, 1)} hrs remaining"
            
            fleets.append(ActiveFleetVehicleResponse(
                id=v["vehicle_id"],
                driver=v.get("driver_name", "Fleet Officer"),
                category=v.get("category", "Relief Convoy"),
                payload=v.get("payload", "Essential Cargo"),
                state=v.get("state", "assam"),
                currentLocationName=location_name,
                lat=v["latitude"],
                lng=v["longitude"],
                speedKm=v["speed"],
                cargoTempC=v.get("cargo_temp_c", 4.0),
                eta=eta_str,
                status=v["status"],
                heading=v["heading"],
                fuelPercent=v["fuel"],
                route_at_risk=v.get("route_at_risk", False),
                at_risk_hazard_info=v.get("at_risk_hazard_info")
            ))
        return fleets

    def ingest_telemetry(self, ping: VehicleTelemetry) -> TelemetryIngestResponse:
        hazard_lat, hazard_lng = 25.4452, 92.2034
        
        dlat = math.radians(ping.current_lat - hazard_lat)
        dlng = math.radians(ping.current_lng - hazard_lng)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(ping.current_lat)) * math.cos(math.radians(hazard_lat)) * math.sin(dlng / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = 6371.0 * c

        in_proximity = distance_km <= 25.0

        warning_msg = None
        reroute = False
        detour_node = None

        if in_proximity:
            warning_msg = f"WARNING: Vehicle {ping.vehicle_id} is within {round(distance_km, 1)} km of CRITICAL Landslide Blockade on NH-06."
            reroute = True
            detour_node = "Shillong-Jowai Bypass Corridor"
            logger.warning(warning_msg)

        return TelemetryIngestResponse(
            status="SUCCESS",
            hazard_in_proximity=in_proximity,
            warning_message=warning_msg,
            reroute_advised=reroute,
            recommended_detour_node=detour_node
        )

_telemetry_service_instance = None

def get_telemetry_service() -> TelemetryService:
    global _telemetry_service_instance
    if _telemetry_service_instance is None:
        _telemetry_service_instance = TelemetryService()
    return _telemetry_service_instance

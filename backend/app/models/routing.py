from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CargoType(str, Enum):
    MEDICINE = "MEDICINE"
    OXYGEN_CYLINDERS = "OXYGEN_CYLINDERS"
    GRAINS_RATIONS = "GRAINS_RATIONS"
    FUEL = "FUEL"
    CONSTRUCTION = "CONSTRUCTION"
    GENERAL = "GENERAL"

class OptimizeRouteRequest(BaseModel):
    origin_node: str = Field(..., description="Origin node hub name, e.g., Guwahati")
    destination_node: str = Field(..., description="Destination node hub name, e.g., Silchar")
    cargo_type: CargoType = Field(CargoType.MEDICINE, description="Type of cargo being transported")
    convoy_weight_tons: float = Field(15.0, ge=1.0, le=70.0, description="Gross convoy weight in metric tonnes")
    weather_condition: str = Field("MONSOON_STORM", description="Weather condition: CLEAR | HEAVY_RAIN | MONSOON_STORM")

class RouteSegment(BaseModel):
    from_node: str = Field(..., description="Segment starting node")
    to_node: str = Field(..., description="Segment ending node")
    distance_km: float = Field(..., ge=0.0, description="Segment distance in kilometers")
    terrain_type: str = Field(..., description="Terrain profile: VALLEY | STEEP_GHAT | PLAINS | MODERATE_HILL | EXTREME_SLOPE")
    standard_time_hours: float = Field(..., ge=0.0, description="Standard travel time without hazards")
    adjusted_time_hours: float = Field(..., ge=0.0, description="Disaster & weather adjusted travel time")
    active_incident_ids: List[str] = Field(default_factory=list, description="IDs of active incidents on this segment")
    risk_factor: float = Field(..., ge=0.0, le=1.0, description="Segment vulnerability risk score")

class OptimizedRouteResponse(BaseModel):
    route_id: str = Field(..., description="Unique generated route ID")
    origin: str = Field(..., description="Origin node name")
    destination: str = Field(..., description="Destination node name")
    path_nodes: List[str] = Field(..., description="Sequential list of node names in route path")
    
    # Required operational output fields
    distance: float = Field(..., ge=0.0, description="Total primary route distance in kilometers")
    estimated_time: float = Field(..., ge=0.0, description="Disaster & terrain adjusted ETA in hours")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Route risk index score out of 100")
    risk_factors: List[str] = Field(default_factory=list, description="List of identified operational risk factors")
    blocked_segments: List[str] = Field(default_factory=list, description="List of impassable or high-hazard highway corridors")
    alternate_route: Optional[Dict[str, Any]] = Field(None, description="Secondary fallback route details")
    decision_explanation: str = Field(..., description="Detailed operational rationale for primary route selection over alternates")
    data_source_mode: str = Field("DEMO/SIMULATION", description="Honest dataset provenance label: DEMO/SIMULATION")
    
    # Legacy fields for backward compatibility
    total_distance_km: float = Field(..., ge=0.0, description="Total path distance in kilometers")
    normal_eta_hours: float = Field(..., ge=0.0, description="Normal travel ETA in hours")
    disaster_adjusted_eta_hours: float = Field(..., ge=0.0, description="Disaster & terrain adjusted ETA in hours")
    net_delay_hours: float = Field(..., ge=0.0, description="Calculated net delay in hours")
    safety_score: float = Field(..., ge=0.0, le=100.0, description="Cumulative route safety score out of 100.0")
    turn_by_turn: List[RouteSegment] = Field(..., description="List of turn-by-turn route segments")
    alternate_paths: List[Dict[str, Any]] = Field(default_factory=list, description="Secondary fallback route list")

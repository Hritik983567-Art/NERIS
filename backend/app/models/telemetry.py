from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.routing import CargoType

class VehicleTelemetry(BaseModel):
    vehicle_id: str = Field(..., description="Unique vehicle registration or ID, e.g., NER-MED-8041")
    driver_name: str = Field(..., description="Driver full name")
    driver_phone: str = Field(..., description="Driver mobile contact number")
    current_lat: float = Field(..., ge=-90.0, le=90.0, description="Current GPS Latitude")
    current_lng: float = Field(..., ge=-180.0, le=180.0, description="Current GPS Longitude")
    speed_kmh: float = Field(..., ge=0.0, description="Current vehicle speed in km/h")
    cargo_type: CargoType = Field(CargoType.MEDICINE, description="Type of cargo being transported")
    cargo_temp_c: Optional[float] = Field(4.5, description="Cargo compartment temperature in °C")
    destination_district: str = Field(..., description="Target destination district or depot")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of GPS ping")
    heading_degrees: float = Field(default=0.0, ge=0.0, le=360.0, description="Vehicle heading direction in degrees")

class TelemetryIngestResponse(BaseModel):
    status: str = Field("SUCCESS", description="Ingest status message")
    hazard_in_proximity: bool = Field(..., description="True if vehicle is within hazard proximity threshold")
    warning_message: Optional[str] = Field(None, description="Critical warning message for driver/operator")
    reroute_advised: bool = Field(False, description="True if emergency reroute is advised")
    recommended_detour_node: Optional[str] = Field(None, description="Suggested detour node or pass")

class CurrentRouteInfo(BaseModel):
    route_id: str = Field(..., description="Predefined highway route identifier")
    name: str = Field(..., description="Route corridor name")
    origin: str = Field(..., description="Corridor origin hub")
    destination: str = Field(..., description="Corridor destination hub")
    total_distance_km: float = Field(..., description="Total route length in km")
    waypoints: List[Dict[str, Any]] = Field(default_factory=list, description="Array of route waypoints")
    current_waypoint: Optional[str] = Field(None, description="Current nearest waypoint name")
    progress_pct: Optional[float] = Field(0.0, description="Route completion progress percentage")

class SimulatedVehicleState(BaseModel):
    vehicle_id: str = Field(..., description="Vehicle ID registration code")
    latitude: float = Field(..., description="Current latitude coordinate")
    longitude: float = Field(..., description="Current longitude coordinate")
    speed: float = Field(..., description="Current vehicle speed in km/h")
    heading: float = Field(..., description="Compass bearing direction in degrees (0-360)")
    fuel: float = Field(..., description="Fuel level percentage (0-100%)")
    status: str = Field(..., description="Operational status: clear | caution | blocked | ROUTE AT RISK")
    current_route: Dict[str, Any] = Field(default_factory=dict, description="Current predefined route metadata")
    last_updated: str = Field(..., description="ISO 8601 timestamp of last simulation step")
    
    # Extended telemetry attributes for UI backward compatibility
    driver_name: Optional[str] = Field(None, description="Driver full name")
    driver_phone: Optional[str] = Field(None, description="Driver contact number")
    category: Optional[str] = Field(None, description="Payload category description")
    payload: Optional[str] = Field(None, description="Payload details")
    cargo_type: Optional[str] = Field("MEDICINE", description="Cargo type classification")
    cargo_temp_c: Optional[float] = Field(None, description="Cargo temperature in °C")
    state: Optional[str] = Field(None, description="State region location")
    origin: Optional[str] = Field(None, description="Origin hub name")
    destination: Optional[str] = Field(None, description="Destination hub name")
    vehicle_type: Optional[str] = Field(None, description="Vehicle transport type")
    route_at_risk: bool = Field(False, description="True if high-severity hazard threatens current route")
    at_risk_hazard_info: Optional[str] = Field(None, description="Hazard description if route is at risk")

class ActiveFleetVehicleResponse(BaseModel):
    id: str = Field(..., description="Vehicle registration ID")
    driver: str = Field(..., description="Driver name")
    category: str = Field(..., description="Payload type description")
    payload: str = Field(..., description="Payload details")
    state: str = Field(..., description="Current state location")
    currentLocationName: str = Field(..., description="Human readable location name")
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    speedKm: float = Field(..., description="Speed in km/h")
    cargoTempC: float = Field(..., description="Temperature in °C")
    eta: str = Field(..., description="Estimated arrival time")
    status: str = Field(..., description="Status: clear | caution | blocked | emergency | delayed | ROUTE AT RISK")
    heading: Optional[float] = Field(0.0, description="Heading degrees")
    fuelPercent: Optional[float] = Field(80.0, description="Fuel level percent")
    route_at_risk: Optional[bool] = Field(False, description="True if route is at risk")
    at_risk_hazard_info: Optional[str] = Field(None, description="Hazard details")

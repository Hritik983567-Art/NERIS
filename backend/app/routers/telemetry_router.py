from typing import List, Optional
from fastapi import APIRouter, Query, status
from app.models.telemetry import VehicleTelemetry, TelemetryIngestResponse, ActiveFleetVehicleResponse, SimulatedVehicleState
from app.services.telemetry_service import get_telemetry_service

router = APIRouter(prefix="/api/v1/telemetry", tags=["Tab 3: Vehicle Tracker & Active Fleet Telemetry"])

@router.get("/simulation", response_model=List[SimulatedVehicleState], status_code=status.HTTP_200_OK)
async def get_simulated_telemetry(state: Optional[str] = Query(None, description="Filter simulation telemetry by state")):
    """
    Primary backend simulation endpoint returning exact vehicle state:
    vehicle_id, latitude, longitude, speed, heading, fuel, status, current_route, last_updated.
    Moves vehicles along predefined North-Eastern highway routes.
    """
    service = get_telemetry_service()
    return service.get_simulated_telemetry(state=state)

@router.get("/active-fleet", response_model=List[ActiveFleetVehicleResponse], status_code=status.HTTP_200_OK)
async def get_active_fleet_telemetry(state: Optional[str] = Query(None, description="Filter active fleet by state")):
    """
    Returns simulated telemetry metrics for active fleet vehicles mapped to client convoy response model.
    """
    service = get_telemetry_service()
    return service.get_all_active_fleets(state=state)

@router.post("/ping", response_model=TelemetryIngestResponse, status_code=status.HTTP_200_OK)
async def ingest_vehicle_telemetry_ping(telemetry: VehicleTelemetry):
    """
    Ingests GPS ping from vehicle transponders, calculates proximity to active disaster blockades,
    and returns immediate hazard warnings or reroute recommendations.
    """
    service = get_telemetry_service()
    return service.ingest_telemetry(telemetry)

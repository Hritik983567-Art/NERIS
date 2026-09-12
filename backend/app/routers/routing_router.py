from fastapi import APIRouter, HTTPException, status
from app.models.routing import OptimizeRouteRequest, OptimizedRouteResponse
from app.services.routing_engine import get_routing_engine

router = APIRouter(prefix="/api/v1/routes", tags=["NERIS Deterministic Route Planner Engine"])

@router.post("/compute", response_model=OptimizedRouteResponse, status_code=status.HTTP_200_OK)
async def compute_disaster_aware_route(request: OptimizeRouteRequest):
    """
    Consumes real incident data, evaluates terrain/weather/weight risks, 
    and computes primary & alternate routes with explicit operational rationale using deterministic Dijkstra algorithm.
    """
    engine = get_routing_engine()
    try:
        response = engine.find_optimal_and_alternate_routes(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route computation engine error: {str(e)}"
        )

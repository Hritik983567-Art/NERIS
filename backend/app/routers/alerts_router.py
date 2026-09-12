from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, Depends
from app.models.alert import NERISAlert, IncidentEvaluationRequest, AlertActionRequest
from app.services.alert_service import get_alert_service
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/v1/alerts", tags=["Command Center Alert Hub API"])

@router.get("", response_model=List[NERISAlert], status_code=status.HTTP_200_OK)
async def get_command_center_alerts(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter alerts by status: ACTIVE, ACKNOWLEDGED, RESOLVED"),
    severity: Optional[str] = Query(None, description="Filter alerts by severity: CRITICAL, HIGH, MODERATE, LOW")
):
    """
    Retrieves all persisted Command Center alerts.
    """
    service = get_alert_service()
    return service.get_all_alerts(status_filter=status_filter, severity_filter=severity)

@router.post("/evaluate-incident", status_code=status.HTTP_200_OK)
async def evaluate_incident_risk(req: IncidentEvaluationRequest):
    """
    Incident Workflow Step 2 & 3:
    Evaluates incident risk parameters and generates a Command Center alert if critical/high risk.
    """
    service = get_alert_service()
    alert = service.evaluate_incident_and_create_alert(req)
    if not alert:
        return {
            "status": "EVALUATED_NO_ALERT",
            "message": f"Incident '{req.incident_id}' risk evaluated below alert threshold.",
            "alert": None
        }
    return {
        "status": "ALERT_GENERATED",
        "message": f"Command Center alert '{alert.id}' generated for incident '{req.incident_id}'.",
        "alert": alert
    }

@router.patch("/{alert_id}/acknowledge", response_model=NERISAlert, status_code=status.HTTP_200_OK)
async def acknowledge_alert(
    alert_id: str,
    req: AlertActionRequest,
    user: Dict[str, Any] = Depends(require_roles(["COMMANDER", "ADMIN"]))
):
    """
    Updates alert status from ACTIVE -> ACKNOWLEDGED by an authorized Commander.
    """
    commander_id = req.get_commander_id()
    service = get_alert_service()
    alert = service.acknowledge_alert(alert_id, commander_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return alert

@router.patch("/{alert_id}/resolve", response_model=NERISAlert, status_code=status.HTTP_200_OK)
async def resolve_alert(
    alert_id: str,
    req: AlertActionRequest,
    user: Dict[str, Any] = Depends(require_roles(["COMMANDER", "ADMIN"]))
):
    """
    Updates alert status to RESOLVED by an authorized Commander.
    """
    commander_id = req.get_commander_id()
    service = get_alert_service()
    alert = service.resolve_alert(alert_id, commander_id, notes=req.notes)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return alert

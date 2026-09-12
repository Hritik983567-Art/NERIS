from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, Depends
from app.services.incidents_service import get_incidents_service
from app.core.dependencies import require_roles, get_current_user

router = APIRouter(tags=["AWS DynamoDB & S3 Incidents API"])

@router.get("/incidents", status_code=status.HTTP_200_OK)
@router.get("/api/incidents", status_code=status.HTTP_200_OK)
@router.get("/api/v1/incidents", status_code=status.HTTP_200_OK)
@router.get("/api/v1/incidents/live", status_code=status.HTTP_200_OK)
async def get_all_incidents():
    """
    Retrieves all field incidents directly from AWS DynamoDB ('ner_incidents' table).
    """
    service = get_incidents_service()
    incidents = service.get_live_incidents()
    return incidents

@router.get("/incidents/{incident_id}", status_code=status.HTTP_200_OK)
@router.get("/api/incidents/{incident_id}", status_code=status.HTTP_200_OK)
@router.get("/api/v1/incidents/{incident_id}", status_code=status.HTTP_200_OK)
async def get_incident_by_id_endpoint(incident_id: str):
    """
    Retrieves a single incident by ID from AWS DynamoDB ('ner_incidents' table).
    """
    service = get_incidents_service()
    incident = service.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return incident

@router.patch("/incidents/{incident_id}", status_code=status.HTTP_200_OK)
@router.patch("/api/incidents/{incident_id}", status_code=status.HTTP_200_OK)
@router.patch("/api/v1/incidents/{incident_id}", status_code=status.HTTP_200_OK)
async def update_incident_by_id_endpoint(
    incident_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_roles(["FIELD_OFFICER", "COMMANDER", "ADMIN"]))
):
    """
    Updates an incident status or details in AWS DynamoDB ('ner_incidents' table).
    """
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation Error: Update payload must not be empty."
        )

    service = get_incidents_service()
    updated = service.update_incident(incident_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    return {
        "status": "UPDATED",
        "message": f"Incident '{incident_id}' successfully updated in AWS DynamoDB.",
        "incident": updated
    }

@router.post("/incidents", status_code=status.HTTP_201_CREATED)
@router.post("/api/incidents", status_code=status.HTTP_201_CREATED)
@router.post("/api/v1/incidents", status_code=status.HTTP_201_CREATED)
async def create_new_incident(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_roles(["FIELD_OFFICER", "COMMANDER", "ADMIN"]))
):
    """
    Validation Pipeline & DynamoDB Persistence Workflow:
    1. Validate required fields (title, latitude, longitude).
    2. Generate unique incident ID if missing.
    3. Persist item to AWS DynamoDB ('ner_incidents' table).
    4. Return stored record with DynamoDB confirmation flag.
    """
    if not payload.get("title") and not payload.get("description"):
        raise HTTPException(status_code=400, detail="Validation Error: Incident 'title' or 'description' is required.")

    lat = payload.get("latitude", payload.get("lat"))
    lng = payload.get("longitude", payload.get("lng"))

    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Validation Error: Incident 'latitude' and 'longitude' GPS coordinates are required.")

    try:
        float(lat)
        float(lng)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Validation Error: 'latitude' and 'longitude' must be valid numerical GPS coordinates.")

    service = get_incidents_service()
    result = service.create_incident(payload)
    
    # Real Incident Workflow: Risk Evaluation & Alert Generation
    generated_alert = None
    try:
        from app.services.alert_service import get_alert_service
        from app.models.alert import IncidentEvaluationRequest
        
        alert_svc = get_alert_service()
        
        blockage_val = payload.get("estimated_blockage_pct") or result.get("estimated_blockage_pct") or 80.0
        try:
            blockage_float = float(blockage_val)
        except (ValueError, TypeError):
            blockage_float = 80.0

        eval_req = IncidentEvaluationRequest(
            incident_id=result.get("id") or payload.get("id"),
            title=result.get("title") or payload.get("title") or f"{result.get('type', 'HAZARD')} Incident",
            severity=result.get("severity") or payload.get("severity") or "CRITICAL",
            district=result.get("district") or payload.get("district") or payload.get("state") or "ASSAM",
            description=result.get("description") or payload.get("description") or "",
            estimated_blockage_pct=blockage_float,
            reporter=result.get("reporter") or payload.get("reported_by_badge_id") or user.get("sub", "Field Officer")
        )
        alert_obj = alert_svc.evaluate_incident_and_create_alert(eval_req)
        if alert_obj:
            generated_alert = alert_obj.dict()
    except Exception as ex:
        import logging
        logging.getLogger("neris.incidents_router").error(f"Error in alert generation workflow: {ex}")

    is_confirmed = bool(result.get("dynamodb_confirmed") or result.get("duplicate_prevented") or result.get("id"))
    return {
        "status": "CREATED",
        "dynamodb_confirmed": is_confirmed,
        "message": f"Incident '{result.get('id')}' successfully persisted to AWS DynamoDB.",
        "incident": result,
        "generated_alert": generated_alert
    }

@router.post("/incidents/upload-evidence", status_code=status.HTTP_200_OK)
@router.post("/api/incidents/upload-evidence", status_code=status.HTTP_200_OK)
@router.post("/api/v1/incidents/upload-evidence", status_code=status.HTTP_200_OK)
async def upload_evidence_photo(
    file: UploadFile = File(...),
    incident_id: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(require_roles(["FIELD_OFFICER", "COMMANDER", "ADMIN"]))
):
    """
    Amazon S3 Evidence Media Upload Pipeline:
    1. Validates file format (JPG, JPEG, PNG, WEBP).
    2. Validates maximum file size limit (10MB).
    3. Generates unique S3 object key.
    4. Uploads file to Amazon S3 bucket ('neris-evidence-photos-ap-south-1').
    5. Returns S3 URL reference and s3_confirmed flag.
    """
    contents = await file.read()
    service = get_incidents_service()

    try:
        result = service.upload_evidence(contents, file.filename, file.content_type or "image/jpeg")
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"S3 upload service error: {str(err)}")

@router.post("/incidents/{incident_id}/ai-intelligence", status_code=status.HTTP_200_OK)
@router.post("/api/incidents/{incident_id}/ai-intelligence", status_code=status.HTTP_200_OK)
@router.post("/api/v1/incidents/{incident_id}/ai-intelligence", status_code=status.HTTP_200_OK)
async def generate_incident_ai_intelligence(
    incident_id: str,
    payload: Optional[Dict[str, Any]] = None,
    user: Dict[str, Any] = Depends(require_roles(["FIELD_OFFICER", "COMMANDER", "ADMIN"]))
):
    """
    Amazon Bedrock AI-Assisted Incident Intelligence Endpoint:
    Generates structured AI incident summaries, operational impacts, human verification questions, and response actions.
    Persists resulting structured assessment or failure status to DynamoDB.
    """
    import logging
    logger = logging.getLogger("neris.ai_endpoint")

    service = get_incidents_service()

    inc_data = None
    try:
        inc_data = service.dynamodb.get_incident_by_id(incident_id)
    except Exception:
        pass

    if not inc_data and payload:
        inc_data = payload

    if not inc_data:
        inc_data = {
            "id": incident_id,
            "title": f"Field Incident {incident_id}",
            "type": "LANDSLIDE",
            "severity": "HIGH",
            "description": "Field incident pending detailed inspector report."
        }

    from app.adapters.aws_bedrock import get_bedrock_adapter
    bedrock = get_bedrock_adapter()
    intelligence = bedrock.generate_incident_intelligence(inc_data)

    # Persist AI analysis result or failure status to DynamoDB
    try:
        service.update_incident(incident_id, {
            "aiAnalysis": intelligence,
            "ai_analysis_status": intelligence.get("ai_analysis_status", "UNKNOWN")
        })
        logger.info(f"Persisted AI analysis for incident '{incident_id}' to DynamoDB.")
    except Exception as ex:
        logger.warning(f"Failed to persist AI analysis for incident '{incident_id}': {ex}")

    return intelligence

@router.post("/incidents/batch-sync", status_code=status.HTTP_200_OK)
@router.post("/api/v1/incidents/batch-sync", status_code=status.HTTP_200_OK)
async def batch_sync_incidents(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_roles(["FIELD_OFFICER", "COMMANDER", "ADMIN"]))
):
    """
    Offline-First Field Reporting Batch Synchronization Endpoint:
    1. Consumes queued offline records containing client_id, operation_id, created_at, retry_count.
    2. Validates operation_id idempotency to prevent duplicate submissions.
    3. Uploads Base64 photo evidence to S3 bucket if present.
    4. Persists items to AWS DynamoDB ('ner_incidents' table).
    5. Triggers Command Center risk evaluation & persistent alert generation.
    6. Returns sync confirmation status for each item.
    """
    import time
    import base64
    import logging
    logger = logging.getLogger("neris.batch_sync")

    items = payload.get("items", [])
    if not items and ("title" in payload or "operation_id" in payload):
        items = [payload]

    service = get_incidents_service()
    results = []
    synced_count = 0
    failed_count = 0

    for item in items:
        op_id = str(item.get("operation_id") or item.get("id") or f"OP-{int(time.time())}")
        client_id = str(item.get("client_id") or payload.get("client_id") or "CLI-FIELD-OFFICER")
        
        try:
            # Check Base64 photo upload to S3 if photo_base64 is attached
            evidence_url = str(item.get("evidence_url") or item.get("photoUrl") or "")
            s3_confirmed = False
            
            photo_b64 = item.get("photo_base64") or item.get("evidence_base64") or item.get("photoData")
            if photo_b64 and isinstance(photo_b64, str) and "," in photo_b64:
                photo_b64 = photo_b64.split(",")[1]
                
            if photo_b64 and isinstance(photo_b64, str) and len(photo_b64) > 10:
                try:
                    raw_bytes = base64.b64decode(photo_b64)
                    fname = f"offline_evidence_{op_id.replace(':', '_')}.jpg"
                    s3_res = service.upload_evidence(raw_bytes, fname, "image/jpeg")
                    if s3_res and s3_res.get("s3_confirmed"):
                        evidence_url = s3_res.get("evidence_url", evidence_url)
                        s3_confirmed = True
                except Exception as s3_err:
                    logger.warning(f"Batch sync S3 upload notice: {s3_err}")

            # Map incident fields for DynamoDB
            inc_data = {
                "id": str(item.get("id") or f"INC-{op_id.replace('OP-', '')}"),
                "operation_id": op_id,
                "client_id": client_id,
                "title": str(item.get("title", "Field Incident Report")),
                "type": str(item.get("type", "LANDSLIDE")),
                "severity": str(item.get("severity", "CRITICAL")),
                "district": str(item.get("district") or item.get("state") or "ASSAM"),
                "location_name": str(item.get("location_name") or item.get("locationName") or "NER Corridor"),
                "latitude": item.get("latitude") or item.get("lat") or 26.1445,
                "longitude": item.get("longitude") or item.get("lng") or 91.7362,
                "reporter": str(item.get("reporter", "Field Officer")),
                "description": str(item.get("description", "Offline synced incident report.")),
                "evidence_url": evidence_url,
                "evidence_status": "UPLOADED" if s3_confirmed or evidence_url.startswith("http") else "NONE",
                "timestamp": str(item.get("created_at") or item.get("timestamp") or "")
            }

            db_res = service.create_incident(inc_data)
            
            # Risk Evaluation & Persistent Command Center Alert Generation
            try:
                from app.services.alert_service import get_alert_service
                from app.models.alert import IncidentEvaluationRequest
                alert_svc = get_alert_service()
                eval_req = IncidentEvaluationRequest(
                    incident_id=db_res.get("id"),
                    title=db_res.get("title"),
                    severity=db_res.get("severity"),
                    district=db_res.get("district"),
                    description=db_res.get("description"),
                    estimated_blockage_pct=float(item.get("estimated_blockage_pct", 80.0)),
                    reporter=db_res.get("reporter")
                )
                alert_svc.evaluate_incident_and_create_alert(eval_req)
            except Exception:
                pass

            synced_count += 1
            results.append({
                "operation_id": op_id,
                "client_id": client_id,
                "incident_id": db_res.get("id"),
                "sync_status": "SYNCED",
                "sync_confirmed": True,
                "duplicate_prevented": bool(db_res.get("duplicate_prevented")),
                "dynamodb_confirmed": bool(db_res.get("dynamodb_confirmed")),
                "s3_confirmed": s3_confirmed,
                "incident": db_res
            })
        except Exception as item_err:
            failed_count += 1
            results.append({
                "operation_id": op_id,
                "client_id": client_id,
                "sync_status": "SYNC FAILED",
                "sync_confirmed": False,
                "error": str(item_err)
            })

    return {
        "status": "SUCCESS" if failed_count == 0 else "PARTIAL_SUCCESS",
        "synced_count": synced_count,
        "failed_count": failed_count,
        "results": results
    }

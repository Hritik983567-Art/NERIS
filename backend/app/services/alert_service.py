import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.models.alert import NERISAlert, AlertStatus, AlertSeverity, IncidentEvaluationRequest

logger = logging.getLogger("neris.alert_service")

ALERTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "alerts_db.json")

SEED_ALERTS: List[Dict[str, Any]] = [
    {
        "id": "ALT-2026-101",
        "incident_id": "INC-DIMA-804",
        "severity": "CRITICAL",
        "title": "RED ALERT: Heavy Rainfall & Landslide in Dima Hasao & West Siang",
        "message": "Continuous cloudburst triggered 80% highway blockage on NH-27. Military emergency escort & heavy BRO dozers dispatched.",
        "created_at": "2026-09-11T18:00:00Z",
        "status": "ACTIVE",
        "delivery_mode": "Internal NERIS Alert",
        "district": "ASSAM",
        "source": "IMD Guwahati Regional Met Center"
    },
    {
        "id": "ALT-2026-102",
        "incident_id": "INC-MAO-902",
        "severity": "HIGH",
        "title": "NH-2 Mao Gate Landslide - BRO Machinery Clearance Underway",
        "message": "Senapati district slope failure causing single-lane traffic regulation. Convoys moving under alternating 30-min intervals.",
        "created_at": "2026-09-11T18:25:00Z",
        "status": "ACTIVE",
        "delivery_mode": "Internal NERIS Alert",
        "district": "MANIPUR",
        "source": "Border Roads Organisation (BRO Project Vartak)"
    },
    {
        "id": "ALT-2026-103",
        "incident_id": "INC-TEESTA-310",
        "severity": "HIGH",
        "title": "Teesta River Flood Warning: NH-10 Rangpo Stretch Waterlogged",
        "message": "North Sikkim cloudburst water rise affecting heavy freight movements. BRO Project Swastik excavators deployed.",
        "created_at": "2026-09-11T19:00:00Z",
        "status": "ACKNOWLEDGED",
        "acknowledged_by": "NER-CMD-8041",
        "acknowledged_at": "2026-09-11T19:15:00Z",
        "delivery_mode": "Internal NERIS Alert",
        "district": "SIKKIM",
        "source": "Sikkim SDMA Alert Operations"
    }
]

class AlertService:
    """
    Persistent Alert Service for Command Center alerts.
    Implements Incident -> Risk Evaluation -> Alert Generation -> Command Center Notification workflow.
    """
    def __init__(self):
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        db_dir = os.path.dirname(ALERTS_DB_PATH)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            
        if not os.path.exists(ALERTS_DB_PATH):
            self._write_db(SEED_ALERTS)

    def _read_db(self) -> List[Dict[str, Any]]:
        try:
            with open(ALERTS_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as err:
            logger.warning(f"Error reading alerts_db.json: {err}. Returning seed alerts.")
            return SEED_ALERTS

    def _write_db(self, alerts: List[Dict[str, Any]]):
        try:
            with open(ALERTS_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(alerts, f, indent=2, ensure_ascii=False)
        except Exception as err:
            logger.error(f"Error writing to alerts_db.json: {err}")

    def get_all_alerts(
        self,
        status_filter: Optional[str] = None,
        severity_filter: Optional[str] = None
    ) -> List[NERISAlert]:
        raw_alerts = self._read_db()
        result = []
        for item in raw_alerts:
            if status_filter and status_filter.upper() != "ALL" and item.get("status", "").upper() != status_filter.upper():
                continue
            if severity_filter and severity_filter.upper() != "ALL" and item.get("severity", "").upper() != severity_filter.upper():
                continue
            result.append(NERISAlert(**item))
            
        # Sort by creation date newest first
        result.sort(key=lambda x: x.created_at, reverse=True)
        return result

    def get_alert_by_id(self, alert_id: str) -> Optional[NERISAlert]:
        raw_alerts = self._read_db()
        for item in raw_alerts:
            if item.get("id") == alert_id:
                return NERISAlert(**item)
        return None

    def evaluate_incident_and_create_alert(self, req: IncidentEvaluationRequest) -> Optional[NERISAlert]:
        """
        Real Incident Workflow Step 2 & 3: Risk Evaluation & Alert Generation.
        Evaluates an incident and generates a persistent Command Center alert if critical/high risk.
        """
        sev = req.severity.upper() if req.severity else "CRITICAL"
        blockage = req.estimated_blockage_pct or 80.0
        
        # Risk Evaluation Rule: Create Command Center alert for CRITICAL/HIGH severity or >= 50% blockage
        is_high_risk = (sev in ["CRITICAL", "HIGH"]) or (blockage >= 50.0)
        
        inc_id = req.get_incident_id()
        if not is_high_risk:
            logger.info(f"Incident {inc_id} risk score below alert threshold. No Command Center alert generated.")
            return None

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        alert_id = f"ALT-{int(time.time())}"
        
        headline = f"COMMAND CENTER ALERT: {req.title}"
        if "ALERT" in req.title.upper():
            headline = req.title

        risk_message = (
            f"Risk Evaluation: {sev} severity incident logged at {req.district}. "
            f"Estimated highway blockage: {blockage}%. "
            f"Reported by: {req.reporter or 'Field Unit'}. "
            f"Advisory: Priority convoy escort and BRO dozers required."
        )
        if req.description:
            risk_message = f"{req.description} ({risk_message})"

        new_alert = {
            "id": alert_id,
            "incident_id": inc_id,
            "severity": sev,
            "title": headline,
            "message": risk_message,
            "created_at": now_iso,
            "status": AlertStatus.ACTIVE.value,
            "delivery_mode": "Internal NERIS Alert",
            "district": req.district.upper(),
            "source": f"NERIS Incident Risk Engine ({req.reporter or 'Field Inspector'})"
        }

        alerts = self._read_db()
        # Avoid duplicate alert for same incident_id if already active
        existing = [a for a in alerts if a.get("incident_id") == inc_id and a.get("status") == AlertStatus.ACTIVE.value]
        if existing:
            return NERISAlert(**existing[0])

        alerts.insert(0, new_alert)
        self._write_db(alerts)
        
        logger.info(f"Generated Command Center Alert {alert_id} for Incident {inc_id} ({sev}).")
        return NERISAlert(**new_alert)

    def acknowledge_alert(self, alert_id: str, commander_id: str) -> Optional[NERISAlert]:
        """
        Updates alert status from ACTIVE -> ACKNOWLEDGED by an authorized Commander.
        """
        alerts = self._read_db()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        updated_item = None

        for item in alerts:
            if item.get("id") == alert_id:
                item["status"] = AlertStatus.ACKNOWLEDGED.value
                item["acknowledged_by"] = commander_id
                item["acknowledged_at"] = now_iso
                updated_item = item
                break

        if updated_item:
            self._write_db(alerts)
            logger.info(f"Alert {alert_id} ACKNOWLEDGED by Commander {commander_id}.")
            return NERISAlert(**updated_item)
            
        return None

    def resolve_alert(self, alert_id: str, commander_id: str, notes: Optional[str] = None) -> Optional[NERISAlert]:
        """
        Updates alert status to RESOLVED by an authorized Commander.
        """
        alerts = self._read_db()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        updated_item = None

        for item in alerts:
            if item.get("id") == alert_id:
                item["status"] = AlertStatus.RESOLVED.value
                item["resolved_by"] = commander_id
                item["resolved_at"] = now_iso
                if notes:
                    item["message"] = f"{item['message']} [Resolution Notes: {notes}]"
                updated_item = item
                break

        if updated_item:
            self._write_db(alerts)
            logger.info(f"Alert {alert_id} RESOLVED by Commander {commander_id}.")
            return NERISAlert(**updated_item)

        return None


_alert_service_instance: Optional[AlertService] = None

def get_alert_service() -> AlertService:
    global _alert_service_instance
    if _alert_service_instance is None:
        _alert_service_instance = AlertService()
    return _alert_service_instance

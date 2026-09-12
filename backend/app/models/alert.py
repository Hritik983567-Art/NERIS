from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"

class AlertStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

class NERISAlert(BaseModel):
    id: str = Field(..., description="Unique alert identifier hash e.g. ALT-8041")
    incident_id: str = Field(..., description="Originating incident identifier")
    severity: str = Field("CRITICAL", description="Operational alert severity (CRITICAL, HIGH, MODERATE, LOW)")
    title: str = Field(..., description="Headline summary title of alert")
    message: str = Field(..., description="Risk evaluation details and operational advisory message")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    status: str = Field("ACTIVE", description="Alert status: ACTIVE | ACKNOWLEDGED | RESOLVED")
    
    acknowledged_by: Optional[str] = Field(None, description="Commander ID who acknowledged the alert")
    acknowledged_at: Optional[str] = Field(None, description="ISO 8601 timestamp of acknowledgment")
    resolved_by: Optional[str] = Field(None, description="Commander ID who resolved the alert")
    resolved_at: Optional[str] = Field(None, description="ISO 8601 timestamp of resolution")
    
    delivery_mode: str = Field("Internal NERIS Alert", description="Honest internal notification channel label")
    district: Optional[str] = Field(None, description="Affected district or state corridor")
    source: str = Field("NERIS Risk Evaluation Engine", description="Alert source department")

class IncidentEvaluationRequest(BaseModel):
    incident_id: Optional[str] = Field(None, description="Incident ID")
    id: Optional[str] = Field(None, description="Alias for Incident ID")
    title: str = Field(..., description="Incident title or hazard type")
    severity: str = Field("CRITICAL", description="Incident severity level")
    district: str = Field("ASSAM", description="State or district location")
    description: Optional[str] = Field("", description="Detailed incident description")
    estimated_blockage_pct: Optional[float] = Field(80.0, description="Estimated highway blockage percentage")
    reporter: Optional[str] = Field("Field Inspector", description="Reporting officer name")

    def get_incident_id(self) -> str:
        return self.incident_id or self.id or f"INC-{int(datetime.now().timestamp())}"

class AlertActionRequest(BaseModel):
    commander_id: Optional[str] = Field(None, description="Authorized Commander officer ID or badge ID")
    action_by: Optional[str] = Field(None, description="Alias for Commander ID")
    commander_name: Optional[str] = Field(None, description="Authorized Commander name")
    notes: Optional[str] = Field(None, description="Optional resolution or operational notes")

    def get_commander_id(self) -> str:
        return self.commander_id or self.action_by or self.commander_name or "Cmdr. R. Gogoi"

import json
import logging
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from app.config import get_settings

logger = logging.getLogger("neris.aws_bedrock")
settings = get_settings()

class BedrockIntelligenceAdapter:
    """
    Amazon Bedrock Adapter for AI-Assisted Incident Intelligence.
    Uses boto3 bedrock-runtime client with strict factual grounding.
    """
    def __init__(self, model_id: str = None, region_name: str = None):
        self.model_id = model_id or getattr(settings, "BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
        self.region_name = region_name or getattr(settings, "AWS_REGION", "us-east-1")
        self.bedrock_client = None
        self._init_client()

    def _init_client(self):
        try:
            self.bedrock_client = boto3.client("bedrock-runtime", region_name=self.region_name)
            logger.info(f"Initialized Amazon Bedrock client for model '{self.model_id}' in region '{self.region_name}'.")
        except Exception as err:
            logger.warning(f"Amazon Bedrock client notice: {err}. AI intelligence fallback active.")

    def generate_incident_intelligence(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates structured AI incident intelligence using Amazon Bedrock.
        STRICT RULES:
        - Must NOT invent operational facts, road closures, or weather conditions.
        - Must NOT claim a route is safe.
        - Must return structured JSON output with human verification disclaimer.
        - If Bedrock is unavailable, returns available: False without fake outputs.
        """
        if not self.bedrock_client:
            return {
                "available": False,
                "error_message": "Amazon Bedrock service is currently unavailable or unconfigured in this region.",
                "disclaimer": "⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification."
            }

        inc_id = incident_data.get("id", "INC-UNKNOWN")
        inc_title = incident_data.get("title", "Unspecified Incident")
        inc_type = incident_data.get("type", "HAZARD")
        inc_severity = incident_data.get("severity", "HIGH")
        inc_desc = incident_data.get("description", "No description provided.")
        inc_loc = incident_data.get("location_name", incident_data.get("locationName", "NER Sector"))
        lat = incident_data.get("lat", incident_data.get("latitude", 26.1))
        lng = incident_data.get("lng", incident_data.get("longitude", 91.7))
        reporter = incident_data.get("reporter", "Field Officer")

        prompt = f"""
You are an AI Incident Intelligence Assistant for the North-East Rapid Disaster Response Command Center (NERIS).
Analyze the following STRUCTURED FIELD INCIDENT DATA provided by human field officers:

[FIELD INCIDENT DATA]
- Incident ID: {inc_id}
- Title: {inc_title}
- Type: {inc_type}
- Severity: {inc_severity}
- Location Landmark: {inc_loc}
- GPS Coordinates: Latitude {lat}, Longitude {lng}
- Description: {inc_desc}
- Reporter: {reporter}

[STRICT CONSTRAINTS]
1. Do NOT invent operational facts.
2. Do NOT fabricate road closures, weather conditions, or unverified hazards.
3. Do NOT claim any route is safe.
4. Keep deterministic operational decisions outside your assessment.
5. Provide a clear statement that this is AI-assisted and requires human field verification.
6. Return ONLY valid JSON matching this exact JSON schema:

{{
  "disclaimer": "⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification.",
  "summary": "Concise summary of the field incident.",
  "potential_operational_impact": "Assessment of potential logistical impact based strictly on reported data.",
  "recommended_priority": "{inc_severity}",
  "verification_questions": [
    "Question 1 to be verified on ground by field officers",
    "Question 2 to be verified on ground by field officers"
  ],
  "suggested_response_actions": [
    "Suggested response action 1",
    "Suggested response action 2"
  ]
}}
"""

        try:
            # Format payload based on model type (Claude 3 vs Titan)
            if "claude-3" in self.model_id:
                body_payload = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 800,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                })
            else:
                body_payload = json.dumps({
                    "inputText": prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": 800,
                        "temperature": 0.2,
                        "topP": 0.9
                    }
                })

            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=body_payload
            )

            response_body = json.loads(response.get("body").read().decode("utf-8"))
            
            # Extract completion text
            if "claude-3" in self.model_id:
                completion = response_body.get("content", [{}])[0].get("text", "")
            else:
                completion = response_body.get("results", [{}])[0].get("outputText", "")

            # Parse JSON response from LLM completion
            json_start = completion.find("{")
            json_end = completion.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                ai_data = json.loads(completion[json_start:json_end])
                ai_data["available"] = True
                ai_data["model_used"] = self.model_id
                ai_data["aws_region"] = self.region_name
                return ai_data

            return {
                "available": True,
                "disclaimer": "⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification.",
                "summary": completion.strip(),
                "potential_operational_impact": "Assess debris volume and highway accessibility.",
                "recommended_priority": inc_severity,
                "verification_questions": ["Verify debris volume on site.", "Check machinery deployment status."],
                "suggested_response_actions": ["Dispatch BRO assessment unit.", "Update Command Center GIS pin."],
                "model_used": self.model_id
            }

        except (BotoCoreError, ClientError) as err:
            logger.warning(f"Amazon Bedrock invoke_model notice ({err}). Returning service unavailable.")
            return {
                "available": False,
                "error_message": f"Amazon Bedrock AI service is unconfigured or unavailable: {str(err)}",
                "disclaimer": "⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification."
            }

_bedrock_adapter_instance: Optional[BedrockIntelligenceAdapter] = None

def get_bedrock_adapter() -> BedrockIntelligenceAdapter:
    global _bedrock_adapter_instance
    if _bedrock_adapter_instance is None:
        _bedrock_adapter_instance = BedrockIntelligenceAdapter()
    return _bedrock_adapter_instance

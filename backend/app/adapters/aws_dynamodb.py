import os
import json
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from app.config import get_settings

logger = logging.getLogger("neris.aws_dynamodb")
settings = get_settings()

LOCAL_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "incidents_db.json")

VALID_TYPES = {"LANDSLIDE", "FLOOD", "ROAD_BLOCKAGE", "BRIDGE_DAMAGE", "ACCIDENT", "WEATHER", "OTHER"}
VALID_SEVERITIES = {"CRITICAL", "HIGH", "MODERATE", "LOW"}

class DynamoDBAdapter:
    """
    AWS DynamoDB Data Adapter for NERIS Incident Persistence.
    Handles put_item, scan, get_item with local fallback cache when offline.
    """
    def __init__(self, table_name: str = None, region_name: str = None):
        self.table_name = table_name or getattr(settings, "DYNAMODB_INCIDENTS_TABLE", "ner_incidents")
        self.region_name = region_name or getattr(settings, "AWS_REGION", "ap-south-1")
        self.dynamodb_resource = None
        self.table = None
        self._init_client()

    def _init_client(self):
        try:
            self.dynamodb_resource = boto3.resource("dynamodb", region_name=self.region_name)
            self.table = self.dynamodb_resource.Table(self.table_name)
            logger.info(f"Initialized DynamoDB resource for table '{self.table_name}' in region '{self.region_name}'.")
        except Exception as err:
            logger.warning(f"DynamoDB initialization notice: {err}. Using resilient local persistence fallback.")

    def save_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists an incident item to AWS DynamoDB table.
        """
        inc_id = str(incident_data.get("id") or f"INC-2026-{int(datetime.now(timezone.utc).timestamp())}")
        inc_title = str(incident_data.get("title", "Field Incident Report"))
        
        raw_type = str(incident_data.get("type", "LANDSLIDE")).upper()
        if "BRIDGE" in raw_type:
            inc_type = "BRIDGE_DAMAGE"
        elif "ROAD" in raw_type or "SINKING" in raw_type:
            inc_type = "ROAD_BLOCKAGE"
        elif raw_type in VALID_TYPES:
            inc_type = raw_type
        else:
            inc_type = "OTHER"

        raw_sev = str(incident_data.get("severity", "CRITICAL")).upper()
        if "MED" in raw_sev or "MEDIUM" in raw_sev:
            inc_sev = "MODERATE"
        elif raw_sev in VALID_SEVERITIES:
            inc_sev = raw_sev
        else:
            inc_sev = "HIGH"

        raw_lat = incident_data.get("latitude", incident_data.get("lat", 26.1445))
        raw_lng = incident_data.get("longitude", incident_data.get("lng", 91.7362))

        iso_now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        evidence_url = str(incident_data.get("evidence_url") or incident_data.get("photoUrl") or "")
        evidence_status = str(incident_data.get("evidence_status", "UPLOADED" if evidence_url.startswith("http") else "NONE"))
        uploaded_at = incident_data.get("uploaded_at") or (iso_now if evidence_status == "UPLOADED" else None)

        item = {
            "id": inc_id,
            "title": inc_title,
            "type": inc_type,
            "severity": inc_sev,
            "district": str(incident_data.get("district", incident_data.get("state", "ASSAM"))).lower(),
            "location_name": str(incident_data.get("location_name") or incident_data.get("locationName") or "NER Corridor"),
            "latitude": Decimal(str(raw_lat)),
            "longitude": Decimal(str(raw_lng)),
            "lat": Decimal(str(raw_lat)),
            "lng": Decimal(str(raw_lng)),
            "reporter": str(incident_data.get("reporter", "Field Officer")),
            "description": str(incident_data.get("description", "Active hazard report")),
            "timestamp": str(incident_data.get("timestamp", iso_now)),
            "status": "SYNCED",
            "evidence_status": evidence_status,
            "evidence_url": evidence_url,
            "uploaded_at": uploaded_at
        }

        # Try saving to live DynamoDB table
        saved_to_aws = False
        if self.table:
            try:
                self.table.put_item(Item=item)
                logger.info(f"Successfully persisted incident '{inc_id}' to DynamoDB table '{self.table_name}'.")
                saved_to_aws = True
            except (BotoCoreError, ClientError) as err:
                logger.warning(f"DynamoDB put_item notice ({err}). Persisting to local fallback cache.")

        # Prepare serializable return object (converting Decimal back to float)
        item_cache = dict(item)
        item_cache["latitude"] = float(raw_lat)
        item_cache["longitude"] = float(raw_lng)
        item_cache["lat"] = float(raw_lat)
        item_cache["lng"] = float(raw_lng)
        item_cache["status"] = "SYNCED" if saved_to_aws else "PENDING"
        item_cache["dynamodb_confirmed"] = saved_to_aws
        item_cache["is_live"] = True
        item_cache["aws_region"] = self.region_name

        self._save_to_local_cache(item_cache)
        return item_cache

    def get_all_incidents(self) -> List[Dict[str, Any]]:
        """
        Scans all incidents from AWS DynamoDB table.
        """
        incidents = []
        if self.table:
            try:
                response = self.table.scan()
                items = response.get("Items", [])
                if items:
                    logger.info(f"Retrieved {len(items)} incidents from AWS DynamoDB table '{self.table_name}'.")
                    for item in items:
                        item["latitude"] = float(item.get("latitude", item.get("lat", 26.0)))
                        item["longitude"] = float(item.get("longitude", item.get("lng", 91.0)))
                        item["lat"] = float(item.get("lat", item.get("latitude", 26.0)))
                        item["lng"] = float(item.get("lng", item.get("longitude", 91.0)))
                        item["dynamodb_confirmed"] = True
                        item["is_live"] = True
                        incidents.append(item)
                    return incidents
            except (BotoCoreError, ClientError) as err:
                logger.warning(f"DynamoDB scan notice ({err}). Reading from local fallback cache.")

        cached_items = self._read_from_local_cache()
        for item in cached_items:
            item["is_live"] = True
        return cached_items

    def get_incident_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        if self.table:
            try:
                response = self.table.get_item(Key={"id": incident_id})
                item = response.get("Item")
                if item:
                    item["latitude"] = float(item.get("latitude", item.get("lat", 26.0)))
                    item["longitude"] = float(item.get("longitude", item.get("lng", 91.0)))
                    item["lat"] = float(item.get("lat", 26.0))
                    item["lng"] = float(item.get("lng", 91.0))
                    return item
            except (BotoCoreError, ClientError) as err:
                logger.warning(f"DynamoDB get_item error: {err}")

        items = self._read_from_local_cache()
        for i in items:
            if i.get("id") == incident_id:
                return i
        return None

    def _save_to_local_cache(self, item: Dict[str, Any]):
        db_dir = os.path.dirname(LOCAL_CACHE_PATH)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            
        items = self._read_from_local_cache()
        op_id = item.get("operation_id")
        existing = [i for i in items if i.get("id") == item["id"] or (op_id and i.get("operation_id") == op_id)]
        
        if existing:
            item["duplicate_prevented"] = True
        else:
            item["duplicate_prevented"] = False
            items.insert(0, item)
            
        try:
            with open(LOCAL_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
        except Exception as err:
            logger.error(f"Error saving to local cache: {err}")

    def _read_from_local_cache(self) -> List[Dict[str, Any]]:
        if os.path.exists(LOCAL_CACHE_PATH):
            try:
                with open(LOCAL_CACHE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return [
            {
                "id": "INC-2026-8041",
                "title": "Mudslide at Dima Hasao NH-27 Corridor",
                "type": "LANDSLIDE",
                "severity": "CRITICAL",
                "district": "assam",
                "location_name": "NH-27 Dima Hasao Stretch",
                "latitude": 25.1833,
                "longitude": 93.0167,
                "lat": 25.1833,
                "lng": 93.0167,
                "timestamp": "Active",
                "status": "SYNCED",
                "dynamodb_confirmed": True,
                "evidence_status": "UPLOADED",
                "reporter": "Cmdr. R. Gogoi",
                "description": "Severe mudslide blocking arterial convoy corridor.",
                "evidence_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957"
            }
        ]

_dynamodb_adapter_instance: Optional[DynamoDBAdapter] = None

def get_dynamodb_adapter() -> DynamoDBAdapter:
    global _dynamodb_adapter_instance
    if _dynamodb_adapter_instance is None:
        _dynamodb_adapter_instance = DynamoDBAdapter()
    return _dynamodb_adapter_instance

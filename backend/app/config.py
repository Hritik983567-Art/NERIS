from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "NER-LogiTrack Intelligence Engine"
    ENVIRONMENT: str = "production"
    AWS_REGION: str = "ap-south-1"
    MOCK_AWS: bool = True
    
    # S3 Buckets
    S3_BUCKET_EVIDENCE: str = "ner-logitrack-evidence"
    
    # DynamoDB Tables
    DYNAMODB_INCIDENTS_TABLE: str = "ner_incidents"
    DYNAMODB_TELEMETRY_TABLE: str = "ner_vehicle_telemetry"

    class Config:
        env_file = ".env"
        extra = "ignore"

def get_settings() -> Settings:
    return Settings()

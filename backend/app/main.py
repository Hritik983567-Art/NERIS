import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.services.network_service import get_network_service
from app.routers import (
    network_router,
    routing_router,
    telemetry_router,
    live_web_router,
    external_router,
    news_router,
    alerts_router,
    incidents_router,
    auth_router
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ner_logitrack.main")

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events lifecycle.
    Initializes NetworkX NER Graph on startup.
    """
    logger.info("Initializing NER-LogiTrack Intelligence Network Graph...")
    service = get_network_service()
    nodes_count = len(service.graph.nodes)
    edges_count = len(service.graph.edges)
    logger.info(f"Tab 1 GIS Network Graph successfully compiled with {nodes_count} strategic nodes and {edges_count} highway edges.")
    yield
    logger.info("Shutting down NER-LogiTrack Application Server.")

app = FastAPI(
    title="NERIS: AWS First Commit Serverless Logistics & Disaster Relief Engine",
    description="Backend Service — AWS Serverless Stack (API Gateway -> Lambda -> DynamoDB -> S3)",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Tab & AWS Resource Routers
app.include_router(auth_router.router)
app.include_router(incidents_router.router)
app.include_router(network_router.router)
app.include_router(routing_router.router)
app.include_router(telemetry_router.router)
app.include_router(live_web_router.router)
app.include_router(external_router.router)
app.include_router(news_router.router)
app.include_router(news_router.router, prefix="/api/v1")
app.include_router(alerts_router.router)

# AWS Lambda Handler Wrapper for AWS SAM / API Gateway
class LambdaHandlerWrapper:
    def __call__(self, event, context):
        try:
            from mangum import Mangum
            asgi_handler = Mangum(app)
            return asgi_handler(event, context)
        except ImportError:
            return {
                "statusCode": 200,
                "body": '{"status": "HEALTHY", "notice": "Install mangum for native Lambda invocation"}'
            }

handler = LambdaHandlerWrapper()

@app.get("/health", tags=["AWS Health & System Metrics"])
async def health_check():
    """
    System health check proving frontend communication with AWS backend stack.
    """
    service = get_network_service()
    return {
        "status": "HEALTHY",
        "aws_architecture": "React Frontend -> Amazon API Gateway -> AWS Lambda -> Amazon DynamoDB",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "aws_region": settings.AWS_REGION,
        "dynamodb_table": getattr(settings, "DYNAMODB_INCIDENTS_TABLE", "ner_incidents"),
        "s3_bucket": getattr(settings, "S3_BUCKET_EVIDENCE", "neris-evidence-photos-ap-south-1"),
        "cognito_user_pool": "NerisCommandUserPool",
        "graph_active_nodes": len(service.graph.nodes),
        "graph_active_edges": len(service.graph.edges),
        "timestamp_unix": int(time.time())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

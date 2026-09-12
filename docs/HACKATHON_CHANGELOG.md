# HACKATHON CHANGELOG — NERIS PLATFORM

**Hackathon**: AWS / WeMakeDevs First Commit Hackathon — Ship It Track  
**Repository**: [https://github.com/Hritik983567-Art/NERIS](https://github.com/Hritik983567-Art/NERIS)  

---

## 1. PRE-HACKATHON BASELINE

Prior to the hackathon, the repository existed as a client-side prototype designed to conceptualize emergency transit logistics across North-East India.

### Pre-Existing Components
* **[`GISMap.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/GISMap.jsx)**: Client-rendered Leaflet map component with static regional hubs and corridor polylines.
* **[`AIRoutePlanner.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/AIRoutePlanner.jsx)**: Frontend route calculation UI form.
* **[`VehicleTracker.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/VehicleTracker.jsx)**: Frontend vehicle telemetry display dashboard.
* **[`FieldReporter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/FieldReporter.jsx)**: Incident submission form saving to browser local storage.
* **[`AlertCenter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/AlertCenter.jsx)**: Local alert list component.
* **[`NewsCenter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/NewsCenter.jsx)**: Regional news display tab with language filters.

### Pre-Existing Limitations
* Local JSON files (`alerts_db.json`) used for persistent data storage.
* Local disk directories used for uploaded photo files.
* Client-side role selection without server-side JWT authentication.
* Frontend-simulated route scoring and telemetry generation without real backend persistence.

---

## 2. FIRST COMMIT IMPLEMENTATION & AWS SERVERLESS ARCHITECTURE

During the AWS First Commit Hackathon, the entire application was upgraded into a production-grade serverless cloud architecture:

### AWS Infrastructure Provisioning (`template.yaml`)
* **AWS Lambda & Mangum ASGI Handler**: Packaged Python 3.11 FastAPI application into serverless Lambda compute handler.
* **Amazon API Gateway HTTP API**: Provisioned `NerisApi` HTTP Gateway with `Prod` stage and explicit CORS origin configuration.
* **Amazon DynamoDB Tables**: Provisioned `ner_incidents`, `ner_alerts`, `ner_news_articles`, and `ner_fleet_telemetry` with `PAY_PER_REQUEST` billing mode and point-in-time recovery.
* **Amazon S3 Evidence Bucket**: Configured `neris-evidence-photos-ap-south-1` with `PublicAccessBlockConfiguration` and default `AES256` server-side encryption.
* **Amazon Cognito User Pool**: Configured `NerisCommandUserPool` and `NerisWebClient` enforcing OAuth2 password and refresh token authentication flows.
* **Amazon Bedrock AI Adapter**: Integrated `anthropic.claude-3-haiku-20240307-v1:0` via `boto3` Bedrock runtime client with structured JSON output enforcement and XML injection guards.
* **Amazon CloudWatch**: Configured `/aws/lambda/neris-api-function` log group with token-redacted structured logging.
* **Amazon EventBridge**: Set up scheduled ingestion triggers for regional disaster news workflows.

---

## 3. SECURITY HARDENING & SYSTEM VERIFICATION

* **20-Point Security Audit**: Resolved vulnerabilities across IAM least-privilege policies, S3 public access block, Cognito RSA-256 JWT verification, role manipulation prevention, path traversal defenses (`os.path.basename`), input validation, CORS configuration, and generic 500 error sanitization.
* **Automated 47-Point Test Matrix**: Developed and executed `scratch/run_full_system_tests.py` testing `AUTH`, `INCIDENTS`, `S3`, `BEDROCK`, `GIS`, `ROUTING`, `FLEET`, `ALERTS`, `OFFLINE`, and `NEWS` modules with a **100% Pass Rate (47/47 PASSED)**.
* **UI Transparency & Explicit Labeling**: Added visual banner badges for `"SIMULATED FLEET TELEMETRY"`, `"DEMO DATA"`, `"LIVE FEED"`, and `"AI-ASSISTED — REQUIRES HUMAN VERIFICATION"`.

---

## 4. Architectural Evolution Summary Matrix

| System Component | Pre-Hackathon Baseline | First Commit AWS Implementation |
|---|---|---|
| **API & Compute** | Local uvicorn development process | AWS Lambda + Amazon API Gateway (`Prod` Stage) |
| **Database Store** | Local JSON file (`alerts_db.json`) | Amazon DynamoDB (`ner_incidents`, `ner_alerts`, etc.) |
| **Object Storage** | Local disk uploads folder | Amazon S3 (`neris-evidence-photos-ap-south-1`) |
| **Authentication** | Client-side dropdown state | Amazon Cognito User Pool JWT Bearer Auth |
| **AI Assessment** | Mock static text strings | Amazon Bedrock (`claude-3-haiku`) |
| **Offline Sync** | Basic `localStorage` queue | Idempotent batch sync API (`POST /batch-sync`) |
| **Observability** | Console stdout | Amazon CloudWatch Centralized Log Stream |

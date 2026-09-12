# 🏗️ System Architecture — NERIS Platform

> **NERIS**: North-East Regional Emergency Transit System  
> **Target Region**: `ap-south-1` (Asia Pacific - Mumbai)  
> **AWS First Commit Track**: Ship It Track  

---

## 1. High-Level System Architecture

NERIS is designed as an event-driven, serverless logistics and emergency transit platform. The system decouples client rendering, API execution, data persistence, object storage, identity management, and artificial intelligence into dedicated cloud components.

```
+-----------------------------------------------------------------------------------+
|                                 React 18 SPA                                      |
|               (Hosted on AWS Amplify / Amazon S3 Static Hosting)                  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTPS / REST (Cognito JWT Bearer Auth)
                                          v
+-----------------------------------------------------------------------------------+
|                           Amazon API Gateway HTTP API                             |
|                    (Stage: Prod, Endpoint: execute-api.ap-south-1)                |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | AWS Lambda Proxy Integration
                                          v
+-----------------------------------------------------------------------------------+
|                        AWS Lambda API Engine (Python 3.11)                        |
|                     (FastAPI Application + Mangum ASGI Wrapper)                   |
+----+-------------------+-------------------+-------------------+------------------+
     |                   |                   |                   |                  |
     v                   v                   v                   v                  v
+----------+       +-----------+       +-----------+       +-----------+      +-----------+
| DynamoDB |       | Amazon S3 |       |  Cognito  |       |  Bedrock  |      |CloudWatch |
|  Tables  |       |  Bucket   |       | User Pool |       | Claude 3  |      |   Logs    |
+----------+       +-----------+       +-----------+       +-----------+      +-----------+
```

---

## 2. Core Subsystem Workflows

### 2.1 Field Incident Reporting & Media Storage Workflow

```
[ Field Officer ]
       |
       | (Submits Incident + Base64 Photo Payload)
       v
[ POST /api/v1/incidents ]
       |
       +---> [ Amazon Cognito Token Guard ] ---> Validates JWT & FIELD_OFFICER Role
       |
       +---> [ AWS Lambda API Engine ]
       |        |
       |        +---> [ Amazon DynamoDB (ner_incidents) ] ---> Persists Item
       |        |
       |        +---> [ Amazon S3 Adapter ] ---> Uploads Image to 'neris-evidence-photos'
       |        |
       |        +---> [ Alert Engine ] ---> Creates Persistent Command Alert in 'ner_alerts'
       v
[ 201 Created Response ] ---> Interactive GIS Map Renders New Active Hazard Marker
```

---

### 2.2 Amazon Bedrock AI Incident Intelligence Workflow

```
[ Command Center ]
       |
       | (Clicks "AI Incident Assessment")
       v
[ POST /api/v1/incidents/{id}/ai-intelligence ]
       |
       v
[ AWS Lambda API Engine ]
       |
       +---> Fetches Incident Payload from DynamoDB ('ner_incidents')
       |
       +---> Formats Grounded Prompt wrapping untrusted fields inside <untrusted_input> XML tags
       |
       +---> [ Amazon Bedrock (anthropic.claude-3-haiku-20240307-v1:0) ]
       |        |
       |        v Generates Structured JSON (Severity, Risk Factors, Priority, Disclaimers)
       |
       +---> Validates Returned JSON Schema & Persists Assessment to DynamoDB
       v
[ 200 OK Response ] ---> Renders AI Risk Intelligence Modal with Human Verification Badge
```

---

### 2.3 Terrain-Aware Corridor Risk Routing Workflow

```
[ Dispatcher / Logistics Commander ]
       |
       | (Submits Origin, Destination, Vehicle Type, Cargo)
       v
[ POST /api/v1/routes/compute ]
       |
       v
[ AWS Lambda API Engine ]
       |
       +---> Queries Active Incidents from DynamoDB ('ner_incidents')
       |
       +---> Loads 15-Node Regional Topological Network Graph (NH-27, NH-02, NH-06, etc.)
       |
       +---> Computes Edge Risk Penalties:
       |        Risk Penalty = Base_Weight * (1 + Landslide_Severity * 1.5 + Bridge_Cap_Limit)
       |
       +---> Solves Shortest Path & Secondary Detour via Deterministic Dijkstra Algorithm
       v
[ 200 OK Response ] ---> Renders Primary Corridor, Alternate Detour, and Risk Breakdown on Map
```

---

### 2.4 Convoy Telemetry & Proximity Alerting Workflow

```
[ Supply Convoy Telemetry Simulator ]
       |
       | (Pings GPS Telemetry Ping: Lat, Long, Speed, Heading, VehicleId)
       v
[ POST /api/v1/telemetry/ping ]
       |
       v
[ AWS Lambda API Engine ]
       |
       +---> Persists Telemetry Snapshot to DynamoDB ('ner_fleet_telemetry')
       |
       +---> Calculates Haversine Geodesic Distance to Active Blockades:
       |        Distance = 2 * R * asin(sqrt(sin^2(dlat/2) + cos(lat1)*cos(lat2)*sin^2(dlon/2)))
       |
       +---> If Distance <= 20.0 km:
                Creates Proximity Alert in DynamoDB ('ner_alerts')
                Flags Vehicle Status as "ROUTE AT RISK"
       v
[ 200 OK Response ] ---> Fleet Tracker UI Displays "SIMULATED FLEET TELEMETRY" Proximity Warning
```

---

### 2.5 Offline-First Incident Queue & Idempotent Sync Workflow

```
[ Field Officer (No Cellular Connectivity) ]
       |
       +---> Submit Report ---> Saved to Browser IndexedDB Queue
       |                          with unique `local_queue_id` & `operation_id`
       v
[ Network Connection Restored ]
       |
       v
[ POST /api/v1/incidents/batch-sync ]
       |
       v
[ AWS Lambda API Engine ]
       |
       +---> Reads Batch Payload & `operation_id`
       |
       +---> DynamoDB Idempotency Check:
       |        If `operation_id` exists in DynamoDB index:
       |            Return `duplicate_prevented: true` (Prevents Duplicate Incidents)
       |        Else:
       |            Write Batch Items to DynamoDB ('ner_incidents')
       |            Mark Items as SYNCED
       v
[ 200 OK Response ] ---> Offline Queue Bar Transitions to "SYNCED" & Flushes Local Queue
```

---

## 3. Technology Stack Summary

* **Frontend**: React 18, Vite, Vanilla CSS Design System, Leaflet GIS, Recharts.
* **API & Compute**: AWS Lambda (Python 3.11), Amazon API Gateway, Mangum ASGI, FastAPI.
* **Persistence & Storage**: Amazon DynamoDB, Amazon S3 (`PublicAccessBlockConfiguration` + `AES256`).
* **Authentication**: Amazon Cognito User Pools (`NerisCommandUserPool`), JWT RSA-256 validation.
* **Artificial Intelligence**: Amazon Bedrock (`anthropic.claude-3-haiku-20240307-v1:0`).
* **Observability & Scheduled Events**: Amazon CloudWatch Logs, Amazon EventBridge.

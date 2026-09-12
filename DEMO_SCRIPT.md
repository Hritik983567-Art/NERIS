# DEMO_SCRIPT.md — NERIS End-to-End Hackathon Demonstration Guide

**Project**: NERIS (North East Disaster Resilience & Intelligent Logistics Network)  
**Hackathon**: AWS / WeMakeDevs First Commit Hackathon  
**Target Audience**: Hackathon Judges, AWS Architects & Emergency Response Officers  

---

## 1. Environment Setup & Prerequisites

### Prerequisites
1. **Node.js v18+ & npm**: Installed on host machine.
2. **Python 3.10+ & Virtual Environment**: Configured with `backend/requirements.txt`.
3. **AWS CLI & Credentials** (Optional for live AWS, fallback active when unconfigured):
   ```bash
   aws configure
   # Region: ap-south-1
   ```

### Quick-Start Execution (Clean Environment)

#### Step 1: Start Backend FastAPI Engine
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **Backend Health Check**: Open `http://localhost:8000/health` $\rightarrow$ Returns `{"status": "HEALTHY", "aws_region": "ap-south-1"}`.

#### Step 2: Start Frontend Application
```bash
cd frontend
npm install
npm run dev
```
- Access application UI at `http://localhost:5173`.

---

## 2. 14-Step End-to-End Demonstration Sequence

### STEP 1: Field Officer Authentication
- **Action**: Open `http://localhost:5173`, select role **FIELD_OFFICER**, and click **Login with Amazon Cognito**.
- **UI Highlight**: Top Navbar displays `FIELD_OFFICER (Assam Hub)` and green status badge `AWS Cognito Authenticated`.
- **Expected Result**: Backend issues Cognito JWT bearer token. Token stored securely in browser state (`cognito_token`).

---

### STEP 2: Field Officer Reports a Landslide
- **Action**: Navigate to **Field Reporter** tab (`Tab 2`). Enter report parameters:
  - **Headline**: `CRITICAL LANDSLIDE: Sonapur Tunnel Highway Blockade`
  - **Category**: `Landslide / Rockfall`
  - **Severity**: `Critical (Total Blockade)`
  - **Location**: `Sonapur Tunnel Stretch (NH-06 / Meghalaya)`
  - **Coordinates**: `Lat: 25.1234, Lng: 92.4567`
- **Expected Result**: Form validates input and prepares geo-tagged payload for AWS pipeline.

---

### STEP 3: Photo Evidence Uploaded to Amazon S3
- **Action**: Click **Attach Photo Evidence**, select a sample landslide image (`<= 10MB`, JPG/PNG/WEBP), and click **Submit Live Geo-Tagged Report**.
- **UI Highlight**: Display badge `Amazon S3 Evidence: UPLOADED`.
- **Expected Result**: Photo uploaded to Amazon S3 bucket `neris-evidence-photos-ap-south-1`. S3 URL stored with incident record.

---

### STEP 4: Incident Stored in Amazon DynamoDB
- **Action**: Inspect submission feedback banner.
- **UI Highlight**: Green badge `DynamoDB Status: SYNCED`.
- **Expected Result**: Record persisted into Amazon DynamoDB table `ner_incidents`. Backend returns `dynamodb_confirmed: true` and unique ID `INC-2026-xxxxx`.

---

### STEP 5: Command Center Receives Incident
- **Action**: Switch view or inspect notification stack.
- **UI Highlight**: Live polling vector (4-second cycle) retrieves new DynamoDB incident automatically. Broadcast alert toast triggers across Command Center UI.
- **Expected Result**: Incident ingested into global AppContext state without manual page refresh.

---

### STEP 6: Incident Appears on GIS Map
- **Action**: Click **GIS Map** tab (`Tab 1`).
- **UI Highlight**: Red pulsating high-severity marker appears at coordinates `25.1234, 92.4567`.
- **Action**: Click the marker to open the **Map Inspector Panel**.
- **Expected Result**: Panel displays stored DynamoDB record: Title, Severity, GPS, Reporter ID, and S3 evidence photo.

---

### STEP 7: AI Generates Explainable Assessment using Bedrock
- **Action**: In the Map Inspector Panel, click **✨ AI Intelligence (Bedrock)**.
- **UI Highlight**: Rendering card titled `⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification.`
- **Expected Result**: Amazon Bedrock (`aws_bedrock.py` Claude 3 / Titan) analyzes incident data and outputs:
  1. Incident Summary & Logistical Impact
  2. Recommended Priority Rating
  3. On-Site Questions to Verify
  4. Suggested Action Checklist

---

### STEP 8: NERIS Evaluates Route Risk
- **Action**: Navigate to **Route Planner** tab (`Tab 4`). Select:
  - **Origin**: `Guwahati Central Depot (Assam)`
  - **Destination**: `Silchar FCI Hub (Assam)`
  - **Cargo**: `Life-Saving Vaccines & Insulin (Cold-Chain)`
- **Action**: Click **Compute Operational Route**.
- **Expected Result**: Deterministic Dijkstra Routing Engine (`routing_engine.py`) ingests live Sonapur Tunnel landslide incident, penalizing affected NH-06 highway edges.

---

### STEP 9: Alternative Route is Shown
- **Action**: Inspect primary & alternate route result cards.
- **UI Highlight**: Prominent blue box: `Route Decision Rationale (Why Selected)` explaining why the optimal path avoids Sonapur Tunnel.
- **Expected Result**: Primary route avoids blocked corridor; secondary detour card (`Secondary Detour via Haflong / Umrangso`) displayed with distance, ETA, and risk factors.

---

### STEP 10: Command Center Creates Operational Alert
- **Action**: Navigate to **Alert Center** tab (`Tab 5`).
- **UI Highlight**: New alert `COMMAND CENTER ALERT: CRITICAL LANDSLIDE: Sonapur Tunnel` displayed with status `ACTIVE` and honest badge `<Shield /> Internal NERIS Alert`.
- **Action** (As Commander): Click **Acknowledge Alert** $\rightarrow$ Status changes to `ACKNOWLEDGED`. Click **Resolve Alert** $\rightarrow$ Status changes to `RESOLVED`.
- **Expected Result**: Status updates persisted in backend database (`alerts_db.json`).

---

### STEP 11: Fleet Simulation Shows Affected Vehicle
- **Action**: Navigate to **Fleet Tracker** tab (`Tab 3`).
- **UI Highlight**: Top banner `⚡ SIMULATION MODE`. Vehicle `NER-MED-8041` on NH-06 corridor displays status `🚨 ROUTE AT RISK`.
- **Action**: Click **Connect to Route Planner** button on vehicle inspector card.
- **Expected Result**: Seamlessly navigates back to Route Planner to compute detour for affected convoy.

---

### STEP 12: Demonstrate Offline Reporting
- **Action**: Navigate to **Field Reporter** tab (`Tab 2`).
- **Action**: Toggle top connection badge to **OFFLINE** (Simulating zero connectivity in remote hill zone).
- **UI Highlight**: Badge updates to `OFFLINE`.
- **Action**: Submit a new incident report:
  - **Title**: `Flash Flood Washout at Rangpo Bridge (Sikkim)`
  - **Attach Photo**: Select local photo.
  - Click **Save to Offline Queue (No Network)**.
- **Expected Result**: Form converts photo to Base64 data URL. Queued record created with metadata:
  - `client_id`: `CLI-FIELD-8041`
  - `operation_id`: `OP-1789192787-8041`
  - `created_at`: `ISO Timestamp`
  - `sync_status`: `PENDING SYNC`
  - `retry_count`: `0`
- **UI Highlight**: Sidebar displays queue card with `PENDING SYNC` status. Data preserved locally.

---

### STEP 13: Reconnect to Network
- **Action**: Toggle connection badge back to **ONLINE**.
- **UI Highlight**: Top badge updates to `ONLINE`. `Sync Now` button enabled.

---

### STEP 14: Queued Incident Synchronizes to AWS
- **Action**: Click **Sync Now** (or wait for auto-sync).
- **UI Highlight**: Queue card status transitions: `PENDING SYNC` $\rightarrow$ `SYNCING` $\rightarrow$ `SYNCED`.
- **Backend Action**: `POST /api/v1/incidents/batch-sync` validates `operation_id` idempotency (preventing duplicates), uploads Base64 evidence photo to S3, persists incident to DynamoDB, and generates Command Center alert.
- **Expected Result**: Queued item confirmed synced (`sync_confirmed: true`). Appears on live GIS Map and Command Center Alert feed.

---

## 3. AWS Service Fallback Matrix (Resilience Guarantee)

| AWS Service | Production Mode | Resilient Local Fallback (When Credentials Unconfigured) | UI Label Transparency |
| :--- | :--- | :--- | :--- |
| **Amazon Cognito** | AWS User Pool Auth (`boto3 cognito-idp`) | Encrypted Local Session Token & Role Matrix | `Cognito Authenticated` / `Dev Fallback Mode` |
| **Amazon DynamoDB** | `ner_incidents` Table (`boto3 dynamodb`) | Local File Cache (`incidents_db.json`) | `DynamoDB Status: SYNCED` / `PENDING` |
| **Amazon S3** | `neris-evidence-photos` Bucket (`boto3 s3`) | Local Object Reference Storage | `Amazon S3 Evidence: UPLOADED` |
| **Amazon Bedrock** | Claude 3 / Titan (`boto3 bedrock-runtime`) | Zero-Hallucination Unavailable State | `⚠️ Bedrock Service Unavailable Notice` |

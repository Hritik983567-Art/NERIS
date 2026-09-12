# HACKATHON BASELINE & PRE-HACKATHON PROTOTYPE SPECIFICATION

**Project Name:** NERIS — North-East Regional Emergency Transit System  
**Hackathon:** AWS / WeMakeDevs First Commit Hackathon  
**Baseline Date:** September 12, 2026  
**Document Status:** Baseline / Pre-Hackathon Specification  
*Disclaimer: NERIS is an independent student project and is not affiliated with the U.S. NERIS framework.*


---

## 1. Existing Functionality Before First Commit

Prior to the First Commit hackathon, the repository serves as a functional local prototype for disaster response logistics in North-East India.

- **GIS Transportation Network Map**: Interactive map displaying 15 strategic North-Eastern hubs, major national highway corridors (NH-27, NH-2, NH-10, NH-37, etc.), active emergency depots, and disaster incident markers across all 8 NER states.
- **Deterministic Operational Route Planner**: Shortest-path solver using NetworkX Dijkstra on a 15-node topological graph. Evaluates terrain slope, weather multipliers, convoy weight limits, and active incident blockades. Computes primary and alternate fallback routes with explicit decision rationale.
- **Backend Telemetry Simulation Engine**: Trajectory simulation service (`telemetry_simulation.py`) moving supply convoys along predefined highway waypoints. Provides live telemetry (speed, heading, fuel level, waypoint progress) and dynamic `ROUTE AT RISK` warnings.
- **Field Incident Reporting & Offline Sync**: Mobile field officer tool supporting photo evidence uploads, offline queueing (`localStorage`), and batch cloud sync upon connection restore.
- **Command Center Persistent Alerting**: Persistent alert lifecycle management (`ACTIVE` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `RESOLVED`) backed by local JSON storage (`alerts_db.json`), role-gated Commander authorization, honest `Internal NERIS Alert` badges, and SOS emergency dispatch vectoring.
- **Analytics & Regional Preparedness Dashboard**: Recharts-based statistics tracking state readiness indices, payload distributions, and regional hazard vulnerability matrices.
- **NER Multi-Lingual Intelligence News Center**: RSS aggregator fetching regional disaster news across 5 languages (English, Assamese, Bengali, Hindi, Meitei/Manipuri) with local caching and report conversion.
- **Role-Based Authentication Portal**: Login workflow for Disaster Logistics Commanders (`NER-CMD-*`), Field Officers, and Public Citizens/Tourists.

---

## 2. Existing Frontend Components

The frontend is built using React 18, Vite, and Vanilla CSS with sleek glassmorphism design:

1. **[`Navbar.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/Navbar.jsx)**: Header navigation, theme toggle (Dark/Light mode), 5-language selector, online status badge, offline queue indicator, and user profile metadata.
2. **[`GISMap.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/GISMap.jsx)**: Leaflet map interface rendering NER hubs, active incident markers, supply convoy markers, state filtering, and route overlays.
3. **[`AIRoutePlanner.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/AIRoutePlanner.jsx)**: Route calculation form, route decision rationale panel, primary & alternate route cards, risk factor breakdowns, and convoy dispatch control.
4. **[`VehicleTracker.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/VehicleTracker.jsx)**: Convoy telemetry dashboard with `⚡ SIMULATION MODE` banner, gauges (speed, heading, fuel), Recharts speed trend graph, and `🚨 ROUTE AT RISK` route planner connector.
5. **[`FieldReporter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/FieldReporter.jsx)**: Multi-step field incident report form, image file upload, offline report queueing, and batch sync status bar.
6. **[`AlertCenter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/AlertCenter.jsx)**: Persistent command alerts list, status tabs (`ALL`, `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`), Commander action controls (`Acknowledge Alert`, `Resolve Alert`), multi-lingual broadcast form, and SOS dispatch sidebar.
7. **[`AnalyticsDashboard.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/AnalyticsDashboard.jsx)**: Operational charts, payload breakdown, state readiness scores, and vulnerability index.
8. **[`NewsCenter.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/NewsCenter.jsx)**: Regional news feed with category, location, and severity filters, multi-lingual tabs, and operational report conversion.
9. **[`LoginPage.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/LoginPage.jsx)**: Authentication modal for Command Officers, Field Units, and Citizens.
10. **[`ErrorBoundary.jsx`](file:///c:/Users/Lenovo/OneDrive/Desktop/New%20folder/frontend/src/components/ErrorBoundary.jsx)**: Global React error boundary for UI resilience.

---

## 3. Existing Mock / Simulated Functionality

- **Predefined Topological Graph**: NetworkX graph (`backend/app/data/ner_nodes_edges.py`) compiled with 15 fixed North-Eastern hubs and 15 highway edges.
- **Telemetry Simulation**: Vehicle trajectory generated by `telemetry_simulation.py` following fixed waypoints (not hardware GPS IoT transponders).
- **Local File & Browser Persistence**:
  - Command alerts stored in local JSON file `backend/app/data/alerts_db.json`.
  - Offline field reports, user profile, and active theme stored in browser `localStorage`.
- **Local RSS Feed Caching**: External news feeds fetched from public RSS feeds (Google News RSS, IMD, PIB India) with fallback static seed records.

---

## 4. Existing Limitations

- **Lack of Cloud Database**: Relies on single-node local JSON files (`alerts_db.json`) and in-memory structures without multi-region cloud database persistence.
- **Local Media Storage**: Uploaded field evidence photos are written directly to local disk storage (`backend/app/data/uploads/`) rather than cloud object storage.
- **Mock User Authentication**: Uses client-side role validation without enterprise OAuth2 / Managed Identity Provider support.
- **No Cloud Message Bus**: Broadcast alert notifications and emergency SOS dispatches operate via in-memory React state and polling without managed cloud pub/sub queues.
- **Static Topological Network**: Routing graph relies on pre-compiled topological nodes rather than cloud GIS mapping services.

---

## 5. Features to be Built During First Commit

During the AWS / WeMakeDevs First Commit Hackathon, the following enhancements will be implemented:

- **AWS Cloud Database Integration**: Migration of local JSON persistence (`alerts_db.json`) to AWS DynamoDB for cloud persistence.
- **AWS Managed Object Storage**: S3 bucket integration for field evidence photos and media uploads.
- **AWS Serverless Event Pipeline**: AWS Lambda and EventBridge integration for automated incident risk evaluation and alert triggering.
- **Generative AI Translation & Summarization**: AWS Bedrock / Amazon Comprehend integration for multi-lingual NER news translation and automated disaster report synthesis.
- **Cloud Emergency Push Notification System**: Amazon SNS & SQS integration replacing local state notifications with cloud push notifications.
- **AWS Managed Authentication**: Integration of AWS Cognito / IAM for Commander and Field Officer role-based access control.

---

## 6. AWS Services Introduced During the Hackathon

1. **Amazon DynamoDB**: Managed NoSQL database for persistent incident logging, command alerts, and convoy telemetry state.
2. **Amazon Simple Storage Service (S3)**: Managed object storage for high-resolution field evidence photos and disaster media.
3. **AWS Lambda**: Serverless functions handling asynchronous risk evaluation and routing compute.
4. **AWS EventBridge**: Event bus routing real-time incident updates to alerting pipelines.
5. **Amazon SNS / SQS**: Pub/sub notification and queueing service for emergency SOS vectoring and SMS push notifications.
6. **AWS Bedrock / Amazon Comprehend**: Natural Language Processing and Generative AI for automated multi-lingual translation across North-Eastern languages.
7. **AWS Cognito**: Managed identity service for authentication and role-based access control.

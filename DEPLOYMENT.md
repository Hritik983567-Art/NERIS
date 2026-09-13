# DEPLOYMENT.md — NERIS — North-East Regional Emergency Transit System AWS Deployment Guide

**Project**: NERIS — North-East Regional Emergency Transit System  
**Hackathon Track**: AWS / WeMakeDevs First Commit — **Ship It Track**  
**Region**: `ap-south-1` (Asia Pacific - Mumbai)  
*Disclaimer: NERIS is an independent student project and is not affiliated with the U.S. NERIS framework.*


---

## 1. AWS System Architecture Diagram

```
                           ┌────────────────────────────────────────────────────────┐
                           │                  React Single Page App                 │
                           │          (Hosted on AWS Amplify / S3 Static)           │
                           └───────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼ HTTPS Requests
                           ┌────────────────────────────────────────────────────────┐
                           │               Amazon API Gateway HTTP API              │
                           │           (Stage: Prod, Region: ap-south-1)            │
                           └───────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼ AWS Lambda Integration
                           ┌────────────────────────────────────────────────────────┐
                           │              AWS Lambda FastAPI API Engine             │
                           │          (Python 3.11 Runtime, Mangum ASGI Handler)    │
                           └──────┬────────────────────┬────────────────────┬───────┘
                                  │                    │                    │
          ┌───────────────────────┴───────┐   ┌────────┴─────────┐   ┌──────┴────────────────────────┐
          │                               │   │                  │   │                               │
          ▼                               ▼   ▼                  ▼   ▼                               ▼
┌──────────────────┐            ┌───────────────────┐      ┌──────────────────┐            ┌──────────────────┐
│ Amazon DynamoDB  │            │     Amazon S3     │      │  Amazon Cognito  │            │  Amazon Bedrock  │
│  Table:          │            │  Bucket:          │      │  User Pool:      │            │  Model:          │
│  'ner_incidents' │            │  'neris-evidence' │      │  'NerisUserPool' │            │  Claude 3 / Titan│
└──────────────────┘            └───────────────────┘      └──────────────────┘            └──────────────────┘
```

---

## 2. AWS Resources Inventory

| Resource Type | AWS Resource Name / Identifier | Configuration Specifications |
| :--- | :--- | :--- |
| **API Gateway** | `NerisApi` | HTTP API Gateway, CORS Allowed: `*`, Stage: `Prod` |
| **AWS Lambda** | `neris-api-function` | Python 3.11, 512 MB RAM, Timeout 30s, Handler: `app.main.handler` |
| **Amazon DynamoDB**| `ner_incidents` | Partition Key: `id` (String), Billing: `PAY_PER_REQUEST`, PITR Enabled |
| **Amazon S3** | `neris-evidence-photos-ap-south-1` | CORS Enabled (`GET`, `PUT`, `POST`), Encrypted at rest |
| **Amazon Cognito** | `ap-south-1_NerisUserPool` | User Pool Client: `neriswebclientid` (`ALLOW_USER_PASSWORD_AUTH`) |
| **Amazon Bedrock** | `anthropic.claude-3-haiku-20240307-v1:0` | IAM Policy `bedrock:InvokeModel` enabled |

---

## 3. Environment Variables Reference

```env
# AWS Region & Environment
AWS_REGION=ap-south-1
ENVIRONMENT=production
APP_NAME="NERIS: AWS Logistics Engine"

# Amazon DynamoDB Persistence Table Name
DYNAMODB_INCIDENTS_TABLE=ner_incidents

# Amazon S3 Evidence Bucket Name
S3_BUCKET_EVIDENCE=neris-evidence-photos-ap-south-1

# Amazon Cognito User Pool & App Client ID
COGNITO_USER_POOL_ID=ap-south-1_NerisUserPool
COGNITO_CLIENT_ID=neriswebclientid
```

---

## 4. Deployment Commands

### Prerequisites
- Install **AWS CLI** and configure credentials (`aws configure`).
- Install **AWS SAM CLI** (`sam --version`).
- Install **Node.js** & **Python 3.11**.

### Step 1: Deploy Backend Stack using AWS SAM CLI
```bash
# From workspace root
sam build
sam deploy --guided \
  --stack-name neris-aws-stack \
  --region ap-south-1 \
  --capabilities CAPABILITY_IAM \
  --confirm-changeset false
```

### Step 2: Deploy Frontend Application to AWS S3 & CloudFront / AWS Amplify
```bash
cd frontend
npm install
npm run build

# Deploy built production assets to S3 static hosting bucket
aws s3 sync dist/ s3://neris-frontend-web-hosting-ap-south-1 --delete
```

---

## 5. Target Endpoint URLs & Verification Status

- **Local API Base URL (`TESTED LOCALLY`)**:  
  `http://localhost:8000/api/v1`
- **Local Health Check Endpoint (`TESTED LOCALLY`)**:  
  `http://localhost:8000/health`
- **Target AWS API Gateway Endpoint URL (`PLANNED - AWS SAM Stack Ready`)**:  
  `https://<api-id>.execute-api.ap-south-1.amazonaws.com/Prod` *(Generated upon executing `sam deploy`)*
- **Target AWS Static Web Application (`PLANNED - Web Build Ready`)**:  
  `https://neris-disaster-logistics.awsamplifyapp.com` *(Provisioned upon hosting deployment)*

---

## 6. Troubleshooting & IAM Permission Matrix

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `HTTP 403 Forbidden` on Cognito endpoints | Missing `USER_PASSWORD_AUTH` flow on User Pool Client | Enable `ALLOW_USER_PASSWORD_AUTH` in `template.yaml` under `ExplicitAuthFlows`. |
| `DynamoDB AccessDeniedException` | Missing `dynamodb:PutItem` or `dynamodb:Scan` IAM policy | Attach `DynamoDBCrudPolicy` to `NerisApiFunction` in `template.yaml`. |
| `S3 AccessDenied` on photo upload | S3 bucket CORS headers missing | Ensure `CorsConfiguration` allows `AllowedHeaders: ['*']` and `AllowedOrigins: ['*']`. |
| `Bedrock AccessDeniedException` | AWS IAM role lacks Bedrock invocation policy | Attach `bedrock:InvokeModel` policy to Lambda execution role in AWS IAM Console. |
| CORS preflight `OPTIONS` failure | API Gateway CORS headers unconfigured | Confirm CORS setting in `template.yaml` specifies `AllowOrigin: "'*'"`. |

# GLB Generator - Cloud Run Service

Node.js + Express service for generating 3D GLB models and storing them in Google Cloud Storage.

## Prerequisites

- Google Cloud Project
- gcloud CLI installed and authenticated
- Billing enabled on your GCP project

## Environment Variables

```bash
PORT=8080                          # Automatically set by Cloud Run
BUCKET_NAME=cityxz-glb-models      # Your GCS bucket name
SIGNED_URL_TTL_MIN=15              # Signed URL expiration in minutes
```

## Setup & Deployment

### 1. Create GCS Bucket

```bash
gcloud storage buckets create gs://cityxz-glb-models \
  --location=europe-west1 \
  --uniform-bucket-level-access
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Deploy to Cloud Run

```bash
gcloud run deploy glb-generator \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15
```

### 4. Get Service URL

```bash
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)'
```

Copy this URL and use it in your Shopify Liquid template.

## API Endpoints

### GET /

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "glb-generator",
  "version": "1.0.0"
}
```

### POST /generate

Generate a 3D GLB model.

**Request Body:**
```json
{
  "address": "Berlin, Germany",
  "lat": 52.520008,
  "lon": 13.404954,
  "area_km2": 1,
  "size": "medium",
  "dimension": "3d",
  "color": "#2B2B2B",
  "engraving": "none"
}
```

**Response:**
```json
{
  "status": "ok",
  "address": "Berlin, Germany",
  "glb_url": "https://storage.googleapis.com/...",
  "render_url": "https://storage.googleapis.com/...",
  "filename": "models/abc123-1234567890.glb",
  "size_bytes": 12345,
  "expires_in_minutes": 15
}
```

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export BUCKET_NAME=cityxz-glb-models
export SIGNED_URL_TTL_MIN=15
export PORT=8080

# Run locally (requires gcloud auth)
npm start
```

## Testing

```bash
# Health check
curl https://YOUR-SERVICE-URL/

# Generate GLB
curl -X POST https://YOUR-SERVICE-URL/generate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Berlin, Germany",
    "lat": 52.520008,
    "lon": 13.404954,
    "color": "#2B2B2B",
    "size": "medium"
  }'
```

## Notes

- Service uses Application Default Credentials (no API keys in code)
- GLB files are stored with metadata for tracking
- Signed URLs expire after configured TTL (default: 15 minutes)
- CORS enabled for cross-origin requests from Shopify
- Auto-scales from 0 to handle traffic


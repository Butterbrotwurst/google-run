# Quick Start Guide

Deploy GLB Generator to Google Cloud Run in 5 minutes.

## Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Deploy in 3 Steps

### 1. Enable APIs

```bash
gcloud services enable run.googleapis.com storage.googleapis.com cloudbuild.googleapis.com
```

### 2. Create Storage Bucket

```bash
gcloud storage buckets create gs://cityxz-glb-models \
  --location=europe-west1 \
  --uniform-bucket-level-access
```

### 3. Deploy Service

```bash
gcloud run deploy glb-generator \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15
```

## Get Your Service URL

```bash
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)'
```

## Test It

```bash
# Replace YOUR_SERVICE_URL with your actual URL
curl -X POST https://YOUR_SERVICE_URL/generate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Berlin, Germany",
    "lat": 52.520008,
    "lon": 13.404954,
    "color": "#2B2B2B"
  }'
```

## Configure Shopify

1. Copy your Cloud Run service URL
2. Open Shopify Admin → Themes → Customize
3. Edit the Address Results section
4. Paste the URL in the "Cloud Run URL" field
5. Save

## Done! 🎉

Your GLB generator is now live and ready to use.

---

**Need help?** See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.







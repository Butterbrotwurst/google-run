#!/bin/bash
# Deployment Commands für Butterbrotwurst/google-run
# Project ID: fit-coral-475719-k1
# Cloud Run URL: https://google-run-756442272049.europe-west1.run.app

set -e  # Stop on error

echo "🚀 Starting deployment process..."

# Set project
echo "📦 Setting Google Cloud project..."
gcloud config set project fit-coral-475719-k1

# Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create bucket (skip if already exists)
echo "💾 Creating Storage bucket..."
gcloud storage buckets create gs://cityxz-glb-models \
  --location=europe-west1 \
  --uniform-bucket-level-access 2>/dev/null || echo "Bucket already exists, skipping..."

# Make bucket accessible
echo "🔓 Setting bucket permissions..."
gcloud storage buckets add-iam-policy-binding gs://cityxz-glb-models \
  --member=allUsers \
  --role=roles/storage.objectViewer 2>/dev/null || echo "Permission already set"

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
cd /Users/vahidenayati/cityxzbackendserver/cloud-run
gcloud run deploy glb-generator \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15

# Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your service URL:"
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)'

echo ""
echo "📝 Next steps:"
echo "1. Copy the service URL above"
echo "2. Go to Shopify Theme Customizer"
echo "3. Edit Address Results section"
echo "4. Paste URL in 'Cloud Run URL' field"
echo "5. Save and test!"







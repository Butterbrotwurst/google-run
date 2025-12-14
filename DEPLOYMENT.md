# Deployment Guide - GLB Generator Cloud Run

Complete step-by-step guide to deploy the GLB Generator service to Google Cloud Run.

## Prerequisites

- Google Cloud Project created
- gcloud CLI installed: https://cloud.google.com/sdk/docs/install
- Authenticated: `gcloud auth login`
- Billing enabled on your project

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port (auto-set by Cloud Run) | 8080 | No |
| `BUCKET_NAME` | GCS bucket name for GLB storage | cityxz-glb-models | Yes |
| `SIGNED_URL_TTL_MIN` | Signed URL expiration (minutes) | 15 | Yes |

## Step-by-Step Deployment

### 1. Set Project ID

```bash
# Set your Google Cloud project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 3. Create GCS Bucket

```bash
# Create bucket with uniform access control
gcloud storage buckets create gs://cityxz-glb-models \
  --location=europe-west1 \
  --uniform-bucket-level-access \
  --public-access-prevention

# Make bucket publicly readable (for signed URLs)
gcloud storage buckets add-iam-policy-binding gs://cityxz-glb-models \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

### 4. Deploy to Cloud Run

```bash
# Deploy from source (automatic containerization)
gcloud run deploy glb-generator \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15
```

**Deployment flags explained:**
- `--source .` - Deploy from current directory
- `--allow-unauthenticated` - Public access (no auth required)
- `--memory 1Gi` - 1GB RAM per instance
- `--cpu 1` - 1 vCPU per instance
- `--min-instances 0` - Scale to zero when idle
- `--max-instances 10` - Max concurrent instances
- `--timeout 300` - 5 minute request timeout

### 5. Get Service URL

```bash
# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)')

echo "Service deployed at: $SERVICE_URL"
```

### 6. Test the Service

```bash
# Health check
curl $SERVICE_URL/

# Generate test GLB
curl -X POST $SERVICE_URL/generate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Berlin, Germany",
    "lat": 52.520008,
    "lon": 13.404954,
    "color": "#2B2B2B",
    "size": "medium"
  }'
```

### 7. Configure Shopify Liquid Template

1. Copy the `SERVICE_URL` from step 5
2. In Shopify Admin, navigate to your theme
3. Edit `address-results.liquid` section
4. In the section settings, add the Cloud Run URL to the "Cloud Run URL" field
5. Save and test

## Update Deployment

```bash
# Redeploy with latest code changes
gcloud run deploy glb-generator \
  --source . \
  --region europe-west1
```

## Environment Variable Management

### View Current Environment Variables

```bash
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

### Update Environment Variables

```bash
gcloud run services update glb-generator \
  --region europe-west1 \
  --set-env-vars BUCKET_NAME=new-bucket-name,SIGNED_URL_TTL_MIN=30
```

### Add New Environment Variable

```bash
gcloud run services update glb-generator \
  --region europe-west1 \
  --update-env-vars NEW_VAR=value
```

## Monitoring & Logs

### View Logs

```bash
# Stream logs in real-time
gcloud run services logs tail glb-generator --region europe-west1

# View recent logs
gcloud run services logs read glb-generator --region europe-west1 --limit 50
```

### View Metrics

```bash
# Open Cloud Console monitoring
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)' | xargs -I {} echo "Metrics: https://console.cloud.google.com/run/detail/europe-west1/glb-generator/metrics"
```

## Service Account & Permissions

By default, Cloud Run uses the Compute Engine default service account which has Storage Admin permissions.

If you need a custom service account:

```bash
# Create service account
gcloud iam service-accounts create glb-generator-sa \
  --display-name "GLB Generator Service Account"

# Grant storage permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:glb-generator-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Deploy with custom service account
gcloud run deploy glb-generator \
  --source . \
  --region europe-west1 \
  --service-account glb-generator-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## Cost Optimization

```bash
# Scale to zero faster (reduce min instances)
gcloud run services update glb-generator \
  --region europe-west1 \
  --min-instances 0

# Reduce memory if possible
gcloud run services update glb-generator \
  --region europe-west1 \
  --memory 512Mi

# Set concurrency limits
gcloud run services update glb-generator \
  --region europe-west1 \
  --concurrency 80
```

## Security Best Practices

### Enable Authentication (Optional)

```bash
# Require authentication
gcloud run services update glb-generator \
  --region europe-west1 \
  --no-allow-unauthenticated
```

### Use VPC Connector (Optional)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create glb-connector \
  --region europe-west1 \
  --network default \
  --range 10.8.0.0/28

# Update service to use VPC
gcloud run services update glb-generator \
  --region europe-west1 \
  --vpc-connector glb-connector
```

## Troubleshooting

### Service won't start

```bash
# Check build logs
gcloud builds list --limit 5

# Get specific build log
gcloud builds log [BUILD_ID]
```

### Permission errors

```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:serviceAccount:*"
```

### High latency

```bash
# Increase CPU/memory
gcloud run services update glb-generator \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2
```

## Cleanup

```bash
# Delete Cloud Run service
gcloud run services delete glb-generator --region europe-west1

# Delete GCS bucket
gcloud storage rm -r gs://cityxz-glb-models

# Delete service account (if created)
gcloud iam service-accounts delete glb-generator-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference/run)


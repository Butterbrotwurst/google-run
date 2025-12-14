# Environment Variables Reference

## Required Environment Variables

### PORT
- **Description**: HTTP server port
- **Default**: `8080`
- **Required**: No (automatically set by Cloud Run)
- **Example**: `8080`

### BUCKET_NAME
- **Description**: Google Cloud Storage bucket name for storing GLB files
- **Default**: `cityxz-glb-models`
- **Required**: Yes
- **Example**: `cityxz-glb-models`
- **Notes**: Must be globally unique across all GCS buckets

### SIGNED_URL_TTL_MIN
- **Description**: Time-to-live for signed URLs in minutes
- **Default**: `15`
- **Required**: Yes
- **Example**: `15`, `30`, `60`
- **Notes**: Controls how long the generated GLB URLs remain accessible

## Local Development

For local development, set these environment variables:

```bash
export PORT=8080
export BUCKET_NAME=cityxz-glb-models
export SIGNED_URL_TTL_MIN=15
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Or create a `.env` file:

```
PORT=8080
BUCKET_NAME=cityxz-glb-models
SIGNED_URL_TTL_MIN=15
```

## Cloud Run Deployment

Set environment variables during deployment:

```bash
gcloud run deploy glb-generator \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15
```

Update environment variables after deployment:

```bash
gcloud run services update glb-generator \
  --region europe-west1 \
  --update-env-vars SIGNED_URL_TTL_MIN=30
```

## Authentication

Cloud Run uses **Application Default Credentials** for GCS access:
- In production: Uses the Cloud Run service account automatically
- Locally: Use `gcloud auth application-default login`
- CI/CD: Use service account key file

No API keys or credentials need to be stored in environment variables!


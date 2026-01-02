# Files Ready for GitHub

All files have been created in `/Users/vahidenayati/cityxzbackendserver/cloud-run/`

## GitHub Repository Structure

Copy these files to your GitHub "google-run" repository:

```
google-run/
├── package.json              # Node.js dependencies
├── server.js                 # Main Express server
├── utils/
│   └── glb.js               # GLB generation utility
├── .dockerignore            # Docker build exclusions
├── README.md                # Main documentation
├── QUICKSTART.md            # 5-minute deployment guide
├── DEPLOYMENT.md            # Complete deployment guide
└── ENV_VARIABLES.md         # Environment variables reference
```

## What Each File Does

### Core Application Files

1. **package.json**
   - Node.js dependencies (Express, Google Cloud Storage, glTF)
   - Scripts and engine requirements

2. **server.js**
   - Express server with POST /generate endpoint
   - GCS upload and signed URL generation
   - CORS enabled for Shopify

3. **utils/glb.js**
   - GLB file generation using @gltf-transform
   - Creates textured 3D box with configurable color
   - Exports valid GLB format

### Configuration Files

4. **.dockerignore**
   - Excludes unnecessary files from Docker build
   - Reduces image size

### Documentation Files

5. **README.md**
   - Complete service overview
   - API endpoints documentation
   - Local development instructions

6. **QUICKSTART.md**
   - Fast 5-minute deployment guide
   - Essential commands only

7. **DEPLOYMENT.md**
   - Comprehensive deployment instructions
   - Monitoring, troubleshooting, security
   - Production best practices

8. **ENV_VARIABLES.md**
   - Complete environment variables reference
   - Local and Cloud Run configuration

## Shopify Integration

**Updated File**: `address-results.liquid`

Changes made:
- ✅ Replaced Supabase API with Cloud Run endpoint
- ✅ Simplified job creation (direct POST /generate)
- ✅ Removed worker polling logic
- ✅ Added Cloud Run URL configuration field in section schema
- ✅ Updated error handling for new response format

## Next Steps

1. **Copy all files to GitHub**:
   ```bash
   cd /Users/vahidenayati/cityxzbackendserver/cloud-run
   git init
   git add .
   git commit -m "Initial GLB generator service"
   git remote add origin https://github.com/YOUR_USERNAME/google-run.git
   git push -u origin main
   ```

2. **Deploy to Cloud Run**:
   - Follow [QUICKSTART.md](QUICKSTART.md) for fast deployment
   - Or see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed steps

3. **Get Service URL**:
   ```bash
   gcloud run services describe glb-generator \
     --region europe-west1 \
     --format 'value(status.url)'
   ```

4. **Configure Shopify**:
   - Update `address-results.liquid` on Shopify
   - Add Cloud Run URL to section settings
   - Test the flow

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| package.json | 17 | Dependencies |
| server.js | 100 | API server |
| utils/glb.js | 122 | GLB generator |
| .dockerignore | 9 | Build config |
| README.md | 142 | Documentation |
| QUICKSTART.md | 68 | Quick start |
| DEPLOYMENT.md | 294 | Full guide |
| ENV_VARIABLES.md | 72 | Env vars |

**Total**: 8 files ready for production deployment

## Testing Locally

```bash
cd cloud-run
npm install
export BUCKET_NAME=cityxz-glb-models
export SIGNED_URL_TTL_MIN=15
gcloud auth application-default login
npm start
```

Then test:
```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"address":"Berlin","lat":52.52,"lon":13.4,"color":"#2B2B2B"}'
```

---

✅ **All files created successfully!**
✅ **Liquid template updated!**
✅ **Ready for GitHub & Cloud Run deployment!**







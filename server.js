const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const { generateGLB } = require('./utils/glb');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const BUCKET_NAME = process.env.BUCKET_NAME || 'cityxz-glb-models';
const SIGNED_URL_TTL_MIN = parseInt(process.env.SIGNED_URL_TTL_MIN || '15', 10);

// Initialize GCS client
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'glb-generator', version: '1.0.0' });
});

// Generate GLB endpoint
app.post('/generate', async (req, res) => {
  try {
    const {
      address,
      lat,
      lon,
      area_km2,
      zoom,
      size,
      dimension,
      style,
      color,
      engraving
    } = req.body;

    // Validate required fields
    if (!address && !lat && !lon) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'At least one of: address, lat, or lon is required'
      });
    }

    console.log('[Generate] Request received:', {
      address,
      lat,
      lon,
      color,
      size,
      dimension
    });

    // Generate unique filename
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${address}-${lat}-${lon}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    const filename = `models/${hash}-${timestamp}.glb`;

    // Generate GLB file with OSM data
    console.log('[Generate] Creating GLB from OSM data:', { lat, lon, area_km2 });
    const glbBuffer = await generateGLB({
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      area_km2: parseFloat(area_km2 || 1),
      address: address || `${lat}, ${lon}`
    });

    console.log('[Generate] GLB generated, size:', glbBuffer.length, 'bytes');

    // Upload to GCS
    const file = bucket.file(filename);
    await file.save(glbBuffer, {
      contentType: 'model/gltf-binary',
      metadata: {
        metadata: {
          address: address || '',
          lat: lat ? lat.toString() : '',
          lon: lon ? lon.toString() : '',
          area_km2: area_km2 ? area_km2.toString() : '',
          size: size || 'medium',
          dimension: dimension || '3d',
          color: color || '#2B2B2B',
          generatedAt: new Date().toISOString()
        }
      }
    });

    console.log('[Generate] Uploaded to GCS:', filename);

    // Generate signed URLs
    const [glbSignedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MIN * 60 * 1000
    });

    // For MVP, use the same GLB URL for render_url (later can be PNG thumbnail)
    const renderUrl = glbSignedUrl;

    console.log('[Generate] Signed URLs generated');

    // Return response
    res.json({
      status: 'ok',
      address: address || `${lat}, ${lon}`,
      glb_url: glbSignedUrl,
      render_url: renderUrl,
      filename,
      size_bytes: glbBuffer.length,
      expires_in_minutes: SIGNED_URL_TTL_MIN
    });

  } catch (error) {
    console.error('[Generate] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`GLB Generator service listening on port ${PORT}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Signed URL TTL: ${SIGNED_URL_TTL_MIN} minutes`);
});







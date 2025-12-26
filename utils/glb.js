const { Document, NodeIO } = require('@gltf-transform/core');
const { prune, weld } = require('@gltf-transform/functions');

// Constants (converted to meters for glTF)
const PLATE_SIZE_M = 0.218; // 218mm = 0.218m
const PLATE_THICKNESS_M = 0.0008; // 0.8mm = 0.0008m
const HEIGHTS_M = {
  road: 0.0004, // 0.40mm = 0.0004m
  water: 0.0000, // 0.00mm
  waterDepth: 0.0002, // 0.20mm = 0.0002m
  grass: 0.0004, // 0.40mm = 0.0004m
  buildingScale: 1.20,
  buildingMinHeight: 0.001, // 1.00mm = 0.001m
  sand: 0.0002 // 0.20mm = 0.0002m
};
const FILTERS = {
  waterMinArea: 10.0, // m²
  buildingMinArea: 1.0 // m²
};

// List of Overpass API servers for redundancy
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

/**
 * Fetch OSM data from Overpass API with retries and failover
 */
async function fetchOSMData(lat, lon, areaKm2) {
  const radiusKm = Math.sqrt(areaKm2 / Math.PI);
  const bbox = {
    south: lat - radiusKm / 111.32,
    north: lat + radiusKm / 111.32,
    west: lon - radiusKm / (111.32 * Math.cos(lat * Math.PI / 180)),
    east: lon + radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))
  };

  // Increased timeout to 90s
  const overpassQuery = `
    [out:json][timeout:90];
    (
      way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["natural"="water"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["landuse"~"^(grass|meadow|park)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["natural"~"^(beach|sand)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      relation["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out body;
    >;
    out skel qt;
  `;

  let lastError = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(`[GLB] Fetching from ${server}...`);
      
      // Node 18+ has native fetch. Add a client-side timeout slightly larger than the API timeout.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100000); // 100s client timeout
      
      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        console.warn(`[GLB] ${server} returned ${status}`);
        // If it's a server error or rate limit, try the next server
        if (status === 429 || status === 504 || status >= 500) {
          lastError = new Error(`Overpass API error: ${status}`);
          continue; 
        }
        throw new Error(`Overpass API error: ${status}`);
      }

      const data = await response.json();
      if (!data || !data.elements) {
        throw new Error('Invalid Overpass response format');
      }
      
      console.log(`[GLB] Successfully fetched ${data.elements.length} elements from ${server}`);
      return data;

    } catch (err) {
      console.warn(`[GLB] Failed to fetch from ${server}:`, err.message);
      lastError = err;
      // Continue to next server
    }
  }

  throw lastError || new Error('All Overpass servers failed');
}

/**
 * Calculate area of a polygon in m² (using lat/lon coordinates)
 */
function calculateArea(latLonPoints) {
  if (latLonPoints.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < latLonPoints.length; i++) {
    const j = (i + 1) % latLonPoints.length;
    area += latLonPoints[i].lon * latLonPoints[j].lat;
    area -= latLonPoints[j].lon * latLonPoints[i].lat;
  }
  // Convert to m² (approximate, using Earth radius)
  const earthRadius = 6371000; // meters
  return Math.abs(area) * earthRadius * earthRadius / 2;
}

/**
 * Transform lat/lon to local coordinates (meters on plate, centered at 0,0)
 */
function transformToPlateCoords(lat, lon, centerLat, centerLon, plateSizeM, areaKm2) {
  // Calculate distance in meters
  const latOffsetM = (lat - centerLat) * 111320; // meters per degree latitude
  const lonOffsetM = (lon - centerLon) * 111320 * Math.cos(centerLat * Math.PI / 180); // meters per degree longitude
  
  // Calculate bounding box size in meters
  // For area_km2, radius is sqrt(area_km2 / PI) km
  const radiusKm = Math.sqrt(areaKm2 / Math.PI);
  const bboxSizeM = radiusKm * 2 * 1000; // meters (diameter)
  
  // Scale to plate size (0.218m = 218mm)
  const scale = plateSizeM / bboxSizeM; // meters per meter
  
  const x = lonOffsetM * scale; // meters (positive = east)
  const y = -latOffsetM * scale; // meters (positive = north, flipped for Y-up)
  
  return { x, y };
}

/**
 * Create extruded geometry from polygon
 */
function createExtrudedGeometry(points, height, baseHeight = 0) {
  const positions = [];
  const normals = [];
  const indices = [];

  const numPoints = points.length;
  if (numPoints < 3) return { positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint16Array(0) };

  // Bottom face vertices
  const bottomStart = positions.length / 3;
  for (let i = 0; i < numPoints; i++) {
    positions.push(points[i].x, points[i].y, baseHeight);
    normals.push(0, 0, -1);
  }
  // Bottom face triangles (fan)
  for (let i = 1; i < numPoints - 1; i++) {
    indices.push(bottomStart, bottomStart + i, bottomStart + i + 1);
  }

  // Top face vertices
  const topStart = positions.length / 3;
  for (let i = 0; i < numPoints; i++) {
    positions.push(points[i].x, points[i].y, baseHeight + height);
    normals.push(0, 0, 1);
  }
  // Top face triangles (fan, reversed)
  for (let i = 1; i < numPoints - 1; i++) {
    indices.push(topStart, topStart + i + 1, topStart + i);
  }

  // Side faces
  for (let i = 0; i < numPoints; i++) {
    const j = (i + 1) % numPoints;
    const v0 = points[i];
    const v1 = points[j];
    
    // Calculate normal for side (perpendicular to edge, pointing outward)
    const dx = v1.x - v0.x;
    const dy = v1.y - v0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) continue; // Skip degenerate edges
    const nx = -dy / len;
    const ny = dx / len;

    const sideStart = positions.length / 3;
    
    // Four vertices for this side quad
    positions.push(v0.x, v0.y, baseHeight);
    positions.push(v1.x, v1.y, baseHeight);
    positions.push(v1.x, v1.y, baseHeight + height);
    positions.push(v0.x, v0.y, baseHeight + height);

    normals.push(nx, ny, 0);
    normals.push(nx, ny, 0);
    normals.push(nx, ny, 0);
    normals.push(nx, ny, 0);

    // Two triangles for the quad
    indices.push(sideStart, sideStart + 1, sideStart + 2);
    indices.push(sideStart, sideStart + 2, sideStart + 3);
  }

  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

/**
 * Create base plate (0.218m x 0.218m x 0.0008m)
 */
function createBasePlate(plateSizeM, thicknessM) {
  const half = plateSizeM / 2;
  const positions = new Float32Array([
    -half, -half, 0,      half, -half, 0,      half, half, 0,      -half, half, 0,  // Top
    -half, -half, -thicknessM,  -half, half, -thicknessM,  half, half, -thicknessM,  half, -half, -thicknessM,  // Bottom
    -half, -half, 0,      -half, half, 0,      -half, half, -thicknessM,  -half, -half, -thicknessM,  // Left
    half, -half, 0,      half, -half, -thicknessM,      half, half, -thicknessM,  half, half, 0,  // Right
    -half, half, 0,      half, half, 0,      half, half, -thicknessM,  -half, half, -thicknessM,  // Front
    -half, -half, 0,      -half, -half, -thicknessM,      half, -half, -thicknessM,  half, -half, 0   // Back
  ]);

  const normals = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  // Top
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,  // Bottom
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  // Left
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  // Right
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  // Front
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0   // Back
  ]);

  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,    // Top
    4, 5, 6,  4, 6, 7,    // Bottom
    8, 9, 10,  8, 10, 11,  // Left
    12, 13, 14,  12, 14, 15,  // Right
    16, 17, 18,  16, 18, 19,  // Front
    20, 21, 22,  20, 22, 23   // Back
  ]);

  return { positions, normals, indices };
}

/**
 * Generate 3D GLB model from OSM data
 */
async function generateGLB(options = {}) {
  const { 
    lat, 
    lon, 
    area_km2 = 1, 
    address = 'Unknown' 
  } = options;

  if (!lat || !lon) {
    throw new Error('Latitude and longitude are required');
  }

  console.log('[GLB] Fetching OSM data for', lat, lon, area_km2);
  const osmData = await fetchOSMData(lat, lon, area_km2);

  // Create document
  const document = new Document();
  document.createBuffer();

  // White material
  const whiteMaterial = document.createMaterial('WhiteMaterial')
    .setBaseColorFactor([1.0, 1.0, 1.0, 1.0])
    .setMetallicFactor(0.0)
    .setRoughnessFactor(0.8);

  const scene = document.createScene('MainScene');
  let vertexOffset = 0;

  // Create base plate
  const plate = createBasePlate(PLATE_SIZE_M, PLATE_THICKNESS_M);
  const platePosAccessor = document.createAccessor().setType('VEC3').setArray(plate.positions);
  const plateNormAccessor = document.createAccessor().setType('VEC3').setArray(plate.normals);
  const plateIndAccessor = document.createAccessor().setType('SCALAR').setArray(plate.indices);
  const platePrimitive = document.createPrimitive()
    .setIndices(plateIndAccessor)
    .setAttribute('POSITION', platePosAccessor)
    .setAttribute('NORMAL', plateNormAccessor)
    .setMaterial(whiteMaterial);
  const plateMesh = document.createMesh('PlateMesh').addPrimitive(platePrimitive);
  const plateNode = document.createNode('PlateNode').setMesh(plateMesh);
  scene.addChild(plateNode);
  vertexOffset += plate.positions.length / 3;

  // Process OSM elements
  const nodes = {};
  if (osmData.elements) {
    // Index nodes
    osmData.elements.forEach(el => {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lon: el.lon };
      }
    });

    // Process ways
    const ways = osmData.elements.filter(el => el.type === 'way' && el.nodes);
    
    for (const way of ways) {
      if (!way.nodes || way.nodes.length < 3) continue;

      // Get lat/lon coordinates first
      const latLonCoords = way.nodes
        .map(nodeId => nodes[nodeId])
        .filter(n => n);

      if (latLonCoords.length < 3) continue;

      // Calculate area in m²
      const area = calculateArea(latLonCoords);

      // Transform to plate coordinates
      const coords = latLonCoords.map(n => transformToPlateCoords(n.lat, n.lon, lat, lon, PLATE_SIZE_M, area_km2));

      // Determine feature type and height
      let height = 0;
      let baseHeight = 0;
      let skip = false;

      if (way.tags?.building) {
        if (area < FILTERS.buildingMinArea) skip = true;
        const buildingHeight = parseFloat(way.tags['building:levels'] || '1') * 3; // ~3m per floor
        height = Math.max(HEIGHTS_M.buildingMinHeight, buildingHeight * HEIGHTS_M.buildingScale / 1000);
      } else if (way.tags?.highway) {
        height = HEIGHTS_M.road;
      } else if (way.tags?.natural === 'water' || way.tags?.waterway) {
        if (area < FILTERS.waterMinArea) skip = true;
        baseHeight = -HEIGHTS_M.waterDepth;
        height = HEIGHTS_M.water;
      } else if (way.tags?.landuse === 'grass' || way.tags?.landuse === 'meadow' || way.tags?.landuse === 'park') {
        height = HEIGHTS_M.grass;
      } else if (way.tags?.natural === 'beach' || way.tags?.natural === 'sand') {
        height = HEIGHTS_M.sand;
      } else {
        continue; // Skip unknown features
      }

      if (skip || height === 0) continue;

      // Create extruded geometry
      const geom = createExtrudedGeometry(coords, height, baseHeight);
      
      // Adjust indices for vertex offset
      const adjustedIndices = new Uint16Array(geom.indices.length);
      for (let i = 0; i < geom.indices.length; i++) {
        adjustedIndices[i] = geom.indices[i] + vertexOffset;
      }

      const posAccessor = document.createAccessor().setType('VEC3').setArray(geom.positions);
      const normAccessor = document.createAccessor().setType('VEC3').setArray(geom.normals);
      const indAccessor = document.createAccessor().setType('SCALAR').setArray(adjustedIndices);
      
  const primitive = document.createPrimitive()
        .setIndices(indAccessor)
        .setAttribute('POSITION', posAccessor)
        .setAttribute('NORMAL', normAccessor)
        .setMaterial(whiteMaterial);

      const mesh = document.createMesh(`FeatureMesh_${way.id}`).addPrimitive(primitive);
      const node = document.createNode(`FeatureNode_${way.id}`).setMesh(mesh);
      scene.addChild(node);

      vertexOffset += geom.positions.length / 3;
    }
  }

  document.getRoot().setDefaultScene(scene);

  // Metadata
  const asset = document.getRoot().getAsset();
  if (asset && typeof asset.generator !== 'undefined') {
    asset.generator = 'CityXZ OSM GLB Generator';
  }
  document.getRoot().setExtras({ address, lat, lon, area_km2 });

  // Optimize
  await document.transform(
    prune(),
    weld({ tolerance: 0.0001 })
  );

  // Write to GLB
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(document);

  return Buffer.from(glbBuffer);
}

module.exports = { generateGLB };

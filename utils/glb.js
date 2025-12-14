const { Document, NodeIO } = require('@gltf-transform/core');
const { prune, weld } = require('@gltf-transform/functions');

/**
 * Generate a simple 3D box GLB file with color
 * @param {Object} options - Configuration options
 * @param {string} options.color - Hex color (e.g., "#2B2B2B")
 * @param {string} options.address - Address for metadata
 * @returns {Promise<Buffer>} GLB file as buffer
 */
async function generateGLB(options = {}) {
  const { color = '#2B2B2B', address = 'Unknown' } = options;
  
  // Parse color to RGB (0-1 range)
  const hexColor = color.replace('#', '');
  const r = parseInt(hexColor.substr(0, 2), 16) / 255;
  const g = parseInt(hexColor.substr(2, 2), 16) / 255;
  const b = parseInt(hexColor.substr(4, 2), 16) / 255;

  // Create document
  const document = new Document();
  
  // Create material with color
  const material = document.createMaterial('BoxMaterial')
    .setBaseColorFactor([r, g, b, 1.0])
    .setMetallicFactor(0.1)
    .setRoughnessFactor(0.8);

  // Create box geometry (simple cube)
  const positions = new Float32Array([
    // Front face
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
    // Back face
    -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
    // Top face
    -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
    // Bottom face
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
    // Right face
     1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
    // Left face
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
  ]);

  const normals = new Float32Array([
    // Front
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // Back
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // Top
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // Bottom
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // Right
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // Left
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
  ]);

  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,    // Front
    4, 5, 6,  4, 6, 7,    // Back
    8, 9, 10, 8, 10, 11,  // Top
    12, 13, 14, 12, 14, 15, // Bottom
    16, 17, 18, 16, 18, 19, // Right
    20, 21, 22, 20, 22, 23  // Left
  ]);

  // Create accessors
  const positionAccessor = document.createAccessor()
    .setType('VEC3')
    .setArray(positions);

  const normalAccessor = document.createAccessor()
    .setType('VEC3')
    .setArray(normals);

  const indicesAccessor = document.createAccessor()
    .setType('SCALAR')
    .setArray(indices);

  // Create primitive
  const primitive = document.createPrimitive()
    .setIndices(indicesAccessor)
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL', normalAccessor)
    .setMaterial(material);

  // Create mesh
  const mesh = document.createMesh('BoxMesh')
    .addPrimitive(primitive);

  // Create node and scene
  const node = document.createNode('BoxNode')
    .setMesh(mesh)
    .setTranslation([0, 0, 0])
    .setScale([1, 1, 1]);

  const scene = document.createScene('MainScene')
    .addChild(node);

  document.getRoot().setDefaultScene(scene);

  // Add metadata
  const asset = document.getRoot().getAsset();
  if (asset && typeof asset.generator !== 'undefined') {
    asset.generator = 'CityXZ GLB Generator';
  }
  
  // Add extras/metadata
  document.getRoot().setExtras({ address });

  // Optimize
  await document.transform(
    prune(),
    weld({ tolerance: 0.0001 })
  );

  // Write to GLB buffer
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(document);

  return Buffer.from(glbBuffer);
}

module.exports = { generateGLB };


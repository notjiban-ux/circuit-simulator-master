// ============================================
// PCB 3D View — Three.js Renderer
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let container;
let boardGroup;
let isInitialized = false;
let animationFrameId;

const SCALE = 0.01; // Convert board units to 3D units

// ============================================
// Initialize 3D Scene
// ============================================
export function init3DView(containerEl) {
  container = containerEl;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.15);

  // Camera
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(4, 5, 6);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.target.set(0, 0, 0);

  // Lighting
  setupLighting();

  // Ground plane / environment
  setupEnvironment();

  // Board group
  boardGroup = new THREE.Group();
  scene.add(boardGroup);

  // Resize handler
  const resizeObserver = new ResizeObserver(() => resize3D());
  resizeObserver.observe(container);

  isInitialized = true;
}

function setupLighting() {
  // Ambient
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);

  // Main directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -5;
  dirLight.shadow.camera.right = 5;
  dirLight.shadow.camera.top = 5;
  dirLight.shadow.camera.bottom = -5;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0x00e5a0, 0.3);
  fillLight.position.set(-3, 5, -3);
  scene.add(fillLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0x00bfff, 0.2);
  rimLight.position.set(0, 2, -5);
  scene.add(rimLight);

  // Point lights for atmosphere
  const pointLight1 = new THREE.PointLight(0x00e5a0, 0.4, 10);
  pointLight1.position.set(-3, 3, 2);
  scene.add(pointLight1);
}

function setupEnvironment() {
  // Grid helper
  const grid = new THREE.GridHelper(20, 40, 0x1a2233, 0x111822);
  grid.position.y = -0.1;
  scene.add(grid);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0d1117,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.11;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ============================================
// Resize
// ============================================
function resize3D() {
  if (!isInitialized || !container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ============================================
// Animation Loop
// ============================================
function animate() {
  if (!isInitialized) return;
  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

export function show3D() {
  if (!isInitialized) return;
  resize3D();
  animate();
}

export function hide3D() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ============================================
// Update Board
// ============================================
export function update3DBoard(board, state) {
  if (!isInitialized) return;

  // Clear existing
  while (boardGroup.children.length > 0) {
    const child = boardGroup.children[0];
    boardGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }

  // Board dimensions
  const bw = (state.boardWidth || 500) * SCALE;
  const bh = (state.boardHeight || 400) * SCALE;
  const boardThickness = 0.16;

  // PCB Board Body
  createPCBBoard(bw, bh, boardThickness);

  // Components
  board.components.forEach(comp => {
    create3DComponent(comp, boardThickness, state);
  });

  // Traces
  board.traces.forEach(trace => {
    create3DTrace(trace, boardThickness);
  });

  // Vias
  board.vias.forEach(via => {
    create3DVia(via, boardThickness);
  });
}

function createPCBBoard(bw, bh, thickness) {
  // Solder mask layer (green)
  const boardGeo = new THREE.BoxGeometry(bw, thickness, bh);
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x1a6b3c,
    roughness: 0.4,
    metalness: 0.1,
  });
  const boardMesh = new THREE.Mesh(boardGeo, boardMat);
  boardMesh.position.y = thickness / 2;
  boardMesh.castShadow = true;
  boardMesh.receiveShadow = true;
  boardGroup.add(boardMesh);

  // FR4 substrate visible at edges
  const edgeGeo = new THREE.BoxGeometry(bw + 0.01, thickness * 0.6, bh + 0.01);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xc4a265,
    roughness: 0.6,
    metalness: 0.0,
  });
  const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
  edgeMesh.position.y = thickness / 2;
  boardGroup.add(edgeMesh);

  // Copper layer hint (inner)
  const copperGeo = new THREE.BoxGeometry(bw - 0.02, 0.01, bh - 0.02);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.3,
    metalness: 0.8,
  });
  const copperMesh = new THREE.Mesh(copperGeo, copperMat);
  copperMesh.position.y = thickness + 0.005;
  boardGroup.add(copperMesh);

  // Mounting holes
  const holePositions = [
    [-bw / 2 + 0.15, -bh / 2 + 0.15],
    [bw / 2 - 0.15, -bh / 2 + 0.15],
    [-bw / 2 + 0.15, bh / 2 - 0.15],
    [bw / 2 - 0.15, bh / 2 - 0.15],
  ];

  holePositions.forEach(([hx, hz]) => {
    // Copper ring
    const ringGeo = new THREE.CylinderGeometry(0.06, 0.06, thickness + 0.02, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(hx, thickness / 2, hz);
    boardGroup.add(ring);

    // Hole
    const holeGeo = new THREE.CylinderGeometry(0.03, 0.03, thickness + 0.04, 16);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(hx, thickness / 2, hz);
    boardGroup.add(hole);
  });
}

function create3DComponent(comp, boardThickness, state) {
  const compGroup = new THREE.Group();
  const x = comp.x * SCALE;
  const z = comp.y * SCALE;
  const y = boardThickness;

  const type = comp.type;

  if (type.startsWith('ic')) {
    createIC3D(compGroup, comp, type);
  } else if (type === 'resistor') {
    createResistor3D(compGroup, comp);
  } else if (type === 'capacitor') {
    createCapacitor3D(compGroup, comp);
  } else if (type === 'led') {
    createLED3D(compGroup, comp, state.isSimulating);
  } else if (type === 'crystal') {
    createCrystal3D(compGroup, comp);
  } else if (type === 'usb' || type === 'barrel') {
    createConnector3D(compGroup, comp);
  } else if (type.startsWith('header')) {
    createHeader3D(compGroup, comp);
  } else {
    createGeneric3D(compGroup, comp);
  }

  compGroup.position.set(x, y, z);
  compGroup.rotation.y = -(comp.rotation || 0) * Math.PI / 180;
  boardGroup.add(compGroup);
}

function createIC3D(group, comp, type) {
  const sizes = { ic8: [0.6, 0.5], ic16: [0.6, 0.8], ic28: [0.6, 1.2] };
  const [w, h] = sizes[type] || [0.6, 0.5];
  const bodyH = 0.12;

  // Body
  const bodyGeo = new THREE.BoxGeometry(w * SCALE * 100, bodyH, h * SCALE * 100);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.4,
    metalness: 0.2,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = bodyH / 2;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Pin 1 dot
  const dotGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(-w * SCALE * 100 / 2 + 0.06, bodyH + 0.01, -h * SCALE * 100 / 2 + 0.06);
  group.add(dot);

  // Pins (left and right)
  const pinsMap = { ic8: 4, ic16: 8, ic28: 14 };
  const pinsPerSide = pinsMap[type] || 4;
  const pinSpacing = h * SCALE * 100 / (pinsPerSide + 1);

  for (let i = 1; i <= pinsPerSide; i++) {
    // Left
    const pinGeoL = new THREE.BoxGeometry(0.08, 0.01, 0.02);
    const pinMatL = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.3 });
    const pinL = new THREE.Mesh(pinGeoL, pinMatL);
    pinL.position.set(-w * SCALE * 100 / 2 - 0.04, 0.02, -h * SCALE * 100 / 2 + i * pinSpacing);
    group.add(pinL);

    // Right
    const pinR = new THREE.Mesh(pinGeoL.clone(), pinMatL.clone());
    pinR.position.set(w * SCALE * 100 / 2 + 0.04, 0.02, -h * SCALE * 100 / 2 + i * pinSpacing);
    group.add(pinR);
  }
}

function createResistor3D(group, comp) {
  // SMD resistor body
  const bodyGeo = new THREE.BoxGeometry(0.45, 0.06, 0.18);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.04;
  body.castShadow = true;
  group.add(body);

  // Pads
  const padGeo = new THREE.BoxGeometry(0.1, 0.02, 0.2);
  const padMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.3 });
  const padL = new THREE.Mesh(padGeo, padMat);
  padL.position.set(-0.2, 0.01, 0);
  group.add(padL);
  const padR = new THREE.Mesh(padGeo.clone(), padMat.clone());
  padR.position.set(0.2, 0.01, 0);
  group.add(padR);
}

function createCapacitor3D(group, comp) {
  // Ceramic cap
  const bodyGeo = new THREE.BoxGeometry(0.3, 0.1, 0.2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a5f9e,
    roughness: 0.4,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.06;
  body.castShadow = true;
  group.add(body);

  // Pads
  const padGeo = new THREE.BoxGeometry(0.08, 0.02, 0.22);
  const padMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.3 });
  const padL = new THREE.Mesh(padGeo, padMat);
  padL.position.set(-0.15, 0.01, 0);
  group.add(padL);
  const padR = new THREE.Mesh(padGeo.clone(), padMat.clone());
  padR.position.set(0.15, 0.01, 0);
  group.add(padR);
}

function createLED3D(group, comp, isSimulating) {
  const ledColor = comp.value === 'Green' ? 0x00ff44 : comp.value === 'Blue' ? 0x4488ff : 0xff2222;

  // LED dome
  const domeGeo = new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshPhysicalMaterial({
    color: isSimulating && comp.simActive ? ledColor : 0x442222,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.5,
    thickness: 0.5,
    emissive: isSimulating && comp.simActive ? ledColor : 0x000000,
    emissiveIntensity: isSimulating && comp.simActive ? 2 : 0,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0.02;
  dome.castShadow = true;
  group.add(dome);

  // LED glow light
  if (isSimulating && comp.simActive) {
    const light = new THREE.PointLight(ledColor, 0.5, 2);
    light.position.set(0, 0.15, 0);
    group.add(light);
  }

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.01;
  group.add(base);
}

function createCrystal3D(group, comp) {
  const bodyGeo = new THREE.BoxGeometry(0.3, 0.08, 0.18);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.2,
    metalness: 0.9,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.05;
  body.castShadow = true;
  group.add(body);
}

function createConnector3D(group, comp) {
  const isUSB = comp.type === 'usb';
  const w = isUSB ? 0.4 : 0.35;
  const h = isUSB ? 0.25 : 0.3;
  const d = isUSB ? 0.4 : 0.35;

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isUSB ? 0xaaaaaa : 0x333333,
    roughness: isUSB ? 0.3 : 0.5,
    metalness: isUSB ? 0.7 : 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = h / 2 + 0.01;
  body.castShadow = true;
  group.add(body);

  if (isUSB) {
    // USB port opening
    const portGeo = new THREE.BoxGeometry(0.3, 0.12, 0.1);
    const portMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const port = new THREE.Mesh(portGeo, portMat);
    port.position.set(0, h / 2, -d / 2 + 0.02);
    group.add(port);
  }
}

function createHeader3D(group, comp) {
  const pins = comp.type === 'header4' ? 4 : 2;
  const pinHeight = 0.3;
  const spacing = 0.1;

  for (let i = 0; i < pins; i++) {
    const pinGeo = new THREE.BoxGeometry(0.04, pinHeight, 0.04);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.9,
    });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, pinHeight / 2, (i - (pins - 1) / 2) * spacing);
    pin.castShadow = true;
    group.add(pin);
  }

  // Plastic housing
  const housingGeo = new THREE.BoxGeometry(0.12, 0.1, pins * spacing + 0.06);
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.7,
  });
  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.position.y = 0.05;
  group.add(housing);
}

function createGeneric3D(group, comp) {
  const bodyGeo = new THREE.BoxGeometry(0.3, 0.12, 0.25);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.5,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.07;
  body.castShadow = true;
  group.add(body);
}

function create3DTrace(trace, boardThickness) {
  if (trace.points.length < 2) return;

  const color = trace.layer === 'bottom-copper' ? 0x4444ff : 0xff4444;
  const yOffset = trace.layer === 'bottom-copper' ? -0.005 : boardThickness + 0.008;

  const points = trace.points.map(p => 
    new THREE.Vector3(p.x * SCALE, yOffset, p.y * SCALE)
  );

  const path = new THREE.CatmullRomCurve3(points, false, 'chordal');
  const tubeGeo = new THREE.TubeGeometry(path, Math.max(4, points.length * 4), 0.015, 4, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.7,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  boardGroup.add(tube);
}

function create3DVia(via, boardThickness) {
  const x = via.x * SCALE;
  const z = via.y * SCALE;

  // Outer ring
  const ringGeo = new THREE.CylinderGeometry(0.05, 0.05, boardThickness + 0.02, 12);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.3,
    metalness: 0.8,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, boardThickness / 2, z);
  boardGroup.add(ring);

  // Hole
  const holeGeo = new THREE.CylinderGeometry(0.025, 0.025, boardThickness + 0.04, 12);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.position.set(x, boardThickness / 2, z);
  boardGroup.add(hole);
}

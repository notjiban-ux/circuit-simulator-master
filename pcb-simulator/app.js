/* ============================================
   Diode — 3D Hardware Simulator
   Full Client-Side App with Three.js Integration
   ============================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// COMPONENT DEFINITIONS
// ============================================
const COMPONENT_DEFS = {
  arduino: {
    name: 'Arduino Uno', color: 0x007acc, width: 1.4, depth: 1.0, height: 0.2,
    bodyColor: 0x006bb4, pinColor: 0xffd700, label: 'UNO',
  },
  resistor: {
    name: 'Resistor', color: 0xd4944c, width: 0.6, depth: 0.2, height: 0.1,
    bodyColor: 0xe6dcc8, pinColor: 0xb87333, label: '10kΩ',
  },
  capacitor: {
    name: 'Capacitor', color: 0x2a5f9e, width: 0.35, depth: 0.25, height: 0.15,
    bodyColor: 0x2a5f9e, pinColor: 0xb87333, label: '100nF',
  },
  transistor: {
    name: 'Transistor', color: 0x333333, width: 0.4, depth: 0.4, height: 0.25,
    bodyColor: 0x222222, pinColor: 0xb87333, label: '2N2222',
  },
  ic: {
    name: 'IC Chip', color: 0x1a1a2e, width: 0.8, depth: 0.5, height: 0.15,
    bodyColor: 0x1a1a2e, pinColor: 0xb87333, label: 'NE555',
  },
  led: {
    name: 'LED', color: 0xff2222, width: 0.3, depth: 0.3, height: 0.2,
    bodyColor: 0xff2222, pinColor: 0x888888, label: 'LED',
  },
  diode: {
    name: 'Diode', color: 0x444444, width: 0.5, depth: 0.2, height: 0.12,
    bodyColor: 0x333333, pinColor: 0xb87333, label: '1N4148',
  },
};

// ============================================
// STATE
// ============================================
const state = {
  currentPage: 'login',
  user: null,
  darkMode: false,
  simulating: false,
  selectedTool: 'select',
  zoom: 100,
  currentView: '3d',
  // 3D state
  components: [],       // { id, type, mesh, group, x, z, rotation }
  selectedComponent: null,
  draggingInScene: false,
  dragPlane: null,
  dragOffset: new THREE.Vector3(),
};

// 3D globals
let scene, camera, renderer, controls, raycaster, mouse;
let boardGroup, componentGroup;
let threeContainer;
let animFrameId = null;
let threeInitialized = false;

// ── DOM Refs ──
const pages = {};

// ============================================
// INIT
// ============================================
function init() {
  pages.login = document.getElementById('page-login');
  pages.dashboard = document.getElementById('page-dashboard');
  pages.simulator = document.getElementById('page-simulator');
  pages.profile = document.getElementById('page-profile');

  feather.replace();
  loadDarkMode();
  bindLoginEvents();
  bindDashboardEvents();
  bindSimulatorEvents();
  bindProfileEvents();
  bindRouting();
  checkAuth();
}

// ============================================
// ROUTING
// ============================================
function navigate(page) {
  if (!['login', 'dashboard', 'simulator', 'profile'].includes(page)) page = 'dashboard';
  if (page !== 'login' && !localStorage.getItem('diode_token')) page = 'login';

  Object.values(pages).forEach(p => p.classList.add('hidden'));
  const target = pages[page];
  if (target) {
    target.classList.remove('hidden');
    state.currentPage = page;
    window.location.hash = page;
  }

  if (page === 'dashboard') initDashboard();
  if (page === 'simulator') initSimulatorPage();
  if (page === 'profile') initProfile();
  if (page !== 'simulator') stopAnimationLoop();

  setTimeout(() => feather.replace(), 0);
}

function bindRouting() {
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '');
    if (page && page !== state.currentPage) navigate(page);
  });
}

// ============================================
// AUTH & STORAGE (MOCK MODE)
// ============================================
function checkAuth() {
  const token = localStorage.getItem('diode_token');
  if (token) {
    state.user = JSON.parse(localStorage.getItem('diode_user') || '{}');
    navigate('dashboard');
  } else {
    navigate('login');
  }
}

function login(email, password) {
  // Allow any login for demo purposes
  const name = email.includes('@') ? email.split('@')[0] : email;
  state.user = { 
    email: email, 
    name: capitalize(name) || 'Student', 
    avatar: (name.charAt(0) || 'S').toUpperCase() 
  };
  localStorage.setItem('diode_token', 'demo_token_' + Date.now());
  localStorage.setItem('diode_user', JSON.stringify(state.user));
  
  showToast('success', `Welcome, ${state.user.name}! (Demo Mode Enabled)`);
  navigate('dashboard');
}

function logout() {
  localStorage.removeItem('diode_token');
  localStorage.removeItem('diode_user');
  state.user = null;
  showToast('info', 'Signed out successfully.');
  navigate('login');
}

// ============================================
// LOGIN PAGE
// ============================================
function bindLoginEvents() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!email) { showFieldError('email-error', 'Please enter your email or username.'); emailInput.parentElement.classList.add('error'); valid = false; }
    else if (email.includes('@') && !isValidEmail(email)) { showFieldError('email-error', 'Please enter a valid email.'); emailInput.parentElement.classList.add('error'); valid = false; }
    if (!password) { showFieldError('password-error', 'Please enter your password.'); passwordInput.parentElement.classList.add('error'); valid = false; }
    else if (password.length < 4) { showFieldError('password-error', 'Min 4 characters.'); passwordInput.parentElement.classList.add('error'); valid = false; }

    if (valid) login(email, password);
  });

  document.getElementById('toggle-pw').addEventListener('click', () => {
    const isP = passwordInput.type === 'password';
    passwordInput.type = isP ? 'text' : 'password';
    const icon = document.getElementById('pw-eye');
    if (icon) { icon.setAttribute('data-feather', isP ? 'eye-off' : 'eye'); feather.replace(); }
  });

  emailInput.addEventListener('input', () => { document.getElementById('email-error').textContent = ''; emailInput.parentElement.classList.remove('error'); });
  passwordInput.addEventListener('input', () => { document.getElementById('password-error').textContent = ''; passwordInput.parentElement.classList.remove('error'); });

  document.getElementById('forgot-pw').addEventListener('click', (e) => { 
    e.preventDefault(); 
    showToast('info', 'Contact support to reset your password.'); 
  });
  
  document.getElementById('signup-link').addEventListener('click', (e) => { 
    e.preventDefault(); 
    const isSignup = e.target.textContent === 'Create one';
    if (isSignup) {
      document.querySelector('.login-logo h1').textContent = 'Join Diode';
      document.getElementById('btn-login').querySelector('span').textContent = 'Sign Up';
      e.target.textContent = 'Already have an account? Sign In';
      // Add username field dynamically if needed or just use email as username
    } else {
      document.querySelector('.login-logo h1').textContent = 'Diode';
      document.getElementById('btn-login').querySelector('span').textContent = 'Sign In';
      e.target.textContent = 'Create one';
    }
  });
}

// ============================================
// DASHBOARD
// ============================================
function initDashboard() {
  if (!state.user) return;
  document.getElementById('welcome-name').textContent = state.user.name || 'User';
  document.getElementById('user-display-name').textContent = state.user.name || 'User';
  document.getElementById('avatar-initial').textContent = state.user.avatar || 'U';
}

function bindDashboardEvents() {
  document.getElementById('tile-new-sim').addEventListener('click', () => navigate('simulator'));
  document.getElementById('tile-load').addEventListener('click', () => showToast('info', 'Project loading coming soon.'));
  document.getElementById('tile-docs').addEventListener('click', () => showToast('info', 'Documentation coming soon.'));

  const userMenu = document.getElementById('user-menu');
  const dropdown = document.getElementById('user-dropdown');
  userMenu.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  dropdown.querySelector('[data-nav="profile"]')?.addEventListener('click', (e) => { e.preventDefault(); dropdown.classList.remove('open'); navigate('profile'); });
  document.getElementById('btn-settings').addEventListener('click', (e) => { e.preventDefault(); dropdown.classList.remove('open'); showToast('info', 'Settings coming soon.'); });
  document.getElementById('btn-logout').addEventListener('click', (e) => { e.preventDefault(); dropdown.classList.remove('open'); logout(); });
  document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
}

// ============================================
// THREE.JS — 3D ENGINE
// ============================================
function initThreeJS() {
  if (threeInitialized) return;

  threeContainer = document.getElementById('diode-3d-container');
  if (!threeContainer) return;

  // Scene
  scene = new THREE.Scene();
  const isDark = document.body.classList.contains('dark-mode');
  scene.background = new THREE.Color(isDark ? 0x0a0d12 : 0xeef1f5);
  scene.fog = new THREE.FogExp2(isDark ? 0x0a0d12 : 0xeef1f5, 0.04);

  // Camera
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(5, 6, 8);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  threeContainer.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.target.set(0, 0, 0);

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Lighting
  setupLighting();

  // Board + Env
  setupEnvironment();

  // Groups
  boardGroup = new THREE.Group();
  scene.add(boardGroup);
  componentGroup = new THREE.Group();
  scene.add(componentGroup);

  // Create the PCB board
  createPCBBoard();

  // Drag plane (invisible, for raycasting drops)
  state.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2); // y = 0.2 (top of board)

  // Resize
  resizeThree();
  const ro = new ResizeObserver(() => resizeThree());
  ro.observe(threeContainer);

  threeInitialized = true;
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0x7080a0, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(6, 10, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -6;
  dirLight.shadow.camera.right = 6;
  dirLight.shadow.camera.top = 6;
  dirLight.shadow.camera.bottom = -6;
  dirLight.shadow.mapSize.set(2048, 2048);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x0066ff, 0.3);
  fillLight.position.set(-4, 5, -4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xff6600, 0.2);
  rimLight.position.set(0, 3, -6);
  scene.add(rimLight);

  const ptLight = new THREE.PointLight(0x0066ff, 0.5, 12);
  ptLight.position.set(-4, 3, 3);
  scene.add(ptLight);
}

function setupEnvironment() {
  const grid = new THREE.GridHelper(24, 48, 0x1a2a44, 0x111c2e);
  grid.position.y = -0.05;
  scene.add(grid);

  const groundGeo = new THREE.PlaneGeometry(24, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.95, metalness: 0.05 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  scene.add(ground);
}

function createPCBBoard() {
  const bw = 5, bh = 4, thick = 0.16;

  // Solder mask (green)
  const boardGeo = new THREE.BoxGeometry(bw, thick, bh);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a6b3c, roughness: 0.4, metalness: 0.1 });
  const boardMesh = new THREE.Mesh(boardGeo, boardMat);
  boardMesh.position.y = thick / 2;
  boardMesh.castShadow = true;
  boardMesh.receiveShadow = true;
  boardGroup.add(boardMesh);

  // FR4 substrate edge
  const edgeGeo = new THREE.BoxGeometry(bw + 0.01, thick * 0.6, bh + 0.01);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc4a265, roughness: 0.6 });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.y = thick / 2;
  boardGroup.add(edge);

  // Copper layer
  const copperGeo = new THREE.BoxGeometry(bw - 0.04, 0.01, bh - 0.04);
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.8 });
  const copper = new THREE.Mesh(copperGeo, copperMat);
  copper.position.y = thick + 0.005;
  boardGroup.add(copper);

  // Mounting holes
  const holes = [
    [-bw / 2 + 0.2, -bh / 2 + 0.2], [bw / 2 - 0.2, -bh / 2 + 0.2],
    [-bw / 2 + 0.2, bh / 2 - 0.2], [bw / 2 - 0.2, bh / 2 - 0.2],
  ];
  holes.forEach(([hx, hz]) => {
    const ringGeo = new THREE.CylinderGeometry(0.08, 0.08, thick + 0.02, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(hx, thick / 2, hz);
    boardGroup.add(ring);

    const holeGeo = new THREE.CylinderGeometry(0.04, 0.04, thick + 0.04, 16);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(hx, thick / 2, hz);
    boardGroup.add(hole);
  });

  // Silkscreen text (board label)
  // NOTE: using basic geometry placeholder since TextGeometry needs font loader
}

// ============================================
// 3D COMPONENT CREATION
// ============================================
function create3DComponent(type, worldX, worldZ) {
  const def = COMPONENT_DEFS[type];
  if (!def) return null;

  const group = new THREE.Group();
  group.userData.componentType = type;

  const boardTop = 0.17; // top of the PCB

  // Body
  const bodyGeo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.bodyColor,
    roughness: 0.4,
    metalness: type === 'arduino' ? 0.3 : 0.15,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = def.height / 2;
  body.castShadow = true;
  group.add(body);

  // Pin 1 indicator (for ICs and Arduino)
  if (['ic', 'arduino'].includes(type)) {
    const dotGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const dotMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(-def.width / 2 + 0.08, def.height + 0.01, -def.depth / 2 + 0.08);
    group.add(dot);
  }

  // Pins (bottom, sticking through board)
  const pinPositions = type === 'arduino'
    ? [[-0.5, -0.35], [-0.5, 0.35], [0.5, -0.35], [0.5, 0.35], [0, -0.35], [0, 0.35]]
    : [[-def.width / 3, 0], [def.width / 3, 0]];

  pinPositions.forEach(([px, pz]) => {
    const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6);
    const pinMat = new THREE.MeshStandardMaterial({ color: def.pinColor, roughness: 0.3, metalness: 0.9 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(px, -0.05, pz);
    group.add(pin);
  });

  // LED glowing dome
  if (type === 'led') {
    body.material.color.set(0x442222);
    const domeGeo = new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xff2222, roughness: 0.1, transmission: 0.3, thickness: 0.3,
      emissive: 0x000000, emissiveIntensity: 0,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = def.height;
    group.add(dome);
    group.userData.ledDome = dome;
  }

  // Label on top
  // (Text labels require font loader — using userData for status bar display instead)

  // Selection outline (hidden by default)
  const outlineGeo = new THREE.BoxGeometry(def.width + 0.08, def.height + 0.04, def.depth + 0.08);
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0066ff, wireframe: true, transparent: true, opacity: 0 });
  const outline = new THREE.Mesh(outlineGeo, outlineMat);
  outline.position.y = def.height / 2;
  group.add(outline);
  group.userData.outline = outline;

  // Position on board
  group.position.set(worldX, boardTop, worldZ);
  componentGroup.add(group);

  const id = 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const entry = { id, type, group, x: worldX, z: worldZ, rotation: 0, simActive: false };
  state.components.push(entry);

  console.log(`[Diode] Created ${def.name} at (${worldX.toFixed(2)}, ${worldZ.toFixed(2)})`);
  updateStatusBar();
  return entry;
}

function removeComponent(entry) {
  componentGroup.remove(entry.group);
  entry.group.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  });
  state.components = state.components.filter(c => c.id !== entry.id);
  state.selectedComponent = null;
  updateStatusBar();
  showToast('info', `${COMPONENT_DEFS[entry.type].name} removed.`);
}

function highlightComponent(entry) {
  // Unhighlight all
  state.components.forEach(c => {
    if (c.group.userData.outline) {
      c.group.userData.outline.material.opacity = 0;
    }
  });
  // Highlight selected
  if (entry && entry.group.userData.outline) {
    entry.group.userData.outline.material.opacity = 0.7;
    state.selectedComponent = entry;
    const def = COMPONENT_DEFS[entry.type];
    document.getElementById('sb-component').textContent = `Selected: ${def.name}`;
  } else {
    state.selectedComponent = null;
    document.getElementById('sb-component').textContent = 'No component selected';
  }
}

// ============================================
// DRAG & DROP — Toolbar → 3D Canvas
// ============================================
function setupDragAndDrop() {
  const toolbar = document.getElementById('sim-left-toolbar');
  const canvas = renderer.domElement;

  // DRAG START from toolbar buttons
  toolbar.addEventListener('dragstart', (e) => {
    const btn = e.target.closest('.lt-btn[data-component]');
    if (!btn) return;
    const compType = btn.dataset.component;
    e.dataTransfer.setData('text/plain', compType);
    e.dataTransfer.effectAllowed = 'copy';
    console.log(`[Diode] Drag started: ${compType}`);
  });

  // DRAG OVER — allow drop
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  // DROP — create component at raycasted position
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const compType = e.dataTransfer.getData('text/plain');
    if (!compType || !COMPONENT_DEFS[compType]) return;

    // Raycast from drop position
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(state.dragPlane, intersectPoint);

    if (intersectPoint) {
      // Clamp to board bounds
      const bw = 2.3, bh = 1.8;
      const x = Math.max(-bw, Math.min(bw, intersectPoint.x));
      const z = Math.max(-bh, Math.min(bh, intersectPoint.z));

      create3DComponent(compType, x, z);
      showToast('success', `${COMPONENT_DEFS[compType].name} placed on board.`);
    }
  });
}

// ============================================
// 3D MOUSE INTERACTION — Select, Drag, Delete
// ============================================
function setupMouseInteraction() {
  const canvas = renderer.domElement;
  let isDragging3D = false;
  let dragEntry = null;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(componentGroup.children, true);

    if (hits.length > 0) {
      // Find the root group
      let obj = hits[0].object;
      while (obj.parent && obj.parent !== componentGroup) obj = obj.parent;
      const entry = state.components.find(c => c.group === obj);

      if (entry) {
        if (state.selectedTool === 'delete') {
          removeComponent(entry);
          return;
        }

        if (state.selectedTool === 'rotate') {
          entry.rotation = (entry.rotation + 90) % 360;
          entry.group.rotation.y = -entry.rotation * Math.PI / 180;
          showToast('info', `${COMPONENT_DEFS[entry.type].name} rotated.`);
          return;
        }

        // Select mode — start dragging
        highlightComponent(entry);
        isDragging3D = true;
        dragEntry = entry;
        controls.enabled = false;

        // Calculate drag offset
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(state.dragPlane, intersectPoint);
        if (intersectPoint) {
          state.dragOffset.copy(entry.group.position).sub(intersectPoint);
        }
      }
    } else {
      // Clicked empty space — deselect
      highlightComponent(null);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Update status bar cursor
    const worldPt = new THREE.Vector3();
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(state.dragPlane, worldPt);
    if (worldPt) {
      document.getElementById('sb-cursor').textContent = `X: ${worldPt.x.toFixed(1)} Z: ${worldPt.z.toFixed(1)}`;
    }

    if (isDragging3D && dragEntry) {
      raycaster.setFromCamera(mouse, camera);
      const pt = new THREE.Vector3();
      raycaster.ray.intersectPlane(state.dragPlane, pt);
      if (pt) {
        pt.add(state.dragOffset);
        // Clamp to board
        const bw = 2.3, bh = 1.8;
        pt.x = Math.max(-bw, Math.min(bw, pt.x));
        pt.z = Math.max(-bh, Math.min(bh, pt.z));
        dragEntry.group.position.x = pt.x;
        dragEntry.group.position.z = pt.z;
        dragEntry.x = pt.x;
        dragEntry.z = pt.z;
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDragging3D) {
      isDragging3D = false;
      dragEntry = null;
      controls.enabled = true;
    }
  });

  // Double click to rotate
  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(componentGroup.children, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && obj.parent !== componentGroup) obj = obj.parent;
      const entry = state.components.find(c => c.group === obj);
      if (entry) {
        entry.rotation = (entry.rotation + 90) % 360;
        entry.group.rotation.y = -entry.rotation * Math.PI / 180;
        showToast('info', `${COMPONENT_DEFS[entry.type].name} rotated 90°.`);
      }
    }
  });
}

// ============================================
// SIMULATION LOOP
// ============================================
function startAnimationLoop() {
  if (animFrameId) return;
  animate();
}

function stopAnimationLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function animate() {
  animFrameId = requestAnimationFrame(animate);

  if (!threeInitialized) return;

  controls.update();

  // Simulation effects
  if (state.simulating) {
    const time = Date.now() * 0.003;
    state.components.forEach((entry) => {
      entry.simActive = true;

      // LED glow animation
      if (entry.type === 'led' && entry.group.userData.ledDome) {
        const dome = entry.group.userData.ledDome;
        const intensity = 0.5 + 0.5 * Math.sin(time * 2 + entry.x);
        dome.material.emissive.setHex(0xff2222);
        dome.material.emissiveIntensity = intensity * 2;
      }

      // Subtle component "breathing" when simulating
      const scale = 1 + 0.01 * Math.sin(time * 3 + entry.z * 5);
      entry.group.scale.setScalar(scale);
    });
  } else {
    state.components.forEach((entry) => {
      entry.simActive = false;
      entry.group.scale.setScalar(1);
      if (entry.type === 'led' && entry.group.userData.ledDome) {
        entry.group.userData.ledDome.material.emissiveIntensity = 0;
      }
    });
  }

  renderer.render(scene, camera);
}

function resizeThree() {
  if (!threeContainer || !renderer) return;
  const w = threeContainer.clientWidth;
  const h = threeContainer.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ============================================
// SIMULATOR PAGE — Init & Events
// ============================================
function initSimulatorPage() {
  const loader = document.getElementById('sim-loading');
  loader.classList.remove('hidden');

  setTimeout(() => {
    initThreeJS();
    setupDragAndDrop();
    setupMouseInteraction();
    startAnimationLoop();
    
    // Load sample circuit for showcase if board is empty
    if (state.components.length === 0) {
      loadSampleCircuit();
    }

    loader.classList.add('hidden');
    updateStatusBar();
  }, 1200);
}

function loadSampleCircuit() {
  console.log('[Diode] Loading sample circuit for showcase...');
  // Arduino in the center
  create3DComponent('arduino', 0, 0);
  // Some components around it
  create3DComponent('led', -1.2, 0.8);
  create3DComponent('resistor', -0.8, -0.6);
  create3DComponent('ic', 1.2, 0.5);
  create3DComponent('capacitor', 1.0, -0.8);
  
  showToast('info', 'Sample Circuit Loaded for Showcase');
}

function bindSimulatorEvents() {
  document.getElementById('btn-back-dashboard').addEventListener('click', () => navigate('dashboard'));

  // View toggle
  document.getElementById('view-3d-btn').addEventListener('click', function () {
    setViewActive(this);
    state.currentView = '3d';
    document.getElementById('diode-3d-container').style.display = 'block';
    document.getElementById('diode-canvas').style.display = 'none';
  });
  document.getElementById('view-2d-btn').addEventListener('click', function () {
    setViewActive(this);
    state.currentView = '2d';
    document.getElementById('diode-3d-container').style.display = 'none';
    document.getElementById('diode-canvas').style.display = 'block';
    draw2DCanvas();
  });

  // Toolbar actions
  document.getElementById('tbtn-new').addEventListener('click', () => {
    // Clear all components
    state.components.forEach(entry => {
      componentGroup.remove(entry.group);
      entry.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    });
    state.components = [];
    state.selectedComponent = null;
    updateStatusBar();
    showToast('success', 'New board created.');
  });

  document.getElementById('tbtn-save').addEventListener('click', saveCircuit);
  document.getElementById('tbtn-undo').addEventListener('click', () => showToast('info', 'Undo logged.'));
  document.getElementById('tbtn-redo').addEventListener('click', () => showToast('info', 'Redo logged.'));

  // Simulate
  document.getElementById('btn-run-sim').addEventListener('click', () => {
    state.simulating = !state.simulating;
    const statusEl = document.getElementById('sim-status');
    const btnEl = document.getElementById('btn-run-sim');
    const label = statusEl.querySelector('.sim-label');

    if (state.simulating) {
      statusEl.classList.add('running');
      btnEl.classList.add('running');
      label.textContent = 'Running';
      showToast('success', 'Simulation started — LEDs glowing, current flowing!');
    } else {
      statusEl.classList.remove('running');
      btnEl.classList.remove('running');
      label.textContent = 'Idle';
      showToast('info', 'Simulation stopped.');
    }
  });

  // Left toolbar — tool selection & click-to-add
  const leftToolbar = document.getElementById('sim-left-toolbar');
  leftToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.lt-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;

    // Tool selection
    const tools = ['select', 'rotate', 'delete'];
    if (tools.includes(action)) {
      leftToolbar.querySelectorAll('.lt-btn').forEach(b => {
        if (tools.includes(b.dataset.action)) b.classList.remove('active');
      });
      btn.classList.add('active');
      state.selectedTool = action;
      document.getElementById('sb-tool').textContent = `Tool: ${capitalize(action)}`;
    }

    // Click-to-add (places at center of board)
    if (action.startsWith('add-') && !e.dataTransfer) {
      const compType = action.replace('add-', '');
      if (COMPONENT_DEFS[compType] && threeInitialized) {
        // Random offset near center so components don't stack
        const ox = (Math.random() - 0.5) * 2;
        const oz = (Math.random() - 0.5) * 1.5;
        create3DComponent(compType, ox, oz);
        showToast('success', `${COMPONENT_DEFS[compType].name} added. Drag to reposition.`);
      }
    }

    // Zoom
    if (action === 'zoom-in' && camera) {
      camera.position.multiplyScalar(0.85);
      state.zoom = Math.round(100 / camera.position.length() * 10);
      document.getElementById('sb-zoom').textContent = `Zoom: ${state.zoom}%`;
    }
    if (action === 'zoom-out' && camera) {
      camera.position.multiplyScalar(1.15);
      state.zoom = Math.round(100 / camera.position.length() * 10);
      document.getElementById('sb-zoom').textContent = `Zoom: ${state.zoom}%`;
    }
    if (action === 'reset-view' && camera) {
      camera.position.set(5, 6, 8);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      state.zoom = 100;
      document.getElementById('sb-zoom').textContent = 'Zoom: 100%';
    }
  });
}

// ============================================
// 2D CANVAS (fallback view)
// ============================================
function draw2DCanvas() {
  const canvas = document.getElementById('diode-canvas');
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const isDark = document.body.classList.contains('dark-mode');

  ctx.fillStyle = isDark ? '#0a0d12' : '#eef1f5';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = isDark ? 'rgba(48,54,61,0.4)' : 'rgba(200,210,220,0.6)';
  ctx.lineWidth = 0.5;
  const gs = 30;
  for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Board rectangle
  const bx = w / 2 - 150, by = h / 2 - 120;
  ctx.fillStyle = isDark ? '#1a6b3c' : '#2d8a56';
  ctx.fillRect(bx, by, 300, 240);
  ctx.strokeStyle = isDark ? '#0d4d2b' : '#1a5e3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, 300, 240);

  // Draw components as 2D rectangles
  state.components.forEach(entry => {
    const def = COMPONENT_DEFS[entry.type];
    const cx = w / 2 + entry.x * 60;
    const cy = h / 2 + entry.z * 60;
    const cw = def.width * 50;
    const ch = def.depth * 50;

    ctx.fillStyle = '#' + def.bodyColor.toString(16).padStart(6, '0');
    ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

    ctx.fillStyle = '#fff';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, cx, cy);
  });

  ctx.fillStyle = isDark ? '#484f58' : '#8899a6';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.components.length} components on board | Switch to 3D for full interaction`, w / 2, h - 30);
}

function setViewActive(btn) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function updateStatusBar() {
  document.getElementById('sb-tool').textContent = `Tool: ${capitalize(state.selectedTool)}`;
  if (!state.selectedComponent) document.getElementById('sb-component').textContent = 'No component selected';
  document.getElementById('sb-count').textContent = `Components: ${state.components.length}`;
  document.getElementById('sb-zoom').textContent = `Zoom: ${state.zoom}%`;
}

// ============================================
// PROFILE
// ============================================
function initProfile() {
  if (!state.user) return;
  document.getElementById('profile-name').value = state.user.name || '';
  document.getElementById('profile-email').value = state.user.email || '';
  document.getElementById('profile-avatar-initial').textContent = state.user.avatar || 'U';
}

function bindProfileEvents() {
  document.getElementById('btn-back-from-profile').addEventListener('click', () => navigate('dashboard'));
  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.user) {
      state.user.name = document.getElementById('profile-name').value.trim();
      state.user.email = document.getElementById('profile-email').value.trim();
      state.user.avatar = state.user.name.charAt(0).toUpperCase();
      localStorage.setItem('diode_user', JSON.stringify(state.user));
    }
    showToast('success', 'Profile updated!');
  });
  document.getElementById('btn-change-avatar').addEventListener('click', () => showToast('info', 'Avatar upload — backend required.'));
  const t = document.getElementById('dark-mode-toggle-profile');
  if (t) t.addEventListener('click', toggleDarkMode);
}

// ============================================
// DARK MODE
// ============================================
function loadDarkMode() {
  const saved = localStorage.getItem('diode_dark_mode');
  if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    state.darkMode = true;
  }
  updateThemeIcons();
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  localStorage.setItem('diode_dark_mode', state.darkMode);
  updateThemeIcons();

  // Update Three.js background
  if (scene) {
    const c = state.darkMode ? 0x0a0d12 : 0xeef1f5;
    scene.background = new THREE.Color(c);
    if (scene.fog) scene.fog.color = new THREE.Color(c);
  }
}

function updateThemeIcons() {
  document.querySelectorAll('#theme-icon, #theme-icon-profile').forEach(icon => {
    icon.setAttribute('data-feather', state.darkMode ? 'sun' : 'moon');
  });
  feather.replace();
}

// ============================================
// TOAST
// ============================================
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconMap = { success: 'check-circle', error: 'alert-circle', info: 'info' };
  toast.innerHTML = `<i data-feather="${iconMap[type] || 'info'}"></i><span>${message}</span>`;
  container.appendChild(toast);
  feather.replace();
  setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ============================================
// HELPERS
// ============================================
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
function showFieldError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error'));
}

// ============================================
// DEMO OPERATIONS
// ============================================
function saveCircuit() {
  if (state.components.length === 0) {
    showToast('info', 'Add some components first!');
    return;
  }
  
  const circuitData = state.components.map(c => ({
    type: c.type, x: c.x, z: c.z, rotation: c.rotation
  }));
  
  localStorage.setItem('diode_saved_circuit', JSON.stringify(circuitData));
  showToast('success', 'Circuit saved to Local Storage (Demo Mode).');
}

function loadCircuits() {
  const saved = localStorage.getItem('diode_saved_circuit');
  if (saved) {
    console.log('Saved circuit data found');
  }
}

init();

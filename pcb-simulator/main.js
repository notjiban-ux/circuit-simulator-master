// ============================================
// PCB Simulator — Main Application
// ============================================

import { init3DView, update3DBoard, show3D, hide3D } from './pcb3d.js';
import { PCBBoard } from './pcb-engine.js';

// ============================================
// State
// ============================================
const state = {
  currentView: '2d',
  currentTool: 'select',
  currentLayer: 'top-copper',
  isSimulating: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  gridSize: 20, // pixels per grid unit (2.54mm)
  boardWidth: 500, // px
  boardHeight: 400, // px
  selectedComponent: null,
  draggingComponent: null,
  placingComponent: null,
  traceStart: null,
  tracePoints: [],
  mouseX: 0,
  mouseY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
};

const board = new PCBBoard();

// ============================================
// Component Definitions
// ============================================
const COMPONENTS = {
  'Passives': [
    { type: 'resistor', name: 'Resistor', desc: '1kΩ - 10MΩ', icon: '⟟', pins: 2, width: 60, height: 24, value: '10kΩ', color: '#e6a23c' },
    { type: 'capacitor', name: 'Capacitor', desc: '1pF - 1000µF', icon: '⟞', pins: 2, width: 40, height: 30, value: '100nF', color: '#409eff' },
    { type: 'inductor', name: 'Inductor', desc: '1µH - 100mH', icon: '⌇', pins: 2, width: 60, height: 24, value: '10µH', color: '#67c23a' },
  ],
  'Semiconductors': [
    { type: 'led', name: 'LED', desc: 'Light Emitting Diode', icon: '◉', pins: 2, width: 30, height: 30, value: 'Red', color: '#ff4444' },
    { type: 'diode', name: 'Diode', desc: '1N4148 / 1N4007', icon: '▷', pins: 2, width: 50, height: 24, value: '1N4148', color: '#888' },
    { type: 'transistor', name: 'NPN Transistor', desc: '2N2222', icon: '⊺', pins: 3, width: 36, height: 40, value: '2N2222', color: '#e6e6e6' },
    { type: 'mosfet', name: 'N-MOSFET', desc: 'IRF540', icon: '⊤', pins: 3, width: 36, height: 40, value: 'IRF540', color: '#ddd' },
  ],
  'ICs': [
    { type: 'ic8', name: '8-Pin IC', desc: 'NE555 / ATtiny85', icon: '▪', pins: 8, width: 60, height: 50, value: 'NE555', color: '#333' },
    { type: 'ic16', name: '16-Pin IC', desc: 'LM324 / CD4017', icon: '▪', pins: 16, width: 60, height: 80, value: 'LM324', color: '#333' },
    { type: 'ic28', name: '28-Pin IC', desc: 'ATmega328P', icon: '▪', pins: 28, width: 60, height: 120, value: 'ATmega328P', color: '#222' },
  ],
  'Connectors': [
    { type: 'header2', name: '2-Pin Header', desc: 'Male/Female', icon: '⫘', pins: 2, width: 20, height: 30, value: '2-Pin', color: '#ffd93d' },
    { type: 'header4', name: '4-Pin Header', desc: 'Male/Female', icon: '⫘', pins: 4, width: 20, height: 55, value: '4-Pin', color: '#ffd93d' },
    { type: 'usb', name: 'USB Type-B', desc: 'USB Connector', icon: '⊡', pins: 4, width: 45, height: 50, value: 'USB-B', color: '#aaa' },
    { type: 'barrel', name: 'Barrel Jack', desc: 'DC Power', icon: '⊙', pins: 3, width: 45, height: 40, value: 'DC Jack', color: '#555' },
  ],
  'Power': [
    { type: 'vreg', name: 'Voltage Regulator', desc: 'LM7805 / AMS1117', icon: '⏚', pins: 3, width: 50, height: 36, value: '7805', color: '#444' },
    { type: 'crystal', name: 'Crystal', desc: '8MHz - 16MHz', icon: '◈', pins: 2, width: 36, height: 24, value: '16MHz', color: '#c0c0c0' },
  ]
};

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCanvas();
  initToolbar();
  initTools();
  initLayerPanel();
  init3DView(document.getElementById('pcb-canvas-3d'));
  
  // Add some default components to demo
  addDefaultComponents();

  // Hide loading
  setTimeout(() => {
    document.getElementById('loading-overlay').classList.add('hidden');
  }, 1500);

  // Animation loop
  requestAnimationFrame(renderLoop);
});

// ============================================
// Sidebar — Component list
// ============================================
function initSidebar() {
  const listEl = document.getElementById('component-list');
  listEl.innerHTML = '';

  for (const [catName, items] of Object.entries(COMPONENTS)) {
    const cat = document.createElement('div');
    cat.className = 'category open';
    cat.innerHTML = `
      <div class="category-header">
        <span>${catName}</span>
        <span class="arrow">▶</span>
      </div>
      <div class="category-items"></div>
    `;

    const itemsEl = cat.querySelector('.category-items');
    items.forEach(comp => {
      const item = document.createElement('div');
      item.className = 'component-item';
      item.draggable = true;
      item.dataset.type = comp.type;
      item.innerHTML = `
        <div class="component-icon" style="color:${comp.color}">${comp.icon}</div>
        <div class="component-info">
          <div class="component-name">${comp.name}</div>
          <div class="component-desc">${comp.desc}</div>
        </div>
      `;

      // Drag start
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('component-type', comp.type);
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.textContent = comp.name;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => ghost.remove(), 0);
      });

      // Click to place
      item.addEventListener('click', () => {
        state.currentTool = 'place';
        state.placingComponent = comp;
        setActiveTool('place');
        updateStatus();
      });

      itemsEl.appendChild(item);
    });

    // Toggle category
    cat.querySelector('.category-header').addEventListener('click', () => {
      cat.classList.toggle('open');
    });

    listEl.appendChild(cat);
  }

  // Search
  document.getElementById('component-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.component-item').forEach(item => {
      const name = item.querySelector('.component-name').textContent.toLowerCase();
      const desc = item.querySelector('.component-desc').textContent.toLowerCase();
      item.style.display = (name.includes(query) || desc.includes(query)) ? '' : 'none';
    });
  });
}

// ============================================
// Canvas Setup
// ============================================
let canvas, ctx;

function initCanvas() {
  canvas = document.getElementById('pcb-canvas-2d');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Drop zone
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', handleDrop);

  // Mouse events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('dblclick', handleDoubleClick);
}

function resizeCanvas() {
  const area = document.getElementById('canvas-area');
  canvas.width = area.clientWidth * window.devicePixelRatio;
  canvas.height = area.clientHeight * window.devicePixelRatio;
  canvas.style.width = area.clientWidth + 'px';
  canvas.style.height = area.clientHeight + 'px';
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

// ============================================
// Rendering
// ============================================
function renderLoop() {
  if (state.currentView === '2d') {
    render2D();
  }
  requestAnimationFrame(renderLoop);
}

function render2D() {
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2 + state.panX, h / 2 + state.panY);
  ctx.scale(state.zoom, state.zoom);

  // Draw board background
  drawBoard();

  // Draw grid
  drawGrid();

  // Draw traces
  drawTraces();

  // Draw Vias
  drawVias();

  // Draw components
  drawComponents();

  // Draw active trace being routed
  if (state.currentTool === 'trace' && state.tracePoints.length > 0) {
    drawActiveTrace();
  }

  // Draw placing preview
  if (state.currentTool === 'place' && state.placingComponent) {
    drawPlacingPreview();
  }

  // Draw selection
  if (state.selectedComponent !== null) {
    drawSelection();
  }

  ctx.restore();

  // Draw cursor position
  updateCursorInfo(w, h);
}

function drawBoard() {
  const bw = state.boardWidth;
  const bh = state.boardHeight;

  // Board shadow
  ctx.shadowColor = 'rgba(0, 229, 160, 0.1)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

  // Substrate
  ctx.fillStyle = '#1a6b3c'; // solder mask green
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Board edge (routed edge)
  ctx.strokeStyle = '#0d4d2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
  ctx.stroke();

  // Mounting holes
  const holePositions = [
    [-bw / 2 + 15, -bh / 2 + 15],
    [bw / 2 - 15, -bh / 2 + 15],
    [-bw / 2 + 15, bh / 2 - 15],
    [bw / 2 - 15, bh / 2 - 15],
  ];

  holePositions.forEach(([hx, hy]) => {
    // Copper ring
    ctx.fillStyle = '#b87333';
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fill();
    // Hole
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGrid() {
  const bw = state.boardWidth;
  const bh = state.boardHeight;
  const gs = state.gridSize;

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;

  for (let x = -bw / 2; x <= bw / 2; x += gs) {
    ctx.beginPath();
    ctx.moveTo(x, -bh / 2);
    ctx.lineTo(x, bh / 2);
    ctx.stroke();
  }

  for (let y = -bh / 2; y <= bh / 2; y += gs) {
    ctx.beginPath();
    ctx.moveTo(-bw / 2, y);
    ctx.lineTo(bw / 2, y);
    ctx.stroke();
  }

  // Grid dots at intersections
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let x = -bw / 2; x <= bw / 2; x += gs) {
    for (let y = -bh / 2; y <= bh / 2; y += gs) {
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }
  }
}

function drawTraces() {
  const layerColors = {
    'top-copper': '#ff4444',
    'bottom-copper': '#4444ff',
  };

  board.traces.forEach(trace => {
    if (!isLayerVisible(trace.layer)) return;
    
    ctx.strokeStyle = layerColors[trace.layer] || '#ff4444';
    ctx.lineWidth = trace.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (trace.points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(trace.points[0].x, trace.points[0].y);
    for (let i = 1; i < trace.points.length; i++) {
      ctx.lineTo(trace.points[i].x, trace.points[i].y);
    }
    ctx.stroke();

    // Current flow animation when simulating
    if (state.isSimulating && trace.current) {
      drawCurrentFlow(trace);
    }
  });
}

function drawCurrentFlow(trace) {
  const time = Date.now() / 500;
  ctx.strokeStyle = 'rgba(0, 229, 160, 0.6)';
  ctx.lineWidth = 1;

  for (let i = 0; i < trace.points.length - 1; i++) {
    const p1 = trace.points[i];
    const p2 = trace.points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.floor(len / 10);

    for (let s = 0; s < segments; s++) {
      const t = ((s / segments) + time * 0.3) % 1;
      const x = p1.x + dx * t;
      const y = p1.y + dy * t;
      ctx.fillStyle = `rgba(0, 229, 160, ${0.5 + 0.5 * Math.sin(t * Math.PI * 2)})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVias() {
  board.vias.forEach(via => {
    // Outer ring
    ctx.fillStyle = '#b87333';
    ctx.beginPath();
    ctx.arc(via.x, via.y, via.outerRadius || 5, 0, Math.PI * 2);
    ctx.fill();
    // Inner hole
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.arc(via.x, via.y, via.innerRadius || 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawComponents() {
  board.components.forEach((comp, idx) => {
    if (!comp.visible) return;
    drawComponent(comp, idx);
  });
}

function drawComponent(comp, idx) {
  const def = getComponentDef(comp.type);
  if (!def) return;

  ctx.save();
  ctx.translate(comp.x, comp.y);
  ctx.rotate((comp.rotation || 0) * Math.PI / 180);

  const w = def.width;
  const h = def.height;

  // Component body shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // SMD Pads
  drawPads(comp, def);

  ctx.shadowColor = 'transparent';

  // Component body
  if (comp.type.startsWith('ic')) {
    drawICBody(comp, def, w, h);
  } else if (comp.type === 'resistor') {
    drawResistorBody(comp, def, w, h);
  } else if (comp.type === 'capacitor') {
    drawCapacitorBody(comp, def, w, h);
  } else if (comp.type === 'led') {
    drawLEDBody(comp, def, w, h);
  } else {
    drawGenericBody(comp, def, w, h);
  }

  // Reference designator (silkscreen)
  if (isLayerVisible('silkscreen')) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, w / 6)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(comp.refDes || def.name, 0, h / 2 + 4);
  }

  // Simulation glow
  if (state.isSimulating && comp.simActive) {
    ctx.strokeStyle = 'rgba(0, 229, 160, 0.5)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 229, 160, 0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
    ctx.shadowColor = 'transparent';
  }

  ctx.restore();
}

function drawPads(comp, def) {
  const w = def.width;
  const h = def.height;
  const padColor = '#b87333';

  ctx.fillStyle = padColor;

  if (def.pins <= 3) {
    // Two-pin or three-pin: pads at ends
    ctx.fillRect(-w / 2 - 4, -4, 8, 8);
    ctx.fillRect(w / 2 - 4, -4, 8, 8);
    if (def.pins === 3) {
      ctx.fillRect(-4, h / 2 - 4, 8, 8);
    }
  } else {
    // IC-style: pads along sides
    const pinsPerSide = Math.floor(def.pins / 2);
    const pinSpacing = h / (pinsPerSide + 1);
    for (let i = 1; i <= pinsPerSide; i++) {
      // Left side
      ctx.fillRect(-w / 2 - 5, -h / 2 + i * pinSpacing - 3, 6, 6);
      // Right side
      ctx.fillRect(w / 2 - 1, -h / 2 + i * pinSpacing - 3, 6, 6);
    }
  }
}

function drawICBody(comp, def, w, h) {
  // IC body (dark)
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 3);
  ctx.fill();

  // IC border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pin 1 dot
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(-w / 2 + 8, -h / 2 + 8, 3, 0, Math.PI * 2);
  ctx.fill();

  // Notch
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -h / 2, 5, 0, Math.PI);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#888';
  ctx.font = `bold ${Math.min(10, w / 5)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comp.value || def.value, 0, 0);
}

function drawResistorBody(comp, def, w, h) {
  // Resistor body
  ctx.fillStyle = '#e6dcc8';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 5, -h / 2, w - 10, h, 3);
  ctx.fill();

  // Color bands
  const bands = ['#8B0000', '#000', '#ff8c00', '#ffd700'];
  const bandWidth = 4;
  const startX = -w / 2 + 12;
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(startX + i * 9, -h / 2 + 2, bandWidth, h - 4);
  });
}

function drawCapacitorBody(comp, def, w, h) {
  // Capacitor body
  ctx.fillStyle = '#2a5f9e';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();

  // Marking
  ctx.fillStyle = '#aaccff';
  ctx.font = `bold 8px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comp.value || '100nF', 0, 0);
}

function drawLEDBody(comp, def, w, h) {
  const ledColor = comp.value === 'Green' ? '#00ff44' : comp.value === 'Blue' ? '#4488ff' : '#ff2222';

  // LED body
  ctx.fillStyle = state.isSimulating && comp.simActive ? ledColor : '#442222';
  ctx.beginPath();
  ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // LED glow when simulating
  if (state.isSimulating && comp.simActive) {
    ctx.shadowColor = ledColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2 - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Cathode mark
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 3, -h / 3);
  ctx.lineTo(w / 2 - 3, h / 3);
  ctx.stroke();
}

function drawGenericBody(comp, def, w, h) {
  ctx.fillStyle = def.color || '#444';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.fillStyle = '#aaa';
  ctx.font = `bold 7px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comp.value || def.value || def.name, 0, 0);
}

function drawActiveTrace() {
  ctx.strokeStyle = state.currentLayer === 'bottom-copper' ? '#4444ff' : '#ff4444';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([6, 4]);

  ctx.beginPath();
  ctx.moveTo(state.tracePoints[0].x, state.tracePoints[0].y);
  for (let i = 1; i < state.tracePoints.length; i++) {
    ctx.lineTo(state.tracePoints[i].x, state.tracePoints[i].y);
  }
  // Line to cursor
  const snapPos = snapToGrid(state.mouseX, state.mouseY);
  ctx.lineTo(snapPos.x, snapPos.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlacingPreview() {
  const snapPos = snapToGrid(state.mouseX, state.mouseY);
  const def = state.placingComponent;
  
  ctx.globalAlpha = 0.6;
  ctx.save();
  ctx.translate(snapPos.x, snapPos.y);
  
  ctx.fillStyle = def.color || '#444';
  ctx.beginPath();
  ctx.roundRect(-def.width / 2, -def.height / 2, def.width, def.height, 4);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(0, 229, 160, 0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSelection() {
  const comp = board.components[state.selectedComponent];
  if (!comp) return;
  
  const def = getComponentDef(comp.type);
  if (!def) return;

  ctx.save();
  ctx.translate(comp.x, comp.y);
  ctx.rotate((comp.rotation || 0) * Math.PI / 180);

  ctx.strokeStyle = '#00e5a0';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(-def.width / 2 - 5, -def.height / 2 - 5, def.width + 10, def.height + 10);
  ctx.setLineDash([]);

  // Resize handles
  const handleSize = 5;
  ctx.fillStyle = '#00e5a0';
  const corners = [
    [-def.width / 2 - 5, -def.height / 2 - 5],
    [def.width / 2 + 5, -def.height / 2 - 5],
    [-def.width / 2 - 5, def.height / 2 + 5],
    [def.width / 2 + 5, def.height / 2 + 5],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  });

  ctx.restore();
}

// ============================================
// Mouse Handlers
// ============================================
function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    // Middle click or Alt+click = pan
    state.isPanning = true;
    state.panStartX = mx - state.panX;
    state.panStartY = my - state.panY;
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (e.button === 2) return; // Right click

  const worldPos = screenToWorld(mx, my);

  switch (state.currentTool) {
    case 'select':
      handleSelectClick(worldPos);
      break;
    case 'place':
      handlePlaceClick(worldPos);
      break;
    case 'trace':
      handleTraceClick(worldPos);
      break;
    case 'via':
      handleViaClick(worldPos);
      break;
    case 'delete':
      handleDeleteClick(worldPos);
      break;
  }
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (state.isPanning) {
    state.panX = mx - state.panStartX;
    state.panY = my - state.panStartY;
    return;
  }

  const worldPos = screenToWorld(mx, my);
  state.mouseX = worldPos.x;
  state.mouseY = worldPos.y;

  // Drag component
  if (state.draggingComponent !== null) {
    const snap = snapToGrid(worldPos.x, worldPos.y);
    board.components[state.draggingComponent].x = snap.x;
    board.components[state.draggingComponent].y = snap.y;
    sync3D();
  }
}

function handleMouseUp(e) {
  if (state.isPanning) {
    state.isPanning = false;
    canvas.style.cursor = 'crosshair';
    return;
  }

  if (state.draggingComponent !== null) {
    state.draggingComponent = null;
  }
}

function handleWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  state.zoom = Math.max(0.2, Math.min(5, state.zoom * delta));
  document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
}

function handleDoubleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const worldPos = screenToWorld(mx, my);

  const idx = findComponentAt(worldPos.x, worldPos.y);
  if (idx !== -1) {
    const comp = board.components[idx];
    // Rotate on double click
    comp.rotation = ((comp.rotation || 0) + 90) % 360;
    sync3D();
  }
}

function handleDrop(e) {
  e.preventDefault();
  const type = e.dataTransfer.getData('component-type');
  if (!type) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const worldPos = screenToWorld(mx, my);
  const snap = snapToGrid(worldPos.x, worldPos.y);

  placeComponent(type, snap.x, snap.y);
}

// ============================================
// Tool Handlers
// ============================================
function handleSelectClick(pos) {
  const idx = findComponentAt(pos.x, pos.y);
  if (idx !== -1) {
    state.selectedComponent = idx;
    state.draggingComponent = idx;
    showProperties(board.components[idx]);
  } else {
    state.selectedComponent = null;
    clearProperties();
  }
  updateStatus();
}

function handlePlaceClick(pos) {
  if (!state.placingComponent) return;
  const snap = snapToGrid(pos.x, pos.y);
  placeComponent(state.placingComponent.type, snap.x, snap.y);
}

function handleTraceClick(pos) {
  const snap = snapToGrid(pos.x, pos.y);

  if (state.tracePoints.length === 0) {
    state.tracePoints.push({ x: snap.x, y: snap.y });
  } else {
    // Route with 90-degree turns
    const last = state.tracePoints[state.tracePoints.length - 1];
    if (snap.x !== last.x || snap.y !== last.y) {
      // Add intermediate point for 90-degree routing
      state.tracePoints.push({ x: snap.x, y: last.y });
      state.tracePoints.push({ x: snap.x, y: snap.y });
    }

    // Double-click to finish (check if same position clicked)
    if (state.tracePoints.length > 3) {
      const prev = state.tracePoints[state.tracePoints.length - 3];
      if (Math.abs(snap.x - prev.x) < 5 && Math.abs(snap.y - prev.y) < 5) {
        finishTrace();
      }
    }
  }
}

function finishTrace() {
  if (state.tracePoints.length >= 2) {
    board.traces.push({
      id: 'trace-' + Date.now(),
      layer: state.currentLayer,
      width: 3,
      points: [...state.tracePoints],
      net: 'net-' + board.traces.length,
      current: Math.random() > 0.5,
    });
    updateStatus();
    sync3D();
  }
  state.tracePoints = [];
}

function handleViaClick(pos) {
  const snap = snapToGrid(pos.x, pos.y);
  board.vias.push({
    id: 'via-' + Date.now(),
    x: snap.x,
    y: snap.y,
    outerRadius: 5,
    innerRadius: 2.5,
  });
  updateStatus();
  sync3D();
}

function handleDeleteClick(pos) {
  const idx = findComponentAt(pos.x, pos.y);
  if (idx !== -1) {
    board.components.splice(idx, 1);
    state.selectedComponent = null;
    clearProperties();
    updateStatus();
    sync3D();
  }
}

// ============================================
// Component Management
// ============================================
function placeComponent(type, x, y) {
  const def = getComponentDef(type);
  if (!def) return;

  const refDes = generateRefDes(type);
  board.components.push({
    id: 'comp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    type,
    x,
    y,
    rotation: 0,
    value: def.value,
    refDes,
    layer: state.currentLayer,
    visible: true,
    simActive: false,
  });

  state.selectedComponent = board.components.length - 1;
  showProperties(board.components[state.selectedComponent]);
  updateStatus();
  sync3D();
}

function generateRefDes(type) {
  const prefixes = {
    resistor: 'R', capacitor: 'C', inductor: 'L',
    led: 'D', diode: 'D', transistor: 'Q', mosfet: 'Q',
    ic8: 'U', ic16: 'U', ic28: 'U',
    header2: 'J', header4: 'J', usb: 'J', barrel: 'J',
    vreg: 'U', crystal: 'Y',
  };
  const prefix = prefixes[type] || 'C';
  const count = board.components.filter(c => c.type === type).length + 1;
  return prefix + count;
}

function findComponentAt(wx, wy) {
  for (let i = board.components.length - 1; i >= 0; i--) {
    const comp = board.components[i];
    const def = getComponentDef(comp.type);
    if (!def) continue;

    const dx = wx - comp.x;
    const dy = wy - comp.y;
    if (Math.abs(dx) <= def.width / 2 + 5 && Math.abs(dy) <= def.height / 2 + 5) {
      return i;
    }
  }
  return -1;
}

function getComponentDef(type) {
  for (const items of Object.values(COMPONENTS)) {
    const found = items.find(c => c.type === type);
    if (found) return found;
  }
  return null;
}

// ============================================
// Properties Panel
// ============================================
function showProperties(comp) {
  const panel = document.getElementById('properties-content');
  const def = getComponentDef(comp.type);

  panel.innerHTML = `
    <div class="prop-row">
      <span class="prop-label">Reference</span>
      <input class="prop-value" value="${comp.refDes}" data-prop="refDes">
    </div>
    <div class="prop-row">
      <span class="prop-label">Value</span>
      <input class="prop-value" value="${comp.value || ''}" data-prop="value">
    </div>
    <div class="prop-row">
      <span class="prop-label">X Position</span>
      <input class="prop-value" value="${comp.x.toFixed(1)}" data-prop="x" type="number">
    </div>
    <div class="prop-row">
      <span class="prop-label">Y Position</span>
      <input class="prop-value" value="${comp.y.toFixed(1)}" data-prop="y" type="number">
    </div>
    <div class="prop-row">
      <span class="prop-label">Rotation</span>
      <input class="prop-value" value="${comp.rotation || 0}" data-prop="rotation" type="number" step="90">
    </div>
    <div class="prop-row">
      <span class="prop-label">Layer</span>
      <input class="prop-value" value="${comp.layer}" data-prop="layer" readonly>
    </div>
  `;

  // Listen for changes
  panel.querySelectorAll('.prop-value').forEach(input => {
    input.addEventListener('change', (e) => {
      const prop = e.target.dataset.prop;
      let val = e.target.value;
      if (['x', 'y', 'rotation'].includes(prop)) val = parseFloat(val);
      comp[prop] = val;
      sync3D();
    });
  });
}

function clearProperties() {
  document.getElementById('properties-content').innerHTML = `
    <p class="placeholder-text">Select a component to edit properties</p>
  `;
}

// ============================================
// Toolbar & Tools
// ============================================
function initToolbar() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;

      if (state.currentView === '3d') {
        document.getElementById('pcb-canvas-2d').style.display = 'none';
        document.getElementById('pcb-canvas-3d').style.display = 'block';
        show3D();
        update3DBoard(board, state);
      } else {
        document.getElementById('pcb-canvas-2d').style.display = 'block';
        document.getElementById('pcb-canvas-3d').style.display = 'none';
        hide3D();
      }
    });
  });

  // Simulate button
  document.getElementById('btn-simulate').addEventListener('click', toggleSimulation);

  // New board
  document.getElementById('btn-new').addEventListener('click', () => {
    board.components = [];
    board.traces = [];
    board.vias = [];
    state.selectedComponent = null;
    clearProperties();
    updateStatus();
    sync3D();
  });
}

function initTools() {
  document.querySelectorAll('.tool-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTool(btn.dataset.tool);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch (e.key) {
      case 'v': case '1': setActiveTool('select'); break;
      case 'p': case '2': setActiveTool('place'); break;
      case 't': case '3': setActiveTool('trace'); break;
      case 'i': case '4': setActiveTool('via'); break;
      case 'z': case '5': setActiveTool('zone'); break;
      case 'm': case '6': setActiveTool('measure'); break;
      case 'Delete': case 'Backspace':
        if (state.selectedComponent !== null) {
          board.components.splice(state.selectedComponent, 1);
          state.selectedComponent = null;
          clearProperties();
          updateStatus();
          sync3D();
        }
        break;
      case 'r':
        if (state.selectedComponent !== null) {
          board.components[state.selectedComponent].rotation = 
            ((board.components[state.selectedComponent].rotation || 0) + 90) % 360;
          sync3D();
        }
        break;
      case 'Escape':
        state.tracePoints = [];
        state.placingComponent = null;
        state.selectedComponent = null;
        setActiveTool('select');
        clearProperties();
        break;
    }
  });
}

function setActiveTool(tool) {
  state.currentTool = tool;
  state.tracePoints = [];
  
  document.querySelectorAll('.tool-opt-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tool-opt-btn[data-tool="${tool}"]`);
  if (btn) btn.classList.add('active');

  const toolNames = {
    select: 'Select', place: 'Place Component', trace: 'Route Trace',
    via: 'Place Via', zone: 'Copper Zone', measure: 'Measure', delete: 'Delete'
  };
  document.getElementById('status-tool').textContent = `Tool: ${toolNames[tool] || tool}`;
}

function initLayerPanel() {
  document.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.layer-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentLayer = item.dataset.layer;
      document.getElementById('status-layer').textContent = `Layer: ${item.querySelector('.layer-name').textContent}`;
    });
  });

  document.querySelectorAll('.layer-vis').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = btn.dataset.visible === 'true';
      btn.dataset.visible = !visible;
      btn.textContent = visible ? '🚫' : '👁';
      btn.closest('.layer-item').style.opacity = visible ? 0.4 : 1;
    });
  });
}

function isLayerVisible(layer) {
  const item = document.querySelector(`.layer-item[data-layer="${layer}"]`);
  if (!item) return true;
  const btn = item.querySelector('.layer-vis');
  return btn ? btn.dataset.visible === 'true' : true;
}

// ============================================
// Simulation
// ============================================
function toggleSimulation() {
  state.isSimulating = !state.isSimulating;
  const indicator = document.getElementById('sim-indicator');
  const btn = document.getElementById('btn-simulate');

  if (state.isSimulating) {
    indicator.classList.add('running');
    indicator.querySelector('.label').textContent = 'Running';
    btn.classList.add('active');
    
    // Activate random components for demo
    board.components.forEach(comp => {
      comp.simActive = Math.random() > 0.3;
    });
    board.traces.forEach(trace => {
      trace.current = Math.random() > 0.3;
    });
  } else {
    indicator.classList.remove('running');
    indicator.querySelector('.label').textContent = 'Idle';
    btn.classList.remove('active');
    
    board.components.forEach(comp => {
      comp.simActive = false;
    });
  }
}

// ============================================
// Utility Functions
// ============================================
function screenToWorld(sx, sy) {
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  return {
    x: (sx - w / 2 - state.panX) / state.zoom,
    y: (sy - h / 2 - state.panY) / state.zoom,
  };
}

function snapToGrid(x, y) {
  const gs = state.gridSize;
  return {
    x: Math.round(x / gs) * gs,
    y: Math.round(y / gs) * gs,
  };
}

function updateCursorInfo() {
  const wx = state.mouseX.toFixed(1);
  const wy = state.mouseY.toFixed(1);
  document.getElementById('cursor-pos').textContent = `X: ${wx} Y: ${wy}`;
}

function updateStatus() {
  document.getElementById('status-components').textContent = `Components: ${board.components.length}`;
  document.getElementById('status-traces').textContent = `Traces: ${board.traces.length}`;
  const nets = new Set(board.traces.map(t => t.net));
  document.getElementById('status-nets').textContent = `Nets: ${nets.size}`;
}

function sync3D() {
  if (state.currentView === '3d') {
    update3DBoard(board, state);
  }
}

// ============================================
// Default components for demo
// ============================================
function addDefaultComponents() {
  // ATmega328P
  placeComponent('ic28', -40, 0);
  // Crystal
  placeComponent('crystal', -120, -40);
  // Capacitors near crystal
  placeComponent('capacitor', -140, -10);
  placeComponent('capacitor', -100, -10);
  // Voltage regulator
  placeComponent('vreg', 100, -60);
  // Filter caps
  placeComponent('capacitor', 140, -30);
  placeComponent('capacitor', 60, -30);
  // LEDs
  placeComponent('led', 120, 40);
  placeComponent('led', 150, 40);
  // Resistors for LEDs
  placeComponent('resistor', 120, 80);
  placeComponent('resistor', 150, 80);
  // USB connector
  placeComponent('usb', -180, 0);
  // Pin headers
  placeComponent('header4', 180, 0);
  // Power barrel jack
  placeComponent('barrel', -180, 80);

  // Add some traces
  board.traces.push(
    {
      id: 't1', layer: 'top-copper', width: 3,
      points: [{ x: -140, y: -10 }, { x: -140, y: 40 }, { x: -100, y: 40 }, { x: -100, y: -10 }],
      net: 'GND', current: true,
    },
    {
      id: 't2', layer: 'top-copper', width: 4,
      points: [{ x: 100, y: -60 }, { x: 140, y: -60 }, { x: 140, y: -30 }],
      net: 'VCC', current: true,
    },
    {
      id: 't3', layer: 'top-copper', width: 3,
      points: [{ x: -60, y: 0 }, { x: -120, y: 0 }, { x: -120, y: -40 }],
      net: 'XTAL1', current: false,
    },
    {
      id: 't4', layer: 'bottom-copper', width: 3,
      points: [{ x: -20, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -30 }],
      net: 'VCC', current: true,
    },
    {
      id: 't5', layer: 'top-copper', width: 2,
      points: [{ x: 120, y: 40 }, { x: 120, y: 80 }],
      net: 'LED1', current: true,
    },
    {
      id: 't6', layer: 'top-copper', width: 2,
      points: [{ x: 150, y: 40 }, { x: 150, y: 80 }],
      net: 'LED2', current: true,
    },
  );

  // Add some vias
  board.vias.push(
    { id: 'v1', x: 60, y: 0, outerRadius: 5, innerRadius: 2.5 },
    { id: 'v2', x: -100, y: 40, outerRadius: 5, innerRadius: 2.5 },
  );

  updateStatus();
}

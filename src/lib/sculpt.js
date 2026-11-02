import * as THREE from 'three';

/**
 * Eidolon-style dust sculptures — parametric point clouds that assemble
 * from a scattered shell into a shape as the section scrolls through.
 * Per the technique: aHome/aDust/aSeed attributes, seed-staggered
 * assembly, layered sine swirl, additive blending, soft round points,
 * and a Gaussian cursor falloff that shoves nearby grains.
 */

const COUNT = 11000;

const VERT = /* glsl */ `
  attribute vec3 aHome;
  attribute vec3 aDust;
  attribute float aSeed;
  uniform float uTime;
  uniform float uAssembly;
  uniform float uPixelRatio;
  uniform vec3 uPointer;
  varying float vA;
  varying float vSeed;

  void main() {
    float p = smoothstep(aSeed * 0.55, aSeed * 0.55 + 0.45, uAssembly);
    vec3 pos = mix(aDust, aHome, p);

    // layered swirl — loud in dust, a whisper once formed
    float amp = mix(0.26, 0.03, p);
    pos += vec3(
      sin(uTime * 0.42 + pos.y * 2.1 + aSeed * 6.283),
      sin(uTime * 0.33 + pos.x * 1.7 + aSeed * 4.0),
      sin(uTime * 0.37 + pos.z * 1.9 + aSeed * 2.0)
    ) * amp;

    // Gaussian cursor falloff: tangential shove + size boost
    vec2 delta = pos.xy - uPointer.xy;
    float g = exp(-dot(delta, delta) * 1.6) * uPointer.z;
    pos.xy += normalize(delta + 1e-4) * g * 0.4;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.9 + aSeed * 1.1) * (1.0 + g * 1.4) * uPixelRatio * (21.0 / -mv.z);
    vA = 0.16 + p * 0.5 + g * 0.4;
    vSeed = aSeed;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying float vA;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.06, d);
    float core = smoothstep(0.18, 0.0, d);
    vec3 cyan = vec3(0.34, 0.83, 1.0);
    vec3 violet = vec3(0.66, 0.45, 1.0);
    vec3 col = mix(cyan, violet, step(0.86, vSeed));
    col *= 0.8 + core * 0.7;
    gl_FragColor = vec4(col, alpha * vA * 0.55);
  }
`;

/* ── parametric shapes ─────────────────────────────────────── */
function shapeScan(out) {
  // fibonacci sphere + three dense latitude scan rings
  const R = 2.15;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rings = Math.floor(COUNT * 0.18);
  const surface = COUNT - rings;
  for (let i = 0; i < surface; i += 1) {
    const y = 1 - (2 * i) / surface;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    out[i * 3] = Math.cos(th) * r * R;
    out[i * 3 + 1] = y * R;
    out[i * 3 + 2] = Math.sin(th) * r * R;
  }
  const lats = [-0.5, 0, 0.5];
  for (let i = 0; i < rings; i += 1) {
    const j = surface + i;
    const lat = lats[i % 3] + (Math.random() - 0.5) * 0.03;
    const r = Math.sqrt(1 - lat * lat);
    const th = Math.random() * Math.PI * 2;
    out[j * 3] = Math.cos(th) * r * (R + 0.03);
    out[j * 3 + 1] = lat * R;
    out[j * 3 + 2] = Math.sin(th) * r * (R + 0.03);
  }
}

function shapeGear(out) {
  // toothed rim + hub ring + four spokes, extruded in z
  const TEETH = 10;
  const rim = Math.floor(COUNT * 0.62);
  const hub = Math.floor(COUNT * 0.18);
  const spokes = COUNT - rim - hub;
  for (let i = 0; i < rim; i += 1) {
    const th = Math.random() * Math.PI * 2;
    const wave = (Math.sin(th * TEETH) + 1) / 2;
    const tooth = wave < 0.45 ? 0 : (wave - 0.45) / 0.55;
    const outer = 1.62 + tooth * 0.42;
    const r = 1.32 + Math.random() * (outer - 1.32);
    out[i * 3] = Math.cos(th) * r;
    out[i * 3 + 1] = Math.sin(th) * r;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.34;
  }
  for (let i = rim; i < rim + hub; i += 1) {
    const th = Math.random() * Math.PI * 2;
    const r = 0.34 + Math.random() * 0.22;
    out[i * 3] = Math.cos(th) * r;
    out[i * 3 + 1] = Math.sin(th) * r;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.34;
  }
  for (let i = rim + hub; i < COUNT; i += 1) {
    const arm = Math.floor(Math.random() * 4);
    const th = (arm / 4) * Math.PI * 2 + Math.PI / 4 + (Math.random() - 0.5) * 0.09;
    const r = 0.56 + Math.random() * 0.76;
    out[i * 3] = Math.cos(th) * r;
    out[i * 3 + 1] = Math.sin(th) * r;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
  }
}

function shapeHelix(out) {
  // double helix with rungs
  const strands = Math.floor(COUNT * 0.68);
  const rungs = COUNT - strands;
  const TURNS = 2.25;
  const H = 4.6;
  const R = 1.02;
  for (let i = 0; i < strands; i += 1) {
    const t = Math.random();
    const th = t * Math.PI * 2 * TURNS + (i % 2 ? Math.PI : 0);
    const jit = 0.07;
    out[i * 3] = Math.cos(th) * R + (Math.random() - 0.5) * jit;
    out[i * 3 + 1] = (t - 0.5) * H + (Math.random() - 0.5) * jit;
    out[i * 3 + 2] = Math.sin(th) * R + (Math.random() - 0.5) * jit;
  }
  const N_RUNGS = 11;
  for (let i = 0; i < rungs; i += 1) {
    const k = Math.floor(Math.random() * N_RUNGS);
    const t = (k + 0.5) / N_RUNGS;
    const th = t * Math.PI * 2 * TURNS;
    const s = Math.random() * 2 - 1; // -1..1 across the rung
    const j = strands + i;
    out[j * 3] = Math.cos(th) * R * s;
    out[j * 3 + 1] = (t - 0.5) * H + (Math.random() - 0.5) * 0.05;
    out[j * 3 + 2] = Math.sin(th) * R * s;
  }
}

function shapeLogo(out) {
  // rasterize the hexagon + US monogram, sample lit pixels, extrude slightly
  const S = 300;
  const off = document.createElement('canvas');
  off.width = S; off.height = S;
  const c = off.getContext('2d');
  const s = S / 48;
  c.strokeStyle = '#fff';
  c.lineWidth = 2.6 * s;
  c.lineJoin = 'round';
  c.beginPath();
  const hex = [[24, 2.8], [42.4, 13.4], [42.4, 34.6], [24, 45.2], [5.6, 34.6], [5.6, 13.4]];
  hex.forEach(([x, y], i) => (i === 0 ? c.moveTo(x * s, y * s) : c.lineTo(x * s, y * s)));
  c.closePath();
  c.stroke();
  c.font = `italic 700 ${17 * s}px Satoshi, sans-serif`;
  c.textAlign = 'center';
  c.fillStyle = '#fff';
  c.fillText('US', 24 * s, 30.5 * s);

  const data = c.getImageData(0, 0, S, S).data;
  const lit = [];
  for (let y = 0; y < S; y += 2) {
    for (let x = 0; x < S; x += 2) {
      if (data[(y * S + x) * 4 + 3] > 120) lit.push([x / S, y / S]);
    }
  }
  const SCALE = 4.5;
  for (let i = 0; i < COUNT; i += 1) {
    const [px, py] = lit[Math.floor(Math.random() * lit.length)];
    out[i * 3] = (px - 0.5) * SCALE + (Math.random() - 0.5) * 0.03;
    out[i * 3 + 1] = (0.5 - py) * SCALE + (Math.random() - 0.5) * 0.03;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
}

function shapeRobot(out) {
  // rasterize a stylized AI robot head, sample lit pixels, extrude slightly
  const S = 300;
  const off = document.createElement('canvas');
  off.width = S; off.height = S;
  const c = off.getContext('2d');
  c.strokeStyle = '#fff';
  c.fillStyle = '#fff';
  c.lineWidth = 11;
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // head
  c.beginPath();
  c.roundRect(72, 96, 156, 140, 30);
  c.stroke();
  // antenna + tip
  c.beginPath(); c.moveTo(150, 96); c.lineTo(150, 58); c.stroke();
  c.beginPath(); c.arc(150, 46, 10, 0, Math.PI * 2); c.fill();
  // ears
  c.beginPath(); c.roundRect(46, 142, 18, 48, 8); c.stroke();
  c.beginPath(); c.roundRect(236, 142, 18, 48, 8); c.stroke();
  // eyes — solid, so they burn brighter in dust
  c.beginPath(); c.arc(118, 158, 16, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(182, 158, 16, 0, Math.PI * 2); c.fill();
  // speaker grille
  c.lineWidth = 7;
  [196, 210].forEach((y) => {
    c.beginPath(); c.moveTo(112, y); c.lineTo(188, y); c.stroke();
  });

  const data = c.getImageData(0, 0, S, S).data;
  const lit = [];
  for (let y = 0; y < S; y += 2) {
    for (let x = 0; x < S; x += 2) {
      if (data[(y * S + x) * 4 + 3] > 120) lit.push([x / S, y / S]);
    }
  }
  const SCALE = 4.6;
  for (let i = 0; i < COUNT; i += 1) {
    const [px, py] = lit[Math.floor(Math.random() * lit.length)];
    out[i * 3] = (px - 0.5) * SCALE + (Math.random() - 0.5) * 0.03;
    out[i * 3 + 1] = (0.5 - py) * SCALE + (Math.random() - 0.5) * 0.03;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.32;
  }
}

const SHAPES = { scan: shapeScan, gear: shapeGear, helix: shapeHelix, logo: shapeLogo, robot: shapeRobot };
const TILT = { scan: [0.28, 0], gear: [0.42, 0.3], helix: [0.12, 0], logo: [0.06, 0], robot: [0.04, 0] };
const SPIN = { scan: 'y', gear: 'z', helix: 'y', logo: 'sway', robot: 'sway' };

export function initSculpt(canvas, kind = 'scan') {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  camera.position.z = 7.4;

  const home = new Float32Array(COUNT * 3);
  (SHAPES[kind] || shapeScan)(home);

  const dust = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const v = new THREE.Vector3();
  for (let i = 0; i < COUNT; i += 1) {
    // resting shell: loose sphere around the shape
    v.setFromSphericalCoords(2.4 + Math.random() * 2.6, Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2);
    dust[i * 3] = v.x; dust[i * 3 + 1] = v.y; dust[i * 3 + 2] = v.z;
    seed[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aDust', new THREE.BufferAttribute(dust, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAssembly: { value: 0 },
      uPixelRatio: { value: dpr },
      uPointer: { value: new THREE.Vector3(0, 0, 0) },
    },
  });

  const points = new THREE.Points(geo, mat);
  const [tx, ty] = TILT[kind] || [0, 0];
  points.rotation.x = tx;
  points.rotation.y = ty;
  scene.add(points);
  const spinAxis = SPIN[kind] || 'y';

  const state = { target: 0, assembly: 0, visible: true, px: 0, py: 0, pStrength: 0 };

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.parentNode.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    state.px = nx * halfH * camera.aspect;
    state.py = ny * halfH;
    state.pStrength = 1;
  }, { passive: true });
  canvas.parentNode.addEventListener('pointerleave', () => { state.pStrength = 0; });

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!state.visible) return;
    const t = clock.getElapsedTime();
    state.assembly += (state.target - state.assembly) * 0.07;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAssembly.value = state.assembly;
    const u = mat.uniforms.uPointer.value;
    u.x += (state.px - u.x) * 0.12;
    u.y += (state.py - u.y) * 0.12;
    u.z += (state.pStrength - u.z) * 0.1;
    if (spinAxis === 'z') points.rotation.z = t * 0.2;
    else if (spinAxis === 'sway') points.rotation.y = Math.sin(t * 0.42) * 0.24;
    else points.rotation.y = t * 0.16;
    renderer.render(scene, camera);
  }
  frame();

  const io = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; });
  io.observe(canvas);

  return { setProgress(p) { state.target = p; } };
}

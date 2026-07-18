(function () {
'use strict';

// ============================================================
//  Breach Point / 破门点 — game.js
//  Single-page 3D first-person training game.
//  Uses preinstalled vendor/three.min.js (Three.js r147).
// ============================================================

// ---------- constants & utils ----------
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const PI    = Math.PI;
const TAU   = Math.PI * 2;

const CFG = {
  player:    { eye: 1.7, radius: 0.36, speed: 4.6, jump:null },
  weapon:    { mag:12, reserveStart:24, fireDt:0.135, reload:1.45, range:42, damage:22 },
  enemy:     { sight:18, sightAngle:88, hearGunfire:8, fireDt:1.05, dmg:14, sightBlock:5 },
  objective: { time:75, hold:1.5, dist:1.9 },
};

const LS_KEY = 'breachPoint.best.v1';

function rng(seed){
  let s = seed >>> 0 || 0x9e3779b9;
  return function(){
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// ---------- audio (Web Audio, procedural) ----------
const Audio = (function(){
  let ctx = null, masterGain = null, muted = false;
  let alarmOsc = null, alarmGain = null;
  let ambienceStarted = false;
  function ensure(){
    if (ctx) return ctx;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);
    }catch(e){ ctx = null; }
    return ctx;
  }
  function resume(){
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(()=>{});
  }
  function setMuted(m){
    muted = !!m;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
    if (muted && alarmOsc){
      try{ alarmOsc.stop(); }catch(e){}
      alarmOsc = null; alarmGain = null;
    }
  }
  function isMuted(){ return muted; }
  function envGain(c, dur, peak, attack, release){
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + (attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    return g;
  }
  function noiseBuffer(c, durSec){
    const n = Math.max(1, Math.floor(c.sampleRate * durSec));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i=0;i<n;i++) ch[i] = Math.random()*2-1;
    return buf;
  }
  function shot(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, 0.18);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.9;
    const g = envGain(c, 0.18, 0.55, 0.001, 0.18);
    noise.connect(bp); bp.connect(g); g.connect(masterGain);
    noise.start(t); noise.stop(t + 0.2);

    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const og = envGain(c, 0.18, 0.35, 0.001, 0.18);
    const of = c.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 700;
    osc.connect(of); of.connect(og); og.connect(masterGain);
    osc.start(t); osc.stop(t + 0.2);
  }
  function hit(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, 0.08);
    const hp = c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = 1400;
    const g = envGain(c, 0.07, 0.4, 0.001, 0.07);
    noise.connect(hp); hp.connect(g); g.connect(masterGain);
    noise.start(t); noise.stop(t + 0.08);
  }
  function damage(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.32);
    const g = envGain(c, 0.32, 0.5, 0.002, 0.32);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.34);
  }
  function reload(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    function click(at, f, dur){
      const noise = c.createBufferSource();
      noise.buffer = noiseBuffer(c, dur);
      const hp = c.createBiquadFilter(); hp.type='bandpass'; hp.frequency.value = f; hp.Q.value = 1.2;
      const g = envGain(c, dur, 0.32, 0.001, dur);
      noise.connect(hp); hp.connect(g); g.connect(masterGain);
      noise.start(t + at); noise.stop(t + at + dur + 0.05);
    }
    click(0.05, 1800, 0.06);
    click(0.55, 1500, 0.08);
    click(1.20, 2200, 0.05);
  }
  function empty(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, 0.04);
    const hp = c.createBiquadFilter(); hp.type='bandpass'; hp.frequency.value = 2500; hp.Q.value=2.5;
    const g = envGain(c, 0.04, 0.22, 0.001, 0.04);
    noise.connect(hp); hp.connect(g); g.connect(masterGain);
    noise.start(t); noise.stop(t + 0.05);
  }
  function startAlarm(){
    const c = ensure(); if (!c || alarmOsc || muted) return;
    alarmOsc = c.createOscillator();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.value = 220;
    alarmGain = c.createGain();
    alarmGain.gain.value = 0.08;
    const lfo = c.createOscillator(); lfo.frequency.value = 1.4;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain); lfoGain.connect(alarmGain.gain);
    alarmOsc.connect(alarmGain); alarmGain.connect(masterGain);
    alarmOsc.start(); lfo.start();
    alarmOsc._lfo = lfo;
  }
  function stopAlarm(){
    if (!alarmOsc) return;
    try{ alarmOsc.stop(); alarmOsc._lfo.stop(); }catch(e){}
    alarmOsc.disconnect(); alarmGain.disconnect();
    alarmOsc = null; alarmGain = null;
  }
  function win(){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const t = t0 + i * 0.10;
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = envGain(c, 0.6, 0.35, 0.005, 0.6);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.65);
    });
  }
  function lose(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const notes = [261.63, 196.0];
    notes.forEach((f, i) => {
      const ts = t + i * 0.28;
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const g = envGain(c, 0.5, 0.34, 0.01, 0.5);
      osc.connect(g); g.connect(masterGain);
      osc.start(ts); osc.stop(ts + 0.55);
    });
  }
  function step(){
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, 0.05);
    const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
    const g = envGain(c, 0.05, 0.07, 0.001, 0.05);
    noise.connect(lp); lp.connect(g); g.connect(masterGain);
    noise.start(t); noise.stop(t+0.05);
  }
  return { resume, setMuted, isMuted, shot, hit, damage, reload, empty, startAlarm, stopAlarm, win, lose, step, ensure };
})();

// ---------- DOM ----------
const canvas = document.getElementById('gl');
const $menu = document.getElementById('menu');
const $hud  = document.getElementById('hud');
const $touch= document.getElementById('touch');
const $overlay = document.getElementById('overlay');
const $overlayCard = document.getElementById('overlay-card');
const $overlayTitle = document.getElementById('overlay-title');
const $overlayBody  = document.getElementById('overlay-body');
const $overlayActions = document.getElementById('overlay-actions');
const $hpNum = document.getElementById('hp-num');
const $hpFill= document.getElementById('hp-fill');
const $ammoNum = document.getElementById('ammo-num');
const $reserveNum = document.getElementById('reserve-num');
const $reloadTag = document.getElementById('reload-tag');
const $timeNum = document.getElementById('time-num');
const $enemyDead = document.getElementById('enemy-dead');
const $enemyTotal= document.getElementById('enemy-total');
const $objectiveText = document.getElementById('objective-text');
const $objectiveTag = document.getElementById('objective-tag');
const $objective = document.querySelector('.objective');
const $crosshair = document.getElementById('crosshair');
const $hitMarker = document.getElementById('hit-marker');
const $damageFlash = document.getElementById('damage-flash');
const $bombProgress = document.getElementById('bomb-progress');
const $bombFill = document.getElementById('bomb-fill');
const $bombHint = document.getElementById('bomb-hint');
const $statusLine = document.getElementById('status-line');
const $introArrow = document.getElementById('intro-arrow');
const $bestLine = document.getElementById('best-line');

// ---------- three.js setup ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x0a131e, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x152a3a);
scene.fog = new THREE.Fog(0x162838, 24, 70);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
camera.position.set(0, 1.7, 18);

// root group for entities (enemies, objective)
const worldRoot = new THREE.Group();
scene.add(worldRoot);

// ---------- environment ----------
function setResize(){
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', setResize);
setResize();

// lighting
const hemi = new THREE.HemisphereLight(0x88bfff, 0x1c2a3a, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1cf, 0.6);
sun.position.set(-30, 60, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
sun.shadow.bias = -0.0006;
scene.add(sun);

// ambient warm fill near warehouse
const warmFill = new THREE.PointLight(0xffb66a, 1.0, 60, 2);
warmFill.position.set(-6, 8, -10);
scene.add(warmFill);
const warmFill2 = new THREE.PointLight(0x7fc6ff, 0.7, 60, 2);
warmFill2.position.set(10, 6, 4);
scene.add(warmFill2);

// ground (harbor concrete with subtle wet look)
{
  const groundGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x38454f, roughness: 0.95, metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // harbor water beyond concrete
  const seaGeo = new THREE.PlaneGeometry(120, 120);
  const seaMat = new THREE.MeshStandardMaterial({ color:0x15334a, roughness:0.55, metalness:0.2, emissive:0x081a26, emissiveIntensity:0.4 });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.02;
  sea.position.z = -30;
  scene.add(sea);
}

// =====================================================
//  Map (harbor warehouse training yard)
//  Origin (0,0,0) = concrete pad center.
//  Player spawn z = +18 (south), objective z = -16 (north).
// =====================================================
//  Axis-aligned collision boxes (AABB). x0=xmin, x1=xmax, z0=zmin, z1=zmax, h=height, kind=tag
const COLLISION = []; // boxes used for movement + ray blocking
const SOFT_BLOCK = []; // boxes used for raycast block & line-of-sight, but traversable

function addBox(centerX, centerZ, w, d, h, kind){
  const x0 = centerX - w/2, x1 = centerX + w/2;
  const z0 = centerZ - d/2, z1 = centerZ + d/2;
  COLLISION.push({ x0, x1, z0, z1, h, kind: kind || 'wall' });
  return { x0, x1, z0, z1 };
}
function addSoft(centerX, centerZ, w, d, h, kind){
  SOFT_BLOCK.push({ x0: centerX - w/2, x1: centerX + w/2, z0: centerZ - d/2, z1: centerZ + d/2, h, kind: kind || 'cover' });
}

// outer boundary walls (playfield 44x52)
addBox( 0,  27,  44, 1.2, 5, 'fence');
addBox( 0, -27,  44, 1.2, 5, 'fence');
addBox( 23, 0,  1.2, 54, 5, 'fence');
addBox(-23, 0,  1.2, 54, 5, 'fence');

// warehouse building (north of center)
const WH = { x0: -11, x1: 11, z0: -22, z1: -10, h: 7 }; // box bounds
// thin back wall at z=-22 (was a giant 22x12 box that swallowed the whole interior)
addBox(0, -22, 22, 0.4, WH.h, 'warehouse');
// front opening split (door): visual walls are x in [-11,-3.5] and [3.5,11] at z=-10
addBox(-7.25, -10, 7.5, 0.4, WH.h, 'warehouse'); // left front wall piece
addBox( 7.25, -10, 7.5, 0.4, WH.h, 'warehouse'); // right front wall piece
// (door lintel removed — it was a full-height box that sealed the door and prevented entry)
// warehouse side walls extending out from front
addBox(-11, -16, 1.2, 12, WH.h, 'warehouse');
addBox( 11, -16, 1.2, 12, WH.h, 'warehouse');
// interior pillars
const PILLARS = [[-6, -18],[-2, -18],[2, -18],[6, -18],[-6,-13],[6,-13]];
PILLARS.forEach(([px,pz])=> addBox(px, pz, 0.8, 0.8, 6, 'pillar'));

// rafters (visual roof lines, non-colliding)
{
  const roofMat = new THREE.MeshStandardMaterial({ color:0x22323f, roughness:0.85, metalness:0.2, side:THREE.DoubleSide, flatShading:true });
  const roofGeo = new THREE.BoxGeometry(WH.x1 - WH.x0, 0.2, WH.z1 - WH.z0);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set((WH.x0+WH.x1)/2, WH.h, (WH.z0+WH.z1)/2);
  roof.castShadow = true; roof.receiveShadow = true;
  scene.add(roof);

  // roof slope flags
  const flagMat = new THREE.MeshStandardMaterial({ color:0x3f6b8a, roughness:0.85, side:THREE.DoubleSide, flatShading:true });
  const flagGeo = new THREE.PlaneGeometry(2.6, 1.2);
  const flag1 = new THREE.Mesh(flagGeo, flagMat);
  flag1.position.set(-9.5, WH.h + 1.0, -20);
  flag1.rotation.y = 0.2;
  scene.add(flag1);
  const flag2 = new THREE.Mesh(flagGeo, flagMat);
  flag2.position.set(9.5, WH.h + 1.0, -20);
  flag2.rotation.y = -0.2;
  scene.add(flag2);
}

// containers and cover crates outside the warehouse, forming a 2-route maze
// Left route (between containers and -x fence)
const STACKS = [
  // south zone (entrance) — open
  // mid yard
  { cx:-9, cz: 6,  w:5, d:2.2, h:2.6, color:0x5d3b2a, kind:'crate' },
  { cx:-9, cz: 6,  w:2.2, d:5,   h:2.6, color:0x3a4e62, kind:'container' },
  { cx: 9, cz: 7,  w:5, d:2.4, h:2.6, color:0x4a3a26, kind:'crate' },
  { cx: 9, cz: 4,  w:2.4, d:5,   h:2.6, color:0x395268, kind:'container' },
  // mid zone
  { cx:-5, cz: 0,  w:6, d:2.4, h:3.4, color:0xa44d2a, kind:'container' },
  { cx: 5, cz:-1,  w:6, d:2.4, h:3.4, color:0x3d6b8f, kind:'container' },
  { cx: 0, cz:-4,  w:10,d:1.6, h:1.4, color:0x7a5a3e, kind:'crate_low' },
  { cx:-12,cz:-3,  w:2.4, d:8,  h:2.6, color:0x3d6b8f, kind:'container' },
  { cx: 12,cz:-3,  w:2.4, d:8,  h:2.6, color:0x3d6b8f, kind:'container' },
  // approach to warehouse: create two entry corridors at x≈±6 leading into door
  { cx:-7, cz:-7,  w:3, d:3,   h:2.0, color:0x7a5a3e, kind:'crate' },
  { cx: 7, cz:-7,  w:3, d:3,   h:2.0, color:0x7a5a3e, kind:'crate' },
  // the soft block above these can act as cover
];
STACKS.forEach(b => addBox(b.cx, b.cz, b.w, b.d, b.h, 'cover'));

// sandbag low cover in open areas (smaller AABB, also soft block)
const sandbags = [
  { cx:-7.5, cz:11, w:2.4, d:0.8, h:1.0 },
  { cx: 7.5, cz:11, w:2.4, d:0.8, h:1.0 },
  { cx: 0,   cz: 3, w:3.0, d:0.8, h:1.0 },
  { cx:-4,   cz:-8, w:0.8, d:2.4, h:1.0 },
  { cx: 4,   cz:-8, w:0.8, d:2.4, h:1.0 },
];
sandbags.forEach(s => addSoft(s.cx, s.cz, s.w, s.d, s.h, 'sandbag'));

// barrel stacks (visual only but soft cover)
const barrels = [];
for (let i=0;i<6;i++){
  const ang = (i / 6) * Math.PI * 2;
  barrels.push({
    cx: 14 * Math.cos(ang),
    cz: 14 * Math.sin(ang),
    color: 0xa14a25,
  });
}

// =====================================================
//  Visual decoration: containers, crates, sandbags, barrels, fencing, lamp posts, distant landmarks
// =====================================================
function makeContainer(cx, cz, w, d, h, color){
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness:0.7, metalness:0.25, flatShading:true });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.y = h/2; box.castShadow = true; box.receiveShadow = true;
  group.add(box);
  // stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.5, emissive:0x222222 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w+0.02, 0.18, d+0.02), stripeMat);
  stripe.position.y = h*0.45;
  group.add(stripe);
  const stripe2 = stripe.clone(); stripe2.position.y = h*0.15; group.add(stripe2);
  // tiny doors at short end
  const doorMat = new THREE.MeshStandardMaterial({ color:0x111518, roughness:0.7 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(w*0.42, h*0.7, 0.04), doorMat);
  door.position.set(0, h*0.5, d/2 + 0.001);
  group.add(door);
  group.position.set(cx, 0, cz);
  scene.add(group);
  return group;
}
function makeCrate(cx, cz, w, d, h, color){
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness:0.85, metalness:0.05, flatShading:true });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.y = h/2; box.castShadow = true; box.receiveShadow = true;
  group.add(box);
  // plank lines
  const eMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe:true, transparent:true, opacity:0.18 });
  const edges = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), eMat);
  edges.position.y = h/2;
  group.add(edges);
  group.position.set(cx, 0, cz);
  scene.add(group);
  return group;
}
function makeSandbag(cx, cz, w, d, h){
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color:0xb9a880, roughness:0.95, flatShading:true });
  const row = 2, col = 3;
  for (let r=0;r<row;r++){
    for (let c=0;c<col;c++){
      const wSeg = w / col, dSeg = d/2;
      const x = -w/2 + wSeg/2 + c*wSeg;
      const z = r===0 ? -d/4 : d/4;
      const y = r===0 ? dSeg/2 : dSeg + dSeg/2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(wSeg*0.95, dSeg*0.7, dSeg*0.95), mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
  }
  group.position.set(cx, 0, cz);
  scene.add(group);
  return group;
}
function makeBarrel(cx, cz, color){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness:0.6, metalness:0.55, flatShading:true });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,1.0,10), mat);
  b.position.y = 0.5; b.castShadow = true; b.receiveShadow = true;
  g.add(b);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.1,10), new THREE.MeshStandardMaterial({color:0x222222}));
  ring.position.y = 0.2; g.add(ring);
  ring.position.y = 0.8; g.add(ring.clone());
  g.position.set(cx, 0, cz);
  scene.add(g);
  return g;
}
function makeFence(centerX, centerZ, w, d, h){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color:0x4a5560, roughness:0.7, metalness:0.4, flatShading:true });
  // posts
  const postCount = Math.max(2, Math.round(Math.max(w,d) / 2.2));
  const long = w > d;
  for (let i=0;i<=postCount;i++){
    const p = long ? new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), mat) : new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), mat);
    if (long){
      p.position.set(-w/2 + (w/(postCount))*i, h/2, 0);
    } else {
      p.position.set(0, h/2, -d/2 + (d/(postCount))*i);
    }
    p.castShadow = true; p.receiveShadow = true;
    g.add(p);
  }
  // horizontal bars
  for (let r=0;r<3;r++){
    const bar = long
      ? new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.04), mat)
      : new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, d), mat);
    bar.position.y = 0.6 + r * (h-1.2)/2;
    bar.castShadow = true;
    g.add(bar);
  }
  g.position.set(centerX, 0, centerZ);
  scene.add(g);
  return g;
}
function makeLamp(x, z){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color:0x2a3540, roughness:0.7, metalness:0.6 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,4.8,6), mat);
  post.position.y = 2.4; post.castShadow = true;
  g.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.25,0.4), mat);
  head.position.set(0.05, 4.6, 0.1); head.castShadow = true;
  g.add(head);
  const bulbMat = new THREE.MeshStandardMaterial({ color:0xffe7a8, emissive:0xffd079, emissiveIntensity:1.4 });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.3), bulbMat);
  bulb.position.set(0.05, 4.45, 0.1);
  g.add(bulb);
  const lamp = new THREE.PointLight(0xffcd86, 0.55, 14, 2);
  lamp.position.set(0.05, 4.4, 0.1);
  g.add(lamp);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// scatter concrete blocks & distant landmarks
function makeDistant(){
  // distant cranes
  const craneMat = new THREE.MeshStandardMaterial({ color:0x2c4a63, roughness:0.85, metalness:0.3, flatShading:true });
  const crane = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), craneMat); base.position.y = 0.3; crane.add(base);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8.5, 0.7), craneMat); pillar.position.y = 4.5; crane.add(pillar);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.55, 0.6), craneMat); arm.position.set(2.8, 8.5, 0); crane.add(arm);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 0.45), craneMat); arm2.position.set(-2.0, 9.0, 0); arm2.rotation.z = 0.6; crane.add(arm2);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4, 0.08), craneMat); cable.position.set(6.6, 6.2, 0); crane.add(cable);
  crane.position.set(-20, 0, -42); crane.castShadow = true;
  scene.add(crane);

  const crane2 = crane.clone();
  crane2.position.set(22, 0, -42);
  crane2.rotation.y = -0.4;
  scene.add(crane2);

  // distant warehouses (silhouettes)
  const dwMat = new THREE.MeshStandardMaterial({ color:0x1f3344, roughness:0.9, flatShading:true });
  for (let i=0;i<5;i++){
    const w = 8 + (i*1.7);
    const d = 4;
    const h = 4 + (i%3)*1.6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dwMat);
    m.position.set(-26 + i*9, h/2, -45);
    scene.add(m);
  }
  for (let i=0;i<6;i++){
    const h = 3 + ((i*7)%5);
    const m = new THREE.Mesh(new THREE.BoxGeometry(5, h, 4), dwMat);
    m.position.set(18 + (i%2)*8, h/2, -50 + i*5);
    scene.add(m);
  }
}
makeDistant();

// warehouse walls visual re-do on top of collision boxes
function makeWarehouseVis(){
  const wallMat = new THREE.MeshStandardMaterial({ color:0x3a4a5a, roughness:0.85, metalness:0.15, flatShading:true });
  const w = (WH.x1 - WH.x0), d = (WH.z1 - WH.z0);
  // back
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WH.h, 0.4), wallMat);
    m.position.set(0, WH.h/2, WH.z1);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  // sides
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, WH.h, d), wallMat);
    m.position.set(WH.x0, WH.h/2, (WH.z0+WH.z1)/2);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, WH.h, d), wallMat);
    m.position.set(WH.x1, WH.h/2, (WH.z0+WH.z1)/2);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  // front split (around opening x in [-3.5,3.5])
  {
    const half = (3.5 - (WH.x0))/1;
    const leftW = 3.5 - WH.x0;
    const rightW = WH.x1 - 3.5;
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(leftW, WH.h, 0.4), wallMat);
    m1.position.set((WH.x0 + 3.5)/2, WH.h/2, WH.z0);
    m1.castShadow = true; m1.receiveShadow = true;
    scene.add(m1);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(rightW, WH.h, 0.4), wallMat);
    m2.position.set((3.5 + WH.x1)/2, WH.h/2, WH.z0);
    m2.castShadow = true; m2.receiveShadow = true;
    scene.add(m2);
    // door lintel
    const m3 = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 0.4), wallMat);
    m3.position.set(0, WH.h - 1.3, WH.z0);
    m3.castShadow = true; m3.receiveShadow = true;
    scene.add(m3);
  }

  // front-face pillars (visual) at door sides
  {
    const pmat = new THREE.MeshStandardMaterial({ color:0x2b3a48, roughness:0.7, metalness:0.4, flatShading:true });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, WH.h, 0.7), pmat); p1.position.set(-3.9, WH.h/2, WH.z0); p1.castShadow = true; scene.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, WH.h, 0.7), pmat); p2.position.set( 3.9, WH.h/2, WH.z0); p2.castShadow = true; scene.add(p2);
  }
  // interior pillars visualisation
  PILLARS.forEach(([px,pz])=>{
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.0, 0.7), new THREE.MeshStandardMaterial({ color:0x2b3a48, roughness:0.7, metalness:0.4 }));
    pm.position.set(px, 3, pz); pm.castShadow = true; scene.add(pm);
  });
  // warehouse warm interior lamp
  {
    const lamp = new THREE.PointLight(0xffd0a0, 0.8, 26, 2);
    lamp.position.set(0, 6, -16);
    scene.add(lamp);
  }
  // door area warning light
  {
    const lamp = new THREE.PointLight(0xff8855, 0.7, 16, 2);
    lamp.position.set(0, 4.5, -8);
    scene.add(lamp);
  }
}
makeWarehouseVis();

// render decorative stacks
STACKS.forEach(b => {
  if (b.kind === 'container' || b.kind === 'container_h') makeContainer(b.cx, b.cz, b.w, b.d, b.h, b.color);
  else if (b.kind === 'crate_low') makeCrate(b.cx, b.cz, b.w, b.d, b.h, b.color);
  else makeCrate(b.cx, b.cz, b.w, b.d, b.h, b.color);
});
sandbags.forEach(s => makeSandbag(s.cx, s.cz, s.w, s.d, s.h));
barrels.forEach(b => makeBarrel(b.cx, b.cz, b.color));

// fences
makeFence( 0,  27, 44, 1.2, 4);
makeFence( 0, -27, 44, 1.2, 4);
makeFence( 23, 0, 1.2, 54, 4);
makeFence(-23, 0, 1.2, 54, 4);

// gate hint at south entrance
{
  const gate = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color:0x1c2733, roughness:0.7, metalness:0.4, flatShading:true });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.4), m);
  left.position.set(-3, 1.6, 26.6); left.castShadow = true;
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.4), m);
  right.position.set(3, 1.6, 26.6); right.castShadow = true;
  gate.add(left); gate.add(right);
  // sign (low poly)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 0.1), new THREE.MeshStandardMaterial({ color:0xffba47, emissive:0xffba47, emissiveIntensity:0.3 }));
  sign.position.set(0, 3.6, 26.6);
  gate.add(sign);
  scene.add(gate);
}

// lamp posts
[[-8, 12], [8, 12], [-12, 4], [12, 4], [-6, -22], [6, -22], [-2, 22], [2, 22]].forEach(([x,z])=>makeLamp(x,z));

// big warehouse sign
{
  const txt = new THREE.MeshStandardMaterial({ color:0xffe2a8, emissive:0xffd28b, emissiveIntensity:0.7, roughness:0.6 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 0.08), txt);
  strip.position.set(0, 5.6, WH.z1 + 0.5);
  scene.add(strip);
  const strip2 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, 0.05), txt);
  strip2.position.set(0, 5.95, WH.z1 + 0.5);
  scene.add(strip2);
}

// ---------- objective: pulsing device on platform ----------
const objective = (function(){
  const g = new THREE.Group();
  // platform (3 low crates)
  const pltMat = new THREE.MeshStandardMaterial({ color:0x46341f, roughness:0.85, flatShading:true });
  const plt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.6), pltMat);
  plt.position.y = 0.3; plt.receiveShadow = true; plt.castShadow = true;
  g.add(plt);

  // device base
  const baseMat = new THREE.MeshStandardMaterial({ color:0x2a3340, roughness:0.7, metalness:0.6, flatShading:true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), baseMat);
  base.position.y = 0.85; base.castShadow = true;
  g.add(base);

  // core cylinder
  const coreMat = new THREE.MeshStandardMaterial({ color:0x66e7ff, emissive:0x66e7ff, emissiveIntensity:1.2, roughness:0.4, metalness:0.2 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.2, 10), coreMat);
  core.position.y = 1.7; core.castShadow = true;
  g.add(core);

  // antenna
  const antMat = new THREE.MeshStandardMaterial({ color:0xb0c4d8, roughness:0.6, metalness:0.4 });
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.9,6), antMat);
  ant.position.y = 2.6; g.add(ant);
  const tipMat = new THREE.MeshStandardMaterial({ color:0xff5d5d, emissive:0xff5d5d, emissiveIntensity:1.2 });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), tipMat);
  tip.position.y = 3.1; g.add(tip);

  // point lights
  const glowA = new THREE.PointLight(0x66e7ff, 1.1, 9, 2);
  glowA.position.set(0, 1.7, 0); g.add(glowA);
  const glowB = new THREE.PointLight(0xff5d5d, 0.5, 5, 2);
  glowB.position.set(0, 3.1, 0); g.add(glowB);

  // ring markers around device (visual radius hint)
  const ringMat = new THREE.MeshBasicMaterial({ color:0x66e7ff, transparent:true, opacity:0.18 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(CFG.objective.dist - 0.05, CFG.objective.dist, 32), ringMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.03;
  g.add(ring);

  scene.add(g);
  return {
    g: g,
    obj: g,
    core: core, tip: tip, glowA: glowA, ring: ring,
    world: new THREE.Vector3(0, 0, 0),
    get pos(){
      const v = new THREE.Vector3();
      g.getWorldPosition(v);
      return v;
    }
  };
})();
objective.g.position.set(0, 0, -16);
// update world vector and animate
function updateObjectiveVis(time){
  objective.core.material.emissiveIntensity = 0.9 + 0.5 * Math.sin(time * 3.2);
  objective.tip.material.emissiveIntensity  = 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(time * 3.2));
  objective.glowA.intensity = 0.8 + 0.6 * Math.sin(time * 3.2 + 1);
  objective.ring.material.opacity = 0.14 + 0.06 * Math.sin(time * 2.0);
  objective.core.rotation.y = time * 0.6;
  objective.g.getWorldPosition(objective.world);
}

// ---------- weapon (visible first-person model) ----------
function makeWeaponModel(){
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color:0x22272d, roughness:0.55, metalness:0.6, flatShading:true });
  const matGrip = new THREE.MeshStandardMaterial({ color:0x3b2a1a, roughness:0.8, metalness:0.1, flatShading:true });
  // body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.65), mat);
  body.position.set(0, 0, -0.25); body.castShadow = false;
  grp.add(body);
  // barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8), mat);
  barrel.rotation.x = Math.PI/2;
  barrel.position.set(0, 0.025, -0.6); grp.add(barrel);
  // grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.16), matGrip);
  grip.position.set(0, -0.2, 0.0); grp.add(grip);
  // mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.14), mat);
  mag.position.set(0, -0.32, -0.06); grp.add(mag);
  // sight
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), mat);
  sight.position.set(0, 0.12, -0.05); grp.add(sight);

  // mount to camera
  grp.position.set(0.32, -0.28, -0.55);
  return grp;
}
const weaponModel = makeWeaponModel();
camera.add(weaponModel);
scene.add(camera);

// muzzle flash sprite
const muzzleFX = (function(){
  const g = new THREE.Group();
  const light = new THREE.PointLight(0xffd28b, 0, 6, 2);
  g.add(light);
  const mat = new THREE.MeshBasicMaterial({ color:0xffd28b, transparent:true, opacity:0 });
  const star = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), mat);
  g.add(star);
  // billboard later
  star.lookAt && 0;
  return g;
})();
camera.add(muzzleFX);

// ---------- player ----------
const Player = {
  pos: new THREE.Vector3(0, CFG.player.eye, 18),
  yaw: 180,   // face north (-Z)
  pitch: 0,
  hp: 100,
  speed: CFG.player.speed,
  radius: CFG.player.radius,
  alive: true,
  // weapon
  mag: CFG.weapon.mag,
  reserve: CFG.weapon.reserveStart,
  reloading: false,
  reloadStart: 0,
  reloadElapsed: 0,
  reloadDur: CFG.weapon.reload,
  fireCd: 0,
  lastFireAt: 0,
  recoil: 0,
  // interaction
  bombHold: 0,
};
function playerForward(yaw, pitch){
  const y = yaw * DEG, p = pitch * DEG;
  return new THREE.Vector3(
    -Math.sin(y) * Math.cos(p),
     Math.sin(p),
    -Math.cos(y) * Math.cos(p),
  );
}
function playerRight(yaw){
  const y = yaw * DEG;
  return new THREE.Vector3(Math.cos(y), 0, -Math.sin(y));
}

// ---------- enemies ----------
const Enemies = {
  list: [],
  nextId: 1,
};
const enemyGeo = (function(){
  // humanoid made of boxes (built once and reused)
  const body = new THREE.BoxGeometry(0.55, 0.85, 0.32);
  const head = new THREE.BoxGeometry(0.36, 0.36, 0.36);
  const arm  = new THREE.BoxGeometry(0.18, 0.7, 0.18);
  const leg  = new THREE.BoxGeometry(0.22, 0.78, 0.22);
  return { body, head, arm, leg };
})();
function makeEnemyMesh(){
  const root = new THREE.Group();
  const torsoMat = new THREE.MeshStandardMaterial({ color:0x6c2f30, roughness:0.7, metalness:0.1, flatShading:true }); // dark red uniform
  const limbMat  = new THREE.MeshStandardMaterial({ color:0x22303c, roughness:0.7, metalness:0.1, flatShading:true });
  const headMat  = new THREE.MeshStandardMaterial({ color:0xcc9c70, roughness:0.6, metalness:0.05, flatShading:true });
  const helmetMat= new THREE.MeshStandardMaterial({ color:0x2c2a28, roughness:0.55, metalness:0.45, flatShading:true });
  const vestMat  = new THREE.MeshStandardMaterial({ color:0x3d6b8f, roughness:0.6, metalness:0.2, flatShading:true });

  const torso = new THREE.Mesh(enemyGeo.body, torsoMat);
  torso.position.y = 0.6 + 0.425; torso.castShadow = true;
  root.add(torso);
  // vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.18), vestMat);
  vest.position.set(0, 1.05, 0.1); vest.castShadow = true;
  root.add(vest);
  // head
  const head = new THREE.Mesh(enemyGeo.head, headMat);
  head.position.y = 1.4; head.castShadow = true;
  root.add(head);
  // helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.4), helmetMat);
  helmet.position.y = 1.62; helmet.castShadow = true;
  root.add(helmet);
  // arms
  const aL = new THREE.Mesh(enemyGeo.arm, limbMat);
  aL.position.set(-0.32, 1.0, 0.05); aL.rotation.x = -0.15; aL.castShadow = true;
  root.add(aL);
  const aR = new THREE.Mesh(enemyGeo.arm, limbMat);
  aR.position.set(0.32, 1.0, 0.05); aR.rotation.x = -0.15; aR.castShadow = true;
  root.add(aR);
  // legs
  const lL = new THREE.Mesh(enemyGeo.leg, limbMat);
  lL.position.set(-0.18, 0.6, 0); lL.castShadow = true;
  root.add(lL);
  const lR = new THREE.Mesh(enemyGeo.leg, limbMat);
  lR.position.set(0.18, 0.6, 0); lR.castShadow = true;
  root.add(lR);

  // weapon: small SMG
  const weaponMat = new THREE.MeshStandardMaterial({ color:0x1a1d22, roughness:0.6, metalness:0.5, flatShading:true });
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), weaponMat);
  weapon.position.set(0.32, 1.05, 0.4); weapon.castShadow = true;
  root.add(weapon);
  root._refs = { torso, head, helmet, vest, aL, aR, lL, lR, weapon };

  // muzzle flash (off by default)
  const flashMat = new THREE.MeshBasicMaterial({ color:0xffd28b, transparent:true, opacity:0 });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flashMat);
  flash.position.set(0.32, 1.05, 0.66);
  root.add(flash);
  root._refs.flash = flash; root._refs.flashMat = flashMat;

  // hit indicator (subtle outline via emissive flash)
  root._refs.torsoMat = torsoMat;
  root._refs.headMat  = headMat;

  return root;
}
function makeEnemy(spec){
  const id = Enemies.nextId++;
  const root = makeEnemyMesh();
  root.position.set(spec.x, 0, spec.z);
  // orient
  root.rotation.y = spec.facing * DEG;
  scene.add(root);
  return {
    id,
    obj: root,
    pos: new THREE.Vector3(spec.x, 0, spec.z),
    facing: spec.facing,
    hp: spec.hp,
    maxHp: spec.hp,
    alive: true,
    state: 'patrol',
    stateT: 0,
    fireCd: 0,
    reaction: spec.reaction ?? 0.45,
    hitsUntilDeath: 0,
    patrolA: new THREE.Vector3(spec.x, 0, spec.z),
    patrolB: new THREE.Vector3(spec.bx, 0, spec.bz),
    patrolDir: 1,
    patrolT: 0,
    recentDamageFlash: 0,
    dead: false,
    seenFlag: 'idle',
    investigatePos: null,
    investigateUntil: 0,
    label: spec.label || `Target ${id}`,
  };
}
function resetEnemies(){
  Enemies.list.forEach(e => scene.remove(e.obj));
  Enemies.list.length = 0;
  Enemies.nextId = 1;
  const specs = [
    { x:  4.5, z:-12, bx: 4.5, bz: -8, hp:60, reaction:0.35, facing: 180, label:'Rifleman' },     // entrance right of door
    { x: -4.5, z:-12, bx:-4.5, bz: -8, hp:60, reaction:0.4,  facing: 180, label:'Rifleman' },     // entrance left of door
    { x: -8.0, z: -3, bx:-2.0, bz: -3, hp:55, reaction:0.5,  facing: 90,  label:'Sniper' },        // west flank container
    { x:  8.0, z: -3, bx: 2.0, bz: -3, hp:55, reaction:0.55, facing:-90,  label:'Sniper' },        // east flank container
  ];
  for (const sp of specs){
    Enemies.list.push(makeEnemy(sp));
  }
}

// ---------- bullets (player + enemy tracers) ----------
const Bullets = {
  tracers: [],    // visible projectiles from enemies to player
  hits: [],       // short-lived sparks
};

function spawnTracer(fromV, toV, color){
  const dir = toV.clone().sub(fromV);
  const len = dir.length();
  dir.normalize();
  const geo = new THREE.CylinderGeometry(0.04, 0.04, len, 5, 1, true);
  geo.translate(0, len/2, 0);
  geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI/2));
  geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.atan2(dir.x, dir.z)));
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.95 });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(fromV);
  m.lookAt(toV);
  m.rotateY(Math.PI/2);
  // simpler: orient to direction
  m.position.copy(fromV.clone().add(toV).multiplyScalar(0.5));
  const up = new THREE.Vector3(0,1,0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  m.quaternion.copy(quat);
  scene.add(m);
  return { mesh: m, life: 0.25, maxLife: 0.25 };
}
function spawnHitSpark(pos){
  for (let i=0;i<7;i++){
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color:0xffd28b });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.userData.v = new THREE.Vector3(
      (Math.random()-0.5)*3,
      Math.random()*1.5+0.5,
      (Math.random()-0.5)*3,
    );
    m.userData.life = 0.35;
    m.userData.max = 0.35;
    scene.add(m);
    Bullets.hits.push(m);
  }
}
function spawnBlood(pos){
  for (let i=0;i<10;i++){
    const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    const mat = new THREE.MeshBasicMaterial({ color:0x8a1422 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.userData.v = new THREE.Vector3(
      (Math.random()-0.5)*2,
      Math.random()*1.2+0.4,
      (Math.random()-0.5)*2,
    );
    m.userData.life = 0.5;
    m.userData.max = 0.5;
    scene.add(m);
    Bullets.hits.push(m);
  }
}

// ---------- muzzle FX helpers ----------
function flashMuzzle(){
  // show bright sprite + light at muzzle end
  muzzleFX.position.set(0.32, -0.255, -0.95);
  const light = muzzleFX.children[0];
  light.intensity = 2.4;
  const star = muzzleFX.children[1];
  star.material.opacity = 0.95;
  muzzleFX.flashTime = 0.07;
}
function updateMuzzleFX(dt){
  if (muzzleFX.flashTime === undefined) muzzleFX.flashTime = 0;
  if (muzzleFX.flashTime > 0){
    muzzleFX.flashTime -= dt;
    if (muzzleFX.flashTime <= 0){
      muzzleFX.children[0].intensity = 0;
      muzzleFX.children[1].material.opacity = 0;
    }
  }
}

// ---------- audio: gun shot (with doppler-ish: louder if close) ----------
function playShotAt(playerPos, fromVec){
  Audio.shot();
}

// ---------- INPUT ----------
const Input = {
  keys: Object.create(null),
  mouseDX: 0,
  mouseDY: 0,
  pointerLocked: false,
  touchLookDX: 0,
  touchLookDY: 0,
  moveFB: 0, // -1..1 forward/back
  moveLR: 0, // -1..1 left/right
  fire: false, // trigger state
  reload: false,
  interact: false, // current interact hold
  interactPressed: false,
  pointerFallback: false,
};
const touchState = {
  move: null, // {x,y,knobX,knobY}
  look: null, // {x,y,lx,ly}
};
const TAP = { isTouch:('ontouchstart' in window) || (navigator.maxTouchPoints > 0) };

// pointer lock / mouse look
function onMouseMove(e){
  if (Game.paused || Game.phase !== 'playing') return;
  if (Input.pointerLocked){
    Input.mouseDX += e.movementX || 0;
    Input.mouseDY += e.movementY || 0;
  }
}
function onPointerLockChange(){
  Input.pointerLocked = (document.pointerLockElement === canvas);
}
function requestPointerLock(){
  if (canvas.requestPointerLock){
    const p = canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.then){
      p.catch(()=>{ Input.pointerFallback = true; });
    }
  }
}

// touch
function setupTouch(){
  const stick = document.getElementById('touch-stick');
  const knob  = document.getElementById('touch-stick-knob');
  const look  = document.getElementById('touch-look');
  const fbtn  = document.getElementById('touch-fire');
  const ibtn  = document.getElementById('touch-interact');
  const rbtn  = document.getElementById('touch-reload');

  function setKnob(dx, dy){
    const r = 60;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > r || ay > r){
      const k = r / Math.max(ax, ay);
      dx *= k; dy *= k;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function stickStart(e){
    const t = e.touches[0]; if (!t) return;
    const r = stick.getBoundingClientRect();
    touchState.move = { cx: r.left + r.width/2, cy: r.top + r.height/2, x:t.clientX, y:t.clientY };
    e.preventDefault();
  }
  function stickMove(e){
    if (!touchState.move) return;
    const t = e.touches[0]; if (!t) return;
    const dx = t.clientX - touchState.move.cx;
    const dy = t.clientY - touchState.move.cy;
    setKnob(dx, dy);
    const r = 60;
    Input.moveFB = clamp(-dy / r, -1, 1); // up = forward
    Input.moveLR = clamp( dx / r, -1, 1);
    e.preventDefault();
  }
  function stickEnd(e){
    touchState.move = null;
    knob.style.transform = 'translate(0,0)';
    Input.moveFB = 0; Input.moveLR = 0;
    e.preventDefault();
  }

  function lookStart(e){
    const t = e.touches[0]; if (!t) return;
    touchState.look = { x:t.clientX, y:t.clientY, lx:t.clientX, ly:t.clientY };
    e.preventDefault();
  }
  function lookMove(e){
    if (!touchState.look) return;
    const t = e.touches[0]; if (!t) return;
    const dx = t.clientX - touchState.look.x;
    const dy = t.clientY - touchState.look.y;
    touchState.look.x = t.clientX;
    touchState.look.y = t.clientY;
    Input.touchLookDX += dx * 2.0;
    Input.touchLookDY += dy * 2.0;
    e.preventDefault();
  }
  function lookEnd(e){
    touchState.look = null;
    e.preventDefault();
  }

  stick.addEventListener('touchstart', stickStart, { passive:false });
  stick.addEventListener('touchmove',  stickMove,  { passive:false });
  stick.addEventListener('touchend',   stickEnd,  { passive:false });
  stick.addEventListener('touchcancel',stickEnd,  { passive:false });
  look.addEventListener('touchstart', lookStart, { passive:false });
  look.addEventListener('touchmove',  lookMove,  { passive:false });
  look.addEventListener('touchend',   lookEnd,   { passive:false });
  look.addEventListener('touchcancel',lookEnd,   { passive:false });

  // also allow right-side look region to receive a second touch if stick is up
  // (already using the look div)

  // fire / interact / reload buttons
  function btnDown(name, ev){
    if (name === 'fire')     { Input.fire = true;  Audio.resume(); }
    if (name === 'reload')   { Input.reload = true; Audio.resume(); }
    if (name === 'interact') { Input.interact = true; Input.interactPressed = true; Audio.resume(); }
    if (ev && ev.preventDefault) ev.preventDefault();
  }
  function btnUp(name, ev){
    if (name === 'interact') Input.interact = false;
    if (ev && ev.preventDefault) ev.preventDefault();
  }
  function bindPointerButton(button, name){
    button.addEventListener('pointerdown', e=>btnDown(name,e));
    button.addEventListener('pointerup', e=>btnUp(name,e));
    button.addEventListener('pointercancel', e=>btnUp(name,e));
  }
  bindPointerButton(fbtn, 'fire');
  bindPointerButton(rbtn, 'reload');
  bindPointerButton(ibtn, 'interact');
}

document.addEventListener('mousemove', onMouseMove);
document.addEventListener('pointerlockchange', onPointerLockChange);

canvas.addEventListener('click', () => {
  Audio.resume();
  if (Game.phase === 'playing' && !Game.paused && !TAP.isTouch) {
    if (!Input.pointerLocked) requestPointerLock();
  }
});
canvas.addEventListener('mousedown', e => {
  Audio.resume();
  if (e.button === 0 && Game.phase === 'playing' && !Game.paused) {
    Input.fire = true;
  }
});
window.addEventListener('blur', () => {
  Input.moveFB = 0; Input.moveLR = 0;
  Input.fire = false; Input.reload = false; Input.interact = false;
});

window.addEventListener('keydown', e => {
  Audio.resume();
  const k = e.key.toLowerCase();
  Input.keys[k] = true;
  if (k === 'escape' && Game.phase === 'playing'){
    if (!Game.paused) Game.pause();
    else Game.resume();
  }
  if (k === 'r' && Game.phase === 'playing' && !Game.paused){
    Input.reload = true;
  }
  if (k === 'e' && Game.phase === 'playing' && !Game.paused){
    Input.interact = true; Input.interactPressed = true;
  }
  if (k === 'p' && Game.phase === 'playing' && !Game.paused){
    Game.pause();
  }
  if (k === 'm'){
    Game.toggleMute();
  }
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  Input.keys[k] = false;
  if (k === 'r') Input.reload = false;
  if (k === 'e') Input.interact = false;
});
window.addEventListener('contextmenu', e => e.preventDefault());

// ===================================================
//  Game state machine
// ===================================================
const Game = {
  phase: 'menu',    // menu | playing | won | lost
  paused: false,
  timeLeft: CFG.objective.time,
  manualClock: false,
  stepAccum: 0,
  stats: {
    shots: 0, hits: 0, kills: 0,
    startedAt: 0, finishedAt: 0, won: null,
  },
  best: loadBest(),
  muted: false,

  start(force){
    if (!force && Game.phase === 'playing') return;
    Game.phase = 'playing';
    Game.paused = false;
    Game.timeLeft = CFG.objective.time;
    Game.stats = { shots:0, hits:0, kills:0, startedAt: performance.now(), finishedAt:0, won:null };
    Player.pos.set(0, CFG.player.eye, 18);
    Player.yaw = 0; Player.pitch = 0;
    Player.hp = 100; Player.alive = true;
    Player.mag = CFG.weapon.mag; Player.reserve = CFG.weapon.reserveStart;
    Player.reloading = false; Player.fireCd = 0; Player.recoil = 0; Player.lastFireAt = 0;
    Player.bombHold = 0; Player.reloadElapsed = 0;
    Input.moveFB = 0; Input.moveLR = 0;
    Input.fire = false; Input.reload = false; Input.interact = false;
    Input.mouseDX = 0; Input.mouseDY = 0;
    Input.touchLookDX = 0; Input.touchLookDY = 0;
    Enemies.list.forEach(e => scene.remove(e.obj));
    Enemies.list.length = 0;
    resetEnemies();
    // clear leftover tracers/sparks
    Bullets.tracers.forEach(t => { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
    Bullets.tracers.length = 0;
    Bullets.hits.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    Bullets.hits.length = 0;
    muzzleFX.children[0].intensity = 0;
    muzzleFX.children[1].material.opacity = 0;
    muzzleFX.flashTime = 0;
    Audio.startAlarm();
    updateHud();
    setLayer('hud', true);
    setLayer('menu', false);
    $introArrow.classList.add('on');
    // attach touch if needed
    if (TAP.isTouch || window.innerWidth < 900){
      $touch.classList.add('on');
      setLayer('touch', true);
    } else {
      $touch.classList.remove('on');
      setLayer('touch', false);
    }
    hideOverlay();
    updateCamera();
  },

  restart(){
    Game.start(true);
  },

  pause(){
    if (Game.phase !== 'playing' || Game.paused) return;
    Game.paused = true;
    if (Input.pointerLocked) document.exitPointerLock?.();
    showPause();
  },

  resume(){
    if (!Game.paused) return;
    Game.paused = false;
    hideOverlay();
  },

  toggleMute(){
    Game.muted = !Game.muted;
    Audio.setMuted(Game.muted);
    updateMuteBtn();
  },

  setManualClock(enabled){
    Game.manualClock = !!enabled;
  },

  step(ms){
    if (Game.phase !== 'playing') return;
    if (Game.paused) return;
    const totalMs = Math.max(0, ms | 0);
    if (totalMs === 0) return;
    // sub-step so callers can advance any duration while keeping
    // physics/AI/reload consistent (each chunk <= 50ms).
    const CHUNK_MS = 50;
    let remaining = totalMs;
    let safety = 0;
    while (remaining > 0 && safety++ < 4096){
      const chunk = Math.min(CHUNK_MS, remaining);
      advance(chunk / 1000);
      remaining -= chunk;
    }
  },
};

function updateMuteBtn(){
  document.querySelectorAll('.circ-btn.muted, .circ-btn:not(.muted)').forEach(()=>{});
  const btns = document.querySelectorAll('#btn-mute-menu, .circ-btn');
  btns.forEach(b => {
    if (b.id === 'btn-mute-menu'){
      b.textContent = Game.muted ? '🔇 已静音' : '🔊 声音';
    } else if (b.id === 'btn-pause' || b.title === '暂停'){
      b.classList.toggle('muted', Game.muted);
    }
  });
}

function loadBest(){
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    return v || null;
  } catch(e){ return null; }
}
function saveBest(b){
  try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch(e){}
}
function updateBestLine(){
  const b = Game.best;
  if (!b){
    $bestLine.textContent = '最佳战绩：未记录';
    return;
  }
  const wt = b.won ? `${b.clear.toFixed(1)}s 胜利` : '尚未通关';
  $bestLine.textContent = `最佳战绩：${wt} · 命中 ${b.hits}/${b.shots} · 共 ${b.kills} 杀敌`;
}

// ===================================================
//  Tests
// ===================================================

const Test = (function(){
  const API = {
    snapshot(){
      return {
        phase: Game.phase,
        paused: Game.paused,
        timeLeft: round(Game.timeLeft, 3),
        player: {
          x: round(Player.pos.x, 4), y: round(Player.pos.y, 4), z: round(Player.pos.z, 4),
          yaw: round(Player.yaw, 4), pitch: round(Player.pitch, 4),
          hp: Player.hp, ammo: Player.mag, reserve: Player.reserve,
          reloading: Player.reloading,
        },
        enemies: Enemies.list.map(e => ({
          id: e.id,
          x: round(e.pos.x, 4), y: round(e.obj.position.y, 4), z: round(e.pos.z, 4),
          hp: e.hp, state: e.state, alive: e.alive,
        })),
        objective: {
          state: Game.phase === 'won' ? 'defused' : (allEnemiesDead() ? 'available' : 'locked'),
          progress: round(Player.bombHold / CFG.objective.hold, 4),
          x: round(objective.world.x, 4), y: round(objective.world.y, 4), z: round(objective.world.z, 4),
        },
        stats: Object.assign({}, Game.stats, {
          startedAt: Game.stats.startedAt,
          finishedAt: Game.stats.finishedAt,
          won: Game.stats.won,
        }),
        renderer: {
          isWebGL: !!renderer.getContext(),
          width: renderer.domElement.width,
          height: renderer.domElement.height,
          threeRevision: THREE.REVISION,
        },
      };
    },
    start(){ Game.start(); },
    restart(){ Game.restart(); },
    pause(){ Game.pause(); },
    resume(){ Game.resume(); },
    setManualClock(enabled){ Game.setManualClock(enabled); },
    step(ms){ Game.step(ms); },
    setPlayerPose(p){
      ensurePlaying();
      if (typeof p.x === 'number') Player.pos.x = p.x;
      if (typeof p.y === 'number') Player.pos.y = p.y;
      if (typeof p.z === 'number') Player.pos.z = p.z;
      if (typeof p.yaw === 'number') Player.yaw = p.yaw;
      if (typeof p.pitch === 'number') Player.pitch = clamp(p.pitch, -85, 85);
      // clamp inside bounds
      resolveCollision(Player.pos, Player.radius, 0);
      Player.pos.y = Math.max(CFG.player.eye, Player.pos.y);
      updateCamera();
    },
    move(forward, right, ms){
      ensurePlaying();
      const dt = Math.max(0.001, Math.min(0.5, (ms|0) / 1000));
      const fwd = playerForward(Player.yaw, 0);
      const rgt = playerRight(Player.yaw);
      const dx = fwd.x * forward + rgt.x * right;
      const dz = fwd.z * forward + rgt.z * right;
      const len = Math.hypot(dx, dz) || 1;
      const step = Player.speed * dt;
      tryMove(dx / len * step, dz / len * step);
      updateCamera();
    },
    aimAtEnemy(id){
      const e = Enemies.list.find(e => e.id === id);
      if (!e) return false;
      const dx = e.pos.x - Player.pos.x;
      const dz = e.pos.z - Player.pos.z;
      const yaw = Math.atan2(-dx, -dz) / DEG;
      Player.yaw = ((yaw + 180) % 360 + 360) % 360; // conventions: yaw 0 = -Z, 180 = +Z? we define yaw=180 means facing -Z (north); we'll compute
      // Recompute using our direct approach: forward.x=-sin(yaw)*cos(pitch), forward.z=-cos(yaw)*cos(pitch)
      // Want forward ≈ (dx, 0, dz)/|.|. So sin(yaw)=-dx/n, cos(yaw)=-dz/n.
      const n = Math.hypot(dx, dz) || 1;
      const sinY = -dx / n, cosY = -dz / n;
      Player.yaw = Math.atan2(sinY, cosY) / DEG;
      Player.pitch = 0;
      updateCamera();
      return true;
    },
    shoot(){
      ensurePlaying();
      tryShoot(true);
    },
    reload(){
      ensurePlaying();
      tryReload(true);
    },
    damagePlayer(amount){
      ensurePlaying();
      damagePlayer(Math.max(1, amount|0), null);
    },
    eliminateEnemy(id){
      ensurePlaying();
      const e = Enemies.list.find(e => e.id === id);
      if (!e) return false;
      // Skip alive check to make test deterministic; if already dead, return true.
      if (!e.alive) return true;
      e.hp = 0; e.alive = false; e.state = 'dead'; e.dead = true;
      // ragdoll: tilt and lower
      e.obj.rotation.z = Math.PI / 2.5;
      e.obj.position.y = 0.2;
      e.pos.y = 0.2;
      Game.stats.kills++;
      checkAllEnemiesDead();
      Audio.hit();
      return true;
    },
    interact(ms){
      ensurePlaying();
      const totalMs = Math.max(0, ms | 0);
      if (totalMs === 0) return;
      const CHUNK_MS = 50;
      let remaining = totalMs;
      let safety = 0;
      while (remaining > 0 && safety++ < 4096){
        const chunk = Math.min(CHUNK_MS, remaining);
        tryHold(chunk / 1000);
        remaining -= chunk;
        if (Game.phase !== 'playing') break;
      }
    },
    _internals: { Game, Player, Enemies, objective, CFG },
  };
  function ensurePlaying(){
    if (Game.phase === 'menu'){
      // auto-start only when still at menu so chained test calls become deterministic.
      Game.start();
    }
  }
  return API;
})();
window.__BREACH_TEST__ = Test;

function round(v, n){
  const k = Math.pow(10, n);
  return Math.round(v * k) / k;
}

// ===================================================
//  Movement & collision
// ===================================================
function pointInsideBoxes(p){
  for (const b of COLLISION){
    if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1) return b;
  }
  for (const b of SOFT_BLOCK){
    if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1) return b;
  }
  return null;
}
function resolveCollision(p, r){
  // Up to a few passes to handle cascading pushes (one push may
  // resolve overlap with one box but cause overlap with another).
  for (let pass = 0; pass < 4; pass++){
    let moved = false;
    for (const b of COLLISION){
      // AABB overlap with player circle (treated as an AABB of size 2r).
      if (p.x + r <= b.x0 || p.x - r >= b.x1 || p.z + r <= b.z0 || p.z - r >= b.z1) continue;
      // Penetration depth on each side. Sign indicates push direction
      // (negative = -X / -Z, positive = +X / +Z). Magnitude is overlap.
      const penL = b.x0 - (p.x + r); // <0, push -X
      const penR = b.x1 - (p.x - r); // >0, push +X
      const penF = b.z0 - (p.z + r); // <0, push -Z (north)
      const penB = b.z1 - (p.z - r); // >0, push +Z (south)
      // Pick the minimum penetration and apply to its own axis.
      const cands = [
        { axis:'x', v: penL },
        { axis:'x', v: penR },
        { axis:'z', v: penF },
        { axis:'z', v: penB },
      ];
      let best = cands[0];
      for (let i = 1; i < cands.length; i++){
        if (Math.abs(cands[i].v) < Math.abs(best.v)) best = cands[i];
      }
      if (best.axis === 'x') p.x += best.v;
      else p.z += best.v;
      moved = true;
    }
    if (!moved) break;
  }
}
function tryMove(dx, dz){
  const p = Player.pos;
  p.x += dx;
  resolveCollision(p, Player.radius, 0);
  p.z += dz;
  resolveCollision(p, Player.radius, 0);
}

// line-of-sight ray vs AABB boxes
function rayBlocked(fromV, toV, maxDist){
  const dx = toV.x - fromV.x;
  const dy = toV.y - fromV.y;
  const dz = toV.z - fromV.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist === 0) return null;
  const ux = dx / dist, uy = dy / dist, uz = dz / dist;
  let minT = Math.min(maxDist ?? dist, dist);
  for (const b of COLLISION){
    if (b.kind === 'fence') continue; // fences don't block sight
    if (b.kind === 'warehouse' && fromV.y < 1.0 && toV.y < 1.0) continue; // low shots can pass under door header? we'll do simpler check via ray against the box but skip when both endpoints below header
    const t = rayAABB(fromV, ux, uy, uz, b);
    if (t !== null && t < minT && t > 0.001) minT = t;
  }
  for (const b of SOFT_BLOCK){
    const t = rayAABB(fromV, ux, uy, uz, b);
    if (t !== null && t < minT && t > 0.001) minT = t;
  }
  return minT;
}
function rayAABB(o, ux, uy, uz, b){
  const x0 = b.x0, x1 = b.x1, y0 = 0, y1 = b.h;
  const z0 = b.z0, z1 = b.z1;
  let tmin = -Infinity, tmax = Infinity;
  function slab(oC, uC, lo, hi){
    if (Math.abs(uC) < 1e-8){
      if (oC < lo || oC > hi) return null;
      return [-Infinity, Infinity];
    }
    let t1 = (lo - oC) / uC;
    let t2 = (hi - oC) / uC;
    if (t1 > t2) [t1, t2] = [t2, t1];
    return [t1, t2];
  }
  const x = slab(o.x, ux, x0, x1);
  if (!x) return null;
  tmin = Math.max(tmin, x[0]); tmax = Math.min(tmax, x[1]);
  const y = slab(o.y, uy, y0, y1);
  if (!y) return null;
  tmin = Math.max(tmin, y[0]); tmax = Math.min(tmax, y[1]);
  const z = slab(o.z, uz, z0, z1);
  if (!z) return null;
  tmin = Math.max(tmin, z[0]); tmax = Math.min(tmax, z[1]);
  if (tmax < tmin || tmax < 0) return null;
  if (tmin < 0) return 0.0001;
  return tmin;
}

// ===================================================
//  Combat
// ===================================================
function tryShoot(fromTest){
  if (Game.phase !== 'playing' || Game.paused || !Player.alive) return;
  if (Player.reloading) return;
  if (Player.mag <= 0){
    Audio.empty();
    return;
  }
  const now = performance.now() / 1000;
  if (now - Player.lastFireAt < CFG.weapon.fireDt) return;
  Player.lastFireAt = now;
  Player.mag -= 1;
  Player.recoil = Math.min(1.2, Player.recoil + 0.6);
  try { flashMuzzle(); } catch(e){ if (!fromTest) console.warn('flashMuzzle:', e); }
  Audio.shot();
  Game.stats.shots += 1;
  // raycast from camera center
  try {
    const fwd = playerForward(Player.yaw, Player.pitch);
    const fromV = new THREE.Vector3(Player.pos.x, Player.pos.y, Player.pos.z);
    const reach = CFG.weapon.range;
    const toV = fromV.clone().add(fwd.clone().multiplyScalar(reach));
    const hitDist = rayBlocked(fromV, toV, reach);
    // gather enemy distances to choose first along ray
    let best = null;
    for (const e of Enemies.list){
      if (!e.alive) continue;
      const ec = new THREE.Vector3(e.pos.x, 1.05, e.pos.z);
      const dx = ec.x - fromV.x;
      const dy = ec.y - fromV.y;
      const dz = ec.z - fromV.z;
      const along = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (along < 0.2) continue;
      const px = fromV.x + fwd.x * along;
      const py = fromV.y + fwd.y * along;
      const pz = fromV.z + fwd.z * along;
      const ox = px - ec.x, oz = pz - ec.z, oy = py - ec.y;
      const rad = 0.7;
      if (ox*ox + oy*oy + oz*oz < rad*rad){
        if (!best || along < best.along){
          best = { e, along };
        }
      }
    }
    let hitEnemy = null;
    if (best){
      if (hitDist == null || best.along <= hitDist + 0.01){
        hitEnemy = best.e;
      }
    }
    if (hitEnemy){
      hitEnemy.hp -= CFG.weapon.damage;
      Game.stats.hits += 1;
      hitEnemy.state = 'hit';
      hitEnemy.stateT = 0.0;
      hitEnemy.recentDamageFlash = 0.25;
      Audio.hit();
      const sparkPos = new THREE.Vector3(hitEnemy.pos.x, 1.05, hitEnemy.pos.z);
      sparkPos.x += fwd.x * 0.6;
      sparkPos.z += fwd.z * 0.6;
      spawnHitSpark(sparkPos);
      showHitMarker();
      if (hitEnemy.hp <= 0){
        killEnemy(hitEnemy);
      }
    } else if (hitDist != null){
      const hitPos = fromV.clone().add(fwd.clone().multiplyScalar(hitDist));
      spawnHitSpark(hitPos);
      Audio.hit();
    }
  } catch(err){
    if (!fromTest) console.warn('shoot raycast error:', err);
  }
}

function showHitMarker(){
  $hitMarker.classList.remove('show');
  void $hitMarker.offsetWidth;
  $hitMarker.classList.add('show');
}

function killEnemy(e){
  if (!e.alive) return;
  e.alive = false; e.state = 'dead'; e.dead = true;
  Game.stats.kills += 1;
  // tilt + sink
  e.obj.rotation.z = Math.PI / 2.5;
  e.obj.position.y = 0.2;
  e.pos.y = 0.2;
  const c = e.obj._refs;
  if (c.torsoMat) c.torsoMat.color.set(0x3a1212);
  checkAllEnemiesDead();
}

function tryReload(fromTest){
  if (Player.reloading) return;
  if (Player.mag >= CFG.weapon.mag) return;
  if (Player.reserve <= 0) return;
  Player.reloading = true;
  Player.reloadStart = performance.now() / 1000;
  Player.reloadElapsed = 0;
  $reloadTag.classList.add('on');
  Audio.reload();
}

function finishReload(){
  const need = CFG.weapon.mag - Player.mag;
  const take = Math.min(need, Player.reserve);
  Player.mag += take;
  Player.reserve -= take;
  Player.reloading = false;
  $reloadTag.classList.remove('on');
}

function damagePlayer(amount, _src){
  if (!Player.alive) return;
  Player.hp -= amount;
  Audio.damage();
  $damageFlash.classList.remove('show');
  void $damageFlash.offsetWidth;
  $damageFlash.classList.add('show');
  if (Player.hp <= 0){
    Player.hp = 0; Player.alive = false;
    Game.lose('player_down');
  }
}

function allEnemiesDead(){
  if (Enemies.list.length === 0) return false;
  return Enemies.list.every(e => !e.alive);
}
function checkAllEnemiesDead(){
  if (Game.phase !== 'playing') return;
  if (allEnemiesDead()){
    Audio.stopAlarm();
    $objective.classList.add('cleared');
    $objectiveTag.textContent = '区域已清空 · 前往核心装置完成拆弹';
    $objectiveText.textContent = '靠近核心装置并长按 E';
  }
}

// ===================================================
//  Enemy AI
// ===================================================
function enemyEyes(e){
  return new THREE.Vector3(e.pos.x, 1.4, e.pos.z);
}
function canEnemySeePlayer(e){
  const eye = enemyEyes(e);
  const tgt = new THREE.Vector3(Player.pos.x, Player.pos.y, Player.pos.z);
  const dx = tgt.x - eye.x;
  const dz = tgt.z - eye.z;
  const dist = Math.hypot(dx, dz);
  if (dist > CFG.enemy.sight) return false;
  // angle check
  const angTo = Math.atan2(-dx, -dz);
  let ea = e.facing * DEG;
  let d = ((angTo - ea + Math.PI*3) % (Math.PI*2)) - Math.PI;
  if (Math.abs(d) > (CFG.enemy.sightAngle * DEG / 2)) return false;
  // line of sight
  const blocked = rayBlocked(eye, tgt, dist);
  return blocked === null || blocked >= dist - 0.1;
}
function enemyKnowsPlayer(e){
  if (canEnemySeePlayer(e)) return true;
  // gunfire sound radius
  if (Game.stats.shots > e._lastSeenShots){
    e._lastSeenShots = Game.stats.shots;
    const d = Math.hypot(Player.pos.x - e.pos.x, Player.pos.z - e.pos.z);
    if (d < CFG.enemy.hearGunfire) return true;
  }
  return false;
}
function nearestEnemyToPlayer(){
  let best = null, bd = Infinity;
  for (const e of Enemies.list){
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - Player.pos.x, e.pos.z - Player.pos.z);
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}
function updateEnemy(e, dt){
  if (!e.alive){ e.state = 'dead'; return; }
  e.stateT += dt;
  e.fireCd -= dt;
  if (e.recentDamageFlash > 0) e.recentDamageFlash -= dt;
  // ensure e._lastSeenShots
  if (e._lastSeenShots == null) e._lastSeenShots = 0;

  const sees = canEnemySeePlayer(e);
  const heard = enemyKnowsPlayer(e);
  const dx = Player.pos.x - e.pos.x;
  const dz = Player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);

  // transitions
  if (e.state === 'hit'){
    if (e.stateT > 0.25){
      e.state = (sees || heard) ? (dist > 6 ? 'chase' : 'attack') : 'patrol';
      e.stateT = 0;
    }
  }
  if (sees){
    e.investigatePos = null;
    if (e.state !== 'attack' && e.state !== 'hit'){
      e.state = dist > 9 ? 'chase' : 'attack';
      e.stateT = 0;
    }
  } else if (heard){
    if (e.state === 'patrol'){
      e.state = 'alert';
      e.investigatePos = new THREE.Vector3(Player.pos.x, 0, Player.pos.z);
      e.investigateUntil = e.stateT + 4;
      e.stateT = 0;
    } else if (e.state === 'alert' && e.investigatePos){
      e.investigatePos.set(Player.pos.x, 0, Player.pos.z);
      e.investigateUntil = e.stateT + 4;
    }
  }

  // state execution
  if (e.state === 'patrol'){
    e.patrolT += dt;
    const speed = 1.4;
    const A = e.patrolA, B = e.patrolB;
    const target = e.patrolDir > 0 ? B : A;
    const tx = target.x - e.pos.x, tz = target.z - e.pos.z;
    const td = Math.hypot(tx, tz);
    if (td < 0.4){
      e.patrolDir *= -1; e.patrolT = 0;
    } else {
      // smooth turn
      const angTo = Math.atan2(-tx, -tz) / DEG;
      let d = ((angTo - e.facing + 540) % 360) - 180;
      e.facing += clamp(d, -90 * dt, 90 * dt);
      moveEnemyAxis(e, (tx/td) * speed * dt, 0);
    }
  } else if (e.state === 'alert'){
    if (!e.investigatePos){
      e.state = 'patrol'; e.stateT = 0;
    } else {
      const tx = e.investigatePos.x - e.pos.x;
      const tz = e.investigatePos.z - e.pos.z;
      const td = Math.hypot(tx, tz);
      const angTo = Math.atan2(-tx, -tz) / DEG;
      let d = ((angTo - e.facing + 540) % 360) - 180;
      e.facing += clamp(d, -120 * dt, 120 * dt);
      if (td > 0.5 && e.stateT < e.investigateUntil){
        moveEnemyAxis(e, (tx/td) * 2.4 * dt, 0);
      } else if (e.stateT > e.investigateUntil){
        e.state = 'patrol'; e.stateT = 0;
      }
    }
  } else if (e.state === 'chase'){
    // strafe toward player while keeping mid distance
    const ideal = 7.5;
    const desired = dist > ideal ? 1 : -1;
    const tx = dx, tz = dz;
    const td = dist || 1;
    const angTo = Math.atan2(-tx, -tz) / DEG;
    let d = ((angTo - e.facing + 540) % 360) - 180;
    e.facing += clamp(d, -160 * dt, 160 * dt);
    moveEnemyAxis(e, (tx/td) * 2.6 * desired * dt, 0);
    if (sees && dist < 9 && dist > 4){
      e.state = 'attack'; e.stateT = 0;
    }
  } else if (e.state === 'attack'){
    // face player and shoot periodically
    const angTo = Math.atan2(-dx, -dz) / DEG;
    let d = ((angTo - e.facing + 540) % 360) - 180;
    e.facing += clamp(d, -140 * dt, 140 * dt);
    // side-strafe a bit
    const side = (e.id % 2 === 0) ? 1 : -1;
    const rx = -dz / (dist || 1), rz = dx / (dist || 1);
    moveEnemyAxis(e, rx * 0.7 * side * dt, rz * 0.7 * side * dt);
    if (sees && e.fireCd <= 0 && e.stateT > e.reaction){
      enemyFire(e);
      e.fireCd = CFG.enemy.fireDt;
      e.stateT = 0;
    }
    if (!sees && dist > 10){
      e.state = 'chase'; e.stateT = 0;
    }
  }
  e.obj.rotation.y = e.facing * DEG;
  // bobbing for legs
  const bob = Math.sin(performance.now() * 0.008 + e.id) * 0.05;
  e.obj.position.y = e.pos.y + (e.alive ? 0 : 0);
  if (e.alive && (e.state === 'patrol' || e.state === 'chase' || e.state === 'alert')){
    e.obj._refs.lL.rotation.x = bob;
    e.obj._refs.lR.rotation.x = -bob;
    e.obj._refs.aL.rotation.x = -0.3 + bob*0.5;
    e.obj._refs.aR.rotation.x = -0.3 - bob*0.5;
  } else {
    e.obj._refs.lL.rotation.x = 0;
    e.obj._refs.lR.rotation.x = 0;
    e.obj._refs.aL.rotation.x = -0.05;
    e.obj._refs.aR.rotation.x = -0.05;
  }
}
function moveEnemyAxis(e, dx, dz){
  if (dx !== 0){
    e.pos.x += dx;
    resolveCollision(e.pos, 0.4, e.id);
  }
  if (dz !== 0){
    e.pos.z += dz;
    resolveCollision(e.pos, 0.4, e.id);
  }
  e.obj.position.set(e.pos.x, e.pos.y, e.pos.z);
}

function enemyFire(e){
  if (!Player.alive) return;
  // damage applies only on line of sight at fire moment
  const eye = enemyEyes(e).clone();
  const tgt = new THREE.Vector3(Player.pos.x, 1.55, Player.pos.z);
  const blocked = rayBlocked(eye, tgt, Math.hypot(tgt.x-eye.x, tgt.y-eye.y, tgt.z-eye.z));
  const reachToPlayer = Math.hypot(tgt.x-eye.x, tgt.z-eye.z);
  if (blocked !== null && blocked < reachToPlayer - 0.4) return;
  // muzzle flash
  const flashMat = e.obj._refs.flashMat;
  flashMat.opacity = 0.95;
  // schedule fade
  setTimeout(()=>{ if (flashMat) flashMat.opacity = 0; }, 90);
  // tracer
  spawnTracer(eye, tgt, 0xffb85e);
  // damage
  damagePlayer(CFG.enemy.dmg, e);
}

// ===================================================
//  Objective interaction
// ===================================================
function tryHold(dt){
  if (Game.phase !== 'playing' || Game.paused || !Player.alive) return;
  if (!allEnemiesDead()){
    if (Player.bombHold > 0){
      Player.bombHold = Math.max(0, Player.bombHold - dt * 0.6);
      $bombFill.style.width = (Player.bombHold / CFG.objective.hold * 100).toFixed(1) + '%';
    }
    return;
  }
  const obx = (objective.g && objective.g.position ? objective.g.position.x : objective.world.x);
  const obz = (objective.g && objective.g.position ? objective.g.position.z : objective.world.z);
  const distToBomb = Math.hypot(Player.pos.x - obx, Player.pos.z - obz);
  if (distToBomb > CFG.objective.dist){
    if (Player.bombHold > 0){
      Player.bombHold = Math.max(0, Player.bombHold - dt * 0.8);
      $bombFill.style.width = (Player.bombHold / CFG.objective.hold * 100).toFixed(1) + '%';
    }
    return;
  }
  // increment hold
  Player.bombHold = Math.min(CFG.objective.hold, Player.bombHold + dt);
  $bombFill.style.width = (Player.bombHold / CFG.objective.hold * 100).toFixed(1) + '%';
  if (Player.bombHold >= CFG.objective.hold){
    Game.win();
  }
}

// ===================================================
//  HUD update
// ===================================================
function setLayer(id, on){
  const el = document.getElementById(id);
  el.setAttribute('aria-hidden', on ? 'false' : 'true');
}
function updateHud(){
  $hpNum.textContent = Math.max(0, Math.round(Player.hp));
  $hpFill.style.width = Math.max(0, Player.hp) + '%';
  $ammoNum.textContent = Player.mag;
  $reserveNum.textContent = Player.reserve;
  $timeNum.textContent = Math.max(0, Math.ceil(Game.timeLeft));
  $enemyDead.textContent = Enemies.list.filter(e=>!e.alive).length;
  $enemyTotal.textContent = Enemies.list.length;
  $reloadTag.classList.toggle('on', !!Player.reloading);
}
function showOverlay(title, body, cls, actions){
  $overlay.setAttribute('aria-hidden','false');
  $overlayTitle.textContent = title;
  $overlayTitle.className = 'overlay-title' + (cls ? ' '+cls : '');
  $overlayBody.textContent = body || '';
  $overlayActions.innerHTML = '';
  (actions || []).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-ghost');
    b.textContent = a.text;
    b.addEventListener('click', a.onClick);
    $overlayActions.appendChild(b);
  });
}
function hideOverlay(){
  $overlay.setAttribute('aria-hidden','true');
  $overlayActions.innerHTML = '';
}
function showPause(){
  showOverlay('已暂停', '按 Esc / 开始 继续 · 端 UI 也可操作', '', [
    { text:'继续', onClick:()=>Game.resume(), primary:true },
    { text:'重新开始', onClick:()=>{ hideOverlay(); Game.restart(); } },
    { text:'返回菜单', onClick:()=>{ hideOverlay(); backToMenu(); } },
  ]);
}
function backToMenu(){
  Audio.stopAlarm();
  setLayer('hud', false);
  $touch.classList.remove('on');
  $bombProgress.classList.remove('on');
  $introArrow.classList.remove('on');
  Game.phase = 'menu'; Game.paused = false;
  setLayer('menu', true);
}
Game.lose = (reason) => {
  if (Game.phase !== 'playing') return;
  Game.phase = 'lost';
  Game.stats.finishedAt = performance.now();
  Game.stats.won = false;
  Audio.stopAlarm();
  Audio.lose();
  if (Input.pointerLocked) document.exitPointerLock?.();
  let bestText;
  if (Game.best){
    bestText = `历史最佳 ${Game.best.won ? Game.best.clear.toFixed(1)+'s' : (Game.best.kills+' 击杀')}（未通关）`;
  } else bestText = '本次为首次记录';
  Game.best = {
    won: false, shots: Game.stats.shots, hits: Game.stats.hits, kills: Game.stats.kills, clear: 0,
  };
  saveBest(Game.best);
  updateBestLine();
  showOverlay(
    '任务失败',
    `用时 ${Math.max(0, (CFG.objective.time - Game.timeLeft)).toFixed(1)}s · 击杀 ${Game.stats.kills}/${Enemies.list.length} · 命中率 ${pct(Game.stats.shots)}`,
    'lose',
    [
      { text:'重新开始', onClick:()=>{ hideOverlay(); Game.restart(); }, primary:true },
      { text:'返回菜单', onClick:()=>{ hideOverlay(); backToMenu(); } },
    ]
  );
  $introArrow.classList.remove('on');
};
Game.win = () => {
  if (Game.phase !== 'playing') return;
  Game.phase = 'won';
  Game.stats.finishedAt = performance.now();
  Game.stats.won = true;
  Audio.stopAlarm();
  Audio.win();
  if (Input.pointerLocked) document.exitPointerLock?.();
  const totalTime = CFG.objective.time - Game.timeLeft;
  const accuracy = pct(Game.stats.shots);
  const prevBest = Game.best && Game.best.won ? Game.best.clear : Infinity;
  const isBest = totalTime < prevBest;
  Game.best = {
    won:true, clear:totalTime, shots:Game.stats.shots, hits:Game.stats.hits, kills:Game.stats.kills,
  };
  saveBest(Game.best);
  updateBestLine();
  showOverlay(
    '拆弹成功',
    `用时 ${totalTime.toFixed(1)}s · 击杀 ${Game.stats.kills} · 命中 ${Game.stats.hits}/${Game.stats.shots}（${accuracy}）\n${isBest ? '★ 新最佳纪录' : ''}`,
    'win',
    [
      { text:'再来一局', onClick:()=>{ hideOverlay(); Game.restart(); }, primary:true },
      { text:'返回菜单', onClick:()=>{ hideOverlay(); backToMenu(); } },
    ]
  );
};
function pct(shots){
  if (!shots) return '0%';
  return Math.round(Game.stats.hits / shots * 100) + '%';
}

// ===================================================
//  Loop
// ===================================================
let lastTs = performance.now() / 1000;
function loop(tsMs){
  requestAnimationFrame(loop);
  const now = tsMs / 1000;
  const realDt = Math.min(0.05, now - lastTs);
  lastTs = now;

  // ALWAYS update visuals that should run in any phase
  updateObjectiveVis(now);
  weaponSway(realDt);

  // If menu, only render and exit
  if (Game.phase !== 'playing'){
    renderer.render(scene, camera);
    return;
  }
  if (Game.paused){
    updateHud();
    renderer.render(scene, camera);
    return;
  }
  if (!Game.manualClock){
    advance(realDt);
  } else {
    // still update bullets & muzzle FX & hit marker visual (they are tied to dt but small)
    updateVisualEffects(realDt);
    updateHud();
    renderer.render(scene, camera);
    return;
  }
  updateVisualEffects(realDt);
  updateHud();
  renderer.render(scene, camera);
}

function updateVisualEffects(dt){
  // muzzle + tracer + sparks
  updateMuzzleFX(dt);
  // tracers
  for (let i = Bullets.tracers.length - 1; i >= 0; i--){
    const t = Bullets.tracers[i];
    t.life -= dt;
    if (t.life <= 0){
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
      Bullets.tracers.splice(i, 1);
    } else {
      const f = t.life / t.maxLife;
      t.mesh.material.opacity = f;
    }
  }
  // hit sparks
  for (let i = Bullets.hits.length - 1; i >= 0; i--){
    const m = Bullets.hits[i];
    m.userData.life -= dt;
    if (m.userData.life <= 0){
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      Bullets.hits.splice(i, 1);
    } else {
      m.position.x += m.userData.v.x * dt;
      m.position.y += m.userData.v.y * dt;
      m.position.z += m.userData.v.z * dt;
      m.userData.v.y -= 6 * dt;
    }
  }
}

function advance(dt){
  if (Game.phase !== 'playing' || Game.paused) return;
  Game.stats && (Game.stats.shots !== undefined ? null : null);
  // input intent
  const inFB = (Input.keys['w']?1:0) - (Input.keys['s']?1:0) + Input.moveFB;
  const inLR = (Input.keys['d']?1:0) - (Input.keys['a']?1:0) + Input.moveLR;
  const moveFB = clamp(inFB, -1, 1);
  const moveLR = clamp(inLR, -1, 1);

  // mouse look
  if (Input.pointerLocked){
    Player.yaw   -= Input.mouseDX * 0.18;
    Player.pitch -= Input.mouseDY * 0.18;
    Input.mouseDX = 0; Input.mouseDY = 0;
  } else if (TAP.isTouch || Input.pointerFallback){
    Player.yaw   -= Input.touchLookDX * 0.25;
    Player.pitch -= Input.touchLookDY * 0.25;
    Input.touchLookDX = 0; Input.touchLookDY = 0;
  } else {
    // pointer not locked & no touch — small decay
    Input.mouseDX *= 0.7; Input.mouseDY *= 0.7;
    if (Math.abs(Input.mouseDX) < 0.01) Input.mouseDX = 0;
    if (Math.abs(Input.mouseDY) < 0.01) Input.mouseDY = 0;
    Player.yaw   -= Input.mouseDX * 0.18;
    Player.pitch -= Input.mouseDY * 0.18;
  }
  Player.pitch = clamp(Player.pitch, -82, 82);

  // movement
  const fwd = playerForward(Player.yaw, 0);
  const rgt = playerRight(Player.yaw);
  const dx = fwd.x * moveFB + rgt.x * moveLR;
  const dz = fwd.z * moveFB + rgt.z * moveLR;
  const len = Math.hypot(dx, dz);
  if (len > 0){
    const sp = Player.speed * dt;
    tryMove(dx / len * sp, dz / len * sp);
  }
  // footstep
  if (Player.alive && (Math.abs(moveFB) > 0.1 || Math.abs(moveLR) > 0.1)){
    Player._stepT = (Player._stepT || 0) + dt;
    if (Player._stepT > 0.45){
      Player._stepT = 0;
      if (!Audio.isMuted()) Audio.step();
    }
  }
  Player.pos.y = CFG.player.eye;

  // recoil decay
  Player.recoil = Math.max(0, Player.recoil - dt * 4.5);
  // reload finish
  if (Player.reloading){
    Player.reloadElapsed += dt;
    if (Player.reloadElapsed >= Player.reloadDur) finishReload();
  }
  if (Player.fireCd > 0) Player.fireCd -= dt;

  // shooting — desktop mousedown OR touch fire
  if (Input.fire || (Input.keys[' '] && Game.phase === 'playing')){
    tryShoot(false);
    Input.fire = false;
  }
  if (Input.reload){
    tryReload(false);
    Input.reload = false;
  }
  if (Input.interact){
    tryHold(dt);
  } else if (Player.bombHold > 0){
    Player.bombHold = Math.max(0, Player.bombHold - dt * 0.8);
    $bombFill.style.width = (Player.bombHold / CFG.objective.hold * 100).toFixed(1) + '%';
  }
  Input.interactPressed = false;

  // enemies
  for (const e of Enemies.list) updateEnemy(e, dt);

  // timer
  Game.timeLeft -= dt;
  if (Game.timeLeft <= 0){
    Game.timeLeft = 0;
    if (Game.phase === 'playing') Game.lose('timeout');
  }

  // bomb progress visibility
  const showBomb = Game.phase === 'playing' && allEnemiesDead() && !Game.paused;
  $bombProgress.classList.toggle('on', showBomb);
  if (showBomb){
    const distToBomb = Math.hypot(Player.pos.x - objective.world.x, Player.pos.z - objective.world.z);
    if (distToBomb > CFG.objective.dist){
      $bombHint.textContent = '靠近核心装置 (当前 ' + distToBomb.toFixed(1) + 'm / ' + CFG.objective.dist.toFixed(1) + 'm)';
    } else {
      $bombHint.textContent = '长按 E 或触屏拆弹按钮';
    }
  } else {
    $bombProgress.classList.remove('on');
  }

  // intro arrow fade
  if (Game.stats.shots > 0 || (performance.now()/1000 - Game.stats.startedAt/1000) > 3.5){
    $introArrow.classList.remove('on');
  } else {
    // place arrow between camera and door direction
    $introArrow.classList.add('on');
  }
  updateCamera();
}

function updateCamera(){
  // apply yaw/pitch to camera with recoil
  camera.rotation.order = 'YXZ';
  camera.rotation.y = Player.yaw * DEG;
  camera.rotation.x = (Player.pitch - Player.recoil * 0.4) * DEG;
  camera.position.set(Player.pos.x, Player.pos.y, Player.pos.z);
}

function weaponSway(dt){
  weaponModel.position.y = -0.28 + Math.sin(performance.now() * 0.005) * 0.012 - Player.recoil * 0.05;
  weaponModel.rotation.x = -Player.recoil * 0.08;
}

// ===================================================
//  Boot
// ===================================================
function startBtn(){
  Audio.resume();
  setLayer('menu', false);
  $menu.setAttribute('aria-hidden','true');
  Game.start();
  // request pointer lock on click in game
  if (!TAP.isTouch){
    requestPointerLock();
  }
}
document.getElementById('btn-start').addEventListener('click', startBtn);
document.getElementById('btn-mute-menu').addEventListener('click', () => { Game.toggleMute(); });
document.getElementById('btn-pause').addEventListener('click', () => {
  if (Game.phase !== 'playing') return;
  if (Game.paused) Game.resume(); else Game.pause();
});

if (TAP.isTouch) setupTouch();
window.addEventListener('resize', () => {
  if (window.innerWidth < 900) $touch.classList.add('on');
  else $touch.classList.remove('on');
});

updateBestLine();
updateMuteBtn();
resetEnemies(); // populates enemies but doesn't start the timer
setResize();
// initial render
renderer.render(scene, camera);
requestAnimationFrame(loop);

// expose a tiny global for debugging that doesn't affect tests
window.__BREACH__ = { Game, Player, Enemies, objective, CFG };

})();

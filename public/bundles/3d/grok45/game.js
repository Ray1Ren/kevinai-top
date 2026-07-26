/**
 * Breach Point / 破门点
 * Original low-poly harbor warehouse defusal training FPS
 * Three.js r147 (vendor), no external assets
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const MAG_SIZE = 12;
  const RESERVE_START = 36;
  const FIRE_COOLDOWN = 0.14;
  const RELOAD_TIME = 1.35;
  const PLAYER_SPEED = 6.2;
  const PLAYER_RADIUS = 0.38;
  const PLAYER_EYE = 1.62;
  const PLAYER_MAX_HP = 100;
  const MISSION_TIME = 75;
  const DEFUSE_TIME = 1.5;
  const DEFUSE_RANGE = 2.4;
  const ENEMY_HP = 45;
  const ENEMY_DAMAGE = 9;
  const ENEMY_FIRE_CD = 0.85;
  const ENEMY_SIGHT = 22;
  const ENEMY_ATTACK_RANGE = 16;
  const ENEMY_SPEED = 3.1;
  const MOUSE_SENS = 0.0022;
  const TOUCH_LOOK_SENS = 0.0034;
  const BEST_KEY = 'breach_point_best_time';
  const MAP_MIN = -28;
  const MAP_MAX = 28;

  const PHASE = {
    MENU: 'menu',
    PLAYING: 'playing',
    CLEARED: 'cleared',
    DEFUSING: 'defusing',
    WIN: 'win',
    LOSE: 'lose',
  };

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('game-canvas');
  const el = {
    startScreen: document.getElementById('start-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    resultScreen: document.getElementById('result-screen'),
    hud: document.getElementById('hud'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnMute: document.getElementById('btn-mute'),
    btnRestartHud: document.getElementById('btn-restart-hud'),
    btnResume: document.getElementById('btn-resume'),
    btnRestartPause: document.getElementById('btn-restart-pause'),
    btnReplay: document.getElementById('btn-replay'),
    bestLine: document.getElementById('best-line'),
    hpBar: document.getElementById('hp-bar'),
    hpText: document.getElementById('hp-text'),
    timerText: document.getElementById('timer-text'),
    enemyCount: document.getElementById('enemy-count'),
    objectiveText: document.getElementById('objective-text'),
    hintText: document.getElementById('hint-text'),
    ammoText: document.getElementById('ammo-text'),
    reserveText: document.getElementById('reserve-text'),
    defuseWrap: document.getElementById('defuse-bar-wrap'),
    defuseBar: document.getElementById('defuse-bar'),
    damageVignette: document.getElementById('damage-vignette'),
    hitMarker: document.getElementById('hit-marker'),
    dirIndicator: document.getElementById('dir-indicator'),
    crosshair: document.getElementById('crosshair'),
    resultTitle: document.getElementById('result-title'),
    resultSub: document.getElementById('result-sub'),
    statsList: document.getElementById('stats-list'),
    touchControls: document.getElementById('touch-controls'),
    moveZone: document.getElementById('move-zone'),
    moveStick: document.getElementById('move-stick'),
    lookZone: document.getElementById('look-zone'),
    btnFireTouch: document.getElementById('btn-fire-touch'),
    btnReloadTouch: document.getElementById('btn-reload-touch'),
    btnInteractTouch: document.getElementById('btn-interact-touch'),
  };

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, az, bx, bz) => {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  };
  const deg = (r) => (r * 180) / Math.PI;
  const nowMs = () => performance.now();

  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Audio (procedural Web Audio)
  // ---------------------------------------------------------------------------
  const AudioSys = {
    ctx: null,
    muted: false,
    master: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    },
    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.32;
    },
    tone(freq, dur, type, vol, slide) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
      g.gain.setValueAtTime(vol || 0.15, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    },
    noise(dur, vol, filterFreq) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq || 1800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    },
    shoot() {
      this.noise(0.08, 0.28, 2400);
      this.tone(180, 0.07, 'sawtooth', 0.12, 60);
    },
    empty() {
      this.tone(90, 0.05, 'square', 0.08);
      this.tone(60, 0.06, 'square', 0.05);
    },
    reload() {
      this.tone(220, 0.08, 'triangle', 0.08);
      setTimeout(() => this.tone(160, 0.1, 'triangle', 0.07), 180);
      setTimeout(() => this.tone(280, 0.06, 'square', 0.06), 500);
    },
    hit() {
      this.tone(640, 0.05, 'square', 0.08, 200);
      this.noise(0.04, 0.1, 3000);
    },
    hurt() {
      this.tone(120, 0.15, 'sawtooth', 0.14, 40);
      this.noise(0.12, 0.12, 600);
    },
    enemyShoot() {
      this.noise(0.06, 0.14, 1600);
      this.tone(140, 0.05, 'square', 0.07, 50);
    },
    alert() {
      this.tone(520, 0.12, 'square', 0.09);
      setTimeout(() => this.tone(680, 0.12, 'square', 0.08), 100);
    },
    win() {
      this.tone(440, 0.12, 'triangle', 0.12);
      setTimeout(() => this.tone(554, 0.12, 'triangle', 0.12), 120);
      setTimeout(() => this.tone(659, 0.22, 'triangle', 0.14), 240);
    },
    lose() {
      this.tone(200, 0.2, 'sawtooth', 0.12, 80);
      setTimeout(() => this.tone(120, 0.35, 'sawtooth', 0.1, 40), 180);
    },
    defuseTick() {
      this.tone(880, 0.03, 'sine', 0.05);
    },
  };

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  const state = {
    phase: PHASE.MENU,
    paused: false,
    timeLeft: MISSION_TIME,
    elapsed: 0,
    muted: false,
    manualClock: false,
    pointerLocked: false,
    dragLook: false,
    lastDragX: 0,
    lastDragY: 0,
    fireHeld: false,
    interactHeld: false,
    keys: Object.create(null),
    moveAxis: { x: 0, y: 0 },
    touchLookActive: false,
    lastTouchLookX: 0,
    lastTouchLookY: 0,
    hintTimer: 0,
    damageFlash: 0,
    hitMarkerT: 0,
    dirHitYaw: 0,
    dirHitT: 0,
    recoilPitch: 0,
    muzzleFlashT: 0,
    shootCd: 0,
    lowPerf: false,
    rafId: 0,
    lastFrameT: 0,
    listenersBound: false,
  };

  const stats = {
    shots: 0,
    hits: 0,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    bestTime: null,
  };

  const player = {
    x: 0,
    y: PLAYER_EYE,
    z: 16,
    yaw: 0,
    pitch: 0,
    hp: PLAYER_MAX_HP,
    ammo: MAG_SIZE,
    reserve: RESERVE_START,
    reloading: false,
    reloadT: 0,
  };

  /** @type {Array} */
  let enemies = [];
  /** @type {Array<{minX,maxX,minZ,maxZ,minY,maxY}>} */
  let colliders = [];
  /** @type {Array} */
  let losBlockers = [];

  const objective = {
    state: 'locked', // locked | ready | defusing | done
    progress: 0,
    x: 0,
    y: 0.55,
    z: -16.5,
    mesh: null,
    glow: null,
  };

  // Three.js
  let renderer, scene, camera, clock;
  let weaponGroup, muzzleLight, muzzleFlashMesh;
  let tracerPool = [];
  let sparkPool = [];
  let impactPool = [];
  let ambientLight, dirLight;
  let markerMesh;
  let worldGroup;

  // ---------------------------------------------------------------------------
  // Collision helpers
  // ---------------------------------------------------------------------------
  function addBoxCollider(x, z, w, d, h, y0) {
    const halfW = w / 2;
    const halfD = d / 2;
    const minY = y0 || 0;
    const maxY = minY + (h || 3);
    const c = {
      minX: x - halfW,
      maxX: x + halfW,
      minZ: z - halfD,
      maxZ: z + halfD,
      minY,
      maxY,
    };
    colliders.push(c);
    return c;
  }

  function addLosBlocker(x, z, w, d, h, y0) {
    const c = addBoxCollider(x, z, w, d, h, y0);
    losBlockers.push(c);
    return c;
  }

  function circleHitsAABB(px, pz, r, c) {
    const nx = clamp(px, c.minX, c.maxX);
    const nz = clamp(pz, c.minZ, c.maxZ);
    const dx = px - nx;
    const dz = pz - nz;
    return dx * dx + dz * dz < r * r;
  }

  function resolveCircle(px, pz, r) {
    let x = px;
    let z = pz;
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.maxY < 0.4) continue;
        if (!circleHitsAABB(x, z, r, c)) continue;
        const nearestX = clamp(x, c.minX, c.maxX);
        const nearestZ = clamp(z, c.minZ, c.maxZ);
        let dx = x - nearestX;
        let dz = z - nearestZ;
        let len = Math.sqrt(dx * dx + dz * dz);
        if (len < 1e-6) {
          // center inside box — push out on smallest penetration
          const left = x - c.minX + r;
          const right = c.maxX - x + r;
          const top = z - c.minZ + r;
          const bottom = c.maxZ - z + r;
          const m = Math.min(left, right, top, bottom);
          if (m === left) x = c.minX - r;
          else if (m === right) x = c.maxX + r;
          else if (m === top) z = c.minZ - r;
          else z = c.maxZ + r;
        } else {
          const push = r - len;
          x += (dx / len) * push;
          z += (dz / len) * push;
        }
      }
    }
    x = clamp(x, MAP_MIN + r, MAP_MAX - r);
    z = clamp(z, MAP_MIN + r, MAP_MAX - r);
    return { x, z };
  }

  function segmentHitsAABB(x0, z0, x1, z1, c) {
    // Liang-Barsky-ish 2D segment vs AABB in XZ, ignore if top is below eye
    if (c.maxY < 0.9) return false;
    let t0 = 0;
    let t1 = 1;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const p = [-dx, dx, -dz, dz];
    const q = [x0 - c.minX, c.maxX - x0, z0 - c.minZ, c.maxZ - z0];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) {
        if (q[i] < 0) return false;
      } else {
        const r = q[i] / p[i];
        if (p[i] < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    return t0 < t1 && t0 < 1 && t1 > 0;
  }

  function hasLineOfSight(x0, z0, x1, z1) {
    for (let i = 0; i < losBlockers.length; i++) {
      if (segmentHitsAABB(x0, z0, x1, z1, losBlockers[i])) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Scene building
  // ---------------------------------------------------------------------------
  function mat(color, opts) {
    return new THREE.MeshLambertMaterial(
      Object.assign({ color }, opts || {})
    );
  }

  function boxMesh(w, h, d, color, x, y, z, rotY) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function buildWorld() {
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    colliders = [];
    losBlockers = [];

    // Sky / fog already set
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      mat(0x3a4a3a)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Dock planks strip
    const dock = boxMesh(18, 0.12, 8, 0x6b5344, 0, 0.06, 18);
    worldGroup.add(dock);

    // Water edge
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 24),
      new THREE.MeshLambertMaterial({ color: 0x1a4a68, transparent: true, opacity: 0.9 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.05, 30);
    worldGroup.add(water);

    // Outer walls (map bounds soft walls)
    const wallH = 4.2;
    const wallMat = 0x5a646c;
    function wall(x, z, w, d, h, y, los) {
      const yy = y != null ? y : h / 2;
      const m = boxMesh(w, h || wallH, d, wallMat, x, yy, z);
      worldGroup.add(m);
      if (los !== false) addLosBlocker(x, z, w, d, h || wallH, yy - (h || wallH) / 2);
      else addBoxCollider(x, z, w, d, h || wallH, yy - (h || wallH) / 2);
      return m;
    }

    // Perimeter
    wall(0, -24, 50, 1.2, wallH);
    wall(0, 24, 50, 1.2, wallH);
    wall(-24, 0, 1.2, 48, wallH);
    wall(24, 0, 1.2, 48, wallH);

    // Warehouse A (left)
    wall(-14, -4, 12, 1, wallH);
    wall(-14, 8, 12, 1, wallH);
    wall(-20, 2, 1, 13, wallH);
    wall(-8, 2, 1, 6, wallH); // partial open for path
    // roof
    const roofA = boxMesh(12.5, 0.35, 13.5, 0x4a5560, -14, 4.3, 2);
    worldGroup.add(roofA);

    // Warehouse B (right, open bay)
    wall(12, -8, 1, 14, wallH);
    wall(18, -2, 10, 1, wallH);
    wall(18, -14, 10, 1, wallH);
    wall(22, -8, 1, 12, wallH);
    const roofB = boxMesh(11, 0.3, 14, 0x55606a, 17, 4.2, -8);
    worldGroup.add(roofB);

    // Central corridor walls / cover
    wall(-2, -6, 1, 10, 2.6, 1.3); // low cover mid
    wall(3, 4, 8, 1, 2.2, 1.1);
    wall(-5, 10, 1, 6, 3, 1.5);

    // Elevated platform (height variation) — no full solid collider so player can walk up
    const platform = boxMesh(8, 1.2, 6, 0x6a6e72, -12, 0.6, -14);
    worldGroup.add(platform);
    // ramp
    const ramp = boxMesh(3, 0.35, 4.5, 0x7a7060, -8.5, 0.45, -10.5, -0.35);
    worldGroup.add(ramp);
    // rail (blocks falling off back/side)
    wall(-12, -17, 8, 0.3, 1.1, 1.75, true);
    wall(-16, -14, 0.3, 6, 1.1, 1.75, true);

    // Shipping containers
    function container(x, z, rot, color) {
      const g = new THREE.Group();
      const body = boxMesh(2.4, 2.4, 6, color, 0, 1.2, 0);
      g.add(body);
      const ridge = boxMesh(2.45, 0.15, 6.05, 0x222222, 0, 2.35, 0);
      g.add(ridge);
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      worldGroup.add(g);
      // collider approx rotated as AABB (only 0 or 90)
      if (Math.abs(rot) < 0.1 || Math.abs(Math.abs(rot) - Math.PI) < 0.1) {
        addLosBlocker(x, z, 2.4, 6, 2.4, 0);
      } else {
        addLosBlocker(x, z, 6, 2.4, 2.4, 0);
      }
    }
    container(6, -16, 0, 0xc45c2a);
    container(10, -16, 0, 0x2a6a9c);
    container(-4, -18, Math.PI / 2, 0x3a8a5a);
    container(8, 10, Math.PI / 2, 0xb0a030);
    container(-18, -12, 0, 0x8a3a3a);

    // Wooden crates clusters
    function crate(x, z, s, y) {
      const m = boxMesh(s, s, s, 0x8b6914, x, (y || 0) + s / 2, z);
      worldGroup.add(m);
      addBoxCollider(x, z, s * 0.95, s * 0.95, s, y || 0);
      // low crates not full LOS block if short
      if (s >= 1.1) losBlockers.push(colliders[colliders.length - 1]);
    }
    crate(2, 0, 1.1);
    crate(3.1, 0.3, 0.9);
    crate(2.4, 1.2, 0.8, 1.1);
    crate(-10, 6, 1.2);
    crate(-9, 5.2, 0.9);
    crate(14, 4, 1.0);
    crate(-1, -12, 1.15);
    crate(0.2, -11.5, 0.85);

    // Barrel props
    function barrel(x, z) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.38, 1.0, 8),
        mat(0x4a5a3a)
      );
      m.position.set(x, 0.5, z);
      m.castShadow = true;
      worldGroup.add(m);
      addBoxCollider(x, z, 0.7, 0.7, 1.0, 0);
    }
    barrel(4, 12);
    barrel(4.8, 12.4);
    barrel(-6, -2);

    // Distant landmark: harbor crane
    const crane = new THREE.Group();
    const base = boxMesh(1.5, 10, 1.5, 0xd0a040, 0, 5, 0);
    crane.add(base);
    const arm = boxMesh(14, 0.5, 0.6, 0xd0a040, 4, 10.2, 0);
    crane.add(arm);
    const counter = boxMesh(4, 0.5, 0.6, 0xb08030, -3, 10.2, 0);
    crane.add(counter);
    const cabin = boxMesh(1.6, 1.2, 1.4, 0x406080, 1, 9.2, 0);
    crane.add(cabin);
    crane.position.set(20, 0, 20);
    worldGroup.add(crane);

    // Second landmark: lighthouse stack far
    const lightHouse = new THREE.Group();
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 12, 6),
      mat(0xe8e0d0)
    );
    tower.position.y = 6;
    lightHouse.add(tower);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 1.2, 6),
      mat(0xc04040)
    );
    top.position.y = 12.2;
    lightHouse.add(top);
    const beacon = new THREE.PointLight(0xfff0c0, 0.8, 40);
    beacon.position.y = 13;
    lightHouse.add(beacon);
    lightHouse.position.set(-22, 0, 22);
    worldGroup.add(lightHouse);

    // Floor markings / painted path
    const stripe = boxMesh(1.2, 0.02, 20, 0xd0b040, 0, 0.02, 4);
    worldGroup.add(stripe);
    const stripe2 = boxMesh(10, 0.02, 1.0, 0xd0b040, -5, 0.02, -6);
    worldGroup.add(stripe2);

    // Objective device
    const device = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.7, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x222830, emissive: 0x001018 })
    );
    core.position.y = 0.35;
    device.add(core);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.25, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x111820, emissive: 0xff5520, emissiveIntensity: 0.6 })
    );
    panel.position.set(0, 0.55, 0.4);
    device.add(panel);
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6),
      mat(0x8899aa)
    );
    antenna.position.set(0.25, 0.95, 0);
    device.add(antenna);
    const glow = new THREE.PointLight(0xff6622, 1.4, 8);
    glow.position.set(0, 0.8, 0);
    device.add(glow);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.05, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xff7733 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    device.add(ring);
    device.position.set(objective.x, 0, objective.z);
    worldGroup.add(device);
    objective.mesh = device;
    objective.glow = glow;
    addBoxCollider(objective.x, objective.z, 1.0, 1.0, 1.0, 0);

    // Waypoint marker arrow (start guidance)
    markerMesh = new THREE.Group();
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.7, 4),
      new THREE.MeshBasicMaterial({ color: 0x3ec7ff })
    );
    arrow.rotation.x = Math.PI;
    markerMesh.add(arrow);
    const stem = boxMesh(0.12, 0.6, 0.12, 0x3ec7ff, 0, 0.55, 0);
    stem.material = new THREE.MeshBasicMaterial({ color: 0x3ec7ff });
    markerMesh.add(stem);
    markerMesh.position.set(0, 2.2, 6);
    worldGroup.add(markerMesh);

    // Ambient props: fence near dock
    for (let i = -8; i <= 8; i += 2) {
      const post = boxMesh(0.15, 1.4, 0.15, 0x555555, i, 0.7, 20);
      worldGroup.add(post);
    }

    // Interior warehouse shelves
    for (let i = 0; i < 3; i++) {
      const shelf = boxMesh(3.5, 2.5, 0.4, 0x6a5a4a, -16, 1.25, -2 + i * 3);
      worldGroup.add(shelf);
      addLosBlocker(-16, -2 + i * 3, 3.5, 0.4, 2.5, 0);
    }
  }

  function makeEnemyMesh(tint) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.95, 0.45),
      mat(tint)
    );
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      mat(0xd4b08c)
    );
    head.position.y = 1.75;
    head.castShadow = true;
    g.add(head);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x111111, emissive: 0x330000 })
    );
    visor.position.set(0, 1.78, 0.18);
    g.add(visor);
    const legL = boxMesh(0.22, 0.7, 0.28, 0x2a3038, -0.16, 0.35, 0);
    const legR = boxMesh(0.22, 0.7, 0.28, 0x2a3038, 0.16, 0.35, 0);
    g.add(legL, legR);
    const armL = boxMesh(0.18, 0.7, 0.22, tint, -0.48, 1.1, 0);
    const armR = boxMesh(0.18, 0.7, 0.22, tint, 0.48, 1.1, 0);
    g.add(armL, armR);
    // simple weapon
    const gun = boxMesh(0.12, 0.12, 0.7, 0x222222, 0.35, 1.15, 0.35);
    g.add(gun);
    g.userData.parts = { body, head, armL, armR, legL, legR };
    return g;
  }

  function spawnEnemies() {
    enemies.forEach((e) => {
      if (e.mesh) scene.remove(e.mesh);
    });
    enemies = [];

    const defs = [
      {
        id: 1,
        x: -12,
        z: 0,
        patrol: [
          { x: -12, z: 0 },
          { x: -12, z: 6 },
          { x: -16, z: 4 },
        ],
        tint: 0x8b3a3a,
      },
      {
        id: 2,
        x: 10,
        z: -6,
        patrol: [
          { x: 10, z: -6 },
          { x: 14, z: -10 },
          { x: 16, z: -4 },
        ],
        tint: 0x6a3a8b,
      },
      {
        id: 3,
        x: -10,
        z: -14,
        patrol: [
          { x: -10, z: -14 },
          { x: -14, z: -12 },
          { x: -8, z: -16 },
        ],
        tint: 0x3a6a4a,
        onPlatform: true,
      },
      {
        id: 4,
        x: 4,
        z: -14,
        patrol: [
          { x: 4, z: -14 },
          { x: 0, z: -10 },
          { x: 6, z: -18 },
        ],
        tint: 0x8b6a2a,
      },
      {
        id: 5,
        x: 6,
        z: 6,
        patrol: [
          { x: 6, z: 6 },
          { x: 2, z: 8 },
          { x: 8, z: 10 },
        ],
        tint: 0x3a5a8b,
      },
    ];

    defs.forEach((d) => {
      const mesh = makeEnemyMesh(d.tint);
      mesh.position.set(d.x, d.onPlatform ? 1.2 : 0, d.z);
      scene.add(mesh);
      enemies.push({
        id: d.id,
        x: d.x,
        y: d.onPlatform ? 1.2 : 0,
        z: d.z,
        yaw: 0,
        hp: ENEMY_HP,
        maxHp: ENEMY_HP,
        state: 'patrol',
        alive: true,
        patrol: d.patrol,
        patrolIdx: 0,
        patrolWait: 0,
        alertT: 0,
        shootCd: 0.5 + Math.random() * 0.8,
        hurtT: 0,
        mesh,
        baseY: d.onPlatform ? 1.2 : 0,
        lastKnown: null,
        aimYaw: 0,
      });
    });
  }

  function buildWeaponView() {
    weaponGroup = new THREE.Group();
    const body = boxMesh(0.18, 0.22, 0.7, 0x2a2e34, 0.28, -0.22, -0.55);
    body.material = new THREE.MeshLambertMaterial({ color: 0x2a2e34 });
    weaponGroup.add(body);
    const barrel = boxMesh(0.08, 0.08, 0.55, 0x1a1c20, 0.28, -0.18, -1.0);
    weaponGroup.add(barrel);
    const mag = boxMesh(0.1, 0.22, 0.16, 0x333840, 0.28, -0.38, -0.5);
    weaponGroup.add(mag);
    const stock = boxMesh(0.14, 0.16, 0.28, 0x3a2a1a, 0.28, -0.2, -0.2);
    weaponGroup.add(stock);
    muzzleFlashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffee88 })
    );
    muzzleFlashMesh.position.set(0.28, -0.18, -1.32);
    muzzleFlashMesh.visible = false;
    weaponGroup.add(muzzleFlashMesh);
    muzzleLight = new THREE.PointLight(0xffcc66, 0, 4);
    muzzleLight.position.copy(muzzleFlashMesh.position);
    weaponGroup.add(muzzleLight);
    camera.add(weaponGroup);
  }

  function initThree() {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isTouchDevice(),
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice() ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = !isTouchDevice() && !prefersReducedMotion;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87a0b4, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7aa0b8);
    scene.fog = new THREE.Fog(0x8aadc0, 18, 58);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 120);
    camera.position.set(player.x, player.y, player.z);
    scene.add(camera);

    ambientLight = new THREE.AmbientLight(0xb0c4d0, 0.55);
    scene.add(ambientLight);
    dirLight = new THREE.DirectionalLight(0xfff2d8, 0.85);
    dirLight.position.set(12, 22, 8);
    dirLight.castShadow = renderer.shadowMap.enabled;
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 60;
      dirLight.shadow.camera.left = -30;
      dirLight.shadow.camera.right = 30;
      dirLight.shadow.camera.top = 30;
      dirLight.shadow.camera.bottom = -30;
    }
    scene.add(dirLight);
    const fill = new THREE.DirectionalLight(0x6a90b0, 0.25);
    fill.position.set(-10, 8, -6);
    scene.add(fill);

    buildWorld();
    spawnEnemies();
    buildWeaponView();

    // VFX pools
    for (let i = 0; i < 16; i++) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1, 4),
        new THREE.MeshBasicMaterial({ color: 0xffee88 })
      );
      t.visible = false;
      scene.add(t);
      tracerPool.push({ mesh: t, life: 0 });
    }
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      s.visible = false;
      scene.add(s);
      sparkPool.push({ mesh: s, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 6),
        new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
      );
      m.visible = false;
      scene.add(m);
      impactPool.push({ mesh: m, life: 0 });
    }

    clock = { last: nowMs() };
    onResize();
  }

  // ---------------------------------------------------------------------------
  // Gameplay systems
  // ---------------------------------------------------------------------------
  function updateCamera() {
    camera.position.set(player.x, player.y, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch + state.recoilPitch;
    camera.rotation.z = 0;
  }

  function tryMove(forward, right, dt) {
    if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.CLEARED && state.phase !== PHASE.DEFUSING) {
      return;
    }
    const f = clamp(forward, -1, 1);
    const r = clamp(right, -1, 1);
    if (Math.abs(f) < 0.01 && Math.abs(r) < 0.01) return;

    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    // yaw=0 looks -Z in three default? We use rotation.y = yaw; looking direction is -sin(yaw), -cos?
    // Three.js camera looks down -Z when rotation 0.
    // With rotation.y = yaw: forward is (-sin(yaw), 0, -cos(yaw))
    let dx = (-sin * f + cos * r) * PLAYER_SPEED * dt;
    let dz = (-cos * f - sin * r) * PLAYER_SPEED * dt;

    let nx = player.x + dx;
    let nz = player.z;
    let res = resolveCircle(nx, nz, PLAYER_RADIUS);
    player.x = res.x;
    nz = player.z + dz;
    res = resolveCircle(player.x, nz, PLAYER_RADIUS);
    player.z = res.z;

    // Height: stay on ground / simple platform
    player.y = getGroundHeight(player.x, player.z) + PLAYER_EYE;
    updateCamera();
  }

  function getGroundHeight(x, z) {
    // elevated platform region
    if (x > -16 && x < -8 && z > -17 && z < -11) return 1.2;
    return 0;
  }

  function applyLook(dx, dy) {
    player.yaw -= dx * MOUSE_SENS;
    player.pitch -= dy * MOUSE_SENS;
    player.pitch = clamp(player.pitch, -1.35, 1.35);
    updateCamera();
  }

  function spawnTracer(ox, oy, oz, dx, dy, dz, len, enemy) {
    const t = tracerPool.find((p) => p.life <= 0);
    if (!t) return;
    const L = Math.min(len, 18);
    t.mesh.visible = true;
    t.mesh.scale.set(1, L, 1);
    // cylinder default along Y; orient
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const mid = new THREE.Vector3(ox, oy, oz).addScaledVector(dir, L * 0.5);
    t.mesh.position.copy(mid);
    t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    t.mesh.material.color.setHex(enemy ? 0xff6644 : 0xffee88);
    t.life = prefersReducedMotion ? 0.04 : 0.08;
  }

  function spawnSparks(x, y, z) {
    const n = prefersReducedMotion ? 2 : 5;
    for (let i = 0; i < n; i++) {
      const s = sparkPool.find((p) => p.life <= 0);
      if (!s) break;
      s.mesh.visible = true;
      s.mesh.position.set(x, y, z);
      s.vx = (Math.random() - 0.5) * 4;
      s.vy = Math.random() * 3 + 1;
      s.vz = (Math.random() - 0.5) * 4;
      s.life = 0.25 + Math.random() * 0.2;
    }
  }

  function spawnImpact(x, y, z, nx, ny, nz) {
    const m = impactPool.find((p) => p.life <= 0);
    if (!m) return;
    m.mesh.visible = true;
    m.mesh.position.set(x, y, z);
    const n = new THREE.Vector3(nx || 0, ny || 1, nz || 0).normalize();
    m.mesh.lookAt(m.mesh.position.clone().add(n));
    m.life = 8;
  }

  function raycastShoot(from, dir, maxDist, ignoreEnemyId) {
    // Manual ray vs enemies + walls
    let bestT = maxDist;
    let hit = null;

    // walls (AABB slab in 3D simplified: XZ blockers + height)
    for (let i = 0; i < losBlockers.length; i++) {
      const c = losBlockers[i];
      // 3D AABB ray
      let tmin = 0;
      let tmax = maxDist;
      const o = [from.x, from.y, from.z];
      const d = [dir.x, dir.y, dir.z];
      const minB = [c.minX, c.minY, c.minZ];
      const maxB = [c.maxX, c.maxY, c.maxZ];
      let hitBox = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-8) {
          if (o[a] < minB[a] || o[a] > maxB[a]) {
            hitBox = false;
            break;
          }
        } else {
          let t1 = (minB[a] - o[a]) / d[a];
          let t2 = (maxB[a] - o[a]) / d[a];
          if (t1 > t2) {
            const tmp = t1;
            t1 = t2;
            t2 = tmp;
          }
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) {
            hitBox = false;
            break;
          }
        }
      }
      if (hitBox && tmin > 0.05 && tmin < bestT) {
        bestT = tmin;
        const px = from.x + dir.x * tmin;
        const py = from.y + dir.y * tmin;
        const pz = from.z + dir.z * tmin;
        hit = { type: 'wall', t: tmin, x: px, y: py, z: pz };
      }
    }

    // enemies as capsules / boxes
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      if (ignoreEnemyId != null && e.id === ignoreEnemyId) continue;
      const ex = e.x;
      const ey = e.y + 1.0;
      const ez = e.z;
      const hw = 0.45;
      const hh = 1.0;
      const hd = 0.4;
      const minB = [ex - hw, ey - hh, ez - hd];
      const maxB = [ex + hw, ey + hh, ez + hd];
      let tmin = 0;
      let tmax = maxDist;
      const o = [from.x, from.y, from.z];
      const d = [dir.x, dir.y, dir.z];
      let hitBox = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-8) {
          if (o[a] < minB[a] || o[a] > maxB[a]) {
            hitBox = false;
            break;
          }
        } else {
          let t1 = (minB[a] - o[a]) / d[a];
          let t2 = (maxB[a] - o[a]) / d[a];
          if (t1 > t2) {
            const tmp = t1;
            t1 = t2;
            t2 = tmp;
          }
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) {
            hitBox = false;
            break;
          }
        }
      }
      if (hitBox && tmin > 0.05 && tmin < bestT) {
        bestT = tmin;
        hit = {
          type: 'enemy',
          enemy: e,
          t: tmin,
          x: from.x + dir.x * tmin,
          y: from.y + dir.y * tmin,
          z: from.z + dir.z * tmin,
        };
      }
    }
    return hit;
  }

  function getLookDir() {
    // camera forward
    const e = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(e);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return dir;
  }

  function doShoot() {
    if (state.paused) return false;
    if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.CLEARED && state.phase !== PHASE.DEFUSING) {
      return false;
    }
    if (player.reloading) return false;
    if (state.shootCd > 0) return false;
    if (player.ammo <= 0) {
      AudioSys.empty();
      state.shootCd = 0.2;
      el.ammoText.classList.add('empty');
      return false;
    }

    player.ammo -= 1;
    stats.shots += 1;
    state.shootCd = FIRE_COOLDOWN;
    state.muzzleFlashT = 0.05;
    state.recoilPitch = prefersReducedMotion ? -0.01 : -0.035;
    AudioSys.shoot();
    updateHudAmmo();

    const dir = getLookDir();
    const from = new THREE.Vector3(player.x, player.y, player.z);
    // slight muzzle offset
    from.addScaledVector(dir, 0.3);
    const hit = raycastShoot(from, dir, 45, null);
    const len = hit ? hit.t : 40;
    spawnTracer(from.x, from.y, from.z, dir.x, dir.y, dir.z, len, false);

    if (hit) {
      if (hit.type === 'enemy' && hit.enemy.alive) {
        damageEnemy(hit.enemy, 18 + Math.random() * 6);
        stats.hits += 1;
        stats.damageDealt += 20;
        state.hitMarkerT = 0.12;
        el.crosshair.classList.add('hit');
        el.hitMarker.classList.add('show');
        AudioSys.hit();
        spawnSparks(hit.x, hit.y, hit.z);
      } else {
        spawnImpact(hit.x, hit.y, hit.z, -dir.x, -dir.y, -dir.z);
        spawnSparks(hit.x, hit.y, hit.z);
      }
    }
    return true;
  }

  function damageEnemy(e, amount) {
    if (!e.alive) return;
    e.hp -= amount;
    e.hurtT = 0.2;
    e.state = e.hp > 0 ? 'hurt' : 'dead';
    if (e.mesh && e.mesh.userData.parts) {
      e.mesh.userData.parts.body.material.emissive =
        e.mesh.userData.parts.body.material.emissive || new THREE.Color(0x000000);
      if (e.mesh.userData.parts.body.material.emissive) {
        e.mesh.userData.parts.body.material.emissive.setHex(0x442200);
      }
    }
    if (e.hp <= 0) {
      killEnemy(e);
    } else {
      // aggro
      e.state = 'chase';
      e.lastKnown = { x: player.x, z: player.z };
      e.alertT = 0.4;
    }
  }

  function killEnemy(e) {
    e.alive = false;
    e.hp = 0;
    e.state = 'dead';
    stats.kills += 1;
    if (e.mesh) {
      e.mesh.rotation.x = Math.PI / 2;
      e.mesh.position.y = e.baseY + 0.25;
      // fade-ish
      e.mesh.traverse((c) => {
        if (c.material) {
          c.material = c.material.clone();
          c.material.transparent = true;
          c.material.opacity = 0.45;
        }
      });
    }
    updateEnemyCount();
    checkClear();
  }

  function eliminateEnemyById(id) {
    const e = enemies.find((x) => x.id === id);
    if (!e || !e.alive) return false;
    killEnemy(e);
    return true;
  }

  function checkClear() {
    const alive = enemies.some((e) => e.alive);
    if (!alive && (state.phase === PHASE.PLAYING || state.phase === PHASE.CLEARED)) {
      state.phase = PHASE.CLEARED;
      objective.state = 'ready';
      if (objective.glow) {
        objective.glow.color.setHex(0x44ff88);
        objective.glow.intensity = 2.2;
      }
      setObjective('装置已解锁 — 靠近并长按 E 拆除');
      showHint('清场完成！前往橙色光晕装置，按住 E 拆除', 4);
      AudioSys.alert();
    }
  }

  function startReload() {
    if (state.paused) return false;
    if (state.phase === PHASE.MENU || state.phase === PHASE.WIN || state.phase === PHASE.LOSE) return false;
    if (player.reloading) return false;
    if (player.ammo >= MAG_SIZE) return false;
    if (player.reserve <= 0) {
      AudioSys.empty();
      return false;
    }
    player.reloading = true;
    player.reloadT = RELOAD_TIME;
    AudioSys.reload();
    return true;
  }

  function finishReload() {
    const need = MAG_SIZE - player.ammo;
    const take = Math.min(need, player.reserve);
    player.ammo += take;
    player.reserve -= take;
    player.reloading = false;
    player.reloadT = 0;
    updateHudAmmo();
  }

  function damagePlayer(amount, fromX, fromZ) {
    if (state.phase === PHASE.WIN || state.phase === PHASE.LOSE || state.phase === PHASE.MENU) return;
    if (state.paused) return;
    player.hp = Math.max(0, player.hp - amount);
    stats.damageTaken += amount;
    state.damageFlash = 0.35;
    el.damageVignette.classList.add('active');
    AudioSys.hurt();
    if (fromX != null) {
      const dx = fromX - player.x;
      const dz = fromZ - player.z;
      const ang = Math.atan2(dx, dz);
      // relative to player yaw
      state.dirHitYaw = ang - player.yaw;
      state.dirHitT = 0.6;
      el.dirIndicator.classList.add('show');
      el.dirIndicator.style.transform = `rotate(${-deg(state.dirHitYaw)}deg)`;
    }
    updateHudHp();
    if (player.hp <= 0) {
      failMission('生命值耗尽');
    }
  }

  function tryInteract(dt) {
    if (state.paused) return 0;
    if (state.phase !== PHASE.CLEARED && state.phase !== PHASE.DEFUSING) return 0;
    if (objective.state !== 'ready' && objective.state !== 'defusing') return 0;
    const d = dist2(player.x, player.z, objective.x, objective.z);
    if (d > DEFUSE_RANGE) {
      if (objective.progress > 0) {
        objective.progress = Math.max(0, objective.progress - dt * 0.9);
        objective.state = objective.progress > 0 ? 'defusing' : 'ready';
        updateDefuseUI();
      }
      return 0;
    }
    objective.progress += dt;
    objective.state = 'defusing';
    state.phase = PHASE.DEFUSING;
    if (Math.floor(objective.progress * 10) !== Math.floor((objective.progress - dt) * 10)) {
      AudioSys.defuseTick();
    }
    updateDefuseUI();
    if (objective.progress >= DEFUSE_TIME) {
      objective.progress = DEFUSE_TIME;
      objective.state = 'done';
      winMission();
    }
    return dt;
  }

  function decayInteract(dt) {
    if (objective.state === 'done' || objective.state === 'locked') return;
    if (objective.progress > 0) {
      objective.progress = Math.max(0, objective.progress - dt * 0.85);
      if (objective.progress <= 0) {
        objective.progress = 0;
        if (state.phase === PHASE.DEFUSING) state.phase = PHASE.CLEARED;
        objective.state = 'ready';
      } else {
        objective.state = 'defusing';
      }
      updateDefuseUI();
    }
  }

  function updateDefuseUI() {
    if (objective.progress > 0 && objective.state !== 'done') {
      el.defuseWrap.classList.remove('hidden');
      el.defuseBar.style.width = `${(objective.progress / DEFUSE_TIME) * 100}%`;
    } else {
      el.defuseWrap.classList.add('hidden');
      el.defuseBar.style.width = '0%';
    }
  }

  function winMission() {
    state.phase = PHASE.WIN;
    state.paused = false;
    state.fireHeld = false;
    state.interactHeld = false;
    unlockPointer();
    AudioSys.win();
    const t = Math.max(0, MISSION_TIME - state.timeLeft);
    let isBest = false;
    if (stats.bestTime == null || t < stats.bestTime) {
      stats.bestTime = t;
      try {
        localStorage.setItem(BEST_KEY, String(t));
      } catch (_) {}
      isBest = true;
    }
    showResult(true, isBest ? '新纪录！' : '装置已安全拆除', t);
  }

  function failMission(reason) {
    if (state.phase === PHASE.WIN || state.phase === PHASE.LOSE) return;
    state.phase = PHASE.LOSE;
    state.paused = false;
    state.fireHeld = false;
    state.interactHeld = false;
    unlockPointer();
    AudioSys.lose();
    const t = Math.max(0, MISSION_TIME - state.timeLeft);
    showResult(false, reason || '任务失败', t);
  }

  function showResult(win, sub, t) {
    el.resultScreen.classList.remove('hidden');
    el.pauseScreen.classList.add('hidden');
    el.resultTitle.textContent = win ? '任务完成' : '任务失败';
    el.resultTitle.style.color = win ? 'var(--ok)' : 'var(--danger)';
    el.resultSub.textContent = sub;
    const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
    const score = Math.max(0, Math.round(stats.kills * 200 + acc * 3 + (win ? state.timeLeft * 8 : 0) - stats.damageTaken));
    el.statsList.innerHTML = `
      <li><span>用时</span><span class="val">${t.toFixed(1)} s</span></li>
      <li><span>命中率</span><span class="val">${acc}% (${stats.hits}/${stats.shots})</span></li>
      <li><span>击杀</span><span class="val">${stats.kills}</span></li>
      <li><span>得分</span><span class="val">${score}</span></li>
      <li><span>最佳通关</span><span class="val">${stats.bestTime != null ? stats.bestTime.toFixed(1) + ' s' : '—'}</span></li>
    `;
    refreshBestLine();
  }

  // ---------------------------------------------------------------------------
  // Enemy AI
  // ---------------------------------------------------------------------------
  function updateEnemies(dt) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      if (e.hurtT > 0) {
        e.hurtT -= dt;
        if (e.hurtT <= 0 && e.mesh && e.mesh.userData.parts) {
          const m = e.mesh.userData.parts.body.material;
          if (m.emissive) m.emissive.setHex(0x000000);
        }
      }

      const dPlayer = dist2(e.x, e.z, player.x, player.z);
      const los = dPlayer < ENEMY_SIGHT && hasLineOfSight(e.x, e.z, player.x, player.z);
      const canSee = los && Math.abs((e.y + 1.5) - player.y) < 4;

      if (canSee) {
        e.lastKnown = { x: player.x, z: player.z };
        if (e.state === 'patrol' || e.state === 'search') {
          e.state = 'alert';
          e.alertT = 0.35;
          AudioSys.alert();
        } else if (e.state !== 'attack' && e.state !== 'hurt') {
          e.state = dPlayer < ENEMY_ATTACK_RANGE ? 'attack' : 'chase';
        }
      }

      if (e.state === 'alert') {
        e.alertT -= dt;
        faceToward(e, player.x, player.z, dt * 6);
        if (e.alertT <= 0) e.state = 'chase';
      } else if (e.state === 'patrol') {
        const target = e.patrol[e.patrolIdx];
        const d = dist2(e.x, e.z, target.x, target.z);
        if (d < 0.4) {
          e.patrolWait += dt;
          if (e.patrolWait > 0.8) {
            e.patrolWait = 0;
            e.patrolIdx = (e.patrolIdx + 1) % e.patrol.length;
          }
        } else {
          moveEnemyToward(e, target.x, target.z, ENEMY_SPEED * 0.55, dt);
        }
      } else if (e.state === 'chase' || e.state === 'hurt') {
        const tx = e.lastKnown ? e.lastKnown.x : player.x;
        const tz = e.lastKnown ? e.lastKnown.z : player.z;
        if (dPlayer > 4.5 || !canSee) {
          moveEnemyToward(e, tx, tz, ENEMY_SPEED, dt);
        } else {
          e.state = 'attack';
        }
        if (!canSee && e.lastKnown && dist2(e.x, e.z, e.lastKnown.x, e.lastKnown.z) < 0.6) {
          e.state = 'search';
          e.patrolWait = 1.2;
        }
      } else if (e.state === 'search') {
        e.patrolWait -= dt;
        e.yaw += dt * 1.5;
        if (e.patrolWait <= 0) e.state = 'patrol';
      } else if (e.state === 'attack') {
        faceToward(e, player.x, player.z, dt * 8);
        if (dPlayer > ENEMY_ATTACK_RANGE + 2 || !canSee) {
          e.state = 'chase';
        } else {
          // strafe slightly
          if (dPlayer < 3.5) {
            const ang = Math.atan2(player.x - e.x, player.z - e.z) + Math.PI / 2;
            moveEnemyToward(e, e.x + Math.sin(ang), e.z + Math.cos(ang), ENEMY_SPEED * 0.4, dt);
          }
          e.shootCd -= dt;
          if (e.shootCd <= 0 && canSee) {
            e.shootCd = ENEMY_FIRE_CD + Math.random() * 0.35;
            enemyFire(e);
          }
        }
      }

      // sync mesh
      if (e.mesh) {
        e.mesh.position.x = e.x;
        e.mesh.position.z = e.z;
        e.mesh.position.y = e.baseY;
        e.mesh.rotation.y = e.yaw;
      }
    }
  }

  function faceToward(e, x, z, rate) {
    const desired = Math.atan2(x - e.x, z - e.z);
    let diff = desired - e.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    e.yaw += clamp(diff, -rate, rate);
  }

  function moveEnemyToward(e, tx, tz, speed, dt) {
    const dx = tx - e.x;
    const dz = tz - e.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    faceToward(e, tx, tz, dt * 5);
    const step = speed * dt;
    let nx = e.x + (dx / len) * step;
    let nz = e.z + (dz / len) * step;
    const res = resolveCircle(nx, e.z, 0.35);
    e.x = res.x;
    const res2 = resolveCircle(e.x, nz, 0.35);
    e.z = res2.z;
    e.baseY = getGroundHeight(e.x, e.z);
    e.y = e.baseY;
  }

  function enemyFire(e) {
    AudioSys.enemyShoot();
    const from = new THREE.Vector3(e.x, e.y + 1.45, e.z);
    // aim at player with slight inaccuracy
    const target = new THREE.Vector3(
      player.x + (Math.random() - 0.5) * 0.9,
      player.y + (Math.random() - 0.5) * 0.35,
      player.z + (Math.random() - 0.5) * 0.9
    );
    const dir = target.clone().sub(from).normalize();
    const hit = raycastShoot(from, dir, 40, e.id);
    const len = hit ? hit.t : 30;
    spawnTracer(from.x, from.y, from.z, dir.x, dir.y, dir.z, len, true);

    // hit player if ray roughly reaches player and LOS
    if (hasLineOfSight(e.x, e.z, player.x, player.z)) {
      // check if aim is close enough
      const toP = new THREE.Vector3(player.x, player.y, player.z).sub(from);
      const dist = toP.length();
      toP.normalize();
      const align = toP.dot(dir);
      if (align > 0.965 && dist < ENEMY_ATTACK_RANGE + 2) {
        // also ensure wall doesn't block closer than player
        if (!hit || hit.type !== 'wall' || hit.t >= dist - 0.4) {
          damagePlayer(ENEMY_DAMAGE, e.x, e.z);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HUD / UI
  // ---------------------------------------------------------------------------
  function updateHudHp() {
    const p = (player.hp / PLAYER_MAX_HP) * 100;
    el.hpBar.style.width = `${p}%`;
    el.hpText.textContent = String(Math.ceil(player.hp));
  }

  function updateHudAmmo() {
    el.ammoText.textContent = String(player.ammo);
    el.reserveText.textContent = String(player.reserve);
    if (player.ammo <= 0) el.ammoText.classList.add('empty');
    else el.ammoText.classList.remove('empty');
  }

  function updateEnemyCount() {
    const n = enemies.filter((e) => e.alive).length;
    el.enemyCount.textContent = String(n);
  }

  function updateTimerHud() {
    el.timerText.textContent = state.timeLeft.toFixed(1);
    el.timerText.classList.remove('warn', 'danger');
    if (state.timeLeft <= 15) el.timerText.classList.add('danger');
    else if (state.timeLeft <= 30) el.timerText.classList.add('warn');
  }

  function setObjective(text) {
    el.objectiveText.textContent = text;
  }

  function showHint(text, duration) {
    el.hintText.textContent = text;
    el.hintText.classList.add('show');
    state.hintTimer = duration || 3;
  }

  function refreshBestLine() {
    try {
      const v = localStorage.getItem(BEST_KEY);
      if (v != null) stats.bestTime = parseFloat(v);
    } catch (_) {}
    if (stats.bestTime != null && !isNaN(stats.bestTime)) {
      el.bestLine.textContent = `最佳通关：${stats.bestTime.toFixed(1)} s`;
    } else {
      el.bestLine.textContent = '最佳通关：—';
    }
  }

  function setPaused(p) {
    if (state.phase === PHASE.MENU || state.phase === PHASE.WIN || state.phase === PHASE.LOSE) return;
    state.paused = p;
    if (p) {
      el.pauseScreen.classList.remove('hidden');
      unlockPointer();
      state.fireHeld = false;
      state.interactHeld = false;
    } else {
      el.pauseScreen.classList.add('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // Mission flow
  // ---------------------------------------------------------------------------
  function resetMission() {
    state.phase = PHASE.PLAYING;
    state.paused = false;
    state.timeLeft = MISSION_TIME;
    state.elapsed = 0;
    state.fireHeld = false;
    state.interactHeld = false;
    state.shootCd = 0;
    state.damageFlash = 0;
    state.hitMarkerT = 0;
    state.dirHitT = 0;
    state.recoilPitch = 0;
    state.muzzleFlashT = 0;
    state.hintTimer = 0;

    player.x = 0;
    player.y = PLAYER_EYE;
    player.z = 16;
    player.yaw = 0; // look toward -Z into the map (Three.js camera forward)
    player.pitch = 0;
    player.hp = PLAYER_MAX_HP;
    player.ammo = MAG_SIZE;
    player.reserve = RESERVE_START;
    player.reloading = false;
    player.reloadT = 0;

    objective.state = 'locked';
    objective.progress = 0;
    if (objective.glow) {
      objective.glow.color.setHex(0xff6622);
      objective.glow.intensity = 1.4;
    }

    stats.shots = 0;
    stats.hits = 0;
    stats.damageDealt = 0;
    stats.damageTaken = 0;
    stats.kills = 0;

    // clear VFX
    tracerPool.forEach((t) => {
      t.life = 0;
      t.mesh.visible = false;
    });
    sparkPool.forEach((s) => {
      s.life = 0;
      s.mesh.visible = false;
    });
    impactPool.forEach((m) => {
      m.life = 0;
      m.mesh.visible = false;
    });

    spawnEnemies();
    updateCamera();
    updateHudHp();
    updateHudAmmo();
    updateEnemyCount();
    updateTimerHud();
    updateDefuseUI();
    setObjective('清除所有敌方单位');
    el.damageVignette.classList.remove('active');
    el.hitMarker.classList.remove('show');
    el.dirIndicator.classList.remove('show');
    el.crosshair.classList.remove('hit');
    el.resultScreen.classList.add('hidden');
    el.pauseScreen.classList.add('hidden');
    el.startScreen.classList.add('hidden');
    el.hud.classList.remove('hidden');
    el.hud.setAttribute('aria-hidden', 'false');

    if (isTouchDevice()) {
      el.touchControls.classList.remove('hidden');
      el.touchControls.setAttribute('aria-hidden', 'false');
    } else {
      el.touchControls.classList.add('hidden');
    }

    showHint('沿黄线推进，利用集装箱与木箱掩体清除敌方', 3.5);
    if (markerMesh) markerMesh.visible = true;
  }

  function startGame() {
    AudioSys.resume();
    resetMission();
    // request pointer lock on desktop
    if (!isTouchDevice()) {
      requestPointer();
    }
  }

  function restartGame() {
    AudioSys.resume();
    resetMission();
    if (!isTouchDevice()) requestPointer();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  function requestPointer() {
    try {
      if (!canvas.requestPointerLock) return;
      const ret = canvas.requestPointerLock();
      if (ret && typeof ret.catch === 'function') ret.catch(() => {});
    } catch (_) {}
  }

  function unlockPointer() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (_) {}
  }

  function bindInput() {
    if (state.listenersBound) return;
    state.listenersBound = true;

    el.btnStart.addEventListener('click', () => startGame());
    el.btnResume.addEventListener('click', () => {
      setPaused(false);
      if (!isTouchDevice()) requestPointer();
    });
    el.btnPause.addEventListener('click', () => setPaused(true));
    el.btnRestartHud.addEventListener('click', () => restartGame());
    el.btnRestartPause.addEventListener('click', () => restartGame());
    el.btnReplay.addEventListener('click', () => restartGame());
    el.btnMute.addEventListener('click', () => {
      state.muted = !state.muted;
      AudioSys.setMuted(state.muted);
      el.btnMute.textContent = state.muted ? '取消静音' : '静音';
    });

    window.addEventListener('keydown', (ev) => {
      const k = ev.code;
      state.keys[k] = true;
      if (k === 'Escape') {
        if (state.phase === PHASE.PLAYING || state.phase === PHASE.CLEARED || state.phase === PHASE.DEFUSING) {
          setPaused(!state.paused);
        }
      }
      if (state.paused || state.phase === PHASE.MENU) return;
      if (k === 'KeyR') startReload();
      if (k === 'KeyE') state.interactHeld = true;
    });
    window.addEventListener('keyup', (ev) => {
      state.keys[ev.code] = false;
      if (ev.code === 'KeyE') state.interactHeld = false;
    });

    canvas.addEventListener('mousedown', (ev) => {
      if (state.phase === PHASE.MENU) return;
      if (ev.button === 0) {
        if (!state.pointerLocked && !isTouchDevice()) {
          // drag-look fallback
          state.dragLook = true;
          state.lastDragX = ev.clientX;
          state.lastDragY = ev.clientY;
        }
        state.fireHeld = true;
        doShoot();
        if (!state.pointerLocked && !isTouchDevice()) {
          requestPointer();
        }
      }
    });
    window.addEventListener('mouseup', (ev) => {
      if (ev.button === 0) {
        state.fireHeld = false;
        state.dragLook = false;
      }
    });
    window.addEventListener('mousemove', (ev) => {
      if (state.paused || state.phase === PHASE.MENU || state.phase === PHASE.WIN || state.phase === PHASE.LOSE)
        return;
      if (state.pointerLocked) {
        applyLook(ev.movementX || 0, ev.movementY || 0);
      } else if (state.dragLook) {
        const dx = ev.clientX - state.lastDragX;
        const dy = ev.clientY - state.lastDragY;
        state.lastDragX = ev.clientX;
        state.lastDragY = ev.clientY;
        applyLook(dx, dy);
      }
    });

    document.addEventListener('pointerlockchange', () => {
      state.pointerLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('blur', () => {
      if (state.phase === PHASE.PLAYING || state.phase === PHASE.CLEARED || state.phase === PHASE.DEFUSING) {
        setPaused(true);
      }
      state.keys = Object.create(null);
      state.fireHeld = false;
      state.interactHeld = false;
    });

    window.addEventListener('resize', onResize);

    // Touch
    setupTouch();
  }

  function setupTouch() {
    const move = el.moveZone;
    const stick = el.moveStick;
    let moveId = null;
    const center = { x: 0, y: 0 };

    function setStick(dx, dy) {
      const max = 42;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const c = Math.min(len, max);
      const nx = (dx / len) * c;
      const ny = (dy / len) * c;
      stick.style.transform = `translate(${nx}px, ${ny}px)`;
      state.moveAxis.x = clamp(nx / max, -1, 1);
      state.moveAxis.y = clamp(-ny / max, -1, 1); // forward is up
    }

    move.addEventListener(
      'touchstart',
      (ev) => {
        ev.preventDefault();
        const t = ev.changedTouches[0];
        moveId = t.identifier;
        const rect = move.getBoundingClientRect();
        center.x = rect.left + rect.width / 2;
        center.y = rect.top + rect.height / 2;
        setStick(t.clientX - center.x, t.clientY - center.y);
      },
      { passive: false }
    );
    move.addEventListener(
      'touchmove',
      (ev) => {
        ev.preventDefault();
        for (let i = 0; i < ev.changedTouches.length; i++) {
          const t = ev.changedTouches[i];
          if (t.identifier === moveId) {
            setStick(t.clientX - center.x, t.clientY - center.y);
          }
        }
      },
      { passive: false }
    );
    const endMove = (ev) => {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === moveId) {
          moveId = null;
          state.moveAxis.x = 0;
          state.moveAxis.y = 0;
          stick.style.transform = 'translate(0,0)';
        }
      }
    };
    move.addEventListener('touchend', endMove);
    move.addEventListener('touchcancel', endMove);

    // Look zone
    let lookId = null;
    el.lookZone.addEventListener(
      'touchstart',
      (ev) => {
        ev.preventDefault();
        const t = ev.changedTouches[0];
        lookId = t.identifier;
        state.lastTouchLookX = t.clientX;
        state.lastTouchLookY = t.clientY;
        state.touchLookActive = true;
      },
      { passive: false }
    );
    el.lookZone.addEventListener(
      'touchmove',
      (ev) => {
        ev.preventDefault();
        if (state.paused) return;
        for (let i = 0; i < ev.changedTouches.length; i++) {
          const t = ev.changedTouches[i];
          if (t.identifier === lookId) {
            const dx = t.clientX - state.lastTouchLookX;
            const dy = t.clientY - state.lastTouchLookY;
            state.lastTouchLookX = t.clientX;
            state.lastTouchLookY = t.clientY;
            player.yaw -= dx * TOUCH_LOOK_SENS;
            player.pitch -= dy * TOUCH_LOOK_SENS;
            player.pitch = clamp(player.pitch, -1.35, 1.35);
            updateCamera();
          }
        }
      },
      { passive: false }
    );
    const endLook = (ev) => {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === lookId) {
          lookId = null;
          state.touchLookActive = false;
        }
      }
    };
    el.lookZone.addEventListener('touchend', endLook);
    el.lookZone.addEventListener('touchcancel', endLook);

    // Fire
    const fireStart = (ev) => {
      ev.preventDefault();
      state.fireHeld = true;
      doShoot();
    };
    const fireEnd = (ev) => {
      ev.preventDefault();
      state.fireHeld = false;
    };
    el.btnFireTouch.addEventListener('touchstart', fireStart, { passive: false });
    el.btnFireTouch.addEventListener('touchend', fireEnd, { passive: false });
    el.btnFireTouch.addEventListener('touchcancel', fireEnd, { passive: false });

    el.btnReloadTouch.addEventListener(
      'touchstart',
      (ev) => {
        ev.preventDefault();
        startReload();
      },
      { passive: false }
    );

    const intStart = (ev) => {
      ev.preventDefault();
      state.interactHeld = true;
    };
    const intEnd = (ev) => {
      ev.preventDefault();
      state.interactHeld = false;
    };
    el.btnInteractTouch.addEventListener('touchstart', intStart, { passive: false });
    el.btnInteractTouch.addEventListener('touchend', intEnd, { passive: false });
    el.btnInteractTouch.addEventListener('touchcancel', intEnd, { passive: false });
  }

  function onResize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    if (!renderer || !camera) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  function processGameplay(dt) {
    if (state.paused) return;
    if (state.phase === PHASE.MENU || state.phase === PHASE.WIN || state.phase === PHASE.LOSE) return;

    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    updateTimerHud();
    if (state.timeLeft <= 0) {
      failMission('倒计时结束');
      return;
    }

    // movement input
    let forward = 0;
    let right = 0;
    if (state.keys['KeyW'] || state.keys['ArrowUp']) forward += 1;
    if (state.keys['KeyS'] || state.keys['ArrowDown']) forward -= 1;
    if (state.keys['KeyD'] || state.keys['ArrowRight']) right += 1;
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) right -= 1;
    forward += state.moveAxis.y;
    right += state.moveAxis.x;
    const ml = Math.sqrt(forward * forward + right * right);
    if (ml > 1) {
      forward /= ml;
      right /= ml;
    }
    tryMove(forward, right, dt);

    // reload
    if (player.reloading) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) finishReload();
    }

    // fire auto
    if (state.shootCd > 0) state.shootCd -= dt;
    if (state.fireHeld && state.shootCd <= 0) doShoot();

    // interact
    if (state.interactHeld || state.keys['KeyE']) {
      tryInteract(dt);
    } else {
      decayInteract(dt);
    }

    // enemies
    if (state.phase === PHASE.PLAYING || state.phase === PHASE.CLEARED || state.phase === PHASE.DEFUSING) {
      updateEnemies(dt);
    }

    // feedback timers
    if (state.recoilPitch < 0) {
      state.recoilPitch = Math.min(0, state.recoilPitch + dt * 0.25);
    }
    if (state.muzzleFlashT > 0) {
      state.muzzleFlashT -= dt;
      if (muzzleFlashMesh) {
        muzzleFlashMesh.visible = state.muzzleFlashT > 0;
        muzzleLight.intensity = state.muzzleFlashT > 0 ? 2.5 : 0;
      }
    } else if (muzzleFlashMesh) {
      muzzleFlashMesh.visible = false;
      muzzleLight.intensity = 0;
    }

    if (state.damageFlash > 0) {
      state.damageFlash -= dt;
      if (state.damageFlash <= 0) el.damageVignette.classList.remove('active');
    }
    if (state.hitMarkerT > 0) {
      state.hitMarkerT -= dt;
      if (state.hitMarkerT <= 0) {
        el.hitMarker.classList.remove('show');
        el.crosshair.classList.remove('hit');
      }
    }
    if (state.dirHitT > 0) {
      state.dirHitT -= dt;
      if (state.dirHitT <= 0) el.dirIndicator.classList.remove('show');
    }
    if (state.hintTimer > 0) {
      state.hintTimer -= dt;
      if (state.hintTimer <= 0) el.hintText.classList.remove('show');
    }

    // hide start marker after guidance
    if (markerMesh && state.elapsed > 5) markerMesh.visible = false;

    // objective pulse
    if (objective.mesh && objective.glow) {
      const pulse = 1 + Math.sin(state.elapsed * 4) * 0.25;
      objective.glow.intensity = (objective.state === 'ready' || objective.state === 'defusing' ? 1.8 : 1.1) * pulse;
      objective.mesh.rotation.y = state.elapsed * 0.4;
    }

    // weapon sway
    if (weaponGroup) {
      const t = state.elapsed;
      weaponGroup.position.x = 0.02 * Math.sin(t * 1.7);
      weaponGroup.position.y = -0.01 * Math.cos(t * 2.1);
      if (player.reloading) {
        weaponGroup.rotation.x = -0.4;
      } else {
        weaponGroup.rotation.x = state.recoilPitch * 2;
      }
    }

    updateCamera();
  }

  function updateVfx(dt) {
    for (let i = 0; i < tracerPool.length; i++) {
      const t = tracerPool[i];
      if (t.life > 0) {
        t.life -= dt;
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    for (let i = 0; i < sparkPool.length; i++) {
      const s = sparkPool[i];
      if (s.life > 0) {
        s.life -= dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 9 * dt;
        if (s.life <= 0) s.mesh.visible = false;
      }
    }
    for (let i = 0; i < impactPool.length; i++) {
      const m = impactPool[i];
      if (m.life > 0) {
        m.life -= dt;
        if (m.life <= 0) m.mesh.visible = false;
      }
    }
  }

  function frame(t) {
    state.rafId = requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, (t - state.lastFrameT) / 1000 || 0.016);
    state.lastFrameT = t;

    // Always render; gameplay only if not manual clock
    if (!state.manualClock) {
      processGameplay(rawDt);
      updateVfx(rawDt);
    } else {
      // still update pure visual decay? Spec: real RAF must not advance gameplay.
      // Keep rendering only.
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // ---------------------------------------------------------------------------
  // Test API
  // ---------------------------------------------------------------------------
  function snapshot() {
    return {
      phase: state.phase,
      paused: state.paused,
      timeLeft: state.timeLeft,
      player: {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch,
        hp: player.hp,
        ammo: player.ammo,
        reserve: player.reserve,
        reloading: player.reloading,
      },
      enemies: enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        z: e.z,
        hp: e.hp,
        state: e.state,
        alive: e.alive,
      })),
      objective: {
        state: objective.state,
        progress: objective.progress,
        x: objective.x,
        y: objective.y,
        z: objective.z,
      },
      stats: {
        shots: stats.shots,
        hits: stats.hits,
        damageDealt: stats.damageDealt,
        damageTaken: stats.damageTaken,
        kills: stats.kills,
        bestTime: stats.bestTime,
        elapsed: state.elapsed,
      },
      renderer: {
        isWebGL: !!(renderer && renderer instanceof THREE.WebGLRenderer),
        width: renderer ? renderer.domElement.width : 0,
        height: renderer ? renderer.domElement.height : 0,
        threeRevision: THREE.REVISION,
      },
    };
  }

  function setPlayerPose(pose) {
    if (!pose) return;
    if (pose.x != null) player.x = pose.x;
    if (pose.y != null) player.y = pose.y;
    else player.y = getGroundHeight(player.x, player.z) + PLAYER_EYE;
    if (pose.z != null) player.z = pose.z;
    if (pose.yaw != null) player.yaw = pose.yaw;
    if (pose.pitch != null) player.pitch = clamp(pose.pitch, -1.35, 1.35);
    // clamp inside map
    const res = resolveCircle(player.x, player.z, PLAYER_RADIUS);
    player.x = res.x;
    player.z = res.z;
    player.y = getGroundHeight(player.x, player.z) + PLAYER_EYE;
    updateCamera();
  }

  function aimAtEnemy(id) {
    const e = enemies.find((x) => x.id === id);
    if (!e) return false;
    const dx = e.x - player.x;
    const dy = e.y + 1.2 - player.y;
    const dz = e.z - player.z;
    player.yaw = Math.atan2(-dx, -dz);
    const horiz = Math.sqrt(dx * dx + dz * dz) || 1;
    player.pitch = Math.atan2(dy, horiz);
    player.pitch = clamp(player.pitch, -1.35, 1.35);
    updateCamera();
    return true;
  }

  function interactMs(ms) {
    const dt = (ms || 0) / 1000;
    if (dt <= 0) return objective.progress;
    // only advance if conditions met — tryInteract checks distance & clear
    const before = objective.progress;
    tryInteract(dt);
    return objective.progress;
  }

  window.__BREACH_TEST__ = {
    snapshot,
    start() {
      startGame();
      return snapshot();
    },
    restart() {
      restartGame();
      return snapshot();
    },
    pause() {
      setPaused(true);
      return snapshot();
    },
    resume() {
      setPaused(false);
      return snapshot();
    },
    setManualClock(enabled) {
      state.manualClock = !!enabled;
      return state.manualClock;
    },
    step(ms) {
      const dt = Math.max(0, (ms || 0) / 1000);
      if (state.manualClock && !state.paused && dt > 0) {
        processGameplay(dt);
        updateVfx(dt);
      }
      return snapshot();
    },
    setPlayerPose(pose) {
      setPlayerPose(pose);
      return snapshot();
    },
    move(forward, right, ms) {
      const dt = Math.max(0, (ms || 0) / 1000);
      tryMove(forward, right, dt);
      return snapshot();
    },
    aimAtEnemy(id) {
      aimAtEnemy(id);
      return snapshot();
    },
    shoot() {
      doShoot();
      return snapshot();
    },
    reload() {
      startReload();
      return snapshot();
    },
    damagePlayer(amount) {
      damagePlayer(amount || 10, player.x + 1, player.z);
      return snapshot();
    },
    eliminateEnemy(id) {
      eliminateEnemyById(id);
      return snapshot();
    },
    interact(ms) {
      interactMs(ms);
      return snapshot();
    },
  };

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function boot() {
    if (typeof THREE === 'undefined') {
      console.error('THREE not loaded');
      return;
    }
    refreshBestLine();
    initThree();
    bindInput();
    state.lastFrameT = nowMs();
    state.rafId = requestAnimationFrame(frame);

    // low perf heuristic
    if (isTouchDevice() || prefersReducedMotion) {
      state.lowPerf = true;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

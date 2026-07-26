/* ================================================================
 * Breach Point / 破门点 — 3D First-Person Bomb Defusal Game
 * Original work. Uses Three.js r147 (local vendor file).
 * ================================================================ */
(function () {
  'use strict';

  /* ======================= CONFIG ======================= */
  const CONFIG = {
    player: {
      speed: 5.0,
      eyeHeight: 1.7,
      radius: 0.4,
      maxHp: 100,
      mouseSensitivity: 0.0022,
      dragSensitivity: 0.005,
      touchLookSensitivity: 0.004,
    },
    weapon: {
      damage: 30,
      fireRate: 0.13,        // seconds between shots
      magSize: 12,
      reserve: 24,
      reloadTime: 1.5,
      range: 100,
      recoilPitch: 0.018,
      recoilYaw: 0.008,
    },
    enemy: {
      hp: 100,
      speed: 2.8,
      detectRange: 22,
      attackRange: 18,
      minShootDist: 8,
      fireInterval: [1.4, 2.4],
      damage: [7, 14],
      hitChance: 0.55,
      firstShotDelay: [0.6, 1.2],
      alertDuration: 0.6,
      loseInterestTime: 4.0,
    },
    bomb: {
      defuseRange: 2.5,
      defuseTime: 1.5,
    },
    game: {
      timeLimit: 75,
      mapSize: 30,           // half-extent
    },
  };

  /* ======================= STATE ======================= */
  let scene, camera, renderer, canvas;
  let game = {
    phase: 'menu',          // menu | playing | paused | win | lose
    paused: false,
    manualClock: false,
    timeLeft: CONFIG.game.timeLimit,
    elapsedTime: 0,
    allClear: false,
    shotsFired: 0,
    hits: 0,
    kills: 0,
    bestTime: null,
  };
  let player = {
    x: 0, y: 0, z: 22,
    yaw: 0, pitch: 0,
    hp: CONFIG.player.maxHp,
    ammo: CONFIG.weapon.magSize,
    reserve: CONFIG.weapon.reserve,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    lastShot: 0,
    interacting: false,
    groundY: 0,
  };
  let enemies = [];
  let bomb = {
    group: null, glow: null, light: null, blink: null,
    x: 0, y: 0, z: -24,
    progress: 0,
    defused: false,
    pulseTime: 0,
  };
  let collisionBoxes = [];    // {minX,maxX,minZ,maxZ} for movement
  let blockerMeshes = [];     // THREE.Mesh array for bullet/LOS blocking
  let tracers = [];
  let sparks = [];
  let weaponModel = null;
  let muzzleFlashTime = 0;
  let input = {
    forward: 0, right: 0,
    firing: false,
    interactHeld: false,
  };
  let dragLook = { dragging: false, lastX: 0, lastY: 0 };
  let pointerLocked = false;
  let isTouchDevice = false;
  let reducedMotion = false;
  let rafId = null;
  let lastTime = 0;
  let joystickInput = { x: 0, y: 0 };
  let touchLookDelta = { x: 0, y: 0 };
  let activeTouches = {};

  // DOM shortcut
  const $ = function (id) { return document.getElementById(id); };
  let dom = {};

  /* ======================= AUDIO ======================= */
  const AudioSys = {
    ctx: null,
    master: null,
    muted: false,

    init: function () {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.28;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
      }
    },

    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    setMuted: function (m) {
      this.muted = m;
      if (this.master) {
        this.master.gain.value = m ? 0 : 0.28;
      }
    },

    _noiseBurst: function (dur, freq, q, gain) {
      if (!this.ctx || this.muted) return;
      var now = this.ctx.currentTime;
      var len = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
      }
      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = freq;
      flt.Q.value = q;
      var g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(flt).connect(g).connect(this.master);
      src.start(now);
      src.stop(now + dur);
    },

    _tone: function (type, fStart, fEnd, dur, gain) {
      if (!this.ctx || this.muted) return;
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(fStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(fEnd, 1), now + dur);
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g).connect(this.master);
      osc.start(now);
      osc.stop(now + dur);
    },

    playShoot: function () {
      this._noiseBurst(0.08, 1800, 0.4, 0.25);
      this._tone('square', 220, 40, 0.08, 0.25);
    },

    playEnemyShoot: function () {
      this._noiseBurst(0.06, 1200, 0.6, 0.12);
      this._tone('sawtooth', 180, 30, 0.06, 0.12);
    },

    playHit: function () {
      this._tone('sine', 800, 400, 0.06, 0.15);
    },

    playHurt: function () {
      this._noiseBurst(0.15, 600, 0.5, 0.2);
      this._tone('sawtooth', 150, 60, 0.12, 0.18);
    },

    playReload: function () {
      if (!this.ctx || this.muted) return;
      var now = this.ctx.currentTime;
      // click 1
      var osc1 = this.ctx.createOscillator();
      osc1.type = 'square';
      osc1.frequency.value = 120;
      var g1 = this.ctx.createGain();
      g1.gain.setValueAtTime(0.12, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc1.connect(g1).connect(this.master);
      osc1.start(now);
      osc1.stop(now + 0.05);
      // click 2
      var osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 180;
      var g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.15, now + 0.6);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(g2).connect(this.master);
      osc2.start(now + 0.6);
      osc2.stop(now + 0.65);
    },

    playEmpty: function () {
      this._tone('square', 200, 100, 0.04, 0.08);
    },

    playDefuse: function () {
      this._tone('sine', 300, 600, 0.3, 0.1);
    },

    playWin: function () {
      if (!this.ctx || this.muted) return;
      var now = this.ctx.currentTime;
      var notes = [440, 554, 659, 880];
      for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.connect(g).connect(this.master);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      }
    },

    playLose: function () {
      if (!this.ctx || this.muted) return;
      var now = this.ctx.currentTime;
      var notes = [330, 277, 220, 165];
      for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = notes[i];
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, now + i * 0.15);
        g.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);
        osc.connect(g).connect(this.master);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.35);
      }
    },

    playAlarm: function () {
      this._tone('sawtooth', 440, 880, 0.3, 0.08);
    },
  };

  /* ======================= UTIL ======================= */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function (m) { m.dispose(); });
        } else {
          child.material.dispose();
        }
      }
    });
  }

  /* ======================= SCENE BUILDING ======================= */
  function buildScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x142030);
    scene.fog = new THREE.FogExp2(0x142030, 0.022);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.rotation.order = 'YXZ';

    // Sky dome
    createSkyDome();
    // Lighting
    createLighting();
    // Ground
    createGround();
    // Perimeter walls
    createWalls();
    // Warehouse
    createWarehouse();
    // Containers
    createContainers();
    // Crates
    createCrates();
    // Elevated platform
    createPlatform();
    // Crane (landmark)
    createCrane();
    // Barrels and details
    createBarrels();
    // Bomb device
    createBombDevice();
    // Weapon view model
    createWeaponModel();
    // Enemies
    spawnEnemies();
  }

  function createSkyDome() {
    var geo = new THREE.SphereGeometry(250, 16, 10);
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1525) },
        bottomColor: { value: new THREE.Color(0x2a4060) },
      },
      vertexShader: [
        'varying vec3 vWorldPos;',
        'void main(){',
        '  vec4 wp = modelMatrix * vec4(position,1.0);',
        '  vWorldPos = wp.xyz;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor;',
        'uniform vec3 bottomColor;',
        'varying vec3 vWorldPos;',
        'void main(){',
        '  float h = normalize(vWorldPos).y;',
        '  float t = clamp(max(h,0.0), 0.0, 1.0);',
        '  gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);',
        '}',
      ].join('\n'),
      side: THREE.BackSide,
      fog: false,
    });
    var sky = new THREE.Mesh(geo, mat);
    scene.add(sky);
  }

  function createLighting() {
    var ambient = new THREE.AmbientLight(0x506080, 0.5);
    scene.add(ambient);

    var hemi = new THREE.HemisphereLight(0x6090c0, 0x302010, 0.4);
    scene.add(hemi);

    var dir = new THREE.DirectionalLight(0xffe0b0, 0.85);
    dir.position.set(20, 40, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 100;
    dir.shadow.camera.left = -45;
    dir.shadow.camera.right = 45;
    dir.shadow.camera.top = 45;
    dir.shadow.camera.bottom = -45;
    dir.shadow.bias = -0.0005;
    scene.add(dir);
  }

  function createGround() {
    var S = CONFIG.game.mapSize;
    var geo = new THREE.PlaneGeometry(S * 2.8, S * 2.8, 40, 40);
    geo.rotateX(-Math.PI / 2);
    var colors = [];
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var z = pos.getZ(i);
      var r = 0.14, g = 0.15, b = 0.17;
      var n = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.04;
      r += n; g += n; b += n;
      var gx = Math.abs(x % 5);
      var gz = Math.abs(z % 5);
      if (gx < 0.08 || gz < 0.08) { r *= 0.6; g *= 0.6; b *= 0.6; }
      // Harbor dock wet area
      var distC = Math.sqrt(x * x + z * z);
      if (distC > S * 1.2) { r *= 0.5; g *= 0.55; b *= 0.6; }
      colors.push(r, g, b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function addBox(x, y, z, w, h, d, color, opts) {
    opts = opts || {};
    var geo = new THREE.BoxGeometry(w, h, d);
    var mat = new THREE.MeshLambertMaterial({ color: color });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.shadow !== false;
    mesh.receiveShadow = opts.shadow !== false;
    scene.add(mesh);
    // Collision box (XZ for movement)
    collisionBoxes.push({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
    });
    // Blocker mesh (for bullets/LOS)
    blockerMeshes.push(mesh);
    return mesh;
  }

  function createWalls() {
    var S = CONFIG.game.mapSize;
    var wallH = 6, wallT = 1.5;
    var wallColor = 0x454c55;
    // North wall (with gap for warehouse entrance handled by warehouse)
    addBox(0, 0, -S, S * 2, wallH, wallT, wallColor);
    // South wall
    addBox(0, 0, S, S * 2, wallH, wallT, wallColor);
    // East wall
    addBox(S, 0, 0, wallT, wallH, S * 2, wallColor);
    // West wall
    addBox(-S, 0, 0, wallT, wallH, S * 2, wallColor);

    // Some internal wall segments for cover/navigation
    addBox(-15, 0, 3, 6, 3.5, 1, 0x3a4150);
    addBox(14, 0, -2, 1, 3.5, 6, 0x3a4150);
    addBox(-2, 0, 14, 4, 3, 1, 0x3a4150);
  }

  function createWarehouse() {
    // Main warehouse building (north)
    var body = addBox(0, 0, -20, 18, 7, 10, 0x556070);
    // Roof detail
    var roofGeo = new THREE.BoxGeometry(19, 0.5, 11);
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x3a4258 });
    var roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.25, -20);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);
    // Support beams inside (visible through opening)
    for (var i = -1; i <= 1; i++) {
      var beamGeo = new THREE.BoxGeometry(0.3, 7, 0.3);
      var beamMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
      var beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(i * 5, 3.5, -20);
      beam.castShadow = true;
      scene.add(beam);
    }

    // Small storage building (east)
    addBox(22, 0, 8, 8, 4, 6, 0x4a5565);
  }

  function createContainers() {
    var colors = [0xc04a3a, 0x2a6a9a, 0x3a8a4a, 0xcaa02a, 0x8a4a7a];
    var positions = [
      [-15, 0, -10, 0], [15, 0, -5, 1], [-8, 0, 6, 2],
      [12, 0, 13, 3], [-20, 0, 12, 0], [20, 0, -15, 1],
    ];
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      addBox(p[0], p[1], p[2], 6, 2.6, 2.6, colors[p[3]]);
    }
    // Stacked containers (height variation)
    addBox(-15, 2.6, -10, 6, 2.6, 2.6, 0x8a5a3a);
    addBox(20, 2.6, -15, 6, 2.6, 2.6, 0x3a6a8a);
  }

  function createCrates() {
    var cratePositions = [
      [0, 15], [-3, 15], [5, 8], [-5, -2], [8, -3],
      [-12, 8], [16, 3], [-18, -5], [3, -8], [-10, 18],
    ];
    for (var i = 0; i < cratePositions.length; i++) {
      var p = cratePositions[i];
      var s = 1.4;
      addBox(p[0], 0, p[1], s, s, s, 0x6a4a2a);
    }
    // Small crate stack (height variation)
    addBox(-12, 1.4, 8, 1.2, 1.2, 1.2, 0x5a3a1a);
  }

  function createPlatform() {
    // Loading dock platform (1m high, visual + collision walls)
    var platGeo = new THREE.BoxGeometry(10, 1, 5);
    var platMat = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    var plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(0, 0.5, 0);
    plat.castShadow = true;
    plat.receiveShadow = true;
    scene.add(plat);
    // Ramp (visual)
    var rampGeo = new THREE.BoxGeometry(4, 0.2, 3);
    var rampMat = new THREE.MeshLambertMaterial({ color: 0x333840 });
    var ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 0.1, 3.5);
    ramp.rotation.x = -0.28;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    scene.add(ramp);
    // Crates on platform
    addBox(-3, 1, 0, 1.4, 1.4, 1.4, 0x6a4a2a);
    addBox(3, 1, -1, 1.4, 1.4, 1.4, 0x5a3a1a);
    // Collision walls around platform (so player can't walk through)
    collisionBoxes.push({ minX: -5, maxX: 5, minZ: -2.5, maxZ: 2.5 });
    blockerMeshes.push(plat);
  }

  function createCrane() {
    var group = new THREE.Group();
    // Tower base
    var baseGeo = new THREE.BoxGeometry(2, 20, 2);
    var metalMat = new THREE.MeshLambertMaterial({ color: 0xcc8830 });
    var base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = 10;
    base.castShadow = true;
    group.add(base);
    // Horizontal arm
    var armGeo = new THREE.BoxGeometry(16, 1, 1);
    var arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.set(4, 19, 0);
    arm.castShadow = true;
    group.add(arm);
    // Counterweight
    var cwGeo = new THREE.BoxGeometry(3, 2, 2);
    var cw = new THREE.Mesh(cwGeo, new THREE.MeshLambertMaterial({ color: 0x555555 }));
    cw.position.set(-5, 19, 0);
    cw.castShadow = true;
    group.add(cw);
    // Cable
    var cableGeo = new THREE.BoxGeometry(0.08, 8, 0.08);
    var cable = new THREE.Mesh(cableGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cable.position.set(8, 15, 0);
    group.add(cable);
    // Hook
    var hookGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    var hook = new THREE.Mesh(hookGeo, metalMat);
    hook.position.set(8, 11, 0);
    group.add(hook);
    // Cabin
    var cabinGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    var cabin = new THREE.Mesh(cabinGeo, new THREE.MeshLambertMaterial({ color: 0x4488cc }));
    cabin.position.set(0.5, 16, 0);
    group.add(cabin);

    group.position.set(0, 0, -55);
    scene.add(group);
  }

  function createBarrels() {
    var barrelMat = new THREE.MeshLambertMaterial({ color: 0x3a5a2a });
    var positions = [[-7, 10], [6, 5], [18, 8], [-16, 3]];
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var geo = new THREE.CylinderGeometry(0.4, 0.4, 1, 8);
      var mesh = new THREE.Mesh(geo, barrelMat);
      mesh.position.set(p[0], 0.5, p[1]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      collisionBoxes.push({ minX: p[0] - 0.4, maxX: p[0] + 0.4, minZ: p[1] - 0.4, maxZ: p[1] + 0.4 });
      blockerMeshes.push(mesh);
    }
  }

  /* ======================= BOMB DEVICE ======================= */
  function createBombDevice() {
    var group = new THREE.Group();

    // Base
    var baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.3, 8);
    var baseMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);

    // Main body
    var bodyGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.5, 8);
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a3a4a });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Glowing ring
    var glowGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 8);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.85;
    group.add(glow);

    // Antenna
    var antGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4);
    var antMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var ant = new THREE.Mesh(antGeo, antMat);
    ant.position.y = 1.25;
    group.add(ant);

    // Blinking light on antenna tip
    var blinkGeo = new THREE.SphereGeometry(0.07, 6, 6);
    var blinkMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    var blink = new THREE.Mesh(blinkGeo, blinkMat);
    blink.position.y = 1.65;
    group.add(blink);

    // Wires (small boxes)
    var wireColors = [0xff0000, 0x00ff00, 0xffff00];
    for (var i = 0; i < 3; i++) {
      var wGeo = new THREE.BoxGeometry(0.04, 0.04, 0.6);
      var wMat = new THREE.MeshLambertMaterial({ color: wireColors[i] });
      var wire = new THREE.Mesh(wGeo, wMat);
      wire.position.set(0.3 - i * 0.3, 0.6, 0.1);
      wire.rotation.y = 0.3;
      group.add(wire);
    }

    // Glow light
    var pLight = new THREE.PointLight(0x00ff66, 1.5, 8);
    pLight.position.y = 0.85;
    group.add(pLight);

    // Screen (emissive panel)
    var screenGeo = new THREE.BoxGeometry(0.3, 0.15, 0.02);
    var screenMat = new THREE.MeshBasicMaterial({ color: 0x113355 });
    var screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.65, 0.46);
    group.add(screen);

    group.position.set(bomb.x, bomb.y, bomb.z);
    scene.add(group);

    bomb.group = group;
    bomb.glow = glow;
    bomb.light = pLight;
    bomb.blink = blink;
  }

  /* ======================= WEAPON MODEL ======================= */
  function createWeaponModel() {
    var group = new THREE.Group();

    var darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
    var darkerMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
    var woodMat = new THREE.MeshLambertMaterial({ color: 0x3a2a0e });

    // Receiver
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.28), darkMat);
    group.add(body);

    // Barrel
    var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.18), darkerMat);
    barrel.position.set(0, 0.01, -0.22);
    group.add(barrel);

    // Handguard
    var guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), woodMat);
    guard.position.set(0, 0, -0.15);
    group.add(guard);

    // Magazine
    var mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.06), darkMat);
    mag.position.set(0, -0.09, 0.04);
    group.add(mag);

    // Grip
    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.06), woodMat);
    grip.position.set(0, -0.08, 0.1);
    grip.rotation.x = -0.2;
    group.add(grip);

    // Stock
    var stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.1), woodMat);
    stock.position.set(0, -0.01, 0.16);
    group.add(stock);

    // Front sight
    var sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), darkerMat);
    sight.position.set(0, 0.05, -0.25);
    group.add(sight);

    // Muzzle flash (hidden)
    var flashGeo = new THREE.PlaneGeometry(0.25, 0.25);
    var flashMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    var flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(0, 0.01, -0.34);
    group.add(flash);

    // Muzzle light
    var mLight = new THREE.PointLight(0xffaa33, 0, 4);
    mLight.position.set(0, 0.01, -0.34);
    group.add(mLight);

    // Position weapon in view
    group.position.set(0.22, -0.17, -0.45);
    group.rotation.y = -0.06;
    group.rotation.x = 0.02;

    camera.add(group);

    weaponModel = {
      group: group,
      flash: flash,
      flashMat: flashMat,
      mLight: mLight,
      basePosX: group.position.x,
      basePosY: group.position.y,
      basePosZ: group.position.z,
      recoilZ: 0,
    };
  }

  /* ======================= ENEMY ======================= */
  function createEnemyMesh(bodyColor) {
    var group = new THREE.Group();

    var bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    var headMat = new THREE.MeshLambertMaterial({ color: 0xddc090 });
    var limbMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    var gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var vestMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

    // Torso
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), bodyMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Vest overlay
    var vest = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.5, 0.37), vestMat);
    vest.position.y = 1.2;
    vest.castShadow = true;
    group.add(vest);

    // Head
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), headMat);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    // Helmet
    var helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), bodyMat);
    helmet.position.y = 1.9;
    helmet.castShadow = true;
    group.add(helmet);

    // Arms
    var armGeo = new THREE.BoxGeometry(0.14, 0.6, 0.14);
    var leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.38, 1.15, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.38, 1.15, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Legs
    var legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    var leftLeg = new THREE.Mesh(legGeo, limbMat);
    leftLeg.position.set(-0.15, 0.5, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    var rightLeg = new THREE.Mesh(legGeo, limbMat);
    rightLeg.position.set(0.15, 0.5, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Weapon
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), gunMat);
    gun.position.set(0.38, 1.15, 0.15);
    group.add(gun);

    // Muzzle flash (hidden)
    var flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    var eFlash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMat);
    eFlash.position.set(0.38, 1.15, 0.35);
    group.add(eFlash);

    // Hit box (invisible but raycastable)
    var hitMat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false,
    });
    var hitMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.5), hitMat);
    hitMesh.position.y = 0.95;
    group.add(hitMesh);

    // HP bar (above head, always faces camera-ish via simple planes)
    var barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x330000, depthTest: false, transparent: true, opacity: 0.7 })
    );
    barBg.position.y = 2.3;
    barBg.renderOrder = 999;
    group.add(barBg);

    var barFg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff3333, depthTest: false, transparent: true, opacity: 0.9 })
    );
    barFg.position.y = 2.3;
    barFg.position.z = 0.01;
    barFg.renderOrder = 1000;
    group.add(barFg);

    return {
      group: group,
      hitMesh: hitMesh,
      flash: eFlash,
      flashMat: flashMat,
      barBg: barBg,
      barFg: barFg,
      barFgMat: barFg.material,
      hpBarWidth: 0.76,
    };
  }

  function spawnEnemies() {
    var configs = [
      { x: -12, z: -5, color: 0xcc4433, waypoints: [[-12, -5], [-15, 0], [-10, 5], [-15, 10]] },
      { x: 8, z: 0, color: 0x3344cc, waypoints: [[8, 0], [5, 5], [10, 8], [5, -5]] },
      { x: -3, z: -15, color: 0xcc33aa, waypoints: [[-3, -15], [3, -12], [-3, -10], [-8, -15]] },
      { x: 15, z: -10, color: 0x44aa33, waypoints: [[15, -10], [18, -5], [12, -5], [18, -12]] },
      { x: 0, z: -22, color: 0xaa6633, waypoints: [[0, -22], [3, -20], [-3, -20]] },
    ];

    for (var i = 0; i < configs.length; i++) {
      var c = configs[i];
      var mesh = createEnemyMesh(c.color);
      mesh.group.position.set(c.x, 0, c.z);
      scene.add(mesh.group);

      var enemy = {
        id: 'e' + (i + 1),
        x: c.x, y: 0, z: c.z,
        hp: CONFIG.enemy.hp,
        maxHp: CONFIG.enemy.hp,
        state: 'patrol',       // patrol | alert | chase | attack | hit | dead
        alive: true,
        waypointIdx: 0,
        waypoints: c.waypoints,
        fireTimer: 0,
        firstShotTimer: 0,
        alertTimer: 0,
        loseSightTimer: 0,
        hitTimer: 0,
        prevColor: c.color,
        bodyMaterial: mesh.group.children[0].material, // torso material
        mesh: mesh,
        moveTarget: null,
        walkPhase: 0,
        hpBarVisible: false,
        deadTimer: 0,
      };
      // Hide HP bar initially
      mesh.barBg.visible = false;
      mesh.barFg.visible = false;
      enemies.push(enemy);
    }
  }

  /* ======================= COLLISION ======================= */
  function checkCollision(x, z) {
    var r = CONFIG.player.radius;
    for (var i = 0; i < collisionBoxes.length; i++) {
      var box = collisionBoxes[i];
      var cx = clamp(x, box.minX, box.maxX);
      var cz = clamp(z, box.minZ, box.maxZ);
      var dx = x - cx;
      var dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    // Map bounds
    var S = CONFIG.game.mapSize - 1.5;
    if (x < -S + r || x > S - r || z < -S + r || z > S - r) return true;
    return false;
  }

  function applyMovement(dx, dz) {
    // Try X first
    if (!checkCollision(player.x + dx, player.z)) {
      player.x += dx;
    }
    // Then Z
    if (!checkCollision(player.x, player.z + dz)) {
      player.z += dz;
    }
    // Clamp to ground
    player.y = 0;
  }

  function syncCamera() {
    camera.position.set(player.x, player.y + CONFIG.player.eyeHeight, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }

  /* ======================= SHOOTING ======================= */
  function playerShoot() {
    if (game.phase !== 'playing' || game.paused) return;
    if (player.reloading) return;
    if (player.ammo <= 0) {
      AudioSys.playEmpty();
      return;
    }
    if (player.fireCooldown > 0) return;
    player.fireCooldown = CONFIG.weapon.fireRate;
    player.ammo--;
    game.shotsFired++;

    // Muzzle flash
    if (weaponModel) {
      weaponModel.flashMat.opacity = 0.9;
      weaponModel.mLight.intensity = 3;
      weaponModel.recoilZ = 0.04;
      muzzleFlashTime = 0.06;
    }

    // Raycast from camera center
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = CONFIG.weapon.range;

    // Check enemy hits
    var hitEnemy = null;
    var hitDist = Infinity;
    var enemyMeshes = [];
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) enemyMeshes.push(enemies[i].mesh.hitMesh);
    }
    if (enemyMeshes.length > 0) {
      var enemyHits = raycaster.intersectObjects(enemyMeshes, false);
      if (enemyHits.length > 0) {
        hitDist = enemyHits[0].distance;
        // Find which enemy
        for (var j = 0; j < enemies.length; j++) {
          if (enemies[j].mesh.hitMesh === enemyHits[0].object) {
            hitEnemy = enemies[j];
            break;
          }
        }
      }
    }

    // Check wall hits
    var wallDist = Infinity;
    if (blockerMeshes.length > 0) {
      var wallHits = raycaster.intersectObjects(blockerMeshes, false);
      if (wallHits.length > 0) {
        wallDist = wallHits[0].distance;
      }
    }

    // Determine result
    var endPoint;
    if (hitEnemy && hitDist < wallDist) {
      // Hit enemy
      damageEnemy(hitEnemy, CONFIG.weapon.damage);
      game.hits++;
      showHitMarker();
      endPoint = enemyHits[0].point.clone();
      createHitSpark(endPoint, 0xff8833);
      AudioSys.playHit();
    } else if (wallDist < Infinity) {
      // Hit wall
      endPoint = wallHits[0].point.clone();
      createHitSpark(endPoint, 0xaaaaaa);
    } else {
      // Missed (shot into sky)
      var dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      endPoint = camera.position.clone().add(dir.multiplyScalar(CONFIG.weapon.range));
    }

    // Tracer
    var muzzlePos = new THREE.Vector3();
    if (weaponModel && weaponModel.flash) {
      weaponModel.flash.getWorldPosition(muzzlePos);
    } else {
      muzzlePos.copy(camera.position);
    }
    createTracer(muzzlePos, endPoint, 0xffdd66);

    // Recoil
    player.pitch += CONFIG.weapon.recoilPitch;
    player.yaw += (Math.random() - 0.5) * CONFIG.weapon.recoilYaw * 2;
    clampPitch();

    // Sound
    AudioSys.playShoot();

    // Check if out of ammo
    if (player.ammo <= 0) {
      // Auto-reload hint
    }
  }

  function startReload() {
    if (game.phase !== 'playing' || game.paused) return;
    if (player.reloading) return;
    if (player.ammo >= CONFIG.weapon.magSize) return;
    if (player.reserve <= 0) return;
    player.reloading = true;
    player.reloadTimer = CONFIG.weapon.reloadTime;
    AudioSys.playReload();
  }

  function updateWeapon(dt) {
    // Fire cooldown
    if (player.fireCooldown > 0) {
      player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    }

    // Reload
    if (player.reloading) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        var needed = CONFIG.weapon.magSize - player.ammo;
        var taken = Math.min(needed, player.reserve);
        player.ammo += taken;
        player.reserve -= taken;
        player.reloading = false;
      }
    }

    // Muzzle flash fade
    if (weaponModel) {
      if (weaponModel.flashMat.opacity > 0) {
        weaponModel.flashMat.opacity *= Math.pow(0.001, dt);
        if (weaponModel.flashMat.opacity < 0.01) weaponModel.flashMat.opacity = 0;
      }
      if (weaponModel.mLight.intensity > 0) {
        weaponModel.mLight.intensity *= Math.pow(0.001, dt);
        if (weaponModel.mLight.intensity < 0.01) weaponModel.mLight.intensity = 0;
      }
      // Randomize flash rotation for variety
      if (weaponModel.flashMat.opacity > 0.1) {
        weaponModel.flash.rotation.z = Math.random() * Math.PI * 2;
        weaponModel.flash.scale.setScalar(0.8 + Math.random() * 0.6);
      }
      // Recoil recovery
      if (weaponModel.recoilZ > 0) {
        weaponModel.recoilZ = Math.max(0, weaponModel.recoilZ - dt * 0.3);
      }
      weaponModel.group.position.z = weaponModel.basePosZ + weaponModel.recoilZ;
    }

    // Continuous fire
    if (input.firing) {
      playerShoot();
    }
  }

  /* ======================= ENEMY AI ======================= */
  function hasLOS(from, to) {
    var dir = new THREE.Vector3().subVectors(to, from);
    var dist = dir.length();
    if (dist < 0.01) return true;
    dir.normalize();
    var raycaster = new THREE.Raycaster(from, dir, 0, dist);
    var hits = raycaster.intersectObjects(blockerMeshes, false);
    return hits.length === 0;
  }

  function getEnemyEyePos(enemy) {
    return new THREE.Vector3(enemy.x, 1.7, enemy.z);
  }

  function getPlayerPos() {
    return new THREE.Vector3(player.x, player.y + CONFIG.player.eyeHeight, player.z);
  }

  function distToPlayer(enemy) {
    var dx = enemy.x - player.x;
    var dz = enemy.z - player.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) {
        // Death animation
        if (e.deadTimer < 1.0) {
          e.deadTimer += dt;
          var t = Math.min(1, e.deadTimer / 0.5);
          e.mesh.group.rotation.x = -t * Math.PI / 2.2;
          e.mesh.group.position.y = -t * 0.3;
        }
        continue;
      }
      updateEnemy(e, dt);
    }
  }

  function updateEnemy(e, dt) {
    var dist = distToPlayer(e);
    var eyePos = getEnemyEyePos(e);
    var playerPos = getPlayerPos();
    var canSee = dist < CONFIG.enemy.detectRange && hasLOS(eyePos, playerPos);

    // State machine
    switch (e.state) {
      case 'patrol':
        // Patrol between waypoints
        patrolMove(e, dt);
        // Walk animation
        e.walkPhase += dt * 4;
        animateLegs(e);
        // Check detection
        if (canSee) {
          e.state = 'alert';
          e.alertTimer = 0;
          e.firstShotTimer = rand(CONFIG.enemy.firstShotDelay[0], CONFIG.enemy.firstShotDelay[1]);
          e.mesh.barBg.visible = true;
          e.mesh.barFg.visible = true;
        }
        break;

      case 'alert':
        // Turn toward player, brief delay
        facePlayer(e, dt);
        e.alertTimer += dt;
        e.firstShotTimer -= dt;
        if (e.alertTimer >= CONFIG.enemy.alertDuration) {
          e.state = 'chase';
        }
        if (!canSee && e.alertTimer > 2) {
          e.state = 'patrol';
          e.mesh.barBg.visible = false;
          e.mesh.barFg.visible = false;
        }
        break;

      case 'chase':
        // Move toward player
        moveTowardPlayer(e, dt);
        e.walkPhase += dt * 5;
        animateLegs(e);
        facePlayer(e, dt);
        if (canSee && dist < CONFIG.enemy.attackRange) {
          e.state = 'attack';
          e.fireTimer = e.firstShotTimer;
        }
        if (!canSee) {
          e.loseSightTimer += dt;
          if (e.loseSightTimer > CONFIG.enemy.loseInterestTime) {
            e.state = 'patrol';
            e.mesh.barBg.visible = false;
            e.mesh.barFg.visible = false;
            e.loseSightTimer = 0;
          }
        } else {
          e.loseSightTimer = 0;
        }
        break;

      case 'attack':
        facePlayer(e, dt);
        // Check if should reposition
        if (!canSee) {
          e.state = 'chase';
          break;
        }
        if (dist < CONFIG.enemy.minShootDist) {
          // Too close, back off
          moveAwayFromPlayer(e, dt);
        } else if (dist > CONFIG.enemy.attackRange) {
          e.state = 'chase';
          break;
        }
        // Strafe slightly
        strafe(e, dt);
        // Shoot
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          enemyShoot(e);
          e.fireTimer = rand(CONFIG.enemy.fireInterval[0], CONFIG.enemy.fireInterval[1]);
        }
        break;

      case 'hit':
        e.hitTimer -= dt;
        facePlayer(e, dt * 0.3);
        if (e.hitTimer <= 0) {
          e.state = canSee ? 'chase' : 'patrol';
        }
        break;
    }

    // Update HP bar
    if (e.mesh.barBg.visible) {
      var hpFrac = e.hp / e.maxHp;
      e.mesh.barFg.scale.x = Math.max(0.001, hpFrac);
      e.mesh.barFg.position.x = -(1 - hpFrac) * e.mesh.hpBarWidth * 0.5;
      e.mesh.barFgMat.color.setHex(hpFrac > 0.5 ? 0x33ff33 : (hpFrac > 0.25 ? 0xffaa33 : 0xff3333));
      // Face camera
      e.mesh.barBg.lookAt(camera.position);
      e.mesh.barFg.lookAt(camera.position);
    }

    // Update mesh position
    e.mesh.group.position.set(e.x, e.y, e.z);

    // Muzzle flash fade
    if (e.mesh.flashMat.opacity > 0) {
      e.mesh.flashMat.opacity *= Math.pow(0.001, dt);
      if (e.mesh.flashMat.opacity < 0.01) e.mesh.flashMat.opacity = 0;
    }
  }

  function patrolMove(e, dt) {
    var wp = e.waypoints[e.waypointIdx];
    var tx = wp[0], tz = wp[1];
    var dx = tx - e.x, dz = tz - e.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.5) {
      e.waypointIdx = (e.waypointIdx + 1) % e.waypoints.length;
      return;
    }
    var nx = dx / d, nz = dz / d;
    var speed = CONFIG.enemy.speed * 0.5;
    tryMoveEnemy(e, nx * speed * dt, nz * speed * dt);
    // Face direction
    e.mesh.group.rotation.y = Math.atan2(-nx, -nz);
  }

  function moveTowardPlayer(e, dt) {
    var dx = player.x - e.x, dz = player.z - e.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.5) return;
    var nx = dx / d, nz = dz / d;
    var speed = CONFIG.enemy.speed;
    tryMoveEnemy(e, nx * speed * dt, nz * speed * dt);
  }

  function moveAwayFromPlayer(e, dt) {
    var dx = e.x - player.x, dz = e.z - player.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.1) return;
    var nx = dx / d, nz = dz / d;
    var speed = CONFIG.enemy.speed * 0.7;
    tryMoveEnemy(e, nx * speed * dt, nz * speed * dt);
  }

  function strafe(e, dt) {
    var dx = player.x - e.x, dz = player.z - e.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.1) return;
    // Perpendicular direction
    var px = -dz / d, pz = dx / d;
    var dir = Math.sin(e.walkPhase * 0.3) > 0 ? 1 : -1;
    var speed = CONFIG.enemy.speed * 0.4;
    tryMoveEnemy(e, px * dir * speed * dt, pz * dir * speed * dt);
    e.walkPhase += dt;
  }

  function tryMoveEnemy(e, dx, dz) {
    // Simple collision: check new position
    var newX = e.x + dx;
    var newZ = e.z + dz;
    var blocked = false;
    for (var i = 0; i < collisionBoxes.length; i++) {
      var box = collisionBoxes[i];
      var cx = clamp(newX, box.minX, box.maxX);
      var cz = clamp(newZ, box.minZ, box.maxZ);
      var ddx = newX - cx, ddz = newZ - cz;
      if (ddx * ddx + ddz * ddz < 0.25) { blocked = true; break; }
    }
    if (!blocked) {
      var S = CONFIG.game.mapSize - 2;
      if (newX > -S && newX < S && newZ > -S && newZ < S) {
        e.x = newX;
        e.z = newZ;
      }
    }
  }

  function facePlayer(e, dt) {
    var targetYaw = Math.atan2(e.x - player.x, e.z - player.z);
    var diff = targetYaw - e.mesh.group.rotation.y;
    // Normalize angle
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    e.mesh.group.rotation.y += diff * Math.min(1, dt * 8);
  }

  function animateLegs(e) {
    // Simple leg swing (children order: torso=0,vest=1,head=2,helmet=3,lArm=4,rArm=5,lLeg=6,rLeg=7)
    var swing = Math.sin(e.walkPhase) * 0.3;
    var leftLeg = e.mesh.group.children[6];
    var rightLeg = e.mesh.group.children[7];
    if (leftLeg) leftLeg.rotation.x = swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    // Arm swing
    var leftArm = e.mesh.group.children[4];
    var rightArm = e.mesh.group.children[5];
    if (leftArm) leftArm.rotation.x = -swing * 0.5;
    if (rightArm) rightArm.rotation.x = swing * 0.5;
  }

  function enemyShoot(e) {
    var eyePos = getEnemyEyePos(e);
    var playerPos = getPlayerPos();
    // Check LOS
    if (!hasLOS(eyePos, playerPos)) return;

    // Muzzle flash
    e.mesh.flashMat.opacity = 0.9;
    e.mesh.flash.rotation.z = Math.random() * Math.PI * 2;
    e.mesh.flash.scale.setScalar(0.8 + Math.random() * 0.5);

    // Tracer toward player (with some spread)
    var dir = new THREE.Vector3().subVectors(playerPos, eyePos).normalize();
    var spread = 0.05;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    var dist = distToPlayer(e);
    var endPoint = eyePos.clone().add(dir.clone().multiplyScalar(dist + 2));
    createTracer(eyePos.clone().add(new THREE.Vector3(0, 0, 0.1)), endPoint, 0xff6633);

    // Hit chance
    var hitChance = CONFIG.enemy.hitChance;
    if (dist > 15) hitChance -= 0.1;
    if (dist > 20) hitChance -= 0.1;
    hitChance = clamp(hitChance, 0.2, 0.8);

    if (Math.random() < hitChance) {
      // Hit player
      var dmg = rand(CONFIG.enemy.damage[0], CONFIG.enemy.damage[1]);
      damagePlayer(dmg);
    } else {
      // Miss - spark near player
      createHitSpark(endPoint, 0xff6633);
    }

    AudioSys.playEnemyShoot();
  }

  function damageEnemy(e, damage) {
    if (!e.alive) return;
    e.hp -= damage;
    // Flash red
    e.bodyMaterial.emissive = new THREE.Color(0xff0000);
    e.bodyMaterial.emissiveIntensity = 0.5;
    setTimeout(function () {
      if (e.alive || e.mesh.group.parent) {
        e.bodyMaterial.emissive = new THREE.Color(0x000000);
        e.bodyMaterial.emissiveIntensity = 0;
      }
    }, 80);

    // Show HP bar
    e.mesh.barBg.visible = true;
    e.mesh.barFg.visible = true;

    if (e.hp <= 0) {
      killEnemy(e);
    } else {
      // Go to hit state if in patrol
      if (e.state === 'patrol') {
        e.state = 'alert';
        e.alertTimer = 0;
        e.firstShotTimer = rand(0.3, 0.6);
      } else if (e.state !== 'hit') {
        // Brief stagger
        e.hitTimer = 0.15;
        e.state = 'hit';
      }
    }
  }

  function killEnemy(e) {
    e.alive = false;
    e.hp = 0;
    e.state = 'dead';
    e.deadTimer = 0;
    game.kills++;
    // Hide HP bar
    e.mesh.barBg.visible = false;
    e.mesh.barFg.visible = false;
    // Make hit mesh non-raycastable (set material to undefined won't work, so we remove it)
    e.mesh.hitMesh.material = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, visible: false
    });
    // Check if all dead
    var allDead = true;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) { allDead = false; break; }
    }
    if (allDead) {
      game.allClear = true;
      showNotification('区域清除！前往装置拆除');
      AudioSys.playAlarm();
    }
  }

  /* ======================= EFFECTS ======================= */
  function createTracer(from, to, color) {
    var dir = new THREE.Vector3().subVectors(to, from);
    var length = dir.length();
    if (length < 0.01) return;
    var geo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
    var mat = new THREE.MeshBasicMaterial({
      color: color, transparent: true, opacity: 0.7, fog: false, depthWrite: false,
    });
    var mesh = new THREE.Mesh(geo, mat);
    // Position at midpoint
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    // Orient: cylinder default is along Y, need to align with dir
    mesh.lookAt(to);
    mesh.rotateX(Math.PI / 2);
    scene.add(mesh);
    tracers.push({ mesh: mesh, life: 0.08, maxLife: 0.08, geo: geo, mat: mat });
  }

  function createHitSpark(pos, color) {
    var count = reducedMotion ? 3 : 6;
    for (var i = 0; i < count; i++) {
      var geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      var mat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 1, fog: false, depthWrite: false,
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      var vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 3
      );
      scene.add(mesh);
      sparks.push({ mesh: mesh, vel: vel, life: 0.3, maxLife: 0.3, geo: geo, mat: mat });
    }
  }

  function updateEffects(dt) {
    // Tracers
    for (var i = tracers.length - 1; i >= 0; i--) {
      var t = tracers[i];
      t.life -= dt;
      t.mat.opacity = (t.life / t.maxLife) * 0.7;
      if (t.life <= 0) {
        scene.remove(t.mesh);
        t.geo.dispose();
        t.mat.dispose();
        tracers.splice(i, 1);
      }
    }
    // Sparks
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.life -= dt;
      s.vel.y -= 6 * dt;
      s.mesh.position.x += s.vel.x * dt;
      s.mesh.position.y += s.vel.y * dt;
      s.mesh.position.z += s.vel.z * dt;
      s.mat.opacity = s.life / s.maxLife;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        s.geo.dispose();
        s.mat.dispose();
        sparks.splice(j, 1);
      }
    }
  }

  function showHitMarker() {
    var el = $('hitmarker');
    if (!el) return;
    el.classList.remove('hidden');
    clearTimeout(showHitMarker._t);
    showHitMarker._t = setTimeout(function () { el.classList.add('hidden'); }, 150);
  }

  function showDamageVignette() {
    var el = $('damage-vignette');
    if (!el) return;
    el.classList.add('active');
    clearTimeout(showDamageVignette._t);
    showDamageVignette._t = setTimeout(function () { el.classList.remove('active'); }, 300);
  }

  /* ======================= PLAYER DAMAGE ======================= */
  function damagePlayer(amount) {
    if (game.phase !== 'playing' || game.paused) return;
    player.hp -= amount;
    showDamageVignette();
    AudioSys.playHurt();
    if (player.hp <= 0) {
      player.hp = 0;
      loseGame('killed');
    }
  }

  /* ======================= BOMB UPDATE ======================= */
  function updateBomb(dt) {
    if (!bomb.group) return;
    bomb.pulseTime += dt;

    // Pulsing glow
    var pulse = 0.5 + Math.sin(bomb.pulseTime * 3) * 0.5;
    if (bomb.glow) {
      bomb.glow.scale.setScalar(0.9 + pulse * 0.2);
    }
    if (bomb.light) {
      bomb.light.intensity = 1.0 + pulse * 1.5;
    }
    // Blinking light
    if (bomb.blink) {
      bomb.blink.visible = Math.sin(bomb.pulseTime * 8) > 0;
    }

    // Defuse interaction
    if (input.interactHeld && game.allClear && !bomb.defused) {
      var dist = Math.sqrt(
        Math.pow(player.x - bomb.x, 2) + Math.pow(player.z - bomb.z, 2)
      );
      if (dist <= CONFIG.bomb.defuseRange) {
        bomb.progress += dt;
        if (bomb.progress >= CONFIG.bomb.defuseTime) {
          bomb.progress = CONFIG.bomb.defuseTime;
          bomb.defused = true;
          winGame();
        }
      } else {
        // Out of range: reset
        bomb.progress = 0;
      }
    } else if (!input.interactHeld) {
      // Not holding: don't advance, don't reset (freeze)
      // But if moved out of range while holding, it resets in the above branch
    }

    // Check if player can interact
    var dist2 = Math.sqrt(
      Math.pow(player.x - bomb.x, 2) + Math.pow(player.z - bomb.z, 2)
    );
    var canInteract = game.allClear && dist2 <= CONFIG.bomb.defuseRange;
    var prompt = $('interact-prompt');
    if (canInteract && !bomb.defused && game.phase === 'playing') {
      prompt.classList.remove('hidden');
    } else {
      prompt.classList.add('hidden');
    }

    // Update defuse bar
    var defuseContainer = $('defuse-bar-container');
    if (bomb.progress > 0 && !bomb.defused) {
      defuseContainer.classList.remove('hidden');
      var pct = (bomb.progress / CONFIG.bomb.defuseTime) * 100;
      $('defuse-bar').style.setProperty('--defuse-progress', pct + '%');
    } else {
      defuseContainer.classList.add('hidden');
    }
  }

  function tickDefuse(dt) {
    if (game.phase !== 'playing' || game.paused) return bomb.progress;
    if (!game.allClear || bomb.defused) return bomb.progress;
    var dist = Math.sqrt(
      Math.pow(player.x - bomb.x, 2) + Math.pow(player.z - bomb.z, 2)
    );
    if (dist > CONFIG.bomb.defuseRange) return 0;
    bomb.progress += dt;
    if (bomb.progress >= CONFIG.bomb.defuseTime) {
      bomb.progress = CONFIG.bomb.defuseTime;
      bomb.defused = true;
      winGame();
    }
    return bomb.progress;
  }

  /* ======================= HUD ======================= */
  function updateHUD() {
    // Health
    var hpPct = (player.hp / CONFIG.player.maxHp) * 100;
    $('health-bar').style.width = hpPct + '%';
    $('health-text').textContent = Math.ceil(player.hp);

    // Timer
    $('timer-text').textContent = Math.ceil(Math.max(0, game.timeLeft));

    // Enemies
    var alive = 0;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) alive++;
    }
    $('enemy-text').textContent = alive + ' / ' + enemies.length;

    // Ammo
    $('ammo-mag').textContent = player.ammo;
    $('ammo-reserve').textContent = player.reserve;
    var reloadInd = $('reload-indicator');
    if (player.reloading) {
      reloadInd.classList.remove('hidden');
    } else {
      reloadInd.classList.add('hidden');
    }

    // Objective text
    var objText = $('obj-text');
    if (game.allClear) {
      objText.textContent = '拆除装置 / DEFUSE DEVICE';
    } else {
      objText.textContent = '清除敌人 / ELIMINATE HOSTILES';
    }

    // Objective marker
    updateObjectiveMarker();
  }

  function updateObjectiveMarker() {
    var marker = $('objective-marker');
    var label = $('obj-label');
    if (!bomb.group) { marker.classList.remove('visible'); return; }

    var worldPos = new THREE.Vector3(bomb.x, 1.5, bomb.z);
    var camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    var toObj = new THREE.Vector3().subVectors(worldPos, camera.position);
    var dot = camDir.dot(toObj);

    if (dot > 0) {
      var projected = worldPos.clone().project(camera);
      var x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      var y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      marker.style.left = x + 'px';
      marker.style.top = y + 'px';
      marker.classList.add('visible');
      if (game.allClear) {
        label.textContent = '拆除 / DEFUSE';
        marker.querySelector('.obj-icon').style.background = '#4ae86b';
      } else {
        label.textContent = '装置 / DEVICE';
        marker.querySelector('.obj-icon').style.background = '#e8a83a';
      }
    } else {
      marker.classList.remove('visible');
    }
  }

  function showNotification(text) {
    var area = $('notif-area');
    if (!area) return;
    var div = document.createElement('div');
    div.className = 'notif';
    div.textContent = text;
    area.appendChild(div);
    setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 3000);
  }

  /* ======================= GAME STATE ======================= */
  function startGame() {
    AudioSys.init();
    AudioSys.resume();
    game.phase = 'playing';
    game.paused = false;
    game.timeLeft = CONFIG.game.timeLimit;
    game.elapsedTime = 0;
    game.allClear = false;
    game.shotsFired = 0;
    game.hits = 0;
    game.kills = 0;

    // Reset player
    player.x = 0;
    player.y = 0;
    player.z = 22;
    player.yaw = 0;
    player.pitch = 0;
    player.hp = CONFIG.player.maxHp;
    player.ammo = CONFIG.weapon.magSize;
    player.reserve = CONFIG.weapon.reserve;
    player.reloading = false;
    player.reloadTimer = 0;
    player.fireCooldown = 0;
    player.lastShot = 0;
    player.interacting = false;

    // Reset bomb
    bomb.progress = 0;
    bomb.defused = false;

    // Reset input
    input.forward = 0;
    input.right = 0;
    input.firing = false;
    input.interactHeld = false;

    // UI
    $('menu-screen').classList.add('hidden');
    $('pause-screen').classList.add('hidden');
    $('win-screen').classList.add('hidden');
    $('lose-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    if (isTouchDevice) {
      $('mobile-controls').classList.remove('hidden');
    }

    syncCamera();
    showNotification('清除全部敌人后拆除装置');
    setTimeout(function () {
      if (game.phase === 'playing') {
        showNotification('前往北侧发光装置');
      }
    }, 2500);
  }

  function pauseGame() {
    if (game.phase !== 'playing') return;
    game.paused = true;
    game.phase = 'paused';
    $('pause-screen').classList.remove('hidden');
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  function resumeGame() {
    if (game.phase !== 'paused') return;
    game.paused = false;
    game.phase = 'playing';
    $('pause-screen').classList.add('hidden');
    // Try to re-acquire pointer lock
    if (!isTouchDevice && !pointerLocked) {
      try { canvas.requestPointerLock(); } catch (e) {}
    }
  }

  function winGame() {
    if (game.phase === 'win' || game.phase === 'lose') return;
    game.phase = 'win';
    game.paused = false;
    input.firing = false;
    input.interactHeld = false;

    var usedTime = CONFIG.game.timeLimit - game.timeLeft;
    AudioSys.playWin();

    // Save best time
    if (game.bestTime === null || usedTime < game.bestTime) {
      game.bestTime = usedTime;
      try {
        localStorage.setItem('breachpoint_besttime', usedTime.toString());
      } catch (e) {}
    }

    // Show stats
    var accuracy = game.shotsFired > 0 ? Math.round(game.hits / game.shotsFired * 100) : 0;
    var score = Math.round(10000 - usedTime * 50 - (game.shotsFired - game.hits) * 100);
    score = Math.max(100, score);
    $('win-stats').innerHTML =
      '<div class="stat-row"><span class="stat-label">用时 / Time</span><span class="stat-val">' + usedTime.toFixed(1) + 's</span></div>' +
      '<div class="stat-row"><span class="stat-label">击杀 / Kills</span><span class="stat-val">' + game.kills + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">射击 / Shots</span><span class="stat-val">' + game.shotsFired + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">命中 / Hits</span><span class="stat-val">' + game.hits + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">精度 / Accuracy</span><span class="stat-val">' + accuracy + '%</span></div>' +
      '<div class="stat-row"><span class="stat-label">得分 / Score</span><span class="stat-val">' + score + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">最佳 / Best</span><span class="stat-val">' + (game.bestTime !== null ? game.bestTime.toFixed(1) + 's' : '—') + '</span></div>';

    $('win-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('mobile-controls').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function loseGame(reason) {
    if (game.phase === 'win' || game.phase === 'lose') return;
    game.phase = 'lose';
    game.paused = false;
    input.firing = false;
    input.interactHeld = false;

    AudioSys.playLose();
    $('lose-title').textContent = reason === 'time' ? '时间耗尽 / TIME UP' : '任务失败 / MISSION FAILED';

    var accuracy = game.shotsFired > 0 ? Math.round(game.hits / game.shotsFired * 100) : 0;
    $('lose-stats').innerHTML =
      '<div class="stat-row"><span class="stat-label">击杀 / Kills</span><span class="stat-val">' + game.kills + ' / ' + enemies.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">射击 / Shots</span><span class="stat-val">' + game.shotsFired + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">命中 / Hits</span><span class="stat-val">' + game.hits + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">精度 / Accuracy</span><span class="stat-val">' + accuracy + '%</span></div>';

    $('lose-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('mobile-controls').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function restartGame() {
    // Clear scene
    clearScene();
    // Rebuild
    buildScene();
    // Start
    startGame();
  }

  function quitToMenu() {
    game.phase = 'menu';
    game.paused = false;
    clearScene();
    buildScene();
    $('pause-screen').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('mobile-controls').classList.add('hidden');
    $('menu-screen').classList.remove('hidden');
    updateBestTimeDisplay();
  }

  function clearScene() {
    if (scene) {
      while (scene.children.length > 0) {
        var child = scene.children[0];
        scene.remove(child);
        disposeObject(child);
      }
    }
    if (camera) {
      while (camera.children.length > 0) {
        var c = camera.children[0];
        camera.remove(c);
        disposeObject(c);
      }
    }
    // Clear arrays
    for (var i = tracers.length - 1; i >= 0; i--) {
      var t = tracers[i];
      if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
      t.geo.dispose();
      t.mat.dispose();
    }
    tracers = [];
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      s.geo.dispose();
      s.mat.dispose();
    }
    sparks = [];
    enemies = [];
    collisionBoxes = [];
    blockerMeshes = [];
    weaponModel = null;
  }

  function clampPitch() {
    player.pitch = clamp(player.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  }

  /* ======================= UPDATE ======================= */
  function update(dt) {
    if (game.phase !== 'playing') return;

    // Player movement from input (keyboard/touch)
    if (input.forward !== 0 || input.right !== 0) {
      var speed = CONFIG.player.speed;
      var fx = -Math.sin(player.yaw);
      var fz = -Math.cos(player.yaw);
      var rx = Math.cos(player.yaw);
      var rz = -Math.sin(player.yaw);
      var dx = (input.forward * fx + input.right * rx) * speed * dt;
      var dz = (input.forward * fz + input.right * rz) * speed * dt;
      applyMovement(dx, dz);
    }

    // Touch look
    if (touchLookDelta.x !== 0 || touchLookDelta.y !== 0) {
      player.yaw -= touchLookDelta.x * CONFIG.player.touchLookSensitivity;
      player.pitch -= touchLookDelta.y * CONFIG.player.touchLookSensitivity;
      clampPitch();
      touchLookDelta.x = 0;
      touchLookDelta.y = 0;
    }

    // Weapon
    updateWeapon(dt);

    // Enemies
    updateEnemies(dt);

    // Bomb
    updateBomb(dt);

    // Timer
    game.timeLeft -= dt;
    game.elapsedTime += dt;
    if (game.timeLeft <= 0) {
      game.timeLeft = 0;
      loseGame('time');
      return;
    }

    // Effects
    updateEffects(dt);

    // Camera
    syncCamera();

    // HUD
    updateHUD();
  }

  /* ======================= MAIN LOOP ======================= */
  function gameLoop(timestamp) {
    rafId = requestAnimationFrame(gameLoop);
    if (game.manualClock) return; // Don't advance in manual mode
    if (game.phase !== 'playing') {
      // Still render
      if (scene && camera && renderer) {
        // Update bomb pulse even when paused? No - only when playing
        renderer.render(scene, camera);
      }
      return;
    }
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1; // Cap delta
    update(dt);
    renderer.render(scene, camera);
  }

  /* ======================= INPUT ======================= */
  function setupInput() {
    // Keyboard
    var keyMap = {
      'KeyW': 'forward', 'ArrowUp': 'forward',
      'KeyS': 'back', 'ArrowDown': 'back',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'KeyR': 'reload',
      'KeyE': 'interact',
      'Escape': 'pause',
    };

    window.addEventListener('keydown', function (e) {
      var action = keyMap[e.code];
      if (!action) return;
      e.preventDefault();
      if (game.phase !== 'playing' && game.phase !== 'paused') return;
      if (action === 'pause') {
        if (game.phase === 'playing') pauseGame();
        else if (game.phase === 'paused') resumeGame();
        return;
      }
      if (game.phase !== 'playing' || game.paused) return;
      switch (action) {
        case 'forward': input.forward = 1; break;
        case 'back': input.forward = -1; break;
        case 'left': input.right = -1; break;
        case 'right': input.right = 1; break;
        case 'reload': startReload(); break;
        case 'interact': input.interactHeld = true; break;
      }
    });

    window.addEventListener('keyup', function (e) {
      var action = keyMap[e.code];
      if (!action) return;
      switch (action) {
        case 'forward': if (input.forward > 0) input.forward = 0; break;
        case 'back': if (input.forward < 0) input.forward = 0; break;
        case 'left': if (input.right < 0) input.right = 0; break;
        case 'right': if (input.right > 0) input.right = 0; break;
        case 'interact': input.interactHeld = false; break;
      }
    });

    // Pointer lock
    document.addEventListener('pointerlockchange', function () {
      pointerLocked = (document.pointerLockElement === canvas);
    });

    // Mouse
    var mouseDownTime = 0;
    var mouseDownX = 0, mouseDownY = 0;

    canvas.addEventListener('mousedown', function (e) {
      if (game.phase !== 'playing') return;
      if (e.button !== 0) return;
      mouseDownTime = performance.now();
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
      if (pointerLocked) {
        input.firing = true;
      } else {
        // Drag look fallback
        dragLook.dragging = true;
        dragLook.lastX = e.clientX;
        dragLook.lastY = e.clientY;
        // Also try pointer lock
        try { canvas.requestPointerLock(); } catch (e2) {}
      }
    });

    document.addEventListener('mousemove', function (e) {
      if (game.phase !== 'playing') return;
      if (pointerLocked) {
        player.yaw -= e.movementX * CONFIG.player.mouseSensitivity;
        player.pitch -= e.movementY * CONFIG.player.mouseSensitivity;
        clampPitch();
      } else if (dragLook.dragging) {
        var dx = e.clientX - dragLook.lastX;
        var dy = e.clientY - dragLook.lastY;
        player.yaw -= dx * CONFIG.player.dragSensitivity;
        player.pitch -= dy * CONFIG.player.dragSensitivity;
        clampPitch();
        dragLook.lastX = e.clientX;
        dragLook.lastY = e.clientY;
      }
    });

    document.addEventListener('mouseup', function (e) {
      if (e.button !== 0) return;
      if (pointerLocked) {
        input.firing = false;
      } else if (dragLook.dragging) {
        var elapsed = performance.now() - mouseDownTime;
        var moved = Math.abs(e.clientX - mouseDownX) + Math.abs(e.clientY - mouseDownY);
        if (elapsed < 200 && moved < 6) {
          // Quick click → fire
          playerShoot();
        }
        dragLook.dragging = false;
      }
    });

    // Prevent context menu
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Visibility / blur
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.phase === 'playing') {
        pauseGame();
      }
    });
    window.addEventListener('blur', function () {
      if (game.phase === 'playing') {
        pauseGame();
      }
    });

    // Buttons
    $('start-btn').addEventListener('click', function () {
      startGame();
      if (!isTouchDevice) {
        try { canvas.requestPointerLock(); } catch (e) {}
      }
    });
    $('pause-btn').addEventListener('click', function () {
      if (game.phase === 'playing') pauseGame();
    });
    $('resume-btn').addEventListener('click', resumeGame);
    $('restart-pause-btn').addEventListener('click', restartGame);
    $('quit-pause-btn').addEventListener('click', quitToMenu);
    $('restart-win-btn').addEventListener('click', restartGame);
    $('restart-lose-btn').addEventListener('click', restartGame);
    $('mute-btn').addEventListener('click', function () {
      AudioSys.muted = !AudioSys.muted;
      AudioSys.setMuted(AudioSys.muted);
      $('mute-btn').textContent = AudioSys.muted ? '🔇' : '🔊';
    });

    // Resize
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!camera || !renderer) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ======================= TOUCH CONTROLS ======================= */
  function setupTouchControls() {
    var moveArea = $('touch-move');
    var joystickBase = $('joystick-base');
    var joystickKnob = $('joystick-knob');
    var lookArea = $('touch-look');
    var btnShoot = $('btn-shoot');
    var btnReload = $('btn-reload');
    var btnInteract = $('btn-interact');
    var btnPauseM = $('btn-pause-m');

    var joyTouchId = null;
    var joyCenterX = 0, joyCenterY = 0;
    var lookTouchId = null;
    var lookLastX = 0, lookLastY = 0;

    // Joystick
    moveArea.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (joyTouchId !== null) return;
      var t = e.changedTouches[0];
      joyTouchId = t.identifier;
      var rect = joystickBase.getBoundingClientRect();
      joyCenterX = rect.left + rect.width / 2;
      joyCenterY = rect.top + rect.height / 2;
    }, { passive: false });

    moveArea.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joyTouchId) {
          var dx = t.clientX - joyCenterX;
          var dy = t.clientY - joyCenterY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var maxR = 40;
          if (dist > maxR) {
            dx = dx / dist * maxR;
            dy = dy / dist * maxR;
          }
          joystickKnob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
          joystickInput.x = dx / maxR;
          joystickInput.y = dy / maxR;
          // Convert to forward/right
          input.forward = -joystickInput.y;
          input.right = joystickInput.x;
        }
      }
    }, { passive: false });

    moveArea.addEventListener('touchend', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          joyTouchId = null;
          joystickKnob.style.transform = 'translate(0, 0)';
          joystickInput.x = 0;
          joystickInput.y = 0;
          input.forward = 0;
          input.right = 0;
        }
      }
    }, { passive: false });

    // Look
    lookArea.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (lookTouchId !== null) return;
      var t = e.changedTouches[0];
      lookTouchId = t.identifier;
      lookLastX = t.clientX;
      lookLastY = t.clientY;
    }, { passive: false });

    lookArea.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === lookTouchId) {
          touchLookDelta.x += t.clientX - lookLastX;
          touchLookDelta.y += t.clientY - lookLastY;
          lookLastX = t.clientX;
          lookLastY = t.clientY;
        }
      }
    }, { passive: false });

    lookArea.addEventListener('touchend', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    }, { passive: false });

    // Buttons
    btnShoot.addEventListener('touchstart', function (e) {
      e.preventDefault();
      input.firing = true;
    }, { passive: false });
    btnShoot.addEventListener('touchend', function (e) {
      e.preventDefault();
      input.firing = false;
    }, { passive: false });

    btnReload.addEventListener('touchstart', function (e) {
      e.preventDefault();
      startReload();
    }, { passive: false });

    btnInteract.addEventListener('touchstart', function (e) {
      e.preventDefault();
      input.interactHeld = true;
    }, { passive: false });
    btnInteract.addEventListener('touchend', function (e) {
      e.preventDefault();
      input.interactHeld = false;
    }, { passive: false });

    btnPauseM.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (game.phase === 'playing') pauseGame();
    }, { passive: false });
  }

  /* ======================= INIT ======================= */
  function init() {
    canvas = $('webgl-canvas');
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Load best time
    try {
      var bt = localStorage.getItem('breachpoint_besttime');
      if (bt) game.bestTime = parseFloat(bt);
    } catch (e) {}

    // Renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
    } catch (e) {
      $('loading-screen').innerHTML = '<div class="menu-card"><h2>WebGL not available</h2><p>' + e.message + '</p></div>';
      return;
    }

    // Build initial scene
    buildScene();

    // Setup
    setupInput();
    if (isTouchDevice) setupTouchControls();
    updateBestTimeDisplay();

    // Hide loading
    $('loading-screen').classList.add('hidden');

    // Start loop
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);

    // Expose test interface
    setupTestInterface();
  }

  function updateBestTimeDisplay() {
    var el = $('best-time-display');
    if (!el) return;
    if (game.bestTime !== null) {
      el.textContent = '最佳时间 / Best: ' + game.bestTime.toFixed(1) + 's';
    } else {
      el.textContent = '';
    }
  }

  /* ======================= TEST INTERFACE ======================= */
  function setupTestInterface() {
    window.__BREACH_TEST__ = {
      snapshot: function () {
        var snapEnemies = enemies.map(function (e) {
          return {
            id: e.id,
            x: e.x,
            y: 0,
            z: e.z,
            hp: Math.max(0, e.hp),
            state: e.state,
            alive: e.alive,
          };
        });
        var objState = bomb.defused ? 'defused' : (game.allClear ? 'ready' : 'locked');
        return {
          phase: game.phase,
          paused: game.paused,
          timeLeft: Math.max(0, game.timeLeft),
          player: {
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
            pitch: player.pitch,
            hp: Math.max(0, player.hp),
            ammo: player.ammo,
            reserve: player.reserve,
            reloading: player.reloading,
          },
          enemies: snapEnemies,
          objective: {
            state: objState,
            progress: bomb.progress,
            x: bomb.x,
            y: bomb.y,
            z: bomb.z,
          },
          stats: {
            shotsFired: game.shotsFired,
            hits: game.hits,
            kills: game.kills,
            elapsedTime: game.elapsedTime,
            bestTime: game.bestTime,
          },
          renderer: {
            isWebGL: !!(renderer && renderer.getContext),
            width: renderer ? renderer.domElement.width : 0,
            height: renderer ? renderer.domElement.height : 0,
            threeRevision: THREE.REVISION,
          },
        };
      },

      start: function () {
        if (game.phase === 'menu') {
          startGame();
          if (!isTouchDevice) {
            try { canvas.requestPointerLock(); } catch (e) {}
          }
        }
      },

      restart: function () {
        restartGame();
      },

      pause: function () {
        pauseGame();
      },

      resume: function () {
        resumeGame();
      },

      setManualClock: function (enabled) {
        game.manualClock = !!enabled;
      },

      step: function (ms) {
        if (!game.manualClock) return;
        if (game.paused) return;
        if (game.phase !== 'playing') return;
        var dt = ms / 1000;
        if (dt > 0.1) dt = 0.1;
        update(dt);
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      },

      setPlayerPose: function (pose) {
        if (game.phase !== 'playing' && game.phase !== 'paused') return;
        if (typeof pose.x === 'number') player.x = pose.x;
        if (typeof pose.y === 'number') player.y = pose.y;
        if (typeof pose.z === 'number') player.z = pose.z;
        if (typeof pose.yaw === 'number') player.yaw = pose.yaw;
        if (typeof pose.pitch === 'number') player.pitch = pose.pitch;
        clampPitch();
        syncCamera();
      },

      move: function (forward, right, ms) {
        if (game.phase !== 'playing') return;
        var f = clamp(forward, -1, 1);
        var r = clamp(right, -1, 1);
        var dt = ms / 1000;
        var speed = CONFIG.player.speed;
        var fx = -Math.sin(player.yaw);
        var fz = -Math.cos(player.yaw);
        var rx = Math.cos(player.yaw);
        var rz = -Math.sin(player.yaw);
        var dx = (f * fx + r * rx) * speed * dt;
        var dz = (f * fz + r * rz) * speed * dt;
        applyMovement(dx, dz);
        syncCamera();
      },

      aimAtEnemy: function (id) {
        var enemy = null;
        for (var i = 0; i < enemies.length; i++) {
          if (enemies[i].id === id) { enemy = enemies[i]; break; }
        }
        if (!enemy) return;
        var dx = enemy.x - player.x;
        var dz = enemy.z - player.z;
        var dy = 1.3 - (player.y + CONFIG.player.eyeHeight);
        var horiz = Math.sqrt(dx * dx + dz * dz);
        player.yaw = Math.atan2(-dx, -dz);
        player.pitch = Math.atan2(dy, horiz);
        clampPitch();
        syncCamera();
      },

      shoot: function () {
        playerShoot();
      },

      reload: function () {
        startReload();
      },

      damagePlayer: function (amount) {
        damagePlayer(amount);
      },

      eliminateEnemy: function (id) {
        var enemy = null;
        for (var i = 0; i < enemies.length; i++) {
          if (enemies[i].id === id) { enemy = enemies[i]; break; }
        }
        if (enemy && enemy.alive) {
          enemy.hp = 0;
          killEnemy(enemy);
        }
      },

      interact: function (ms) {
        if (game.phase !== 'playing') return bomb.progress;
        if (!game.allClear || bomb.defused) return bomb.progress;
        var dist = Math.sqrt(
          Math.pow(player.x - bomb.x, 2) + Math.pow(player.z - bomb.z, 2)
        );
        if (dist > CONFIG.bomb.defuseRange) {
          bomb.progress = 0;
          return 0;
        }
        var dt = ms / 1000;
        bomb.progress += dt;
        if (bomb.progress >= CONFIG.bomb.defuseTime) {
          bomb.progress = CONFIG.bomb.defuseTime;
          bomb.defused = true;
          winGame();
        }
        return bomb.progress;
      },
    };
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

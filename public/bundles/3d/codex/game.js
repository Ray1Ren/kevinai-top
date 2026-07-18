(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOW_POWER = isTouch || reducedMotion || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  const dom = {
    viewport: $('viewport'), intro: $('intro'), hud: $('hud'), start: $('start-btn'), pausePanel: $('pause-panel'), result: $('result-panel'),
    pause: $('pause-btn'), restart: $('restart-btn'), mute: $('mute-btn'), resume: $('resume-btn'), resultRestart: $('result-restart'),
    hp: $('hp-value'), hpBar: $('hp-bar'), time: $('time-value'), enemies: $('enemy-value'), ammo: $('ammo-value'), reserve: $('reserve-value'),
    reload: $('reload-label'), phase: $('phase-label'), objective: $('objective-label'), prompt: $('prompt'), promptText: $('prompt-text'), defuse: $('defuse-bar'),
    crosshair: $('crosshair'), hitMarker: $('hit-marker'), damage: $('damage-vignette'), direction: $('direction-hit'), toast: $('toast'),
    resultKicker: $('result-kicker'), resultTitle: $('result-title'), resultCopy: $('result-copy'), resultTime: $('result-time'),
    resultAccuracy: $('result-accuracy'), resultScore: $('result-score'), bestTime: $('best-time'), bestScore: $('best-score'), touch: $('touch-controls'),
    moveZone: $('move-zone'), moveStick: $('move-stick'), lookZone: $('look-zone'), touchFire: $('touch-fire'), touchReload: $('touch-reload'), touchInteract: $('touch-interact')
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x142832);
  scene.fog = new THREE.FogExp2(0x142832, 0.017);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 180);
  camera.rotation.order = 'YXZ';
  const renderer = new THREE.WebGLRenderer({ antialias: !LOW_POWER, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, LOW_POWER ? 1.25 : 1.75));
  renderer.shadowMap.enabled = !LOW_POWER;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  dom.viewport.appendChild(renderer.domElement);

  const clockState = { manual: false, last: performance.now(), raf: 0 };
  const state = {
    phase: 'intro', paused: false, timeLeft: 75, elapsed: 0, started: false, pointerLocked: false,
    player: { x: 0, y: 1.72, z: 33, yaw: 0, pitch: 0, hp: 100, ammo: 12, reserve: 36, reloading: false, reloadLeft: 0, fireCooldown: 0, recoil: 0 },
    objective: { state: 'locked', progress: 0, x: 0, y: 1.2, z: -30 },
    stats: { shots: 0, hits: 0, kills: 0, score: 0, damageTaken: 0 },
    input: { forward: 0, right: 0, firing: false, interacting: false },
    muted: false, toastLeft: 0, hitLeft: 0, damageLeft: 0, enemyShotSerial: 0
  };

  const colliders = [];
  const obstacleMeshes = [];
  const enemies = [];
  const effects = [];
  const raycaster = new THREE.Raycaster();
  const aimRay = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let weapon, muzzleLight, muzzleFlash, device, deviceRing, beacon, audioCtx, masterGain;
  let dragLook = null, moveTouch = null, lookTouch = null;

  const palette = {
    concrete: 0x4a5960, dark: 0x17252b, steel: 0x30454d, teal: 0x2f6f75, rust: 0x984c32,
    sand: 0x9a855f, yellow: 0xe0a936, red: 0xd94d42, cyan: 0x48c7c5, green: 0x49c89e
  };

  function mat(color, roughness = .8, metalness = .05, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity, flatShading: true });
  }

  function box(name, x, y, z, w, h, d, color, collision = true, material = null) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || mat(color));
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = !LOW_POWER;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collision) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: y + h / 2, mesh });
      obstacleMeshes.push(mesh);
    }
    return mesh;
  }

  function cylinder(name, x, y, z, radius, height, color, sides = 8) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), mat(color));
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = !LOW_POWER; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }

  function addContainer(x, z, color, rotation = 0) {
    const group = new THREE.Group(); group.position.set(x, 1.45, z); group.rotation.y = rotation;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.9, 8), mat(color, .72, .18)); group.add(body);
    for (let i = -3; i <= 3; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(4.18, 2.72, .08), mat(0x223139, .65, .25)); rib.position.z = i; group.add(rib); }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.2, .28, 8.04), mat(palette.yellow)); stripe.position.y = .65; group.add(stripe);
    group.traverse((o) => { if (o.isMesh) { o.castShadow = !LOW_POWER; o.receiveShadow = true; } }); scene.add(group);
    const w = rotation ? 8 : 4.1, d = rotation ? 4.1 : 8;
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: 2.9, mesh: body }); obstacleMeshes.push(body);
    return group;
  }

  function buildWorld() {
    const hemi = new THREE.HemisphereLight(0x8bb4bd, 0x172027, 1.3); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd7a4, 2.2); sun.position.set(-20, 32, 18); sun.castShadow = !LOW_POWER;
    if (!LOW_POWER) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50; }
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 92), mat(0x26373d, .96)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); obstacleMeshes.push(ground);

    const laneMat = new THREE.MeshStandardMaterial({ color: 0x88733e, roughness: .9, transparent: true, opacity: .72 });
    for (let z = 31; z > -31; z -= 5) { const mark = new THREE.Mesh(new THREE.BoxGeometry(.28, .025, 2.5), laneMat); mark.position.set(0, .02, z); scene.add(mark); }
    box('north-wall', 0, 2.3, -39.5, 61, 4.6, 1, palette.concrete);
    box('south-wall-left', -18, 2.3, 39.5, 25, 4.6, 1, palette.concrete);
    box('south-wall-right', 18, 2.3, 39.5, 25, 4.6, 1, palette.concrete);
    box('west-wall', -30.5, 2.3, 0, 1, 4.6, 80, palette.concrete);
    box('east-wall', 30.5, 2.3, 0, 1, 4.6, 80, palette.concrete);

    box('warehouse-west', -20.5, 4, -10, 17, 8, 28, palette.dark);
    box('warehouse-east', 20.5, 3.4, -4, 17, 6.8, 22, 0x20353d);
    box('warehouse-west-sign', -11.9, 4.6, -4, .12, 1.2, 6, palette.yellow, false);
    box('office-deck', 18, 3.2, 21, 14, .5, 9, palette.steel);
    box('office-base-a', 13.5, 1.5, 21, 4, 3, 9, palette.teal);
    box('office-base-b', 22.5, 1.5, 21, 4, 3, 9, palette.teal);
    const stairs = [0,1,2,3]; stairs.forEach((i) => box('step-'+i, 10.8 - i * .9, .3 + i * .35, 25, 1.2, .6 + i * .7, 4, palette.steel));

    addContainer(-8, 19, palette.rust, Math.PI / 2);
    addContainer(8, 12, palette.teal, 0);
    addContainer(-7, -9, 0x7a603e, 0);
    addContainer(8, -18, palette.rust, Math.PI / 2);
    addContainer(19, -29, palette.teal, Math.PI / 2);
    box('central-cover-a', -2.8, 1, 4, 3, 2, 3, palette.sand);
    box('central-cover-b', 3.2, .7, -4, 3.5, 1.4, 2.5, palette.sand);
    box('dock-crates', -18, 1.2, 10, 4, 2.4, 4, palette.sand);
    box('dock-crates-top', -18, 3.1, 10, 3, 1.4, 3, 0x7a6849, false);
    box('device-bay-left', -8, 1.8, -31, 1, 3.6, 12, palette.steel);
    box('device-bay-right', 8, 1.8, -31, 1, 3.6, 12, palette.steel);

    for (let x = -26; x <= 26; x += 13) cylinder('bollard', x, .55, 34, .25, 1.1, palette.yellow, 8);
    for (let i = 0; i < 7; i++) {
      const pole = cylinder('lamp', i % 2 ? 27 : -27, 4, 31 - i * 10, .12, 8, 0x26363d, 8);
      const lamp = new THREE.PointLight(0x8cd4d0, LOW_POWER ? .55 : .9, 15, 2); lamp.position.copy(pole.position).add(new THREE.Vector3(0, 3.6, 0)); scene.add(lamp);
      box('lamp-head', lamp.position.x, lamp.position.y, lamp.position.z, 1.4, .22, .55, palette.cyan, false, mat(0x5b9898, .4, .2, palette.cyan, 1.4));
    }

    const crane = new THREE.Group();
    const craneMat = mat(0xbe8534, .72, .2);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 25, 2), craneMat); tower.position.set(-42, 12.5, -42); crane.add(tower);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 1), craneMat); boom.position.set(-29, 24, -42); crane.add(boom);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(.12, 11, .12), mat(0x18252a, .7, .7)); cable.position.set(-18, 18.5, -42); crane.add(cable); scene.add(crane);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ color: 0x173f4c, roughness: .3, metalness: .15 })); ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -.3, -78); scene.add(ocean);

    buildDevice(); buildWeapon();
  }

  function buildDevice() {
    device = new THREE.Group(); device.position.set(0, .9, -31);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(.85, 1.05, 1.8, 8), mat(0x25373e, .45, .55, palette.yellow, .45)); device.add(core);
    for (let i = 0; i < 3; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.3, .8), mat(0xd59c32, .5, .4)); fin.rotation.y = i * Math.PI / 3; fin.position.y = .2; device.add(fin); }
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 1), mat(0xffcc4d, .25, .1, 0xffa620, 2.7)); orb.position.y = .95; device.add(orb);
    deviceRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, .08, 6, 24), mat(0xf1b83c, .25, .25, 0xf1b83c, 2)); deviceRing.rotation.x = Math.PI / 2; deviceRing.position.y = .15; device.add(deviceRing);
    beacon = new THREE.Mesh(new THREE.ConeGeometry(.7, 2.7, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xf4bd45, transparent: true, opacity: .18, side: THREE.DoubleSide })); beacon.position.y = 3.1; device.add(beacon);
    device.traverse((o) => { if (o.isMesh) o.castShadow = !LOW_POWER; }); scene.add(device);
    const light = new THREE.PointLight(0xffb638, 1.8, 10, 2); light.position.set(0, 2.5, -31); scene.add(light);
  }

  function buildWeapon() {
    weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.28, .32, 1.15), mat(0x1b292e, .42, .75)); body.position.set(.38, -.34, -.72); weapon.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(.18, .16, .55), mat(0x34464c, .35, .75)); top.position.set(.38, -.13, -.82); weapon.add(top);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .72, 8), mat(0x111b20, .35, .85)); barrel.rotation.x = Math.PI / 2; barrel.position.set(.38, -.29, -1.45); weapon.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.2, .45, .28), mat(0x755c3c, .8, .1)); grip.rotation.x = -.2; grip.position.set(.38, -.58, -.55); weapon.add(grip);
    muzzleFlash = new THREE.Mesh(new THREE.IcosahedronGeometry(.16, 0), new THREE.MeshBasicMaterial({ color: 0xffd376, transparent: true, opacity: 0 })); muzzleFlash.position.set(.38, -.29, -1.85); weapon.add(muzzleFlash);
    muzzleLight = new THREE.PointLight(0xffb23a, 0, 4); muzzleLight.position.copy(muzzleFlash.position); weapon.add(muzzleLight);
  }

  function createEnemy(id, x, z, patrol) {
    const group = new THREE.Group(); group.position.set(x, 0, z);
    const dark = mat(0x202c32, .78, .18), armor = mat(0xa93d38, .65, .18, 0x5d1210, .1), visor = mat(0x281a18, .2, .45, palette.red, .85);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(.72, .85, .45), dark); legs.position.y = .43; group.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.05, .52), armor); torso.position.y = 1.32; group.add(torso);
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(.35, 0), dark); head.position.y = 2.05; group.add(head);
    const face = new THREE.Mesh(new THREE.BoxGeometry(.42, .12, .05), visor); face.position.set(0, 2.08, -.32); group.add(face);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .9), dark); gun.position.set(.48, 1.35, -.35); group.add(gun);
    const muzzle = new THREE.PointLight(0xff7b42, 0, 4); muzzle.position.set(.48, 1.35, -.86); group.add(muzzle);
    group.traverse((o) => { if (o.isMesh) { o.castShadow = !LOW_POWER; o.receiveShadow = true; o.userData.enemyId = id; } }); scene.add(group);
    const enemy = { id, group, hp: 100, state: 'patrol', alive: true, patrol, patrolIndex: 0, speed: 2.25, fireCooldown: 1.4 + id * .15, alertLeft: 0, hitLeft: 0, lastSeenX: x, lastSeenZ: z, muzzle, baseY: 0 };
    enemies.push(enemy); return enemy;
  }

  function spawnEnemies() {
    enemies.splice(0).forEach(() => {});
    createEnemy(1, -15, 24, [[-15,24],[-9,24],[-9,18]]);
    createEnemy(2, 14, 10, [[14,10],[21,9],[21,3]]);
    createEnemy(3, -3, 1, [[-3,1],[-9,-1],[-9,-7]]);
    createEnemy(4, 15, -18, [[15,-18],[10,-23],[17,-27]]);
    createEnemy(5, -4, -27, [[-4,-27],[4,-27],[4,-33]]);
  }

  function resetEnemies() {
    enemies.forEach((enemy) => scene.remove(enemy.group)); enemies.length = 0; spawnEnemies();
  }

  function audioInit() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return;
    audioCtx = new AudioContext(); masterGain = audioCtx.createGain(); masterGain.gain.value = state.muted ? 0 : .22; masterGain.connect(audioCtx.destination);
  }

  function tone(type, frequency, duration, volume, slide = 0, delay = 0) {
    if (!audioCtx || state.muted) return;
    const t = audioCtx.currentTime + delay, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(40, frequency), t); if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration); osc.connect(gain); gain.connect(masterGain); osc.start(t); osc.stop(t + duration + .02);
  }

  function noise(duration, volume, cutoff = 1200) {
    if (!audioCtx || state.muted) return;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain(); source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = cutoff; gain.gain.value = volume; source.connect(filter); filter.connect(gain); gain.connect(masterGain); source.start();
  }

  function sound(name) {
    if (!audioCtx || state.muted) return;
    if (name === 'shot') { noise(.08, .9, 1800); tone('square', 130, .09, .35, -70); }
    if (name === 'enemyShot') { noise(.055, .35, 1300); tone('sawtooth', 180, .07, .16, -80); }
    if (name === 'hit') tone('sine', 740, .06, .18, 260);
    if (name === 'hurt') { tone('sawtooth', 95, .18, .23, -30); noise(.12, .16, 500); }
    if (name === 'empty') tone('square', 90, .045, .12, -20);
    if (name === 'reload') { tone('square', 260, .05, .08, -80); tone('square', 410, .05, .08, 80, .55); }
    if (name === 'clear') { tone('sine', 440, .15, .14, 220); tone('sine', 660, .2, .12, 220, .15); }
    if (name === 'win') { [330,440,550,770].forEach((f,i) => tone('sine', f, .35, .14, 60, i*.12)); }
    if (name === 'fail') { tone('sawtooth', 240, .55, .18, -170); tone('square', 120, .7, .08, -60, .18); }
  }

  function resize() {
    const width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }

  function applyCamera() {
    camera.position.set(state.player.x, state.player.y + Math.sin(state.elapsed * 9) * .012 * Math.min(1, Math.abs(state.input.forward) + Math.abs(state.input.right)), state.player.z);
    camera.rotation.y = state.player.yaw; camera.rotation.x = state.player.pitch + state.player.recoil * .015;
  }

  function collides(x, z, radius = .48) {
    if (x < -29.3 + radius || x > 29.3 - radius || z < -38.3 + radius || z > 38.3 - radius) return true;
    return colliders.some((c) => c.height > .3 && x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ);
  }

  function tryMove(dx, dz) {
    const nx = state.player.x + dx, nz = state.player.z + dz;
    if (!collides(nx, state.player.z)) state.player.x = nx;
    if (!collides(state.player.x, nz)) state.player.z = nz;
    applyCamera();
  }

  function movePlayer(forward, right, seconds) {
    const length = Math.hypot(forward, right) || 1, f = forward / Math.max(1, length), r = right / Math.max(1, length);
    const speed = 6.2, sin = Math.sin(state.player.yaw), cos = Math.cos(state.player.yaw);
    tryMove((-sin * f + cos * r) * speed * seconds, (-cos * f - sin * r) * speed * seconds);
  }

  function hasLineOfSight(from, to) {
    tmpV.copy(to).sub(from); const distance = tmpV.length(); raycaster.set(from, tmpV.normalize()); raycaster.far = distance;
    const hits = raycaster.intersectObjects(obstacleMeshes, false); return !hits.length || hits[0].distance >= distance - .25;
  }

  function enemyCanSee(enemy) {
    const from = enemy.group.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    const to = camera.position.clone(); const distance = from.distanceTo(to); if (distance > 25) return false;
    return hasLineOfSight(from, to);
  }

  function moveEnemy(enemy, targetX, targetZ, dt) {
    const dx = targetX - enemy.group.position.x, dz = targetZ - enemy.group.position.z, dist = Math.hypot(dx, dz);
    if (dist < .05) return dist;
    const amount = Math.min(dist, enemy.speed * dt), nx = enemy.group.position.x + dx / dist * amount, nz = enemy.group.position.z + dz / dist * amount;
    if (!collides(nx, enemy.group.position.z, .4)) enemy.group.position.x = nx;
    if (!collides(enemy.group.position.x, nz, .4)) enemy.group.position.z = nz;
    enemy.group.rotation.y = Math.atan2(dx, dz) + Math.PI; return dist;
  }

  function enemyShoot(enemy) {
    enemy.fireCooldown = 1.15 + Math.random() * .55; enemy.muzzle.intensity = 3; sound('enemyShot');
    const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const target = camera.position.clone(); const distance = origin.distanceTo(target); const spread = Math.max(.08, distance * .015);
    target.x += (Math.random() - .5) * spread; target.y += (Math.random() - .5) * spread; target.z += (Math.random() - .5) * spread;
    tracer(origin, target, 0xef674f);
    const hitChance = THREE.MathUtils.clamp(.78 - distance * .018, .28, .68);
    if (Math.random() < hitChance && hasLineOfSight(origin, camera.position)) damagePlayer(7 + Math.floor(Math.random() * 5), origin);
  }

  function updateEnemies(dt) {
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      enemy.fireCooldown -= dt; enemy.hitLeft -= dt; enemy.muzzle.intensity = Math.max(0, enemy.muzzle.intensity - dt * 22);
      const sees = enemyCanSee(enemy); const distance = enemy.group.position.distanceTo(camera.position);
      if (sees) { enemy.lastSeenX = state.player.x; enemy.lastSeenZ = state.player.z; enemy.alertLeft = 3.5; if (enemy.state === 'patrol') enemy.state = 'alert'; }
      else enemy.alertLeft -= dt;
      if (enemy.hitLeft > 0) enemy.state = 'hit';
      else if (sees && distance < 17) enemy.state = 'attack';
      else if (enemy.alertLeft > 0) enemy.state = 'chase';
      else enemy.state = 'patrol';
      if (enemy.state === 'patrol') {
        const p = enemy.patrol[enemy.patrolIndex]; if (moveEnemy(enemy, p[0], p[1], dt) < .6) enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
      } else if (enemy.state === 'chase' || (enemy.state === 'attack' && distance > 12)) {
        moveEnemy(enemy, enemy.lastSeenX, enemy.lastSeenZ, dt * .85);
      } else if (enemy.state === 'attack') {
        enemy.group.rotation.y = Math.atan2(state.player.x - enemy.group.position.x, state.player.z - enemy.group.position.z) + Math.PI;
        if (enemy.fireCooldown <= 0) enemyShoot(enemy);
      }
      enemy.group.position.y = enemy.baseY + Math.sin(state.elapsed * 5 + enemy.id) * .025;
    });
  }

  function tracer(start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]); const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .9 });
    const line = new THREE.Line(geometry, material); scene.add(line); effects.push({ object: line, life: .08, type: 'fade' });
  }

  function spark(point, color = 0xffc25a) {
    const count = LOW_POWER ? 3 : 7;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(.045, 0), new THREE.MeshBasicMaterial({ color, transparent: true })); mesh.position.copy(point); scene.add(mesh);
      effects.push({ object: mesh, life: .28 + Math.random() * .15, velocity: new THREE.Vector3((Math.random()-.5)*3, Math.random()*2.2, (Math.random()-.5)*3), type: 'particle' });
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const fx = effects[i]; fx.life -= dt;
      if (fx.type === 'particle') { fx.object.position.addScaledVector(fx.velocity, dt); fx.velocity.y -= 5 * dt; fx.object.material.opacity = Math.max(0, fx.life * 3); }
      else fx.object.material.opacity = Math.max(0, fx.life * 9);
      if (fx.life <= 0) { scene.remove(fx.object); fx.object.geometry?.dispose(); fx.object.material?.dispose(); effects.splice(i, 1); }
    }
  }

  function shoot() {
    if (state.phase !== 'playing' || state.paused || state.player.reloading || state.player.fireCooldown > 0) return false;
    audioInit();
    if (state.player.ammo <= 0) { state.player.fireCooldown = .24; sound('empty'); showToast('弹匣已空 · 按 R 换弹', 1); return false; }
    state.player.ammo--; state.stats.shots++; state.player.fireCooldown = .145; state.player.recoil = Math.min(2.6, state.player.recoil + .85);
    muzzleFlash.material.opacity = 1; muzzleFlash.scale.setScalar(.7 + Math.random() * .8); muzzleLight.intensity = 4.5; dom.crosshair.classList.add('firing'); sound('shot');
    aimRay.setFromCamera(new THREE.Vector2(0, 0), camera); aimRay.far = 90;
    const targets = obstacleMeshes.concat(enemies.filter(e => e.alive).flatMap(e => e.group.children.filter(c => c.isMesh)));
    const hits = aimRay.intersectObjects(targets, false); let end = camera.position.clone().add(aimRay.ray.direction.clone().multiplyScalar(80));
    if (hits.length) {
      end.copy(hits[0].point); const id = hits[0].object.userData.enemyId;
      if (id) { const enemy = enemies.find(e => e.id === id); if (enemy?.alive) { damageEnemy(enemy, hits[0].object.position.y > 1.8 ? 58 : 42); state.stats.hits++; showHitMarker(); spark(end, 0xffe1a0); sound('hit'); } }
      else spark(end);
    }
    const start = new THREE.Vector3(); muzzleFlash.getWorldPosition(start); tracer(start, end, 0xffdc7a); updateHUD(); return true;
  }

  function damageEnemy(enemy, amount) {
    if (!enemy.alive) return; enemy.hp = Math.max(0, enemy.hp - amount); enemy.hitLeft = .22; enemy.state = 'hit'; enemy.alertLeft = 4; enemy.lastSeenX = state.player.x; enemy.lastSeenZ = state.player.z;
    enemy.group.children.forEach((c) => { if (c.isMesh && c.material?.emissive) { c.material.emissive.setHex(0x66140f); c.material.emissiveIntensity = .8; setTimeout(() => { if (c.material) c.material.emissiveIntensity = c === enemy.group.children[3] ? .85 : 0; }, 80); } });
    if (enemy.hp <= 0) eliminateEnemy(enemy.id);
  }

  function eliminateEnemy(id) {
    const enemy = enemies.find(e => e.id === Number(id)); if (!enemy || !enemy.alive) return false;
    enemy.alive = false; enemy.hp = 0; enemy.state = 'dead'; enemy.group.rotation.z = Math.PI / 2; enemy.group.position.y = .45; enemy.group.children.forEach((c) => { if (c.isMesh) c.material = c.material.clone(), c.material.color.multiplyScalar(.45); });
    state.stats.kills++; state.stats.score += 600; spark(enemy.group.position.clone().add(new THREE.Vector3(0,1.2,0)), 0xef6655);
    if (enemies.every(e => !e.alive)) { state.objective.state = 'available'; sound('clear'); showToast('区域安全 · 前往黄色装置并长按拆除', 3.5); }
    updateHUD(); return true;
  }

  function reload() {
    if (state.phase !== 'playing' || state.paused || state.player.reloading || state.player.ammo >= 12 || state.player.reserve <= 0) return false;
    state.player.reloading = true; state.player.reloadLeft = 1.35; sound('reload'); updateHUD(); return true;
  }

  function finishReload() {
    const needed = 12 - state.player.ammo, loaded = Math.min(needed, state.player.reserve); state.player.ammo += loaded; state.player.reserve -= loaded; state.player.reloading = false; state.player.reloadLeft = 0; updateHUD();
  }

  function damagePlayer(amount, source = null) {
    if (state.phase !== 'playing' || state.paused) return false;
    state.player.hp = Math.max(0, state.player.hp - Math.max(0, Number(amount) || 0)); state.stats.damageTaken += Math.max(0, Number(amount) || 0); state.damageLeft = .32; sound('hurt');
    if (source) { const angle = Math.atan2(source.x - state.player.x, source.z - state.player.z) - state.player.yaw; dom.direction.style.transform = `translateX(-50%) rotate(${angle}rad)`; }
    if (state.player.hp <= 0) endGame(false, '训练员失去行动能力'); updateHUD(); return true;
  }

  function updateObjective(dt) {
    const cleared = enemies.every(e => !e.alive), distance = Math.hypot(state.player.x - state.objective.x, state.player.z - state.objective.z);
    if (!cleared) { state.objective.state = 'locked'; state.objective.progress = Math.max(0, state.objective.progress - dt * .65); dom.prompt.classList.add('hidden'); }
    else if (distance <= 3) {
      state.objective.state = state.input.interacting ? 'defusing' : 'available'; dom.prompt.classList.remove('hidden'); dom.promptText.textContent = state.input.interacting ? '保持操作 · 正在切断脉冲链路' : `${isTouch ? '按住拆除键' : '长按 E'} · 解除脉冲装置`;
      if (state.input.interacting) { state.objective.progress = Math.min(1, state.objective.progress + dt / 1.8); if (state.objective.progress >= 1) endGame(true, '脉冲装置已安全解除'); }
      else state.objective.progress = Math.max(0, state.objective.progress - dt * .45);
    } else { state.objective.state = 'available'; state.objective.progress = Math.max(0, state.objective.progress - dt * .55); dom.prompt.classList.add('hidden'); }
    dom.defuse.style.width = `${state.objective.progress * 100}%`;
  }

  function updateGameplay(dt) {
    if (state.phase !== 'playing' || state.paused) return;
    state.elapsed += dt; state.timeLeft = Math.max(0, state.timeLeft - dt); if (state.timeLeft <= 0) { endGame(false, '训练窗口已关闭'); return; }
    state.player.fireCooldown = Math.max(0, state.player.fireCooldown - dt); state.player.recoil = Math.max(0, state.player.recoil - dt * 6.5);
    if (state.player.reloading) { state.player.reloadLeft -= dt; if (state.player.reloadLeft <= 0) finishReload(); }
    if (state.input.forward || state.input.right) movePlayer(state.input.forward, state.input.right, dt);
    if (state.input.firing) shoot();
    updateEnemies(dt); updateObjective(dt); updateEffects(dt);
    deviceRing.rotation.z += dt * 1.4; deviceRing.scale.setScalar(1 + Math.sin(state.elapsed * 3.2) * .07); beacon.material.opacity = .12 + Math.sin(state.elapsed * 2.4) * .05;
    weapon.position.set(Math.sin(state.elapsed * 8) * .012, Math.abs(Math.cos(state.elapsed * 8)) * -.012 - state.player.recoil * .025, state.player.recoil * .035);
    muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 22); muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 30); dom.crosshair.classList.toggle('firing', state.player.fireCooldown > .08);
    state.toastLeft -= dt; state.hitLeft -= dt; state.damageLeft -= dt; dom.toast.classList.toggle('show', state.toastLeft > 0); dom.hitMarker.classList.toggle('show', state.hitLeft > 0); dom.damage.classList.toggle('show', state.damageLeft > 0); dom.direction.classList.toggle('show', state.damageLeft > 0);
    applyCamera(); updateHUD();
  }

  function showToast(text, seconds = 2.2) { dom.toast.textContent = text; state.toastLeft = seconds; dom.toast.classList.add('show'); }
  function showHitMarker() { state.hitLeft = .14; dom.hitMarker.classList.add('show'); }
  function formatTime(seconds) { const s = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }

  function updateHUD() {
    dom.hp.textContent = Math.ceil(state.player.hp); dom.hpBar.style.width = `${state.player.hp}%`; dom.hpBar.style.background = state.player.hp < 35 ? 'var(--danger)' : 'var(--safe)';
    dom.time.textContent = formatTime(state.timeLeft); dom.time.style.color = state.timeLeft < 15 ? 'var(--danger)' : '';
    dom.enemies.textContent = enemies.filter(e => e.alive).length; dom.ammo.textContent = state.player.ammo; dom.reserve.textContent = state.player.reserve;
    dom.reload.textContent = state.player.reloading ? `换弹 ${state.player.reloadLeft.toFixed(1)}s` : 'VX-12';
    const cleared = enemies.every(e => !e.alive); dom.phase.textContent = cleared ? '最终目标' : '清除区域威胁';
    if (!cleared) dom.objective.textContent = state.elapsed < 3 ? '沿黄色引导进入仓区' : `消灭剩余 ${enemies.filter(e=>e.alive).length} 名训练守卫`;
    else { const d = Math.hypot(state.player.x - state.objective.x, state.player.z - state.objective.z); dom.objective.textContent = d <= 3 ? '长按交互解除装置' : '前往北侧黄色脉冲装置'; }
  }

  function endGame(win, reason) {
    if (state.phase !== 'playing') return; state.phase = win ? 'won' : 'lost'; state.input.firing = false; state.input.interacting = false; state.paused = false;
    if (document.pointerLockElement) document.exitPointerLock();
    const used = 75 - state.timeLeft, accuracy = state.stats.shots ? Math.round(state.stats.hits / state.stats.shots * 100) : 0;
    const score = Math.max(0, Math.round(state.stats.score + state.timeLeft * 35 + accuracy * 12 - state.stats.damageTaken * 4 + (win ? 2000 : 0))); state.stats.score = score;
    if (win && used > .1) {
      const oldTime = Number(localStorage.getItem('breachPointBestTime'));
      if (!Number.isFinite(oldTime) || oldTime <= 0 || used < oldTime) localStorage.setItem('breachPointBestTime', String(used));
    }
    const oldScore = Number(localStorage.getItem('breachPointBestScore') || 0); if (score > oldScore) localStorage.setItem('breachPointBestScore', String(score));
    dom.resultKicker.textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED'; dom.resultTitle.textContent = win ? '装置已解除' : '行动终止'; dom.resultCopy.textContent = reason;
    dom.resultTime.textContent = formatTime(used); dom.resultAccuracy.textContent = `${accuracy}%`; dom.resultScore.textContent = score; dom.result.classList.remove('hidden'); sound(win ? 'win' : 'fail'); updateBest();
  }

  function updateBest() { const t = Number(localStorage.getItem('breachPointBestTime')); dom.bestTime.textContent = Number.isFinite(t) && t > 0 ? formatTime(t) : '--:--'; dom.bestScore.textContent = localStorage.getItem('breachPointBestScore') || '0'; }

  function resetState() {
    Object.assign(state.player, { x: 0, y: 1.72, z: 33, yaw: 0, pitch: 0, hp: 100, ammo: 12, reserve: 36, reloading: false, reloadLeft: 0, fireCooldown: 0, recoil: 0 });
    Object.assign(state.objective, { state: 'locked', progress: 0 }); Object.assign(state.stats, { shots: 0, hits: 0, kills: 0, score: 0, damageTaken: 0 });
    Object.assign(state.input, { forward: 0, right: 0, firing: false, interacting: false }); state.timeLeft = 75; state.elapsed = 0; state.paused = false; state.toastLeft = 0; state.hitLeft = 0; state.damageLeft = 0;
    effects.splice(0).forEach(fx => scene.remove(fx.object));
    dom.prompt.classList.add('hidden'); dom.defuse.style.width = '0%'; dom.hitMarker.classList.remove('show'); dom.damage.classList.remove('show'); dom.direction.classList.remove('show'); dom.crosshair.classList.remove('firing');
    muzzleFlash.material.opacity = 0; muzzleLight.intensity = 0; weapon.position.set(0, 0, 0);
    resetEnemies(); applyCamera(); updateHUD();
  }

  function startGame() {
    audioInit(); resetState(); state.started = true; state.phase = 'playing'; dom.intro.classList.add('hidden'); dom.result.classList.add('hidden'); dom.pausePanel.classList.add('hidden'); dom.hud.classList.remove('hidden');
    if (isTouch) dom.touch.classList.remove('hidden'); showToast('沿信标前进 · 清除全部红色目标', 3.4);
    if (!isTouch) requestPointerLock();
    updateHUD();
  }

  function restartGame() { startGame(); }
  function pauseGame() { if (state.phase !== 'playing' || state.paused) return false; state.paused = true; state.input.firing = false; state.input.interacting = false; dom.pausePanel.classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); return true; }
  function requestPointerLock() {
    if (!renderer.domElement.requestPointerLock) { showToast('指针锁定不可用 · 按住鼠标拖拽观察', 3); return; }
    try {
      const result = renderer.domElement.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => showToast('指针锁定不可用 · 按住鼠标拖拽观察', 3));
    } catch (_) { showToast('指针锁定不可用 · 按住鼠标拖拽观察', 3); }
  }

  function resumeGame() { if (state.phase !== 'playing' || !state.paused) return false; state.paused = false; dom.pausePanel.classList.add('hidden'); clockState.last = performance.now(); if (!isTouch) requestPointerLock(); return true; }

  function setLook(dx, dy, scale = .0022) { state.player.yaw -= dx * scale; state.player.pitch = THREE.MathUtils.clamp(state.player.pitch - dy * scale, -1.28, 1.28); applyCamera(); }

  function bindEvents() {
    addEventListener('resize', resize); addEventListener('blur', () => { if (state.phase === 'playing' && !state.paused) pauseGame(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase === 'playing' && !state.paused) pauseGame(); });
    document.addEventListener('pointerlockchange', () => { state.pointerLocked = document.pointerLockElement === renderer.domElement; });
    document.addEventListener('mousemove', (e) => { if (state.pointerLocked && state.phase === 'playing' && !state.paused) setLook(e.movementX, e.movementY); else if (dragLook) { setLook(e.clientX - dragLook.x, e.clientY - dragLook.y, .003); dragLook = { x: e.clientX, y: e.clientY }; } });
    renderer.domElement.addEventListener('mousedown', (e) => { if (state.phase !== 'playing' || state.paused) return; if (e.button === 0) { if (!state.pointerLocked) dragLook = { x: e.clientX, y: e.clientY }; else state.input.firing = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) { if (dragLook) { if (Math.hypot(e.clientX-dragLook.x,e.clientY-dragLook.y) < 3) shoot(); dragLook = null; } state.input.firing = false; } });
    renderer.domElement.addEventListener('click', () => { if (state.phase === 'playing' && !state.paused && !isTouch && !state.pointerLocked) requestPointerLock(); });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && state.phase === 'playing') { e.preventDefault(); state.paused ? resumeGame() : pauseGame(); return; }
      if (state.phase !== 'playing' || state.paused) return;
      if (e.code === 'KeyW') state.input.forward = 1; if (e.code === 'KeyS') state.input.forward = -1; if (e.code === 'KeyA') state.input.right = -1; if (e.code === 'KeyD') state.input.right = 1;
      if (e.code === 'KeyR') reload(); if (e.code === 'KeyE') state.input.interacting = true;
    });
    addEventListener('keyup', (e) => { if (e.code === 'KeyW' && state.input.forward > 0) state.input.forward = 0; if (e.code === 'KeyS' && state.input.forward < 0) state.input.forward = 0; if (e.code === 'KeyA' && state.input.right < 0) state.input.right = 0; if (e.code === 'KeyD' && state.input.right > 0) state.input.right = 0; if (e.code === 'KeyE') state.input.interacting = false; });
    dom.start.addEventListener('click', startGame); dom.restart.addEventListener('click', restartGame); dom.resultRestart.addEventListener('click', restartGame); dom.pause.addEventListener('click', () => state.paused ? resumeGame() : pauseGame()); dom.resume.addEventListener('click', resumeGame);
    dom.mute.addEventListener('click', () => { state.muted = !state.muted; dom.mute.textContent = state.muted ? '静' : '音'; if (masterGain) masterGain.gain.value = state.muted ? 0 : .22; });
    bindTouch();
  }

  function bindTouch() {
    const prevent = (e) => e.preventDefault(); [dom.moveZone, dom.lookZone, dom.touchFire, dom.touchReload, dom.touchInteract].forEach(el => el.addEventListener('touchstart', prevent, { passive:false }));
    dom.moveZone.addEventListener('touchstart', (e) => { const t=e.changedTouches[0]; moveTouch={id:t.identifier}; updateMoveTouch(t); }, {passive:false});
    dom.moveZone.addEventListener('touchmove', (e) => { const t=[...e.changedTouches].find(t=>t.identifier===moveTouch?.id); if(t) updateMoveTouch(t); }, {passive:false});
    const endMove=(e)=>{ if([...e.changedTouches].some(t=>t.identifier===moveTouch?.id)){ moveTouch=null; state.input.forward=0; state.input.right=0; dom.moveStick.style.transform='translate(0,0)'; }}; dom.moveZone.addEventListener('touchend',endMove); dom.moveZone.addEventListener('touchcancel',endMove);
    dom.lookZone.addEventListener('touchstart',(e)=>{const t=e.changedTouches[0];lookTouch={id:t.identifier,x:t.clientX,y:t.clientY};},{passive:false});
    dom.lookZone.addEventListener('touchmove',(e)=>{const t=[...e.changedTouches].find(t=>t.identifier===lookTouch?.id);if(t){setLook(t.clientX-lookTouch.x,t.clientY-lookTouch.y,.004);lookTouch.x=t.clientX;lookTouch.y=t.clientY;}},{passive:false});
    const endLook=(e)=>{if([...e.changedTouches].some(t=>t.identifier===lookTouch?.id))lookTouch=null;};dom.lookZone.addEventListener('touchend',endLook);dom.lookZone.addEventListener('touchcancel',endLook);
    const hold=(el,key)=>{el.addEventListener('touchstart',()=>state.input[key]=true,{passive:false});el.addEventListener('touchend',()=>state.input[key]=false);el.addEventListener('touchcancel',()=>state.input[key]=false);}; hold(dom.touchFire,'firing'); hold(dom.touchInteract,'interacting'); dom.touchReload.addEventListener('touchstart',reload,{passive:false});
  }

  function updateMoveTouch(t) { const r=dom.moveZone.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2, dx=t.clientX-cx, dy=t.clientY-cy, len=Math.hypot(dx,dy), max=42, scale=Math.min(1,max/(len||1)); dom.moveStick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`; state.input.right=THREE.MathUtils.clamp(dx/max,-1,1); state.input.forward=THREE.MathUtils.clamp(-dy/max,-1,1); }

  function animate(now) {
    clockState.raf = requestAnimationFrame(animate); const dt = Math.min(.05, Math.max(0, (now - clockState.last) / 1000)); clockState.last = now;
    if (!clockState.manual) updateGameplay(dt); renderer.render(scene, camera);
  }

  function manualStep(ms) {
    if (!clockState.manual || state.paused || state.phase !== 'playing') return snapshot();
    let left = Math.max(0, Number(ms) || 0) / 1000; while (left > 0) { const dt = Math.min(left, 1/60); updateGameplay(dt); left -= dt; if (state.phase !== 'playing') break; } renderer.render(scene,camera); return snapshot();
  }

  function snapshot() {
    return {
      phase: state.phase, paused: state.paused, timeLeft: Number(state.timeLeft.toFixed(3)),
      player: { x:Number(state.player.x.toFixed(3)), y:Number(state.player.y.toFixed(3)), z:Number(state.player.z.toFixed(3)), yaw:Number(state.player.yaw.toFixed(4)), pitch:Number(state.player.pitch.toFixed(4)), hp:state.player.hp, ammo:state.player.ammo, reserve:state.player.reserve, reloading:state.player.reloading },
      enemies: enemies.map(e=>({id:e.id,x:Number(e.group.position.x.toFixed(3)),y:Number(e.group.position.y.toFixed(3)),z:Number(e.group.position.z.toFixed(3)),hp:e.hp,state:e.state,alive:e.alive})),
      objective: { state:state.objective.state,progress:Number(state.objective.progress.toFixed(4)),x:state.objective.x,y:state.objective.y,z:state.objective.z },
      stats: {...state.stats}, renderer: { isWebGL:renderer instanceof THREE.WebGLRenderer,width:renderer.domElement.width,height:renderer.domElement.height,threeRevision:THREE.REVISION }
    };
  }

  window.__BREACH_TEST__ = {
    snapshot, start:startGame, restart:restartGame, pause:pauseGame, resume:resumeGame,
    setManualClock(enabled){ clockState.manual=Boolean(enabled); clockState.last=performance.now(); return clockState.manual; },
    step:manualStep,
    setPlayerPose(pose={}) { const x=Number.isFinite(pose.x)?pose.x:state.player.x, z=Number.isFinite(pose.z)?pose.z:state.player.z; if(!collides(x,z)){state.player.x=x;state.player.z=z;} if(Number.isFinite(pose.y))state.player.y=THREE.MathUtils.clamp(pose.y,1.4,3.6); if(Number.isFinite(pose.yaw))state.player.yaw=pose.yaw; if(Number.isFinite(pose.pitch))state.player.pitch=THREE.MathUtils.clamp(pose.pitch,-1.28,1.28); applyCamera(); return snapshot().player; },
    move(forward,right,ms){ if(state.phase==='playing'&&!state.paused) movePlayer(THREE.MathUtils.clamp(Number(forward)||0,-1,1),THREE.MathUtils.clamp(Number(right)||0,-1,1),Math.max(0,Number(ms)||0)/1000); return snapshot().player; },
    aimAtEnemy(id){ const e=enemies.find(e=>e.id===Number(id)&&e.alive); if(!e)return false; const target=e.group.position.clone().add(new THREE.Vector3(0,1.45,0)); tmpV.copy(target).sub(camera.position).normalize(); state.player.yaw=Math.atan2(-tmpV.x,-tmpV.z); state.player.pitch=Math.asin(THREE.MathUtils.clamp(tmpV.y,-1,1)); applyCamera(); return true; },
    shoot, reload, damagePlayer:(amount)=>damagePlayer(amount), eliminateEnemy, interact(ms){ if(state.phase!=='playing'||state.paused)return snapshot().objective; state.input.interacting=true; let left=Math.max(0,Number(ms)||0)/1000; while(left>0&&state.phase==='playing'){const dt=Math.min(left,1/60);updateObjective(dt);left-=dt;} state.input.interacting=false; updateHUD(); return snapshot().objective; }
  };

  buildWorld(); spawnEnemies(); bindEvents(); resize(); applyCamera(); updateBest(); updateHUD(); animate(performance.now());
})();

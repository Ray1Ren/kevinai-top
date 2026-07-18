/* Sling Siege / 弹弓攻城 - core engine
 * Pure HTML5 Canvas + Web Audio. No dependencies.
 * Modules: util, audio, levels, physics, render, input, game-loop, ui, test-interface.
 */
(function (global) {
  'use strict';

  // ---------- Utilities ----------
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx*dx + dy*dy; };
  const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
  const nowMs = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------- Audio (Web Audio synthesized SFX) ----------
  const Audio = (() => {
    let ctx = null;
    let muted = false;
    let master = null;
    function ensure() {
      if (ctx) return ctx;
      try {
        const C = global.AudioContext || global.webkitAudioContext;
        ctx = new C();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.6;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
      return ctx;
    }
    function setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.6;
    }
    function isMuted() { return muted; }
    function envTone({type='sine', f0=440, f1=null, dur=0.2, attack=0.005, decay=0.18, gain=0.4}) {
      const c = ensure(); if (!c) return;
      const t0 = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
      o.connect(g).connect(master);
      o.start(t0); o.stop(t0 + attack + decay + 0.02);
    }
    function noiseBurst({dur=0.18, gain=0.4, lowpass=2000}={}) {
      const c = ensure(); if (!c) return;
      const t0 = c.currentTime;
      const bufSize = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = gain;
      const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = lowpass;
      src.connect(filt).connect(g).connect(master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    }
    return {
      ensure,
      setMuted,
      isMuted,
      pull() { envTone({type:'triangle', f0:520, f1:240, dur:0.12, gain:0.18}); },
      launch(power) {
        const c = ensure(); if (!c) return;
        const t0 = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t0);
        o.frequency.exponentialRampToValueAtTime(60, t0 + 0.22);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.25 + power * 0.2, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g).connect(master); o.start(t0); o.stop(t0 + 0.32);
      },
      ability() { envTone({type:'square', f0:300, f1:900, dur:0.35, gain:0.32}); noiseBurst({dur:0.32, gain:0.25, lowpass:1800}); },
      hit() { noiseBurst({dur:0.14, gain:0.45, lowpass:1500}); envTone({type:'square', f0:220, f1:80, dur:0.12, gain:0.3}); },
      crack() { noiseBurst({dur:0.18, gain:0.4, lowpass:1100}); },
      thud() { envTone({type:'sine', f0:160, f1:60, dur:0.18, gain:0.35}); },
      win() {
        envTone({type:'triangle', f0:523, f1:523, dur:0.12, gain:0.3});
        setTimeout(()=>envTone({type:'triangle', f0:659, f1:659, dur:0.14, gain:0.3}), 120);
        setTimeout(()=>envTone({type:'triangle', f0:784, f1:784, dur:0.22, gain:0.32}), 260);
      },
      lose() {
        envTone({type:'sawtooth', f0:300, f1:90, dur:0.5, gain:0.3});
        setTimeout(()=>envTone({type:'sawtooth', f0:220, f1:60, dur:0.5, gain:0.25}), 220);
      },
      uiClick() { envTone({type:'triangle', f0:880, f1:1200, dur:0.07, gain:0.18}); }
    };
  })();

  // ---------- Levels ----------
  // World uses a 1280x720 logical coordinate space.
  // Ground is at y = groundY. Sling is at (sx, sy). Each level declares ammo, blocks and targets.
  function buildLevels() {
    const W = 1280, H = 720, GY = 620;
    return [
      // ---- Level 1: tutorial-ish, 2 sentinels in a small wooden shack ----
      {
        id: 1,
        name: 'Training Outpost',
        subtitle: 'Two sentinels behind a thin wall',
        groundY: GY,
        sling: { x: 160, y: GY - 90 },
        ammo: 4,
        gravity: 1500,
        layout: () => {
          const blocks = [];
          // foundation stone base
          blocks.push({ kind: 'stone', x: 800, y: GY - 40, w: 220, h: 40, hp: 200 });
          // left wood wall
          blocks.push({ kind: 'wood', x: 800, y: GY - 130, w: 28, h: 90, hp: 60 });
          // right wood wall
          blocks.push({ kind: 'wood', x: 992, y: GY - 130, w: 28, h: 90, hp: 60 });
          // roof plank
          blocks.push({ kind: 'wood', x: 800, y: GY - 145, w: 220, h: 16, hp: 50 });
          // a small loose barrel
          blocks.push({ kind: 'barrel', x: 720, y: GY - 30, r: 18, hp: 30 });
          const targets = [
            { id: 't1', kind: 'sentinel', x: 860, y: GY - 75, r: 28, hp: 60, maxHp: 60, points: 100 },
            { id: 't2', kind: 'sentinel', x: 960, y: GY - 75, r: 28, hp: 60, maxHp: 60, points: 100 }
          ];
          return { blocks, targets };
        }
      },
      // ---- Level 2: stone fortress with three sentinels, raised platform ----
      {
        id: 2,
        name: 'Stone Bastion',
        subtitle: 'Three sentinels on a raised plinth',
        groundY: GY,
        sling: { x: 160, y: GY - 90 },
        ammo: 5,
        gravity: 1500,
        layout: () => {
          const blocks = [];
          // raised stone platform 100 px tall
          blocks.push({ kind: 'stone', x: 720, y: GY - 100, w: 360, h: 100, hp: 320 });
          // left & right stone towers
          blocks.push({ kind: 'stone', x: 720, y: GY - 220, w: 50, h: 120, hp: 220 });
          blocks.push({ kind: 'stone', x: 1030, y: GY - 220, w: 50, h: 120, hp: 220 });
          // wooden beam across
          blocks.push({ kind: 'wood', x: 770, y: GY - 235, w: 260, h: 16, hp: 80 });
          // hanging wood crates on top of beam
          blocks.push({ kind: 'crate', x: 820, y: GY - 270, w: 36, h: 36, hp: 40 });
          blocks.push({ kind: 'crate', x: 900, y: GY - 270, w: 36, h: 36, hp: 40 });
          blocks.push({ kind: 'crate', x: 980, y: GY - 270, w: 36, h: 36, hp: 40 });
          // a wooden column to break or use as bounce
          blocks.push({ kind: 'wood', x: 640, y: GY - 90, w: 22, h: 90, hp: 50 });
          const targets = [
            { id: 't1', kind: 'sentinel', x: 800, y: GY - 135, r: 28, hp: 60, maxHp: 60, points: 120 },
            { id: 't2', kind: 'sentinel', x: 900, y: GY - 135, r: 28, hp: 60, maxHp: 60, points: 120 },
            { id: 't3', kind: 'sentinel', x: 1000, y: GY - 135, r: 28, hp: 60, maxHp: 60, points: 120 }
          ];
          return { blocks, targets };
        }
      },
      // ---- Level 3: split fortress, glass/wood/stone mix, captain sentinel ----
      {
        id: 3,
        name: 'High Captain\'s Keep',
        subtitle: 'Four sentinels plus a captain, glass and stone',
        groundY: GY,
        sling: { x: 160, y: GY - 90 },
        ammo: 6,
        gravity: 1500,
        layout: () => {
          const blocks = [];
          // left tower
          blocks.push({ kind: 'stone', x: 620, y: GY - 140, w: 60, h: 140, hp: 260 });
          blocks.push({ kind: 'stone', x: 620, y: GY - 260, w: 60, h: 120, hp: 260 });
          // center elevated platform (captain)
          blocks.push({ kind: 'stone', x: 740, y: GY - 220, w: 280, h: 60, hp: 320 });
          // glass windows on platform (fragile)
          blocks.push({ kind: 'glass', x: 780, y: GY - 270, w: 40, h: 50, hp: 18 });
          blocks.push({ kind: 'glass', x: 850, y: GY - 270, w: 40, h: 50, hp: 18 });
          blocks.push({ kind: 'glass', x: 920, y: GY - 270, w: 40, h: 50, hp: 18 });
          // right tower (taller)
          blocks.push({ kind: 'stone', x: 1080, y: GY - 180, w: 60, h: 180, hp: 320 });
          // wooden bridge connecting towers
          blocks.push({ kind: 'wood', x: 680, y: GY - 235, w: 400, h: 16, hp: 70 });
          // a stack of crates on bridge
          blocks.push({ kind: 'crate', x: 880, y: GY - 270, w: 34, h: 34, hp: 40 });
          blocks.push({ kind: 'crate', x: 914, y: GY - 270, w: 34, h: 34, hp: 40 });
          const targets = [
            { id: 't1', kind: 'sentinel', x: 660, y: GY - 80, r: 28, hp: 60, maxHp: 60, points: 140 },
            { id: 't2', kind: 'sentinel', x: 800, y: GY - 255, r: 26, hp: 50, maxHp: 50, points: 160 },
            { id: 't3', kind: 'sentinel', x: 1000, y: GY - 255, r: 26, hp: 50, maxHp: 50, points: 160 },
            { id: 'captain', kind: 'captain', x: 1100, y: GY - 220, r: 34, hp: 110, maxHp: 110, points: 400 }
          ];
          return { blocks, targets };
        }
      }
    ];
  }

  // ---------- Game state ----------
  const W = 1280, H = 720;
  const STORAGE_KEY = 'slingSiege.save.v1';
  const state = {
    phase: 'title',      // title | aiming | flying | settling | won | lost | paused
    level: 1,
    maxLevel: 3,
    score: 0,
    best: 0,
    shotsLeft: 4,
    gravity: 1500,
    groundY: 620,
    sling: { x: 160, y: 530 },
    aim: { dx: 0, dy: 0, active: false, maxPull: 140 },
    projectile: null,    // {x,y,vx,vy,r, trail:[], alive, abilityUsed}
    projectileOnSling: true,
    blocks: [],
    targets: [],
    particles: [],
    shake: { t: 0, amp: 0 },
    camera: { shakeX: 0, shakeY: 0 },
    manualClock: false,
    accumulatorMs: 0,
    lastFrameMs: 0,
    pendingEndCheck: false,
    flag: {}             // misc transient
  };

  function loadSave() {
    try {
      const raw = global.localStorage && localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (typeof o.best === 'number') state.best = o.best;
    } catch (e) { /* ignore */ }
  }
  function saveSave() {
    try {
      if (global.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: state.best }));
    } catch (e) { /* ignore */ }
  }

  // ---------- Physics ----------
  // blocks are axis-aligned rectangles or barrels (circles).
  // projectile is a circle.
  // Targets are circles.
  // We use simple impulse-based collisions with restitution.

  function resetProjectileOnSling() {
    state.projectile = {
      x: state.sling.x, y: state.sling.y,
      vx: 0, vy: 0, r: 18,
      alive: false, abilityUsed: false, spin: 0,
      trail: [],
      bornAt: 0
    };
    state.projectileOnSling = true;
    state.aim.active = false;
    state.aim.dx = 0;
    state.aim.dy = 0;
  }

  function loadLevel(levelIndex) {
    const levels = buildLevels();
    const lv = levels[clamp(levelIndex - 1, 0, levels.length - 1)];
    state.level = lv.id;
    state.shotsLeft = lv.ammo;
    state.gravity = lv.gravity;
    state.groundY = lv.groundY;
    state.sling.x = lv.sling.x; state.sling.y = lv.sling.y;
    const layout = lv.layout();
    // Deep copy with mutability for hp
    state.blocks = layout.blocks.map(b => Object.assign({}, b, { hp: b.hp, vx: 0, vy: 0, ang: 0, vang: 0, broken: false }));
    state.targets = layout.targets.map(t => Object.assign({}, t, { alive: true, hitFlash: 0 }));
    state.particles = [];
    state.shake = { t: 0, amp: 0 };
    state.camera.shakeX = state.camera.shakeY = 0;
    state.phase = 'aiming';
    state.pendingEndCheck = false;
    resetProjectileOnSling();
    updateAbilityButton();
    updateAmmoHUD();
    showBanner('Fortress ' + lv.id, lv.name, 1300);
  }

  // AABB vs circle collision: closest point on rect to circle center.
  function collideProjectileBlock(p, b) {
    // Determine block shape
    if (b.broken) return null;
    let nx, ny, halfW, halfH, cx, cy;
    if (b.kind === 'barrel') {
      // barrel handled separately as circle
      const dx = p.x - b.x, dy = p.y - b.y;
      const d2 = dx*dx + dy*dy;
      const rr = p.r + b.r;
      if (d2 > rr*rr) return null;
      const d = Math.sqrt(d2) || 0.001;
      const ox = (dx / d) * rr;
      const oy = (dy / d) * rr;
      return { nx: dx / d, ny: dy / d, depth: rr - d, contactX: b.x + dx / d * b.r, contactY: b.y + dy / d * b.r, b };
    }
    cx = b.x + b.w * 0.5; cy = b.y + b.h * 0.5;
    halfW = b.w * 0.5; halfH = b.h * 0.5;
    const dx = p.x - cx, dy = p.y - cy;
    const clx = clamp(dx, -halfW, halfW);
    const cly = clamp(dy, -halfH, halfH);
    const closestX = cx + clx, closestY = cy + cly;
    const ddx = p.x - closestX, ddy = p.y - closestY;
    if (ddx*ddx + ddy*ddy > p.r * p.r) return null;
    let nxv, nyv, dep;
    if (b.w === b.h && Math.abs(dx) > halfW - 0.5 && Math.abs(dy) > halfH - 0.5) {
      // corner approximation: push along axis
      const sx = Math.abs(dx) - halfW;
      const sy = Math.abs(dy) - halfH;
      if (sx > sy) { nxv = Math.sign(dx); nyv = 0; }
      else { nxv = 0; nyv = Math.sign(dy); }
      dep = p.r;
    } else {
      const len = Math.sqrt(ddx*ddx + ddy*ddy) || 0.0001;
      nxv = ddx / len; nyv = ddy / len; dep = p.r - len;
    }
    return { nx: nxv, ny: nyv, depth: dep, contactX: closestX, contactY: closestY, b };
  }

  function collideProjectileTarget(p, t) {
    if (!t.alive) return null;
    const dx = p.x - t.x, dy = p.y - t.y;
    const rr = p.r + t.r;
    const d2 = dx*dx + dy*dy;
    if (d2 > rr*rr) return null;
    const d = Math.sqrt(d2) || 0.001;
    return { nx: dx / d, ny: dy / d, depth: rr - d, contactX: t.x + dx / d * t.r, contactY: t.y + dy / d * t.r, t };
  }

  function applyHit(b, dmg, impactSpeed) {
    if (b.broken) return;
    b.hp -= dmg;
    // shake screen
    state.shake.t = Math.max(state.shake.t, 0.18);
    state.shake.amp = Math.max(state.shake.amp, Math.min(8, 2 + impactSpeed * 0.02));
    // Emit dust particles
    const cx = b.x + (b.w ? b.w * 0.5 : 0);
    const cy = b.y + (b.h ? b.h * 0.5 : 0);
    const n = Math.min(20, 6 + Math.floor(impactSpeed * 0.1));
    for (let i = 0; i < n; i++) {
      state.particles.push({
        x: cx + rand(-10, 10), y: cy + rand(-10, 10),
        vx: rand(-200, 200), vy: rand(-260, 60),
        life: rand(0.4, 0.9), age: 0,
        size: rand(2, 5),
        color: b.kind === 'glass' ? '#bff2ff' : (b.kind === 'stone' ? '#7a7066' : '#c79859'),
        gravity: 600
      });
    }
    if (b.hp <= 0) {
      b.broken = true;
      // bigger burst on break
      const nb = Math.min(28, 10 + Math.floor(impactSpeed * 0.12));
      for (let i = 0; i < nb; i++) {
        state.particles.push({
          x: cx + rand(-b.w * 0.4, b.w * 0.4), y: cy + rand(-b.h * 0.4, b.h * 0.4),
          vx: rand(-280, 280), vy: rand(-360, 60),
          life: rand(0.6, 1.2), age: 0,
          size: rand(3, 7),
          color: b.kind === 'glass' ? '#bff2ff' : (b.kind === 'stone' ? '#a09686' : '#d6a76a'),
          gravity: 700
        });
      }
      Audio.crack();
    } else {
      Audio.hit();
    }
  }

  function hitTarget(t, dmg, impactSpeed) {
    if (!t.alive) return false;
    t.hp -= dmg;
    t.hitFlash = 0.25;
    state.shake.t = Math.max(state.shake.t, 0.18);
    state.shake.amp = Math.max(state.shake.amp, Math.min(10, 3 + impactSpeed * 0.025));
    if (t.hp <= 0) {
      t.alive = false;
      state.score += t.points;
      // celebration burst
      for (let i = 0; i < 22; i++) {
        state.particles.push({
          x: t.x + rand(-8, 8), y: t.y + rand(-8, 8),
          vx: rand(-220, 220), vy: rand(-300, -40),
          life: rand(0.5, 1.1), age: 0,
          size: rand(3, 6),
          color: t.kind === 'captain' ? '#ffd58a' : '#ff9b5a',
          gravity: 600
        });
      }
      Audio.win();
      // brief upward banner-feel (handled by checkEnd later)
      return true;
    }
    Audio.hit();
    // small spark
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: t.x + rand(-6, 6), y: t.y + rand(-6, 6),
        vx: rand(-140, 140), vy: rand(-220, -20),
        life: rand(0.3, 0.6), age: 0,
        size: rand(2, 4),
        color: '#ffb878', gravity: 500
      });
    }
    return false;
  }

  function stepPhysics(dt) {
    if (!state.projectile || !state.projectile.alive) {
      // settle particles / shake even with no live projectile
      stepParticles(dt);
      stepShake(dt);
      return;
    }
    const p = state.projectile;
    // integrate
    p.vy += state.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.spin += (p.vx * 0.02);
    // trail
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 28) p.trail.shift();

    // projectile vs blocks
    let impactSpeed = Math.hypot(p.vx, p.vy);
    let collided = false;
    for (let i = 0; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      if (b.broken) continue;
      const c = collideProjectileBlock(p, b);
      if (!c) continue;
      // resolve
      const e = (b.kind === 'stone' || b.kind === 'glass') ? 0.18 : 0.32;
      const vDotN = p.vx * c.nx + p.vy * c.ny;
      if (vDotN < 0) {
        p.vx -= (1 + e) * vDotN * c.nx;
        p.vy -= (1 + e) * vDotN * c.ny;
      }
      // push out of penetration
      p.x += c.nx * c.depth;
      p.y += c.ny * c.depth;
      // Damage block based on impact
      const speed = Math.hypot(p.vx, p.vy);
      const dmg = Math.max(8, speed * 0.12);
      applyHit(b, dmg, impactSpeed);
      collided = true;
      impactSpeed = speed;
    }
    // projectile vs targets
    for (let i = 0; i < state.targets.length; i++) {
      const t = state.targets[i];
      const c = collideProjectileTarget(p, t);
      if (!c) continue;
      const e = 0.2;
      const vDotN = p.vx * c.nx + p.vy * c.ny;
      if (vDotN < 0) {
        p.vx -= (1 + e) * vDotN * c.nx;
        p.vy -= (1 + e) * vDotN * c.ny;
      }
      p.x += c.nx * c.depth;
      p.y += c.ny * c.depth;
      const speed = Math.hypot(p.vx, p.vy);
      const dmg = Math.max(30, speed * 0.45);
      const wasAlive = t.alive;
      const killed = hitTarget(t, dmg, impactSpeed);
      collided = true;
      impactSpeed = speed;
      if (killed) {
        // small recoil but keep flying
        p.vx *= 0.6; p.vy *= 0.6;
      }
    }
    // projectile vs ground
    if (p.y + p.r > state.groundY) {
      p.y = state.groundY - p.r;
      p.vy = -p.vy * 0.32;
      p.vx *= 0.78;
      if (Math.abs(p.vy) < 30) p.vy = 0;
      // dust
      const sp = Math.abs(p.vy);
      if (sp > 40) {
        for (let i = 0; i < 6; i++) {
          state.particles.push({
            x: p.x + rand(-10, 10), y: state.groundY - 2,
            vx: rand(-100, 100), vy: rand(-120, -10),
            life: rand(0.3, 0.7), age: 0,
            size: rand(2, 4), color: '#a8967a', gravity: 500
          });
        }
        Audio.thud();
      }
      collided = true;
    }
    // projectile vs world edges (left/right walls keep it in field)
    if (p.x - p.r < 0) { p.x = p.r; p.vx = -p.vx * 0.4; }
    if (p.x + p.r > W) { p.x = W - p.r; p.vx = -p.vx * 0.4; }
    if (p.y < -200 || p.x < -200) {
      // escaped, just settle
      settleAfterShot();
      return;
    }
    // Safety: force settle if projectile has been alive too long (stuck bouncing).
    const aliveMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - (p.bornAt || 0);
    if (aliveMs > 4500) {
      // Snap to ground and settle.
      p.y = state.groundY - p.r;
      p.vx = 0; p.vy = 0;
      settleAfterShot();
      return;
    }
    // settle condition: low energy + on/near ground
    if (Math.abs(p.vx) < 12 && Math.abs(p.vy) < 12 && p.y + p.r >= state.groundY - 0.5) {
      settleAfterShot();
      return;
    }
    stepParticles(dt);
    stepShake(dt);
  }

  function settleAfterShot() {
    if (!state.projectile) return;
    state.projectile.alive = false;
    state.projectile.vx = 0; state.projectile.vy = 0;
    state.phase = 'settling';
    state.pendingEndCheck = true;
    state._settleTimer = 0;
  }

  function stepParticles(dt) {
    const arr = state.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.age += dt;
      if (p.age >= p.life) { arr.splice(i, 1); continue; }
      p.vy += (p.gravity || 600) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > state.groundY) { p.y = state.groundY; p.vy *= -0.3; p.vx *= 0.7; }
    }
  }
  function stepShake(dt) {
    if (state.shake.t > 0) {
      state.shake.t -= dt;
      state.camera.shakeX = (Math.random() - 0.5) * state.shake.amp * (state.shake.t > 0 ? 1 : 0);
      state.camera.shakeY = (Math.random() - 0.5) * state.shake.amp * (state.shake.t > 0 ? 1 : 0);
    } else {
      state.camera.shakeX = 0; state.camera.shakeY = 0;
    }
  }

  function checkEnd() {
    // Win if no alive targets
    const aliveTargets = state.targets.filter(t => t.alive).length;
    if (aliveTargets === 0) {
      endLevel(true);
      return;
    }
    if (state.shotsLeft <= 0 && (!state.projectile || !state.projectile.alive)) {
      endLevel(false);
      return;
    }
    // Reset projectile if none alive and shots remain. Use simulated time so
    // that a single manual step() drains the delay correctly.
    if ((!state.projectile || !state.projectile.alive) && state.shotsLeft > 0 && state.phase === 'settling') {
      if (state._settleTimer === undefined) {
        state._settleTimer = 0;
      }
      state._settleTimer += (state._lastTickDt || 0.016);
      if (state._settleTimer >= 0.3) {
        state._settleTimer = 0;
        resetProjectileOnSling();
        state.phase = 'aiming';
        updateAbilityButton();
      }
    } else {
      state._settleTimer = 0;
    }
  }

  function endLevel(victory) {
    state.phase = victory ? 'won' : 'lost';
    if (victory) {
      // Level completion bonuses
      const bonus = state.shotsLeft * 50;
      state.score += bonus;
      if (state.score > state.best) { state.best = state.score; saveSave(); }
      // Update HUD best
      const bestEl = document.getElementById('hud-best');
      if (bestEl) bestEl.textContent = state.best;
      // unlock next level (cosmetic; game already supports loadLevel)
      showEndOverlay(true, {
        level: state.level, score: state.score, shotsLeft: state.shotsLeft, bonus
      });
    } else {
      Audio.lose();
      showEndOverlay(false, {
        level: state.level, score: state.score, shotsLeft: state.shotsLeft
      });
    }
    updateAbilityButton();
  }

  // ---------- Rendering ----------
  const canvas = () => document.getElementById('stage');
  const ctx = () => canvas().getContext('2d');

  function drawBackground(c) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2238');
    g.addColorStop(0.45, '#283656');
    g.addColorStop(0.85, '#c97a55');
    g.addColorStop(1, '#5a3322');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Distant mountains
    c.fillStyle = 'rgba(20, 25, 45, 0.7)';
    c.beginPath();
    c.moveTo(0, 480);
    let x = 0;
    while (x <= W) {
      const h = 90 + Math.sin(x * 0.012) * 35 + Math.sin(x * 0.04) * 15;
      c.lineTo(x, 480 - h);
      x += 60;
    }
    c.lineTo(W, 480); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    // nearer hills
    c.fillStyle = 'rgba(30, 38, 60, 0.85)';
    c.beginPath();
    c.moveTo(0, 540);
    x = 0;
    while (x <= W) {
      const h = 50 + Math.sin(x * 0.015) * 22 + Math.sin(x * 0.06) * 8;
      c.lineTo(x, 540 - h);
      x += 50;
    }
    c.lineTo(W, 540); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    // Sun
    const sg = c.createRadialGradient(W - 180, 220, 30, W - 180, 220, 220);
    sg.addColorStop(0, 'rgba(255, 220, 170, 0.95)');
    sg.addColorStop(1, 'rgba(255, 180, 100, 0)');
    c.fillStyle = sg; c.fillRect(W - 360, 0, 360, 440);
    // ground
    c.fillStyle = '#3a2a18';
    c.fillRect(0, state.groundY, W, H - state.groundY);
    // grass strip
    c.fillStyle = '#4a7a3c';
    c.fillRect(0, state.groundY - 6, W, 6);
    // texture
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < W; i += 24) {
      c.fillRect(i, state.groundY + 8 + (i % 48 === 0 ? 4 : 0), 12, 2);
    }
  }

  function drawSling(c) {
    const sx = state.sling.x, sy = state.sling.y;
    // post
    c.save();
    c.translate(sx, sy);
    // base mound
    c.fillStyle = '#3a2a18';
    c.beginPath(); c.ellipse(0, 96, 60, 14, 0, 0, TAU); c.fill();
    // wood post
    c.fillStyle = '#5b3a1a';
    c.fillRect(-10, -60, 20, 160);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(-10, -60, 6, 160);
    // forks (Y)
    c.strokeStyle = '#5b3a1a'; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -60); c.lineTo(-30, -90); c.stroke();
    c.beginPath(); c.moveTo(0, -60); c.lineTo(30, -90); c.stroke();
    // pouch back-stop
    c.fillStyle = '#3b2410';
    c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
    c.restore();

    // elastic bands
    if (state.projectileOnSling || state.aim.active) {
      const pouchX = sx + state.aim.dx;
      const pouchY = sy + state.aim.dy;
      c.strokeStyle = '#2a1605'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sx - 30, sy - 90); c.lineTo(pouchX, pouchY); c.stroke();
      c.beginPath(); c.moveTo(sx + 30, sy - 90); c.lineTo(pouchX, pouchY); c.stroke();
      c.strokeStyle = '#7a4a22'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(sx - 30, sy - 90); c.lineTo(pouchX, pouchY); c.stroke();
      c.beginPath(); c.moveTo(sx + 30, sy - 90); c.lineTo(pouchX, pouchY); c.stroke();
    }
  }

  function drawProjectile(c) {
    const p = state.projectile;
    if (!p) return;
    if (state.projectileOnSling) {
      // draw in pouch
      const px = state.sling.x + state.aim.dx;
      const py = state.sling.y + state.aim.dy;
      drawBoulder(c, px, py, p.r);
    } else {
      // trail
      c.lineCap = 'round';
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i + 1) / p.trail.length;
        c.fillStyle = 'rgba(220, 180, 130,' + (a * 0.35).toFixed(3) + ')';
        c.beginPath(); c.arc(t.x, t.y, p.r * a * 0.85, 0, TAU); c.fill();
      }
      drawBoulder(c, p.x, p.y, p.r, p.spin);
      // glow ring if ability unused
      if (!p.abilityUsed && p.alive) {
        c.strokeStyle = 'rgba(240, 166, 66, 0.55)';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(p.x, p.y, p.r + 10 + Math.sin(nowMs() * 0.012) * 2, 0, TAU);
        c.stroke();
      }
    }
  }

  function drawBoulder(c, x, y, r, spin) {
    c.save();
    c.translate(x, y);
    if (spin) c.rotate(spin);
    const grad = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#b9a98a');
    grad.addColorStop(0.7, '#6f5b3c');
    grad.addColorStop(1, '#3a2c19');
    c.fillStyle = grad;
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.arc(r * 0.35, r * 0.35, r * 0.85, 0, TAU); c.fill();
    // cracks
    c.strokeStyle = 'rgba(40,25,10,0.7)'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-r * 0.4, -r * 0.2); c.lineTo(r * 0.1, -r * 0.5); c.lineTo(r * 0.5, -r * 0.1);
    c.moveTo(-r * 0.6, r * 0.1); c.lineTo(-r * 0.1, r * 0.4); c.lineTo(r * 0.4, r * 0.6);
    c.stroke();
    c.restore();
  }

  function drawBlocks(c) {
    for (let i = 0; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      if (b.broken) continue;
      if (b.kind === 'barrel') {
        drawBarrel(c, b);
      } else {
        drawRectBlock(c, b);
      }
    }
  }

  function drawRectBlock(c, b) {
    let fill, dark, light;
    if (b.kind === 'stone') { fill = '#8c8378'; dark = '#3d362d'; light = '#b9ad9c'; }
    else if (b.kind === 'glass') { fill = '#9fe7ff'; dark = '#3a8fa6'; light = '#dffaff'; }
    else if (b.kind === 'crate') { fill = '#a06c3a'; dark = '#5a3818'; light = '#cd9056'; }
    else { fill = '#9a6c3a'; dark = '#4a2f14'; light = '#c89262'; } // wood
    // body
    c.fillStyle = fill;
    c.fillRect(b.x, b.y, b.w, b.h);
    // top highlight
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(b.x, b.y, b.w, Math.max(3, b.h * 0.12));
    // damage cracks overlay
    const dmgFrac = 1 - clamp(b.hp / (b.kind === 'glass' ? 18 : (b.kind === 'stone' ? 220 : 60)), 0, 1);
    if (dmgFrac > 0.1) {
      c.strokeStyle = 'rgba(20,10,5,' + (dmgFrac * 0.7).toFixed(2) + ')';
      c.lineWidth = 1.2;
      const seed = (b.x * 13 + b.y * 7) | 0;
      for (let k = 0; k < Math.floor(dmgFrac * 4); k++) {
        const sx = b.x + ((seed + k * 31) % b.w);
        const sy = b.y + ((seed + k * 17) % b.h);
        c.beginPath(); c.moveTo(sx, sy);
        c.lineTo(sx + ((k * 7) % 18) - 9, sy + ((k * 11) % 14) - 7);
        c.stroke();
      }
    }
    // outline
    c.strokeStyle = dark; c.lineWidth = 2;
    c.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // wood grain / stone seams
    if (b.kind === 'wood' || b.kind === 'crate') {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(b.x, b.y + b.h * 0.5); c.lineTo(b.x + b.w, b.y + b.h * 0.5); c.stroke();
      c.beginPath(); c.moveTo(b.x + b.w * 0.5, b.y); c.lineTo(b.x + b.w * 0.5, b.y + b.h); c.stroke();
    } else if (b.kind === 'stone') {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
      const rows = Math.max(1, Math.floor(b.h / 24));
      for (let r = 1; r < rows; r++) {
        const yy = b.y + (b.h / rows) * r;
        c.beginPath(); c.moveTo(b.x, yy); c.lineTo(b.x + b.w, yy); c.stroke();
      }
    } else if (b.kind === 'glass') {
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(b.x + 4, b.y + 4, b.w * 0.3, b.h * 0.2);
    }
  }

  function drawBarrel(c, b) {
    c.save();
    c.translate(b.x, b.y);
    c.fillStyle = '#7a4a22';
    c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill();
    c.strokeStyle = '#3a2010'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,220,180,0.18)';
    c.beginPath(); c.arc(-b.r * 0.3, -b.r * 0.4, b.r * 0.5, 0, TAU); c.stroke();
    c.strokeStyle = '#2a1605'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-b.r, 0); c.lineTo(b.r, 0); c.stroke();
    c.beginPath(); c.moveTo(-b.r * 0.7, -b.r * 0.7); c.lineTo(b.r * 0.7, b.r * 0.7); c.stroke();
    c.beginPath(); c.moveTo(-b.r * 0.7, b.r * 0.7); c.lineTo(b.r * 0.7, -b.r * 0.7); c.stroke();
    c.restore();
  }

  function drawTargets(c) {
    for (let i = 0; i < state.targets.length; i++) {
      const t = state.targets[i];
      if (!t.alive) {
        // little flag of defeat on ground
        continue;
      }
      c.save();
      c.translate(t.x, t.y);
      // shadow
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath(); c.ellipse(0, t.r + 4, t.r * 0.9, 5, 0, 0, TAU); c.fill();
      const isCap = t.kind === 'captain';
      // body
      const grad = c.createRadialGradient(-t.r * 0.3, -t.r * 0.4, t.r * 0.2, 0, 0, t.r);
      if (isCap) {
        grad.addColorStop(0, '#5a8fbf'); grad.addColorStop(1, '#1c3450');
      } else {
        grad.addColorStop(0, '#7fbf6a'); grad.addColorStop(1, '#234a25');
      }
      c.fillStyle = grad;
      c.beginPath(); c.arc(0, 0, t.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, t.r, 0, TAU); c.stroke();
      // armor band
      c.strokeStyle = isCap ? '#ffd58a' : '#c2a87a'; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, t.r * 0.65, 0, TAU); c.stroke();
      // emblem (small shape)
      c.fillStyle = isCap ? '#ffd58a' : '#f4e9d2';
      c.beginPath();
      c.moveTo(0, -t.r * 0.4); c.lineTo(t.r * 0.3, t.r * 0.2); c.lineTo(-t.r * 0.3, t.r * 0.2); c.closePath();
      c.fill();
      // eyes
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(-t.r * 0.25, -t.r * 0.1, 3.5, 0, TAU); c.fill();
      c.beginPath(); c.arc(t.r * 0.25, -t.r * 0.1, 3.5, 0, TAU); c.fill();
      c.fillStyle = '#000';
      c.beginPath(); c.arc(-t.r * 0.25, -t.r * 0.1, 1.8, 0, TAU); c.fill();
      c.beginPath(); c.arc(t.r * 0.25, -t.r * 0.1, 1.8, 0, TAU); c.fill();
      // crown for captain
      if (isCap) {
        c.fillStyle = '#ffd58a';
        c.beginPath();
        c.moveTo(-t.r * 0.55, -t.r * 0.6);
        c.lineTo(-t.r * 0.3, -t.r * 0.95);
        c.lineTo(-t.r * 0.05, -t.r * 0.6);
        c.lineTo(t.r * 0.2, -t.r * 0.95);
        c.lineTo(t.r * 0.5, -t.r * 0.55);
        c.lineTo(t.r * 0.55, -t.r * 0.6);
        c.closePath(); c.fill();
        c.strokeStyle = '#7a4a22'; c.lineWidth = 1.5;
        c.stroke();
      }
      // hp bar
      const barW = t.r * 2.1, barH = 4;
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(-barW / 2, -t.r - 14, barW, barH);
      c.fillStyle = t.hp / t.maxHp > 0.5 ? '#7fbf6a' : (t.hp / t.maxHp > 0.25 ? '#f0a642' : '#e0584a');
      c.fillRect(-barW / 2 + 1, -t.r - 13, (barW - 2) * (t.hp / t.maxHp), barH - 2);
      // hit flash
      if (t.hitFlash > 0) {
        c.fillStyle = 'rgba(255,255,255,' + (t.hitFlash * 1.6).toFixed(3) + ')';
        c.beginPath(); c.arc(0, 0, t.r, 0, TAU); c.fill();
      }
      c.restore();
    }
  }

  function drawAimGuide(c) {
    if (!state.aim.active) return;
    const sx = state.sling.x, sy = state.sling.y;
    const dx = state.aim.dx, dy = state.aim.dy;
    const distPull = Math.hypot(dx, dy);
    const power = clamp(distPull / state.aim.maxPull, 0, 1);
    // direction is OPPOSITE of pull (like pulling a slingshot)
    const vx = -dx * 9; const vy = -dy * 9;
    // simulate trajectory
    c.save();
    c.strokeStyle = 'rgba(244,233,210,0.55)';
    c.setLineDash([6, 8]);
    c.lineWidth = 2;
    c.beginPath();
    let sx0 = sx, sy0 = sy;
    let vx0 = vx, vy0 = vy;
    c.moveTo(sx0, sy0);
    const g = state.gravity;
    const stepDt = 0.04;
    let prevX = sx0, prevY = sy0;
    for (let i = 0; i < 60; i++) {
      vy0 += g * stepDt;
      sx0 += vx0 * stepDt;
      sy0 += vy0 * stepDt;
      if (sy0 > state.groundY || sx0 > W || sx0 < 0) break;
      c.lineTo(sx0, sy0);
      prevX = sx0; prevY = sy0;
    }
    c.stroke();
    c.setLineDash([]);
    // power meter (vertical bar to the left of the sling)
    const barX = sx - 70, barY = sy - 110, barW = 8, barH = 110;
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(barX, barY, barW, barH);
    const c1 = '#7fbf6a', c2 = '#f0a642', c3 = '#e0584a';
    const color = power < 0.4 ? c1 : (power < 0.8 ? c2 : c3);
    c.fillStyle = color;
    c.fillRect(barX, barY + barH * (1 - power), barW, barH * power);
    c.strokeStyle = '#f4e9d2'; c.lineWidth = 1;
    c.strokeRect(barX, barY, barW, barH);
    // power label
    c.fillStyle = '#f4e9d2'; c.font = 'bold 11px ui-rounded, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText(Math.round(power * 100) + '%', barX + barW / 2, barY - 6);
    c.restore();
  }

  function drawParticles(c) {
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      const a = 1 - p.age / p.life;
      c.globalAlpha = clamp(a, 0, 1);
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  function render() {
    const cv = canvas();
    const c = cv.getContext('2d');
    c.save();
    c.translate(state.camera.shakeX, state.camera.shakeY);
    drawBackground(c);
    drawBlocks(c);
    drawTargets(c);
    drawSling(c);
    drawAimGuide(c);
    drawProjectile(c);
    drawParticles(c);
    c.restore();
  }

  // ---------- Input ----------
  // Convert pointer (clientX/Y) to logical (0..W, 0..H) coordinates accounting for CSS scaling.
  function pointerToLogical(clientX, clientY) {
    const cv = canvas();
    const rect = cv.getBoundingClientRect();
    const sx = rect.width > 0 ? W / rect.width : 1;
    const sy = rect.height > 0 ? H / rect.height : 1;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  function onPointerDown(e) {
    Audio.ensure();
    if (state.phase === 'title' || state.phase === 'won' || state.phase === 'lost') return;
    if (state.phase === 'paused') return;
    if (!state.projectileOnSling) return;
    const p = pointerToLogical(e.clientX, e.clientY);
    // Check near the boulder (allow grab area)
    const dx0 = p.x - state.sling.x;
    const dy0 = p.y - state.sling.y;
    if (dist2(dx0, dy0, 0, 0) > 90 * 90 && dist2(p.x, p.y, state.sling.x, state.sling.y) > 140 * 140) {
      // still allow drag if close to the sling pouch area
      if (Math.abs(dx0) > 220 || Math.abs(dy0) > 220) return;
    }
    state.aim.active = true;
    state.aim.dx = 0; state.aim.dy = 0;
    setAimFromPointer(p.x, p.y);
    e.preventDefault && e.preventDefault();
  }
  function onPointerMove(e) {
    if (!state.aim.active) return;
    const p = pointerToLogical(e.clientX, e.clientY);
    setAimFromPointer(p.x, p.y);
    e.preventDefault && e.preventDefault();
  }
  function onPointerUp() {
    if (!state.aim.active) return;
    fireFromAim();
  }

  function setAimFromPointer(px, py) {
    // pull direction is pointer relative to sling
    let dx = px - state.sling.x;
    let dy = py - state.sling.y;
    // Only allow pulling down-left for natural slingshot feel.
    if (dy > 0) dy = 0;
    // Clamp magnitude
    const m = Math.hypot(dx, dy);
    if (m > state.aim.maxPull) {
      dx = dx / m * state.aim.maxPull;
      dy = dy / m * state.aim.maxPull;
    }
    state.aim.dx = dx;
    state.aim.dy = dy;
  }

  function fireFromAim() {
    const distPull = Math.hypot(state.aim.dx, state.aim.dy);
    const power = clamp(distPull / state.aim.maxPull, 0, 1);
    if (power < 0.05) {
      state.aim.active = false;
      state.aim.dx = 0; state.aim.dy = 0;
      return;
    }
    const speed = 360 + power * 720;
    const dx = -state.aim.dx;
    const dy = -state.aim.dy;
    const len = Math.hypot(dx, dy) || 1;
    const p = state.projectile;
    p.x = state.sling.x + state.aim.dx;
    p.y = state.sling.y + state.aim.dy;
    p.vx = dx / len * speed;
    p.vy = dy / len * speed;
    p.alive = true;
    p.abilityUsed = false;
    p.trail.length = 0;
    p.trail.push({ x: p.x, y: p.y });
    p.bornAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    state.projectileOnSling = false;
    state.aim.active = false;
    state.aim.dx = 0; state.aim.dy = 0;
    state.phase = 'flying';
    state.shotsLeft -= 1;
    updateAmmoHUD();
    Audio.launch(power);
  }

  function activateAbility() {
    const p = state.projectile;
    if (!p || !p.alive || p.abilityUsed) return;
    if (state.phase !== 'flying') return;
    p.abilityUsed = true;
    // Detonation: AOE pulse around projectile, pushes blocks/targets outward.
    const cx = p.x, cy = p.y;
    const radius = 110;
    const force = 520;
    Audio.ability();
    // visual ring
    state.particles.push({
      kind: 'ring',
      x: cx, y: cy, r0: 10, r1: radius,
      life: 0.45, age: 0,
      color: '#f0a642', size: 4
    });
    // Big particle burst
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * TAU;
      const sp = rand(80, 360);
      state.particles.push({
        x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: rand(0.4, 0.8), age: 0,
        size: rand(3, 6), color: i % 2 ? '#ffd58a' : '#ff9b5a', gravity: 300
      });
    }
    // Apply to targets
    for (let i = 0; i < state.targets.length; i++) {
      const t = state.targets[i];
      if (!t.alive) continue;
      const d = dist(t.x, t.y, cx, cy);
      if (d < radius + t.r) {
        // Damage inversely with distance
        const dmg = Math.max(35, (1 - d / radius) * 120);
        hitTarget(t, dmg, 700);
      }
    }
    // Apply to blocks
    for (let i = 0; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      if (b.broken) continue;
      const bcx = b.x + (b.w ? b.w * 0.5 : 0);
      const bcy = b.y + (b.h ? b.h * 0.5 : 0);
      const d = dist(bcx, bcy, cx, cy);
      if (d < radius + (b.r || Math.max(b.w, b.h) * 0.5)) {
        const dirx = (bcx - cx) / (d || 1);
        const diry = (bcy - cy) / (d || 1);
        // treat blocks as static; just damage them strongly
        const dmg = Math.max(40, (1 - d / radius) * 140);
        applyHit(b, dmg, 800);
        state.shake.t = Math.max(state.shake.t, 0.3);
        state.shake.amp = Math.max(state.shake.amp, 10);
      }
    }
    state.shake.t = Math.max(state.shake.t, 0.3);
    state.shake.amp = Math.max(state.shake.amp, 12);
    updateAbilityButton();
  }

  function onKey(e) {
    if (e.key === 'p' || e.key === 'P') { togglePause(); e.preventDefault(); return; }
    if (e.key === 'r' || e.key === 'R') { restartCurrent(); e.preventDefault(); return; }
    if (e.key === 'm' || e.key === 'M') { toggleMute(); e.preventDefault(); return; }
    if (e.key === ' ' || e.code === 'Space') {
      // If on title, Space does nothing (button click instead).
      if (state.phase === 'flying') activateAbility();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (state.phase === 'paused') togglePause();
      else if (state.phase !== 'title') togglePause();
      e.preventDefault();
    }
  }

  // ---------- UI ----------
  function showBanner(title, sub, ms) {
    const b = document.getElementById('banner');
    if (!b) return;
    b.innerHTML = title + (sub ? '<span class="sub">' + sub + '</span>' : '');
    b.classList.remove('hidden');
    requestAnimationFrame(() => b.classList.add('show'));
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => {
      b.classList.remove('show');
      setTimeout(() => b.classList.add('hidden'), 320);
    }, ms || 1100);
  }

  function updateAmmoHUD() {
    const el = document.getElementById('hud-ammo');
    if (!el) return;
    let s = '';
    for (let i = 0; i < Math.max(0, state.shotsLeft); i++) s += '● ';
    el.textContent = s.trim() || '—';
    const lvl = document.getElementById('hud-level');
    if (lvl) lvl.textContent = state.level;
    const sc = document.getElementById('hud-score');
    if (sc) sc.textContent = state.score;
    const bs = document.getElementById('hud-best');
    if (bs) bs.textContent = state.best;
  }
  function updateAbilityButton() {
    const btn = document.getElementById('btn-ability');
    if (!btn) return;
    const usable = state.phase === 'flying' && state.projectile && state.projectile.alive && !state.projectile.abilityUsed;
    btn.disabled = !usable;
  }

  function showEndOverlay(victory, stats) {
    const ov = document.getElementById('end-overlay');
    const title = document.getElementById('end-title');
    const sub = document.getElementById('end-sub');
    const statsEl = document.getElementById('end-stats');
    const nextBtn = document.getElementById('btn-next');
    if (!ov) return;
    title.textContent = victory ? 'Victory!' : 'Defeat';
    sub.textContent = victory ? ('Fortress ' + stats.level + ' has fallen.') : ('Sentinels still hold Fortress ' + stats.level + '.');
    let bonusStr = victory ? 'Bonus  +' + (stats.bonus || 0) : 'Bonus  —';
    statsEl.innerHTML =
      '<div><span>Score</span><b>' + state.score + '</b></div>' +
      '<div><span>Best</span><b>' + state.best + '</b></div>' +
      '<div><span>Shots Left</span><b>' + state.shotsLeft + '</b></div>' +
      '<div><span>' + bonusStr.split('  ')[0] + '</span><b>' + (victory ? '+' + (stats.bonus || 0) : '—') + '</b></div>';
    if (victory && state.level < state.maxLevel) {
      nextBtn.classList.remove('hidden');
      nextBtn.textContent = 'Next Fortress →';
    } else {
      nextBtn.classList.add('hidden');
    }
    ov.classList.remove('hidden');
  }
  function hideEndOverlay() {
    const ov = document.getElementById('end-overlay');
    if (ov) ov.classList.add('hidden');
  }

  function showHUD(show) {
    const h = document.getElementById('hud');
    if (h) h.classList.toggle('hidden', !show);
  }

  // ---------- Pause / Restart / Start ----------
  function startGame() {
    hideEndOverlay();
    document.getElementById('title-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    showHUD(true);
    state.score = 0;
    loadLevel(state.level || 1);
    state.phase = 'aiming';
  }
  function restartCurrent() {
    if (state.phase === 'title') return;
    hideEndOverlay();
    document.getElementById('pause-overlay').classList.add('hidden');
    loadLevel(state.level);
    state.phase = 'aiming';
  }
  function nextLevel() {
    if (state.level >= state.maxLevel) return;
    hideEndOverlay();
    state.level += 1;
    loadLevel(state.level);
  }
  function backToTitle() {
    state.phase = 'title';
    hideEndOverlay();
    document.getElementById('pause-overlay').classList.add('hidden');
    showHUD(false);
    document.getElementById('title-overlay').classList.remove('hidden');
    const tb = document.getElementById('title-best');
    if (tb) tb.textContent = 'Best ' + state.best;
    const tu = document.getElementById('title-unlock');
    if (tu) tu.textContent = 'Fortress ' + Math.min(state.level, state.maxLevel) + ' / ' + state.maxLevel + ' unlocked';
  }
  function togglePause() {
    if (state.phase === 'title' || state.phase === 'won' || state.phase === 'lost') return;
    if (state.phase === 'paused') {
      resume();
    } else {
      pause();
    }
  }
  function pause() {
    if (state.phase === 'paused') return;
    if (state.phase === 'title' || state.phase === 'won' || state.phase === 'lost') return;
    state._prevPhase = state.phase;
    state.phase = 'paused';
    document.getElementById('pause-overlay').classList.remove('hidden');
  }
  function resume() {
    if (state.phase !== 'paused') return;
    state.phase = state._prevPhase || 'aiming';
    document.getElementById('pause-overlay').classList.add('hidden');
    state.lastFrameMs = 0;
  }
  function toggleMute() {
    Audio.setMuted(!Audio.isMuted());
    const btn = document.getElementById('btn-mute');
    if (btn) btn.textContent = Audio.isMuted() ? '✕' : '♪';
    saveSave();
  }

  // ---------- Main loop ----------
  function loop(ts) {
    if (!state.lastFrameMs) state.lastFrameMs = ts;
    let dt = (ts - state.lastFrameMs) / 1000;
    if (dt > 0.05) dt = 0.05; // clamp big stalls
    state.lastFrameMs = ts;
    if (!state.manualClock && state.phase !== 'paused') {
      tick(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  function tick(dt) {
    state._lastTickDt = dt;
    if (state.phase === 'paused') return;
    if (state.phase === 'flying') {
      stepPhysics(dt);
    } else if (state.phase === 'settling') {
      stepParticles(dt);
      stepShake(dt);
      if (state.pendingEndCheck) {
        state.pendingEndCheck = false;
        checkEnd();
      } else {
        // particles finishing; also check next-shot timing
        checkEnd();
      }
    } else {
      stepParticles(dt);
      stepShake(dt);
    }
  }

  // ---------- Test interface ----------
  function snapshot() {
    return {
      phase: state.phase,
      level: state.level,
      score: state.score,
      shotsLeft: state.shotsLeft,
      projectile: state.projectile ? {
        x: state.projectile.x, y: state.projectile.y,
        vx: state.projectile.vx, vy: state.projectile.vy,
        r: state.projectile.r, alive: state.projectile.alive,
        abilityUsed: state.projectile.abilityUsed
      } : null,
      targets: state.targets.map(t => ({
        id: t.id, kind: t.kind, x: t.x, y: t.y, r: t.r,
        hp: t.hp, maxHp: t.maxHp, alive: t.alive, points: t.points
      })),
      blocks: state.blocks.map(b => ({
        kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, r: b.r,
        hp: b.hp, broken: b.broken
      })),
      gravity: state.gravity,
      groundY: state.groundY,
      sling: { x: state.sling.x, y: state.sling.y },
      aim: { dx: state.aim.dx, dy: state.aim.dy, active: state.aim.active },
      manualClock: state.manualClock,
      best: state.best
    };
  }

  function _ensurePlaying() {
    if (state.phase === 'title') startGame();
  }
  function start() {
    if (state.phase !== 'title') backToTitle();
    startGame();
  }
  function setManualClock(enabled) {
    state.manualClock = !!enabled;
    state.lastFrameMs = 0;
  }
  function step(ms) {
    // Manual clock advance. Paused phase is a no-op per spec.
    if (state.phase === 'paused') return;
    const dt = Math.max(0, (ms || 16)) / 1000;
    // Advance in fixed sub-steps for stability. Use a generous safety cap
    // so a single large step() call (e.g. 3000 ms) fully drains.
    const SUB = 0.02;
    let remaining = dt;
    let safety = 400; // 400 * 0.02s = 8s of simulated time, enough for one big step
    while (remaining > 1e-4 && safety-- > 0) {
      const sub = Math.min(remaining, SUB);
      tick(sub);
      remaining -= sub;
      if (state.phase === 'paused') break;
      // If the level ended, stop advancing further.
      if (state.phase === 'won' || state.phase === 'lost') break;
    }
  }
  function aim(dx, dy) {
    _ensurePlaying();
    state.aim.active = true;
    state.aim.dx = dx;
    state.aim.dy = dy;
  }
  function launch() {
    if (!state.aim.active) {
      // default aim
      state.aim.dx = -60; state.aim.dy = -40;
      state.aim.active = true;
    }
    fireFromAim();
  }
  function loadLevelFn(level) {
    state.level = clamp(level | 0, 1, state.maxLevel);
    loadLevel(state.level);
    state.phase = 'aiming';
  }
  function forceHit(targetId) {
    // Apply a strong hit on the given target id (tests may not have a flying projectile)
    const t = state.targets.find(x => x.id === targetId);
    if (!t) return { ok: false, reason: 'no such target' };
    if (!t.alive) return { ok: true, killed: true, score: state.score };
    const dmg = Math.max(t.hp + 5, 100);
    const killed = hitTarget(t, dmg, 1000);
    // settle or end
    if (state.targets.every(x => !x.alive)) {
      endLevel(true);
    }
    return { ok: true, killed, score: state.score, phase: state.phase };
  }

  // ---------- Wire DOM ----------
  function wire() {
    const cv = canvas();
    cv.addEventListener('mousedown', onPointerDown);
    cv.addEventListener('mousemove', onPointerMove);
    cv.addEventListener('mouseup', onPointerUp);
    cv.addEventListener('mouseleave', onPointerUp);
    cv.addEventListener('touchstart', function (e) {
      if (!e.touches.length) return;
      const t = e.touches[0];
      onPointerDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      if (!e.touches.length) return;
      const t = e.touches[0];
      onPointerMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
    }, { passive: false });
    cv.addEventListener('touchend', function (e) {
      onPointerUp();
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', onKey);

    document.getElementById('btn-start').addEventListener('click', function () {
      Audio.ensure();
      Audio.uiClick();
      startGame();
    });
    document.getElementById('btn-restart').addEventListener('click', function () {
      Audio.uiClick();
      restartCurrent();
    });
    document.getElementById('btn-pause').addEventListener('click', function () {
      Audio.uiClick();
      togglePause();
    });
    document.getElementById('btn-mute').addEventListener('click', function () {
      toggleMute();
    });
    document.getElementById('btn-ability').addEventListener('click', function () {
      activateAbility();
    });
    document.getElementById('btn-next').addEventListener('click', function () {
      Audio.uiClick();
      nextLevel();
    });
    document.getElementById('btn-replay').addEventListener('click', function () {
      Audio.uiClick();
      restartCurrent();
    });
    document.getElementById('btn-home').addEventListener('click', function () {
      Audio.uiClick();
      backToTitle();
    });
    // pause overlay buttons
    document.querySelectorAll('#pause-overlay [data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Audio.uiClick();
        const a = btn.getAttribute('data-action');
        if (a === 'resume') resume();
        else if (a === 'restart') restartCurrent();
        else if (a === 'menu') backToTitle();
      });
    });
    // Title overlay restart-anytime? not needed.

    // Resize canvas internal buffer to match displayed aspect (keep 16:9)
    function fitCanvas() {
      const cv = canvas();
      // Maintain 1280x720 internal buffer; CSS sizes it.
      // Ensure letterbox fits viewport without horizontal overflow.
      cv.style.maxWidth = '100vw';
      cv.style.maxHeight = '100vh';
    }
    window.addEventListener('resize', fitCanvas);
    fitCanvas();
  }

  // ---------- Boot ----------
  function boot() {
    loadSave();
    state.level = 1;
    state.score = 0;
    state.phase = 'title';
    showHUD(false);
    document.getElementById('title-overlay').classList.remove('hidden');
    document.getElementById('end-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('title-best').textContent = 'Best ' + state.best;
    document.getElementById('title-unlock').textContent = 'Fortress 1 / ' + state.maxLevel + ' unlocked';
    wire();
    requestAnimationFrame(loop);
    // Expose test interface
    global.__SLINGSHOT_TEST__ = {
      snapshot: snapshot,
      start: start,
      restart: restartCurrent,
      loadLevel: loadLevelFn,
      pause: pause,
      resume: resume,
      setManualClock: setManualClock,
      step: step,
      aim: aim,
      launch: launch,
      activateAbility: activateAbility,
      forceHit: forceHit,
      // helpers
      state: state,
      constants: { W: W, H: H },
      audioMute: function (m) { Audio.setMuted(m); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);

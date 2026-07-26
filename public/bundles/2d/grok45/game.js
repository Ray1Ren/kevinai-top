/**
 * Sling Siege / 弹弓攻城
 * Original canvas physics siege game — pure HTML/CSS/JS + Web Audio.
 */
(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────
  const W = 1280;
  const H = 720;
  const GROUND_Y = 620;
  const GRAVITY = 2200;
  const SLING = { x: 180, y: 500, forkW: 34, forkH: 78, baseH: 90 };
  const MAX_PULL = 140;
  const LAUNCH_POWER = 8.2;
  const REST_POS = { x: SLING.x, y: SLING.y - 8 };
  const PROJECTILE_R = 18;
  const SETTLE_SPEED = 18;
  const SETTLE_TIME = 1.15;
  const FLY_TIMEOUT = 8.5;
  const STORAGE_KEY = 'slingSiege_v1';

  // Phases
  const PHASE = {
    TITLE: 'title',
    INTRO: 'intro',
    AIM: 'aim',
    FLYING: 'flying',
    SETTLING: 'settling',
    WIN: 'win',
    LOSE: 'lose',
    PAUSED: 'paused',
  };

  // ─── DOM ─────────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const hintBar = document.getElementById('hintBar');
  const hudLevel = document.getElementById('hudLevel');
  const hudScore = document.getElementById('hudScore');
  const hudShots = document.getElementById('hudShots');
  const btnMute = document.getElementById('btnMute');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayPause = document.getElementById('overlayPause');
  const overlayWin = document.getElementById('overlayWin');
  const overlayLose = document.getElementById('overlayLose');
  const overlayLevel = document.getElementById('overlayLevel');
  const titleMeta = document.getElementById('titleMeta');
  const winText = document.getElementById('winText');
  const loseText = document.getElementById('loseText');
  const levelTag = document.getElementById('levelTag');
  const levelName = document.getElementById('levelName');
  const levelDesc = document.getElementById('levelDesc');

  // ─── Audio (procedural Web Audio) ────────────────────────────
  const AudioSys = {
    ctx: null,
    muted: false,
    master: null,

    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
    },

    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.35;
      btnMute.textContent = m ? '🔇' : '🔊';
    },

    beep(freq, dur, type, vol, slide) {
      this.ensure();
      if (!this.ctx || this.muted) return;
      try {
        const t0 = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine';
        if (o.frequency && o.frequency.setValueAtTime) {
          o.frequency.setValueAtTime(freq, t0);
          if (slide && o.frequency.exponentialRampToValueAtTime) {
            o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
          }
        } else if (o.frequency) {
          o.frequency.value = freq;
        }
        if (g.gain && g.gain.setValueAtTime) {
          g.gain.setValueAtTime(0.0001, t0);
          if (g.gain.exponentialRampToValueAtTime) {
            g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          }
        } else if (g.gain) {
          g.gain.value = vol || 0.2;
        }
        o.connect(g);
        g.connect(this.master);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      } catch (_) {
        /* ignore audio failures */
      }
    },

    noise(dur, vol) {
      this.ensure();
      if (!this.ctx || this.muted) return;
      try {
        const n = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        g.gain.value = vol || 0.15;
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start();
      } catch (_) {
        /* ignore audio failures */
      }
    },

    launch() {
      this.beep(180, 0.12, 'triangle', 0.18, 420);
      this.noise(0.08, 0.1);
    },
    hit() {
      this.beep(90, 0.1, 'square', 0.12, 50);
      this.noise(0.12, 0.18);
    },
    break() {
      this.noise(0.18, 0.22);
      this.beep(300, 0.15, 'sawtooth', 0.08, 80);
    },
    ability() {
      this.beep(520, 0.18, 'sine', 0.16, 180);
      this.beep(260, 0.22, 'triangle', 0.12, 90);
    },
    win() {
      this.beep(440, 0.12, 'sine', 0.15);
      setTimeout(() => this.beep(554, 0.12, 'sine', 0.15), 100);
      setTimeout(() => this.beep(659, 0.22, 'sine', 0.18), 200);
    },
    lose() {
      this.beep(220, 0.2, 'triangle', 0.14, 110);
      setTimeout(() => this.beep(140, 0.3, 'triangle', 0.12, 70), 160);
    },
    ui() {
      this.beep(660, 0.06, 'sine', 0.08);
    },
  };

  // ─── Persistence ─────────────────────────────────────────────
  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { highScore: 0, maxUnlocked: 1 };
      const d = JSON.parse(raw);
      return {
        highScore: Math.max(0, d.highScore | 0),
        maxUnlocked: Math.min(3, Math.max(1, d.maxUnlocked | 0)),
      };
    } catch (_) {
      return { highScore: 0, maxUnlocked: 1 };
    }
  }

  function writeSave() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ highScore: state.highScore, maxUnlocked: state.maxUnlocked })
      );
    } catch (_) {}
  }

  // ─── Level data (original layouts) ───────────────────────────
  // Materials: wood (lighter, weaker), stone (heavier, tougher)
  function makeBlock(x, y, w, h, mat) {
    const isWood = mat === 'wood';
    return {
      type: 'block',
      mat,
      x,
      y,
      w,
      h,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      hp: isWood ? 42 : 85,
      maxHp: isWood ? 42 : 85,
      mass: isWood ? 1.1 : 2.4,
      friction: isWood ? 0.82 : 0.9,
      restitution: isWood ? 0.25 : 0.15,
      alive: true,
      settled: false,
    };
  }

  function makeGuard(x, y, hp) {
    return {
      type: 'guard',
      id: 0,
      x,
      y,
      r: 22,
      vx: 0,
      vy: 0,
      hp: hp || 30,
      maxHp: hp || 30,
      mass: 1.4,
      alive: true,
      flash: 0,
      bob: Math.random() * Math.PI * 2,
    };
  }

  const LEVELS = [
    {
      id: 1,
      name: '前哨木架',
      desc: '简单木台，两名晶卫。拖拽瞄准，撞倒结构即可。',
      shots: 4,
      groundPads: [{ x: 720, w: 520 }],
      blocks: [
        // platform + tower, easy to topple
        makeBlock(820, GROUND_Y - 28, 120, 28, 'wood'),
        makeBlock(840, GROUND_Y - 28 - 70, 22, 70, 'wood'),
        makeBlock(900, GROUND_Y - 28 - 70, 22, 70, 'wood'),
        makeBlock(820, GROUND_Y - 28 - 70 - 22, 120, 22, 'wood'),
        makeBlock(860, GROUND_Y - 28 - 70 - 22 - 50, 40, 50, 'wood'),
      ],
      guards: [makeGuard(880, GROUND_Y - 28 - 70 - 22 - 50 - 22, 28), makeGuard(960, GROUND_Y - 22, 24)],
    },
    {
      id: 2,
      name: '双塔栈桥',
      desc: '木石混搭双塔，注意支撑与脉冲时机。',
      shots: 4,
      groundPads: [{ x: 700, w: 540 }],
      blocks: [
        // left tower stone base
        makeBlock(760, GROUND_Y - 40, 50, 40, 'stone'),
        makeBlock(760, GROUND_Y - 40 - 55, 20, 55, 'wood'),
        makeBlock(790, GROUND_Y - 40 - 55, 20, 55, 'wood'),
        makeBlock(750, GROUND_Y - 40 - 55 - 20, 70, 20, 'wood'),
        // bridge
        makeBlock(820, GROUND_Y - 40 - 55 - 16, 140, 16, 'wood'),
        // right tower
        makeBlock(960, GROUND_Y - 50, 55, 50, 'stone'),
        makeBlock(965, GROUND_Y - 50 - 70, 22, 70, 'wood'),
        makeBlock(1000, GROUND_Y - 50 - 70, 22, 70, 'wood'),
        makeBlock(950, GROUND_Y - 50 - 70 - 22, 80, 22, 'stone'),
        makeBlock(970, GROUND_Y - 50 - 70 - 22 - 45, 40, 45, 'wood'),
        // extra pillar
        makeBlock(880, GROUND_Y - 90, 24, 90, 'wood'),
      ],
      guards: [
        makeGuard(785, GROUND_Y - 40 - 55 - 20 - 22, 32),
        makeGuard(990, GROUND_Y - 50 - 70 - 22 - 45 - 22, 36),
        makeGuard(1050, GROUND_Y - 22, 28),
      ],
    },
    {
      id: 3,
      name: '要塞尖塔',
      desc: '多层石木要塞，守卫分散。善用脉冲与连锁倒塌。',
      shots: 5,
      groundPads: [{ x: 680, w: 560 }],
      blocks: [
        // lower wall
        makeBlock(780, GROUND_Y - 36, 90, 36, 'stone'),
        makeBlock(900, GROUND_Y - 36, 90, 36, 'stone'),
        // mid columns
        makeBlock(800, GROUND_Y - 36 - 80, 24, 80, 'wood'),
        makeBlock(850, GROUND_Y - 36 - 80, 24, 80, 'wood'),
        makeBlock(920, GROUND_Y - 36 - 80, 24, 80, 'wood'),
        makeBlock(970, GROUND_Y - 36 - 80, 24, 80, 'wood'),
        // mid deck
        makeBlock(780, GROUND_Y - 36 - 80 - 20, 230, 20, 'wood'),
        // upper tower left
        makeBlock(800, GROUND_Y - 36 - 80 - 20 - 70, 28, 70, 'stone'),
        makeBlock(840, GROUND_Y - 36 - 80 - 20 - 70, 28, 70, 'wood'),
        makeBlock(790, GROUND_Y - 36 - 80 - 20 - 70 - 18, 90, 18, 'wood'),
        // upper right peak
        makeBlock(940, GROUND_Y - 36 - 80 - 20 - 90, 30, 90, 'stone'),
        makeBlock(980, GROUND_Y - 36 - 80 - 20 - 60, 30, 60, 'wood'),
        makeBlock(930, GROUND_Y - 36 - 80 - 20 - 90 - 18, 90, 18, 'stone'),
        makeBlock(955, GROUND_Y - 36 - 80 - 20 - 90 - 18 - 40, 36, 40, 'wood'),
        // free standing stack far right
        makeBlock(1080, GROUND_Y - 70, 30, 70, 'wood'),
        makeBlock(1070, GROUND_Y - 70 - 20, 50, 20, 'wood'),
        makeBlock(1085, GROUND_Y - 70 - 20 - 40, 24, 40, 'wood'),
      ],
      guards: [
        makeGuard(835, GROUND_Y - 36 - 80 - 20 - 70 - 18 - 22, 38),
        makeGuard(973, GROUND_Y - 36 - 80 - 20 - 90 - 18 - 40 - 22, 42),
        makeGuard(1097, GROUND_Y - 70 - 20 - 40 - 22, 34),
        makeGuard(860, GROUND_Y - 22, 30),
      ],
    },
  ];

  // ─── Game state ──────────────────────────────────────────────
  const state = {
    phase: PHASE.TITLE,
    prevPhase: PHASE.TITLE,
    level: 1,
    score: 0,
    shotsLeft: 0,
    highScore: 0,
    maxUnlocked: 1,
    dragging: false,
    pullX: 0,
    pullY: 0,
    projectile: null,
    blocks: [],
    guards: [],
    particles: [],
    trails: [],
    shake: 0,
    settleTimer: 0,
    flyTimer: 0,
    abilityUsed: false,
    abilityFlash: 0,
    levelIntroTimer: 0,
    muted: false,
    manualClock: false,
    lastTs: 0,
    animId: 0,
    nextGuardId: 1,
    roundScore: 0,
    waitingEnd: false,
  };

  // ─── Helpers ─────────────────────────────────────────────────
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function cloneLevel(levelIndex) {
    const L = LEVELS[levelIndex - 1];
    const blocks = L.blocks.map((b) => ({
      ...b,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      alive: true,
      hp: b.maxHp,
    }));
    const guards = L.guards.map((g) => {
      const ng = {
        ...g,
        id: state.nextGuardId++,
        vx: 0,
        vy: 0,
        alive: true,
        hp: g.maxHp,
        flash: 0,
      };
      return ng;
    });
    return { meta: L, blocks, guards };
  }

  function spawnProjectile() {
    state.projectile = {
      x: REST_POS.x,
      y: REST_POS.y,
      vx: 0,
      vy: 0,
      r: PROJECTILE_R,
      alive: true,
      launched: false,
      trail: [],
      abilityUsed: false,
    };
    state.abilityUsed = false;
    state.dragging = false;
    state.pullX = 0;
    state.pullY = 0;
  }

  function updateHUD() {
    hudLevel.textContent = String(state.level);
    hudScore.textContent = String(state.score);
    hudShots.textContent = String(state.shotsLeft);
    titleMeta.textContent = `最高分 ${state.highScore} · 已解锁第 ${state.maxUnlocked} 关`;
  }

  function showOverlay(el) {
    [overlayTitle, overlayPause, overlayWin, overlayLose, overlayLevel].forEach((o) => {
      o.classList.add('hidden');
    });
    if (el) el.classList.remove('hidden');
  }

  function setPhase(p) {
    if (p === PHASE.PAUSED && state.phase !== PHASE.PAUSED) {
      state.prevPhase = state.phase;
    }
    state.phase = p;
    const playing = p !== PHASE.TITLE && p !== PHASE.WIN && p !== PHASE.LOSE;
    hud.classList.toggle('hidden', !playing && p !== PHASE.PAUSED && p !== PHASE.INTRO);
    if (p === PHASE.PAUSED) hud.classList.remove('hidden');
    hintBar.classList.toggle(
      'hidden',
      !(p === PHASE.AIM || p === PHASE.FLYING || p === PHASE.SETTLING || p === PHASE.INTRO)
    );

    if (p === PHASE.TITLE) showOverlay(overlayTitle);
    else if (p === PHASE.PAUSED) showOverlay(overlayPause);
    else if (p === PHASE.WIN) showOverlay(overlayWin);
    else if (p === PHASE.LOSE) showOverlay(overlayLose);
    else if (p === PHASE.INTRO) showOverlay(overlayLevel);
    else showOverlay(null);

    updateHUD();
  }

  // ─── Particles ───────────────────────────────────────────────
  function addParticles(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (speed || 120) * (0.4 + Math.random());
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.55,
        max: 0.9,
        r: 2 + Math.random() * 4,
        color: color || '#f0a030',
      });
    }
    // cap
    if (state.particles.length > 280) state.particles.splice(0, state.particles.length - 280);
  }

  function addShake(amt) {
    state.shake = Math.min(14, state.shake + amt);
  }

  // ─── Physics ─────────────────────────────────────────────────
  function rectCircleCollide(rx, ry, rw, rh, cx, cy, cr) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 > cr * cr) return null;
    const d = Math.sqrt(d2) || 0.0001;
    return { nx: dx / d, ny: dy / d, pen: cr - d, px: nx, py: ny };
  }

  function circleCircle(ax, ay, ar, bx, by, br) {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const min = ar + br;
    if (d >= min) return null;
    return { nx: dx / d, ny: dy / d, pen: min - d };
  }

  function applyImpulseToBlock(b, ix, iy, px, py) {
    const inv = 1 / b.mass;
    b.vx += ix * inv;
    b.vy += iy * inv;
    // torque from contact offset
    const ox = px - (b.x + b.w / 2);
    const oy = py - (b.y + b.h / 2);
    b.omega += (ox * iy - oy * ix) * inv * 0.0008;
  }

  function damageBlock(b, amount, cx, cy) {
    if (!b.alive) return;
    b.hp -= amount;
    if (amount > 4) {
      addParticles(cx, cy, 4, b.mat === 'wood' ? '#c48a4a' : '#8a9bb0', 80);
    }
    if (b.hp <= 0) {
      b.alive = false;
      state.score += b.mat === 'stone' ? 80 : 40;
      state.roundScore += b.mat === 'stone' ? 80 : 40;
      addParticles(b.x + b.w / 2, b.y + b.h / 2, 14, b.mat === 'wood' ? '#d4a060' : '#a8b8c8', 180);
      addShake(3);
      AudioSys.break();
      updateHUD();
    }
  }

  function damageGuard(g, amount, fromForce) {
    if (!g.alive) return;
    g.hp -= amount;
    g.flash = 0.25;
    addParticles(g.x, g.y, 8, '#5ddea0', 140);
    if (fromForce) AudioSys.hit();
    if (g.hp <= 0) {
      g.alive = false;
      g.hp = 0;
      state.score += 250;
      state.roundScore += 250;
      addParticles(g.x, g.y, 22, '#3ecfbf', 220);
      addParticles(g.x, g.y, 10, '#f0a030', 160);
      addShake(5);
      AudioSys.break();
      updateHUD();
    }
  }

  function resolveProjectileWorld(dt) {
    const p = state.projectile;
    if (!p || !p.alive || !p.launched) return;

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // trail
    p.trail.push({ x: p.x, y: p.y, life: 0.45 });
    if (p.trail.length > 24) p.trail.shift();

    // ground
    if (p.y + p.r > GROUND_Y) {
      p.y = GROUND_Y - p.r;
      const impact = Math.abs(p.vy);
      if (impact > 80) {
        addParticles(p.x, GROUND_Y, 6, '#c8b898', 60);
        if (impact > 400) addShake(1.5);
      }
      p.vy *= -0.28;
      p.vx *= 0.72;
      if (Math.abs(p.vy) < 60) p.vy = 0;
      if (Math.abs(p.vx) < 20 && Math.abs(p.vy) < 40) {
        p.vx *= 0.5;
      }
    }

    // left/right bounds soft
    if (p.x < p.r) {
      p.x = p.r;
      p.vx *= -0.4;
    }
    if (p.x > W - p.r) {
      p.x = W - p.r;
      p.vx *= -0.4;
    }
    // floor kill if off bottom-ish
    if (p.y > H + 80) p.alive = false;

    // blocks
    for (const b of state.blocks) {
      if (!b.alive) continue;
      const hit = rectCircleCollide(b.x, b.y, b.w, b.h, p.x, p.y, p.r);
      if (!hit) continue;
      // separate
      p.x += hit.nx * hit.pen;
      p.y += hit.ny * hit.pen;
      const vn = p.vx * hit.nx + p.vy * hit.ny;
      if (vn < 0) {
        const rest = 0.35;
        p.vx -= (1 + rest) * vn * hit.nx;
        p.vy -= (1 + rest) * vn * hit.ny;
        // friction tangent
        const tx = -hit.ny;
        const ty = hit.nx;
        const vt = p.vx * tx + p.vy * ty;
        p.vx -= vt * tx * 0.35;
        p.vy -= vt * ty * 0.35;

        const impulse = Math.abs(vn) * 1.8;
        applyImpulseToBlock(b, -hit.nx * impulse * 0.55, -hit.ny * impulse * 0.55, hit.px, hit.py);
        const dmg = Math.abs(vn) * 0.028 * (b.mat === 'wood' ? 1.35 : 0.85);
        if (dmg > 2) {
          damageBlock(b, dmg, hit.px, hit.py);
          AudioSys.hit();
          addShake(Math.min(4, Math.abs(vn) * 0.004));
        }
      }
    }

    // guards
    for (const g of state.guards) {
      if (!g.alive) continue;
      const hit = circleCircle(p.x, p.y, p.r, g.x, g.y, g.r);
      if (!hit) continue;
      p.x -= hit.nx * hit.pen * 0.55;
      p.y -= hit.ny * hit.pen * 0.55;
      g.x += hit.nx * hit.pen * 0.45;
      g.y += hit.ny * hit.pen * 0.45;
      const rvx = p.vx - g.vx;
      const rvy = p.vy - g.vy;
      const vn = rvx * hit.nx + rvy * hit.ny;
      if (vn < 0) {
        const j = (-(1 + 0.4) * vn) / 2;
        p.vx += -j * hit.nx;
        p.vy += -j * hit.ny;
        g.vx += j * hit.nx * 1.2;
        g.vy += j * hit.ny * 1.2;
        const speed = Math.sqrt(rvx * rvx + rvy * rvy);
        if (speed > 120) {
          damageGuard(g, speed * 0.045, true);
          addShake(2);
        }
      }
    }
  }

  function resolveBlocks(dt) {
    for (const b of state.blocks) {
      if (!b.alive) continue;
      b.vy += GRAVITY * dt * 0.92;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.omega * dt;
      b.omega *= 0.98;

      // ground
      if (b.y + b.h > GROUND_Y) {
        b.y = GROUND_Y - b.h;
        if (b.vy > 80) {
          const fallDmg = (b.vy - 80) * 0.04 * (b.mat === 'wood' ? 1.2 : 0.7);
          if (fallDmg > 3) damageBlock(b, fallDmg, b.x + b.w / 2, b.y + b.h);
          addParticles(b.x + b.w / 2, GROUND_Y, 3, '#c8b898', 40);
        }
        b.vy *= -0.12;
        b.vx *= b.friction * 0.96;
        b.omega *= 0.65;
        if (Math.abs(b.vy) < 50) b.vy = 0;
        if (Math.abs(b.vx) < 18) b.vx = 0;
        if (Math.abs(b.omega) < 0.15) b.omega = 0;
      }

      // bounds
      if (b.x < 40) {
        b.x = 40;
        b.vx *= -0.3;
      }
      if (b.x + b.w > W - 20) {
        b.x = W - 20 - b.w;
        b.vx *= -0.3;
      }
      if (b.y > H + 100) b.alive = false;
    }

    // block-block simple separation
    const alive = state.blocks.filter((b) => b.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const ax2 = a.x + a.w;
        const ay2 = a.y + a.h;
        const bx2 = b.x + b.w;
        const by2 = b.y + b.h;
        if (a.x >= bx2 || b.x >= ax2 || a.y >= by2 || b.y >= ay2) continue;
        const overlapX = Math.min(ax2, bx2) - Math.max(a.x, b.x);
        const overlapY = Math.min(ay2, by2) - Math.max(a.y, b.y);
        const totalMass = a.mass + b.mass;
        if (overlapX < overlapY) {
          const s = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
          const push = overlapX;
          a.x += (s * push * b.mass) / totalMass;
          b.x -= (s * push * a.mass) / totalMass;
          const rv = a.vx - b.vx;
          if (rv * s > 0) {
            const imp = rv * 0.5;
            a.vx -= (imp * b.mass) / totalMass;
            b.vx += (imp * a.mass) / totalMass;
            const rel = Math.abs(rv);
            if (rel > 100) {
              damageBlock(a, rel * 0.015, (a.x + b.x) / 2, (a.y + b.y) / 2 + a.h / 2);
              damageBlock(b, rel * 0.015, (a.x + b.x) / 2, (a.y + b.y) / 2 + b.h / 2);
            }
          }
        } else {
          const s = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;
          const push = overlapY;
          a.y += (s * push * b.mass) / totalMass;
          b.y -= (s * push * a.mass) / totalMass;
          const rv = a.vy - b.vy;
          if (rv * s > 0) {
            const imp = rv * 0.55;
            a.vy -= (imp * b.mass) / totalMass;
            b.vy += (imp * a.mass) / totalMass;
            // resting friction
            if (s < 0 && Math.abs(a.vy) < 30) {
              a.vx *= 0.9;
              b.vx *= 0.9;
            }
            const rel = Math.abs(rv);
            if (rel > 120) {
              damageBlock(a, rel * 0.018, a.x + a.w / 2, a.y + a.h);
              damageBlock(b, rel * 0.018, b.x + b.w / 2, b.y);
            }
          }
        }
      }
    }
  }

  function resolveGuards(dt) {
    for (const g of state.guards) {
      if (!g.alive) continue;
      g.vy += GRAVITY * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.995;
      g.bob += dt * 3;
      if (g.flash > 0) g.flash -= dt;

      // ground
      if (g.y + g.r > GROUND_Y) {
        g.y = GROUND_Y - g.r;
        if (g.vy > 350) {
          damageGuard(g, (g.vy - 350) * 0.05, true);
        }
        g.vy *= -0.2;
        g.vx *= 0.75;
        if (Math.abs(g.vy) < 40) g.vy = 0;
      }

      // blocks support / crush
      for (const b of state.blocks) {
        if (!b.alive) continue;
        const hit = rectCircleCollide(b.x, b.y, b.w, b.h, g.x, g.y, g.r);
        if (!hit) continue;
        g.x += hit.nx * hit.pen;
        g.y += hit.ny * hit.pen;
        const vn = g.vx * hit.nx + g.vy * hit.ny;
        if (vn < 0) {
          g.vx -= vn * hit.nx * 1.1;
          g.vy -= vn * hit.ny * 1.1;
          // crushing from falling block
          const blockSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (blockSpeed > 80 && hit.ny < -0.3) {
            damageGuard(g, blockSpeed * 0.06, true);
            applyImpulseToBlock(b, hit.nx * 20, hit.ny * 20, g.x, g.y);
          }
        }
        if (hit.ny < -0.5 && Math.abs(g.vy) < 50) {
          g.vy = 0;
          g.vx *= 0.85;
        }
      }

      // other guards
      for (const o of state.guards) {
        if (!o.alive || o === g) continue;
        const hit = circleCircle(g.x, g.y, g.r, o.x, o.y, o.r);
        if (!hit) continue;
        g.x -= hit.nx * hit.pen * 0.5;
        g.y -= hit.ny * hit.pen * 0.5;
        o.x += hit.nx * hit.pen * 0.5;
        o.y += hit.ny * hit.pen * 0.5;
      }

      if (g.x < 50) {
        g.x = 50;
        g.vx *= -0.3;
      }
      if (g.x > W - 30) {
        g.x = W - 30;
        g.vx *= -0.3;
      }
      if (g.y > H + 80) {
        damageGuard(g, 999, false);
      }
    }
  }

  function worldKinetic() {
    let k = 0;
    if (state.projectile && state.projectile.launched && state.projectile.alive) {
      const p = state.projectile;
      k += p.vx * p.vx + p.vy * p.vy;
    }
    for (const b of state.blocks) {
      if (!b.alive) continue;
      k += (b.vx * b.vx + b.vy * b.vy) * b.mass;
      k += Math.abs(b.omega) * 40;
    }
    for (const g of state.guards) {
      if (!g.alive) continue;
      k += g.vx * g.vx + g.vy * g.vy;
    }
    return Math.sqrt(k);
  }

  function allGuardsDown() {
    return state.guards.every((g) => !g.alive);
  }

  function checkEndConditions() {
    if (state.phase !== PHASE.SETTLING && state.phase !== PHASE.FLYING) return;
    if (allGuardsDown()) {
      onWin();
      return;
    }
    // still active motion
    if (state.phase === PHASE.FLYING) {
      const p = state.projectile;
      const slow =
        !p ||
        !p.alive ||
        (Math.abs(p.vx) < SETTLE_SPEED && Math.abs(p.vy) < SETTLE_SPEED && p.y + p.r >= GROUND_Y - 2);
      if (slow || state.flyTimer > FLY_TIMEOUT) {
        state.phase = PHASE.SETTLING;
        state.settleTimer = 0;
        setPhase(PHASE.SETTLING);
      }
      return;
    }
    // settling
    state.settleTimer += 1 / 60; // will be adjusted by step
    if (worldKinetic() < SETTLE_SPEED && state.settleTimer > 0.35) {
      finishRound();
    } else if (state.settleTimer > SETTLE_TIME + 1.5) {
      finishRound();
    }
  }

  // settle timer needs real dt — track via stepGame
  function finishRound() {
    if (allGuardsDown()) {
      onWin();
      return;
    }
    if (state.shotsLeft <= 0) {
      onLose();
      return;
    }
    // next shot
    spawnProjectile();
    setPhase(PHASE.AIM);
  }

  function onWin() {
    if (state.phase === PHASE.WIN) return;
    const bonus = state.shotsLeft * 100;
    state.score += bonus;
    if (state.score > state.highScore) {
      state.highScore = state.score;
    }
    if (state.level >= state.maxUnlocked && state.level < 3) {
      state.maxUnlocked = state.level + 1;
    } else if (state.level === 3) {
      state.maxUnlocked = 3;
    }
    writeSave();
    updateHUD();
    winText.textContent =
      state.level < 3
        ? `哨兵肃清！本关奖励弹药分 +${bonus}。总分 ${state.score}。`
        : `全部要塞攻破！最终得分 ${state.score}。`;
    document.getElementById('btnNext').style.display = state.level < 3 ? '' : 'none';
    setPhase(PHASE.WIN);
    AudioSys.win();
    addParticles(W * 0.7, H * 0.4, 40, '#f0a030', 200);
    addParticles(W * 0.7, H * 0.4, 30, '#3ecfbf', 160);
  }

  function onLose() {
    if (state.phase === PHASE.LOSE) return;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      writeSave();
    }
    loseText.textContent = `仍有晶卫据守。得分 ${state.score}。再调整角度试一次！`;
    setPhase(PHASE.LOSE);
    AudioSys.lose();
  }

  // ─── Ability ─────────────────────────────────────────────────
  function activateAbility() {
    if (state.phase !== PHASE.FLYING) return false;
    const p = state.projectile;
    if (!p || !p.alive || !p.launched || state.abilityUsed || p.abilityUsed) return false;
    state.abilityUsed = true;
    p.abilityUsed = true;
    state.abilityFlash = 0.45;

    // pulse burst: forward-down boost + AOE impulse
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const dirx = p.vx / speed;
    const diry = p.vy / speed;
    p.vx += dirx * 280 + 80;
    p.vy += diry * 120 + 220;

    const R = 150;
    for (const b of state.blocks) {
      if (!b.alive) continue;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = dist(p.x, p.y, cx, cy);
      if (d < R + Math.max(b.w, b.h) * 0.5) {
        const f = (1 - d / (R + 40)) * 520;
        const nx = (cx - p.x) / (d || 1);
        const ny = (cy - p.y) / (d || 1);
        applyImpulseToBlock(b, nx * f, ny * f - 80, cx, cy);
        damageBlock(b, f * 0.06, cx, cy);
      }
    }
    for (const g of state.guards) {
      if (!g.alive) continue;
      const d = dist(p.x, p.y, g.x, g.y);
      if (d < R) {
        const f = (1 - d / R) * 480;
        const nx = (g.x - p.x) / (d || 1);
        const ny = (g.y - p.y) / (d || 1);
        g.vx += nx * f * 0.9;
        g.vy += ny * f * 0.9 - 100;
        damageGuard(g, f * 0.08, true);
      }
    }
    addParticles(p.x, p.y, 28, '#7fe7d8', 260);
    addParticles(p.x, p.y, 16, '#f0a030', 200);
    addShake(6);
    AudioSys.ability();
    return true;
  }

  // ─── Aim / launch ────────────────────────────────────────────
  function getPullVector(wx, wy) {
    let dx = wx - REST_POS.x;
    let dy = wy - REST_POS.y;
    // prefer pulling back-left
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const max = MAX_PULL;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    return { dx, dy, power: Math.min(1, Math.sqrt(dx * dx + dy * dy) / max) };
  }

  function aimAt(dx, dy) {
    if (state.phase !== PHASE.AIM) return false;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const max = MAX_PULL;
    let pdx = dx;
    let pdy = dy;
    if (len > max) {
      pdx = (dx / len) * max;
      pdy = (dy / len) * max;
    }
    state.dragging = true;
    state.pullX = pdx;
    state.pullY = pdy;
    if (state.projectile) {
      state.projectile.x = REST_POS.x + pdx;
      state.projectile.y = REST_POS.y + pdy;
    }
    return true;
  }

  function launch() {
    if (state.phase !== PHASE.AIM) return false;
    if (!state.projectile) return false;
    const dx = state.pullX;
    const dy = state.pullY;
    const pull = Math.sqrt(dx * dx + dy * dy);
    if (pull < 12) {
      // cancel weak pull
      state.dragging = false;
      state.pullX = 0;
      state.pullY = 0;
      state.projectile.x = REST_POS.x;
      state.projectile.y = REST_POS.y;
      return false;
    }
    const p = state.projectile;
    p.vx = -dx * LAUNCH_POWER;
    p.vy = -dy * LAUNCH_POWER;
    p.launched = true;
    p.x = REST_POS.x + dx * 0.15;
    p.y = REST_POS.y + dy * 0.15;
    state.dragging = false;
    state.shotsLeft = Math.max(0, state.shotsLeft - 1);
    state.flyTimer = 0;
    state.settleTimer = 0;
    state.roundScore = 0;
    setPhase(PHASE.FLYING);
    AudioSys.launch();
    addParticles(p.x, p.y, 8, '#ffc96a', 100);
    updateHUD();
    return true;
  }

  // ─── Trajectory preview ──────────────────────────────────────
  function predictTrajectory(dx, dy, steps) {
    const pts = [];
    let x = REST_POS.x + dx * 0.15;
    let y = REST_POS.y + dy * 0.15;
    let vx = -dx * LAUNCH_POWER;
    let vy = -dy * LAUNCH_POWER;
    const dt = 1 / 45;
    for (let i = 0; i < steps; i++) {
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      pts.push({ x, y });
      if (y > GROUND_Y) break;
      if (x > W || x < 0) break;
    }
    return pts;
  }

  // ─── Level load / flow ───────────────────────────────────────
  function loadLevel(n) {
    const level = clamp(n | 0, 1, 3);
    state.level = level;
    state.nextGuardId = 1;
    const pack = cloneLevel(level);
    state.blocks = pack.blocks;
    state.guards = pack.guards;
    state.shotsLeft = pack.meta.shots;
    state.particles = [];
    state.trails = [];
    state.shake = 0;
    state.abilityFlash = 0;
    state.waitingEnd = false;
    spawnProjectile();
    levelTag.textContent = `第 ${level} 关`;
    levelName.textContent = pack.meta.name;
    levelDesc.textContent = pack.meta.desc;
    state.levelIntroTimer = 1.4;
    setPhase(PHASE.INTRO);
    updateHUD();
    return true;
  }

  function startGame() {
    AudioSys.resume();
    AudioSys.ui();
    state.score = 0;
    const startLevel = 1;
    loadLevel(startLevel);
  }

  function restartLevel() {
    AudioSys.resume();
    AudioSys.ui();
    // keep score within run or reset? Spec says 重玩本关 — reset level state, keep cumulative score optional.
    // Fair approach: keep current score but re-give shots for level; for clean restart from pause, reload level without zeroing total if mid-run.
    // For simplicity on explicit restart: reload level, do not wipe global score mid-campaign unless from title.
    loadLevel(state.level);
  }

  function nextLevel() {
    AudioSys.ui();
    if (state.level < 3) {
      loadLevel(state.level + 1);
    } else {
      setPhase(PHASE.TITLE);
    }
  }

  function goTitle() {
    AudioSys.ui();
    setPhase(PHASE.TITLE);
    updateHUD();
  }

  function pauseGame() {
    if (
      state.phase === PHASE.TITLE ||
      state.phase === PHASE.WIN ||
      state.phase === PHASE.LOSE ||
      state.phase === PHASE.PAUSED
    )
      return false;
    setPhase(PHASE.PAUSED);
    return true;
  }

  function resumeGame() {
    if (state.phase !== PHASE.PAUSED) return false;
    const back = state.prevPhase === PHASE.PAUSED ? PHASE.AIM : state.prevPhase;
    setPhase(back || PHASE.AIM);
    return true;
  }

  // ─── Input ───────────────────────────────────────────────────
  function canvasToWorld(clientX, clientY) {
    // Account for object-fit: contain letterboxing inside the canvas element.
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    const dispW = W * scale;
    const dispH = H * scale;
    const offX = rect.left + (rect.width - dispW) / 2;
    const offY = rect.top + (rect.height - dispH) / 2;
    return {
      x: (clientX - offX) / scale,
      y: (clientY - offY) / scale,
    };
  }

  function onPointerDown(e) {
    if (state.phase === PHASE.FLYING) {
      // ability on tap
      if (activateAbility()) {
        e.preventDefault();
      }
      return;
    }
    if (state.phase !== PHASE.AIM) return;
    AudioSys.resume();
    const pt = canvasToWorld(e.clientX ?? e.touches?.[0]?.clientX, e.clientY ?? e.touches?.[0]?.clientY);
    const p = state.projectile;
    if (!p) return;
    // allow grab near sling or projectile
    if (dist(pt.x, pt.y, p.x, p.y) < 80 || dist(pt.x, pt.y, REST_POS.x, REST_POS.y) < 100) {
      state.dragging = true;
      const pull = getPullVector(pt.x, pt.y);
      aimAt(pull.dx, pull.dy);
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!state.dragging || state.phase !== PHASE.AIM) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (cx == null) return;
    const pt = canvasToWorld(cx, cy);
    const pull = getPullVector(pt.x, pt.y);
    aimAt(pull.dx, pull.dy);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (state.dragging && state.phase === PHASE.AIM) {
      launch();
      e.preventDefault();
    }
    state.dragging = false;
  }

  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches[0]) {
        onPointerDown({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
          preventDefault: () => e.preventDefault(),
        });
      }
    },
    { passive: false }
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches[0]) {
        onPointerMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
          preventDefault: () => e.preventDefault(),
        });
      }
    },
    { passive: false }
  );
  window.addEventListener(
    'touchend',
    (e) => {
      onPointerUp({ preventDefault: () => e.preventDefault() });
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (state.phase === PHASE.FLYING) {
        e.preventDefault();
        activateAbility();
      }
    }
    if (e.code === 'Escape') {
      if (state.phase === PHASE.PAUSED) resumeGame();
      else if (state.phase !== PHASE.TITLE && state.phase !== PHASE.WIN && state.phase !== PHASE.LOSE)
        pauseGame();
    }
    if (e.code === 'KeyP') {
      if (state.phase === PHASE.PAUSED) resumeGame();
      else pauseGame();
    }
  });

  // UI buttons
  document.getElementById('btnStart').addEventListener('click', startGame);
  document.getElementById('btnResume').addEventListener('click', () => {
    AudioSys.ui();
    resumeGame();
  });
  document.getElementById('btnPauseRestart').addEventListener('click', restartLevel);
  document.getElementById('btnPauseMenu').addEventListener('click', goTitle);
  document.getElementById('btnNext').addEventListener('click', nextLevel);
  document.getElementById('btnWinReplay').addEventListener('click', restartLevel);
  document.getElementById('btnWinMenu').addEventListener('click', goTitle);
  document.getElementById('btnLoseReplay').addEventListener('click', restartLevel);
  document.getElementById('btnLoseMenu').addEventListener('click', goTitle);
  btnPause.addEventListener('click', () => {
    AudioSys.ui();
    if (state.phase === PHASE.PAUSED) resumeGame();
    else pauseGame();
  });
  btnRestart.addEventListener('click', restartLevel);
  btnMute.addEventListener('click', () => {
    AudioSys.setMuted(!AudioSys.muted);
    state.muted = AudioSys.muted;
    AudioSys.ui();
  });

  // ─── Rendering ───────────────────────────────────────────────
  function drawBackground() {
    // sky gradient already on canvas clear
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1a2e');
    g.addColorStop(0.45, '#152840');
    g.addColorStop(0.72, '#1c3550');
    g.addColorStop(1, '#243a28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // distant hills
    ctx.fillStyle = 'rgba(20, 50, 40, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.quadraticCurveTo(200, 400, 420, 460);
    ctx.quadraticCurveTo(700, 520, 980, 430);
    ctx.quadraticCurveTo(1140, 390, 1280, 450);
    ctx.lineTo(1280, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.fill();

    // fort silhouette far right
    ctx.fillStyle = 'rgba(12, 22, 36, 0.55)';
    ctx.fillRect(1050, 300, 40, 200);
    ctx.fillRect(1110, 340, 50, 160);
    ctx.fillRect(1180, 280, 36, 220);
    ctx.beginPath();
    ctx.moveTo(1045, 300);
    ctx.lineTo(1070, 260);
    ctx.lineTo(1095, 300);
    ctx.fill();

    // stars / embers
    ctx.fillStyle = 'rgba(200, 220, 255, 0.35)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 + 40) % W;
      const sy = (i * 53 + 20) % 380;
      ctx.fillRect(sx, sy, i % 5 === 0 ? 2.5 : 1.5, i % 5 === 0 ? 2.5 : 1.5);
    }

    // ground
    const gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    gg.addColorStop(0, '#3a5a38');
    gg.addColorStop(0.3, '#2c452c');
    gg.addColorStop(1, '#1a2a1c');
    ctx.fillStyle = gg;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // ground edge
    ctx.strokeStyle = 'rgba(120, 160, 90, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // soil texture lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = GROUND_Y + 18 + i * 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + (i % 2) * 4);
      ctx.stroke();
    }
  }

  function drawSlingshot() {
    const { x, y, forkW, forkH } = SLING;
    // post
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(x - 10, y, 20, SLING.baseH);
    ctx.fillStyle = '#3e2818';
    ctx.fillRect(x - 18, y + SLING.baseH - 12, 36, 14);

    // forks
    ctx.strokeStyle = '#6b4428';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - forkW, y - forkH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + forkW, y - forkH);
    ctx.stroke();

    // metal tips
    ctx.fillStyle = '#8aa4c8';
    ctx.beginPath();
    ctx.arc(x - forkW, y - forkH, 6, 0, Math.PI * 2);
    ctx.arc(x + forkW, y - forkH, 6, 0, Math.PI * 2);
    ctx.fill();

    // band
    const px = state.projectile && !state.projectile.launched ? state.projectile.x : REST_POS.x;
    const py = state.projectile && !state.projectile.launched ? state.projectile.y : REST_POS.y;
    ctx.strokeStyle = 'rgba(200, 160, 100, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - forkW, y - forkH);
    ctx.lineTo(px, py);
    ctx.lineTo(x + forkW, y - forkH);
    ctx.stroke();

    // pouch
    if (state.projectile && !state.projectile.launched) {
      ctx.fillStyle = 'rgba(90, 60, 40, 0.7)';
      ctx.beginPath();
      ctx.ellipse(px, py + 4, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTrajectory() {
    if (state.phase !== PHASE.AIM || (!state.dragging && Math.hypot(state.pullX, state.pullY) < 8))
      return;
    const pts = predictTrajectory(state.pullX, state.pullY, 48);
    const power = Math.min(1, Math.hypot(state.pullX, state.pullY) / MAX_PULL);
    ctx.save();
    for (let i = 0; i < pts.length; i++) {
      const a = 0.15 + (1 - i / pts.length) * 0.65 * power;
      ctx.fillStyle = `rgba(255, 200, 100, ${a})`;
      const r = 3 + (1 - i / pts.length) * 3;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // power ring
    ctx.strokeStyle = `rgba(240, 160, 48, ${0.4 + power * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(REST_POS.x, REST_POS.y, 28 + power * 20, 0, Math.PI * 2);
    ctx.stroke();
    // pull line
    ctx.strokeStyle = 'rgba(255, 220, 140, 0.5)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(REST_POS.x, REST_POS.y);
    ctx.lineTo(REST_POS.x + state.pullX, REST_POS.y + state.pullY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawBlock(b) {
    if (!b.alive) return;
    ctx.save();
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(b.angle * 0.15); // subtle visual tilt from angular vel accumulation
    const hpRatio = clamp(b.hp / b.maxHp, 0, 1);

    if (b.mat === 'wood') {
      const g = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
      g.addColorStop(0, '#8b5a2b');
      g.addColorStop(0.5, '#c4894a');
      g.addColorStop(1, '#6e4420');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#4a3018';
    } else {
      const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2);
      g.addColorStop(0, '#9aa8b8');
      g.addColorStop(0.5, '#6e7e90');
      g.addColorStop(1, '#4a5564');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#2e3640';
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 4);
    ctx.fill();
    ctx.stroke();

    // grain / brick detail
    ctx.strokeStyle = b.mat === 'wood' ? 'rgba(60, 35, 15, 0.35)' : 'rgba(30, 35, 45, 0.4)';
    ctx.lineWidth = 1;
    if (b.mat === 'wood') {
      for (let i = 1; i < 3; i++) {
        const yy = -b.h / 2 + (b.h * i) / 3;
        ctx.beginPath();
        ctx.moveTo(-b.w / 2 + 4, yy);
        ctx.lineTo(b.w / 2 - 4, yy);
        ctx.stroke();
      }
    } else {
      ctx.strokeRect(-b.w / 2 + 3, -b.h / 2 + 3, b.w - 6, b.h - 6);
    }

    // damage overlay
    if (hpRatio < 0.85) {
      ctx.strokeStyle = `rgba(20, 10, 5, ${0.5 * (1 - hpRatio)})`;
      ctx.beginPath();
      ctx.moveTo(-b.w * 0.3, -b.h * 0.2);
      ctx.lineTo(b.w * 0.25, b.h * 0.3);
      ctx.moveTo(b.w * 0.2, -b.h * 0.3);
      ctx.lineTo(-b.w * 0.15, b.h * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGuard(g) {
    if (!g.alive) return;
    ctx.save();
    const bob = Math.sin(g.bob) * 2;
    const x = g.x;
    const y = g.y + bob;
    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(g.x, GROUND_Y - 2, g.r * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body — crystal sentinel (teal armor)
    const body = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, g.r + 4);
    body.addColorStop(0, g.flash > 0 ? '#e8fff8' : '#7fe7d8');
    body.addColorStop(0.45, '#2a9a8c');
    body.addColorStop(1, '#143a48');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 255, 240, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // visor
    ctx.fillStyle = 'rgba(10, 20, 30, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 6, 24, 10, 4);
    ctx.fill();
    ctx.fillStyle = g.flash > 0 ? '#fff0a0' : '#f0a030';
    ctx.beginPath();
    ctx.arc(x - 5, y - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // crest
    ctx.fillStyle = '#3ecfbf';
    ctx.beginPath();
    ctx.moveTo(x, y - g.r - 8);
    ctx.lineTo(x - 7, y - g.r + 2);
    ctx.lineTo(x + 7, y - g.r + 2);
    ctx.fill();

    // hp bar
    const hw = 32;
    const hr = g.hp / g.maxHp;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x - hw / 2, y - g.r - 16, hw, 5);
    ctx.fillStyle = hr > 0.4 ? '#5ddea0' : '#ff6b6b';
    ctx.fillRect(x - hw / 2, y - g.r - 16, hw * hr, 5);

    ctx.restore();
  }

  function drawProjectile() {
    const p = state.projectile;
    if (!p || !p.alive) return;

    // trail
    if (p.launched && p.trail) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i / p.trail.length) * 0.55;
        ctx.fillStyle = `rgba(255, 180, 60, ${a})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.r * 0.35 * (i / p.trail.length + 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const g = ctx.createRadialGradient(p.x - 5, p.y - 6, 3, p.x, p.y, p.r);
    g.addColorStop(0, '#fff2c8');
    g.addColorStop(0.35, '#f0a030');
    g.addColorStop(1, '#a05010');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 140, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // crystal facets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y);
    ctx.lineTo(p.x, p.y - 10);
    ctx.lineTo(p.x + 7, p.y + 2);
    ctx.stroke();

    // ability ready ring while flying
    if (p.launched && !state.abilityUsed && state.phase === PHASE.FLYING) {
      ctx.strokeStyle = 'rgba(126, 231, 216, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawAbilityFlash() {
    if (state.abilityFlash <= 0) return;
    const p = state.projectile;
    if (!p) return;
    const a = state.abilityFlash / 0.45;
    ctx.save();
    ctx.strokeStyle = `rgba(126, 231, 216, ${a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 40 + (1 - a) * 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(240, 160, 48, ${a * 0.2})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 + (1 - a) * 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      pt.vy += 400 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      const a = clamp(pt.life / 0.5, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawAmmoQueue() {
    // show remaining orbs near sling
    const n = state.shotsLeft - (state.phase === PHASE.AIM || state.phase === PHASE.INTRO ? 1 : 0);
    for (let i = 0; i < Math.max(0, n); i++) {
      const x = 70;
      const y = GROUND_Y - 30 - i * 28;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, GROUND_Y - 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
      g.addColorStop(0, '#ffe0a0');
      g.addColorStop(1, '#c07020');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTitleDecor() {
    // soft ambient on title when canvas still draws
    if (state.phase !== PHASE.TITLE) return;
    drawBackground();
    drawSlingshot();
    // idle orb
    const t = performance.now() / 1000;
    const ox = REST_POS.x;
    const oy = REST_POS.y + Math.sin(t * 2) * 4;
    const g = ctx.createRadialGradient(ox - 5, oy - 6, 3, ox, oy, 18);
    g.addColorStop(0, '#fff2c8');
    g.addColorStop(0.4, '#f0a030');
    g.addColorStop(1, '#a05010');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, 18, 0, Math.PI * 2);
    ctx.fill();
    // sample structures right
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#c4894a';
    ctx.fillRect(860, GROUND_Y - 100, 30, 100);
    ctx.fillRect(920, GROUND_Y - 70, 30, 70);
    ctx.fillStyle = '#6e7e90';
    ctx.fillRect(890, GROUND_Y - 40, 90, 40);
    ctx.globalAlpha = 1;
  }

  function render(dt) {
    ctx.save();
    // screen shake
    if (state.shake > 0) {
      const sx = (Math.random() - 0.5) * state.shake * 2;
      const sy = (Math.random() - 0.5) * state.shake * 2;
      ctx.translate(sx, sy);
      state.shake = Math.max(0, state.shake - dt * 28);
    }

    if (state.phase === PHASE.TITLE) {
      drawTitleDecor();
    } else {
      drawBackground();
      drawAmmoQueue();
      drawSlingshot();
      for (const b of state.blocks) drawBlock(b);
      for (const g of state.guards) drawGuard(g);
      drawTrajectory();
      drawProjectile();
      drawAbilityFlash();
      drawParticles(dt > 0 ? dt : 1 / 60);

      // ability hint
      if (state.phase === PHASE.FLYING && !state.abilityUsed) {
        ctx.fillStyle = 'rgba(126, 231, 216, 0.85)';
        ctx.font = 'bold 16px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点按 / 空格 — 脉冲爆破', W / 2, 80);
      }
    }
    ctx.restore();
  }

  // ─── Simulation step ─────────────────────────────────────────
  function stepGame(ms) {
    if (state.phase === PHASE.PAUSED || state.phase === PHASE.TITLE) return;
    if (state.phase === PHASE.WIN || state.phase === PHASE.LOSE) {
      // particles only
      const dt = Math.min(0.05, ms / 1000);
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.life -= dt;
        if (pt.life <= 0) state.particles.splice(i, 1);
        else {
          pt.vy += 400 * dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
        }
      }
      if (state.abilityFlash > 0) state.abilityFlash -= dt;
      return;
    }

    let remaining = Math.min(ms, 100);
    const sub = 1000 / 60;
    while (remaining > 0) {
      const stepMs = Math.min(sub, remaining);
      const dt = stepMs / 1000;
      remaining -= stepMs;

      if (state.phase === PHASE.INTRO) {
        state.levelIntroTimer -= dt;
        if (state.levelIntroTimer <= 0) {
          setPhase(PHASE.AIM);
        }
        if (state.abilityFlash > 0) state.abilityFlash -= dt;
        continue;
      }

      if (state.phase === PHASE.AIM) {
        if (state.abilityFlash > 0) state.abilityFlash -= dt;
        // gentle settle of structures already at rest
        continue;
      }

      if (state.phase === PHASE.FLYING || state.phase === PHASE.SETTLING) {
        resolveProjectileWorld(dt);
        resolveBlocks(dt);
        resolveGuards(dt);
        if (state.abilityFlash > 0) state.abilityFlash -= dt;

        if (state.phase === PHASE.FLYING) {
          state.flyTimer += dt;
          // early win
          if (allGuardsDown()) {
            // let brief settle feel
            state.phase = PHASE.SETTLING;
            state.settleTimer = 0;
            setPhase(PHASE.SETTLING);
          } else {
            const p = state.projectile;
            const slow =
              !p ||
              !p.alive ||
              (Math.abs(p.vx) < SETTLE_SPEED &&
                Math.abs(p.vy) < SETTLE_SPEED &&
                p.y + p.r >= GROUND_Y - 3);
            if ((slow && state.flyTimer > 0.4) || state.flyTimer > FLY_TIMEOUT) {
              state.phase = PHASE.SETTLING;
              state.settleTimer = 0;
              setPhase(PHASE.SETTLING);
            }
          }
        } else if (state.phase === PHASE.SETTLING) {
          state.settleTimer += dt;
          if (allGuardsDown() && state.settleTimer > 0.2) {
            onWin();
          } else if (worldKinetic() < SETTLE_SPEED && state.settleTimer > 0.35) {
            finishRound();
          } else if (state.settleTimer > SETTLE_TIME + 0.9) {
            // Hard cap so rounds never stall on micro-jitter.
            finishRound();
          }
        }
      }
    }
  }

  // ─── Main loop ───────────────────────────────────────────────
  function frame(ts) {
    state.animId = requestAnimationFrame(frame);
    if (!state.lastTs) state.lastTs = ts;
    let dtMs = ts - state.lastTs;
    state.lastTs = ts;
    if (dtMs > 100) dtMs = 100;

    if (!state.manualClock) {
      if (state.phase !== PHASE.PAUSED) {
        stepGame(dtMs);
      }
    }
    // render always
    const dt = dtMs / 1000;
    // particle visual update only when paused still draws
    render(state.manualClock || state.phase === PHASE.PAUSED ? 0 : dt);
  }

  // ─── Snapshot / test API ─────────────────────────────────────
  function snapshot() {
    const p = state.projectile;
    return {
      phase: state.phase,
      level: state.level,
      score: state.score,
      shotsLeft: state.shotsLeft,
      highScore: state.highScore,
      maxUnlocked: state.maxUnlocked,
      abilityUsed: state.abilityUsed,
      manualClock: state.manualClock,
      projectile: p
        ? {
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            r: p.r,
            alive: p.alive,
            launched: !!p.launched,
            abilityUsed: !!p.abilityUsed,
          }
        : null,
      targets: state.guards.map((g) => ({
        id: g.id,
        x: g.x,
        y: g.y,
        r: g.r,
        hp: g.hp,
        maxHp: g.maxHp,
        alive: g.alive,
        vx: g.vx,
        vy: g.vy,
      })),
      blocks: state.blocks.map((b, i) => ({
        id: i,
        mat: b.mat,
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        hp: b.hp,
        maxHp: b.maxHp,
        alive: b.alive,
        vx: b.vx,
        vy: b.vy,
      })),
      pull: { x: state.pullX, y: state.pullY },
      dragging: state.dragging,
    };
  }

  function forceHit(targetId) {
    const g = state.guards.find((t) => t.id === targetId);
    if (!g || !g.alive) return false;
    damageGuard(g, 999, true);
    updateHUD();
    if (allGuardsDown() && state.phase !== PHASE.TITLE && state.phase !== PHASE.WIN) {
      onWin();
    }
    return true;
  }

  window.__SLINGSHOT_TEST__ = {
    snapshot,
    start() {
      startGame();
      return snapshot();
    },
    restart() {
      restartLevel();
      return snapshot();
    },
    loadLevel(level) {
      state.score = state.score || 0;
      loadLevel(level);
      // skip intro for tests convenience — still valid intro phase then can step
      return snapshot();
    },
    pause() {
      pauseGame();
      return snapshot();
    },
    resume() {
      resumeGame();
      return snapshot();
    },
    setManualClock(enabled) {
      state.manualClock = !!enabled;
      state.lastTs = 0;
      return snapshot();
    },
    step(ms) {
      // Spec: while paused, step must NOT advance game state
      if (state.phase === PHASE.PAUSED) {
        return snapshot();
      }
      const m = Math.max(0, Number(ms) || 0);
      stepGame(m);
      return snapshot();
    },
    aim(dx, dy) {
      // skip intro if needed for test flow
      if (state.phase === PHASE.INTRO) {
        state.levelIntroTimer = 0;
        setPhase(PHASE.AIM);
      }
      aimAt(Number(dx) || 0, Number(dy) || 0);
      return snapshot();
    },
    launch() {
      if (state.phase === PHASE.INTRO) {
        state.levelIntroTimer = 0;
        setPhase(PHASE.AIM);
      }
      launch();
      return snapshot();
    },
    activateAbility() {
      activateAbility();
      return snapshot();
    },
    forceHit(targetId) {
      forceHit(targetId);
      return snapshot();
    },
  };

  // ─── Boot ────────────────────────────────────────────────────
  // Polyfill roundRect if needed
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
      return this;
    };
  }

  const save = loadSave();
  state.highScore = save.highScore;
  state.maxUnlocked = save.maxUnlocked;
  updateHUD();
  setPhase(PHASE.TITLE);
  requestAnimationFrame(frame);
})();

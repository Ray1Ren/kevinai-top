(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const WORLD = { width: 1280, height: 720, groundY: 615 };
  const FIXED_STEP = 1 / 120;
  const GRAVITY = 980;
  const MAX_PULL = 142;
  const LAUNCH_POWER = 7.2;
  const STORAGE_KEYS = { best: "slingSiegeBestScore", unlocked: "slingSiegeUnlocked" };

  const ui = {
    level: document.getElementById("levelValue"),
    score: document.getElementById("scoreValue"),
    shots: document.getElementById("shotsValue"),
    best: document.getElementById("bestScoreValue"),
    unlocked: document.getElementById("unlockedValue"),
    status: document.getElementById("statusHint"),
    startOverlay: document.getElementById("startOverlay"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultText: document.getElementById("resultText"),
    resultScore: document.getElementById("resultScore"),
    primaryResult: document.getElementById("primaryResultButton"),
    secondaryResult: document.getElementById("secondaryResultButton"),
    pause: document.getElementById("pauseButton"),
    mute: document.getElementById("muteButton"),
    toast: document.getElementById("toast"),
    flash: document.getElementById("screenFlash")
  };

  const levels = [
    {
      name: "暮岩前哨",
      ammo: 4,
      wind: 0,
      terrain: [{ x: 820, y: 574, w: 330, h: 41 }],
      blocks: [
        ["wood", 895, 520, 38, 108], ["wood", 1050, 520, 38, 108],
        ["wood", 972, 455, 220, 30], ["stone", 972, 565, 82, 42]
      ],
      targets: [[972, 411, 26, 70]]
    },
    {
      name: "双塔风门",
      ammo: 5,
      wind: -7,
      terrain: [{ x: 705, y: 590, w: 220, h: 25 }, { x: 1000, y: 552, w: 315, h: 63 }],
      blocks: [
        ["wood", 730, 526, 34, 128], ["wood", 845, 526, 34, 128], ["stone", 787, 454, 166, 34],
        ["stone", 945, 511, 50, 80], ["wood", 1040, 470, 36, 164], ["wood", 1160, 470, 36, 164],
        ["stone", 1100, 374, 182, 36], ["wood", 1100, 430, 110, 26]
      ],
      targets: [[786, 412, 25, 80], [1100, 335, 27, 90]]
    },
    {
      name: "裂谷王台",
      ammo: 6,
      wind: 10,
      terrain: [{ x: 635, y: 582, w: 155, h: 33 }, { x: 855, y: 545, w: 190, h: 70 }, { x: 1120, y: 585, w: 230, h: 30 }],
      blocks: [
        ["wood", 660, 518, 35, 128], ["wood", 755, 518, 35, 128], ["stone", 708, 444, 148, 32],
        ["stone", 864, 482, 34, 126], ["stone", 948, 482, 34, 126], ["wood", 906, 408, 132, 28],
        ["wood", 1090, 520, 36, 130], ["wood", 1200, 520, 36, 130], ["stone", 1145, 445, 166, 34],
        ["stone", 1060, 560, 70, 42], ["wood", 1010, 515, 90, 24]
      ],
      targets: [[708, 402, 24, 75], [906, 367, 27, 95], [1145, 403, 25, 85]]
    }
  ];

  const game = {
    phase: "title",
    previousPhase: "ready",
    level: 1,
    score: 0,
    levelStartScore: 0,
    shotsLeft: levels[0].ammo,
    projectile: null,
    targets: [],
    blocks: [],
    terrain: [],
    particles: [],
    shockwaves: [],
    floaters: [],
    dragPointerId: null,
    accumulator: 0,
    lastTime: performance.now(),
    elapsed: 0,
    roundTimer: 0,
    shake: 0,
    flash: 0,
    manualClock: false,
    muted: false,
    bestScore: readNumber(STORAGE_KEYS.best, 0),
    unlocked: clamp(readNumber(STORAGE_KEYS.unlocked, 1), 1, 3),
    toastTimer: 0,
    audio: null
  };

  function readNumber(key, fallback) {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) ? value : fallback;
    } catch (_) { return fallback; }
  }

  function writeNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* file mode may block storage */ }
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function length(x, y) { return Math.hypot(x, y); }
  function aliveTargets() { return game.targets.filter(target => !target.defeated); }

  class AudioEngine {
    constructor() { this.context = null; }
    ensure() {
      if (game.muted) return null;
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        this.context = new AudioContextClass();
      }
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
      return this.context;
    }
    tone(type, frequency, duration, volume, slide = 0) {
      const audio = this.ensure();
      if (!audio) return;
      const now = audio.currentTime;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    }
    noise(duration, volume, cutoff = 900) {
      const audio = this.ensure();
      if (!audio) return;
      const frames = Math.max(1, Math.floor(audio.sampleRate * duration));
      const buffer = audio.createBuffer(1, frames, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start();
    }
    launch() { this.tone("triangle", 180, .22, .12, 420); }
    ability() { this.tone("sine", 310, .36, .13, -160); this.tone("triangle", 620, .18, .07, 280); }
    hit(strong = false) { this.noise(strong ? .18 : .09, strong ? .16 : .08, strong ? 520 : 1100); this.tone("square", strong ? 90 : 150, .08, .045, -45); }
    target() { this.tone("sine", 520, .18, .09, 180); this.tone("triangle", 760, .24, .07, -260); }
    win() { [392, 494, 659].forEach((frequency, index) => setTimeout(() => this.tone("triangle", frequency, .32, .08, 100), index * 110)); }
    lose() { this.tone("sawtooth", 180, .5, .08, -100); }
  }

  game.audio = new AudioEngine();

  function makeProjectile() {
    return {
      x: 178, y: 503, vx: 0, vy: 0, radius: 23,
      state: "loaded", abilityUsed: false, flightTime: 0,
      trail: [], settledTime: 0
    };
  }

  function loadLevel(levelNumber, preserveScore = true) {
    const index = clamp(Math.round(Number(levelNumber) || 1), 1, levels.length) - 1;
    const definition = levels[index];
    game.level = index + 1;
    if (!preserveScore) game.score = 0;
    game.levelStartScore = game.score;
    game.shotsLeft = definition.ammo;
    game.terrain = definition.terrain.map((item, terrainIndex) => ({ id: `terrain-${index + 1}-${terrainIndex + 1}`, ...rectFromArray(item) }));
    game.blocks = definition.blocks.map((item, blockIndex) => ({
      id: `block-${index + 1}-${blockIndex + 1}`,
      type: item[0], x: item[1], y: item[2], w: item[3], h: item[4],
      vx: 0, vy: 0, angle: 0, av: 0, active: false, destroyed: false,
      hp: item[0] === "stone" ? 145 : 85,
      maxHp: item[0] === "stone" ? 145 : 85,
      restTimer: 0
    }));
    game.targets = definition.targets.map((item, targetIndex) => ({
      id: `guard-${index + 1}-${targetIndex + 1}`,
      x: item[0], y: item[1], radius: item[2], hp: item[3], maxHp: item[3],
      vx: 0, vy: 0, defeated: false, active: false, hitFlash: 0, angle: 0
    }));
    game.projectile = makeProjectile();
    game.particles = [];
    game.shockwaves = [];
    game.floaters = [];
    game.roundTimer = 0;
    game.shake = 0;
    game.phase = "ready";
    hideResult();
    ui.pauseOverlay.classList.add("hidden");
    updateHud();
    showToast(`${game.level} · ${definition.name}`);
  }

  function rectFromArray(item) { return { x: item.x ?? item[0], y: item.y ?? item[1], w: item.w ?? item[2], h: item.h ?? item[3] }; }

  function startGame() {
    ui.startOverlay.classList.add("hidden");
    game.score = 0;
    loadLevel(1, true);
    game.audio.ensure();
  }

  function restartLevel() {
    const restored = game.levelStartScore;
    game.score = restored;
    loadLevel(game.level, true);
  }

  function pauseGame() {
    if (["title", "paused", "levelWon", "gameWon", "failed"].includes(game.phase)) return;
    game.previousPhase = game.phase;
    game.phase = "paused";
    ui.pauseOverlay.classList.remove("hidden");
    ui.pause.setAttribute("aria-label", "继续游戏");
  }

  function resumeGame() {
    if (game.phase !== "paused") return;
    game.phase = game.previousPhase || "ready";
    ui.pauseOverlay.classList.add("hidden");
    ui.pause.setAttribute("aria-label", "暂停游戏");
    game.lastTime = performance.now();
  }

  function updateHud() {
    ui.level.textContent = `${game.level} / ${levels.length}`;
    ui.score.textContent = String(game.score);
    ui.shots.textContent = game.shotsLeft > 0 ? "● ".repeat(game.shotsLeft).trim() : "—";
    ui.best.textContent = String(game.bestScore);
    ui.unlocked.textContent = String(game.unlocked);
    const hints = {
      ready: "拖住能量弹向后拉，虚线会显示预估轨迹",
      aiming: "拉得越远力量越大，松手发射",
      flying: game.projectile?.abilityUsed ? "脉冲已释放，等待撞击" : "点击画面或按 Space，释放一次震荡脉冲",
      resolving: "结构正在坍塌，下一枚即将装填",
      paused: "游戏已暂停"
    };
    ui.status.textContent = hints[game.phase] || "瞄准核心支柱，连锁撞塌堡垒";
  }

  function aimByOffset(dx, dy) {
    if (!game.projectile || !["ready", "aiming"].includes(game.phase)) return false;
    let offsetX = Number(dx) || 0;
    let offsetY = Number(dy) || 0;
    const distance = length(offsetX, offsetY);
    if (distance > MAX_PULL) {
      offsetX *= MAX_PULL / distance;
      offsetY *= MAX_PULL / distance;
    }
    offsetX = Math.min(18, offsetX);
    game.projectile.x = 178 + offsetX;
    game.projectile.y = 503 + offsetY;
    game.phase = "aiming";
    updateHud();
    return true;
  }

  function launchProjectile() {
    const projectile = game.projectile;
    if (!projectile || projectile.state !== "loaded" || !["ready", "aiming"].includes(game.phase)) return false;
    const dx = projectile.x - 178;
    const dy = projectile.y - 503;
    if (length(dx, dy) < 12) {
      projectile.x = 178;
      projectile.y = 503;
      game.phase = "ready";
      return false;
    }
    projectile.vx = -dx * LAUNCH_POWER;
    projectile.vy = -dy * LAUNCH_POWER;
    projectile.state = "flying";
    projectile.flightTime = 0;
    projectile.settledTime = 0;
    game.shotsLeft = Math.max(0, game.shotsLeft - 1);
    game.phase = "flying";
    game.dragPointerId = null;
    game.audio.launch();
    burst(projectile.x, projectile.y, 10, "#f3c463", 100);
    updateHud();
    return true;
  }

  function activateAbility() {
    const projectile = game.projectile;
    if (!projectile || projectile.state !== "flying" || projectile.abilityUsed || game.phase !== "flying") return false;
    projectile.abilityUsed = true;
    projectile.vx *= 1.16;
    projectile.vy -= 70;
    game.shockwaves.push({ x: projectile.x, y: projectile.y, radius: 18, life: .48, maxLife: .48, power: 1 });
    burst(projectile.x, projectile.y, 26, "#ffdb7d", 210);
    burst(projectile.x, projectile.y, 18, "#e87555", 150);
    applyRadialImpulse(projectile.x, projectile.y, 128, 285, 44);
    game.shake = Math.max(game.shake, 7);
    flashScreen();
    game.audio.ability();
    showToast("震荡脉冲");
    updateHud();
    return true;
  }

  function applyRadialImpulse(x, y, radius, impulse, damage) {
    game.blocks.forEach(block => {
      if (block.destroyed) return;
      const dx = block.x - x;
      const dy = block.y - y;
      const distance = Math.max(18, length(dx, dy));
      if (distance < radius + Math.max(block.w, block.h) * .3) {
        block.active = true;
        const strength = (1 - distance / (radius + 70)) * impulse;
        block.vx += dx / distance * strength;
        block.vy += dy / distance * strength - 25;
        block.av += dx >= 0 ? strength * .004 : -strength * .004;
        damageBlock(block, damage * (1 - distance / (radius + 70)));
      }
    });
    game.targets.forEach(target => {
      if (target.defeated) return;
      const dx = target.x - x;
      const dy = target.y - y;
      const distance = Math.max(12, length(dx, dy));
      if (distance < radius + target.radius) {
        target.active = true;
        target.vx += dx / distance * impulse * .65;
        target.vy += dy / distance * impulse * .65 - 40;
        damageTarget(target, damage * 1.15, x, y);
      }
    });
  }

  function simulationStep(dt) {
    if (["title", "paused", "levelWon", "gameWon", "failed"].includes(game.phase)) return;
    game.elapsed += dt;
    updateProjectile(dt);
    updateBlocks(dt);
    updateTargets(dt);
    resolveBlockCollisions();
    resolveProjectileCollisions();
    resolveTargetCollisions();
    updateEffects(dt);
    checkRoundState(dt);
  }

  function updateProjectile(dt) {
    const projectile = game.projectile;
    if (!projectile || projectile.state !== "flying") return;
    projectile.flightTime += dt;
    projectile.vx += levels[game.level - 1].wind * dt;
    projectile.vy += GRAVITY * dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.trail.push({ x: projectile.x, y: projectile.y, life: .62 });
    if (projectile.trail.length > 32) projectile.trail.shift();

    if (projectile.y + projectile.radius > WORLD.groundY) {
      projectile.y = WORLD.groundY - projectile.radius;
      if (Math.abs(projectile.vy) > 95) {
        projectile.vy *= -.28;
        projectile.vx *= .72;
        impact(projectile.x, projectile.y + projectile.radius, Math.min(10, Math.abs(projectile.vy) * .025));
      } else {
        projectile.vy = 0;
        projectile.vx *= Math.pow(.25, dt);
      }
    }

    const speed = length(projectile.vx, projectile.vy);
    if ((speed < 28 && projectile.y > WORLD.groundY - projectile.radius - 4) || projectile.x > WORLD.width + 180 || projectile.y > WORLD.height + 100 || projectile.x < -180 || projectile.flightTime > 9) {
      projectile.settledTime += dt;
      if (projectile.settledTime > .38 || projectile.flightTime > 9) beginResolving();
    } else {
      projectile.settledTime = 0;
    }
  }

  function updateBlocks(dt) {
    game.blocks.forEach(block => {
      if (!block.active || block.destroyed) return;
      block.vy += GRAVITY * dt;
      block.x += block.vx * dt;
      block.y += block.vy * dt;
      block.angle += block.av * dt;
      block.vx *= Math.pow(.985, dt * 60);
      block.av *= Math.pow(.982, dt * 60);
      const floor = supportFloor(block.x, block.y, block.w, block.h, block.id);
      const bottom = block.y + block.h / 2;
      if (bottom > floor) {
        block.y = floor - block.h / 2;
        if (Math.abs(block.vy) > 100) {
          damageBlock(block, Math.abs(block.vy) * .025);
          impact(block.x, floor, Math.min(8, Math.abs(block.vy) * .018));
        }
        block.vy *= -.15;
        block.vx *= .78;
        block.av *= .7;
      }
      if (Math.abs(block.vx) + Math.abs(block.vy) < 7 && bottom >= floor - 3) block.restTimer += dt;
      else block.restTimer = 0;
      if (block.y > WORLD.height + 120 || block.x < -150 || block.x > WORLD.width + 150) destroyBlock(block, false);
    });
  }

  function updateTargets(dt) {
    game.targets.forEach(target => {
      if (target.defeated) return;
      target.hitFlash = Math.max(0, target.hitFlash - dt * 4);
      if (!target.active && !isTargetSupported(target)) target.active = true;
      if (!target.active) return;
      target.vy += GRAVITY * dt;
      target.x += target.vx * dt;
      target.y += target.vy * dt;
      target.angle += target.vx * dt * .003;
      target.vx *= Math.pow(.989, dt * 60);
      const floor = supportFloor(target.x, target.y, target.radius * 1.5, target.radius * 2, target.id);
      if (target.y + target.radius > floor) {
        const impactSpeed = Math.abs(target.vy);
        target.y = floor - target.radius;
        target.vy *= -.18;
        target.vx *= .74;
        if (impactSpeed > 175) damageTarget(target, impactSpeed * .13, target.x, floor);
      }
      if (target.y > WORLD.height + 100) defeatTarget(target, target.x, target.y);
    });
  }

  function supportFloor(x, y, width, height, ignoreId) {
    let floor = WORLD.groundY;
    game.terrain.forEach(platform => {
      const top = platform.y - platform.h / 2;
      if (x + width / 2 > platform.x - platform.w / 2 && x - width / 2 < platform.x + platform.w / 2 && y + height / 2 <= top + 34 && top >= y) floor = Math.min(floor, top);
    });
    game.blocks.forEach(block => {
      if (block.id === ignoreId || block.destroyed || block.angle > .45 || block.angle < -.45) return;
      const top = block.y - block.h / 2;
      if (x + width * .36 > block.x - block.w / 2 && x - width * .36 < block.x + block.w / 2 && y + height / 2 <= top + 18 && top >= y) floor = Math.min(floor, top);
    });
    return floor;
  }

  function isTargetSupported(target) {
    const floor = supportFloor(target.x, target.y, target.radius * 1.4, target.radius * 2, target.id);
    return Math.abs(target.y + target.radius - floor) < 14;
  }

  function resolveProjectileCollisions() {
    const projectile = game.projectile;
    if (!projectile || projectile.state !== "flying") return;
    game.blocks.forEach(block => {
      if (block.destroyed || !circleRect(projectile, block)) return;
      const speed = length(projectile.vx, projectile.vy);
      const normal = collisionNormal(projectile.x, projectile.y, block);
      block.active = true;
      block.vx += projectile.vx * (block.type === "stone" ? .18 : .31);
      block.vy += projectile.vy * (block.type === "stone" ? .12 : .24);
      block.av += (projectile.y - block.y) * projectile.vx * .00008;
      damageBlock(block, speed * (block.type === "stone" ? .09 : .15));
      activateNeighbors(block, speed * .12);
      const dot = projectile.vx * normal.x + projectile.vy * normal.y;
      projectile.vx -= 1.42 * dot * normal.x;
      projectile.vy -= 1.42 * dot * normal.y;
      projectile.vx *= .7;
      projectile.vy *= .7;
      projectile.x += normal.x * 8;
      projectile.y += normal.y * 8;
      impact(projectile.x, projectile.y, clamp(speed * .016, 4, 12));
      game.audio.hit(speed > 360);
    });
    game.targets.forEach(target => {
      if (target.defeated) return;
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = length(dx, dy);
      if (distance >= target.radius + projectile.radius) return;
      const speed = length(projectile.vx, projectile.vy);
      damageTarget(target, 35 + speed * .16, projectile.x, projectile.y);
      target.active = true;
      target.vx += projectile.vx * .46;
      target.vy += projectile.vy * .34 - 55;
      const nx = dx / Math.max(1, distance);
      const ny = dy / Math.max(1, distance);
      projectile.vx -= (projectile.vx * nx + projectile.vy * ny) * nx * 1.3;
      projectile.vy -= (projectile.vx * nx + projectile.vy * ny) * ny * 1.3;
      projectile.vx *= .62;
      projectile.vy *= .62;
      impact(target.x, target.y, 10);
    });
  }

  function resolveBlockCollisions() {
    for (let firstIndex = 0; firstIndex < game.blocks.length; firstIndex += 1) {
      const first = game.blocks[firstIndex];
      if (first.destroyed || !first.active) continue;
      for (let secondIndex = 0; secondIndex < game.blocks.length; secondIndex += 1) {
        if (firstIndex === secondIndex) continue;
        const second = game.blocks[secondIndex];
        if (second.destroyed || !rectOverlap(first, second)) continue;
        const overlapX = (first.w + second.w) / 2 - Math.abs(first.x - second.x);
        const overlapY = (first.h + second.h) / 2 - Math.abs(first.y - second.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        second.active = true;
        if (overlapX < overlapY) {
          const direction = first.x < second.x ? -1 : 1;
          first.x += direction * overlapX * .52;
          first.vx *= -.22;
          second.vx -= direction * Math.abs(first.vx) * .35;
        } else {
          const direction = first.y < second.y ? -1 : 1;
          first.y += direction * overlapY * .52;
          if (direction < 0 && first.vy > 0) first.vy *= -.12;
          second.vy += Math.abs(first.vy) * .18;
        }
        const force = length(first.vx - second.vx, first.vy - second.vy);
        if (force > 130) {
          damageBlock(first, force * .018);
          damageBlock(second, force * .014);
        }
      }
    }
  }

  function resolveTargetCollisions() {
    game.targets.forEach(target => {
      if (target.defeated) return;
      game.blocks.forEach(block => {
        if (block.destroyed || !block.active || !circleRect({ x: target.x, y: target.y, radius: target.radius }, block)) return;
        const relativeSpeed = length(block.vx - target.vx, block.vy - target.vy);
        if (relativeSpeed < 45) return;
        damageTarget(target, relativeSpeed * (block.type === "stone" ? .24 : .17), block.x, block.y);
        target.active = true;
        target.vx += block.vx * .35;
        target.vy += block.vy * .28 - 25;
        block.vx *= .72;
        block.vy *= .75;
      });
    });
  }

  function circleRect(circle, rect) {
    const closestX = clamp(circle.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
    const closestY = clamp(circle.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy < circle.radius * circle.radius;
  }

  function rectOverlap(first, second) {
    return Math.abs(first.x - second.x) < (first.w + second.w) / 2 && Math.abs(first.y - second.y) < (first.h + second.h) / 2;
  }

  function collisionNormal(x, y, rect) {
    const dx = x - rect.x;
    const dy = y - rect.y;
    const px = rect.w / 2 + 23 - Math.abs(dx);
    const py = rect.h / 2 + 23 - Math.abs(dy);
    if (px < py) return { x: dx < 0 ? -1 : 1, y: 0 };
    return { x: 0, y: dy < 0 ? -1 : 1 };
  }

  function activateNeighbors(source, force) {
    game.blocks.forEach(block => {
      if (block === source || block.destroyed) return;
      if (Math.abs(block.x - source.x) < (block.w + source.w) * .75 && Math.abs(block.y - source.y) < (block.h + source.h) * .72 + 30) {
        block.active = true;
        block.vx += (block.x - source.x) * force * .002;
        block.vy -= force * .08;
      }
    });
    game.targets.forEach(target => {
      if (!target.defeated && length(target.x - source.x, target.y - source.y) < 150) target.active = true;
    });
  }

  function damageBlock(block, amount) {
    if (block.destroyed || amount <= 0) return;
    block.hp -= amount;
    if (amount > 9) burst(block.x, block.y, Math.round(clamp(amount * .18, 3, 12)), block.type === "stone" ? "#b8b7aa" : "#d39958", 90);
    if (block.hp <= 0) destroyBlock(block, true);
  }

  function destroyBlock(block, award) {
    if (block.destroyed) return;
    block.destroyed = true;
    if (award) addScore(block.type === "stone" ? 80 : 55, block.x, block.y);
    burst(block.x, block.y, block.type === "stone" ? 22 : 16, block.type === "stone" ? "#aaa99c" : "#d38d49", 180);
    game.shake = Math.max(game.shake, block.type === "stone" ? 7 : 4);
  }

  function damageTarget(target, amount, hitX, hitY) {
    if (target.defeated || amount <= 0) return;
    target.hp -= amount;
    target.hitFlash = 1;
    burst(hitX, hitY, 12, "#7fd2c0", 140);
    game.audio.target();
    if (target.hp <= 0) defeatTarget(target, target.x, target.y);
  }

  function defeatTarget(target, x, y) {
    if (target.defeated) return;
    target.defeated = true;
    target.hp = 0;
    addScore(650 + game.level * 100, x, y - 20);
    burst(x, y, 34, "#61c5b5", 230);
    burst(x, y, 18, "#f2c35f", 170);
    game.shockwaves.push({ x, y, radius: 12, life: .42, maxLife: .42, power: .65 });
    game.shake = Math.max(game.shake, 10);
    flashScreen();
    if (aliveTargets().length === 0) finishLevel();
  }

  function addScore(points, x, y) {
    game.score += Math.round(points);
    game.floaters.push({ x, y, text: `+${Math.round(points)}`, life: 1.1, maxLife: 1.1 });
    updateHud();
  }

  function beginResolving() {
    if (game.phase !== "flying") return;
    game.projectile.state = "spent";
    game.phase = "resolving";
    game.roundTimer = 0;
    updateHud();
  }

  function checkRoundState(dt) {
    if (aliveTargets().length === 0) {
      finishLevel();
      return;
    }
    if (game.phase !== "resolving") return;
    game.roundTimer += dt;
    const moving = game.blocks.some(block => !block.destroyed && block.active && length(block.vx, block.vy) > 22) || game.targets.some(target => !target.defeated && target.active && length(target.vx, target.vy) > 22);
    if (game.roundTimer > (moving ? 2.1 : .8) || game.roundTimer > 3.4) {
      if (game.shotsLeft > 0) {
        game.projectile = makeProjectile();
        game.phase = "ready";
        showToast("下一枚已装填");
        updateHud();
      } else {
        finishFailure();
      }
    }
  }

  function finishLevel() {
    if (["levelWon", "gameWon"].includes(game.phase)) return;
    const bonus = game.shotsLeft * 250 + Math.max(0, 900 - Math.floor(game.elapsed) * 5);
    game.score += bonus;
    game.unlocked = Math.max(game.unlocked, Math.min(3, game.level + 1));
    game.bestScore = Math.max(game.bestScore, game.score);
    writeNumber(STORAGE_KEYS.best, game.bestScore);
    writeNumber(STORAGE_KEYS.unlocked, game.unlocked);
    game.phase = game.level === levels.length ? "gameWon" : "levelWon";
    game.audio.win();
    updateHud();
    showResult(true, bonus);
  }

  function finishFailure() {
    if (game.phase === "failed") return;
    game.bestScore = Math.max(game.bestScore, game.score);
    writeNumber(STORAGE_KEYS.best, game.bestScore);
    game.phase = "failed";
    game.audio.lose();
    updateHud();
    showResult(false, 0);
  }

  function showResult(won, bonus) {
    ui.resultOverlay.classList.remove("hidden");
    ui.resultScore.textContent = String(game.score);
    if (!won) {
      ui.resultKicker.textContent = "攻势受阻";
      ui.resultTitle.textContent = "弹药耗尽";
      ui.resultText.textContent = "堡垒还有守卫。试试优先击断承重支柱。";
      ui.primaryResult.textContent = "重玩本关";
      ui.secondaryResult.textContent = "从头开始";
    } else if (game.level === levels.length) {
      ui.resultKicker.textContent = "三座堡垒全部攻克";
      ui.resultTitle.textContent = "攻城完成";
      ui.resultText.textContent = `剩余弹药与速度奖励 +${bonus}。新的最高纪录会保存在本机。`;
      ui.primaryResult.textContent = "再战一轮";
      ui.secondaryResult.textContent = "重玩本关";
    } else {
      ui.resultKicker.textContent = "堡垒已突破";
      ui.resultTitle.textContent = "关卡完成";
      ui.resultText.textContent = `剩余弹药与速度奖励 +${bonus}。下一座堡垒更坚固。`;
      ui.primaryResult.textContent = "下一关";
      ui.secondaryResult.textContent = "重玩本关";
    }
  }

  function hideResult() { ui.resultOverlay.classList.add("hidden"); }

  function handlePrimaryResult() {
    if (game.phase === "failed") restartLevel();
    else if (game.phase === "gameWon") { game.score = 0; loadLevel(1, true); }
    else if (game.phase === "levelWon") loadLevel(game.level + 1, true);
  }

  function handleSecondaryResult() {
    if (game.phase === "failed") { game.score = 0; loadLevel(1, true); }
    else restartLevel();
  }

  function burst(x, y, count, color, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (.35 + Math.random() * .75);
      game.particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 35,
        size: 2 + Math.random() * 5, color, life: .35 + Math.random() * .55, maxLife: .9,
        gravity: 380 + Math.random() * 220
      });
    }
    if (game.particles.length > 320) game.particles.splice(0, game.particles.length - 320);
  }

  function impact(x, y, force) {
    burst(x, y, Math.round(5 + force), "#ead7aa", 70 + force * 8);
    game.shake = Math.max(game.shake, force);
  }

  function updateEffects(dt) {
    game.particles.forEach(particle => {
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(.98, dt * 60);
    });
    game.particles = game.particles.filter(particle => particle.life > 0);
    game.shockwaves.forEach(wave => { wave.life -= dt; wave.radius += 390 * wave.power * dt; });
    game.shockwaves = game.shockwaves.filter(wave => wave.life > 0);
    game.floaters.forEach(floater => { floater.life -= dt; floater.y -= 42 * dt; });
    game.floaters = game.floaters.filter(floater => floater.life > 0);
    game.shake *= Math.pow(.05, dt);
    if (game.projectile) game.projectile.trail.forEach(point => { point.life -= dt; });
  }

  function flashScreen() {
    ui.flash.classList.remove("active");
    void ui.flash.offsetWidth;
    ui.flash.classList.add("active");
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    window.clearTimeout(game.toastTimer);
    game.toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 1250);
  }

  function resizeCanvas() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function render() {
    resizeCanvas();
    const ratioX = canvas.width / WORLD.width;
    const ratioY = canvas.height / WORLD.height;
    ctx.setTransform(ratioX, 0, 0, ratioY, 0, 0);
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    const shakeX = game.shake > .2 ? (Math.random() - .5) * game.shake : 0;
    const shakeY = game.shake > .2 ? (Math.random() - .5) * game.shake * .65 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground();
    drawTerrain();
    drawTrajectory();
    drawSlingshotBack();
    drawBlocks();
    drawTargets();
    drawProjectile();
    drawSlingshotFront();
    drawEffects();
    ctx.restore();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, game.level === 3 ? "#5b4250" : game.level === 2 ? "#315762" : "#28545c");
    gradient.addColorStop(.62, "#4b7771");
    gradient.addColorStop(1, "#b69362");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = "rgba(255,232,171,.14)";
    ctx.beginPath();
    ctx.arc(1040, 125, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,238,196,.78)";
    ctx.beginPath();
    ctx.arc(1040, 125, 47, 0, Math.PI * 2);
    ctx.fill();

    drawCloud(260 + Math.sin(game.elapsed * .08) * 18, 118, .8);
    drawCloud(730 + Math.sin(game.elapsed * .06 + 2) * 24, 185, .55);
    drawMountainLayer("#315c5c", 440, 70, .002, 0);
    drawMountainLayer("#294d50", 500, 100, .003, 120);
    drawMountainLayer("#203e43", 555, 75, .004, 270);

    ctx.fillStyle = "rgba(255,225,166,.1)";
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 91 + game.elapsed * (7 + index % 3)) % 1420 - 70;
      const y = 90 + (index * 67) % 390;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + index % 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = "rgba(237,229,199,.15)";
    [[0, 8, 42], [42, 0, 54], [91, 14, 39], [48, 26, 72]].forEach(part => { ctx.beginPath(); ctx.arc(part[0], part[1], part[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawMountainLayer(color, baseY, amplitude, frequency, offset) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, WORLD.height); ctx.lineTo(0, baseY);
    for (let x = 0; x <= WORLD.width; x += 24) {
      const y = baseY - Math.abs(Math.sin((x + offset) * frequency)) * amplitude - Math.sin((x + offset) * frequency * 2.7) * amplitude * .3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD.width, WORLD.height); ctx.closePath(); ctx.fill();
  }

  function drawTerrain() {
    ctx.fillStyle = "#513f31";
    ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY);
    ctx.fillStyle = "#6f8058";
    ctx.fillRect(0, WORLD.groundY, WORLD.width, 13);
    ctx.fillStyle = "rgba(235,199,125,.13)";
    for (let x = 20; x < WORLD.width; x += 46) ctx.fillRect(x, WORLD.groundY + 28 + (x % 4) * 8, 16, 3);
    game.terrain.forEach(platform => {
      ctx.fillStyle = "#554c40";
      roundedRect(platform.x - platform.w / 2, platform.y - platform.h / 2, platform.w, platform.h, 7);
      ctx.fill();
      ctx.fillStyle = "#85916b";
      roundedRect(platform.x - platform.w / 2, platform.y - platform.h / 2, platform.w, Math.min(10, platform.h), 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(239,220,177,.18)";
      ctx.lineWidth = 2;
      for (let x = platform.x - platform.w / 2 + 26; x < platform.x + platform.w / 2; x += 52) {
        ctx.beginPath(); ctx.moveTo(x, platform.y - platform.h / 2 + 14); ctx.lineTo(x - 13, platform.y + platform.h / 2 - 8); ctx.stroke();
      }
    });
  }

  function drawSlingshotBack() {
    const projectile = game.projectile || makeProjectile();
    ctx.strokeStyle = "#4d2d23"; ctx.lineWidth = 13; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(145, 530); ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
    ctx.strokeStyle = "#754634"; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(174, 596); ctx.lineTo(154, 478); ctx.moveTo(174, 596); ctx.lineTo(205, 472); ctx.stroke();
    ctx.strokeStyle = "#b6794e"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(174, 596); ctx.lineTo(154, 478); ctx.moveTo(174, 596); ctx.lineTo(205, 472); ctx.stroke();
  }

  function drawSlingshotFront() {
    const projectile = game.projectile || makeProjectile();
    ctx.strokeStyle = "#2f1b18"; ctx.lineWidth = 11; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(207, 477); ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
    ctx.fillStyle = "#865641";
    roundedRect(151, 572, 49, 23, 8); ctx.fill();
  }

  function drawTrajectory() {
    const projectile = game.projectile;
    if (!projectile || game.phase !== "aiming") return;
    const vx = -(projectile.x - 178) * LAUNCH_POWER;
    const vy = -(projectile.y - 503) * LAUNCH_POWER;
    const power = clamp(length(projectile.x - 178, projectile.y - 503) / MAX_PULL, 0, 1);
    for (let index = 1; index <= 24; index += 1) {
      const time = index * .095;
      const x = 178 + vx * time + .5 * levels[game.level - 1].wind * time * time;
      const y = 503 + vy * time + .5 * GRAVITY * time * time;
      if (y > WORLD.groundY || x > WORLD.width) break;
      ctx.fillStyle = `rgba(255,235,181,${.68 - index * .021})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 6 - index * .14), 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(13,35,39,.78)"; roundedRect(78, 404, 200, 22, 11); ctx.fill();
    const meter = ctx.createLinearGradient(80, 0, 275, 0); meter.addColorStop(0, "#55bcae"); meter.addColorStop(.65, "#efc15f"); meter.addColorStop(1, "#e16e52");
    ctx.fillStyle = meter; roundedRect(81, 407, 194 * power, 16, 8); ctx.fill();
    ctx.fillStyle = "#f8edcf"; ctx.font = "800 13px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`力度 ${Math.round(power * 100)}%`, 178, 394);
  }

  function drawProjectile() {
    const projectile = game.projectile;
    if (!projectile) return;
    projectile.trail.forEach((point, index) => {
      if (point.life <= 0) return;
      ctx.fillStyle = `rgba(244,175,75,${point.life * .42})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, 4 + index * .18, 0, Math.PI * 2); ctx.fill();
    });
    const aura = ctx.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, 38);
    aura.addColorStop(0, "rgba(255,246,190,.9)"); aura.addColorStop(.35, "rgba(239,180,72,.48)"); aura.addColorStop(1, "rgba(225,92,72,0)");
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 39, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(projectile.x - 8, projectile.y - 10, 2, projectile.x, projectile.y, projectile.radius);
    body.addColorStop(0, "#fff7c5"); body.addColorStop(.22, "#efc05c"); body.addColorStop(.72, "#df7451"); body.addColorStop(1, "#743c3a");
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,183,.65)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#fff2ae"; ctx.beginPath(); ctx.arc(projectile.x - 6, projectile.y - 7, 5, 0, Math.PI * 2); ctx.fill();
    if (projectile.state === "flying" && !projectile.abilityUsed) {
      ctx.strokeStyle = `rgba(255,224,128,${.45 + Math.sin(game.elapsed * 8) * .18})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 31 + Math.sin(game.elapsed * 6) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawBlocks() {
    game.blocks.forEach(block => {
      if (block.destroyed) return;
      ctx.save(); ctx.translate(block.x, block.y); ctx.rotate(block.angle);
      if (block.type === "wood") drawWoodBlock(block);
      else drawStoneBlock(block);
      const damage = 1 - block.hp / block.maxHp;
      if (damage > .34) drawCracks(block, damage);
      ctx.restore();
    });
  }

  function drawWoodBlock(block) {
    const gradient = ctx.createLinearGradient(-block.w / 2, 0, block.w / 2, 0);
    gradient.addColorStop(0, "#8f542f"); gradient.addColorStop(.5, "#c47a3c"); gradient.addColorStop(1, "#774126");
    ctx.fillStyle = gradient; roundedRect(-block.w / 2, -block.h / 2, block.w, block.h, 5); ctx.fill();
    ctx.strokeStyle = "rgba(255,211,139,.34)"; ctx.lineWidth = 2; roundedRect(-block.w / 2 + 3, -block.h / 2 + 3, block.w - 6, block.h - 6, 4); ctx.stroke();
    ctx.strokeStyle = "rgba(78,38,22,.45)"; ctx.lineWidth = 2;
    if (block.w > block.h) {
      for (let x = -block.w / 2 + 20; x < block.w / 2; x += 38) { ctx.beginPath(); ctx.moveTo(x, -block.h / 2 + 4); ctx.lineTo(x + 15, block.h / 2 - 4); ctx.stroke(); }
    } else {
      for (let y = -block.h / 2 + 24; y < block.h / 2; y += 35) { ctx.beginPath(); ctx.moveTo(-block.w / 2 + 4, y); ctx.lineTo(block.w / 2 - 4, y - 9); ctx.stroke(); }
    }
  }

  function drawStoneBlock(block) {
    const gradient = ctx.createLinearGradient(0, -block.h / 2, 0, block.h / 2);
    gradient.addColorStop(0, "#a9a89a"); gradient.addColorStop(1, "#696d68");
    ctx.fillStyle = gradient; roundedRect(-block.w / 2, -block.h / 2, block.w, block.h, 5); ctx.fill();
    ctx.strokeStyle = "#565b57"; ctx.lineWidth = 3; roundedRect(-block.w / 2 + 2, -block.h / 2 + 2, block.w - 4, block.h - 4, 4); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,230,.16)";
    for (let x = -block.w / 2 + 15; x < block.w / 2; x += 34) { ctx.beginPath(); ctx.arc(x, -block.h / 2 + 10 + (x % 3), 3, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawCracks(block, damage) {
    ctx.strokeStyle = `rgba(50,31,25,${clamp(damage, .3, .78)})`; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, -block.h * .45); ctx.lineTo(-6, -block.h * .12); ctx.lineTo(7, block.h * .05); ctx.lineTo(-3, block.h * .34); ctx.stroke();
    if (damage > .65) { ctx.beginPath(); ctx.moveTo(-6, -block.h * .12); ctx.lineTo(-block.w * .33, block.h * .08); ctx.moveTo(7, block.h * .05); ctx.lineTo(block.w * .35, block.h * .24); ctx.stroke(); }
  }

  function drawTargets() {
    game.targets.forEach(target => {
      if (target.defeated) return;
      ctx.save(); ctx.translate(target.x, target.y); ctx.rotate(target.angle);
      const pulse = 1 + Math.sin(game.elapsed * 3 + target.x) * .025;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(8,27,30,.25)"; ctx.beginPath(); ctx.ellipse(0, target.radius + 7, target.radius * .9, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = target.hitFlash > 0 ? "#e9f5dd" : "#55b8aa";
      roundedRect(-target.radius * .72, -target.radius * .58, target.radius * 1.44, target.radius * 1.6, target.radius * .45); ctx.fill();
      ctx.fillStyle = "#2b6665";
      ctx.beginPath(); ctx.moveTo(-target.radius * .82, -target.radius * .4); ctx.lineTo(-target.radius * .38, -target.radius * 1.12); ctx.lineTo(-target.radius * .08, -target.radius * .5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(target.radius * .82, -target.radius * .4); ctx.lineTo(target.radius * .38, -target.radius * 1.12); ctx.lineTo(target.radius * .08, -target.radius * .5); ctx.fill();
      ctx.fillStyle = "#163d41"; ctx.fillRect(-target.radius * .62, -target.radius * .18, target.radius * 1.24, 8);
      ctx.fillStyle = "#f5d47d"; ctx.beginPath(); ctx.arc(-target.radius * .3, -target.radius * .08, 4.2, 0, Math.PI * 2); ctx.arc(target.radius * .3, -target.radius * .08, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#19444a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, target.radius * .35); ctx.lineTo(0, target.radius * .48); ctx.lineTo(8, target.radius * .33); ctx.stroke();
      ctx.fillStyle = "#d9a54f"; ctx.fillRect(-target.radius * .82, target.radius * .78, target.radius * 1.64, 6);
      const hpRatio = clamp(target.hp / target.maxHp, 0, 1);
      ctx.fillStyle = "rgba(10,25,28,.65)"; roundedRect(-target.radius, -target.radius * 1.48, target.radius * 2, 7, 4); ctx.fill();
      ctx.fillStyle = hpRatio > .45 ? "#80d0b3" : "#e66f55"; roundedRect(-target.radius, -target.radius * 1.48, target.radius * 2 * hpRatio, 7, 4); ctx.fill();
      ctx.restore();
    });
  }

  function drawEffects() {
    game.shockwaves.forEach(wave => {
      ctx.strokeStyle = `rgba(255,222,122,${wave.life / wave.maxLife})`; ctx.lineWidth = 5 * (wave.life / wave.maxLife);
      ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(224,103,78,${wave.life / wave.maxLife * .6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius * .72, 0, Math.PI * 2); ctx.stroke();
    });
    game.particles.forEach(particle => {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(particle.vx * .01); ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * .7); ctx.restore();
    });
    ctx.globalAlpha = 1;
    game.floaters.forEach(floater => {
      ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.fillStyle = "#ffe7a2"; ctx.font = "900 22px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(floater.text, floater.x, floater.y);
    });
    ctx.globalAlpha = 1;
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  }

  function pointerToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * WORLD.width, y: (event.clientY - rect.top) / rect.height * WORLD.height };
  }

  function onPointerDown(event) {
    if (game.phase === "flying") { activateAbility(); return; }
    if (!["ready", "aiming"].includes(game.phase) || !game.projectile) return;
    const point = pointerToWorld(event);
    if (length(point.x - game.projectile.x, point.y - game.projectile.y) <= game.projectile.radius + 30) {
      event.preventDefault();
      game.dragPointerId = event.pointerId;
      canvas.setPointerCapture?.(event.pointerId);
      aimByOffset(point.x - 178, point.y - 503);
    }
  }

  function onPointerMove(event) {
    if (game.dragPointerId !== event.pointerId) return;
    event.preventDefault();
    const point = pointerToWorld(event);
    aimByOffset(point.x - 178, point.y - 503);
  }

  function onPointerUp(event) {
    if (game.dragPointerId !== event.pointerId) return;
    event.preventDefault();
    canvas.releasePointerCapture?.(event.pointerId);
    game.dragPointerId = null;
    launchProjectile();
  }

  function onKeyDown(event) {
    if (event.code === "Space") {
      event.preventDefault();
      if (game.phase === "flying") activateAbility();
      else if (game.phase === "paused") resumeGame();
    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (game.phase === "paused") resumeGame(); else pauseGame();
    } else if (event.code === "KeyR" && game.phase !== "title") restartLevel();
  }

  function animationLoop(now) {
    const frameTime = clamp((now - game.lastTime) / 1000, 0, .05);
    game.lastTime = now;
    if (!game.manualClock && game.phase !== "paused") {
      game.accumulator += frameTime;
      while (game.accumulator >= FIXED_STEP) {
        simulationStep(FIXED_STEP);
        game.accumulator -= FIXED_STEP;
      }
    }
    render();
    requestAnimationFrame(animationLoop);
  }

  function serializableSnapshot() {
    const projectile = game.projectile ? {
      x: round(game.projectile.x), y: round(game.projectile.y), vx: round(game.projectile.vx), vy: round(game.projectile.vy),
      state: game.projectile.state, abilityUsed: game.projectile.abilityUsed, flightTime: round(game.projectile.flightTime)
    } : null;
    return {
      phase: game.phase,
      level: game.level,
      score: game.score,
      shotsLeft: game.shotsLeft,
      projectile,
      targets: game.targets.map(target => ({ id: target.id, x: round(target.x), y: round(target.y), hp: round(target.hp), defeated: target.defeated })),
      blocks: game.blocks.map(block => ({ id: block.id, type: block.type, x: round(block.x), y: round(block.y), hp: round(block.hp), active: block.active, destroyed: block.destroyed, angle: round(block.angle) }))
    };
  }

  function round(value) { return Math.round(value * 1000) / 1000; }

  window.__SLINGSHOT_TEST__ = {
    snapshot: serializableSnapshot,
    start() { startGame(); return serializableSnapshot(); },
    restart() { restartLevel(); return serializableSnapshot(); },
    loadLevel(level) { ui.startOverlay.classList.add("hidden"); loadLevel(level, false); return serializableSnapshot(); },
    pause() { pauseGame(); return serializableSnapshot(); },
    resume() { resumeGame(); return serializableSnapshot(); },
    setManualClock(enabled) { game.manualClock = Boolean(enabled); game.accumulator = 0; game.lastTime = performance.now(); return game.manualClock; },
    step(ms) {
      if (!game.manualClock || game.phase === "paused") return serializableSnapshot();
      let remaining = clamp(Number(ms) || 0, 0, 30000) / 1000;
      while (remaining > 0) {
        const dt = Math.min(FIXED_STEP, remaining);
        simulationStep(dt);
        remaining -= dt;
      }
      render();
      return serializableSnapshot();
    },
    aim(dx, dy) { aimByOffset(dx, dy); return serializableSnapshot(); },
    launch() { launchProjectile(); return serializableSnapshot(); },
    activateAbility() { activateAbility(); return serializableSnapshot(); },
    forceHit(targetId) {
      const target = game.targets.find(item => item.id === targetId) || game.targets.find(item => !item.defeated);
      if (target) damageTarget(target, target.maxHp + 1, target.x, target.y);
      return serializableSnapshot();
    }
  };

  document.getElementById("startButton").addEventListener("click", startGame);
  document.getElementById("restartButton").addEventListener("click", restartLevel);
  document.getElementById("pauseButton").addEventListener("click", () => game.phase === "paused" ? resumeGame() : pauseGame());
  document.getElementById("resumeButton").addEventListener("click", resumeGame);
  document.getElementById("muteButton").addEventListener("click", () => {
    game.muted = !game.muted;
    ui.mute.classList.toggle("is-muted", game.muted);
    ui.mute.setAttribute("aria-label", game.muted ? "取消静音" : "静音");
    if (!game.muted) game.audio.ensure();
  });
  ui.primaryResult.addEventListener("click", handlePrimaryResult);
  ui.secondaryResult.addEventListener("click", handleSecondaryResult);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", () => { if (["ready", "aiming", "flying", "resolving"].includes(game.phase)) pauseGame(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && ["ready", "aiming", "flying", "resolving"].includes(game.phase)) pauseGame(); });

  loadLevel(1, false);
  game.phase = "title";
  updateHud();
  requestAnimationFrame(animationLoop);
})();

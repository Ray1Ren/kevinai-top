/* ============================================================
   《一脚晋级》交互宣传页 · app.js
   原生 JS，无外部依赖。模块：资源加载 / 动效管理 / 滚动叙事 /
   6×6 三步破门挑战 / 晋级庆祝 / 规则旅程 / 截图叠卡 / CTA / 测试接口
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduceMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: null };

  /* ---------------- 动效管理 ---------------- */
  var Motion = {
    userPaused: !!reduceMotionQuery.matches,
    hidden: document.hidden,
    listeners: [],
    isPaused: function () { return this.userPaused || this.hidden; },
    reduce: function () { return !!reduceMotionQuery.matches; },
    set: function (paused) {
      this.userPaused = !!paused;
      this.apply();
    },
    apply: function () {
      var eff = this.isPaused();
      document.documentElement.classList.toggle('motion-paused', eff);
      var btn = $('#motion-toggle');
      if (btn) {
        btn.setAttribute('aria-pressed', String(this.userPaused));
        btn.setAttribute('aria-label', this.userPaused ? '继续装饰动效' : '暂停装饰动效');
      }
      this.listeners.forEach(function (fn) { fn(eff); });
    },
    onChange: function (fn) { this.listeners.push(fn); }
  };

  $('#motion-toggle').addEventListener('click', function () {
    Motion.set(!Motion.userPaused);
  });
  document.addEventListener('visibilitychange', function () {
    Motion.hidden = document.hidden;
    Motion.apply();
  });
  if (reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener('change', function () {
      Motion.set(!!reduceMotionQuery.matches);
    });
  }

  /* ---------------- 资源加载（骨架 / 失败回退） ---------------- */
  var assetsReady = false;
  (function initAssets() {
    var imgs = $$('img');
    if (!imgs.length) { assetsReady = true; return; }
    var remaining = imgs.length;
    function settle(img) {
      var box = img.closest('.img-box');
      if (box) box.classList.add(img.naturalWidth > 0 ? 'img-loaded' : 'img-failed');
      remaining -= 1;
      if (remaining <= 0) {
        assetsReady = true;
        document.documentElement.classList.add('assets-ready');
      }
    }
    imgs.forEach(function (img) {
      if (img.complete) {
        // 同步已缓存结果；naturalWidth 为 0 视为失败
        settle(img);
      } else {
        img.addEventListener('load', function () { settle(img); }, { once: true });
        img.addEventListener('error', function () { settle(img); }, { once: true });
      }
    });
  })();

  /* ---------------- 入场与滚动显现 ---------------- */
  requestAnimationFrame(function () {
    document.documentElement.classList.add('ready');
  });
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in-view');
        revealObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.18 });
  $$('.reveal-group, .journey-body, .props-strip, .deck, .deck-dots').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------------- 段落导航 ---------------- */
  var SECTION_IDS = ['play', 'journey', 'proof', 'play-now'];
  var activeSection = 'play';
  function setActiveSection(id) {
    if (SECTION_IDS.indexOf(id) < 0) return;
    activeSection = id;
    $$('.header-nav a').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === id);
    });
  }
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) setActiveSection(en.target.id);
    });
  }, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
  SECTION_IDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
  function goToSection(id) {
    if (SECTION_IDS.indexOf(id) < 0) return activeSection;
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: (Motion.reduce() || Motion.isPaused()) ? 'auto' : 'smooth', block: 'start' });
      setActiveSection(id);
    }
    return activeSection;
  }

  /* ============================================================
     6×6 三步破门挑战
     ============================================================ */
  var ROWS = 6, COLS = 6;
  var START = { row: 4, col: 0 };
  var GOAL = { row: 1, col: 5 };
  // 固定障碍 + 不破坏解法的装饰：对手(4,5)(0,4)、队友(2,1)、对手门将(0,5)、泥地(5,2)
  var BLOCKED = { '4,5': 1, '0,4': 1, '2,1': 1, '0,5': 1, '5,2': 1 };
  var DIRS = {
    up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 }
  };
  var SOLUTION = ['right', 'up', 'right'];

  var board = $('#demo-board');
  var gridEl = $('#board-grid');
  var ballEl = $('#ball');
  var goalDecor = $('.decor.goal');
  var movesLabel = $('#moves-label');
  var liveRegion = $('#live-region');
  var winPanel = $('#win-panel');
  var winText = $('#win-text');
  var winStars = $$('#win-stars .star');
  var confettiCanvas = $('#confetti-canvas');

  var cells = [];       // cells[row][col] -> 元素
  var cellRects = [];   // cells 相对 board 的像素位置
  var ballPos = { row: START.row, col: START.col };
  var phase = 'ready';  // ready | moving | won
  var moves = 0;
  var interacted = false;
  var ballRaf = 0;
  var confettiRaf = 0;
  var hintTimers = [];
  var starTimers = [];

  // 生成 36 格
  (function buildGrid() {
    for (var r = 0; r < ROWS; r++) {
      cells.push([]); cellRects.push([]);
      for (var c = 0; c < COLS; c++) {
        var d = document.createElement('div');
        d.className = 'cell';
        gridEl.appendChild(d);
        cells[r].push(d);
      }
    }
  })();

  function measureBoard() {
    var gx = gridEl.offsetLeft, gy = gridEl.offsetTop;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var el = cells[r][c];
        cellRects[r][c] = {
          x: gx + el.offsetLeft, y: gy + el.offsetTop,
          w: el.offsetWidth, h: el.offsetHeight
        };
      }
    }
    renderBall(true);
  }

  function renderBall(snap) {
    var rect = cellRects[ballPos.row] && cellRects[ballPos.row][ballPos.col];
    if (!rect) return;
    ballEl.style.width = rect.w + 'px';
    ballEl.style.height = rect.h + 'px';
    ballEl.style.setProperty('--dx', '0px');
    ballEl.style.setProperty('--dy', '0px');
    ballEl.style.setProperty('--bx', rect.x + 'px');
    ballEl.style.setProperty('--by', rect.y + 'px');
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { measureBoard(); }).observe(board);
  }
  window.addEventListener('resize', measureBoard);
  measureBoard();
  // 字体/样式稳定后再量一次，避免首帧偏移
  setTimeout(measureBoard, 120);

  function announce(text) {
    liveRegion.textContent = '';
    // 强制读出变化
    requestAnimationFrame(function () { liveRegion.textContent = text; });
  }

  function computeSlide(from, dir) {
    var d = DIRS[dir];
    if (!d) return { row: from.row, col: from.col, moved: false, goal: false, path: [] };
    var r = from.row, c = from.col, goal = false;
    var path = [];
    for (;;) {
      var nr = r + d.dr, nc = c + d.dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
      if (BLOCKED[nr + ',' + nc]) break;
      r = nr; c = nc;
      path.push({ row: r, col: c });
      if (r === GOAL.row && c === GOAL.col) { goal = true; break; }
    }
    return { row: r, col: c, moved: path.length > 0, goal: goal, path: path };
  }

  function clearPreview() {
    $$('.cell.pv, .cell.pv-dest', board).forEach(function (el) {
      el.classList.remove('pv', 'pv-dest');
    });
  }

  function showPreview(dir) {
    clearPreview();
    var res = computeSlide(ballPos, dir);
    if (!res.moved) return res;
    res.path.forEach(function (p, i) {
      cells[p.row][p.col].classList.add('pv');
      if (i === res.path.length - 1) cells[p.row][p.col].classList.add('pv-dest');
    });
    return res;
  }

  function updateMovesLabel() {
    movesLabel.textContent = '步数 ' + moves;
  }

  function animateBallTo(target, done) {
    cancelAnimationFrame(ballRaf);
    var fromRect = cellRects[ballPos.row][ballPos.col];
    var toRect = cellRects[target.row][target.col];
    var distCells = Math.abs(target.row - ballPos.row) + Math.abs(target.col - ballPos.col);
    var dur = Motion.reduce() ? 1 : clamp(150 + distCells * 120, 220, 640);
    var sx = fromRect.x, sy = fromRect.y;
    var t0 = performance.now();
    function frame(now) {
      var t = clamp((now - t0) / dur, 0, 1);
      var e = easeOutCubic(t);
      ballEl.style.setProperty('--bx', (sx + (toRect.x - sx) * e) + 'px');
      ballEl.style.setProperty('--by', (sy + (toRect.y - sy) * e) + 'px');
      if (t < 1) {
        ballRaf = requestAnimationFrame(frame);
      } else {
        ballRaf = 0;
        ballEl.classList.remove('land');
        void ballEl.offsetWidth; // 重启动画
        ballEl.classList.add('land');
        done();
      }
    }
    ballRaf = requestAnimationFrame(frame);
  }

  function invalidFeedback(dir) {
    ballEl.classList.remove('shake');
    void ballEl.offsetWidth;
    ballEl.classList.add('shake');
    announce('这个方向被' + (dir ? '障碍或边界' : '') + '挡住了，换条路试试。');
  }

  function doMove(dir) {
    return new Promise(function (resolve) {
      if (!DIRS[dir]) { resolve(snapshot()); return; }
      cancelHint();
      if (phase === 'moving') { resolve(snapshot()); return; }
      if (phase === 'won') { resolve(snapshot()); return; }
      var res = computeSlide(ballPos, dir);
      if (!res.moved) { invalidFeedback(dir); resolve(snapshot()); return; }

      interacted = true;
      board.classList.add('board-interacted');
      phase = 'moving';
      moves += 1;
      updateMovesLabel();
      clearPreview();
      setBallDragOffset(0, 0);

      animateBallTo(res, function () {
        ballPos = { row: res.row, col: res.col };
        if (res.goal) {
          onWin();
        } else {
          phase = 'ready';
          announce('第 ' + moves + ' 步，球停在第 ' + (res.row + 1) + ' 行第 ' + (res.col + 1) + ' 列。');
        }
        resolve(snapshot());
      });
    });
  }

  /* ---------- 拖拽 / 触摸 ---------- */
  var drag = { active: false, startX: 0, startY: 0, dir: null };

  function setBallDragOffset(dx, dy) {
    ballEl.style.setProperty('--dx', dx + 'px');
    ballEl.style.setProperty('--dy', dy + 'px');
  }

  function dragDir(dx, dy) {
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return null;
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  board.addEventListener('pointerdown', function (ev) {
    if (phase !== 'ready') return;
    drag.active = true;
    drag.startX = ev.clientX; drag.startY = ev.clientY; drag.dir = null;
    try { board.setPointerCapture(ev.pointerId); } catch (e) { /* 忽略不支持的环境 */ }
  });
  board.addEventListener('pointermove', function (ev) {
    if (!drag.active || phase !== 'ready') return;
    var dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
    var dir = dragDir(dx, dy);
    if (!dir) { clearPreview(); setBallDragOffset(0, 0); drag.dir = null; return; }
    drag.dir = dir;
    showPreview(dir);
    // 沿拖动方向的轻微跟手位移，增强“可拖”手感
    var proj = clamp(dir === 'left' || dir === 'right' ? dx : dy, -16, 16);
    if (dir === 'left' || dir === 'right') setBallDragOffset(proj, 0);
    else setBallDragOffset(0, proj);
  });
  function endDrag(ev) {
    if (!drag.active) return;
    var dir = drag.dir;
    var dist = dir ? Math.abs(dir === 'left' || dir === 'right' ? ev.clientX - drag.startX : ev.clientY - drag.startY) : 0;
    drag.active = false; drag.dir = null;
    setBallDragOffset(0, 0);
    if (dir && dist > 34 && phase === 'ready') {
      doMove(dir);
    } else {
      clearPreview();
    }
  }
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', function () {
    drag.active = false; drag.dir = null;
    setBallDragOffset(0, 0);
    clearPreview();
  });

  /* ---------- 键盘与按钮 ---------- */
  board.addEventListener('keydown', function (ev) {
    var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    var dir = map[ev.key];
    if (dir) {
      ev.preventDefault();
      doMove(dir);
    }
  });
  $$('.dpad-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { doMove(btn.getAttribute('data-dir')); });
  });

  /* ---------- 提示路线 ---------- */
  function cancelHint() {
    hintTimers.forEach(clearTimeout);
    hintTimers = [];
    $$('.cell.hint', board).forEach(function (el) { el.classList.remove('hint'); });
  }
  $('#hint-btn').addEventListener('click', function () {
    if (phase !== 'ready') return;
    cancelHint();
    if (ballPos.row !== START.row || ballPos.col !== START.col) {
      announce('先把球重置回开球点，再看标准三步路线。');
      var resetBtn = $('#reset-btn');
      resetBtn.classList.remove('nudge');
      void resetBtn.offsetWidth;
      resetBtn.classList.add('nudge');
      return;
    }
    var sim = { row: START.row, col: START.col };
    SOLUTION.forEach(function (dir, i) {
      hintTimers.push(setTimeout(function () {
        var res = computeSlide(sim, dir);
        res.path.forEach(function (p) { cells[p.row][p.col].classList.add('hint'); });
        sim = { row: res.row, col: res.col };
      }, i * 520));
    });
    hintTimers.push(setTimeout(cancelHint, SOLUTION.length * 520 + 1600));
    announce('标准路线：先向右，再向上，最后向右，三步破门。');
  });

  /* ---------- 晋级庆祝 ---------- */
  function starCount(n) { return n <= 3 ? 3 : (n <= 5 ? 2 : 1); }

  function onWin() {
    phase = 'won';
    goalDecor.classList.add('flash');
    var stars = starCount(moves);
    var text = stars === 3 ? '三步破门，完美晋级。' : (stars === 2 ? moves + ' 步破门，顺利晋级。' : moves + ' 步破门，惊险晋级。');
    winText.textContent = text + (stars === 3 ? ' 标准解法就是 right → up → right。' : ' 试试三步的标准解法。');
    announce('球进了！共用 ' + moves + ' 步，' + stars + ' 星晋级。');
    winPanel.hidden = false;
    requestAnimationFrame(function () { winPanel.classList.add('show'); });
    winStars.forEach(function (s) { s.classList.remove('lit'); });
    starTimers.forEach(clearTimeout);
    starTimers = [];
    for (var i = 0; i < stars; i++) {
      (function (idx) {
        starTimers.push(setTimeout(function () {
          winStars[idx].classList.add('lit');
        }, 350 + idx * 320));
      })(i);
    }
    if (!Motion.reduce()) burstConfetti();
  }

  function burstConfetti() {
    cancelAnimationFrame(confettiRaf);
    var wrap = confettiCanvas.parentElement;
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = w * dpr;
    confettiCanvas.height = h * dpr;
    var ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    var goalRect = cellRects[GOAL.row][GOAL.col];
    var bx = board.offsetLeft + goalRect.x + goalRect.w / 2;
    var by = board.offsetTop + goalRect.y + goalRect.h / 2;
    var colors = ['#F4C430', '#2FA35A', '#FFFFFF', '#F3F8EF', '#FFD95E'];
    var parts = [];
    for (var i = 0; i < 52; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      var sp = 4 + Math.random() * 7;
      parts.push({
        x: bx, y: by,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        life: 1
      });
    }
    var t0 = performance.now();
    var DUR = 1700;
    function frame(now) {
      var t = (now - t0) / DUR;
      ctx.clearRect(0, 0, w, h);
      if (t >= 1 || Motion.hidden) { confettiRaf = 0; return; }
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.22; p.vx *= 0.985;
        p.rot += p.vr;
        p.life = 1 - t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
        ctx.restore();
      });
      confettiRaf = requestAnimationFrame(frame);
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  $('#replay-btn').addEventListener('click', function () {
    resetDemo();
    board.focus();
  });
  $('#reset-btn').addEventListener('click', function () { resetDemo(); });

  function resetDemo() {
    cancelAnimationFrame(ballRaf); ballRaf = 0;
    cancelAnimationFrame(confettiRaf); confettiRaf = 0;
    var ctx = confettiCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    cancelHint();
    starTimers.forEach(clearTimeout); starTimers = [];
    winPanel.classList.remove('show');
    winPanel.hidden = true;
    goalDecor.classList.remove('flash');
    clearPreview();
    setBallDragOffset(0, 0);
    ballPos = { row: START.row, col: START.col };
    moves = 0;
    phase = 'ready';
    updateMovesLabel();
    renderBall(true);
    announce('已重置，足球回到开球点。');
    return snapshot();
  }

  /* ============================================================
     #journey 规则旅程
     ============================================================ */
  var ICONS = {
    move: '<svg viewBox="0 0 36 36" fill="none"><circle cx="8" cy="26" r="4.5" stroke="#1C3A24" stroke-width="2.4"/><path d="M12 26h14m0 0-5-5m5 5-5 5" stroke="#2FA35A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mud: '<svg viewBox="0 0 36 36" fill="none"><ellipse cx="18" cy="23" rx="12" ry="6.5" fill="#8A6A3C"/><ellipse cx="13" cy="21.5" rx="4" ry="2" fill="#6B4E2C"/><circle cx="24" cy="12" r="4" stroke="#1C3A24" stroke-width="2.2"/></svg>',
    arrow: '<svg viewBox="0 0 36 36" fill="none"><path d="M8 28V14a4 4 0 0 1 4-4h12" stroke="#1C3A24" stroke-width="2.6" stroke-linecap="round"/><path d="M20 5l6 5-6 5" stroke="#2FA35A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    offside: '<svg viewBox="0 0 36 36" fill="none"><path d="M10 5v26" stroke="#1C3A24" stroke-width="2.6" stroke-linecap="round"/><path d="M10 7h14l-4 5 4 5H10" fill="#F4C430" stroke="#C99A12" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 30h28" stroke="#2FA35A" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 4"/></svg>',
    people: '<svg viewBox="0 0 36 36" fill="none"><circle cx="12" cy="11" r="4" stroke="#2FA35A" stroke-width="2.4"/><path d="M5 28c0-5 3-8 7-8s7 3 7 8" stroke="#2FA35A" stroke-width="2.4" stroke-linecap="round"/><circle cx="25" cy="11" r="4" stroke="#1C3A24" stroke-width="2.4"/><path d="M18 28c0-5 3-8 7-8s7 3 7 8" stroke="#1C3A24" stroke-width="2.4" stroke-linecap="round"/></svg>',
    keeper: '<svg viewBox="0 0 36 36" fill="none"><rect x="5" y="6" width="26" height="16" rx="2" stroke="#1C3A24" stroke-width="2.4"/><path d="M5 12h26M13 6v16M23 6v16" stroke="#1C3A24" stroke-width="1.6"/><path d="M12 30c2-3 10-3 12 0" stroke="#2FA35A" stroke-width="2.6" stroke-linecap="round"/></svg>',
    card: '<svg viewBox="0 0 36 36" fill="none"><rect x="11" y="6" width="15" height="22" rx="2.5" fill="#F4C430" stroke="#C99A12" stroke-width="2"/><path d="M8 30h20" stroke="#1C3A24" stroke-width="2.2" stroke-linecap="round"/></svg>',
    portal: '<svg viewBox="0 0 36 36" fill="none"><ellipse cx="10" cy="18" rx="5" ry="9" stroke="#2FA35A" stroke-width="2.6"/><ellipse cx="27" cy="18" rx="5" ry="9" stroke="#1C3A24" stroke-width="2.6"/><path d="M15 18h7m0 0-3.5-3.5M22 18l-3.5 3.5" stroke="#C99A12" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var MECHS = {
    move: { name: '基础移动', stage: '前期 · 上手', meter: 5, icon: 'move', desc: '一脚滑出，足球沿直线冲到底，撞到障碍、边界才停——或者径直进门。', effect: '思考的起点：动手之前，先算出这一脚会停在哪一格。' },
    mud: { name: '泥地', stage: '前期 · 上手', meter: 16, icon: 'mud', desc: '泥地会咬住足球，让原本的长线冲刺提前停住。', effect: '距离感：同样的滑动，落点忽然变近，背下来的旧路线全部要重算。' },
    arrow: { name: '转向箭头', stage: '中期 · 变奏', meter: 30, icon: 'arrow', desc: '足球压过箭头格，会被迫顺着箭头方向改道，继续滑到下一段。', effect: '直线路径：一脚可能变成两段甚至三段，路线开始拐弯。' },
    offside: { name: '越位', stage: '中期 · 变奏', meter: 44, icon: 'offside', desc: '传接路线开始受越位约束，要看队友站位再出脚。', effect: '时机判断：最快的路线不一定合法，慢一点反而能通。' },
    people: { name: '队友/对手', stage: '中期 · 变奏', meter: 58, icon: 'people', desc: '队友能当墙做配合，对手会站在线路上封堵。', effect: '棋盘本身：人成了路线的一部分，每一脚都在改写整张图。' },
    keeper: { name: '对手门将', stage: '后期 · 决胜', meter: 71, icon: 'keeper', desc: '最后一步有对手门将把守，正面角度会被他封死。', effect: '收官方式：必须绕开门将的防守范围，才能把球送进网。' },
    card: { name: '黄牌', stage: '后期 · 决胜', meter: 84, icon: 'card', desc: '危险动作会吃黄牌，容错骤然收紧。', effect: '每一步的代价：路线不只要能通，还要干净。' },
    portal: { name: '传送门', stage: '后期 · 决胜', meter: 96, icon: 'portal', desc: '足球从一端传入、另一端飞出。', effect: '空间感：整张球场的距离被折叠，最远的格子可能最近。' }
  };
  var MECH_ORDER = ['move', 'mud', 'arrow', 'offside', 'people', 'keeper', 'card', 'portal'];

  var detailIcon = $('#detail-icon');
  var detailStage = $('#detail-stage');
  var detailTitle = $('#detail-title');
  var detailDesc = $('#detail-desc');
  var detailEffect = $('#detail-effect');
  var meterCursor = $('#meter-cursor');
  var journeyPanel = $('#journey-panel');
  var railButtons = $$('.journey-rail button');

  function selectMech(key, focus) {
    var data = MECHS[key];
    if (!data) return;
    railButtons.forEach(function (btn) {
      var on = btn.getAttribute('data-mech') === key;
      btn.setAttribute('aria-selected', String(on));
      if (on && focus) btn.focus();
    });
    journeyPanel.setAttribute('aria-labelledby', 'tab-' + key);
    detailIcon.innerHTML = ICONS[data.icon];
    detailStage.textContent = data.stage;
    detailTitle.textContent = data.name;
    detailDesc.textContent = data.desc;
    detailEffect.textContent = data.effect;
    meterCursor.style.left = data.meter + '%';
    if (!Motion.reduce() && journeyPanel.animate) {
      journeyPanel.animate(
        [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'ease-out' }
      );
    }
  }
  railButtons.forEach(function (btn, idx) {
    btn.addEventListener('click', function () { selectMech(btn.getAttribute('data-mech')); });
    btn.addEventListener('keydown', function (ev) {
      var next = null;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = (idx + 1) % railButtons.length;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = (idx - 1 + railButtons.length) % railButtons.length;
      if (next !== null) {
        ev.preventDefault();
        selectMech(railButtons[next].getAttribute('data-mech'), true);
      }
    });
  });
  selectMech('move');

  /* ============================================================
     #proof 截图叠卡
     ============================================================ */
  var deckCards = $$('.deck-card');
  var deckDots = $$('.deck-dots button');
  var deckIndex = 0;
  var deckTimer = 0;
  var deckInView = false;
  var DECK_INTERVAL = 4500;

  function renderDeck() {
    deckCards.forEach(function (card, i) {
      var offset = (i - deckIndex + deckCards.length) % deckCards.length; // 0 当前，1 右，2 左
      card.classList.remove('pos-0', 'pos-l', 'pos-r');
      card.classList.add(offset === 0 ? 'pos-0' : (offset === 1 ? 'pos-r' : 'pos-l'));
      card.tabIndex = offset === 0 ? 0 : -1;
    });
    deckDots.forEach(function (dot, i) {
      dot.setAttribute('aria-selected', String(i === deckIndex));
    });
  }
  function deckGo(i, fromAuto) {
    deckIndex = (i + deckCards.length) % deckCards.length;
    renderDeck();
    if (!fromAuto) restartDeckTimer();
  }
  function stopDeckTimer() {
    if (deckTimer) { clearInterval(deckTimer); deckTimer = 0; }
  }
  function restartDeckTimer() {
    stopDeckTimer();
    if (Motion.isPaused() || Motion.reduce() || !deckInView) return;
    deckTimer = setInterval(function () {
      if (Motion.isPaused() || document.hidden) return;
      deckGo(deckIndex + 1, true);
    }, DECK_INTERVAL);
  }
  $('#deck-prev').addEventListener('click', function () { deckGo(deckIndex - 1); });
  $('#deck-next').addEventListener('click', function () { deckGo(deckIndex + 1); });
  deckDots.forEach(function (dot) {
    dot.addEventListener('click', function () { deckGo(Number(dot.getAttribute('data-goto'))); });
  });
  deckCards.forEach(function (card, i) {
    card.addEventListener('click', function () { deckGo(i); });
    card.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); deckGo(i); }
    });
  });
  new IntersectionObserver(function (entries) {
    deckInView = entries[0].isIntersecting;
    restartDeckTimer();
  }, { threshold: 0.25 }).observe($('#deck'));
  Motion.onChange(function () { restartDeckTimer(); });
  renderDeck();

  /* ============================================================
     #play-now 复制游戏名
     ============================================================ */
  $('#copy-name-btn').addEventListener('click', function () {
    var feedback = $('#copy-feedback');
    var NAME = '一脚晋级';
    function ok() { feedback.textContent = '已复制「一脚晋级」，打开微信粘贴搜索。'; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = NAME;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { done = false; }
      document.body.removeChild(ta);
      if (done) ok();
      else feedback.textContent = '复制没成功，手动输入这四个字：一脚晋级。';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(NAME).then(ok, fallback);
    } else {
      fallback();
    }
  });

  /* ============================================================
     测试接口
     ============================================================ */
  function snapshot() {
    return {
      phase: phase,
      moves: moves,
      ball: { row: ballPos.row, col: ballPos.col },
      goal: { row: GOAL.row, col: GOAL.col },
      interacted: interacted,
      motionPaused: Motion.isPaused(),
      activeSection: activeSection,
      assetsReady: assetsReady
    };
  }

  window.__ONEKICK_TEST__ = {
    snapshot: snapshot,
    resetDemo: function () { return resetDemo(); },
    move: function (direction) { return doMove(direction); },
    setMotionPaused: function (paused) { Motion.set(paused); return Motion.isPaused(); },
    goToSection: function (id) { return goToSection(id); }
  };

  /* 初始播报 */
  Motion.apply();
  updateMovesLabel();
})();

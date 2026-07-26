/* ═══════════════════════════════════════════════════════════════
   声律 75 · SOUNDRHYTHM — 交互与 3D 舞台
   · 键盘主体完全程序化构建（three.js r147 / 无 WebGL 时降级为 CSS 3D）
   · 真实点击与 window.__LAUNCH_TEST__ 共享同一套状态
   · 零联网：不请求任何外部资源
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 配色数据 ──────────────────────────────────────────── */
  const PALETTE = [
    {
      id: 'mushanzi', name: '暮山紫', latin: 'MUSHAN VIOLET', hex: '#6C5A86',
      desc: '暮色压在山脊上的那一层紫。',
      ui: { acc: '#9C86C4', deep: '#6C5A86', ink: '#0d0a12',
            glowA: 'rgba(120,94,168,.34)', glowB: 'rgba(60,48,92,.30)' },
      kb: { body: '#6C5A86', bodyHi: '#9581B4', bodyLo: '#332B44', strip: '#A88ECB',
            plate: '#2A2432', capMain: '#E9E5EE', capMod: '#5D4C76', capAcc: '#B4576A',
            legMain: '#3A3244', legMod: '#E4DEEE', legAcc: '#FFF1EE', rim: '#8E74C0' }
    },
    {
      id: 'yuebai', name: '月白', latin: 'MOON WHITE', hex: '#DCDAD2',
      desc: '月光落在宣纸上的白，克制，不刺眼。',
      ui: { acc: '#D8D4C6', deep: '#8F8B7E', ink: '#17170f',
            glowA: 'rgba(206,202,184,.22)', glowB: 'rgba(118,122,116,.24)' },
      kb: { body: '#DCDAD2', bodyHi: '#F2F1EA', bodyLo: '#7E7D75', strip: '#9EA398',
            plate: '#4A4A46', capMain: '#F5F4EF', capMod: '#C6C4BA', capAcc: '#3E5F64',
            legMain: '#4A4842', legMod: '#46443E', legAcc: '#EDEBE4', rim: '#DDE2E4' }
    },
    {
      id: 'daiqing', name: '黛青', latin: 'DAI CYAN', hex: '#3E5F64',
      desc: '远山轮廓里剩下的那一点青。',
      ui: { acc: '#79A8A6', deep: '#3E5F64', ink: '#06100f',
            glowA: 'rgba(70,124,124,.32)', glowB: 'rgba(34,58,62,.30)' },
      kb: { body: '#3E5F64', bodyHi: '#6B9096', bodyLo: '#1E2E31', strip: '#86A9A4',
            plate: '#1E2A2C', capMain: '#D9D3C4', capMod: '#2F484C', capAcc: '#C0703A',
            legMain: '#2A3A3C', legMod: '#CFD8D6', legAcc: '#2A1E14', rim: '#62A0A2' }
    },
    {
      id: 'yanzhi', name: '胭脂', latin: 'YANZHI RED', hex: '#9C3A44',
      desc: '旧漆盒内壁的那一点红。',
      ui: { acc: '#C86A6E', deep: '#9C3A44', ink: '#150607',
            glowA: 'rgba(158,58,66,.32)', glowB: 'rgba(80,26,32,.30)' },
      kb: { body: '#9C3A44', bodyHi: '#C4646A', bodyLo: '#4C1C21', strip: '#D98A86',
            plate: '#2E1A1C', capMain: '#EDE4D8', capMod: '#7A2C34', capAcc: '#22262B',
            legMain: '#4A2A2C', legMod: '#F0E2DC', legAcc: '#E8E2D8', rim: '#C0565C' }
    },
    {
      id: 'xuanmo', name: '玄墨', latin: 'XUANMO BLACK', hex: '#26282C',
      desc: '研开之前，墨块本身的黑。',
      ui: { acc: '#A8B0BA', deep: '#4A5057', ink: '#0b0c0e',
            glowA: 'rgba(110,120,134,.26)', glowB: 'rgba(40,44,52,.32)' },
      kb: { body: '#26282C', bodyHi: '#4A4E55', bodyLo: '#131418', strip: '#5E646C',
            plate: '#131417', capMain: '#3A3D42', capMod: '#26282C', capAcc: '#E8E6DF',
            legMain: '#C8CBD0', legMod: '#9A9EA6', legAcc: '#26282C', rim: '#7E8894' }
    }
  ];
  const BY_ID = {};
  PALETTE.forEach(function (p) { BY_ID[p.id] = p; });

  /* ── 75% 配列（82 键）：[标签, 宽度u, 类型] · 类型 a=字母 m=功能 x=撞色 ── */
  const G = null; // 间隙占位
  const LAYOUT = [
    [['Esc', 1, 'x'], [G, .5], ['F1', 1, 'm'], ['F2', 1, 'm'], ['F3', 1, 'm'], ['F4', 1, 'm'], [G, .5],
     ['F5', 1, 'm'], ['F6', 1, 'm'], ['F7', 1, 'm'], ['F8', 1, 'm'], [G, .5],
     ['F9', 1, 'm'], ['F10', 1, 'm'], ['F11', 1, 'm'], ['F12', 1, 'm'], [G, .5], ['Del', 1, 'm']],

    [['~\n`', 1, 'a'], ['!\n1', 1, 'a'], ['@\n2', 1, 'a'], ['#\n3', 1, 'a'], ['$\n4', 1, 'a'], ['%\n5', 1, 'a'],
     ['^\n6', 1, 'a'], ['&\n7', 1, 'a'], ['*\n8', 1, 'a'], ['(\n9', 1, 'a'], [')\n0', 1, 'a'],
     ['_\n-', 1, 'a'], ['+\n=', 1, 'a'], ['Backspace', 2, 'm'], ['Home', 1, 'm']],

    [['Tab', 1.5, 'm'], ['Q', 1, 'a'], ['W', 1, 'a'], ['E', 1, 'a'], ['R', 1, 'a'], ['T', 1, 'a'], ['Y', 1, 'a'],
     ['U', 1, 'a'], ['I', 1, 'a'], ['O', 1, 'a'], ['P', 1, 'a'], ['{\n[', 1, 'a'], ['}\n]', 1, 'a'],
     ['|\n\\', 1.5, 'm'], ['PgUp', 1, 'm']],

    [['Caps', 1.75, 'm'], ['A', 1, 'a'], ['S', 1, 'a'], ['D', 1, 'a'], ['F', 1, 'a'], ['G', 1, 'a'], ['H', 1, 'a'],
     ['J', 1, 'a'], ['K', 1, 'a'], ['L', 1, 'a'], [':\n;', 1, 'a'], ['"\n\'', 1, 'a'],
     ['Enter', 2.25, 'm'], ['PgDn', 1, 'm']],

    [['Shift', 2.25, 'm'], ['Z', 1, 'a'], ['X', 1, 'a'], ['C', 1, 'a'], ['V', 1, 'a'], ['B', 1, 'a'], ['N', 1, 'a'],
     ['M', 1, 'a'], ['<\n,', 1, 'a'], ['>\n.', 1, 'a'], ['?\n/', 1, 'a'], ['Shift', 1.75, 'm'],
     ['^ARR_U', 1, 'm'], ['End', 1, 'm']],

    [['Ctrl', 1.25, 'm'], ['Fn', 1.25, 'm'], ['Alt', 1.25, 'm'], ['', 6.25, 'a'], ['Alt', 1, 'm'],
     ['SR', 1, 'x'], ['Ctrl', 1, 'm'], ['^ARR_L', 1, 'm'], ['^ARR_D', 1, 'm'], ['^ARR_R', 1, 'm']]
  ];

  const COLS = 16, ROWS = LAYOUT.length;
  const SECTIONS = ['hero', 'features', 'colors', 'buy'];
  const LAUNCH_AT = new Date('2026-08-08T00:00:00+08:00').getTime();

  /* ── 全局状态（真实交互与测试接口共用） ────────────────── */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    activeSection: 'hero',
    activeColor: PALETTE[0].id,
    motionPaused: prefersReduced.matches,
    booked: false,
    renderer: 'none'
  };

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const easeInOut = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  const dom = {
    body: document.body,
    stage: $('.stage'),
    canvas: $('#stage-canvas'),
    fallback: $('#stage-fallback'),
    motionBtn: $('#motion-toggle'),
    ciName: $('#ci-name'), ciLatin: $('#ci-latin'), ciDesc: $('#ci-desc'), ciHex: $('#ci-hex'),
    ctaBtn: $('#cta-btn'), ctaColor: $('#cta-color'),
    swatches: $$('.swatch'),
    navLinks: $$('[data-nav]'),
    cd: $('#countdown')
  };

  /* ═══ 1. 配色应用 ═══════════════════════════════════════ */
  let colorListeners = [];
  function onColor(fn) { colorListeners.push(fn); }

  function applyColor(id, silent) {
    const p = BY_ID[id];
    if (!p) return false;
    state.activeColor = id;
    dom.body.setAttribute('data-color', id);

    const r = document.documentElement.style;
    r.setProperty('--acc', p.ui.acc);
    r.setProperty('--acc-deep', p.ui.deep);
    r.setProperty('--acc-ink', p.ui.ink);
    r.setProperty('--glow-a', p.ui.glowA);
    r.setProperty('--glow-b', p.ui.glowB);
    r.setProperty('--kb-body', p.kb.body);
    r.setProperty('--kb-body-hi', p.kb.bodyHi);
    r.setProperty('--kb-body-lo', p.kb.bodyLo);

    dom.swatches.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.color === id));
    });
    if (dom.ciName) dom.ciName.textContent = p.name;
    if (dom.ciLatin) dom.ciLatin.textContent = p.latin;
    if (dom.ciDesc) dom.ciDesc.textContent = p.desc;
    if (dom.ciHex) dom.ciHex.textContent = p.hex;
    if (dom.ctaColor) dom.ctaColor.textContent = p.name;

    colorListeners.forEach(function (fn) { fn(p, !!silent); });
    return true;
  }

  function resolveColor(key) {
    if (key == null) return null;
    const k = String(key).trim();
    const lower = k.toLowerCase();
    for (let i = 0; i < PALETTE.length; i++) {
      const p = PALETTE[i];
      if (p.id === lower || p.name === k || p.latin.toLowerCase() === lower || p.hex.toLowerCase() === lower) return p.id;
    }
    return null;
  }

  dom.swatches.forEach(function (b) {
    b.addEventListener('click', function () { applyColor(b.dataset.color); });
  });

  /* ═══ 2. 导航与滚动进度 ═════════════════════════════════ */
  const secEls = SECTIONS.map(function (id) { return document.getElementById(id); });
  let navLockUntil = 0;
  let scrollT = 0;          // 0..3 连续滚动进度
  let scrollTTarget = 0;

  function setActiveSection(id) {
    if (state.activeSection === id) return;
    state.activeSection = id;
    dom.body.setAttribute('data-section', id);
    dom.navLinks.forEach(function (a) {
      if (a.tagName === 'A') a.setAttribute('aria-current', String(a.dataset.nav === id));
    });
  }

  function computeT() {
    const vh = window.innerHeight;
    const sc = window.scrollY + vh / 2;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    if (window.scrollY >= maxScroll - 2) return SECTIONS.length - 1;
    const centers = secEls.map(function (el) { return el ? el.offsetTop + el.offsetHeight / 2 : 0; });
    if (sc <= centers[0]) return 0;
    for (let i = 0; i < centers.length - 1; i++) {
      if (sc <= centers[i + 1]) {
        const span = Math.max(1, centers[i + 1] - centers[i]);
        return i + (sc - centers[i]) / span;
      }
    }
    return centers.length - 1;
  }

  function onScroll() {
    scrollTTarget = computeT();
    if (Date.now() > navLockUntil) {
      const idx = clamp(Math.round(scrollTTarget), 0, SECTIONS.length - 1);
      setActiveSection(window.scrollY < 40 ? SECTIONS[0] : SECTIONS[idx]);
    }
  }

  function goToSection(id) {
    const el = document.getElementById(id);
    if (!el || SECTIONS.indexOf(id) === -1) return false;
    setActiveSection(id);
    navLockUntil = Date.now() + 1100;
    const instant = state.motionPaused || prefersReduced.matches;
    try {
      el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      window.scrollTo(0, el.offsetTop);
    }
    return true;
  }

  dom.navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      goToSection(a.dataset.nav);
    });
  });

  /* ═══ 3. 入场揭示 ═══════════════════════════════════════ */
  const revealEls = $$('.reveal, .feat');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ═══ 4. 倒计时 ═════════════════════════════════════════ */
  const cdCells = {};
  if (dom.cd) $$('[data-cd]', dom.cd).forEach(function (b) { cdCells[b.dataset.cd] = b; });
  let cdTimer = 0;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function renderCountdown() {
    if (!cdCells.d) return;
    let left = Math.max(0, LAUNCH_AT - Date.now());
    const d = Math.floor(left / 864e5); left -= d * 864e5;
    const h = Math.floor(left / 36e5); left -= h * 36e5;
    const m = Math.floor(left / 6e4); left -= m * 6e4;
    const s = Math.floor(left / 1e3);
    cdCells.d.textContent = pad(d);
    cdCells.h.textContent = pad(h);
    cdCells.m.textContent = pad(m);
    cdCells.s.textContent = pad(s);
  }
  function syncCountdownTimer() {
    clearInterval(cdTimer);
    renderCountdown();
    if (!state.motionPaused) cdTimer = setInterval(renderCountdown, 1000);
  }

  /* ═══ 5. 动效开关 ═══════════════════════════════════════ */
  function setMotionPaused(paused) {
    state.motionPaused = !!paused;
    dom.body.classList.toggle('motion-off', state.motionPaused);
    dom.motionBtn.setAttribute('aria-pressed', String(state.motionPaused));
    dom.motionBtn.setAttribute('aria-label', state.motionPaused ? '恢复动效' : '暂停动效');
    dom.motionBtn.title = state.motionPaused ? '恢复动效' : '暂停动效';
    if (state.motionPaused) revealEls.forEach(function (el) { el.classList.add('in'); });
    syncCountdownTimer();
    if (kb3d) kb3d.wake();
    return state.motionPaused;
  }
  dom.motionBtn.addEventListener('click', function () { setMotionPaused(!state.motionPaused); });
  prefersReduced.addEventListener && prefersReduced.addEventListener('change', function (e) {
    setMotionPaused(e.matches);
  });

  /* ═══ 6. CTA ════════════════════════════════════════════ */
  dom.ctaBtn.addEventListener('click', function () {
    state.booked = !state.booked;
    dom.ctaBtn.dataset.booked = String(state.booked);
    $('.cta-label', dom.ctaBtn).textContent = state.booked ? '已加入预约名单' : '预约首发';
    $('#cta-state').innerHTML = state.booked
      ? '演示页面，不产生真实订单 · <b id="cta-color">' + BY_ID[state.activeColor].name + '</b>'
      : '当前配色：<b id="cta-color">' + BY_ID[state.activeColor].name + '</b>';
    dom.ctaColor = $('#cta-color');
  });

  /* ═══════════════════════════════════════════════════════
     7. 3D 舞台：程序化构建声律 75
     ═══════════════════════════════════════════════════════ */
  const U = 1;                 // 1 键位单位
  const CAP_GAP = 0.085;
  const CASE_W = COLS * U + 1.1;
  const CASE_D = ROWS * U + 1.0;

  let kb3d = null;

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  /* — 键位几何数据（3D 与 CSS 降级共用） — */
  function buildKeyData() {
    const keys = [];
    for (let r = 0; r < LAYOUT.length; r++) {
      let cx = 0;
      for (let i = 0; i < LAYOUT[r].length; i++) {
        const k = LAYOUT[r][i];
        const w = k[1];
        if (k[0] === null) { cx += w; continue; }
        keys.push({ label: k[0], w: w, type: k[2] || 'a', row: r, x: cx + w / 2, col: cx });
        cx += w;
      }
    }
    return keys;
  }
  const KEYS = buildKeyData();

  /* ── 7a. 字符图集（键帽刻字，程序化绘制，无外部字体文件） ── */
  const ATLAS_CELL = 96, ATLAS_COLS = 12;
  function buildLegendAtlas(keys) {
    const rows = Math.ceil(keys.length / ATLAS_COLS);
    const cv = document.createElement('canvas');
    cv.width = ATLAS_COLS * ATLAS_CELL;
    cv.height = rows * ATLAS_CELL;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const FONT = '"Helvetica Neue",Helvetica,Arial,sans-serif';

    keys.forEach(function (k, i) {
      const cellX = (i % ATLAS_COLS) * ATLAS_CELL;
      const cellY = Math.floor(i / ATLAS_COLS) * ATLAS_CELL;
      k.uv = {
        u0: cellX / cv.width, u1: (cellX + ATLAS_CELL) / cv.width,
        v0: 1 - (cellY + ATLAS_CELL) / cv.height, v1: 1 - cellY / cv.height
      };
      const cx = cellX + ATLAS_CELL / 2, cy = cellY + ATLAS_CELL / 2;
      const L = k.label;
      if (!L) return;

      if (L.indexOf('^ARR_') === 0) {                       // 方向键：路径绘制
        drawArrow(c, cx, cy, ATLAS_CELL * 0.30, L.slice(5));
      } else if (L.indexOf('\n') > 0) {                     // 双刻字（上符号 / 下主字符）
        const parts = L.split('\n');
        c.font = '500 ' + Math.round(ATLAS_CELL * .29) + 'px ' + FONT;
        c.fillText(parts[0], cx, cy - ATLAS_CELL * .19);
        c.fillText(parts[1], cx, cy + ATLAS_CELL * .21);
      } else if (L.length === 1) {                          // 单字母
        c.font = '500 ' + Math.round(ATLAS_CELL * .40) + 'px ' + FONT;
        c.fillText(L, cx, cy + 1);
      } else {                                              // 词组：自适应收缩
        let fs = Math.round(ATLAS_CELL * (L.length > 5 ? .19 : .24));
        c.font = '500 ' + fs + 'px ' + FONT;
        const maxW = ATLAS_CELL * .82;
        while (c.measureText(L).width > maxW && fs > 8) {
          fs -= 1; c.font = '500 ' + fs + 'px ' + FONT;
        }
        c.fillText(L, cx, cy + 1);
      }
    });
    return cv;
  }

  function drawArrow(c, cx, cy, s, dir) {
    c.save();
    c.translate(cx, cy);
    const rot = { U: 0, R: Math.PI / 2, D: Math.PI, L: -Math.PI / 2 }[dir] || 0;
    c.rotate(rot);
    c.lineWidth = Math.max(2, s * .16);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(0, s * .62); c.lineTo(0, -s * .52);
    c.moveTo(-s * .46, -s * .12); c.lineTo(0, -s * .58); c.lineTo(s * .46, -s * .12);
    c.stroke();
    c.restore();
  }

  /* ── 7b. WebGL 舞台 ─────────────────────────────────── */
  function createStage3D() {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: dom.canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
      });
    } catch (e) { return null; }

    const isPhone = function () { return window.innerWidth < 721; };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPhone() ? 1.75 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const col = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(0, 5, 17);

    /* — 程序化环境贴图（柔光箱 + 地平线，赋予铝合金真实反射） — */
    function envCanvas() {
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 512;
      const c = cv.getContext('2d');
      const sky = c.createLinearGradient(0, 0, 0, 512);
      sky.addColorStop(0.00, '#4a5058');
      sky.addColorStop(0.28, '#23262b');
      sky.addColorStop(0.50, '#0e1013');
      sky.addColorStop(0.72, '#08090b');
      sky.addColorStop(1.00, '#141618');
      c.fillStyle = sky; c.fillRect(0, 0, 1024, 512);
      // 顶部柔光箱
      function box(x, y, w, h, a) {
        const rg = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 1.5);
        rg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = rg; c.fillRect(x, y, w, h);
      }
      box(90, 10, 300, 150, .95);
      box(560, 0, 340, 130, .78);
      box(330, 30, 200, 100, .5);
      // 地平线亮带
      const hz = c.createLinearGradient(0, 236, 0, 276);
      hz.addColorStop(0, 'rgba(255,255,255,0)');
      hz.addColorStop(.5, 'rgba(255,255,255,.16)');
      hz.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hz; c.fillRect(0, 236, 1024, 40);
      return cv;
    }
    const envTex = new THREE.CanvasTexture(envCanvas());
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.encoding = THREE.sRGBEncoding;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;
    envTex.dispose(); pmrem.dispose();

    /* — 拉丝粗糙度贴图 — */
    function brushedTex() {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 512;
      const c = cv.getContext('2d');
      c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5200; i++) {
        const y = Math.random() * 512;
        const x = Math.random() * 512;
        const w = 8 + Math.random() * 90;
        const v = 118 + Math.random() * 74;
        c.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',.24)';
        c.lineWidth = Math.random() < .5 ? 1 : 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + (Math.random() - .5) * 1.4); c.stroke();
      }
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 2);
      return t;
    }

    /* — 材质 — */
    const P0 = PALETTE[0].kb;
    // 阳极氧化喷砂铝：高金属度 + 高粗糙度，反射被压住才不会显塑料
    const matBody = new THREE.MeshStandardMaterial({
      color: col(P0.body), metalness: .92, roughness: .64,
      roughnessMap: brushedTex(), envMapIntensity: .8
    });
    const matStrip = new THREE.MeshStandardMaterial({
      color: col(P0.strip), metalness: .85, roughness: .34, envMapIntensity: 1.2
    });
    const matPlate = new THREE.MeshStandardMaterial({
      color: col(P0.plate), metalness: .35, roughness: .82
    });
    const matCap = {
      a: new THREE.MeshStandardMaterial({ color: col(P0.capMain), metalness: .02, roughness: .62, envMapIntensity: .7 }),
      m: new THREE.MeshStandardMaterial({ color: col(P0.capMod), metalness: .02, roughness: .58 }),
      x: new THREE.MeshStandardMaterial({ color: col(P0.capAcc), metalness: .05, roughness: .5 })
    };

    const atlasTex = new THREE.CanvasTexture(buildLegendAtlas(KEYS));
    atlasTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    atlasTex.encoding = THREE.sRGBEncoding;
    const matLeg = {
      a: new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, opacity: .92, color: col(P0.legMain), depthWrite: false, toneMapped: false }),
      m: new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, opacity: .92, color: col(P0.legMod), depthWrite: false, toneMapped: false }),
      x: new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, opacity: .92, color: col(P0.legAcc), depthWrite: false, toneMapped: false })
    };
    const matLed = new THREE.MeshBasicMaterial({ color: col(P0.strip), toneMapped: false });

    /* — 形状工具 — */
    function roundedShape(w, h, r, Ctor) {
      const s = new (Ctor || THREE.Shape)();
      const x = -w / 2, y = -h / 2;
      r = Math.min(r, w / 2, h / 2);
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    function extrude(shape, depth, bt, bs, seg) {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs,
        bevelSegments: seg || 2, curveSegments: 6
      });
      g.rotateX(-Math.PI / 2);
      return g;
    }

    /* — 键帽几何（上窄下宽 + 顶面微凹） — */
    const capGeoCache = {};
    function capGeo(wu) {
      const key = wu.toFixed(2);
      if (capGeoCache[key]) return capGeoCache[key];
      const w = wu * U - CAP_GAP, d = U - CAP_GAP, h = 0.44;
      const bs = 0.045;
      const g = extrude(roundedShape(w - bs * 2, d - bs * 2, 0.09), h - 0.05, 0.05, bs, 2);
      const pos = g.attributes.position;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i); if (y < yMin) yMin = y; if (y > yMax) yMax = y;
      }
      const span = Math.max(1e-5, yMax - yMin);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y - yMin) / span;
        const k = 1 - 0.20 * t * t;                    // 锥度
        const x = pos.getX(i) * k, z = pos.getZ(i) * k;
        let ny = y;
        if (t > 0.86) {                                 // 顶面柱面微凹
          const rel = clamp(Math.abs(x) / (w / 2), 0, 1);
          ny = y - (1 - rel * rel) * 0.028;
        }
        pos.setXYZ(i, x, ny, z);
      }
      g.computeVertexNormals();
      g.translate(0, yMin === 0 ? 0 : -yMin, 0);
      capGeoCache[key] = g;
      return g;
    }

    /* — 组装 — */
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.x = -0.055;                 // 约 6° 前倾
    root.add(tilt);
    scene.add(root);

    const caseTopShape = roundedShape(CASE_W, CASE_D, 0.62);
    caseTopShape.holes.push(roundedShape(COLS * U + 0.14, ROWS * U + 0.14, 0.2, THREE.Path));
    const caseTop = new THREE.Mesh(extrude(caseTopShape, 0.6, 0.06, 0.06, 3), matBody);
    caseTop.position.y = -0.26;          // 边框：y ∈ [-0.32, 0.40]
    caseTop.castShadow = caseTop.receiveShadow = true;
    tilt.add(caseTop);

    const caseBottom = new THREE.Mesh(
      extrude(roundedShape(CASE_W, CASE_D, 0.62), 0.62, 0.1, 0.08, 3), matBody);
    caseBottom.position.y = -1.14;       // 底壳：y ∈ [-1.24, -0.42]
    caseBottom.castShadow = caseBottom.receiveShadow = true;
    tilt.add(caseBottom);

    // 撞色中框：卡在上下壳接缝 [-0.42, -0.32] 之间并微微外凸
    const strip = new THREE.Mesh(
      extrude(roundedShape(CASE_W + 0.02, CASE_D + 0.02, 0.63), 0.14, 0.02, 0.02, 1), matStrip);
    strip.position.y = -0.47;
    tilt.add(strip);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * U + 0.08, 0.07, ROWS * U + 0.08), matPlate);
    plate.position.y = -0.06;
    plate.receiveShadow = true;
    tilt.add(plate);

    // 指示灯（三模状态）
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), matLed);
    led.position.set(CASE_W / 2 - 0.42, 0.40, -CASE_D / 2 + 0.32);
    tilt.add(led);

    // 前沿铭牌
    const badge = (function () {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 64;
      const c = cv.getContext('2d');
      c.clearRect(0, 0, 512, 64);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '600 25px "Helvetica Neue",Helvetica,Arial,sans-serif';
      c.globalAlpha = .85;
      let s = 'SOUNDRHYTHM', x = 6;
      for (let i = 0; i < s.length; i++) { c.fillText(s[i], x, 33); x += c.measureText(s[i]).width + 7; }
      c.globalAlpha = .5;
      c.font = '400 20px "Helvetica Neue",Helvetica,Arial,sans-serif';
      c.fillText('75', x + 12, 34);
      const t = new THREE.CanvasTexture(cv);
      t.encoding = THREE.sRGBEncoding;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.325),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .5, depthWrite: false, toneMapped: false })
      );
      m.position.set(-CASE_W / 2 + 1.65, -0.72, CASE_D / 2 + 0.012);
      return m;
    })();
    tilt.add(badge);

    /* — 键帽 — */
    const capMeshes = [];
    const legendGeoBase = new THREE.PlaneGeometry(0.60, 0.60);
    legendGeoBase.rotateX(-Math.PI / 2);

    KEYS.forEach(function (k) {
      const mesh = new THREE.Mesh(capGeo(k.w), matCap[k.type]);
      const wx = (k.x - COLS / 2) * U;
      const wz = (k.row - (ROWS - 1) / 2) * U;
      mesh.position.set(wx, 0, wz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.baseY = 0;
      mesh.userData.d = Math.hypot(wx / 8, wz / 3);
      tilt.add(mesh);
      capMeshes.push(mesh);

      if (k.label) {
        const lg = legendGeoBase.clone();
        const uv = k.uv;
        lg.setAttribute('uv', new THREE.Float32BufferAttribute(
          [uv.u0, uv.v1, uv.u1, uv.v1, uv.u0, uv.v0, uv.u1, uv.v0], 2));
        const lm = new THREE.Mesh(lg, matLeg[k.type]);
        lm.position.set(-(k.w - 1) * U / 2, 0.502, -0.02);
        lm.renderOrder = 3;
        mesh.add(lm);
      }
    });

    /* — 灯光 — */
    const key = new THREE.DirectionalLight(col('#ffffff'), 1.75);
    key.position.set(7, 14, 9);
    key.castShadow = true;
    const sc = key.shadow.camera;
    sc.left = -13; sc.right = 13; sc.top = 10; sc.bottom = -10; sc.near = 2; sc.far = 44;
    key.shadow.mapSize.set(isPhone() ? 1024 : 2048, isPhone() ? 1024 : 2048);
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const fill = new THREE.DirectionalLight(col(P0.rim), .55);
    fill.position.set(-10, 5, 7);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(col(P0.rim), 2.0);
    rim.position.set(-5, 4, -12);
    scene.add(rim);

    scene.add(new THREE.HemisphereLight(col('#93a1b8'), col('#07080b'), .4));

    /* — 阴影承接面 — */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: .42 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.6;
    ground.receiveShadow = true;
    scene.add(ground);

    /* — 悬浮尘埃 — */
    const dust = (function () {
      const N = 260;
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const seed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - .5) * 34;
        pos[i * 3 + 1] = (Math.random() - .5) * 18;
        pos[i * 3 + 2] = (Math.random() - .5) * 22 - 2;
        seed[i] = Math.random() * 6.283;
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      const rg = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(.4, 'rgba(255,255,255,.45)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg; c.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(cv);
      const m = new THREE.PointsMaterial({
        size: .085, map: t, transparent: true, opacity: .5,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      const p = new THREE.Points(g, m);
      p.userData.seed = seed;
      p.userData.base = pos.slice(0);
      return p;
    })();
    scene.add(dust);

    /* — 相机姿态：随滚动插值 — */
    /* look 点即屏幕中心：look.y 越大键盘越靠下，look.x 越小键盘越靠右。
       机身宽 17.1 单位，取景距离据此拉开，保证四屏都完整入画且不压文案。 */
    const POSES_D = [
      { cam: [-1.8, 9.5, 26.2], look: [-1.8, 3.0, 0], rot: -0.30, scl: 1.00 },   // hero：画面中下，整机入画
      { cam: [-4.5, 5.8, 25.9], look: [-6.5, 0.8, 0.4], rot: 0.58, scl: 1.02 },  // features：右侧低角度看侧壁
      { cam: [-3.0, 27.6, 15.5], look: [-3.0, 0, 1.4], rot: 0.02, scl: 1.00 },   // colors：高位俯视，让出左侧色卡信息
      { cam: [-3.5, 13.6, 29.0], look: [-5.5, 5.6, 0], rot: -0.52, scl: 0.95 }   // buy：右下角收尾
    ];
    const POSES_M = [
      { cam: [0, 35.0, 49.2], look: [0, 4.3, 0], rot: -0.26, scl: 1.00 },
      { cam: [0, 18.0, 56.0], look: [0, -17.0, 0], rot: 0.46, scl: 0.96 },
      { cam: [0, 49.1, 41.9], look: [0, 0, 7.5], rot: 0.02, scl: 1.00 },
      { cam: [0, 26.0, 62.4], look: [0, -10.0, 0], rot: -0.44, scl: 0.90 }
    ];
    let POSES = POSES_D;

    const camPos = new THREE.Vector3().fromArray(POSES[0].cam);
    const camLook = new THREE.Vector3().fromArray(POSES[0].look);
    const tgtPos = camPos.clone(), tgtLook = camLook.clone();
    let tgtRot = POSES[0].rot, curRot = tgtRot;
    let tgtScl = 1, curScl = 1;

    function samplePose(t) {
      const i = clamp(Math.floor(t), 0, POSES.length - 1);
      const j = clamp(i + 1, 0, POSES.length - 1);
      const f = easeInOut(clamp(t - i, 0, 1));
      const A = POSES[i], B = POSES[j];
      tgtPos.set(lerp(A.cam[0], B.cam[0], f), lerp(A.cam[1], B.cam[1], f), lerp(A.cam[2], B.cam[2], f));
      tgtLook.set(lerp(A.look[0], B.look[0], f), lerp(A.look[1], B.look[1], f), lerp(A.look[2], B.look[2], f));
      tgtRot = lerp(A.rot, B.rot, f);
      tgtScl = lerp(A.scl, B.scl, f);
    }

    /* — 指针视差 — */
    let px = 0, py = 0, pxT = 0, pyT = 0;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      pxT = (e.clientX / window.innerWidth - .5) * 2;
      pyT = (e.clientY / window.innerHeight - .5) * 2;
      wake();
    }, { passive: true });

    /* — 配色过渡 — */
    const tweens = [];
    function tweenColor(mat, hex, dur) {
      const from = mat.color.clone(), to = col(hex);
      if (dur <= 0) { mat.color.copy(to); return; }
      tweens.push({ t: 0, dur: dur, step: function (p) { mat.color.copy(from).lerp(to, p); } });
    }
    let rippleAt = -1;

    onColor(function (p, silent) {
      const d = (state.motionPaused || prefersReduced.matches || silent) ? 0 : 620;
      tweenColor(matBody, p.kb.body, d);
      tweenColor(matStrip, p.kb.strip, d);
      tweenColor(matPlate, p.kb.plate, d);
      tweenColor(matCap.a, p.kb.capMain, d);
      tweenColor(matCap.m, p.kb.capMod, d);
      tweenColor(matCap.x, p.kb.capAcc, d);
      tweenColor(matLeg.a, p.kb.legMain, d);
      tweenColor(matLeg.m, p.kb.legMod, d);
      tweenColor(matLeg.x, p.kb.legAcc, d);
      tweenColor(matLed, p.kb.strip, d);
      tweenColor(rim, p.kb.rim, d);          // 灯光同样带 .color
      tweenColor(fill, p.kb.rim, d);
      if (d > 0) rippleAt = 0;
      wake();
    });

    /* — 循环状态（须先于 resize/wake 使用而初始化） — */
    let intro = 0;                 // 0..1 入场进度
    let last = performance.now();
    let idleFrames = 0;
    let running = true;
    function wake() { idleFrames = 0; }

    /* — 尺寸 — */
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      POSES = isPhone() ? POSES_M : POSES_D;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPhone() ? 1.75 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.85 ? 40 : 34;
      camera.updateProjectionMatrix();
      wake();
    }
    window.addEventListener('resize', resize);
    resize();

    /* — 循环 — */
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;

      const paused = state.motionPaused || prefersReduced.matches;
      const damp = paused ? 1 : 1 - Math.pow(0.0016, dt);

      // 滚动进度平滑
      scrollT = paused ? scrollTTarget : lerp(scrollT, scrollTTarget, 1 - Math.pow(0.002, dt));
      samplePose(scrollT);

      // 入场
      if (intro < 1) {
        intro = paused ? 1 : Math.min(1, intro + dt / 1.5);
        wake();
      }

      // 相机
      px = lerp(px, paused ? 0 : pxT, damp);
      py = lerp(py, paused ? 0 : pyT, damp);
      camPos.lerp(tgtPos, damp);
      camLook.lerp(tgtLook, damp);
      const sway = paused ? 0 : Math.sin(now / 4200) * 0.22;
      camera.position.set(camPos.x + px * 0.85 + sway, camPos.y - py * 0.5, camPos.z);
      camera.lookAt(camLook);

      // 键盘姿态
      curRot = lerp(curRot, tgtRot, damp);
      curScl = lerp(curScl, tgtScl, damp);
      const introE = 1 - Math.pow(1 - intro, 3);
      root.rotation.y = curRot + (paused ? 0 : Math.sin(now / 5600) * 0.035) + (1 - introE) * 0.5;
      root.rotation.z = (1 - introE) * -0.06;
      root.position.y = (1 - introE) * -1.4;
      root.scale.setScalar(curScl * (0.94 + 0.06 * introE));

      // 键帽入场落下 + 配色波纹
      if (intro < 1 || rippleAt >= 0) {
        if (rippleAt >= 0) rippleAt += dt;
        for (let i = 0; i < capMeshes.length; i++) {
          const m = capMeshes[i];
          let y = m.userData.baseY;
          if (intro < 1) {
            const st = clamp((intro - m.userData.d * 0.35) / 0.55, 0, 1);
            const e = 1 - Math.pow(1 - st, 4);
            y += (1 - e) * 2.4;
          }
          if (rippleAt >= 0) {
            const w = clamp((rippleAt - m.userData.d * 0.34) / 0.34, 0, 1);
            y += Math.sin(w * Math.PI) * 0.085;
          }
          m.position.y = y;
        }
        if (rippleAt > 1.3) rippleAt = -1;
        wake();
      }

      // 尘埃
      if (!paused) {
        const p = dust.geometry.attributes.position;
        const base = dust.userData.base, seed = dust.userData.seed;
        const tt = now / 1000;
        for (let i = 0; i < seed.length; i++) {
          const s = seed[i];
          p.array[i * 3] = base[i * 3] + Math.sin(tt * 0.16 + s) * 0.7;
          p.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(tt * 0.11 + s * 1.7) * 0.55;
          p.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(tt * 0.09 + s) * 0.4;
        }
        p.needsUpdate = true;
        dust.rotation.y = Math.sin(now / 18000) * 0.12;
        wake();
      }

      // 颜色过渡
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += dt * 1000;
        const p = clamp(tw.t / tw.dur, 0, 1);
        tw.step(p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        if (p >= 1) tweens.splice(i, 1);
        wake();
      }

      // 相机是否仍在收敛
      if (camPos.distanceToSquared(tgtPos) > 1e-6 || Math.abs(curRot - tgtRot) > 1e-4) wake();

      idleFrames++;
      if (idleFrames < 4) renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return {
      wake: wake,
      dispose: function () { running = false; }
    };
  }

  /* ── 7c. CSS 3D 降级舞台 ────────────────────────────── */
  function createStageCSS() {
    const host = dom.fallback;
    host.hidden = false;
    dom.canvas.style.display = 'none';

    const kb = document.createElement('div');
    kb.className = 'fb-kb';
    const PX = 22;
    const w = COLS * PX + 22, h = ROWS * PX + 20;
    kb.style.width = w + 'px';
    kb.style.height = h + 'px';

    const cse = document.createElement('div');
    cse.className = 'fb-case';
    cse.style.cssText += 'inset:0;';
    kb.appendChild(cse);

    KEYS.forEach(function (k) {
      const d = document.createElement('div');
      d.className = 'fb-key';
      d.style.left = (11 + k.col * PX + 1) + 'px';
      d.style.top = (10 + k.row * PX + 1) + 'px';
      d.style.width = (k.w * PX - 2.4) + 'px';
      d.style.height = (PX - 2.4) + 'px';
      d.dataset.type = k.type;
      kb.appendChild(d);
    });
    host.appendChild(kb);

    onColor(function (p) {
      const map = { a: p.kb.capMain, m: p.kb.capMod, x: p.kb.capAcc };
      $$('.fb-key', kb).forEach(function (el) { el.style.setProperty('--k', map[el.dataset.type]); });
    });

    let t = 0;
    function tick() {
      const paused = state.motionPaused || prefersReduced.matches;
      t = paused ? scrollTTarget : lerp(t, scrollTTarget, .08);
      const rx = lerp(58, 30, clamp(t / 3, 0, 1));
      const rz = -32 + Math.sin(t * 1.3) * 22;
      const s = window.innerWidth < 721 ? 0.78 : 1.15;
      kb.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + s + ')';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return { wake: function () {}, dispose: function () {} };
  }

  /* ═══ 8. 启动 ═══════════════════════════════════════════ */
  function boot() {
    setMotionPaused(state.motionPaused);
    dom.body.setAttribute('data-section', 'hero');
    dom.navLinks.forEach(function (a) {
      if (a.tagName === 'A') a.setAttribute('aria-current', String(a.dataset.nav === 'hero'));
    });

    if (window.THREE && hasWebGL()) {
      try {
        kb3d = createStage3D();
        state.renderer = kb3d ? 'webgl' : 'none';
      } catch (e) { kb3d = null; state.renderer = 'none'; }
    }
    if (!kb3d) {
      colorListeners = [];                       // 丢弃半途注册的 3D 监听
      try { kb3d = createStageCSS(); state.renderer = 'css3d'; }
      catch (e) { state.renderer = 'none'; }
    }

    applyColor(state.activeColor, true);
    syncCountdownTimer();

    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; onScroll(); if (kb3d) kb3d.wake(); });
    }, { passive: true });
    window.addEventListener('resize', function () { onScroll(); });
    document.addEventListener('visibilitychange', function () { if (kb3d) kb3d.wake(); });
    onScroll();

    // 首屏元素立即揭示
    requestAnimationFrame(function () {
      $$('#hero .reveal').forEach(function (el) { el.classList.add('in'); });
    });
  }

  /* ═══ 9. 统一测试接口 ═══════════════════════════════════ */
  window.__LAUNCH_TEST__ = {
    snapshot: function () {
      const p = BY_ID[state.activeColor];
      return {
        sections: SECTIONS.slice(),
        activeSection: state.activeSection,
        activeColor: state.activeColor,
        activeColorName: p ? p.name : null,
        colors: PALETTE.map(function (c) { return { id: c.id, name: c.name, hex: c.hex }; }),
        motionPaused: state.motionPaused,
        reducedMotion: prefersReduced.matches,
        booked: state.booked,
        renderer: state.renderer,
        scrollY: Math.round(window.scrollY),
        viewport: { w: window.innerWidth, h: window.innerHeight }
      };
    },
    goToSection: function (id) { return goToSection(String(id || '').replace(/^#/, '')); },
    setColor: function (name) {
      const id = resolveColor(name);
      return id ? applyColor(id) : false;
    },
    setMotionPaused: function (paused) { return setMotionPaused(!!paused); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

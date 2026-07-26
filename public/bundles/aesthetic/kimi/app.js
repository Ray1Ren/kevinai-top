/* ============================================================
   声律 75 · 发布页交互与 3D 场景
   - three.js r147（本地 vendor），程序化建模：86 键 + 旋钮 + 五层消音棉
   - 滚动分区驱动相机姿态；配色五色联动；粒子氛围
   - window.__LAUNCH_TEST__ 统一测试接口，与真实交互同一套状态
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 错误收集（供自检与测试读取） ---------------- */
  var __errors = [];
  window.addEventListener('error', function (e) {
    __errors.push(String(e.message || e.error || 'unknown'));
  });

  /* ---------------- 常量 ---------------- */
  var SECTIONS = ['hero', 'features', 'colors', 'buy'];

  var COLORS = [
    { name: '暮山紫', en: 'DUSK VIOLET', case: 0x5c4a63, caps: 0xd7cfe0, accentKey: 0x5c4a63, accent: '#a58fc0', knob: 0x3e3346 },
    { name: '月白',   en: 'MOON WHITE',  case: 0xddd8cc, caps: 0xf2eee4, accentKey: 0x8d8677, accent: '#cbbf9f', knob: 0xb0a890 },
    { name: '黛青',   en: 'INK TEAL',    case: 0x26474d, caps: 0xcfdbd8, accentKey: 0x26474d, accent: '#63a3a8', knob: 0x183238 },
    { name: '胭脂',   en: 'ROUGE',       case: 0x9c4a4e, caps: 0xe8d5cf, accentKey: 0x9c4a4e, accent: '#cf7f72', knob: 0x6f3337 },
    { name: '玄墨',   en: 'VOID BLACK',  case: 0x17181c, caps: 0x2b2d33, accentKey: 0xb34a3c, accent: '#c86a52', knob: 0x3a3d44 }
  ];

  /* ---------------- 全局状态（真实交互与测试接口共用） ---------------- */
  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* 忽略老旧环境 */ }

  var state = {
    activeSection: 'hero',
    activeColor: COLORS[0].name,
    motionPaused: reduced
  };

  function colorDef(name) {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].name === name) return COLORS[i];
    return null;
  }

  /* ---------------- DOM 引用 ---------------- */
  var body = document.body;
  var heroInner = document.getElementById('hero-inner');
  var scrollCue = document.getElementById('scroll-cue');
  var colorNameEl = document.getElementById('color-name');
  var colorEnEl = document.getElementById('color-en');
  var navColorName = document.getElementById('nav-color-name');
  var buyBtn = document.getElementById('buy-btn');
  var buyNote = document.getElementById('buy-note');
  var swatchBtns = Array.prototype.slice.call(document.querySelectorAll('.swatch'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));

  if (state.motionPaused) body.classList.add('motion-paused');

  /* ---------------- 文案切换动效 ---------------- */
  function swapText(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('swap');
    void el.offsetWidth; /* 重触发动画 */
    el.classList.add('swap');
  }

  /* ---------------- 配色应用（点击色板与 setColor 共用） ---------------- */
  function applyColor(name) {
    var def = colorDef(name);
    if (!def || state.activeColor === name) return;
    state.activeColor = name;
    document.documentElement.style.setProperty('--accent', def.accent);
    swatchBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-color') === name));
    });
    swapText(colorNameEl, def.name);
    swapText(colorEnEl, def.en);
    if (navColorName) navColorName.textContent = def.name;
    if (scene3d) scene3d.setColorway(def);
    if (fallbackUsed) paintFallback(def);
  }

  /* ---------------- 分区导航（点击与 goToSection 共用） ---------------- */
  function setActiveSection(id) {
    if (SECTIONS.indexOf(id) < 0 || state.activeSection === id) return;
    state.activeSection = id;
    navLinks.forEach(function (a) {
      a.setAttribute('aria-current', String(a.getAttribute('data-go') === id));
    });
    if (scene3d) scene3d.setSection(id);
  }

  function goToSection(id) {
    if (SECTIONS.indexOf(id) < 0) return;
    setActiveSection(id);
    var el = document.getElementById(id);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: state.motionPaused ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* 所有 data-go 元素（导航 / CTA / 品牌）统一走 goToSection */
  Array.prototype.slice.call(document.querySelectorAll('[data-go]')).forEach(function (el) {
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      goToSection(el.getAttribute('data-go'));
    });
  });

  swatchBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { applyColor(btn.getAttribute('data-color')); });
  });

  if (buyBtn) {
    buyBtn.addEventListener('click', function () {
      var on = buyBtn.getAttribute('aria-pressed') !== 'true';
      buyBtn.setAttribute('aria-pressed', String(on));
      buyBtn.textContent = on ? '已加入提醒清单' : '预约发售提醒';
      if (buyNote) buyNote.hidden = !on;
    });
  }

  /* ---------------- 滚动侦测：当前分区 / 导航底色 / 首屏视差 ---------------- */
  var spy = null;
  if ('IntersectionObserver' in window) {
    spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.5) setActiveSection(en.target.id);
      });
    }, { threshold: [0.5] });
    SECTIONS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      body.classList.toggle('scrolled', y > 10);
      if (heroInner) {
        var vh = window.innerHeight || 1;
        if (y < vh * 1.2) {
          var fade = Math.max(0, 1 - y / (vh * 0.78));
          heroInner.style.opacity = String(fade);
          heroInner.style.transform = (state.motionPaused || reduced)
            ? 'none'
            : 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)';
          if (scrollCue) scrollCue.style.opacity = String(Math.max(0, 1 - y / 140));
        }
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- 入场 reveal ---------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ============================================================
     WebGL 场景
     ============================================================ */
  var scene3d = null;
  var fallbackUsed = false;

  function buildScene() {
    if (typeof THREE === 'undefined') return null;
    /* 让材质 hex 按 sRGB 意图解析（r147 默认 legacyMode=true，会整体提亮一档） */
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

    var canvas = document.getElementById('scene');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

    /* ----- 影棚环境贴图（金属质感的关键）：自建发光房间 + PMREM ----- */
    try {
      var envScene = new THREE.Scene();
      var room = new THREE.Mesh(
        new THREE.BoxGeometry(40, 40, 40),
        new THREE.MeshBasicMaterial({ color: 0x101013, side: THREE.BackSide })
      );
      envScene.add(room);
      function strip(w, h, c, x, y, z, rx, ry) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c }));
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, 0);
        envScene.add(m);
      }
      strip(20, 5, 0xfff3e0, 0, 18, 0, Math.PI / 2, 0);   /* 顶部暖光带 */
      strip(12, 4, 0xaec4ff, -19, 5, 0, 0, Math.PI / 2);   /* 左侧冷光带 */
      strip(12, 4, 0xffd9bd, 19, 3, -5, 0, -Math.PI / 2);  /* 右侧暖光带 */
      strip(10, 2, 0xffffff, 0, 2, 19, 0, Math.PI);        /* 正面补光 */
      var pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch (e) { /* 环境贴图失败时仍可靠灯光渲染 */ }

    /* ----- 灯光 ----- */
    scene.add(new THREE.HemisphereLight(0xfff2e2, 0x111116, 0.4));

    var keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
    keyLight.position.set(9, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 42;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0xa58fc0, 1.5);
    rimLight.position.set(-10, 5, -8);
    scene.add(rimLight);

    var fillLight = new THREE.DirectionalLight(0xbfd0e8, 0.3);
    fillLight.position.set(-5, 3, 11);
    scene.add(fillLight);

    /* ----- 几何工具 ----- */
    function roundedRect(w, h, r) {
      var s = new THREE.Shape();
      var x = -w / 2, y = -h / 2;
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

    /* 拉伸体：立放（沿 +Y 增高），底部对齐 y=0 */
    function slab(w, h, r, depth, bevel) {
      var geo = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.8,
        bevelSegments: 2,
        curveSegments: 5
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, bevel, 0);
      return geo;
    }

    /* ----- 材质 ----- */
    var def0 = COLORS[0];
    var caseMat = new THREE.MeshStandardMaterial({ color: def0.case, metalness: 0.85, roughness: 0.36, envMapIntensity: 0.9 });
    var capMat = new THREE.MeshStandardMaterial({ color: def0.caps, metalness: 0.06, roughness: 0.62, envMapIntensity: 0.35 });
    var capAccentMat = new THREE.MeshStandardMaterial({ color: def0.accentKey, metalness: 0.15, roughness: 0.46, envMapIntensity: 0.7 });
    var knobMat = new THREE.MeshStandardMaterial({ color: def0.knob, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.2 });
    var plateMat = new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.8 });
    var pcbMat = new THREE.MeshStandardMaterial({ color: 0x173b2c, metalness: 0.3, roughness: 0.6, envMapIntensity: 0.4 });
    var foamMats = [0xdcd7cc, 0x33353a, 0xdcd7cc, 0x3a3d42, 0xc9c3b6].map(function (c) {
      return new THREE.MeshStandardMaterial({ color: c, metalness: 0.0, roughness: 0.95, envMapIntensity: 0.3 });
    });

    /* ----- 键盘组 ----- */
    var kb = new THREE.Group();
    scene.add(kb);

    var layers = []; /* { obj, base, off } —— 爆炸视图位移表 */
    function addLayer(obj, base, off) {
      obj.position.y = base;
      kb.add(obj);
      layers.push({ obj: obj, base: base, off: off });
    }

    /* 底壳 */
    var bottomCase = new THREE.Mesh(slab(16.7, 6.56, 0.3, 0.8, 0.12), caseMat);
    bottomCase.castShadow = true;
    bottomCase.receiveShadow = true;
    addLayer(bottomCase, 0, -0.72);

    /* PCB */
    var pcb = new THREE.Mesh(slab(15.9, 5.85, 0.12, 0.05, 0.02), pcbMat);
    addLayer(pcb, 0.46, 0.12);

    /* 五层消音棉 */
    var foamY = [0.58, 0.645, 0.71, 0.775, 0.84];
    var foamOff = [0.42, 0.55, 0.68, 0.81, 0.94];
    for (var fi = 0; fi < 5; fi++) {
      var foam = new THREE.Mesh(slab(15.9, 5.85, 0.12, 0.04, 0.012), foamMats[fi]);
      addLayer(foam, foamY[fi], foamOff[fi]);
    }

    /* 定位板 */
    var plate = new THREE.Mesh(slab(16.12, 6.0, 0.14, 0.08, 0.03), plateMat);
    plate.receiveShadow = true;
    addLayer(plate, 1.0, 1.08);

    /* 上盖（带内孔的框） */
    var frameShape = roundedRect(16.7, 6.56, 0.32);
    frameShape.holes.push(roundedRect(16.12, 6.0, 0.16));
    var frameGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.42, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 2, curveSegments: 5
    });
    frameGeo.rotateX(-Math.PI / 2);
    frameGeo.translate(0, 0.09, 0);
    var frame = new THREE.Mesh(frameGeo, caseMat);
    frame.castShadow = true;
    frame.receiveShadow = true;
    addLayer(frame, 0.96, 2.5);

    /* ----- 键帽：75% 配列（16 宽 × 6 行 + 右上旋钮） -----
       数字 = 键宽(u)，负号 = accent 键                          */
    var ROWS = [
      [-1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],          /* Esc F1..F12 Del（旋钮占第 16 格） */
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],           /* 数字行 + Backspace + Home */
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],       /* Tab 行 + PgUp */
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -2.25, 1],       /* Caps 行 + Enter + PgDn */
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, -1, 1],       /* Shift 行 + ↑ + End */
      [1.25, 1.25, 1.25, 6.25, 1, 1, 1, -1, -1, -1]            /* 底行 + ← ↓ → */
    ];

    var capGeoCache = {};
    function capGeo(w) {
      var key = String(w);
      if (!capGeoCache[key]) {
        capGeoCache[key] = slab(Math.max(w - 0.14, 0.4), 0.86, 0.09, 0.42, 0.13);
      }
      return capGeoCache[key];
    }

    var capsGroup = new THREE.Group();
    addLayer(capsGroup, 0, 1.7);

    var CAP_BASE_Y = 1.1;
    ROWS.forEach(function (row, ri) {
      var x = 0;
      row.forEach(function (w0) {
        var accent = w0 < 0;
        var w = Math.abs(w0);
        var cap = new THREE.Mesh(capGeo(w), accent ? capAccentMat : capMat);
        cap.position.set(x + w / 2 - 8, CAP_BASE_Y, ri - 2.5);
        cap.castShadow = true;
        cap.receiveShadow = true;
        capsGroup.add(cap);
        x += w;
      });
    });

    /* 右上旋钮（两截圆柱） */
    var knob = new THREE.Group();
    var knobBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.47, 0.42, 28), knobMat);
    knobBody.castShadow = true;
    var knobTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.1, 28), caseMat);
    knobTop.position.y = 0.26;
    knob.add(knobBody);
    knob.add(knobTop);
    knob.position.set(7.5, CAP_BASE_Y + 0.1, -2.5);
    capsGroup.add(knob);

    /* ----- 粒子氛围 ----- */
    var P_COUNT = 240;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(P_COUNT * 3);
    for (var pi = 0; pi < P_COUNT; pi++) {
      pPos[pi * 3] = (Math.random() - 0.5) * 48;
      pPos[pi * 3 + 1] = Math.random() * 18 - 4;
      pPos[pi * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var pMat = new THREE.PointsMaterial({
      color: 0xa58fc0, size: 0.055, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ----- 分区姿态（桌面 / 窄屏两套） ----- */
    var POSES_WIDE = {
      hero:     { kb: [6.6, -2.2, 0], rotY: -0.5, cam: [0.6, 11, 17.5], tgt: [4.4, -0.9, 0], exp: 0 },
      features: { kb: [-10, 0.4, -3], rotY: 0.55, cam: [-1.5, 10, 19.5], tgt: [-6, 1.2, -1], exp: 1 },
      colors:   { kb: [0, -3.9, 0], rotY: 0, cam: [0, 12.5, 16], tgt: [0, -2.9, 0], exp: 0 },
      buy:      { kb: [0, 3.2, -5], rotY: 0.4, cam: [0, 7.5, 23], tgt: [0, 2.4, -1], exp: 0 }
    };
    var POSES_NARROW = {
      hero:     { kb: [0, -9.5, 0], rotY: -0.42, cam: [0, 12, 27], tgt: [0, -5.6, 0], exp: 0 },
      features: { kb: [0, 0.2, -2], rotY: 0.6, cam: [0, 11, 24], tgt: [0, 1.6, -1], exp: 1 },
      colors:   { kb: [0, -3.6, 0], rotY: 0.08, cam: [0, 10, 19], tgt: [0, -2.2, 0], exp: 0 },
      buy:      { kb: [0, 4.5, -7], rotY: 0.45, cam: [0, 9, 30], tgt: [0, 3.2, -2], exp: 0 }
    };

    var narrow = false;
    function poseFor(id) {
      var table = narrow ? POSES_NARROW : POSES_WIDE;
      return table[id] || table.hero;
    }

    /* 当前插值值 */
    var cur = {
      cam: new THREE.Vector3(), tgt: new THREE.Vector3(), kbPos: new THREE.Vector3(),
      rotY: 0, exp: 0
    };
    function snapTo(p) {
      cur.cam.set(p.cam[0], p.cam[1], p.cam[2]);
      cur.tgt.set(p.tgt[0], p.tgt[1], p.tgt[2]);
      cur.kbPos.set(p.kb[0], p.kb[1], p.kb[2]);
      cur.rotY = p.rotY;
      cur.exp = p.exp;
    }
    snapTo(poseFor('hero'));

    /* 配色目标（逐帧逼近） */
    var tCase = new THREE.Color(def0.case);
    var tCaps = new THREE.Color(def0.caps);
    var tAccentKey = new THREE.Color(def0.accentKey);
    var tKnob = new THREE.Color(def0.knob);
    var tRim = new THREE.Color(def0.accent);

    /* 鼠标视差 */
    var mouse = { x: 0, y: 0 };
    var mouseCur = { x: 0, y: 0 };
    window.addEventListener('pointermove', function (ev) {
      if (reduced) return;
      mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (ev.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    /* 尺寸 */
    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      narrow = w / h < 0.85;
      camera.aspect = w / h;
      camera.fov = narrow ? 50 : 38;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    /* ----- 主循环 ----- */
    var clock = new THREE.Clock();
    var time = 0;
    var activePoseId = 'hero';

    function applyExplode(e) {
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        L.obj.position.y = L.base + L.off * e;
      }
    }

    function tick() {
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      var paused = state.motionPaused;
      if (!paused) time += dt;

      /* 姿态插值（暂停时直接到位，保证可打断与确定性） */
      var p = poseFor(activePoseId);
      var k = paused ? 1 : 1 - Math.exp(-dt * 3.1);
      cur.cam.x += (p.cam[0] - cur.cam.x) * k;
      cur.cam.y += (p.cam[1] - cur.cam.y) * k;
      cur.cam.z += (p.cam[2] - cur.cam.z) * k;
      cur.tgt.x += (p.tgt[0] - cur.tgt.x) * k;
      cur.tgt.y += (p.tgt[1] - cur.tgt.y) * k;
      cur.tgt.z += (p.tgt[2] - cur.tgt.z) * k;
      cur.kbPos.x += (p.kb[0] - cur.kbPos.x) * k;
      cur.kbPos.y += (p.kb[1] - cur.kbPos.y) * k;
      cur.kbPos.z += (p.kb[2] - cur.kbPos.z) * k;
      cur.rotY += (p.rotY - cur.rotY) * k;
      cur.exp += (p.exp - cur.exp) * (paused ? 1 : 1 - Math.exp(-dt * 2.6));

      /* 配色插值 */
      var ck = paused ? 1 : 1 - Math.exp(-dt * 5.5);
      caseMat.color.lerp(tCase, ck);
      capMat.color.lerp(tCaps, ck);
      capAccentMat.color.lerp(tAccentKey, ck);
      knobMat.color.lerp(tKnob, ck);
      rimLight.color.lerp(tRim, ck);
      pMat.color.lerp(tRim, ck);

      /* 鼠标视差 */
      var mk = paused || reduced ? 1 : 1 - Math.exp(-dt * 4);
      var mtx = reduced ? 0 : mouse.x;
      var mty = reduced ? 0 : mouse.y;
      mouseCur.x += (mtx - mouseCur.x) * mk;
      mouseCur.y += (mty - mouseCur.y) * mk;

      /* 应用到场景 */
      var bob = (paused || reduced) ? 0 : Math.sin(time * 0.9) * 0.09;
      kb.position.set(cur.kbPos.x, cur.kbPos.y + bob, cur.kbPos.z);
      kb.rotation.y = cur.rotY + mouseCur.x * 0.05;
      kb.rotation.x = mouseCur.y * 0.025;
      applyExplode(cur.exp);

      camera.position.set(
        cur.cam.x + mouseCur.x * 0.8,
        cur.cam.y - mouseCur.y * 0.5,
        cur.cam.z
      );
      camera.lookAt(cur.tgt);

      if (!paused) {
        knob.rotation.y += dt * 0.5;
        /* 粒子上浮循环 */
        var arr = pGeo.attributes.position.array;
        for (var i = 0; i < P_COUNT; i++) {
          arr[i * 3 + 1] += dt * 0.35;
          if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = -4;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    applyExplode(0);
    tick();

    return {
      setSection: function (id) { activePoseId = id; },
      setColorway: function (def) {
        tCase.set(def.case);
        tCaps.set(def.caps);
        tAccentKey.set(def.accentKey);
        tKnob.set(def.knob);
        tRim.set(def.accent);
      }
    };
  }

  /* ---------------- WebGL 降级：CSS 3D 键盘 ---------------- */
  var FB_ROWS = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
    [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1]
  ];
  var FB_ACCENT = { '0,0': 1, '3,13': 1, '4,12': 1, '5,7': 1, '5,8': 1, '5,9': 1 };

  function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }

  function paintFallback(def) {
    var board = document.querySelector('.fb-board');
    if (!board) return;
    board.style.setProperty('--fb-case', hex(def.case));
    board.style.setProperty('--fb-cap', hex(def.caps));
    board.style.setProperty('--fb-accent', hex(def.accentKey));
  }

  function buildFallback() {
    fallbackUsed = true;
    var fb = document.getElementById('fallback');
    var keys = document.getElementById('fb-keys');
    if (!fb || !keys) return;
    fb.hidden = false;
    FB_ROWS.forEach(function (row, ri) {
      var rowEl = document.createElement('div');
      rowEl.className = 'fb-row';
      row.forEach(function (w, ci) {
        var k = document.createElement('div');
        k.className = 'fb-key' + (FB_ACCENT[ri + ',' + ci] ? ' accent' : '');
        k.style.flex = String(w);
        rowEl.appendChild(k);
      });
      keys.appendChild(rowEl);
    });
    paintFallback(colorDef(state.activeColor));
  }

  try {
    scene3d = buildScene();
  } catch (e) {
    __errors.push('webgl: ' + (e && e.message ? e.message : e));
    scene3d = null;
  }
  if (!scene3d) {
    var canvasEl = document.getElementById('scene');
    if (canvasEl) canvasEl.style.display = 'none';
    buildFallback();
  }

  /* ---------------- URL 深链（可选，便于分享与自检） ---------------- */
  try {
    var qs = new URLSearchParams(window.location.search);
    var qColor = qs.get('color');
    if (qColor && colorDef(qColor)) applyColor(qColor);
    var qSection = qs.get('section');
    if (qSection && SECTIONS.indexOf(qSection) >= 0) {
      setActiveSection(qSection);
      var qEl = document.getElementById(qSection);
      if (qEl) qEl.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    if (qs.get('paused') === '1') setMotionPaused(true);
  } catch (e) { /* 忽略 */ }

  /* ---------------- 运动开关（按钮/系统降级与测试接口共用） ---------------- */
  function setMotionPaused(paused) {
    state.motionPaused = !!paused;
    body.classList.toggle('motion-paused', state.motionPaused);
    if (heroInner && state.motionPaused) heroInner.style.transform = 'none';
  }

  /* ---------------- 统一测试接口 ---------------- */
  window.__LAUNCH_TEST__ = {
    snapshot: function () {
      return {
        sections: SECTIONS.slice(),
        activeSection: state.activeSection,
        activeColor: state.activeColor,
        motionPaused: state.motionPaused,
        reducedMotion: reduced,
        webgl: !!scene3d,
        errors: __errors.slice()
      };
    },
    goToSection: goToSection,
    setColor: applyColor,
    setMotionPaused: setMotionPaused
  };
})();

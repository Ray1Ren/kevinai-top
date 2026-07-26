/* ============================================================
   声律 75 · SOUNDRHYTHM — 发布页脚本
   程序化 3D 键盘（three.js r147）+ 滚动位姿驱动 + 统一状态接口
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  /* ---------------- 配色定义（唯一事实源） ---------------- */
  const COLORWAYS = [
    { id: 'mushanzi', name: '暮山紫', pinyin: 'MU SHAN ZI', desc: '暮色沉进山脊的那一刻，紫得克制。',
      case3d: 0x6c5a92, cap: 0xd9d2e6, mod: 0x453a63, glow3d: 0x8d76c0 },
    { id: 'yuebai',   name: '月白',   pinyin: 'YUE BAI',   desc: '月光落在素纸上，白里带一分清冷。',
      case3d: 0xd7dde5, cap: 0xf0f2f5, mod: 0x9daebb, glow3d: 0xbfd0dc },
    { id: 'daiqing',  name: '黛青',   pinyin: 'DAI QING',  desc: '远山的黛，近墨的青，安静而深。',
      case3d: 0x3c6163, cap: 0xe0e8e4, mod: 0x284344, glow3d: 0x5f9a96 },
    { id: 'yanzhi',   name: '胭脂',   pinyin: 'YAN ZHI',   desc: '一点旧时胭脂色，沉稳，不张扬。',
      case3d: 0x93343f, cap: 0xf0e4dc, mod: 0x571d27, glow3d: 0xc05a68 },
    { id: 'xuanmo',   name: '玄墨',   pinyin: 'XUAN MO',   desc: '墨到极处，是最耐看的黑。',
      case3d: 0x2d2d33, cap: 0x43434b, mod: 0x232328, glow3d: 0x8f939e },
  ];
  const BRASS = 0xc2a25f;

  /* ---------------- 75% 配列布局（单位 u） ---------------- */
  const ROWS = (() => {
    const m = w => [w, 'm'], a = w => [w, 'a'];
    return [
      { z: 0,    keys: [[1, 'x'], ...Array.from({ length: 13 }, () => [1, 'm'])] },
      { z: 1.18, keys: [m(1),    ...Array.from({ length: 12 }, () => a(1)), m(2),        m(1)] },
      { z: 2.18, keys: [m(1.5),  ...Array.from({ length: 12 }, () => a(1)), m(1.5),      m(1)] },
      { z: 3.18, keys: [m(1.75), ...Array.from({ length: 11 }, () => a(1)), [2.25, 'x'], m(1)] },
      { z: 4.18, keys: [m(2.25), ...Array.from({ length: 10 }, () => a(1)), m(1.75), m(1), m(1)] },
      { z: 5.18, keys: [m(1.25), m(1.25), m(1.25), a(6.25), m(1), m(1), m(1), m(1), m(1), m(1)] },
    ];
  })();
  const BOARD = { w: 16, d: 6.10, pad: 0.7 };       // 机身外扩 0.7u
  const CASE_W = BOARD.w + BOARD.pad * 2;           // 17.4u，用于自适配缩放

  /* ---------------- 全局状态（真实交互与测试接口共用） ---------------- */
  const state = {
    activeColor: COLORWAYS[0],
    activeSection: 'hero',
    motionPaused: false,
    reserved: false,
  };

  const els = {
    html: document.documentElement,
    canvas: $('#stage'),
    sections: $$('main > .section'),
    navLinks: $$('.nav a[data-nav]'),
    motionToggle: $('#motionToggle'),
    colorStage: $('.color-stage'),
    colorIndex: $('#colorIndex'),
    colorName: $('#colorName'),
    colorPinyin: $('#colorPinyin'),
    colorDesc: $('#colorDesc'),
    swatches: $$('.swatch'),
    cta: $('#ctaBtn'),
    countdown: $('#countdown'),
  };
  const sectionIds = els.sections.map(s => s.id);

  /* ---------------- 各区块键盘位姿（xf/yf 为可视宽高比例） ---------------- */
  const POSES_DESKTOP = {
    hero:     { xf: 0.02, yf: -0.30, rx: 0.78, ry: -0.30, rz: 0.07, k: 0.78, dim: 0 },
    features: { xf: 0.30, yf: -0.02, rx: 1.02, ry: -0.52, rz: 0.12, k: 0.46, dim: 0.52 },
    colors:   { xf: 0.25, yf: -0.05, rx: 1.28, ry: -0.05, rz: 0.00, k: 0.50, dim: 0 },
    buy:      { xf: 0.00, yf: -0.44, rx: 0.62, ry: -0.18, rz: 0.04, k: 0.54, dim: 0.62 },
  };
  const POSES_MOBILE = {
    hero:     { xf: 0, yf: -0.32, rx: 0.80, ry: -0.30, rz: 0.06, k: 0.94, dim: 0 },
    features: { xf: 0, yf:  0.38, rx: 1.05, ry: -0.45, rz: 0.10, k: 0.72, dim: 0.62 },
    colors:   { xf: 0, yf:  0.32, rx: 1.30, ry: -0.04, rz: 0.00, k: 0.90, dim: 0.05 },
    buy:      { xf: 0, yf: -0.40, rx: 0.62, ry: -0.15, rz: 0.02, k: 0.78, dim: 0.62 },
  };
  const mqNarrow = matchMedia('(max-width: 720px)');
  const posesNow = () => (mqNarrow.matches ? POSES_MOBILE : POSES_DESKTOP);

  const hexCss = n => '#' + n.toString(16).padStart(6, '0');
  const shadeCss = (n, f) => {
    const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
    const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
    const b = clamp(Math.round((n & 255) * f), 0, 255);
    return `rgb(${r},${g},${b})`;
  };

  /* ============================================================
     WebGL 舞台：程序化键盘
     ============================================================ */
  function createStage3D(canvas) {
    if (typeof THREE === 'undefined') return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      if (!renderer.getContext()) throw new Error('no-gl');
    } catch (e) { return null; }

    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 1.6, 16);
    camera.lookAt(0, -0.3, 0);

    /* 灯光 */
    scene.add(new THREE.HemisphereLight(0x9aa0b4, 0x101014, 0.5));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.15); key.position.set(6, 12, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xaebfdd, 0.55); rim.position.set(-9, 7, -8); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.22); fill.position.set(-3, 4, 12); scene.add(fill);

    /* 环境反射（程序化棚拍软光箱） */
    try {
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x111116);
      const strip = (w, h, color, x, y, z, ry) => {
        const p = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
        );
        p.position.set(x, y, z); p.rotation.y = ry || 0; envScene.add(p);
      };
      strip(24, 8, 0xffffff, 0, 11, 0, 0);
      envScene.children[envScene.children.length - 1].rotation.x = Math.PI / 2;
      strip(16, 6, 0xffe7c4, -12, 3, 0, Math.PI / 2);
      strip(16, 6, 0x9db4dd, 12, 2, -2, -Math.PI / 2);
      strip(20, 4, 0x3a3a44, 0, 1, -14, 0);
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(envScene, 0.05).texture;
      pmrem.dispose();
    } catch (e) { /* 无环境贴图时仅靠灯光 */ }

    /* 材质（颜色随配色/明暗动态刷新） */
    const BG = new THREE.Color(0x0e0e12);
    const mkStd = (metal, rough) => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: metal, roughness: rough });
    const mats = {
      case: mkStd(0.78, 0.34),
      deck: mkStd(0.40, 0.62),
      cap:  mkStd(0.04, 0.52),
      mod:  mkStd(0.04, 0.58),
      brass: mkStd(0.92, 0.28),
    };
    const base = {
      case: new THREE.Color(), deck: new THREE.Color(),
      cap: new THREE.Color(), mod: new THREE.Color(),
      brass: new THREE.Color(BRASS),
    };
    const glowColor = new THREE.Color(0x8d76c0);

    /* —— 键盘构建 —— */
    const board = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.set(-BOARD.w / 2, 0, -(BOARD.d + 0.0) / 2);
    board.add(inner);
    scene.add(board);

    const placeTopAt = (geo, yTop) => {
      geo.computeBoundingBox();
      geo.translate(0, yTop - geo.boundingBox.max.y, 0);
      return geo;
    };
    const roundedShape = (w, h, r) => {
      const s = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };

    /* 机身：CNC 铝壳 */
    const caseGeo = new THREE.ExtrudeGeometry(
      roundedShape(CASE_W, BOARD.d + BOARD.pad * 2, 0.55),
      { depth: 0.95, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 10 }
    );
    caseGeo.rotateX(Math.PI / 2);
    placeTopAt(caseGeo, 0.22);
    const caseMesh = new THREE.Mesh(caseGeo, mats.case);
    caseMesh.position.set(BOARD.w / 2, 0, BOARD.d / 2);
    inner.add(caseMesh);

    /* 定位板 */
    const deck = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w + 0.3, 0.08, BOARD.d + 0.4), mats.deck);
    deck.position.set(BOARD.w / 2, 0.12, BOARD.d / 2);
    inner.add(deck);

    /* 键帽 */
    const capGeoCache = new Map();
    const capGeo = w => {
      if (!capGeoCache.has(w)) {
        const g = new THREE.ExtrudeGeometry(
          roundedShape(w - 0.10, 0.92, 0.17),
          { depth: 0.24, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.06, bevelSegments: 3, curveSegments: 5 }
        );
        g.rotateX(Math.PI / 2);
        placeTopAt(g, 0.56);
        capGeoCache.set(w, g);
      }
      return capGeoCache.get(w);
    };
    const keys = [];
    ROWS.forEach((row, ri) => {
      let x = 0;
      row.keys.forEach(([w, type]) => {
        const mat = type === 'x' ? mats.brass : (type === 'm' ? mats.mod : mats.cap);
        const mesh = new THREE.Mesh(capGeo(w), mat);
        mesh.position.set(x + w / 2, 0, row.z + 0.46);
        inner.add(mesh);
        keys.push({ mesh, phase: (x + w / 2) * 0.42 + ri * 0.35 });
        x += w;
      });
    });

    /* 音量旋钮（黄铜） */
    const knob = new THREE.Group();
    const knobBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.36, 28), mats.brass);
    knobBody.position.y = 0.38;
    const knurl = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.05, 10, 34), mats.brass);
    knurl.rotation.x = Math.PI / 2; knurl.position.y = 0.5;
    knob.add(knobBody, knurl);
    knob.position.set(15.1, 0, 0.46);
    inner.add(knob);

    /* 舞台背光晕 */
    const haloTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c);
      return t;
    })();
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, color: glowColor,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.position.z = -5;
    scene.add(halo);

    /* 声波尘粒 */
    const P_COUNT = 130;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    const pSpeed = new Float32Array(P_COUNT);
    for (let i = 0; i < P_COUNT; i++) {
      pPos[i * 3] = (Math.random() * 2 - 1) * 11;
      pPos[i * 3 + 1] = (Math.random() * 2 - 1) * 6;
      pPos[i * 3 + 2] = -7 + Math.random() * 9;
      pSpeed[i] = 0.12 + Math.random() * 0.3;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const dotTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const pMat = new THREE.PointsMaterial({
      size: 0.14, map: dotTex, transparent: true, opacity: 0.4,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfd4de, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    /* —— 颜色 / 明暗刷新 —— */
    let lastDim = -1;
    const dimTargets = [
      ['case', mats.case], ['deck', mats.deck], ['cap', mats.cap], ['mod', mats.mod], ['brass', mats.brass],
    ];
    const applyDim = dim => {
      dimTargets.forEach(([k, m]) => m.color.copy(base[k]).lerp(BG, dim));
      haloMat.opacity = 0.42 * (1 - dim);
      pMat.opacity = 0.4 * (1 - dim * 0.8);
      lastDim = dim;
    };
    const setColor = cw => {
      base.case.set(cw.case3d);
      base.deck.copy(base.case).multiplyScalar(0.4);
      base.cap.set(cw.cap);
      base.mod.set(cw.mod);
      glowColor.set(cw.glow3d);
      haloMat.color.copy(glowColor);
      pMat.color.copy(glowColor).lerp(new THREE.Color(0xffffff), 0.35);
      applyDim(Math.max(lastDim, 0));
    };

    /* —— 尺寸与可视范围 —— */
    const metrics = { visW: 10, visH: 10, fitScale: 0.6 };
    const resize = (w, h) => {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      metrics.visH = 2 * 16 * Math.tan((camera.fov * Math.PI) / 360);
      metrics.visW = metrics.visH * camera.aspect;
      metrics.fitScale = metrics.visW / CASE_W;
    };

    /* —— 每帧渲染 —— */
    const render = (pose, t, frozen) => {
      board.position.set(pose.x, pose.y, 0);
      board.rotation.set(pose.rx, pose.ry, pose.rz);
      board.scale.setScalar(pose.scale);

      if (!frozen) {
        board.position.y += Math.sin(t * 0.7) * 0.09 * (1 - pose.dim);
        board.rotation.z += Math.sin(t * 0.5) * 0.008;
        /* 键浪：一列列被“敲下”的涟漪 */
        const amp = 0.1 * (1 - pose.dim);
        if (amp > 0.004) {
          for (let i = 0; i < keys.length; i++) {
            const s = Math.sin(t * 2.3 - keys[i].phase);
            keys[i].mesh.position.y = s > 0 ? -Math.pow(s, 12) * amp : 0;
          }
        }
        knob.rotation.y = t * 0.6;
        const arr = pGeo.attributes.position.array;
        for (let i = 0; i < P_COUNT; i++) {
          arr[i * 3 + 1] += pSpeed[i] * 0.016;
          if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -7;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      if (Math.abs(pose.dim - lastDim) > 0.003) applyDim(pose.dim);
      halo.position.set(pose.x, pose.y + 0.5, -5);
      halo.scale.set(pose.scale * 34, pose.scale * 22, 1);

      renderer.render(scene, camera);
    };

    return { kind: 'webgl', render, resize, setColor, metrics };
  }

  /* ============================================================
     Canvas 2D 兜底舞台（WebGL 不可用时）
     ============================================================ */
  function createStage2D(canvas) {
    const ctx = canvas.getContext('2d');
    let cw = COLORWAYS[0];
    const metrics = { visW: 10, visH: 10, fitScale: 0.6 };
    let W = 0, H = 0, DPR = 1;

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const draw = () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const u = Math.min(W * 0.86, 940) / CASE_W;
      const bx = (W - CASE_W * u) / 2, by = H * 0.46 - ((BOARD.d + 1.4) * u) / 2;

      const cg = ctx.createLinearGradient(0, by, 0, by + (BOARD.d + 1.4) * u);
      cg.addColorStop(0, shadeCss(cw.case3d, 1.14));
      cg.addColorStop(1, shadeCss(cw.case3d, 0.72));
      ctx.fillStyle = cg;
      rr(bx, by, CASE_W * u, (BOARD.d + 1.4) * u, 0.55 * u); ctx.fill();

      ROWS.forEach(row => {
        let x = 0;
        row.keys.forEach(([w, type]) => {
          const c = type === 'x' ? BRASS : (type === 'm' ? cw.mod : cw.cap);
          const kg = ctx.createLinearGradient(0, by + (0.7 + row.z) * u, 0, by + (0.7 + row.z + 0.92) * u);
          kg.addColorStop(0, shadeCss(c, 1.1));
          kg.addColorStop(1, shadeCss(c, 0.82));
          ctx.fillStyle = kg;
          rr(bx + (BOARD.pad + x + 0.05) * u, by + (BOARD.pad + row.z) * u, (w - 0.1) * u, 0.92 * u, 0.16 * u);
          ctx.fill();
          x += w;
        });
      });
      ctx.fillStyle = shadeCss(BRASS, 1.0);
      ctx.beginPath();
      ctx.arc(bx + (BOARD.pad + 15.1) * u, by + (BOARD.pad + 0.46) * u, 0.42 * u, 0, Math.PI * 2);
      ctx.fill();
    };

    return {
      kind: 'canvas2d',
      metrics,
      render: () => {},
      resize: (w, h) => {
        DPR = Math.min(devicePixelRatio || 1, 2);
        W = w; H = h;
        canvas.width = w * DPR; canvas.height = h * DPR;
        draw();
      },
      setColor: c => { cw = c; if (W) draw(); },
    };
  }

  /* ============================================================
     舞台初始化与主循环
     ============================================================ */
  const stage = createStage3D(els.canvas) || createStage2D(els.canvas);

  let tops = [];
  const measure = () => {
    tops = els.sections.map(s => s.getBoundingClientRect().top + window.scrollY);
    stage.resize(window.innerWidth, window.innerHeight);
    dirty = 3;
  };

  const cur = { x: 0, y: 0, rx: 0.8, ry: -0.3, rz: 0.06, scale: 0.5, dim: 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let dirty = 3;

  const poseTarget = () => {
    const poses = posesNow();
    const y = window.scrollY;
    let i = 0;
    while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    let a = poses[sectionIds[i]], b = a, t = 0;
    if (i < tops.length - 1) {
      b = poses[sectionIds[i + 1]];
      t = smooth(clamp((y - tops[i]) / Math.max(1, tops[i + 1] - tops[i]), 0, 1));
    }
    const m = stage.metrics;
    const mix = k => lerp(a[k], b[k], t);
    return {
      x: mix('xf') * m.visW,
      y: mix('yf') * m.visH,
      rx: mix('rx') + mouse.y * 0.05,
      ry: mix('ry') + mouse.x * 0.08,
      rz: mix('rz'),
      scale: Math.max(0.05, mix('k') * m.fitScale),
      dim: clamp(mix('dim'), 0, 1),
    };
  };

  let lastT = 0;
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = clamp((now - lastT) / 1000, 0.001, 0.05);
    lastT = now;
    const paused = state.motionPaused;

    if (stage.kind !== 'webgl') return;         // 2D 兜底为静态画面

    const target = poseTarget();
    if (paused) {
      if (dirty <= 0) return;
      Object.assign(cur, target);
      stage.render(cur, now / 1000, true);
      dirty--;
      return;
    }
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 5);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 5);
    const f = 1 - Math.exp(-5.2 * dt);
    for (const k of ['x', 'y', 'rx', 'ry', 'rz', 'scale', 'dim']) cur[k] += (target[k] - cur[k]) * f;
    stage.render(cur, now / 1000, false);
  };

  /* ============================================================
     区块激活 / 导航
     ============================================================ */
  let scrollLock = null; // { id, until }

  const setActiveSection = id => {
    if (state.activeSection === id) return;
    state.activeSection = id;
    els.navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === id));
  };

  const detectSection = () => {
    if (scrollLock) {
      if (performance.now() < scrollLock.until) { setActiveSection(scrollLock.id); return; }
      scrollLock = null;
    }
    const y = window.scrollY + window.innerHeight * 0.42;
    let id = sectionIds[0];
    for (let i = 0; i < tops.length; i++) if (y >= tops[i]) id = sectionIds[i];
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      id = sectionIds[sectionIds.length - 1];
    }
    setActiveSection(id);
  };

  /* ============================================================
     统一操作接口（真实交互与 __LAUNCH_TEST__ 共用）
     ============================================================ */
  const applyColor = cwOrName => {
    const cw = COLORWAYS.find(c => c.id === cwOrName || c.name === cwOrName);
    if (!cw) return false;
    state.activeColor = cw;
    els.html.dataset.color = cw.id;
    stage.setColor(cw);
    els.swatches.forEach(b => b.setAttribute('aria-checked', String(b.dataset.color === cw.id)));
    els.colorIndex.textContent = `0${COLORWAYS.indexOf(cw) + 1} / 05`;
    els.colorName.textContent = cw.name;
    els.colorPinyin.textContent = cw.pinyin;
    els.colorDesc.textContent = cw.desc;
    els.colorStage.classList.remove('switching');
    void els.colorStage.offsetWidth;
    els.colorStage.classList.add('switching');
    dirty = 3;
    return true;
  };

  const goToSection = id => {
    const el = els.sections.find(s => s.id === id);
    if (!el) return false;
    scrollLock = { id, until: performance.now() + 1600 };
    setActiveSection(id);
    el.scrollIntoView({ behavior: state.motionPaused ? 'auto' : 'smooth', block: 'start' });
    dirty = 3;
    return true;
  };

  const setMotionPaused = paused => {
    state.motionPaused = !!paused;
    els.html.dataset.motion = state.motionPaused ? 'paused' : 'on';
    els.motionToggle.setAttribute('aria-pressed', String(state.motionPaused));
    dirty = 3;
    return state.motionPaused;
  };

  window.__LAUNCH_TEST__ = {
    snapshot: () => ({
      sections: sectionIds.slice(),
      activeSection: state.activeSection,
      activeColor: state.activeColor.name,
      activeColorId: state.activeColor.id,
      motionPaused: state.motionPaused,
      reserved: state.reserved,
      renderer: stage.kind,
    }),
    goToSection,
    setColor: applyColor,
    setMotionPaused,
  };

  /* ============================================================
     事件接线
     ============================================================ */
  els.navLinks.forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    goToSection(a.dataset.nav);
  }));

  els.swatches.forEach(b => b.addEventListener('click', () => applyColor(b.dataset.color)));

  els.motionToggle.addEventListener('click', () => setMotionPaused(!state.motionPaused));

  els.cta.addEventListener('click', () => {
    state.reserved = !state.reserved;
    els.cta.setAttribute('aria-pressed', String(state.reserved));
  });

  const unlock = () => { scrollLock = null; };
  window.addEventListener('wheel', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });

  window.addEventListener('scroll', () => { dirty = 3; detectSection(); }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', () => { measure(); detectSection(); });
  mqNarrow.addEventListener ? mqNarrow.addEventListener('change', measure) : mqNarrow.addListener(measure);

  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', e => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* 入场显现 */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* 倒计时（首发 2026-08-08） */
  const updateCountdown = () => {
    const days = Math.ceil((new Date(2026, 7, 8) - Date.now()) / 864e5);
    els.countdown.textContent = days > 0 ? `距首发 ${days} 天` : '现已首发';
  };
  updateCountdown();
  setInterval(updateCountdown, 6e4);

  /* prefers-reduced-motion 降级 */
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (mqReduce.matches) setMotionPaused(true);
  const onReduceChange = e => setMotionPaused(e.matches);
  mqReduce.addEventListener ? mqReduce.addEventListener('change', onReduceChange) : mqReduce.addListener(onReduceChange);

  /* 启动 */
  applyColor('mushanzi');
  els.colorStage.classList.remove('switching');   // 首次不播切换动画
  measure();
  detectSection();
  requestAnimationFrame(t => { lastT = t; requestAnimationFrame(tick); });
})();

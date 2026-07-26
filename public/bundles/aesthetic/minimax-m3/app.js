/* =========================================================
 * 声律 75 · SOUNDRHYTHM — 启动页交互
 * 程序化构建 Three.js 键盘 3D 视觉、五色联动、滚动视差
 * 全部本地资源，零联网
 * ========================================================= */
(function () {
  'use strict';

  // ---------- 状态 ----------
  const state = {
    activeSection: 'hero',
    activeColor: 'xuanmo',
    motionPaused: false,
    sections: ['hero', 'features', 'colors', 'buy'],
  };

  const COLORS = {
    xuanmo: {
      label: '玄墨',
      pinyin: 'XUANMO',
      hex: '#1A1A1F',
      hex2: '#2A2A30',
      desc: '极夜黑铝，深邃冷静，是夜深人静时的默认色。',
      case: '#1A1A1F',
      caseDark: '#0E0E12',
      accent: '#3A3A44',
      keycap: '#22222A',
      keycapDark: '#15151A',
      legend: '#E8E4D8',
      keytop: '#3A3A40',
    },
    mushan: {
      label: '暮山紫',
      pinyin: 'MUSHAN',
      hex: '#6B5F7A',
      hex2: '#4A4054',
      desc: '远山暮色，紫中带灰，沉稳而不张扬。',
      case: '#6B5F7A',
      caseDark: '#3D3548',
      accent: '#8E7E9D',
      keycap: '#3F3848',
      keycapDark: '#2A2530',
      legend: '#EDE6D4',
      keytop: '#574D63',
    },
    yuebai: {
      label: '月白',
      pinyin: 'YUEBAI',
      hex: '#ECE6DA',
      hex2: '#C7B8A5',
      desc: '温润月白，明亮素雅，是光与铝合金的对话。',
      case: '#ECE6DA',
      caseDark: '#B8AB95',
      accent: '#A89882',
      keycap: '#F2EDE2',
      keycapDark: '#C7B8A5',
      legend: '#2A2A30',
      keytop: '#FFFCF4',
    },
    daiqing: {
      label: '黛青',
      pinyin: 'DAIQING',
      hex: '#3C5862',
      hex2: '#1F3537',
      desc: '远山黛色，沉静如松林晨雾。',
      case: '#3C5862',
      caseDark: '#1F3537',
      accent: '#5A7A85',
      keycap: '#2A3D44',
      keycapDark: '#172527',
      legend: '#E8E4D8',
      keytop: '#4B6A73',
    },
    yanzhi: {
      label: '胭脂',
      pinyin: 'YANZHI',
      hex: '#B5565C',
      hex2: '#5A1F26',
      desc: '一抹胭脂红，沉醉于黄昏与桌面。',
      case: '#B5565C',
      caseDark: '#5A1F26',
      accent: '#D67883',
      keycap: '#4D2A2E',
      keycapDark: '#2E181B',
      legend: '#F2EBDD',
      keytop: '#C76A72',
    },
  };

  const reducedMotion = (typeof window !== 'undefined') &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 工具 ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function rgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------- Three.js 键盘生成器 ----------
  // 75% 配列：81 键；这里用 16 列布局简化模型，但视觉上呈现 75% 比例
  // 列结构：功能区(无)/ 编辑区(无)/ 主键区(15) + 右侧功能列
  function buildKeyboard(scene, opts) {
    const group = new THREE.Group();
    const color = opts.color;
    const cs = color ? COLORS[color] : COLORS.xuanmo;

    // 机身（外壳）—— 长方体 + 斜切边
    const caseW = 10.6, caseD = 4.4, caseH = 0.62;
    const caseGeo = new THREE.BoxGeometry(caseW, caseH, caseD, 1, 1, 1);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cs.case),
      metalness: 0.92,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.4,
    });
    const caseMesh = new THREE.Mesh(caseGeo, caseMat);
    caseMesh.position.y = 0;
    caseMesh.userData.role = 'case';
    group.add(caseMesh);

    // 底部"倒角"——暗色斜面
    const baseGeo = new THREE.BoxGeometry(caseW + 0.06, 0.16, caseD + 0.06);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cs.caseDark),
      metalness: 0.85,
      roughness: 0.6,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -caseH / 2 - 0.06;
    base.userData.role = 'base';
    group.add(base);

    // 顶部高光条
    const trimGeo = new THREE.BoxGeometry(caseW + 0.02, 0.04, 0.04);
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cs.accent),
      metalness: 1.0,
      roughness: 0.25,
      emissive: new THREE.Color(cs.accent),
      emissiveIntensity: 0.18,
    });
    const trimFront = new THREE.Mesh(trimGeo, trimMat);
    trimFront.position.set(0, caseH / 2 + 0.01, caseD / 2 - 0.02);
    trimFront.userData.role = 'trim';
    group.add(trimFront);
    const trimBack = new THREE.Mesh(trimGeo, trimMat);
    trimBack.position.set(0, caseH / 2 + 0.01, -caseD / 2 + 0.02);
    trimBack.userData.role = 'trim';
    group.add(trimBack);

    // 75% 配列的键位排布（视觉近似）
    // 行: 5 行；列: 每行不同；定义键位（简化建模）
    // 行偏移、键位尺寸
    const rows = [
      // [数量, 起始x偏移, 键尺寸倍数]
      { keys: 14, yScale: 1.0, keyW: 0.62 }, // F 数字行 + 右侧
      { keys: 14, yScale: 1.0, keyW: 0.62 }, // QWERTY 行
      { keys: 13, yScale: 1.0, keyW: 0.62 }, // ASDF
      { keys: 12, yScale: 1.0, keyW: 0.62 }, // ZXCV
      { keys: 10, yScale: 1.0, keyW: 0.62 }, // 空格行 + 右侧
    ];

    const keyUnit = 0.62;
    const keyGap = 0.04;
    const rowGap = 0.04;
    const startX = -caseW / 2 + 0.3;

    // 简化为可视化阵列：每行 13-15 颗，比例对应 75%
    const rowCounts = [15, 15, 14, 13, 11];
    const rowKeys = [];
    for (let r = 0; r < rowCounts.length; r++) {
      const count = rowCounts[r];
      const rowY = caseH / 2 - 0.02 + 0.18;
      const z = -caseD / 2 + 0.5 + r * (keyUnit + rowGap);
      for (let i = 0; i < count; i++) {
        // 制造 75% 配列的"右侧功能列"：最后一行右侧加 1 个上键 + 4 个方向键
        let w = keyUnit, d = keyUnit;
        if (r === 0 && i >= 13) w = keyUnit * 1.1;
        if (r === 4 && i === 4) { w = keyUnit * 6.25; } // 空格
        const x = startX + i * (keyUnit + keyGap) + w / 2 - (count * (keyUnit + keyGap)) / 2;

        // 键帽几何
        const geo = new THREE.BoxGeometry(w - 0.02, 0.22, d - 0.02);
        const isAccent = (r === 4 && i >= 5) || (r === 0 && i === 0); // ESC 与方向键略不同
        const keyColor = isAccent ? cs.keytop : cs.keycap;
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(keyColor),
          metalness: 0.05,
          roughness: 0.55,
          clearcoat: 0.2,
        });
        const key = new THREE.Mesh(geo, mat);
        key.position.set(x, rowY, z);
        key.userData.role = 'key';
        group.add(key);

        // 顶部略微内凹（cylinder 模拟凹面）
        const topGeo = new THREE.BoxGeometry(w - 0.06, 0.04, d - 0.06);
        const topMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(isAccent ? cs.keycap : cs.keytop),
          metalness: 0.1,
          roughness: 0.7,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.set(x, rowY + 0.12, z);
        top.userData.role = 'keytop';
        group.add(top);

        rowKeys.push(key);
      }
    }

    // 侧面散热栅格（程序化）
    for (let i = 0; i < 6; i++) {
      const slitGeo = new THREE.BoxGeometry(0.5, 0.02, 0.04);
      const slitMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cs.caseDark),
        metalness: 0.5,
        roughness: 0.7,
      });
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.set(-caseW / 2 + 1 + i * 0.9, -caseH / 2 + 0.06, caseD / 2 - 0.01);
      slit.userData.role = 'slit';
      group.add(slit);
    }

    // Type-C 接口
    const portGeo = new THREE.BoxGeometry(0.5, 0.18, 0.22);
    const portMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0A0A0C'),
      metalness: 0.8,
      roughness: 0.5,
    });
    const port = new THREE.Mesh(portGeo, portMat);
    port.position.set(caseW / 2 - 1.5, -caseH / 2 + 0.02, caseD / 2 - 0.13);
    group.add(port);

    // 铭牌（声律 SOUNDRHYTHM 凹凸字符的几何代替）
    const badgeGeo = new THREE.BoxGeometry(1.2, 0.04, 0.32);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cs.accent),
      metalness: 1.0,
      roughness: 0.2,
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(caseW / 2 - 1.0, -caseH / 2 + 0.02, -caseD / 2 + 0.24);
    badge.userData.role = 'badge';
    group.add(badge);

    group.userData = {
      caseMat, baseMat, trimMat, keyMeshes: rowKeys, keyMats: [],
    };
    // 收集所有键帽材质用于变色
    group.traverse(obj => {
      if (obj.isMesh && obj.material && obj !== caseMesh && obj !== base &&
          obj !== trimFront && obj !== trimBack && obj !== port && obj !== badge) {
        group.userData.keyMats.push(obj.material);
      }
    });

    scene.add(group);
    return group;
  }

  // ---------- 通用 Three.js 场景工厂 ----------
  function makeScene(canvas, opts) {
    if (!canvas || !window.THREE) return null;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9.2);
    camera.lookAt(0, 0, 0);

    // 光照
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd4a8, 0.7);
    fill.position.set(-6, 4, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.4);
    rim.position.set(0, 2, -6);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // 地面反射"假阴影"圆盘
    const groundGeo = new THREE.CircleGeometry(7, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x000000),
      transparent: true,
      opacity: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    scene.add(ground);

    // 装饰粒子（小型散点）
    const particleCount = 60;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 14;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(0xE8743C),
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const keyboard = buildKeyboard(scene, opts);

    return {
      renderer, scene, camera, keyboard, particles, ground,
      opts,
      target: { rotX: 0, rotY: 0, scroll: 0 },
      current: { rotX: 0, rotY: 0, scroll: 0 },
      time: 0,
      hovered: false,
    };
  }

  function applyColor(scene, colorKey) {
    if (!scene || !scene.keyboard || !scene.keyboard.userData) return;
    const cs = COLORS[colorKey];
    if (!cs) return;
    const ud = scene.keyboard.userData;
    if (ud.caseMat) ud.caseMat.color.set(cs.case);
    if (ud.baseMat) ud.baseMat.color.set(cs.caseDark);
    if (ud.trimMat) {
      ud.trimMat.color.set(cs.accent);
      ud.trimMat.emissive.set(cs.accent);
    }
    // 直接遍历所有键帽与装饰几何并按 userData.role 分发颜色
    let keycapIndex = 0;
    scene.keyboard.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      const role = obj.userData && obj.userData.role;
      if (role === 'case') {
        obj.material.color.set(cs.case);
      } else if (role === 'base') {
        obj.material.color.set(cs.caseDark);
      } else if (role === 'trim' || role === 'badge') {
        obj.material.color.set(cs.accent);
        if (obj.material.emissive) obj.material.emissive.set(cs.accent);
      } else if (role === 'key') {
        // 键帽主体
        obj.material.color.set(cs.keycap);
      } else if (role === 'keytop') {
        // 键帽顶面
        obj.material.color.set(cs.keytop);
      } else if (role === 'slit') {
        obj.material.color.set(cs.caseDark);
      }
    });
  }

  function resizeScene(s) {
    if (!s) return;
    const canvas = s.renderer.domElement;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (w === 0 || h === 0) return;
    s.renderer.setSize(w, h, false);
    s.camera.aspect = w / h;
    s.camera.updateProjectionMatrix();
  }

  function animate(s) {
    if (!s) return;
    s.time += 0.016;
    // 平滑插值
    s.current.rotX = lerp(s.current.rotX, s.target.rotX, 0.08);
    s.current.rotY = lerp(s.current.rotY, s.target.rotY, 0.08);
    s.current.scroll = lerp(s.current.scroll, s.target.scroll, 0.06);

    if (s.keyboard) {
      s.keyboard.rotation.x = s.current.rotX + 0.18;
      s.keyboard.rotation.y = s.current.rotY + Math.sin(s.time * 0.3) * 0.04;
      s.keyboard.position.y = Math.sin(s.time * 0.6) * 0.05 + s.current.scroll * 0.2;
      // 整体微微呼吸
      const breathe = 1 + Math.sin(s.time * 0.8) * 0.005;
      s.keyboard.scale.setScalar(breathe);
    }
    if (s.particles) {
      s.particles.rotation.y = s.time * 0.03;
      s.particles.position.y = Math.sin(s.time * 0.5) * 0.1;
    }
    if (!state.motionPaused && !reducedMotion) {
      s.renderer.render(s.scene, s.camera);
    } else if (reducedMotion) {
      s.renderer.render(s.scene, s.camera);
    }
  }

  // ---------- 启动 ----------
  let heroScene, colorsScene, buyScene;
  let rafId = null;
  let pointerX = 0.5, pointerY = 0.5;

  function init() {
    // hero
    const heroCanvas = document.getElementById('heroCanvas');
    heroScene = makeScene(heroCanvas, { color: 'xuanmo' });
    // colors
    const colorCanvas = document.getElementById('colorCanvas');
    colorsScene = makeScene(colorCanvas, { color: state.activeColor });
    applyColor(colorsScene, state.activeColor);
    // buy (装饰场景)
    const buyCanvas = document.getElementById('buyCanvas');
    buyScene = makeScene(buyCanvas, { color: state.activeColor });

    // 视口尺寸
    function handleResize() {
      resizeScene(heroScene);
      resizeScene(colorsScene);
      resizeScene(buyScene);
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // 指针交互：影响 hero 与 colors 场景的角度
    function onPointerMove(e) {
      const x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) / window.innerWidth;
      const y = (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0) / window.innerHeight;
      pointerX = x; pointerY = y;
      [heroScene, colorsScene].forEach(s => {
        if (!s) return;
        s.target.rotY = (x - 0.5) * 0.6;
        s.target.rotX = (0.5 - y) * 0.35;
      });
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 主循环
    function loop() {
      animate(heroScene);
      animate(colorsScene);
      animate(buyScene);
      rafId = requestAnimationFrame(loop);
    }
    if (!reducedMotion) loop();

    // 入场滚动视差
    initReveal();
    initScrollSpy();
    initNav();
    initColorPicker();
    initBuy();

    // 滚动驱动 hero 键盘视差
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function onScroll() {
    if (!heroScene) return;
    const y = window.scrollY || window.pageYOffset || 0;
    heroScene.target.scroll = clamp(y / window.innerHeight, 0, 1);
    // features 区段 parallax
    const features = document.getElementById('features');
    if (features) {
      const rect = features.getBoundingClientRect();
      const t = clamp(1 - rect.top / window.innerHeight, 0, 1);
      document.documentElement.style.setProperty('--features-progress', t.toFixed(3));
    }
  }

  // ---------- 入场 reveal ----------
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    items.forEach(el => io.observe(el));
  }

  // ---------- 滚动激活 ----------
  function initScrollSpy() {
    const sectionEls = state.sections.map(id => document.getElementById(id)).filter(Boolean);
    function update() {
      const winMid = window.innerHeight * 0.4;
      let active = sectionEls[0] ? sectionEls[0].id : 'hero';
      for (const s of sectionEls) {
        const r = s.getBoundingClientRect();
        if (r.top <= winMid && r.bottom >= winMid) {
          active = s.id;
        }
      }
      if (active !== state.activeSection) {
        state.activeSection = active;
        updateNavActive();
      }
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function updateNavActive() {
    $$('.nav__links a').forEach(a => {
      const id = a.getAttribute('data-nav-id') || (a.getAttribute('href') || '').replace('#', '');
      a.classList.toggle('is-active', id === state.activeSection);
    });
  }

  // ---------- 导航 ----------
  function initNav() {
    $$('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        const href = el.getAttribute('href') || '';
        const id = el.getAttribute('data-nav-id') || href.replace('#', '');
        if (!id) return;
        e.preventDefault();
        goToSection(id);
      });
    });
  }

  function goToSection(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    const reduce = reducedMotion || state.motionPaused;
    target.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
    state.activeSection = id;
    updateNavActive();
    return true;
  }

  // ---------- 配色切换 ----------
  function initColorPicker() {
    $$('.swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-color');
        if (!name) return;
        setColor(name);
      });
    });
  }

  function setColor(name) {
    if (!name) return false;
    if (!COLORS[name]) {
      const found = Object.keys(COLORS).find(k => COLORS[k].label === name);
      if (found) name = found;
    }
    if (!COLORS[name]) return false;
    const cs = COLORS[name];
    try {
      state.activeColor = name;
      const swatches = document.querySelectorAll('.swatch');
      let activeCount = 0;
      for (let i = 0; i < swatches.length; i++) {
        const b = swatches[i];
        const isOn = b.getAttribute('data-color') === name;
        b.classList.toggle('is-active', isOn);
        if (isOn) {
          b.dataset.selected = 'true';
          activeCount++;
        } else {
          delete b.dataset.selected;
        }
        b.setAttribute('aria-checked', isOn ? 'true' : 'false');
      }
      const nameEl = document.getElementById('colorName');
      const pinEl = document.getElementById('colorPinyin');
      const descEl = document.getElementById('colorDesc');
      if (nameEl) nameEl.textContent = cs.label;
      if (pinEl) pinEl.textContent = cs.pinyin + ' · ' + cs.hex;
      if (descEl) descEl.textContent = cs.desc;
      const root = document.documentElement;
      root.dataset.activeColor = name;
      root.setAttribute('data-active-color', name);
      root.style.setProperty('--current-color', cs.hex);
      // 更新 colors 区块 CSS 渐变作为 2D 备用可视化
      const stage = document.querySelector('.colors__stage');
      if (stage) {
        stage.style.background =
          'radial-gradient(80% 60% at 50% 40%, ' + cs.case + '33, transparent 70%),' +
          'linear-gradient(180deg, ' + cs.caseDark + ', var(--bg))';
      }
      // 3D 联动
      try {
        applyColor(heroScene, name);
        if (heroScene) heroScene.renderer.render(heroScene.scene, heroScene.camera);
      } catch (e) {}
      try {
        applyColor(colorsScene, name);
        if (colorsScene) colorsScene.renderer.render(colorsScene.scene, colorsScene.camera);
      } catch (e) {}
      try {
        applyColor(buyScene, name);
        if (buyScene) buyScene.renderer.render(buyScene.scene, buyScene.camera);
      } catch (e) {}
      root.style.setProperty('--accent', cs.accent);
      return activeCount > 0;
    } catch (e) {
      return false;
    }
  }

  // ---------- 购买 ----------
  function initBuy() {
    const btn = document.getElementById('reserveBtn');
    const notes = document.getElementById('buyNotes');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      const label = btn.querySelector('.btn__label');
      if (label) label.textContent = pressed ? '加入待购' : '✓ 已加入待购';
      if (notes) notes.textContent = pressed
        ? '预定后将于 2026.08.08 起按订单顺序发货。'
        : '已加入待购 · 共 1 件 · 我们将在 2026.08.08 前提醒你完成订单。';
      showToast(pressed ? '已取消待购' : '已加入待购 · ' + COLORS[state.activeColor].label);
    });
    const specBtn = document.querySelector('[data-action="spec"]');
    if (specBtn) specBtn.addEventListener('click', () => goToSection('features'));
  }

  let toastTimer = null;
  function showToast(text) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('is-show');
      setTimeout(() => { t.hidden = true; }, 360);
    }, 2200);
  }

  // ---------- motion pause ----------
  function setMotionPaused(paused) {
    state.motionPaused = !!paused;
    document.documentElement.classList.toggle('is-motion-paused', state.motionPaused);
    return true;
  }

  // ---------- 测试接口 ----------
  function snapshot() {
    const activeSwatch = document.querySelector('.swatch.is-active');
    return {
      sections: state.sections.slice(),
      activeSection: state.activeSection,
      activeColor: state.activeColor,
      motionPaused: state.motionPaused,
      reducedMotion,
      activeSwatchName: activeSwatch ? activeSwatch.getAttribute('data-color') : null,
      time: Date.now(),
    };
  }

  // 暴露 setColor 时，确保 this 上下文不丢失
  window.__LAUNCH_TEST__ = {
    snapshot,
    goToSection: function (id) { return goToSection(id); },
    setColor: function (name) { return setColor(name); },
    setMotionPaused: function (paused) { return setMotionPaused(paused); },
  };

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

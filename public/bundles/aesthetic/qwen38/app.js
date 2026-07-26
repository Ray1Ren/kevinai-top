/* ============================================================
   声律 75 · SOUNDRHYTHM — 发布页脚本
   状态中枢：真实交互与 window.__LAUNCH_TEST__ 共用同一套 state/actions
   3D：vendor/three.min.js (r147) 程序化建模 75% 键盘
   ============================================================ */
(() => {
'use strict';

/* ---------- 基础数据 ---------- */

const SECTIONS = ['hero', 'features', 'colors', 'buy'];

const COLORWAYS = [
  { name: '暮山紫', code: 'SR-75 / 01', char: '紫', poem: '暮色入山，紫霭沉沉。',
    ui: '#a08cf0', uiStrong: '#bca9f7', cs: '#3a3352', capMain: '#322b49', capLight: '#443a63', capAccent: '#a88cf5', glow: '#8f74ec' },
  { name: '月白', code: 'SR-75 / 02', char: '月', poem: '月下素白，清辉满案。',
    ui: '#9ec2d6', uiStrong: '#c3dce9', cs: '#c9d2d8', capMain: '#e7ecee', capLight: '#f5f7f7', capAccent: '#6f9cb8', glow: '#9ec2d6' },
  { name: '黛青', code: 'SR-75 / 03', char: '黛', poem: '远山如黛，青霭入弦。',
    ui: '#6fc2b0', uiStrong: '#93d8c8', cs: '#243840', capMain: '#2b4049', capLight: '#3a525b', capAccent: '#5fb3a1', glow: '#57b8a4' },
  { name: '胭脂', code: 'SR-75 / 04', char: '胭', poem: '胭脂点漆，朱弦暗响。',
    ui: '#e06a80', uiStrong: '#f08da0', cs: '#4b2431', capMain: '#43202c', capLight: '#5a2f3d', capAccent: '#d8536c', glow: '#d8536c' },
  { name: '玄墨', code: 'SR-75 / 05', char: '墨', poem: '玄墨髹漆，金声玉振。',
    ui: '#cfa96a', uiStrong: '#e2c48f', cs: '#191a1f', capMain: '#212329', capLight: '#2e3138', capAccent: '#c9a15e', glow: '#c9a15e' },
];

/* 75% 配列：每行 [刻字, 宽度(u), e.code]，总宽 15u */
const LAYOUT = [
  [['Esc',1,'Escape'],['F1',1,'F1'],['F2',1,'F2'],['F3',1,'F3'],['F4',1,'F4'],['F5',1,'F5'],['F6',1,'F6'],['F7',1,'F7'],['F8',1,'F8'],['F9',1,'F9'],['F10',1,'F10'],['F11',1,'F11'],['F12',1,'F12'],['Del',1,'Delete']],
  [['`',1,'Backquote'],['1',1,'Digit1'],['2',1,'Digit2'],['3',1,'Digit3'],['4',1,'Digit4'],['5',1,'Digit5'],['6',1,'Digit6'],['7',1,'Digit7'],['8',1,'Digit8'],['9',1,'Digit9'],['0',1,'Digit0'],['-',1,'Minus'],['=',1,'Equal'],['⌫',2,'Backspace']],
  [['Tab',1.5,'Tab'],['Q',1,'KeyQ'],['W',1,'KeyW'],['E',1,'KeyE'],['R',1,'KeyR'],['T',1,'KeyT'],['Y',1,'KeyY'],['U',1,'KeyU'],['I',1,'KeyI'],['O',1,'KeyO'],['P',1,'KeyP'],['[',1,'BracketLeft'],[']',1,'BracketRight'],['\\',1.5,'Backslash']],
  [['Caps',1.75,'CapsLock'],['A',1,'KeyA'],['S',1,'KeyS'],['D',1,'KeyD'],['F',1,'KeyF'],['G',1,'KeyG'],['H',1,'KeyH'],['J',1,'KeyJ'],['K',1,'KeyK'],['L',1,'KeyL'],[';',1,'Semicolon'],["'",1,'Quote'],['Enter',2.25,'Enter']],
  [['Shift',2.25,'ShiftLeft'],['Z',1,'KeyZ'],['X',1,'KeyX'],['C',1,'KeyC'],['V',1,'KeyV'],['B',1,'KeyB'],['N',1,'KeyN'],['M',1,'KeyM'],[',',1,'Comma'],['.',1,'Period'],['/',1,'Slash'],['Shift',1.75,'ShiftRight'],['↑',1,'ArrowUp']],
  [['Ctrl',1.25,'ControlLeft'],['Win',1.25,'MetaLeft'],['Alt',1.25,'AltLeft'],['Space',6.25,'Space'],['Alt',1,'AltRight'],['Fn',1,null],['←',1,'ArrowLeft'],['↓',1,'ArrowDown'],['→',1,'ArrowRight']],
];
const ACCENT_KEYS = new Set(['Esc', 'Enter']);
const LIGHT_KEYS = new Set(['Space', '↑', '↓', '←', '→', 'Tab', 'Caps', 'Shift', 'Ctrl', 'Win', 'Alt', 'Fn', '⌫', 'Del']);

/* ---------- 小工具 ---------- */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = f => f * f * (3 - 2 * f);
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const c = hexToRgb(hex);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
function yiqContrast(hex) {
  const c = hexToRgb(hex);
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 158 ? '#101116' : '#f4f0e6';
}

/* ---------- 状态中枢 ---------- */

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  activeSection: 'hero',
  activeColor: COLORWAYS[0].name,
  motionPaused: prefersReduced,
  reducedMotion: prefersReduced,
  renderer: 'none',
  scrollT: 0,
  fps: 0,
};

const canAnimate = () => !state.motionPaused;

/* ---------- DOM 引用 ---------- */

const root = document.documentElement;
const els = {
  progress: $('#progressBar'),
  motionToggle: $('#motionToggle'),
  swatches: $('#swatches'),
  crCode: $('#crCode'), crName: $('#crName'), crPoem: $('#crPoem'),
  readout: $('.color-readout'),
  wmA: $('#wmA'), wmB: $('#wmB'),
  toast: $('#toast'),
  reserveBtn: $('#reserveBtn'),
  cd: { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') },
  countLabel: $('#countLabel'),
  fallback: $('#fallbackBoard'),
  stage: $('#stage'),
};
const secEls = SECTIONS.map(id => document.getElementById(id));

/* ---------- 动作（真实交互与测试接口共用） ---------- */

const actions = {
  setColor(name) {
    const cw = COLORWAYS.find(c => c.name === name);
    if (!cw) return false;
    if (state.activeColor === cw.name) return true;
    state.activeColor = cw.name;
    applyColor(cw);
    return true;
  },
  goToSection(id) {
    if (SECTIONS.indexOf(id) < 0) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: canAnimate() ? 'smooth' : 'auto', block: 'start' });
    actions.setActiveSection(id); // 导航即权威更新，不依赖 scroll 事件时机
    return true;
  },
  setMotionPaused(paused) {
    state.motionPaused = !!paused;
    root.dataset.motion = state.motionPaused ? 'paused' : 'running';
    syncMotionUI();
    return true;
  },
  setActiveSection(id) {
    if (state.activeSection === id) return;
    state.activeSection = id;
    syncSectionUI();
  },
};

function syncMotionUI() {
  const btn = els.motionToggle;
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(state.motionPaused));
  const txt = btn.querySelector('.mb-txt');
  if (txt) txt.textContent = state.motionPaused ? '动效 · 关' : '动效 · 开';
}

function syncSectionUI() {
  $$('[data-nav]').forEach(a => {
    const on = a.dataset.nav === state.activeSection;
    a.classList.toggle('active', on);
    if (a.tagName === 'BUTTON') a.setAttribute('aria-current', on ? 'true' : 'false');
  });
}

/* ---------- 配色应用：CSS 变量 + 3D 目标色 + 文案联动 ---------- */

let three = null; // 3D 模块句柄
let wmFlip = false;

function applyColor(cw) {
  const rs = root.style;
  rs.setProperty('--accent', cw.ui);
  rs.setProperty('--accent-strong', cw.uiStrong);
  rs.setProperty('--accent-contrast', yiqContrast(cw.ui));
  rs.setProperty('--glow', rgba(cw.ui, 0.55));
  rs.setProperty('--kb-case', cw.cs);

  $$('.swatch').forEach(b => {
    const on = b.dataset.color === cw.name;
    b.setAttribute('aria-pressed', String(on));
  });

  if (els.crName) {
    els.crCode.textContent = cw.code;
    els.crName.textContent = cw.name;
    els.crPoem.textContent = cw.poem;
    els.readout.classList.remove('swap');
    void els.readout.offsetWidth; // 重启入场动画
    els.readout.classList.add('swap');
  }

  if (els.wmA) {
    const show = wmFlip ? els.wmA : els.wmB;
    const hide = wmFlip ? els.wmB : els.wmA;
    wmFlip = !wmFlip;
    show.textContent = cw.char;
    show.classList.add('on');
    hide.classList.remove('on');
  }

  if (three) three.setTargets(cw);
}

/* ---------- 配色选择器（程序化生成） ---------- */

function buildSwatches() {
  if (!els.swatches) return;
  COLORWAYS.forEach(cw => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.color = cw.name;
    b.setAttribute('aria-pressed', String(cw.name === state.activeColor));
    b.innerHTML =
      '<span class="sw-dots" aria-hidden="true">' +
        '<i style="background:' + cw.cs + '"></i>' +
        '<i style="background:' + cw.capMain + '"></i>' +
        '<i style="background:' + cw.capAccent + '"></i>' +
      '</span>' +
      '<span class="sw-name">' + cw.name + '</span>' +
      '<span class="sw-code">' + cw.code + '</span>';
    b.addEventListener('click', () => actions.setColor(cw.name));
    els.swatches.appendChild(b);
  });
}

/* ---------- 滚动：进度、分区、机位参数 ---------- */

let scrollTicking = false;

function computeScrollT() {
  const tops = secEls.map(el => el.getBoundingClientRect().top);
  if (tops[0] > 0) return 0;
  for (let i = 0; i < tops.length - 1; i++) {
    if (tops[i] <= 0 && tops[i + 1] > 0) {
      return i + (0 - tops[i]) / (tops[i + 1] - tops[i]);
    }
  }
  const last = tops.length - 1;
  const h = secEls[last].offsetHeight - innerHeight;
  return last + (h > 0 ? clamp01(-tops[last] / h) : 0);
}

function computeActive() {
  const mid = innerHeight * 0.45;
  let cur = SECTIONS[0];
  for (const el of secEls) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) { cur = el.id; break; }
  }
  if (innerHeight + scrollY >= document.body.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1];
  actions.setActiveSection(cur);
}

function onScrollFrame() {
  scrollTicking = false;
  state.scrollT = computeScrollT();
  computeActive();
  if (els.progress) {
    const max = document.body.scrollHeight - innerHeight;
    els.progress.style.transform = 'scaleX(' + (max > 0 ? clamp01(scrollY / max) : 0) + ')';
  }
}
function requestScrollFrame() {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
  }
}

/* ---------- 揭示动画 ---------- */

function initReveals() {
  const targets = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(el => io.observe(el));
}

/* ---------- 倒计时 ---------- */

const LAUNCH_AT = new Date('2026-08-08T00:00:00+08:00').getTime();

function tickCountdown() {
  if (!els.cd.d) return;
  const diff = LAUNCH_AT - Date.now();
  if (diff <= 0) {
    els.cd.d.textContent = els.cd.h.textContent = els.cd.m.textContent = els.cd.s.textContent = '00';
    if (els.countLabel) els.countLabel.textContent = '已正式发布';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const pad = n => String(n).padStart(2, '0');
  els.cd.d.textContent = pad(d);
  els.cd.h.textContent = pad(h);
  els.cd.m.textContent = pad(m);
  els.cd.s.textContent = pad(s);
}

/* ---------- Toast / 预约按钮 ---------- */

let toastTimer = 0;
function toast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2800);
}

function initReserve() {
  if (!els.reserveBtn) return;
  els.reserveBtn.addEventListener('click', () => {
    if (els.reserveBtn.classList.contains('done')) {
      toast('已登记 · 2026.08.08 发布当日提醒你');
      return;
    }
    els.reserveBtn.classList.add('done');
    const txt = els.reserveBtn.querySelector('.rb-txt');
    if (txt) txt.textContent = '已登记预约';
    toast('预约成功 · 2026.08.08 发布当日第一时间提醒你');
  });
}

/* ---------- 全局事件绑定（真实交互入口） ---------- */

function initEvents() {
  addEventListener('scroll', requestScrollFrame, { passive: true });
  addEventListener('resize', () => {
    requestScrollFrame();
    if (three) three.resize();
  });

  $$('[data-nav]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      actions.goToSection(a.dataset.nav);
    });
  });

  if (els.motionToggle) {
    els.motionToggle.addEventListener('click', () => {
      actions.setMotionPaused(!state.motionPaused);
    });
  }

  /* 物理键盘敲击 → 3D 键帽回应（声律的“律”） */
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (three) three.pressCode(e.code);
  });
}

/* ============================================================
   3D 模块：three.js r147 程序化键盘
   ============================================================ */

function initThree() {
  if (!window.THREE) throw new Error('three.min.js 未加载');
  const T = THREE;

  const renderer = new T.WebGLRenderer({ canvas: els.stage, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.set(9.8, 6.2, 12.6);

  /* --- 程序化影棚环境（PMREM）：金属反射来自这里 --- */
  const envScene = new T.Scene();
  envScene.background = new T.Color(0.015, 0.016, 0.02);
  const lightPlane = (w, h, color, pos, rot) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    envScene.add(m);
  };
  lightPlane(10, 5, new T.Color(9, 9, 9.6), [0, 7, 0], [-Math.PI / 2, 0, 0]);   // 顶部柔光箱
  lightPlane(7, 3, new T.Color(2.1, 2.5, 3.4), [-7, 2, 0], [0, Math.PI / 2, 0]); // 左冷侧光
  lightPlane(7, 3, new T.Color(3.4, 2.8, 2.1), [7, 2, 0], [0, -Math.PI / 2, 0]); // 右暖侧光
  lightPlane(12, 3, new T.Color(2.4, 2.4, 3.0), [0, 2, -7], [0, 0, 0]);          // 背部轮廓光
  lightPlane(12, 3, new T.Color(0.55, 0.55, 0.65), [0, 1, 7], [0, Math.PI, 0]);  // 正面补光
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();

  /* --- 材质 --- */
  const mats = {
    cs: new T.MeshPhysicalMaterial({ color: 0x3a3352, metalness: 0.92, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    plate: new T.MeshStandardMaterial({ color: 0x0f1015, metalness: 0.6, roughness: 0.55 }),
    capMain: new T.MeshPhysicalMaterial({ color: 0x322b49, metalness: 0.06, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35 }),
    capLight: new T.MeshPhysicalMaterial({ color: 0x443a63, metalness: 0.06, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35 }),
    capAccent: new T.MeshPhysicalMaterial({ color: 0xa88cf5, metalness: 0.1, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    knob: new T.MeshStandardMaterial({ color: 0x2a2640, metalness: 0.9, roughness: 0.35, flatShading: true }),
    glow: new T.MeshStandardMaterial({ color: 0x050505, emissive: 0x8f74ec, emissiveIntensity: 1.35, roughness: 0.4 }),
  };

  const roundedRect = (w, h, r) => {
    const s = new T.Shape();
    const x = -w / 2, y = -h / 2;
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
  };
  const extrude = (shape, opt) => new T.ExtrudeGeometry(shape, opt);

  const board = new T.Group();
  scene.add(board);

  /* 机身 + 定位板 */
  const caseGeo = extrude(roundedRect(15.9, 6.9, 0.55), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 10 });
  caseGeo.rotateX(-Math.PI / 2);
  const caseMesh = new T.Mesh(caseGeo, mats.cs);
  caseMesh.position.y = 0.05;
  caseMesh.castShadow = caseMesh.receiveShadow = true;
  board.add(caseMesh);

  const plateGeo = extrude(roundedRect(15.4, 6.4, 0.3), { depth: 0.14, bevelEnabled: false, curveSegments: 8 });
  plateGeo.rotateX(-Math.PI / 2);
  const plateMesh = new T.Mesh(plateGeo, mats.plate);
  plateMesh.position.y = 0.5;
  board.add(plateMesh);

  /* 键帽：按宽度缓存几何 */
  const geoCache = {};
  const capGeo = w => {
    const key = String(w);
    if (!geoCache[key]) {
      const g = extrude(roundedRect(w - 0.09, 0.91, 0.13), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.07, bevelSegments: 3, curveSegments: 6 });
      g.rotateX(-Math.PI / 2);
      geoCache[key] = g;
    }
    return geoCache[key];
  };

  const keyMeshes = [];
  const codeMap = {};
  const rows = LAYOUT.length;
  LAYOUT.forEach((row, r) => {
    let x = -7.5;
    const z = r - (rows - 1) / 2;
    row.forEach(k => {
      const label = k[0], w = k[1], code = k[2];
      const role = ACCENT_KEYS.has(label) ? 'capAccent' : LIGHT_KEYS.has(label) ? 'capLight' : 'capMain';
      const m = new T.Mesh(capGeo(w), mats[role]);
      m.position.set(x + w / 2, 0.64, z);
      m.castShadow = true;
      m.userData = { baseY: 0.64, press: 0 };
      board.add(m);
      keyMeshes.push(m);
      if (code) (codeMap[code] = codeMap[code] || []).push(m);
      x += w;
    });
  });

  /* 旋钮（75% 的标志性元素） */
  const knob = new T.Group();
  const knobBody = new T.Mesh(new T.CylinderGeometry(0.42, 0.47, 0.34, 40), mats.knob);
  knobBody.castShadow = true;
  knob.add(knobBody);
  const knobRing = new T.Mesh(new T.TorusGeometry(0.44, 0.035, 10, 44), mats.glow);
  knobRing.rotation.x = Math.PI / 2;
  knobRing.position.y = 0.18;
  knob.add(knobRing);
  knob.position.set(7.0, 0.82, -2.5);
  board.add(knob);

  /* 底部氛围灯带：略宽于机身，从底壳下缘透出 */
  const stripGeoH = new T.BoxGeometry(16.1, 0.05, 0.12);
  const stripGeoV = new T.BoxGeometry(0.12, 0.05, 7.1);
  [[0, -3.5, stripGeoH], [0, 3.5, stripGeoH], [-8.0, 0, stripGeoV], [8.0, 0, stripGeoV]].forEach(s => {
    const m = new T.Mesh(s[2], mats.glow);
    m.position.set(s[0], 0.02, s[1]);
    board.add(m);
  });

  /* 灯光 */
  const keyLight = new T.DirectionalLight(0xffffff, 1.05);
  keyLight.position.set(7, 11, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -11;
  keyLight.shadow.camera.right = 11;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 32;
  keyLight.shadow.bias = -0.0006;
  scene.add(keyLight);
  const rimLight = new T.PointLight(0x8f74ec, 0.85, 40);
  rimLight.position.set(-6, 3.5, -7);
  scene.add(rimLight);
  const underLight = new T.PointLight(0x8f74ec, 1.05, 11);
  underLight.position.set(0, -0.1, 0);
  scene.add(underLight);
  scene.add(new T.AmbientLight(0x404048, 0.4));

  /* 接影地面 */
  const floor = new T.Mesh(new T.PlaneGeometry(70, 70), new T.ShadowMaterial({ opacity: 0.32 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.62;
  floor.receiveShadow = true;
  scene.add(floor);

  /* 浮尘粒子 */
  const N = 130;
  const base = new Float32Array(N * 3);
  const phase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    base[i * 3] = (Math.random() * 2 - 1) * 11;
    base[i * 3 + 1] = Math.random() * 6.5 - 0.4;
    base[i * 3 + 2] = (Math.random() * 2 - 1) * 7;
    phase[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.Float32BufferAttribute(base.slice(), 3));
  const pMat = new T.PointsMaterial({ color: 0x8f74ec, size: 0.055, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const particles = new T.Points(pGeo, pMat);
  scene.add(particles);

  /* 敲击涟漪 */
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new T.Mesh(
      new T.TorusGeometry(0.5, 0.02, 8, 40),
      new T.MeshBasicMaterial({ color: 0xa88cf5, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })
    );
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    r.userData.life = 0;
    scene.add(r);
    rings.push(r);
  }
  let ringIdx = 0;
  let glowPulse = 0;

  /* --- 机位关键帧 --- */
  const POSES = {
    land: [
      { cam: [10.4, 6.3, 13.2], look: [0.8, 0.3, 0], rotY: -0.55, pos: [4.0, 0.15, 0], scale: 1 },
      { cam: [-10.4, 4.2, 11.2], look: [-0.6, 0.5, 0], rotY: 0.62, pos: [-4.7, 0.1, 0], scale: 1 },
      { cam: [1.2, 10.6, 9.6], look: [0.8, 0.1, 0], rotY: 0.16, pos: [1.9, -0.15, 0], scale: 1 },
      { cam: [0, 4.4, 14.6], look: [0, 0.4, 0], rotY: 0.02, pos: [0, -0.35, 0], scale: 1 },
    ],
    narrow: [
      { cam: [12.0, 6.6, 14.8], look: [0.8, 0.3, 0], rotY: -0.5, pos: [5.2, 0.15, 0], scale: 0.85 },
      { cam: [-12.2, 4.6, 13.2], look: [-0.6, 0.5, 0], rotY: 0.58, pos: [-6.0, 0.1, 0], scale: 0.85 },
      { cam: [1.4, 11.4, 11.2], look: [0.8, 0.1, 0], rotY: 0.16, pos: [2.4, -0.15, 0], scale: 0.85 },
      { cam: [0, 4.8, 16.4], look: [0, 0.4, 0], rotY: 0.02, pos: [0, -0.35, 0], scale: 0.85 },
    ],
    port: [
      { cam: [0, 6.0, 15.8], look: [0, 1.2, 0], rotY: -0.4, pos: [0, 2.7, 0], scale: 0.72 },
      { cam: [0, 5.4, 15.0], look: [0, 1.0, 0], rotY: 0.5, pos: [0, 2.4, 0], scale: 0.68 },
      { cam: [0, 9.8, 13.2], look: [0, 1.0, 0], rotY: 0.12, pos: [0, 2.6, 0], scale: 0.72 },
      { cam: [0, 5.0, 16.2], look: [0, 1.1, 0], rotY: 0.0, pos: [0, 2.5, 0], scale: 0.7 },
    ],
  };

  /* --- 颜色目标（每帧插值） --- */
  const targets = {
    cs: new T.Color(COLORWAYS[0].cs),
    capMain: new T.Color(COLORWAYS[0].capMain),
    capLight: new T.Color(COLORWAYS[0].capLight),
    capAccent: new T.Color(COLORWAYS[0].capAccent),
    glow: new T.Color(COLORWAYS[0].glow),
  };

  /* --- 运行时 --- */
  const curLook = new T.Vector3(0.4, 0.3, 0);
  const tmpLook = new T.Vector3();
  const tmpPos = new T.Vector3();
  let animT = 0;
  let last = performance.now();
  let px = 0, py = 0; // 指针视差
  let frames = 0, fpsAt = last;
  const hoverable = matchMedia('(hover:hover) and (pointer:fine)').matches;

  if (hoverable) {
    addEventListener('pointermove', e => {
      px = (e.clientX / innerWidth) * 2 - 1;
      py = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function poseSet() {
    if (innerWidth < 700) return POSES.port;
    if (innerWidth < 1280) return POSES.narrow;
    return POSES.land;
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;

    frames++;
    if (now - fpsAt > 1000) {
      state.fps = Math.round(frames * 1000 / (now - fpsAt));
      frames = 0;
      fpsAt = now;
    }

    const running = canAnimate();
    if (running) animT += dt;

    /* 颜色插值：暂停时直接落位 */
    const cf = running ? 1 - Math.exp(-dt * 7) : 1;
    mats.cs.color.lerp(targets.cs, cf);
    mats.capMain.color.lerp(targets.capMain, cf);
    mats.capLight.color.lerp(targets.capLight, cf);
    mats.capAccent.color.lerp(targets.capAccent, cf);
    mats.glow.emissive.lerp(targets.glow, cf);
    rimLight.color.lerp(targets.glow, cf);
    underLight.color.lerp(targets.glow, cf);
    pMat.color.lerp(targets.glow, cf);
    rings.forEach(r => r.material.color.lerp(targets.glow, cf));

    /* 机位混合 */
    const P = poseSet();
    const t = state.scrollT;
    const i = Math.max(0, Math.min(P.length - 2, Math.floor(t)));
    const f = smooth(clamp01(t - i));
    const A = P[i], B = P[i + 1];
    const parX = running && hoverable ? px : 0;
    const parY = running && hoverable ? py : 0;

    tmpPos.set(
      lerp(A.cam[0], B.cam[0], f) + parX * 0.4,
      lerp(A.cam[1], B.cam[1], f) - parY * 0.3,
      lerp(A.cam[2], B.cam[2], f)
    );
    tmpLook.set(
      lerp(A.look[0], B.look[0], f),
      lerp(A.look[1], B.look[1], f),
      lerp(A.look[2], B.look[2], f)
    );
    const rotY = lerp(A.rotY, B.rotY, f) + parX * 0.07 + (running ? Math.sin(animT * 0.25) * 0.035 : 0);
    const rotX = parY * 0.045;
    const posX = lerp(A.pos[0], B.pos[0], f);
    const posY = lerp(A.pos[1], B.pos[1], f) + (running ? Math.sin(animT * 0.9) * 0.06 : 0);
    const scl = lerp(A.scale, B.scale, f);

    const pf = running ? 1 - Math.exp(-dt * 5) : 1;
    camera.position.lerp(tmpPos, pf);
    curLook.lerp(tmpLook, pf);
    camera.lookAt(curLook);
    board.rotation.y += (rotY - board.rotation.y) * pf;
    board.rotation.x += (rotX - board.rotation.x) * pf;
    board.position.x += (posX - board.position.x) * pf;
    board.position.y += (posY - board.position.y) * pf;
    board.scale.setScalar(board.scale.x + (scl - board.scale.x) * pf);

    /* 旋钮慢转 */
    knob.rotation.y = animT * 0.4;

    /* 键帽回弹 */
    for (const m of keyMeshes) {
      if (m.userData.press > 0) {
        m.userData.press = Math.max(0, m.userData.press - dt * 4.2);
        m.position.y = m.userData.baseY - Math.sin((1 - m.userData.press) * Math.PI) * 0.11;
      }
    }

    /* 涟漪 */
    for (const r of rings) {
      if (!r.visible) continue;
      r.userData.life -= dt * 2.1;
      if (r.userData.life <= 0) { r.visible = false; continue; }
      const k = 1 - r.userData.life;
      r.scale.setScalar(1 + k * 2.4);
      r.material.opacity = r.userData.life * 0.75;
    }

    /* 灯带脉冲 */
    glowPulse = Math.max(0, glowPulse - dt * 2.4);
    mats.glow.emissiveIntensity = 1.35 + glowPulse * 2.2;

    /* 粒子漂浮 */
    if (running) {
      const arr = pGeo.attributes.position.array;
      for (let j = 0; j < N; j++) {
        arr[j * 3] = base[j * 3] + Math.sin(animT * 0.17 + phase[j] * 1.7) * 0.5;
        arr[j * 3 + 1] = base[j * 3 + 1] + Math.sin(animT * 0.3 + phase[j]) * 0.42;
      }
      pGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  function pressCode(code) {
    const list = codeMap[code];
    if (!list) return;
    list.forEach(m => { m.userData.press = 1; });
    glowPulse = Math.min(1, glowPulse + 0.55);
    const src = list[0];
    const wp = new T.Vector3();
    src.getWorldPosition(wp);
    const r = rings[ringIdx++ % rings.length];
    r.position.set(wp.x, wp.y + 0.55, wp.z);
    r.scale.setScalar(1);
    r.userData.life = 1;
    r.visible = true;
  }

  function setTargets(cw) {
    targets.cs.set(cw.cs);
    targets.capMain.set(cw.capMain);
    targets.capLight.set(cw.capLight);
    targets.capAccent.set(cw.capAccent);
    targets.glow.set(cw.glow);
  }

  resize();
  requestAnimationFrame(frame);

  els.stage.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    state.renderer = 'fallback';
    document.body.classList.add('no-webgl');
  });

  return { resize, pressCode, setTargets };
}

/* ---------- SVG 键盘兜底（WebGL 不可用时） ---------- */

function buildFallback() {
  if (!els.fallback || els.fallback.dataset.built) return;
  els.fallback.dataset.built = '1';
  const U = 10, GAP = 0.9, PAD = 6;
  const W = 15 * U + PAD * 2;
  const H = 6 * U + PAD * 2;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  s += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="10" fill="var(--kb-case)" stroke="rgba(255,255,255,.22)"/>';
  s += '<rect x="' + (PAD - 2.4) + '" y="' + (PAD - 2.4) + '" width="' + (15 * U + 4.8) + '" height="' + (6 * U + 4.8) + '" rx="5" fill="#0f1015"/>';
  LAYOUT.forEach((row, r) => {
    let x = PAD;
    row.forEach(k => {
      const label = k[0], w = k[1];
      const fill = ACCENT_KEYS.has(label) ? 'var(--accent)' : LIGHT_KEYS.has(label) ? 'var(--accent-strong)' : 'var(--kb-cap,#322b49)';
      s += '<rect x="' + (x + (1 - GAP) / 2).toFixed(2) + '" y="' + (PAD + r + (1 - GAP) / 2).toFixed(2) +
           '" width="' + (w - (1 - GAP)).toFixed(2) + '" height="' + GAP.toFixed(2) + '" rx="1.6" fill="' + fill + '"/>';
      x += w;
    });
  });
  s += '<circle cx="' + (PAD + 14.5 * U) + '" cy="' + (PAD + 0.5 * U) + '" r="3.4" fill="var(--kb-case)" stroke="var(--accent)" stroke-width="1.4"/>';
  s += '</svg>';
  els.fallback.innerHTML = s;
}

function enableFallback() {
  state.renderer = 'fallback';
  document.body.classList.add('no-webgl');
  buildFallback();
  const cw = COLORWAYS.find(c => c.name === state.activeColor);
  if (cw) root.style.setProperty('--kb-cap', cw.capMain);
}

/* ---------- 测试接口（与真实交互同一套 state/actions） ---------- */

window.__LAUNCH_TEST__ = {
  snapshot() {
    return {
      sections: SECTIONS.slice(),
      activeSection: state.activeSection,
      activeColor: state.activeColor,
      motionPaused: state.motionPaused,
      reducedMotion: state.reducedMotion,
      colorNames: COLORWAYS.map(c => c.name),
      renderer: state.renderer,
      scrollT: Math.round(state.scrollT * 1000) / 1000,
      fps: state.fps,
      viewport: { w: innerWidth, h: innerHeight, dw: document.documentElement.scrollWidth },
      launchAt: '2026-08-08T00:00:00+08:00',
    };
  },
  goToSection(id) { return actions.goToSection(id); },
  setColor(name) { return actions.setColor(name); },
  setMotionPaused(paused) { return actions.setMotionPaused(paused); },
};

/* ---------- 自测钩子：?selftest=1 时将结果写入 document.title ---------- */

function runSelftest() {
  if (new URLSearchParams(location.search).get('selftest') !== '1') return;
  const T = window.__LAUNCH_TEST__;
  setTimeout(() => {
    let s0, s1, s2;
    try {
      s0 = T.snapshot();
      T.setColor('玄墨');
      T.setMotionPaused(true);
      s1 = T.snapshot();
      /* 暂停态下导航为瞬时跳转，结果确定（smooth 路径依赖合成器） */
      T.goToSection('colors');
    } catch (err) {
      document.title = 'SELFTEST ERROR(step1) ' + String(err && err.message || err);
      return;
    }
    setTimeout(() => {
      try {
        s2 = T.snapshot();
        T.setColor('暮山紫');
        T.setMotionPaused(false);
        T.goToSection('hero');
        document.title = 'SELFTEST ' + JSON.stringify({
          sections: s0.sections.join(','),
          init: s0.activeSection + '/' + s0.activeColor,
          afterSet: s1.activeColor,
          paused: s1.motionPaused,
          navTo: s2.activeSection,
          renderer: s0.renderer,
          motion: s0.motionPaused,
          dw: s0.viewport.dw,
          iw: s0.viewport.w,
        });
      } catch (err) {
        document.title = 'SELFTEST ERROR(step2) ' + String(err && err.message || err);
      }
    }, 900);
  }, 700);
}

/* ---------- 启动 ---------- */

function init() {
  buildSwatches();
  applyColor(COLORWAYS.find(c => c.name === state.activeColor));
  syncMotionUI();
  syncSectionUI();
  initReveals();
  initReserve();
  initEvents();
  tickCountdown();
  setInterval(tickCountdown, 1000);

  try {
    three = initThree();
    state.renderer = 'webgl';
    three.setTargets(COLORWAYS.find(c => c.name === state.activeColor));
  } catch (err) {
    enableFallback();
  }

  root.classList.add('ready');
  requestScrollFrame();
  runSelftest();
}

init();

})();

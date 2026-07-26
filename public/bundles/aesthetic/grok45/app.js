/**
 * 声律 75 — Launch Page
 * Programmatic 3D keyboard + scroll stage + unified test API
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants & product state
  // ---------------------------------------------------------------------------
  const SECTIONS = ["hero", "features", "colors", "buy"];
  const COLOR_MAP = {
    暮山紫: {
      case: 0x5e4a6a,
      key: 0x3d3248,
      accent: 0x8a749c,
      label: "暮山紫",
    },
    月白: {
      case: 0xe8e4da,
      key: 0xd2cdc0,
      accent: 0xf4f0e8,
      label: "月白",
    },
    黛青: {
      case: 0x355558,
      key: 0x243c3e,
      accent: 0x5d8284,
      label: "黛青",
    },
    胭脂: {
      case: 0x8a4548,
      key: 0x623234,
      accent: 0xb4686a,
      label: "胭脂",
    },
    玄墨: {
      case: 0x18181a,
      key: 0x0e0e10,
      accent: 0x3a3a40,
      label: "玄墨",
    },
  };
  const COLOR_NAMES = Object.keys(COLOR_MAP);

  const state = {
    activeSection: "hero",
    activeColor: "暮山紫",
    motionPaused: false,
    preorderClicked: false,
  };

  const prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    state.motionPaused = true;
    document.documentElement.classList.add("motion-paused");
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const kbCanvas = document.getElementById("kb-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const header = document.getElementById("site-header");
  const activeColorNameEl = document.getElementById("active-color-name");
  const buyFeedback = document.getElementById("buy-feedback");
  const swatches = Array.from(document.querySelectorAll(".swatch"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
  const featureCards = Array.from(document.querySelectorAll(".feature-card"));
  const sectionEls = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);

  // Mark reveal targets
  document
    .querySelectorAll(
      ".hero-copy, .section-head, .feature-card, .colors-copy, .buy-panel"
    )
    .forEach((el) => el.classList.add("reveal"));

  // ---------------------------------------------------------------------------
  // Navigation / section state (shared with test API)
  // ---------------------------------------------------------------------------
  function goToSection(id) {
    if (!SECTIONS.includes(id)) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    state.activeSection = id;
    updateNavUI();
    el.scrollIntoView({
      behavior: state.motionPaused ? "auto" : "smooth",
      block: "start",
    });
    return true;
  }

  function updateNavUI() {
    document.querySelectorAll(".nav-link").forEach((btn) => {
      const id = btn.getAttribute("data-nav");
      btn.classList.toggle("is-active", id === state.activeSection);
    });
    document.body.setAttribute("data-section", state.activeSection);
  }

  function detectActiveSection() {
    const mid = window.innerHeight * 0.38;
    let current = SECTIONS[0];
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= mid && rect.bottom > mid * 0.4) {
        current = id;
      }
    }
    if (current !== state.activeSection) {
      state.activeSection = current;
      updateNavUI();
    }
  }

  navLinks.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const id = el.getAttribute("data-nav");
      if (id) goToSection(id);
    });
  });

  // ---------------------------------------------------------------------------
  // Color switching (shared with test API)
  // ---------------------------------------------------------------------------
  let colorTween = null;

  function toCssHex(n) {
    return "#" + n.toString(16).padStart(6, "0");
  }

  function shadeHex(n, factor) {
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
    return (r << 16) | (g << 8) | b;
  }

  function applyCssKeyboardColor(palette) {
    const root = document.documentElement;
    root.style.setProperty("--kb-case", toCssHex(palette.case));
    root.style.setProperty("--kb-case-dark", toCssHex(shadeHex(palette.case, 0.62)));
    root.style.setProperty("--kb-key", toCssHex(palette.key));
    root.style.setProperty("--kb-key-dark", toCssHex(shadeHex(palette.key, 0.7)));
    root.style.setProperty("--kb-accent", toCssHex(palette.accent));
    root.style.setProperty("--kb-accent-dark", toCssHex(shadeHex(palette.accent, 0.65)));
    root.style.setProperty("--active-color", toCssHex(palette.case));
  }

  function setColor(name) {
    if (!COLOR_MAP[name]) return false;
    state.activeColor = name;
    const palette = COLOR_MAP[name];
    applyCssKeyboardColor(palette);
    if (activeColorNameEl) activeColorNameEl.textContent = name;

    swatches.forEach((btn) => {
      const isActive = btn.getAttribute("data-color") === name;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (keyboard && webglReady) {
      animateKeyboardColor(palette);
    }
    return true;
  }

  swatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-color");
      if (name) setColor(name);
    });
  });

  // ---------------------------------------------------------------------------
  // Motion pause (shared with test API)
  // ---------------------------------------------------------------------------
  function setMotionPaused(paused) {
    state.motionPaused = !!paused;
    document.documentElement.classList.toggle("motion-paused", state.motionPaused);
    return state.motionPaused;
  }

  // ---------------------------------------------------------------------------
  // Buy CTAs (fictional, no external nav)
  // ---------------------------------------------------------------------------
  const btnPreorder = document.getElementById("btn-preorder");
  const btnNotify = document.getElementById("btn-notify");

  if (btnPreorder) {
    btnPreorder.addEventListener("click", () => {
      state.preorderClicked = true;
      if (buyFeedback) {
        buyFeedback.textContent =
          "预订意向已记录（演示）· 声律 75 · " + state.activeColor;
      }
    });
  }
  if (btnNotify) {
    btnNotify.addEventListener("click", () => {
      if (buyFeedback) {
        buyFeedback.textContent = "发布提醒已登记（演示）· 2026.08.08";
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Scroll header + reveal
  // ---------------------------------------------------------------------------
  function onScrollUI() {
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    detectActiveSection();
  }

  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-in");
              }
            });
          },
          { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        )
      : null;

  if (revealObserver) {
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  // Immediate hero reveal
  const heroCopy = document.querySelector(".hero-copy");
  if (heroCopy) {
    requestAnimationFrame(() => heroCopy.classList.add("is-in"));
  }

  // ---------------------------------------------------------------------------
  // Particle canvas (subtle dust / light motes)
  // ---------------------------------------------------------------------------
  const fx = {
    ctx: null,
    w: 0,
    h: 0,
    dpr: 1,
    particles: [],
    t: 0,
  };

  function initFx() {
    if (!fxCanvas) return;
    fx.ctx = fxCanvas.getContext("2d");
    resizeFx();
    const count = Math.min(48, Math.floor((fx.w * fx.h) / 28000));
    fx.particles = [];
    for (let i = 0; i < count; i++) {
      fx.particles.push({
        x: Math.random() * fx.w,
        y: Math.random() * fx.h,
        r: 0.4 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.05 - Math.random() * 0.2,
        a: 0.15 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resizeFx() {
    if (!fxCanvas || !fx.ctx) return;
    fx.dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.w = window.innerWidth;
    fx.h = window.innerHeight;
    fxCanvas.width = Math.floor(fx.w * fx.dpr);
    fxCanvas.height = Math.floor(fx.h * fx.dpr);
    fxCanvas.style.width = fx.w + "px";
    fxCanvas.style.height = fx.h + "px";
    fx.ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
  }

  function drawFx(dt) {
    if (!fx.ctx || state.motionPaused) return;
    fx.t += dt;
    const ctx = fx.ctx;
    ctx.clearRect(0, 0, fx.w, fx.h);

    for (const p of fx.particles) {
      p.x += p.vx + Math.sin(fx.t * 0.001 + p.phase) * 0.05;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = fx.h + 10;
        p.x = Math.random() * fx.w;
      }
      if (p.x < -10) p.x = fx.w + 10;
      if (p.x > fx.w + 10) p.x = -10;

      const pulse = 0.5 + 0.5 * Math.sin(fx.t * 0.002 + p.phase);
      ctx.beginPath();
      ctx.fillStyle =
        "rgba(201, 166, 107," + (p.a * pulse * 0.55).toFixed(3) + ")";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Three.js keyboard
  // ---------------------------------------------------------------------------
  let renderer, scene, camera, keyboard;
  let caseMat, keyMat, plateMat, accentMat, switchMat;
  let pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollProgress = 0;
  let clock;
  let webglReady = false;

  const sectionCamera = {
    hero: { rotX: 0.42, rotY: -0.55, rotZ: 0.08, posY: 0.12, scale: 1, x: 1.35 },
    features: { rotX: 0.52, rotY: 0.45, rotZ: -0.04, posY: 0.2, scale: 0.92, x: 0.55 },
    colors: { rotX: 0.36, rotY: -0.32, rotZ: 0.04, posY: 0.05, scale: 0.98, x: 1.85 },
    buy: { rotX: 0.62, rotY: 0.12, rotZ: 0.0, posY: -0.05, scale: 0.78, x: 0.15 },
  };

  function hexColor(n) {
    return new THREE.Color(n);
  }

  function createMaterials(palette) {
    // Anodized aluminum: mid metalness, mid roughness — keep base color readable
    caseMat = new THREE.MeshStandardMaterial({
      color: hexColor(palette.case),
      metalness: 0.48,
      roughness: 0.42,
    });
    keyMat = new THREE.MeshStandardMaterial({
      color: hexColor(palette.key),
      metalness: 0.08,
      roughness: 0.58,
    });
    plateMat = new THREE.MeshStandardMaterial({
      color: 0x1c1a18,
      metalness: 0.4,
      roughness: 0.55,
    });
    accentMat = new THREE.MeshStandardMaterial({
      color: hexColor(palette.accent),
      metalness: 0.35,
      roughness: 0.4,
    });
    switchMat = new THREE.MeshStandardMaterial({
      color: 0xc9a66b,
      metalness: 0.35,
      roughness: 0.5,
      emissive: hexColor(0x2a1e0c),
      emissiveIntensity: 0.08,
    });
  }

  function animateKeyboardColor(palette) {
    if (!caseMat || !keyMat || !accentMat) return;
    const from = {
      case: caseMat.color.clone(),
      key: keyMat.color.clone(),
      accent: accentMat.color.clone(),
    };
    const to = {
      case: hexColor(palette.case),
      key: hexColor(palette.key),
      accent: hexColor(palette.accent),
    };
    const start = performance.now();
    const dur = state.motionPaused ? 0 : 520;

    if (colorTween) colorTween.cancelled = true;
    const tween = { cancelled: false };
    colorTween = tween;

    function step(now) {
      if (tween.cancelled) return;
      const t = dur === 0 ? 1 : Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      caseMat.color.r = from.case.r + (to.case.r - from.case.r) * e;
      caseMat.color.g = from.case.g + (to.case.g - from.case.g) * e;
      caseMat.color.b = from.case.b + (to.case.b - from.case.b) * e;
      keyMat.color.r = from.key.r + (to.key.r - from.key.r) * e;
      keyMat.color.g = from.key.g + (to.key.g - from.key.g) * e;
      keyMat.color.b = from.key.b + (to.key.b - from.key.b) * e;
      accentMat.color.r = from.accent.r + (to.accent.r - from.accent.r) * e;
      accentMat.color.g = from.accent.g + (to.accent.g - from.accent.g) * e;
      accentMat.color.b = from.accent.b + (to.accent.b - from.accent.b) * e;
      // pale cases need less metal sheen so white reads cleanly
      const isLight = palette.case > 0xc0c0c0;
      keyMat.roughness = isLight ? 0.62 : 0.58;
      caseMat.metalness = isLight ? 0.32 : 0.48;
      caseMat.roughness = isLight ? 0.48 : 0.42;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * Build a stylized 75% keyboard from primitives.
   * Layout approx: 16 cols × 6 rows with blockers for arrows / nav cluster.
   */
  function buildKeyboard() {
    const group = new THREE.Group();
    const unit = 0.19;
    const gap = 0.018;
    const keyH = 0.055;
    const caseW = 16 * unit + 0.28;
    const caseD = 6 * unit + 0.32;
    const caseH = 0.14;

    // Outer aluminum case
    const caseGeo = new THREE.BoxGeometry(caseW, caseH, caseD);
    // subtle bevel via scaled edges — approximate with main body + lip
    const caseMesh = new THREE.Mesh(caseGeo, caseMat);
    caseMesh.position.y = 0;
    caseMesh.castShadow = true;
    caseMesh.receiveShadow = true;
    group.add(caseMesh);

    // Bottom weight / base plate shade
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(caseW * 0.96, 0.04, caseD * 0.96),
      plateMat
    );
    base.position.y = -caseH * 0.55;
    group.add(base);

    // Inner cavity / plate
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(caseW - 0.18, 0.02, caseD - 0.18),
      plateMat
    );
    plate.position.y = caseH * 0.28;
    group.add(plate);

    // Gasket visual strips (side cushions)
    const gasketMat = new THREE.MeshStandardMaterial({
      color: 0x3a3834,
      metalness: 0.05,
      roughness: 0.85,
    });
    [-1, 1].forEach((side) => {
      const g = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, caseD * 0.82),
        gasketMat
      );
      g.position.set(side * (caseW * 0.5 - 0.08), caseH * 0.22, 0);
      group.add(g);
    });

    // Badge / brand strip
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.01, 0.08),
      accentMat
    );
    badge.position.set(-caseW * 0.28, caseH * 0.52, caseD * 0.42);
    group.add(badge);

    // USB-C port
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.03, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.25 })
    );
    port.position.set(0, -0.01, caseD * 0.5 + 0.005);
    group.add(port);

    // Feet
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a18,
      roughness: 0.9,
      metalness: 0.1,
    });
    const footPositions = [
      [-caseW * 0.38, -caseH * 0.72, -caseD * 0.35],
      [caseW * 0.38, -caseH * 0.72, -caseD * 0.35],
      [-caseW * 0.38, -caseH * 0.72, caseD * 0.35],
      [caseW * 0.38, -caseH * 0.72, caseD * 0.35],
    ];
    footPositions.forEach((p) => {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 12), footMat);
      f.position.set(p[0], p[1], p[2]);
      group.add(f);
    });

    // Key layout — simplified 75%
    // each entry: [col, row, wUnits, hUnits, kind]
    // kind: 'key' | 'space' | 'mod' | 'esc' | 'enter'
    const rows = [
      // row 0: Esc + F keys + Del cluster (simplified)
      [
        [0, 1, "esc"],
        [1.25, 1, "mod"],
        [2.25, 1, "mod"],
        [3.25, 1, "mod"],
        [4.25, 1, "mod"],
        [5.5, 1, "mod"],
        [6.5, 1, "mod"],
        [7.5, 1, "mod"],
        [8.5, 1, "mod"],
        [9.75, 1, "mod"],
        [10.75, 1, "mod"],
        [11.75, 1, "mod"],
        [12.75, 1, "mod"],
        [14, 1, "mod"],
        [15, 1, "mod"],
      ],
      // row 1: numbers
      [
        [0, 1, "key"],
        [1, 1, "key"],
        [2, 1, "key"],
        [3, 1, "key"],
        [4, 1, "key"],
        [5, 1, "key"],
        [6, 1, "key"],
        [7, 1, "key"],
        [8, 1, "key"],
        [9, 1, "key"],
        [10, 1, "key"],
        [11, 1, "key"],
        [12, 1, "key"],
        [13, 2, "mod"],
        [15, 1, "mod"],
      ],
      // row 2: QWERTY
      [
        [0, 1.5, "mod"],
        [1.5, 1, "key"],
        [2.5, 1, "key"],
        [3.5, 1, "key"],
        [4.5, 1, "key"],
        [5.5, 1, "key"],
        [6.5, 1, "key"],
        [7.5, 1, "key"],
        [8.5, 1, "key"],
        [9.5, 1, "key"],
        [10.5, 1, "key"],
        [11.5, 1, "key"],
        [12.5, 1, "key"],
        [13.5, 1.5, "enter"],
        [15, 1, "mod"],
      ],
      // row 3: home row
      [
        [0, 1.75, "mod"],
        [1.75, 1, "key"],
        [2.75, 1, "key"],
        [3.75, 1, "key"],
        [4.75, 1, "key"],
        [5.75, 1, "key"],
        [6.75, 1, "key"],
        [7.75, 1, "key"],
        [8.75, 1, "key"],
        [9.75, 1, "key"],
        [10.75, 1, "key"],
        [11.75, 1, "key"],
        [12.75, 2.25, "enter"],
        [15, 1, "mod"],
      ],
      // row 4: bottom-alpha
      [
        [0, 2.25, "mod"],
        [2.25, 1, "key"],
        [3.25, 1, "key"],
        [4.25, 1, "key"],
        [5.25, 1, "key"],
        [6.25, 1, "key"],
        [7.25, 1, "key"],
        [8.25, 1, "key"],
        [9.25, 1, "key"],
        [10.25, 1, "key"],
        [11.25, 1, "key"],
        [12.25, 1.75, "mod"],
        [14, 1, "key"],
        [15, 1, "mod"],
      ],
      // row 5: space row
      [
        [0, 1.25, "mod"],
        [1.25, 1.25, "mod"],
        [2.5, 1.25, "mod"],
        [3.75, 6.25, "space"],
        [10, 1.25, "mod"],
        [11.25, 1.25, "mod"],
        [13, 1, "key"],
        [14, 1, "key"],
        [15, 1, "key"],
      ],
    ];

    const keyTopY = caseH * 0.42;
    const startX = -caseW / 2 + 0.16;
    const startZ = -caseD / 2 + 0.16;

    const keycapGeoCache = new Map();
    function keyGeo(wu, hu) {
      const k = wu + "x" + hu;
      if (!keycapGeoCache.has(k)) {
        const w = wu * unit - gap;
        const d = hu * unit - gap;
        // rounded-ish via box (r147 has no RoundedBox without examples)
        const geo = new THREE.BoxGeometry(w, keyH, d);
        keycapGeoCache.set(k, geo);
      }
      return keycapGeoCache.get(k);
    }

    const keys = [];
    rows.forEach((row, ri) => {
      row.forEach((spec) => {
        const col = spec[0];
        const wu = spec[1];
        const kind = spec[2];
        const mesh = new THREE.Mesh(keyGeo(wu, 1), kind === "esc" ? accentMat : keyMat);
        const x = startX + (col + wu / 2) * unit;
        const z = startZ + (ri + 0.5) * unit;
        mesh.position.set(x, keyTopY + keyH * 0.5, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // slight random height for organic feel
        mesh.userData.baseY = mesh.position.y;
        mesh.userData.phase = Math.random() * Math.PI * 2;
        mesh.userData.kind = kind;
        group.add(mesh);
        keys.push(mesh);

        // tiny switch stem under key (visible gap — gasket aesthetic)
        if (kind !== "space" && Math.random() > 0.35) {
          const stem = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.03, 0.04),
            switchMat
          );
          stem.position.set(x, keyTopY - 0.01, z);
          group.add(stem);
        }
      });
    });

    // Side profile lip (CNC edge highlight)
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(caseW + 0.01, 0.02, caseD + 0.01),
      new THREE.MeshStandardMaterial({
        color: 0xd4c4a8,
        metalness: 0.9,
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
      })
    );
    lip.position.y = caseH * 0.48;
    group.add(lip);

    group.userData.keys = keys;
    group.rotation.order = "YXZ";
    return group;
  }

  function buildCssKeyboard() {
    const plate = document.getElementById("kb-css-keys");
    const wrap = document.getElementById("kb-css");
    if (!plate || !wrap) return;

    plate.innerHTML = "";
    // Approximate 75% rows as CSS grid keys
    const layout = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
      [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1, 1, 1],
    ];

    layout.forEach((row, ri) => {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-css-row";
      // use fractional columns via flex grow
      rowEl.style.display = "flex";
      row.forEach((wu, ki) => {
        const key = document.createElement("span");
        key.className = "kb-css-key";
        key.style.flex = String(wu);
        if (wu >= 5) key.classList.add("is-space");
        if (ri === 0 && ki === 0) key.classList.add("is-accent");
        rowEl.appendChild(key);
      });
      plate.appendChild(rowEl);
    });
  }

  function showCssKeyboard(show) {
    const wrap = document.getElementById("kb-css");
    if (!wrap) return;
    wrap.classList.toggle("is-hidden", !show);
    if (kbCanvas) kbCanvas.style.opacity = show ? "0" : "1";
  }

  function initThree() {
    buildCssKeyboard();

    if (typeof THREE === "undefined" || !kbCanvas) {
      showCssKeyboard(true);
      return;
    }

    try {
      clock = new THREE.Clock();
      scene = new THREE.Scene();

      const w = window.innerWidth;
      const h = window.innerHeight;
      camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      camera.position.set(0, 2.2, 6.5);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: kbCanvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);
      if (THREE.sRGBEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }
      if (renderer.toneMapping !== undefined && THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.92;
      }
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (err) {
      // Headless / no GPU: degrade to CSS 3D keyboard, keep page usable
      renderer = null;
      scene = null;
      camera = null;
      webglReady = false;
      showCssKeyboard(true);
      return;
    }

    try {
      // Lights — warm cinematic, restrained so anodized colors stay true
      const amb = new THREE.AmbientLight(0xf0e8dc, 0.28);
      scene.add(amb);

      const keyLight = new THREE.DirectionalLight(0xffe8d0, 0.95);
      keyLight.position.set(4, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      scene.add(keyLight);

      const fill = new THREE.DirectionalLight(0xa8b4b8, 0.28);
      fill.position.set(-5, 3, -2);
      scene.add(fill);

      const rim = new THREE.SpotLight(0xc9a66b, 0.55, 20, Math.PI / 5, 0.45, 1);
      rim.position.set(-3, 4, 4);
      rim.target.position.set(0, 0, 0);
      scene.add(rim);
      scene.add(rim.target);

      const groundLight = new THREE.PointLight(0xc9a66b, 0.18, 12);
      groundLight.position.set(0, -1.5, 1);
      scene.add(groundLight);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(4.5, 48),
        new THREE.MeshStandardMaterial({
          color: 0x0a0908,
          metalness: 0.2,
          roughness: 0.9,
          transparent: true,
          opacity: 0.55,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.55;
      ground.receiveShadow = true;
      scene.add(ground);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.4, 64),
        new THREE.MeshBasicMaterial({
          color: 0xc9a66b,
          transparent: true,
          opacity: 0.06,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.54;
      scene.add(ring);

      createMaterials(COLOR_MAP[state.activeColor]);
      keyboard = buildKeyboard();
      scene.add(keyboard);

      const hemi = new THREE.HemisphereLight(0xf5ebe0, 0x12110f, 0.32);
      scene.add(hemi);

      webglReady = true;
      showCssKeyboard(false);
    } catch (err) {
      webglReady = false;
      keyboard = null;
      showCssKeyboard(true);
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function getScrollCameraTarget() {
    // Blend between section poses based on which section is active + scroll within page
    const poses = SECTIONS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return { id, top: 0, mid: 0 };
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.35;
      return { id, mid, top: rect.top, bottom: rect.bottom };
    });

    // Find closest two sections by mid distance to viewport center
    const center = window.innerHeight * 0.4;
    let best = poses[0];
    let bestDist = Infinity;
    let second = poses[0];
    let secondDist = Infinity;

    poses.forEach((p) => {
      const d = Math.abs(p.mid - center);
      if (d < bestDist) {
        second = best;
        secondDist = bestDist;
        best = p;
        bestDist = d;
      } else if (d < secondDist) {
        second = p;
        secondDist = d;
      }
    });

    const A = sectionCamera[best.id] || sectionCamera.hero;
    const B = sectionCamera[second.id] || A;
    const total = bestDist + secondDist || 1;
    const t = smoothstep(1 - bestDist / total);

    return {
      rotX: lerp(A.rotX, B.rotX, 1 - t),
      rotY: lerp(A.rotY, B.rotY, 1 - t),
      rotZ: lerp(A.rotZ, B.rotZ, 1 - t),
      posY: lerp(A.posY, B.posY, 1 - t),
      scale: lerp(A.scale, B.scale, 1 - t),
      x: lerp(A.x, B.x, 1 - t),
    };
  }

  function isMobile() {
    return window.innerWidth <= 720;
  }

  function updateKeyboardPose(dt) {
    if (!keyboard) return;

    const target = getScrollCameraTarget();
    const mobile = isMobile();

    // Mobile: center keyboard higher / smaller
    let tx = mobile ? 0 : target.x;
    let ty = mobile ? 0.35 : target.posY;
    let sc = mobile ? target.scale * 0.72 : target.scale;
    let rotX = target.rotX;
    let rotY = target.rotY;
    let rotZ = target.rotZ;

    // Pointer parallax
    const px = state.motionPaused ? 0 : pointer.x * 0.12;
    const py = state.motionPaused ? 0 : pointer.y * 0.08;

    // Idle float
    const t = clock ? clock.elapsedTime : 0;
    const floatY = state.motionPaused ? 0 : Math.sin(t * 0.7) * 0.04;
    const idleYaw = state.motionPaused ? 0 : Math.sin(t * 0.25) * 0.04;

    // Smooth toward target
    const k = state.motionPaused ? 1 : 1 - Math.pow(0.001, dt);
    keyboard.position.x = lerp(keyboard.position.x, tx + px * 0.3, k);
    keyboard.position.y = lerp(keyboard.position.y, ty + floatY - py * 0.2, k);
    keyboard.position.z = lerp(keyboard.position.z, 0, k);
    keyboard.rotation.x = lerp(keyboard.rotation.x, rotX + py * 0.15, k);
    keyboard.rotation.y = lerp(keyboard.rotation.y, rotY + px + idleYaw, k);
    keyboard.rotation.z = lerp(keyboard.rotation.z, rotZ, k);
    const s = lerp(keyboard.scale.x, sc, k);
    keyboard.scale.setScalar(s);

    // Micro key animation — very subtle breathing
    if (!state.motionPaused && keyboard.userData.keys) {
      keyboard.userData.keys.forEach((key, i) => {
        if (i % 5 !== 0) return;
        const wave = Math.sin(t * 1.5 + key.userData.phase) * 0.003;
        key.position.y = key.userData.baseY + wave;
      });
    }

    // Camera slight move with scroll
    if (camera) {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollProgress = window.scrollY / maxScroll;
      const camY = 2.0 + scrollProgress * 0.35 + (mobile ? 0.4 : 0);
      const camZ = mobile ? 7.2 : 6.2 - scrollProgress * 0.4;
      camera.position.x = lerp(camera.position.x, px * 0.4, k);
      camera.position.y = lerp(camera.position.y, camY, k);
      camera.position.z = lerp(camera.position.z, camZ, k);
      camera.lookAt(tx * 0.3, ty * 0.5, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Pointer / resize / loop
  // ---------------------------------------------------------------------------
  function onPointerMove(e) {
    const x = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX) ?? 0;
    const y = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY) ?? 0;
    pointer.tx = (x / window.innerWidth) * 2 - 1;
    pointer.ty = -((y / window.innerHeight) * 2 - 1);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (renderer && camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    resizeFx();
  }
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onScrollUI, { passive: true });

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // smooth pointer
    if (!state.motionPaused) {
      pointer.x = lerp(pointer.x, pointer.tx, 0.06);
      pointer.y = lerp(pointer.y, pointer.ty, 0.06);
    }

    updateKeyboardPose(dt);
    drawFx(state.motionPaused ? 0 : dt * 1000);

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Test API
  // ---------------------------------------------------------------------------
  function snapshot() {
    return {
      sections: SECTIONS.slice(),
      activeSection: state.activeSection,
      activeColor: state.activeColor,
      motionPaused: state.motionPaused,
      scrollY: window.scrollY || 0,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      preorderClicked: state.preorderClicked,
      colors: COLOR_NAMES.slice(),
      hasKeyboard: !!(keyboard || document.getElementById("kb-css-keys")),
      webglReady: webglReady,
    };
  }

  window.__LAUNCH_TEST__ = {
    snapshot: snapshot,
    goToSection: goToSection,
    setColor: setColor,
    setMotionPaused: setMotionPaused,
  };

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function boot() {
    initFx();
    initThree();
    setColor(state.activeColor);
    onScrollUI();
    // enter animations for first paint
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

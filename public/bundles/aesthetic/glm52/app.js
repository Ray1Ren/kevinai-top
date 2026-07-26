/* ============================================ *
 * 声律 75 — SOUNDRHYTHM
 * 3D Keyboard + Interactions + Test Interface
 * ============================================ */
(function () {
  "use strict";

  /* === Color Config === */
  var COLORS = {
    "暮山紫": { name: "暮山紫", en: "Twilight Purple", body: 0x4A3D5C, keycap: 0x6B5B7E, isLight: false, desc: "远山暮色，紫韵天成", hex: "#4A3D5C" },
    "月白":   { name: "月白",   en: "Moon White",      body: 0xC8C3B5, keycap: 0xDFDACC, isLight: true,  desc: "月下素练，皎洁无尘", hex: "#C8C3B5" },
    "黛青":   { name: "黛青",   en: "Dark Cyan",       body: 0x1F2B36, keycap: 0x2D3E4C, isLight: false, desc: "黛色入青，沉稳如渊", hex: "#1F2B36" },
    "胭脂":   { name: "胭脂",   en: "Rouge",           body: 0x6B2530, keycap: 0x8B3A4A, isLight: false, desc: "胭脂一抹，点染朱颜", hex: "#6B2530" },
    "玄墨":   { name: "玄墨",   en: "Ink Black",       body: 0x1A1A1C, keycap: 0x2A2A2C, isLight: false, desc: "玄墨如漆，大道至简", hex: "#1A1A1C" }
  };

  var SECTION_IDS = ["hero", "features", "colors", "buy"];

  /* 75% layout — each key: {l:label, w:width_in_units} */
  var KEY_LAYOUT = [
    [ {l:"Esc",w:1},{l:"F1",w:1},{l:"F2",w:1},{l:"F3",w:1},{l:"F4",w:1},
      {l:"F5",w:1},{l:"F6",w:1},{l:"F7",w:1},{l:"F8",w:1},
      {l:"F9",w:1},{l:"F10",w:1},{l:"F11",w:1},{l:"F12",w:1},{l:"Del",w:1} ],
    [ {l:"`",w:1},{l:"1",w:1},{l:"2",w:1},{l:"3",w:1},{l:"4",w:1},
      {l:"5",w:1},{l:"6",w:1},{l:"7",w:1},{l:"8",w:1},{l:"9",w:1},
      {l:"0",w:1},{l:"-",w:1},{l:"=",w:1},{l:"Bksp",w:2} ],
    [ {l:"Tab",w:1.5},{l:"Q",w:1},{l:"W",w:1},{l:"E",w:1},{l:"R",w:1},
      {l:"T",w:1},{l:"Y",w:1},{l:"U",w:1},{l:"I",w:1},{l:"O",w:1},
      {l:"P",w:1},{l:"[",w:1},{l:"]",w:1},{l:"\\",w:1.5} ],
    [ {l:"Caps",w:1.75},{l:"A",w:1},{l:"S",w:1},{l:"D",w:1},{l:"F",w:1},
      {l:"G",w:1},{l:"H",w:1},{l:"J",w:1},{l:"K",w:1},{l:"L",w:1},
      {l:";",w:1},{l:"'",w:1},{l:"Enter",w:2.25} ],
    [ {l:"Shift",w:2.25},{l:"Z",w:1},{l:"X",w:1},{l:"C",w:1},{l:"V",w:1},
      {l:"B",w:1},{l:"N",w:1},{l:"M",w:1},{l:",",w:1},{l:".",w:1},
      {l:"/",w:1},{l:"Shift",w:1.75},{l:"\u2191",w:1} ],
    [ {l:"Ctrl",w:1},{l:"Win",w:1.25},{l:"Alt",w:1.25},{l:"",w:6.25},
      {l:"Alt",w:1.25},{l:"Fn",w:1.25},{l:"Ctrl",w:1},
      {l:"\u2190",w:1},{l:"\u2193",w:1},{l:"\u2192",w:1} ]
  ];

  /* === State === */
  var state = {
    activeSection: "hero",
    activeColor: "暮山紫",
    motionPaused: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  /* === DOM === */
  var stageEl = document.getElementById("keyboard-stage");
  var canvasContainer = document.getElementById("keyboard-canvas");

  /* === Three.js globals === */
  var scene, camera, renderer, keyboardGroup;
  var bodyMaterial, lipMaterial, plateMaterial;
  var keyMeshes = [];
  var particles;
  var groundMesh;
  var targetCameraPos;

  /* === Interaction === */
  var mouseTarget = { x: 0, y: 0 };
  var mouseCurrent = { x: 0, y: 0 };
  var isDragging = false;
  var dragStartX = 0;
  var dragStartRot = 0;
  var dragRot = 0;
  var baseRot = -0.35;
  var autoRotate = true;
  var lastInteract = 0;
  var scrollProgress = 0;
  var colorLerp = null;

  /* === Dimensions === */
  var UNIT = 1.0;
  var GAP = 0.12;
  var KEY_H = 0.5;
  var BODY_W = 15.6;
  var BODY_D = 6.6;
  var BODY_H = 1.0;
  var LIP_H = 0.15;
  var PLATE_H = 0.04;

  /* ==================== *
   * Three.js Init
   * ==================== */
  function initThree() {
    if (typeof THREE === "undefined") {
      console.warn("Three.js not loaded — 3D keyboard disabled.");
      return;
    }

    targetCameraPos = new THREE.Vector3(0, 9, 17);

    scene = new THREE.Scene();

    var w = canvasContainer.clientWidth || window.innerWidth * 0.5;
    var h = canvasContainer.clientHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.copy(targetCameraPos);
    camera.lookAt(0, 0.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasContainer.appendChild(renderer.domElement);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    var keyLight = new THREE.DirectionalLight(0xfff5e8, 1.1);
    keyLight.position.set(6, 14, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0xC9A961, 0.6);
    rimLight.position.set(-8, 4, -8);
    scene.add(rimLight);

    var fillLight = new THREE.DirectionalLight(0x4a6a8a, 0.25);
    fillLight.position.set(-6, 2, 8);
    scene.add(fillLight);

    var accentLight = new THREE.PointLight(0xC9A961, 0.5, 25, 1.5);
    accentLight.position.set(3, 6, 4);
    scene.add(accentLight);

    /* Keyboard */
    keyboardGroup = new THREE.Group();
    scene.add(keyboardGroup);
    createKeyboard(COLORS[state.activeColor]);

    /* Ground shadow */
    var gGeo = new THREE.PlaneGeometry(40, 25);
    var gMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    groundMesh = new THREE.Mesh(gGeo, gMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -BODY_H / 2 - 0.01;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    /* Particles */
    if (!state.reducedMotion) {
      createParticles();
    }

    /* Events */
    window.addEventListener("resize", onResize);
    stageEl.addEventListener("mousedown", onPointerDown);
    stageEl.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);

    requestAnimationFrame(onResize);
  }

  /* ==================== *
   * Keyboard Construction
   * ==================== */
  function createKeyboard(colorCfg) {
    /* Clear old */
    while (keyboardGroup.children.length > 0) {
      var c = keyboardGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach(function(m) {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      }
      keyboardGroup.remove(c);
    }
    keyMeshes = [];

    /* Body material (shared) */
    bodyMaterial = new THREE.MeshStandardMaterial({
      color: colorCfg.body,
      metalness: 0.88,
      roughness: 0.28
    });

    /* Main body */
    var bodyGeo = new THREE.BoxGeometry(BODY_W, BODY_H * 0.85, BODY_D);
    var body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.y = -BODY_H * 0.425;
    body.castShadow = true;
    body.receiveShadow = true;
    keyboardGroup.add(body);

    /* Top lip (slightly narrower, higher metalness) */
    lipMaterial = new THREE.MeshStandardMaterial({
      color: colorCfg.body,
      metalness: 0.92,
      roughness: 0.2
    });
    var lipGeo = new THREE.BoxGeometry(BODY_W - 0.5, LIP_H, BODY_D - 0.5);
    var lip = new THREE.Mesh(lipGeo, lipMaterial);
    lip.position.y = LIP_H / 2;
    lip.castShadow = true;
    keyboardGroup.add(lip);

    /* Inner plate (dark, where switches mount) */
    plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x0A0A0A,
      metalness: 0.4,
      roughness: 0.65
    });
    var plateGeo = new THREE.BoxGeometry(BODY_W - 1.4, PLATE_H, BODY_D - 1.0);
    var plate = new THREE.Mesh(plateGeo, plateMaterial);
    plate.position.y = LIP_H + PLATE_H / 2;
    keyboardGroup.add(plate);

    /* Keycaps */
    var keyBaseY = LIP_H + PLATE_H + KEY_H / 2;
    var startZ = -((KEY_LAYOUT.length - 1) * UNIT) / 2;

    for (var r = 0; r < KEY_LAYOUT.length; r++) {
      var row = KEY_LAYOUT[r];
      var rowW = 0;
      for (var k = 0; k < row.length; k++) rowW += row[k].w;

      var cursor = -rowW * UNIT / 2;

      for (var j = 0; j < row.length; j++) {
        var key = row[j];
        var kw = key.w * UNIT - GAP;
        var kd = UNIT - GAP;

        var keycap = createKeycap(kw, kd, key.l, colorCfg);
        keycap.position.set(cursor + kw / 2, keyBaseY, startZ + r * UNIT);
        keycap.castShadow = true;
        keycap.userData = { label: key.l, width: key.w };
        keyboardGroup.add(keycap);
        keyMeshes.push(keycap);

        cursor += key.w * UNIT;
      }
    }
  }

  function createKeycap(width, depth, label, colorCfg) {
    var geo = createKeycapGeometry(width, KEY_H, depth);

    /* Label texture on top face */
    var tex = createLabelTexture(label, colorCfg);

    var sideMat = new THREE.MeshStandardMaterial({
      color: colorCfg.keycap,
      metalness: 0.05,
      roughness: 0.55
    });
    var topMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.6,
      metalness: 0.0
    });
    var bottomMat = new THREE.MeshStandardMaterial({
      color: 0x0A0A0A,
      roughness: 0.8
    });

    /* [right, left, top, bottom, front, back] */
    var mats = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    var mesh = new THREE.Mesh(geo, mats);
    mesh.userData.label = label;
    return mesh;
  }

  function createKeycapGeometry(width, height, depth) {
    var geo = new THREE.BoxGeometry(width, height, depth);
    var pos = geo.attributes.position;

    /* Sculpt: scale top vertices to 88% for a beveled profile */
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      if (y > 0) {
        pos.setX(i, pos.getX(i) * 0.88);
        pos.setZ(i, pos.getZ(i) * 0.88);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  function createLabelTexture(label, colorCfg) {
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext("2d");

    /* Background — keycap top color */
    ctx.fillStyle = toHex(colorCfg.keycap);
    ctx.fillRect(0, 0, 256, 256);

    if (label) {
      ctx.fillStyle = colorCfg.isLight ? "#1A1A1C" : "#E8E4D9";
      var fs = label.length > 4 ? 52 : label.length > 2 ? 72 : 88;
      ctx.font = "bold " + fs + "px -apple-system, 'PingFang SC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 128, 132);
    }

    var tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function toHex(num) {
    return "#" + num.toString(16).padStart(6, "0");
  }

  /* ==================== *
   * Particles
   * ==================== */
  function createParticles() {
    var count = 180;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
      color: 0xC9A961,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  /* ==================== *
   * Color Update
   * ==================== */
  function updateKeyboardColor(colorName) {
    var cfg = COLORS[colorName];
    if (!cfg) return;
    state.activeColor = colorName;

    var startBody = bodyMaterial.color.clone();
    var startLip = lipMaterial.color.clone();
    var targetBody = new THREE.Color(cfg.body);
    var targetLip = new THREE.Color(cfg.body);

    var startKeyColors = [];
    for (var i = 0; i < keyMeshes.length; i++) {
      var m = keyMeshes[i].material[0];
      startKeyColors.push(m.color.clone());
    }
    var targetKey = new THREE.Color(cfg.keycap);

    var duration = state.reducedMotion ? 0 : 500;
    var startTime = performance.now();

    colorLerp = function() {
      var elapsed = performance.now() - startTime;
      var t = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
      var ease = 1 - Math.pow(1 - t, 3);

      bodyMaterial.color.lerpColors(startBody, targetBody, ease);
      lipMaterial.color.lerpColors(startLip, targetLip, ease);

      for (var i = 0; i < keyMeshes.length; i++) {
        var mats = keyMeshes[i].material;
        mats[0].color.lerpColors(startKeyColors[i], targetKey, ease);
        mats[1].color.copy(mats[0].color);
        mats[4].color.copy(mats[0].color);
        mats[5].color.copy(mats[0].color);
      }

      if (t >= 1) {
        /* Dispose old top textures, create new */
        for (var j = 0; j < keyMeshes.length; j++) {
          var km = keyMeshes[j];
          var old = km.material[2].map;
          km.material[2].map = createLabelTexture(km.userData.label, cfg);
          km.material[2].needsUpdate = true;
          if (old) old.dispose();
        }
        colorLerp = null;
      }
    };
  }

  function updateColorUI(colorName) {
    var cfg = COLORS[colorName];
    if (!cfg) return;

    var nameEl = document.getElementById("color-name");
    var enEl = document.getElementById("color-name-en");
    var descEl = document.getElementById("color-desc");
    var hexEl = document.getElementById("color-hex");
    var swatchLarge = document.getElementById("color-swatch-large");

    if (nameEl) nameEl.textContent = cfg.name;
    if (enEl) enEl.textContent = cfg.en;
    if (descEl) descEl.textContent = cfg.desc;
    if (hexEl) hexEl.textContent = cfg.hex;
    if (swatchLarge) swatchLarge.style.background = cfg.hex;

    document.querySelectorAll(".color-swatch").forEach(function(s) {
      s.classList.toggle("active", s.dataset.color === colorName);
    });
  }

  /* ==================== *
   * Camera per Section
   * ==================== */
  var SECTION_CAM = {
    hero:     { x: 0,  y: 9,  z: 17, lookY: 0.5 },
    features: { x: -1, y: 7,  z: 15, lookY: 0.3 },
    colors:   { x: 0,  y: 11, z: 16, lookY: 0.8 },
    buy:      { x: 1,  y: 8,  z: 19, lookY: 0.2 }
  };

  function updateCameraForSection(id) {
    if (!targetCameraPos) return;
    var c = SECTION_CAM[id] || SECTION_CAM.hero;
    targetCameraPos.set(c.x, c.y, c.z);
  }

  /* ==================== *
   * Animation Loop
   * ==================== */
  function animate() {
    requestAnimationFrame(animate);
    if (!renderer) return;

    var time = performance.now() * 0.001;

    /* Color lerp */
    if (colorLerp) colorLerp();

    /* Smooth mouse */
    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.06;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.06;

    if (!state.motionPaused && !state.reducedMotion) {
      /* Auto-rotate after idle */
      if (autoRotate && (performance.now() - lastInteract > 2000)) {
        baseRot += 0.0025;
      }

      /* Floating */
      keyboardGroup.position.y = Math.sin(time * 0.5) * 0.06;

      /* Particles */
      if (particles) {
        particles.rotation.y = time * 0.04;
        particles.position.y = Math.sin(time * 0.3) * 0.4;
      }
    }

    /* Rotation: base + drag + mouse tilt */
    keyboardGroup.rotation.y = baseRot + dragRot + mouseCurrent.x * 0.12;
    keyboardGroup.rotation.x = -0.06 - mouseCurrent.y * 0.04;

    /* Camera lerp */
    if (!state.motionPaused) {
      camera.position.lerp(targetCameraPos, 0.035);
    }
    var cam = SECTION_CAM[state.activeSection] || SECTION_CAM.hero;
    camera.lookAt(0, cam.lookY, 0);

    renderer.render(scene, camera);
  }

  /* ==================== *
   * Pointer / Drag
   * ==================== */
  function onPointerDown(e) {
    var x = e.clientX;
    if (x === undefined && e.touches) x = e.touches[0].clientX;
    if (x === undefined) return;
    isDragging = true;
    dragStartX = x;
    dragStartRot = dragRot;
    autoRotate = false;
    lastInteract = performance.now();
    if (e.cancelable) e.preventDefault();
  }

  function onPointerMove(e) {
    var cx = e.clientX;
    var cy = e.clientY;
    if (cx === undefined && e.touches) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    }
    if (cx === undefined) return;

    var rect = stageEl.getBoundingClientRect();
    mouseTarget.x = ((cx - rect.left) / rect.width) * 2 - 1;
    mouseTarget.y = -((cy - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      dragRot = dragStartRot + (cx - dragStartX) * 0.008;
      lastInteract = performance.now();
    }
  }

  function onPointerUp() {
    if (isDragging) {
      isDragging = false;
      lastInteract = performance.now();
    }
  }

  /* ==================== *
   * Resize
   * ==================== */
  function onResize() {
    if (!renderer || !camera) return;
    var w = canvasContainer.clientWidth;
    var h = canvasContainer.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ==================== *
   * Scroll / Section Observer
   * ==================== */
  function initScrollObserver() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          var id = entry.target.id;
          if (SECTION_IDS.indexOf(id) !== -1) {
            setActiveSection(id);
          }
        }
      });
    }, { threshold: 0.35, rootMargin: "-8% 0px -8% 0px" });

    SECTION_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    /* Hero is visible on load */
    var hero = document.getElementById("hero");
    if (hero) hero.classList.add("in-view");

    window.addEventListener("scroll", function() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    }, { passive: true });
  }

  /* ==================== *
   * Navigation
   * ==================== */
  function initNav() {
    document.querySelectorAll(".nav-link").forEach(function(link) {
      link.addEventListener("click", function() {
        goToSection(link.dataset.section);
      });
    });

    /* Buy button */
    var buyBtn = document.getElementById("buy-btn");
    if (buyBtn) {
      buyBtn.addEventListener("click", function() {
        buyBtn.classList.add("pulse");
        setTimeout(function() { buyBtn.classList.remove("pulse"); }, 600);
      });
    }
  }

  function updateNavUI(id) {
    document.querySelectorAll(".nav-link").forEach(function(link) {
      link.classList.toggle("active", link.dataset.section === id);
    });
  }

  /* ==================== *
   * Color Selector
   * ==================== */
  function initColorSelector() {
    document.querySelectorAll(".color-swatch").forEach(function(swatch) {
      swatch.addEventListener("click", function() {
        setColor(swatch.dataset.color);
      });
    });
  }

  /* ==================== *
   * State Management (shared by UI + test)
   * ==================== */
  function setActiveSection(id) {
    if (SECTION_IDS.indexOf(id) === -1) return;
    state.activeSection = id;
    updateNavUI(id);
    updateCameraForSection(id);
  }

  function setColor(name) {
    if (!COLORS[name]) return;
    updateKeyboardColor(name);
    updateColorUI(name);
  }

  function setMotionPaused(paused) {
    state.motionPaused = paused;
    document.body.classList.toggle("motion-paused", paused);
    if (paused) {
      keyboardGroup.position.y = 0;
      keyboardGroup.rotation.x = -0.06;
      if (particles) particles.visible = false;
    } else {
      if (particles) particles.visible = true;
      lastInteract = performance.now();
    }
  }

  function goToSection(id) {
    if (SECTION_IDS.indexOf(id) === -1) return;
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: state.reducedMotion ? "auto" : "smooth" });
    setActiveSection(id);
  }

  /* ==================== *
   * Test Interface
   * ==================== */
  function initTestInterface() {
    window.__LAUNCH_TEST__ = {
      snapshot: function() {
        return {
          sections: SECTION_IDS.map(function(id) {
            var el = document.getElementById(id);
            if (!el) return { id: id, exists: false, visible: false };
            var rect = el.getBoundingClientRect();
            var vis = rect.top < window.innerHeight && rect.bottom > 0;
            return { id: id, exists: true, visible: vis };
          }),
          activeSection: state.activeSection,
          activeColor: state.activeColor,
          motionPaused: state.motionPaused
        };
      },
      goToSection: function(id) {
        goToSection(id);
      },
      setColor: function(name) {
        setColor(name);
      },
      setMotionPaused: function(paused) {
        setMotionPaused(paused);
      }
    };
  }

  /* ==================== *
   * Init
   * ==================== */
  function init() {
    initThree();
    initScrollObserver();
    initNav();
    initColorSelector();
    initTestInterface();
    animate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

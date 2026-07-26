(() => {
  "use strict";

  const SECTION_IDS = ["hero", "features", "colors", "buy"];
  const COLOR_DATA = {
    "暮山紫": { index: "01", board: "#75627e", deep: "#42364a", light: "#9d88a7", key: "#302b33", text: "#d9d0db", note: "薄暮压过山脊，紫色只留下最安静的一层。" },
    "月白": { index: "02", board: "#d8d8cf", deep: "#85877f", light: "#f2f1ea", key: "#e4e2d9", text: "#4b4e4a", note: "月光掠过金属，温润的白保留一丝冷静。" },
    "黛青": { index: "03", board: "#315458", deep: "#193236", light: "#54787b", key: "#1e3335", text: "#bfd0ce", note: "青色沉入墨里，像雨后山林收起最后一层雾。" },
    "胭脂": { index: "04", board: "#8c4147", deep: "#51242a", light: "#b9666c", key: "#3d2528", text: "#ead0d1", note: "克制的红，不喧哗，却在光下留下清晰温度。" },
    "玄墨": { index: "05", board: "#25282b", deep: "#111315", light: "#4a4e51", key: "#17191b", text: "#c2c5c6", note: "深黑吞下反光，只让轮廓与触感慢慢浮现。" }
  };

  const state = {
    activeSection: "hero",
    activeColor: "暮山紫",
    motionPaused: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector(".site-header");
  const motionToggle = document.querySelector(".motion-toggle");
  const colorName = document.querySelector(".color-name");
  const colorIndex = document.querySelector(".color-index");
  const colorNote = document.querySelector(".color-note");
  const colorNumber = document.querySelector(".color-number");
  const buyActiveColor = document.querySelector(".buy-active-color");
  const buyButton = document.querySelector(".buy-button");
  const buyFeedback = document.querySelector(".buy-feedback");
  const keyboardStages = [...document.querySelectorAll("[data-keyboard-stage]")];

  function buildKeyboard(container) {
    const rows = [
      ["ESC", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "+", "DEL", "HOME", "PG"],
      ["TAB", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "END", "UP"],
      ["CAPS", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ENTER", "", "", ""],
      ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "SHIFT", "", "LEFT", "DOWN", "RIGHT"],
      ["CTRL", "OPT", "CMD", "", "SPACE", "", "", "CMD", "FN", "CTRL", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
    ];
    const accents = new Set(["ESC", "ENTER"]);
    rows.flat().forEach((label, index) => {
      if (!label) return;
      const key = document.createElement("span");
      key.className = "key";
      key.dataset.label = label;
      if (["TAB", "CAPS", "SHIFT", "ENTER"].includes(label)) key.classList.add("w2");
      if (label === "SPACE") key.classList.add("space");
      if (accents.has(label) || index === 72) key.classList.add("accent-key");
      container.appendChild(key);
    });
  }

  document.querySelectorAll(".keyboard-keys").forEach(buildKeyboard);

  function goToSection(id) {
    if (!SECTION_IDS.includes(id)) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ behavior: state.motionPaused ? "instant" : "smooth", block: "start" });
    state.activeSection = id;
    updateNavigation();
    return true;
  }

  function updateNavigation() {
    document.querySelectorAll("[data-section-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sectionTarget === state.activeSection);
    });
  }

  function setColor(name) {
    const color = COLOR_DATA[name];
    if (!color) return false;
    state.activeColor = name;
    root.style.setProperty("--board", color.board);
    root.style.setProperty("--board-deep", color.deep);
    root.style.setProperty("--board-light", color.light);
    root.style.setProperty("--key", color.key);
    root.style.setProperty("--key-text", color.text);
    colorName.textContent = name;
    colorIndex.textContent = `${color.index} / 05`;
    colorNote.textContent = color.note;
    colorNumber.textContent = color.index;
    buyActiveColor.textContent = name;
    keyboardStages.forEach((stage) => stage.setAttribute("aria-label", `${name}声律 75 键盘三维示意图`));
    document.querySelectorAll(".color-swatch").forEach((button) => {
      const active = button.dataset.color === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", String(active));
    });
    colorNumber.animate(
      [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: state.motionPaused ? 0 : 480, easing: "cubic-bezier(.2,.7,.2,1)" }
    );
    document.querySelectorAll(".keyboard").forEach((keyboard) => {
      keyboard.animate(
        [{ transform: "translateZ(0) scale(.965)" }, { transform: "translateZ(0) scale(1)" }],
        { duration: state.motionPaused ? 0 : 560, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    });
    return true;
  }

  function setMotionPaused(paused) {
    state.motionPaused = Boolean(paused);
    body.classList.toggle("motion-paused", state.motionPaused);
    motionToggle.setAttribute("aria-pressed", String(state.motionPaused));
    motionToggle.setAttribute("aria-label", state.motionPaused ? "继续动态效果" : "暂停动态效果");
    motionToggle.querySelector(".motion-label").textContent = state.motionPaused ? "继续动态" : "暂停动态";
    return state.motionPaused;
  }

  document.querySelectorAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => goToSection(button.dataset.sectionTarget));
  });
  document.querySelectorAll(".color-swatch").forEach((button) => {
    button.addEventListener("click", () => setColor(button.dataset.color));
  });
  motionToggle.addEventListener("click", () => setMotionPaused(!state.motionPaused));
  buyButton.addEventListener("click", () => {
    buyButton.classList.toggle("is-confirmed");
    const confirmed = buyButton.classList.contains("is-confirmed");
    buyButton.querySelector("span").textContent = confirmed ? "已记录发售提醒" : "发售日提醒我";
    buyFeedback.textContent = confirmed ? "这是虚构产品演示，提醒不会被真实发送。" : "";
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.12 });
  const revealElements = [...document.querySelectorAll("[data-reveal]")];
  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 5, 3) * 80}ms`;
    revealObserver.observe(element);
  });
  window.setTimeout(() => {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  }, state.motionPaused ? 0 : 1100);

  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    state.activeSection = visible.target.id;
    updateNavigation();
  }, { rootMargin: "-30% 0px -55%", threshold: [0, .1, .25, .5] });
  SECTION_IDS.forEach((id) => sectionObserver.observe(document.getElementById(id)));

  function handlePointer(event) {
    if (state.motionPaused) return;
    const x = (event.clientX / window.innerWidth - .5) * 2;
    const y = (event.clientY / window.innerHeight - .5) * 2;
    root.style.setProperty("--pointer-x", x.toFixed(3));
    root.style.setProperty("--pointer-y", y.toFixed(3));
  }
  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 24), { passive: true });

  const canvas = document.getElementById("ambient-canvas");
  const context = canvas.getContext("2d");
  let particles = [];
  let animationFrame = 0;

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(72, Math.floor(window.innerWidth / 18));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.1 + .2,
      speed: Math.random() * .18 + .04,
      drift: (Math.random() - .5) * .08,
      alpha: Math.random() * .32 + .08
    }));
  }

  function drawParticles() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!state.motionPaused) {
      particles.forEach((particle) => {
        particle.y -= particle.speed;
        particle.x += particle.drift;
        if (particle.y < -4) particle.y = window.innerHeight + 4;
        if (particle.x < -4) particle.x = window.innerWidth + 4;
        if (particle.x > window.innerWidth + 4) particle.x = -4;
        context.beginPath();
        context.fillStyle = `rgba(205, 216, 198, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
    }
    animationFrame = window.requestAnimationFrame(drawParticles);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  drawParticles();
  setColor(state.activeColor);
  setMotionPaused(state.motionPaused);
  updateNavigation();

  window.__LAUNCH_TEST__ = Object.freeze({
    snapshot() {
      return {
        sections: SECTION_IDS.map((id) => ({ id, exists: Boolean(document.getElementById(id)) })),
        activeSection: state.activeSection,
        activeColor: state.activeColor,
        motionPaused: state.motionPaused
      };
    },
    goToSection,
    setColor,
    setMotionPaused
  });

  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(animationFrame));
})();

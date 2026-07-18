(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const board = $("#demo-board");
  const football = $("#football");
  const footballCore = $(".football-core", football);
  const pitchGrid = $("#pitch-grid");
  const previewLine = $("#preview-line");
  const travelTrail = $("#travel-trail");
  const landingGhost = $("#landing-ghost");
  const moveCount = $("#move-count");
  const demoStatus = $("#demo-status");
  const routeSlots = $$("#route-slots li");
  const directionButtons = $$("[data-direction]");
  const victoryPanel = $("#victory-panel");
  const victoryCopy = $("#victory-copy");
  const motionButton = $("#motion-toggle");
  const motionLabel = $(".motion-label", motionButton);

  const INITIAL_BALL = Object.freeze({ row: 4, col: 0 });
  const GOAL = Object.freeze({ row: 1, col: 5 });
  const BOARD_SIZE = 6;
  const OBSTACLES = new Set(["4,5", "0,4"]);
  const DIRECTIONS = Object.freeze({
    up: { row: -1, col: 0, label: "上" },
    down: { row: 1, col: 0, label: "下" },
    left: { row: 0, col: -1, label: "左" },
    right: { row: 0, col: 1, label: "右" }
  });

  const state = {
    phase: "ready",
    moves: 0,
    ball: { ...INITIAL_BALL },
    goal: { ...GOAL },
    interacted: false,
    motionPaused: false,
    activeSection: "play",
    assetsReady: false,
    directions: []
  };

  let travelPoints = [`${INITIAL_BALL.col + 0.5},${INITIAL_BALL.row + 0.5}`];
  let actionToken = 0;
  let movementTimer = 0;
  let movementResolve = null;
  let movementPromise = null;
  let feedbackTimer = 0;
  let ruleTimer = 0;
  let userMotionPaused = false;
  let pageHidden = document.hidden;
  let windowBlurred = !document.hasFocus();
  let scrollQueued = false;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  function snapshot() {
    return {
      phase: state.phase,
      moves: state.moves,
      ball: { ...state.ball },
      goal: { ...state.goal },
      interacted: state.interacted,
      motionPaused: state.motionPaused,
      activeSection: state.activeSection,
      assetsReady: state.assetsReady
    };
  }

  function buildPitch() {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("span");
        cell.className = "pitch-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        fragment.appendChild(cell);
      }
    }
    pitchGrid.replaceChildren(fragment);
  }

  function buildConfetti() {
    const colors = ["#f4c430", "#f3f8ef", "#2fa35a", "#d9a321"];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 22; index += 1) {
      const piece = document.createElement("span");
      const x = 5 + ((index * 41) % 91);
      const drift = -52 + ((index * 29) % 105);
      const spin = 300 + ((index * 73) % 520);
      const fall = 1.15 + ((index % 6) * 0.13);
      const delay = (index % 8) * 0.045;
      piece.style.setProperty("--x", `${x}%`);
      piece.style.setProperty("--drift", `${drift}px`);
      piece.style.setProperty("--spin", `${spin}deg`);
      piece.style.setProperty("--fall", `${fall}s`);
      piece.style.setProperty("--delay", `${delay}s`);
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      fragment.appendChild(piece);
    }
    $("#confetti").replaceChildren(fragment);
  }

  function getTarget(direction) {
    const delta = DIRECTIONS[direction];
    if (!delta) return null;

    let row = state.ball.row;
    let col = state.ball.col;
    let won = false;

    while (true) {
      const nextRow = row + delta.row;
      const nextCol = col + delta.col;
      const outside = nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE;
      if (outside || OBSTACLES.has(`${nextRow},${nextCol}`)) break;

      row = nextRow;
      col = nextCol;
      if (row === GOAL.row && col === GOAL.col) {
        won = true;
        break;
      }
    }

    return {
      row,
      col,
      won,
      distance: Math.abs(row - state.ball.row) + Math.abs(col - state.ball.col)
    };
  }

  function showPreview(direction) {
    if (state.phase !== "ready" || !DIRECTIONS[direction]) return;
    const target = getTarget(direction);
    if (!target || target.distance === 0) {
      clearPreview();
      return;
    }

    previewLine.setAttribute("x1", String(state.ball.col + 0.5));
    previewLine.setAttribute("y1", String(state.ball.row + 0.5));
    previewLine.setAttribute("x2", String(target.col + 0.5));
    previewLine.setAttribute("y2", String(target.row + 0.5));
    landingGhost.style.setProperty("--row", String(target.row));
    landingGhost.style.setProperty("--col", String(target.col));
    board.classList.add("is-previewing");
  }

  function clearPreview() {
    board.classList.remove("is-previewing");
  }

  function updateRouteTrail() {
    travelTrail.setAttribute("points", travelPoints.join(" "));
  }

  function updateInterface() {
    moveCount.textContent = String(state.moves);
    routeSlots.forEach((slot, index) => {
      const direction = state.directions[index];
      slot.textContent = direction ? DIRECTIONS[direction].label : "—";
      slot.classList.toggle("is-filled", Boolean(direction));
    });
    directionButtons.forEach((button) => {
      button.disabled = state.phase === "moving" || state.phase === "won";
    });
  }

  function bumpMoveCount() {
    moveCount.classList.remove("is-bumped");
    void moveCount.offsetWidth;
    moveCount.classList.add("is-bumped");
    window.setTimeout(() => moveCount.classList.remove("is-bumped"), 210);
  }

  function markBlocked() {
    window.clearTimeout(feedbackTimer);
    board.classList.remove("is-blocked");
    void board.offsetWidth;
    board.classList.add("is-blocked");
    feedbackTimer = window.setTimeout(() => {
      board.classList.remove("is-blocked");
      feedbackTimer = 0;
    }, 290);
  }

  function settleMovement() {
    window.clearTimeout(movementTimer);
    movementTimer = 0;
    if (movementResolve) {
      const resolve = movementResolve;
      movementResolve = null;
      movementPromise = null;
      resolve(snapshot());
    }
  }

  function announce(message) {
    demoStatus.textContent = message;
  }

  function celebrate() {
    state.phase = "won";
    victoryCopy.textContent = state.moves === 3 ? "标准路线完成 · 3 步" : `${state.moves} 步完成路线`;
    victoryPanel.setAttribute("aria-hidden", "false");
    board.classList.add("is-won", "is-celebrating");
    announce(`进球！${state.moves} 步完成挑战，已经晋级。`);
  }

  function moveBall(direction) {
    if (!DIRECTIONS[direction]) return Promise.resolve(snapshot());
    if (state.phase === "moving") return movementPromise || Promise.resolve(snapshot());
    if (state.phase === "won") {
      announce("本轮已经晋级，可选择再挑战一次。");
      return Promise.resolve(snapshot());
    }

    state.interacted = true;
    const target = getTarget(direction);
    clearPreview();

    if (!target || target.distance === 0) {
      markBlocked();
      announce("这个方向没有可移动空间，换一条路线试试。");
      return Promise.resolve(snapshot());
    }

    const token = ++actionToken;
    state.phase = "moving";
    state.moves += 1;
    state.directions.push(direction);
    state.ball = { row: target.row, col: target.col };
    travelPoints.push(`${target.col + 0.5},${target.row + 0.5}`);
    updateRouteTrail();
    updateInterface();
    bumpMoveCount();

    const duration = motionPreference.matches ? 1 : 190 + target.distance * 66;
    football.style.setProperty("--move-duration", `${duration}ms`);
    football.style.setProperty("--row", String(target.row));
    football.style.setProperty("--col", String(target.col));
    football.classList.remove("is-moving");
    void footballCore.offsetWidth;
    football.classList.add("is-moving");
    announce(`第 ${state.moves} 步：向${DIRECTIONS[direction].label}滑动，正在抵达停点。`);

    movementPromise = new Promise((resolve) => {
      movementResolve = resolve;
      movementTimer = window.setTimeout(() => {
        if (token !== actionToken) {
          settleMovement();
          return;
        }

        football.classList.remove("is-moving");
        if (target.won) {
          celebrate();
        } else {
          state.phase = "ready";
          announce(`第 ${state.moves} 步落点：第 ${target.row + 1} 行、第 ${target.col + 1} 列。继续判断路线。`);
        }
        updateInterface();
        settleMovement();
      }, duration + 45);
    });
    return movementPromise;
  }

  function resetDemo() {
    actionToken += 1;
    window.clearTimeout(movementTimer);
    movementTimer = 0;
    window.clearTimeout(feedbackTimer);
    feedbackTimer = 0;

    state.phase = "ready";
    state.moves = 0;
    state.ball = { ...INITIAL_BALL };
    state.interacted = false;
    state.directions = [];
    travelPoints = [`${INITIAL_BALL.col + 0.5},${INITIAL_BALL.row + 0.5}`];

    football.classList.remove("is-moving");
    football.style.transition = "none";
    football.style.setProperty("--move-duration", "0ms");
    football.style.setProperty("--row", String(INITIAL_BALL.row));
    football.style.setProperty("--col", String(INITIAL_BALL.col));
    void football.offsetWidth;
    football.style.removeProperty("transition");

    board.classList.remove("is-won", "is-celebrating", "is-blocked", "is-previewing");
    victoryPanel.setAttribute("aria-hidden", "true");
    clearPreview();
    updateRouteTrail();
    updateInterface();
    announce("等你开球：三步内抵达右上方球门");

    if (movementResolve) {
      const resolve = movementResolve;
      movementResolve = null;
      movementPromise = null;
      resolve(snapshot());
    }
    return snapshot();
  }

  function bindBoardInputs() {
    let gesture = null;

    board.addEventListener("pointerdown", (event) => {
      if (state.phase !== "ready") return;
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        direction: null
      };
      board.setPointerCapture(event.pointerId);
    });

    board.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.id !== event.pointerId || state.phase !== "ready") return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      const direction = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");
      if (gesture.direction !== direction) {
        gesture.direction = direction;
        showPreview(direction);
      }
    });

    const finishGesture = (event, cancelled = false) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const direction = gesture.direction;
      gesture = null;
      clearPreview();
      if (!cancelled && direction && distance >= 22) void moveBall(direction);
    };

    board.addEventListener("pointerup", (event) => finishGesture(event));
    board.addEventListener("pointercancel", (event) => finishGesture(event, true));
    board.addEventListener("lostpointercapture", () => {
      gesture = null;
      clearPreview();
    });

    board.addEventListener("keydown", (event) => {
      const keyMap = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right"
      };
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      void moveBall(direction);
    });

    directionButtons.forEach((button) => {
      const direction = button.dataset.direction;
      button.addEventListener("pointerenter", () => showPreview(direction));
      button.addEventListener("pointerleave", clearPreview);
      button.addEventListener("focus", () => showPreview(direction));
      button.addEventListener("blur", clearPreview);
      button.addEventListener("click", () => void moveBall(direction));
    });

    $("#demo-reset").addEventListener("click", () => {
      resetDemo();
      board.focus({ preventScroll: true });
    });

    $("#victory-reset").addEventListener("click", () => {
      resetDemo();
      board.focus({ preventScroll: true });
    });

    $("#focus-demo").addEventListener("click", () => {
      state.interacted = true;
      board.scrollIntoView({ behavior: state.motionPaused ? "auto" : "smooth", block: "center" });
      window.setTimeout(() => board.focus({ preventScroll: true }), state.motionPaused ? 0 : 380);
    });

    const hintButton = $("#hint-button");
    const hintCopy = $("#hint-copy");
    hintButton.addEventListener("click", () => {
      const expanded = hintButton.getAttribute("aria-expanded") === "true";
      hintButton.setAttribute("aria-expanded", String(!expanded));
      hintButton.textContent = expanded ? "需要路线提示" : "收起路线提示";
      hintCopy.hidden = expanded;
      state.interacted = true;
    });
  }

  const RULES = [
    {
      scene: "basic",
      kicker: "先理解停点",
      title: "基础移动",
      description: "每次选择一个方向，足球沿直线滑到障碍前或边界。第一件事不是动手，而是看清下一个停点。",
      effect: "方向决定下一次选择的位置",
      visual: '<span class="visual-route"></span><span class="visual-ball"></span><span class="visual-stop"></span><span class="scene-label">一滑到底 · 停在边界前</span>'
    },
    {
      scene: "mud",
      kicker: "地面开始干预",
      title: "泥地",
      description: "泥地会改变一次滑动的结果。原本笔直的安全路线，可能提前停下，也可能让后续方向完全不同。",
      effect: "落点被提前改写，需要重新计算",
      visual: '<span class="visual-route"></span><span class="visual-ball"></span><span class="visual-mud"></span><span class="scene-label">泥地 · 改变停点</span>'
    },
    {
      scene: "turn",
      kicker: "方向不再自由",
      title: "转向箭头",
      description: "踩中转向箭头后，移动方向会被重新引导。你要提前看到转弯后的第二段路线，而不只看眼前。",
      effect: "一次选择，可能带出连续转向",
      visual: '<span class="visual-route" style="width:38%"></span><span class="visual-ball"></span><span class="visual-turn"></span><span class="scene-label">箭头 · 强制转向</span>'
    },
    {
      scene: "offside",
      kicker: "位置也有规则",
      title: "越位",
      description: "路线抵达禁区还不够，位置关系也必须合法。越位线让最短路径未必是正确路径。",
      effect: "到达目标之前，先检查站位",
      visual: '<span class="visual-route"></span><span class="visual-ball"></span><span class="visual-offside"></span><span class="scene-label">越位 · 最短不等于可行</span>'
    },
    {
      scene: "teams",
      kicker: "场上关系加入",
      title: "队友 / 对手",
      description: "队友可以成为配合节点，对手则会封住关键落点。相同的球场格局，会因为角色关系出现不同解法。",
      effect: "谁在停点上，决定路线能否继续",
      visual: '<span class="visual-route" style="width:48%"></span><span class="visual-ball"></span><span class="visual-person one">队友</span><span class="visual-person two">对手</span><span class="scene-label">角色 · 配合与封堵</span>'
    },
    {
      scene: "keeper",
      kicker: "门前判断升级",
      title: "对手门将",
      description: "对手门将守住最后一线。射门路径、入门方向和抵达顺序要一起考虑，破门不再只是碰到球门。",
      effect: "最终一脚也需要规划角度",
      visual: '<span class="visual-route" style="width:52%"></span><span class="visual-ball"></span><img class="visual-keeper" src="assets/keeper.png" alt=""><span class="scene-label">门将 · 封锁角度</span>'
    },
    {
      scene: "card",
      kicker: "风险进入路线",
      title: "黄牌",
      description: "有些路线虽然能走，却会带来黄牌风险。稳妥通关需要在步数、位置和代价之间做选择。",
      effect: "可走的路线，也可能不是好路线",
      visual: '<span class="visual-route"></span><span class="visual-ball"></span><span class="visual-card"></span><span class="scene-label">黄牌 · 路线带有代价</span>'
    },
    {
      scene: "portal",
      kicker: "空间被重新连接",
      title: "传送门",
      description: "传送门把远端格子直接连在一起。画面上的距离不再可靠，你需要在脑中重建一张新的路线图。",
      effect: "入口与出口，重写空间关系",
      visual: '<span class="visual-route" style="width:28%"></span><span class="visual-ball"></span><span class="visual-portal one"></span><span class="visual-portal two"></span><span class="scene-label">传送门 · 重连球场</span>'
    }
  ];

  function setRule(index, options = {}) {
    const safeIndex = (index + RULES.length) % RULES.length;
    const rule = RULES[safeIndex];
    const stage = $("#rule-stage");
    const tabs = $$(".rule-rail [data-rule]");

    window.clearTimeout(ruleTimer);
    stage.classList.add("is-changing");
    ruleTimer = window.setTimeout(() => {
      stage.dataset.scene = rule.scene;
      $("#rule-kicker").textContent = rule.kicker;
      $("#rule-count").textContent = `${String(safeIndex + 1).padStart(2, "0")} / 08`;
      $("#rule-title").textContent = rule.title;
      $("#rule-description").textContent = rule.description;
      $("#rule-effect").textContent = rule.effect;
      $("#rule-visual").innerHTML = rule.visual;
      $("#rule-progress").style.transform = `scaleX(${(safeIndex + 1) / RULES.length})`;

      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === safeIndex;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      const activeTab = tabs[safeIndex];
      if (options.focus) activeTab.focus({ preventScroll: true });
      activeTab.scrollIntoView({ behavior: state.motionPaused ? "auto" : "smooth", block: "nearest", inline: "center" });

      stage.classList.remove("is-changing");
      ruleTimer = 0;
    }, motionPreference.matches ? 0 : 120);
  }

  function bindRuleExplorer() {
    const tabs = $$(".rule-rail [data-rule]");
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => setRule(index));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        setRule(index + (event.key === "ArrowRight" ? 1 : -1), { focus: true });
      });
    });
    $("#rule-visual").innerHTML = RULES[0].visual;
  }

  const PROOF_LABELS = [
    "开局，先读路线",
    "移动后，局面改变",
    "三星晋级，结果收束"
  ];
  let proofIndex = 0;

  function setProof(index) {
    proofIndex = (index + PROOF_LABELS.length) % PROOF_LABELS.length;
    const stage = $("#phone-stage");
    const slides = $$(".proof-slide");
    const tabs = $$(".proof-tabs [data-proof]");
    const filmFrames = $$(".film-frame");

    stage.classList.remove("is-switching");
    void stage.offsetWidth;
    stage.classList.add("is-switching");
    slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === proofIndex));
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === proofIndex;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    filmFrames.forEach((frame, frameIndex) => frame.classList.toggle("is-active", frameIndex === proofIndex));
    $("#proof-status").textContent = `正在展示：${PROOF_LABELS[proofIndex]}`;
  }

  function bindProof() {
    $$("#proof [data-proof]").forEach((button) => {
      button.addEventListener("click", () => setProof(Number(button.dataset.proof)));
    });
    $("#proof-prev").addEventListener("click", () => setProof(proofIndex - 1));
    $("#proof-next").addEventListener("click", () => setProof(proofIndex + 1));

    const stage = $("#phone-stage");
    let drag = null;
    stage.addEventListener("pointerdown", (event) => {
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) > 10) {
        stage.style.transform = `translateX(${Math.max(-22, Math.min(22, dx * 0.12))}px)`;
      }
    });
    const finishDrag = (event, cancelled = false) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      drag = null;
      stage.classList.remove("is-dragging");
      stage.style.removeProperty("transform");
      if (!cancelled && Math.abs(dx) >= 36) setProof(proofIndex + (dx < 0 ? 1 : -1));
    };
    stage.addEventListener("pointerup", (event) => finishDrag(event));
    stage.addEventListener("pointercancel", (event) => finishDrag(event, true));
    stage.addEventListener("lostpointercapture", () => {
      drag = null;
      stage.classList.remove("is-dragging");
      stage.style.removeProperty("transform");
    });
    stage.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      setProof(proofIndex + (event.key === "ArrowRight" ? 1 : -1));
    });
  }

  function applyMotionState() {
    const effectivePause = userMotionPaused || pageHidden || windowBlurred || motionPreference.matches;
    state.motionPaused = effectivePause;
    document.documentElement.classList.toggle("motion-paused", effectivePause);
    motionButton.setAttribute("aria-pressed", String(effectivePause));
    motionButton.setAttribute("aria-label", effectivePause ? "继续页面自动动效" : "暂停页面自动动效");
    motionLabel.textContent = effectivePause ? "继续动效" : "暂停动效";
  }

  function setMotionPaused(paused) {
    userMotionPaused = Boolean(paused);
    applyMotionState();
    return snapshot();
  }

  function bindMotionControls() {
    motionButton.addEventListener("click", () => setMotionPaused(!userMotionPaused));
    document.addEventListener("visibilitychange", () => {
      pageHidden = document.hidden;
      applyMotionState();
    });
    window.addEventListener("blur", () => {
      windowBlurred = true;
      applyMotionState();
    });
    window.addEventListener("focus", () => {
      windowBlurred = false;
      applyMotionState();
    });
    const onPreferenceChange = () => applyMotionState();
    if (typeof motionPreference.addEventListener === "function") {
      motionPreference.addEventListener("change", onPreferenceChange);
    } else if (typeof motionPreference.addListener === "function") {
      motionPreference.addListener(onPreferenceChange);
    }
    applyMotionState();
  }

  function updateActiveSection(id) {
    if (!["play", "journey", "proof", "play-now"].includes(id)) return;
    state.activeSection = id;
    $$('[data-nav]').forEach((link) => {
      if (link.dataset.nav === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function updateScrollState() {
    scrollQueued = false;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
    $("#scroll-progress-bar").style.transform = `scaleX(${progress})`;

    const sections = $$('[data-section]');
    const checkpoint = window.innerHeight * 0.42;
    let current = sections[0]?.id || "play";
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= checkpoint) current = section.id;
    });
    updateActiveSection(current);
  }

  function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollState);
  }

  function goToSection(id) {
    if (!["play", "journey", "proof", "play-now"].includes(id)) return snapshot();
    const target = document.getElementById(id);
    updateActiveSection(id);
    target.scrollIntoView({ behavior: state.motionPaused ? "auto" : "smooth", block: "start" });
    return snapshot();
  }

  function bindScrollStory() {
    window.addEventListener("scroll", queueScrollUpdate, { passive: true });
    window.addEventListener("resize", queueScrollUpdate, { passive: true });
    updateScrollState();

    const revealElements = $$(".reveal-on-scroll");
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  function bindAssetFallbacks() {
    const assets = $$('img[data-asset]');
    const markSettled = () => {
      const allSettled = assets.every((image) => image.complete);
      state.assetsReady = allSettled && assets.every((image) => image.naturalWidth > 0);
      document.documentElement.classList.toggle("assets-ready", state.assetsReady);
    };

    assets.forEach((image) => {
      const frame = image.closest(".asset-frame, .film-frame");
      const onLoad = () => {
        if (frame) frame.classList.remove("asset-error");
        markSettled();
      };
      const onError = () => {
        if (frame) frame.classList.add("asset-error");
        markSettled();
      };
      image.addEventListener("load", onLoad, { once: true });
      image.addEventListener("error", onError, { once: true });
      if (image.complete) {
        if (image.naturalWidth > 0) onLoad();
        else onError();
      }
    });
    window.addEventListener("load", markSettled, { once: true });
    markSettled();
  }

  function bindCallToAction() {
    const button = $("#wechat-cta");
    const feedback = $("#cta-feedback");
    button.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText("一脚晋级");
        feedback.textContent = "名称已复制。打开微信，在搜索栏粘贴即可。";
      } catch (_error) {
        feedback.textContent = "请打开微信，在搜索栏输入“一脚晋级”。";
      }
    });
  }

  function init() {
    buildPitch();
    buildConfetti();
    updateRouteTrail();
    bindBoardInputs();
    bindRuleExplorer();
    bindProof();
    bindMotionControls();
    bindScrollStory();
    bindAssetFallbacks();
    bindCallToAction();
    updateInterface();

    window.__ONEKICK_TEST__ = Object.freeze({
      snapshot,
      resetDemo,
      move: moveBall,
      setMotionPaused,
      goToSection
    });
  }

  init();
})();

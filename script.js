const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-menu-toggle]");
const timeline = document.querySelector("[data-timeline]");
const processSection = timeline?.closest(".process");
const processSteps = timeline ? [...timeline.querySelectorAll("[data-process-step]")] : [];
const hero = document.querySelector("[data-hero]");
const heroCanvas = hero?.querySelector("[data-hero-mesh]");
const heroPortrait = hero?.querySelector("[data-hero-portrait]");
const processNumberEls = document.querySelectorAll("[data-process-number]");
const comparisons = document.querySelectorAll("[data-comparison]");
const projectCards = document.querySelectorAll(".project-card");
const navLinks = [...document.querySelectorAll(".nav a[href^=\"#\"]")];
const navTargets = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
let processStageIndex = 0;
let processWheelReady = true;

const setHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

setHeader();
window.addEventListener("scroll", setHeader, { passive: true });

toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

const updateActiveNav = () => {
  if (!navTargets.length) return;
  const marker = window.scrollY + Math.min(window.innerHeight * .38, 320);
  let activeId = navTargets[0].id;

  navTargets.forEach((section) => {
    if (section.offsetTop <= marker) activeId = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${activeId}`);
  });
};

updateActiveNav();
window.addEventListener("scroll", updateActiveNav, { passive: true });
window.addEventListener("resize", updateActiveNav);
nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
  observer.observe(item);
});

const setProcessStage = (index) => {
  if (!processSteps.length) return;
  processStageIndex = Math.min(Math.max(index, 0), processSteps.length - 1);
  const progress = processSteps.length > 1 ? processStageIndex / (processSteps.length - 1) : 0;
  const bgShift = `${((progress - .5) * 96).toFixed(1)}px`;
  const dotShift = `${((progress - .5) * -54).toFixed(1)}px`;

  timeline?.style.setProperty("--progress", progress.toFixed(3));
  processSection?.style.setProperty("--process-bg-y", bgShift);
  processSection?.style.setProperty("--process-dot-y", dotShift);

  processSteps.forEach((step, index) => {
    step.classList.toggle("is-active", index === processStageIndex);
    step.classList.toggle("is-past", index < processStageIndex);
  });

  const currentStep = processSteps[processStageIndex]?.dataset.step || "01";
  processNumberEls.forEach((number) => {
    number.textContent = currentStep;
  });
};

const updateTimeline = () => {
  if (!timeline || !processSteps.length) return;
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const isStageMode = window.matchMedia("(min-width: 981px)").matches;

  if (isStageMode) {
    setProcessStage(processStageIndex);
    return;
  }

  let activeIndex = 0;
  let activeDistance = Infinity;

  processSteps.forEach((step, index) => {
    const stepRect = step.getBoundingClientRect();
    const stepCenter = stepRect.top + stepRect.height / 2;
    const distance = Math.abs(stepCenter - viewport * .52);

    if (distance < activeDistance) {
      activeDistance = distance;
      activeIndex = index;
    }
  });

  setProcessStage(activeIndex);
};

updateTimeline();
window.addEventListener("scroll", updateTimeline, { passive: true });
window.addEventListener("resize", updateTimeline);

processSection?.addEventListener("wheel", (event) => {
  if (!window.matchMedia("(min-width: 981px)").matches || !processSteps.length) return;

  const rect = processSection.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const isInStage = rect.top < viewport * .78 && rect.bottom > viewport * .22;
  const direction = Math.sign(event.deltaY);

  if (!isInStage || direction === 0) return;
  if (direction > 0 && processStageIndex === processSteps.length - 1) return;
  if (direction < 0 && processStageIndex === 0) return;

  event.preventDefault();
  if (!processWheelReady) return;

  processWheelReady = false;
  setProcessStage(processStageIndex + direction);
  processSection.scrollIntoView({ block: "center", behavior: "smooth" });

  window.setTimeout(() => {
    processWheelReady = true;
  }, 520);
}, { passive: false });


if (hero && heroPortrait) {
  const revealHeroPortrait = () => {
    requestAnimationFrame(() => hero.classList.add("is-portrait-ready"));
  };

  if (heroPortrait.complete) {
    revealHeroPortrait();
  } else {
    heroPortrait.addEventListener("load", revealHeroPortrait, { once: true });
  }
}

if (hero && heroCanvas) {
  const context = heroCanvas.getContext("2d", { alpha: true, desynchronized: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
  const pointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    strength: 0,
    targetStrength: 0,
  };
  let canvasWidth = 1;
  let canvasHeight = 1;
  let animationFrame = null;
  let heroIsVisible = true;
  let lastFrameTime = 0;
  let contentZone = null;
  const fireflies = [];
  const heroContent = hero.querySelector(".hero-content");

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const smoothstep = (edgeStart, edgeEnd, value) => {
    const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
    return progress * progress * (3 - 2 * progress);
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const updateContentZone = () => {
    if (!heroContent) {
      contentZone = null;
      return;
    }
    const heroRect = hero.getBoundingClientRect();
    const contentRect = heroContent.getBoundingClientRect();
    const padding = canvasWidth < 640 ? 18 : 34;
    contentZone = {
      left: contentRect.left - heroRect.left - padding,
      right: contentRect.right - heroRect.left + padding,
      top: contentRect.top - heroRect.top - padding,
      bottom: contentRect.bottom - heroRect.top + padding,
    };
  };

  const isInsideContentZone = (x, y) => contentZone
    && x > contentZone.left
    && x < contentZone.right
    && y > contentZone.top
    && y < contentZone.bottom;

  const createFirefly = (index) => {
    let x = randomBetween(24, Math.max(25, canvasWidth - 24));
    let y = randomBetween(90, Math.max(91, canvasHeight - 32));

    for (let attempt = 0; attempt < 12 && isInsideContentZone(x, y); attempt += 1) {
      x = randomBetween(24, Math.max(25, canvasWidth - 24));
      y = randomBetween(90, Math.max(91, canvasHeight - 32));
    }

    const prominent = index % 5 === 0;
    return {
      x,
      y,
      heading: randomBetween(0, Math.PI * 2),
      speed: randomBetween(.026, .058),
      curve: randomBetween(.00012, .0003),
      curveRate: randomBetween(.00022, .0005),
      phase: randomBetween(0, Math.PI * 2),
      pulseRate: randomBetween(.00045, .0009),
      size: prominent ? randomBetween(1.25, 1.7) : randomBetween(.65, 1.2),
      influence: prominent ? randomBetween(120, 155) : randomBetween(82, 128),
      reveal: prominent ? randomBetween(.13, .18) : randomBetween(.055, .105),
      glow: prominent ? randomBetween(.42, .58) : randomBetween(.2, .36),
    };
  };

  const syncFireflies = () => {
    const targetCount = canvasWidth < 640 ? 4 : (canvasWidth < 1000 ? 7 : 11);
    while (fireflies.length < targetCount) fireflies.push(createFirefly(fireflies.length));
    if (fireflies.length > targetCount) fireflies.length = targetCount;
  };

  const updateFireflies = (time, deltaTime) => {
    const margin = 48;
    for (const firefly of fireflies) {
      firefly.heading += Math.sin(time * firefly.curveRate + firefly.phase) * firefly.curve * deltaTime;
      firefly.x += Math.cos(firefly.heading) * firefly.speed * deltaTime;
      firefly.y += Math.sin(firefly.heading) * firefly.speed * deltaTime;

      if (firefly.x < -margin) firefly.x = canvasWidth + margin;
      else if (firefly.x > canvasWidth + margin) firefly.x = -margin;
      if (firefly.y < -margin) firefly.y = canvasHeight + margin;
      else if (firefly.y > canvasHeight + margin) firefly.y = -margin;
    }
  };

  const getFireflyReveal = (x, y, time) => {
    let reveal = 0;
    for (const firefly of fireflies) {
      const distance = Math.hypot(x - firefly.x, y - firefly.y);
      if (distance >= firefly.influence) continue;
      const pulse = .86 + Math.sin(time * firefly.pulseRate + firefly.phase) * .14;
      reveal += (1 - smoothstep(firefly.influence * .12, firefly.influence, distance)) * firefly.reveal * pulse;
    }
    return reveal;
  };

  const getRevealStrength = (x, y, time) => {
    if (reducedMotion.matches) {
      const radius = Math.max(240, Math.min(canvasWidth, canvasHeight) * .46);
      const distance = Math.hypot(x - canvasWidth * .52, y - canvasHeight * .48);
      return .008 + (1 - smoothstep(radius * .22, radius, distance)) * .052;
    }

    let interactionReveal;
    if (coarsePointer.matches) {
      const radius = Math.max(190, Math.min(canvasWidth, canvasHeight) * .48);
      const firstX = canvasWidth * (.5 + Math.sin(time * .00011) * .28);
      const firstY = canvasHeight * (.48 + Math.cos(time * .000085) * .24);
      const secondX = canvasWidth * (.5 + Math.cos(time * .000073 + 1.8) * .34);
      const secondY = canvasHeight * (.52 + Math.sin(time * .000094 + .7) * .2);
      const first = 1 - smoothstep(radius * .18, radius, Math.hypot(x - firstX, y - firstY));
      const second = 1 - smoothstep(radius * .16, radius * .88, Math.hypot(x - secondX, y - secondY));
      interactionReveal = .005 + first * .11 + second * .06;
    } else {
      const radius = clamp(Math.min(canvasWidth, canvasHeight) * .36, 210, 360);
      const distance = Math.hypot(x - pointer.x, y - pointer.y);
      const reveal = 1 - smoothstep(radius * .14, radius, distance);
      const ambient = (Math.sin(time * .00022 + x * .006 + y * .004) + 1) * .0015;
      interactionReveal = .003 + ambient + reveal * pointer.strength * .4;
    }

    return Math.min(interactionReveal + getFireflyReveal(x, y, time), .42);
  };

  const drawFireflies = (time) => {
    if (reducedMotion.matches) return;

    context.save();
    context.globalCompositeOperation = "screen";
    for (const firefly of fireflies) {
      if (isInsideContentZone(firefly.x, firefly.y)) continue;
      const pulse = .86 + Math.sin(time * firefly.pulseRate + firefly.phase) * .14;
      const alpha = firefly.glow * pulse * (coarsePointer.matches ? .78 : 1);

      context.beginPath();
      context.shadowBlur = firefly.size * (coarsePointer.matches ? 5 : 7);
      context.shadowColor = `rgba(212, 175, 98, ${(alpha * .72).toFixed(3)})`;
      context.fillStyle = `rgba(212, 175, 98, ${(alpha * .42).toFixed(3)})`;
      context.arc(firefly.x, firefly.y, firefly.size * 2.2, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.shadowBlur = firefly.size * 2.5;
      context.fillStyle = `rgba(255, 242, 178, ${Math.min(alpha * .9, .62).toFixed(3)})`;
      context.arc(firefly.x, firefly.y, firefly.size * .72, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };

  const drawMesh = (time = 0) => {
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const spacing = coarsePointer.matches
      ? (canvasWidth < 640 ? 70 : 78)
      : (canvasWidth > 1500 ? 72 : 64);
    const offsetX = (canvasWidth % spacing) / 2;
    const offsetY = (canvasHeight % spacing) / 2;
    const columns = Math.ceil(canvasWidth / spacing) + 1;
    const rows = Math.ceil(canvasHeight / spacing) + 1;

    context.lineWidth = .7;
    context.shadowBlur = 2.5;
    context.shadowColor = "rgba(201, 164, 92, .1)";

    const strokeSegment = (x1, y1, x2, y2, alpha) => {
      if (alpha < .006) return;
      const tone = clamp((x1 + y1) / Math.max(canvasWidth + canvasHeight, 1), 0, 1);
      const red = Math.round(201 + tone * 11);
      const green = Math.round(164 + tone * 11);
      const blue = Math.round(92 + tone * 6);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(alpha, .42).toFixed(3)})`;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    };

    for (let row = -1; row < rows; row += 1) {
      const y = offsetY + row * spacing;
      for (let column = -1; column < columns; column += 1) {
        const x = offsetX + column * spacing;
        const horizontalAlpha = getRevealStrength(x + spacing / 2, y, time);
        const verticalAlpha = getRevealStrength(x, y + spacing / 2, time);
        strokeSegment(x, y, x + spacing, y, horizontalAlpha);
        strokeSegment(x, y, x, y + spacing, verticalAlpha);

        const cornerAlpha = Math.max(horizontalAlpha, verticalAlpha);
        if ((row + column) % 5 === 0 && cornerAlpha > .025) {
          context.fillStyle = `rgba(212, 175, 98, ${Math.min(cornerAlpha * .52, .18).toFixed(3)})`;
          context.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }

    context.shadowBlur = 0;
    drawFireflies(time);
  };

  const resizeHeroCanvas = () => {
    const rect = hero.getBoundingClientRect();
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    canvasWidth = Math.max(1, Math.round(rect.width));
    canvasHeight = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    heroCanvas.width = Math.round(canvasWidth * pixelRatio);
    heroCanvas.height = Math.round(canvasHeight * pixelRatio);
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    pointer.x = pointer.targetX = canvasWidth / 2;
    pointer.y = pointer.targetY = canvasHeight / 2;
    updateContentZone();
    if (previousWidth > 1 && previousHeight > 1) {
      for (const firefly of fireflies) {
        firefly.x *= canvasWidth / previousWidth;
        firefly.y *= canvasHeight / previousHeight;
      }
    }
    syncFireflies();
    drawMesh(performance.now());
  };

  const animateHeroMesh = (time) => {
    const deltaTime = lastFrameTime ? Math.min(time - lastFrameTime, 40) : 16;
    lastFrameTime = time;
    pointer.x += (pointer.targetX - pointer.x) * .16;
    pointer.y += (pointer.targetY - pointer.y) * .16;
    pointer.strength += (pointer.targetStrength - pointer.strength) * .1;
    updateFireflies(time, deltaTime);
    drawMesh(time);
    animationFrame = requestAnimationFrame(animateHeroMesh);
  };

  const startHeroMesh = () => {
    if (animationFrame || reducedMotion.matches || !heroIsVisible) return;
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(animateHeroMesh);
  };

  const stopHeroMesh = () => {
    if (!animationFrame) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastFrameTime = 0;
  };

  hero.addEventListener("pointermove", (event) => {
    if (coarsePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    pointer.targetX = event.clientX - rect.left;
    pointer.targetY = event.clientY - rect.top;
    pointer.targetStrength = 1;
  });

  hero.addEventListener("pointerleave", () => {
    pointer.targetStrength = 0;
  });

  const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
    heroIsVisible = entry.isIntersecting;
    if (heroIsVisible) {
      startHeroMesh();
    } else {
      stopHeroMesh();
    }
  });

  const heroResizeObserver = new ResizeObserver(resizeHeroCanvas);
  heroVisibilityObserver.observe(hero);
  heroResizeObserver.observe(hero);
  if (heroContent) heroResizeObserver.observe(heroContent);

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stopHeroMesh();
      drawMesh(performance.now());
    } else {
      startHeroMesh();
    }
  });

  resizeHeroCanvas();
  startHeroMesh();
}

comparisons.forEach((comparison) => {
  const range = comparison.querySelector(".compare-range");
  if (!range) return;

  const updateComparison = () => {
    comparison.style.setProperty("--position", `${range.value}%`);
  };

  updateComparison();
  range.addEventListener("input", updateComparison);
});

projectCards.forEach((card) => {
  const state = {
    currentX: 0,
    currentY: 0,
    currentLift: 0,
    targetX: 0,
    targetY: 0,
    targetLift: 0,
    frame: null,
  };

  const animateTilt = () => {
    state.currentX += (state.targetX - state.currentX) * .14;
    state.currentY += (state.targetY - state.currentY) * .14;
    state.currentLift += (state.targetLift - state.currentLift) * .16;

    card.style.setProperty("--tilt-x", `${state.currentX.toFixed(3)}deg`);
    card.style.setProperty("--tilt-y", `${state.currentY.toFixed(3)}deg`);
    card.style.setProperty("--lift", `${state.currentLift.toFixed(3)}px`);

    const isSettled =
      Math.abs(state.targetX - state.currentX) < .01 &&
      Math.abs(state.targetY - state.currentY) < .01 &&
      Math.abs(state.targetLift - state.currentLift) < .01;

    if (isSettled) {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      state.currentLift = state.targetLift;
      card.style.setProperty("--tilt-x", `${state.currentX.toFixed(3)}deg`);
      card.style.setProperty("--tilt-y", `${state.currentY.toFixed(3)}deg`);
      card.style.setProperty("--lift", `${state.currentLift.toFixed(3)}px`);
      state.frame = null;
      return;
    }

    state.frame = requestAnimationFrame(animateTilt);
  };

  const requestTiltFrame = () => {
    if (state.frame) return;
    state.frame = requestAnimationFrame(animateTilt);
  };

  card.addEventListener("pointerenter", () => {
    card.classList.add("is-tilting");
    state.targetLift = -10;
    requestTiltFrame();
  });

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;

    card.classList.add("is-tilting");
    state.targetX = -y * 13;
    state.targetY = x * 13;
    state.targetLift = -10;
    requestTiltFrame();
  });

  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-tilting");
    state.targetX = 0;
    state.targetY = 0;
    state.targetLift = 0;
    requestTiltFrame();
  });
});

document.querySelectorAll(".accordion details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    document.querySelectorAll(".accordion details").forEach((other) => {
      if (other !== details) other.open = false;
    });
  });
});

document.querySelector(".contact-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  const original = button.textContent;
  button.textContent = "Solicitação preparada";
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
    event.currentTarget.reset();
  }, 1800);
});

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-menu-toggle]");
const timeline = document.querySelector("[data-timeline]");
const processSection = timeline?.closest(".process");
const processSteps = timeline ? [...timeline.querySelectorAll("[data-process-step]")] : [];
const hero = document.querySelector("[data-hero]");
const heroLayers = hero?.querySelectorAll("[data-depth]") || [];
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


hero?.addEventListener("pointermove", (event) => {
  const rect = hero.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;

  heroLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0);
    layer.style.setProperty("--move-x", `${(-x * depth).toFixed(2)}px`);
    layer.style.setProperty("--move-y", `${(-y * depth).toFixed(2)}px`);
  });
});

hero?.addEventListener("pointerleave", () => {
  heroLayers.forEach((layer) => {
    layer.style.setProperty("--move-x", "0px");
    layer.style.setProperty("--move-y", "0px");
  });
});

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

document.documentElement.classList.add("js-enabled");

const hasMotionStack =
  typeof gsap !== "undefined" &&
  typeof ScrollTrigger !== "undefined" &&
  typeof Lenis !== "undefined";

const getMissingMotionLibs = () => {
  const missing = [];
  if (typeof gsap === "undefined") missing.push("GSAP");
  if (typeof ScrollTrigger === "undefined") missing.push("ScrollTrigger");
  if (typeof Lenis === "undefined") missing.push("Lenis");
  return missing;
};

const initCustomCursor = () => {
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const supportsDesktopPointer =
    window.matchMedia("(min-width: 981px)").matches &&
    window.matchMedia("(pointer: fine)").matches;

  if (!dot || !ring || !supportsDesktopPointer) return;

  document.documentElement.classList.add("cursor-enhanced");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let posX = targetX;
  let posY = targetY;

  const setDotPosition = (x, y) => {
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };

  const setRingPosition = (x, y) => {
    ring.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };

  setDotPosition(targetX, targetY);
  setRingPosition(targetX, targetY);

  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      setDotPosition(targetX, targetY);
    },
    { passive: true }
  );

  const animateRing = () => {
    posX += (targetX - posX) * 0.16;
    posY += (targetY - posY) * 0.16;
    setRingPosition(posX, posY);
    window.requestAnimationFrame(animateRing);
  };

  window.requestAnimationFrame(animateRing);

  document.querySelectorAll(".interactive").forEach((node) => {
    node.addEventListener("mouseenter", () => ring.classList.add("active"));
    node.addEventListener("mouseleave", () => ring.classList.remove("active"));
  });
};

initCustomCursor();

const initAmbientAudioToggle = () => {
  const audioToggle = document.querySelector(".audio-toggle");
  if (!audioToggle) return;

  let audioContext;
  let ambientGain;
  let ambientFilter;
  let ambientSource;
  let ambientOn = false;

  const createNoiseBuffer = (ctx) => {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      channelData[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const ensureAmbientAudio = async () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      ambientGain = audioContext.createGain();
      ambientGain.gain.value = 0;
      ambientFilter = audioContext.createBiquadFilter();
      ambientFilter.type = "lowpass";
      ambientFilter.frequency.value = 520;
      ambientFilter.Q.value = 0.9;

      ambientSource = audioContext.createBufferSource();
      ambientSource.buffer = createNoiseBuffer(audioContext);
      ambientSource.loop = true;
      ambientSource.connect(ambientFilter);
      ambientFilter.connect(ambientGain);
      ambientGain.connect(audioContext.destination);
      ambientSource.start();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  };

  audioToggle.addEventListener("click", async () => {
    try {
      await ensureAmbientAudio();
      const now = audioContext.currentTime;
      ambientGain.gain.cancelScheduledValues(now);
      ambientOn = !ambientOn;

      if (ambientOn) {
        ambientGain.gain.linearRampToValueAtTime(0.03, now + 1.5);
        audioToggle.classList.add("is-on");
        audioToggle.textContent = "Sound On";
        audioToggle.setAttribute("aria-pressed", "true");
      } else {
        ambientGain.gain.linearRampToValueAtTime(0, now + 1.2);
        audioToggle.classList.remove("is-on");
        audioToggle.textContent = "Sound Off";
        audioToggle.setAttribute("aria-pressed", "false");
      }
    } catch (_error) {
      audioToggle.textContent = "Audio Blocked";
    }
  });
};

initAmbientAudioToggle();

const initContactForm = () => {
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("form-feedback");
  if (!form || !feedback) return;

  const fields = form.querySelectorAll("input, select, textarea");

  const setFeedback = (message, type) => {
    feedback.textContent = message;
    feedback.classList.remove("is-success", "is-error");
    if (type) feedback.classList.add(type);
  };

  const validateField = (field) => {
    const isValid = field.checkValidity();
    field.classList.toggle("is-invalid", !isValid);
    return isValid;
  };

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) validateField(field);
    });
    field.addEventListener("blur", () => validateField(field));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let isValid = true;

    fields.forEach((field) => {
      if (!validateField(field)) isValid = false;
    });

    if (!isValid) {
      setFeedback("Please complete all required fields.", "is-error");
      return;
    }

    setFeedback("Thank you — your enquiry has been received. We will be in touch shortly.", "is-success");
    form.reset();
    fields.forEach((field) => field.classList.remove("is-invalid"));
  });
};

initContactForm();

const initAnchorScroll = (scrollTo) => {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      if (scrollTo) {
        scrollTo(target);
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
};

if (!hasMotionStack) {
  document.documentElement.classList.remove("js-enabled");
  console.warn(
    `Animation libraries failed to load (${getMissingMotionLibs().join(", ")}). Showing static content.`
  );
  initAnchorScroll(null);
} else {
  gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  lerp: 0.08,
  duration: 1.4,
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.2
});

let scrollEnergyTarget = 0;
let scrollEnergyCurrent = 0;
let grainPhase = 0;

ScrollTrigger.scrollerProxy(document.documentElement, {
  scrollTop(value) {
    if (arguments.length) {
      lenis.scrollTo(value, { immediate: true });
    }
    return lenis.scroll;
  },
  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
});

lenis.on("scroll", ScrollTrigger.update);

lenis.on("scroll", (event) => {
  scrollEnergyTarget = Math.min(1, Math.abs(event.velocity || 0) / 52);
});

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

ScrollTrigger.addEventListener("refresh", () => lenis.resize());

gsap.ticker.add(() => {
  scrollEnergyCurrent += (scrollEnergyTarget - scrollEnergyCurrent) * 0.08;
  scrollEnergyTarget *= 0.92;
  grainPhase += 0.004 + scrollEnergyCurrent * 0.021;

  const driftRadius = 2.2 + scrollEnergyCurrent * 8.5;
  const grainX = Math.sin(grainPhase * 2.2) * driftRadius;
  const grainY = Math.cos(grainPhase * 1.6) * driftRadius;
  const vignetteStrength = Math.min(0.62, 0.34 + scrollEnergyCurrent * 0.18);

  document.body.style.setProperty("--grain-x", `${grainX.toFixed(2)}px`);
  document.body.style.setProperty("--grain-y", `${grainY.toFixed(2)}px`);
  document.body.style.setProperty("--vignette-strength", vignetteStrength.toFixed(3));
});

const introTl = gsap.timeline({ defaults: { ease: "power3.out" } });
introTl
  .from(".hero-layer", {
    scale: 1.12,
    yPercent: 6,
    opacity: 0,
    duration: 2.4,
    stagger: 0.12
  })
  .to(
    "#home .reveal-up",
    {
      y: 0,
      opacity: 1,
      duration: 1.5,
      stagger: 0.12
    },
    "-=1.4"
  );

gsap.to(".layer-back", {
  yPercent: 28,
  ease: "none",
  scrollTrigger: {
    trigger: "#home",
    start: "top top",
    end: "bottom top",
    scrub: 1.4
  }
});

gsap.to(".layer-mid", {
  yPercent: 48,
  ease: "none",
  scrollTrigger: {
    trigger: "#home",
    start: "top top",
    end: "bottom top",
    scrub: 1.8
  }
});

gsap.utils.toArray("[data-parallax-speed]").forEach((el) => {
  const speed = parseFloat(el.dataset.parallaxSpeed) || 15;
  const section = el.closest(".section");

  gsap.fromTo(
    el,
    { yPercent: -speed * 0.4 },
    {
      yPercent: speed * 0.6,
      ease: "none",
      scrollTrigger: {
        trigger: section || el,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.6
      }
    }
  );
});

gsap.utils.toArray(".section").forEach((section) => {
  gsap.fromTo(
    section,
    { autoAlpha: 0.45 },
    {
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 82%",
        end: "top 36%",
        scrub: 1.2
      }
    }
  );
});

gsap.utils.toArray(".reveal-up").forEach((el) => {
  gsap.fromTo(
    el,
    { y: 48, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.6,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none reverse"
      }
    }
  );
});

gsap.utils.toArray(".image-expand").forEach((item) => {
  gsap.fromTo(
    item,
    { scale: 0.88, opacity: 0.4 },
    {
      scale: 1,
      opacity: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: item,
        start: "top 90%",
        end: "top 45%",
        scrub: 1.4
      }
    }
  );
});

const railLinks = gsap.utils.toArray(".rail-link");
const pageSections = gsap.utils.toArray("main .section");
const progressFill = document.querySelector(".rail-progress-fill");
const sideRail = document.querySelector(".side-rail");

const setActiveRailLink = (id) => {
  railLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.target === id);
  });
};

const setRailTone = (section) => {
  if (!sideRail || !section) return;
  const isLightSection = section.classList.contains("panel-light");
  sideRail.dataset.tone = isLightSection ? "light" : "dark";
};

if (progressFill) {
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      progressFill.style.setProperty("--scroll-progress", `${self.progress * 100}%`);
    }
  });
}

pageSections.forEach((section) => {
  if (!section.id) return;
  ScrollTrigger.create({
    trigger: section,
    start: "top 50%",
    end: "bottom 50%",
    onEnter: () => {
      setActiveRailLink(section.id);
      setRailTone(section);
    },
    onEnterBack: () => {
      setActiveRailLink(section.id);
      setRailTone(section);
    }
  });
});

const getVisibleCenterSection = () => {
  const viewportCenter = window.innerHeight / 2;
  return (
    pageSections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= viewportCenter && rect.bottom >= viewportCenter;
    }) || pageSections[0]
  );
};

const initialSection = getVisibleCenterSection();
if (initialSection) {
  setActiveRailLink(initialSection.id);
  setRailTone(initialSection);
}

initAnchorScroll((target) => {
  lenis.scrollTo(target, { duration: 1.75, easing: (t) => 1 - Math.pow(1 - t, 3) });
});

ScrollTrigger.refresh();

window.addEventListener("resize", () => ScrollTrigger.refresh());
}

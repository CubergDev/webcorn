const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SHUTTLE_FRAME_COUNT = 16;
const SHUTTLE_FRAME_PATHS = Array.from(
  { length: SHUTTLE_FRAME_COUNT },
  (_, index) => `assets/shuttle/frames/frame-${String(index).padStart(2, "0")}.webp`
);

const setRevealFallback = () => {
  document.querySelectorAll("[data-reveal]").forEach((item) => {
    item.style.opacity = "1";
    item.style.transform = "none";
  });
};

const initSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));

      if (!target) {
        return;
      }

      event.preventDefault();

      if (window.gsap && window.ScrollToPlugin && !prefersReducedMotion) {
        gsap.registerPlugin(ScrollToPlugin);
        gsap.to(window, {
          duration: 1,
          ease: "power3.out",
          scrollTo: { y: target, offsetY: 20 },
        });
        return;
      }

      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });
};

const initRevealAnimations = () => {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!items.length) {
    return;
  }

  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) {
    setRevealFallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  items.forEach((item) => {
    gsap.fromTo(
      item,
      { opacity: 0, y: 34 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: item,
          start: "top 84%",
          once: true,
        },
      }
    );
  });
};

const readJourneyProgress = () => {
  const journey = document.querySelector(".journey");

  if (!journey) {
    return 0;
  }

  const top = journey.offsetTop || 0;
  const max = Math.max((journey.offsetHeight || window.innerHeight) - window.innerHeight, 1);
  return Math.min(Math.max((window.scrollY - top) / max, 0), 1);
};

const initEarthBackground = () => {
  const scene = document.getElementById("earth-scene");

  if (!scene) {
    return false;
  }

  if (prefersReducedMotion) {
    scene.classList.add("is-reduced-motion");
  }

  return true;
};

const initShuttleIntro = () => {
  const shuttleShell = document.getElementById("shuttle-shell");
  const shuttleFrame = document.getElementById("shuttle-frame");
  const rootStyle = document.documentElement.style;

  if (!shuttleShell || !shuttleFrame) {
    return false;
  }

  let currentFrameIndex = -1;
  const setShuttleFrame = (index) => {
    const boundedIndex = Math.max(0, Math.min(SHUTTLE_FRAME_COUNT - 1, index));

    if (currentFrameIndex === boundedIndex) {
      return;
    }

    currentFrameIndex = boundedIndex;
    shuttleFrame.src = SHUTTLE_FRAME_PATHS[boundedIndex];
  };

  const preloadFrames = () => {
    SHUTTLE_FRAME_PATHS.slice(1).forEach((path) => {
      const image = new Image();
      image.decoding = "async";
      image.src = path;
    });
  };

  setShuttleFrame(0);
  shuttleShell.classList.add("is-ready");

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preloadFrames);
  } else {
    window.setTimeout(preloadFrames, 1);
  }

  const motion = { progress: readJourneyProgress() };
  let frameId = 0;
  const cssState = {
    "--shuttle-opacity": "",
    "--shuttle-scale": "",
    "--shuttle-shift-y": "",
  };

  const setCssVar = (name, value) => {
    if (cssState[name] === value) {
      return;
    }

    cssState[name] = value;
    rootStyle.setProperty(name, value);
  };

  const applyShuttleState = () => {
    const exitRaw = Math.min(Math.max(motion.progress / 0.28, 0), 1);
    const exit = exitRaw * exitRaw * (3 - 2 * exitRaw);

    setCssVar("--shuttle-opacity", Math.max(0, 1 - exit * 1.18).toFixed(3));
    setCssVar("--shuttle-scale", (1 + exit * 0.52).toFixed(3));
    setCssVar("--shuttle-shift-y", `${(exit * 6).toFixed(1)}px`);
    setShuttleFrame(Math.round(exitRaw * (SHUTTLE_FRAME_COUNT - 1)));
    shuttleShell.classList.toggle("is-hidden", exitRaw > 0.995);
  };

  const scheduleShuttleState = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      applyShuttleState();
    });
  };

  if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(motion, {
      progress: 1,
      ease: "none",
      onUpdate: scheduleShuttleState,
      scrollTrigger: {
        trigger: ".journey",
        start: "top top",
        end: "bottom bottom",
        scrub: 2.2,
      },
    });
  } else {
    const updateScroll = () => {
      motion.progress = readJourneyProgress();
      scheduleShuttleState();
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
  }

  window.addEventListener("resize", scheduleShuttleState, { passive: true });
  applyShuttleState();

  return true;
};

const initJourneyMotion = () => {
  const heroCopy = document.querySelector(".hero-copy");

  if (!heroCopy || !window.gsap || !window.ScrollTrigger || prefersReducedMotion) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.to(heroCopy, {
    y: -54,
    opacity: 0.78,
    ease: "none",
    scrollTrigger: {
      trigger: ".journey",
      start: "top top",
      end: "55% top",
      scrub: true,
    },
  });
};

const initLeadForm = () => {
  const form = document.querySelector("[data-lead-form]");
  const status = document.querySelector("[data-form-status]");

  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const contact = String(formData.get("contact") || "").trim();

    if (contact.includes("@")) {
      formData.set("email", contact);
    } else {
      formData.set("phone", contact);
    }

    status.hidden = false;
    status.className = "form-status";
    status.textContent = "Отправляем заявку...";
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/public-leads/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams(formData),
      });

      if (!response.ok) {
        throw new Error("request failed");
      }

      form.reset();
      status.classList.add("is-success");
      status.textContent = "Заявка отправлена. Мы свяжемся с вами после изучения проекта.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = "Не удалось отправить заявку. Напишите нам напрямую: florencya08090@gmail.com";
    } finally {
      submitButton.disabled = false;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  initRevealAnimations();
  initEarthBackground();
  initShuttleIntro();
  initJourneyMotion();
  initLeadForm();
});

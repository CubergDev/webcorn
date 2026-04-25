const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SHUTTLE_FRAME_COUNT = 16;
const SHUTTLE_FRAME_PATHS = Array.from(
  { length: SHUTTLE_FRAME_COUNT },
  (_, index) => `assets/shuttle/frames/frame-${String(index).padStart(2, "0")}.webp`
);
const EARTH_ASSETS = {
  day: "assets/space/earth-optimized-2048.webp",
  clouds: "assets/space/earth-clouds-1024.png",
  moon: "assets/space/moon-1024.jpg",
};

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
  const top = journey?.offsetTop || 0;
  const max = Math.max((journey?.offsetHeight || window.innerHeight) - window.innerHeight, 1);
  return Math.min(Math.max((window.scrollY - top) / max, 0), 1);
};

const initEmbeddedPlanet = () => {
  const shuttleShell = document.getElementById("shuttle-shell");
  const shuttleFrame = document.getElementById("shuttle-frame");
  const rootStyle = document.documentElement.style;

  if (!shuttleShell || !shuttleFrame) {
    return false;
  }

  let currentShuttleFrameIndex = -1;
  const setShuttleFrame = (index) => {
    const boundedIndex = Math.max(0, Math.min(SHUTTLE_FRAME_COUNT - 1, index));

    if (currentShuttleFrameIndex === boundedIndex) {
      return;
    }

    currentShuttleFrameIndex = boundedIndex;
    shuttleFrame.src = SHUTTLE_FRAME_PATHS[boundedIndex];
  };

  setShuttleFrame(0);
  shuttleShell.classList.add("is-ready");

  const preloadFrames = () => {
    SHUTTLE_FRAME_PATHS.slice(1).forEach((path) => {
      const image = new Image();
      image.decoding = "async";
      image.src = path;
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preloadFrames);
  } else {
    window.setTimeout(preloadFrames, 1);
  }

  const motion = { progress: readJourneyProgress() };
  let shuttleFrameId = 0;
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

  const applyShuttleState = (progress) => {
    const shuttleExitRaw = Math.min(Math.max(progress / 0.28, 0), 1);
    const shuttleExit = shuttleExitRaw * shuttleExitRaw * (3 - 2 * shuttleExitRaw);

    setCssVar("--shuttle-opacity", Math.max(0, 1 - shuttleExit * 1.18).toFixed(3));
    setCssVar("--shuttle-scale", (1 + shuttleExit * 0.52).toFixed(3));
    setCssVar("--shuttle-shift-y", `${(shuttleExit * 6).toFixed(1)}px`);
    setShuttleFrame(Math.round(shuttleExitRaw * (SHUTTLE_FRAME_COUNT - 1)));
    shuttleShell.classList.toggle("is-hidden", shuttleExitRaw > 0.995);
  };

  const scheduleShuttleState = () => {
    if (shuttleFrameId) {
      return;
    }

    shuttleFrameId = window.requestAnimationFrame(() => {
      shuttleFrameId = 0;
      applyShuttleState(motion.progress);
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
  applyShuttleState(motion.progress);

  return true;
};

const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const resolveThreeRuntime = async () => {
  try {
    const threeModule = await import(THREE_MODULE_URL);
    return { THREE: threeModule };
  } catch (error) {
    return { THREE: window.THREE };
  }
};

const initSpaceScene = async () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas) {
    return;
  }

  const { THREE } = await resolveThreeRuntime();

  if (!THREE) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 120);
  const group = new THREE.Group();
  const earthGroup = new THREE.Group();

  scene.add(group);
  group.add(earthGroup);

  const textureLoader = new THREE.TextureLoader();
  const setRendererSize = () => {
    const maxDpr = window.innerWidth < 760 ? 0.9 : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  setRendererSize();

  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
  }

  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const loadTexture = (url, isColorTexture = false) => {
    const texture = textureLoader.load(url);
    texture.anisotropy = maxAnisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (isColorTexture) {
      if ("colorSpace" in texture && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
      }
    }

    return texture;
  };

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.56, 56, 56),
    new THREE.MeshBasicMaterial({
      map: loadTexture(EARTH_ASSETS.day, true),
      color: 0xffffff,
    })
  );
  earth.rotation.set(0.28, 2.2, 0.08);
  earthGroup.add(earth);

  const cloudLayer = new THREE.Mesh(
    new THREE.SphereGeometry(1.595, 42, 42),
    new THREE.MeshBasicMaterial({
      map: loadTexture(EARTH_ASSETS.clouds, true),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      color: 0xf8fdff,
    })
  );
  earthGroup.add(cloudLayer);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.72, 60, 60),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x7fd7ff) },
        intensity: { value: 0.58 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
          float glow = pow(rim, 2.2) * intensity;
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  earthGroup.add(atmosphere);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 28, 28),
    new THREE.MeshBasicMaterial({
      map: loadTexture(EARTH_ASSETS.moon, true),
      color: 0xf3f7ff,
    })
  );
  moon.position.set(4.8, 1.25, -7.8);
  group.add(moon);

  const createStarField = (count, radius, depth, spread, size, opacity) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399963;
      const distance = radius + (index % 89) * 0.085;

      positions[index * 3] = Math.cos(angle) * distance;
      positions[index * 3 + 1] = ((index % 61) - 30) * spread;
      positions[index * 3 + 2] = depth - (index % 47) * 0.48 + Math.sin(angle) * 2.4;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xdff5ff,
        size,
        transparent: true,
        opacity,
      })
    );
  };

  const deepStars = createStarField(720, 8.6, -11.8, 0.35, 0.014, 0.52);
  const nearStars = createStarField(320, 5.8, -8.2, 0.3, 0.024, 0.76);
  group.add(deepStars, nearStars);

  const motion = { progress: readJourneyProgress() };
  let renderedProgress = motion.progress;
  let frameId = 0;
  let lastRenderTime = 0;
  let autoRotation = 0;
  let scrollRotation = 0;
  let scrollVelocity = 0;
  let targetScrollVelocity = 0;
  let lastScrollY = window.scrollY;

  if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(motion, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".journey",
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
    });
  } else {
    const updateScroll = () => {
      motion.progress = readJourneyProgress();
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
  }

  const applyScrollSpinInput = (delta) => {
    if (!delta) {
      return;
    }

    targetScrollVelocity += Math.max(-36, Math.min(36, delta)) * 0.00026;
  };

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      applyScrollSpinInput(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
    },
    { passive: true }
  );
  window.addEventListener(
    "wheel",
    (event) => applyScrollSpinInput(event.deltaY),
    { passive: true }
  );

  const render = (time = 0) => {
    frameId = window.requestAnimationFrame(render);

    if (document.hidden) {
      return;
    }

    const frameInterval = window.innerWidth < 760 ? 1000 / 30 : 1000 / 36;

    if (time - lastRenderTime < frameInterval) {
      return;
    }

    lastRenderTime = time;
    renderedProgress += (motion.progress - renderedProgress) * 0.06;
    const eased = renderedProgress * renderedProgress * (3 - 2 * renderedProgress);
    const narrowScreen = window.innerWidth < 760;

    autoRotation += prefersReducedMotion ? 0.00018 : 0.00042;
    scrollVelocity += (targetScrollVelocity - scrollVelocity) * 0.09;
    scrollRotation += scrollVelocity;
    targetScrollVelocity *= 0.84;
    scrollVelocity *= 0.92;

    camera.position.x = 0;
    camera.position.y = 0.18 - eased * 0.1;
    camera.position.z = (narrowScreen ? 10.4 : 11.2) - eased * (narrowScreen ? 1.65 : 2.1);
    camera.lookAt(0, -0.04, -0.36);

    group.rotation.x = -eased * 0.03;
    earthGroup.position.set(0, narrowScreen ? -0.12 : -0.05, -4.85 + eased * 0.15);
    earthGroup.scale.setScalar((narrowScreen ? 0.8 : 0.7) + eased * (narrowScreen ? 0.92 : 1.18));
    earth.rotation.y = -1.08 + autoRotation + scrollRotation * 0.09 + eased * 0.2;
    earth.rotation.x = 0.34 + eased * 0.05;
    cloudLayer.rotation.y = earth.rotation.y + autoRotation * 0.2;
    cloudLayer.rotation.x = earth.rotation.x + 0.01;
    atmosphere.rotation.copy(earth.rotation);
    atmosphere.material.uniforms.intensity.value = 0.58 + eased * 0.14;

    moon.position.x = 4.8 - eased * 0.5;
    moon.position.y = 1.25 + eased * 0.14;
    deepStars.rotation.y += 0.00005;
    nearStars.rotation.y += 0.00011;
    deepStars.material.opacity = 0.52 - eased * 0.08;
    nearStars.material.opacity = 0.76 - eased * 0.14;

    renderer.render(scene, camera);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    setRendererSize();
    lastRenderTime = 0;
  };

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }

    if (!frameId) {
      render();
    }
  });

  render();
};

const initJourneyMotion = () => {
  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.to(".hero-copy", {
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
  initEmbeddedPlanet();
  initSpaceScene();
  initJourneyMotion();
  initLeadForm();
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SHUTTLE_FRAME_COUNT = 16;
const SHUTTLE_FRAME_PATHS = Array.from(
  { length: SHUTTLE_FRAME_COUNT },
  (_, index) => `assets/shuttle/frames/frame-${String(index).padStart(2, "0")}.webp`
);
const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const shouldUsePlanetFallback = () => window.location.protocol === "file:";

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

const initPlanetFallback = () => {
  const shell = document.getElementById("planet-fallback-shell");
  const ring = document.getElementById("planet-fallback-ring");
  const body = document.getElementById("planet-fallback-body");
  const canvas = document.getElementById("space-canvas");

  if (!shell || !ring || !body) {
    return false;
  }

  shell.classList.add("is-active");
  if (canvas) {
    canvas.style.display = "none";
  }

  let currentProgress = readJourneyProgress();
  let renderedProgress = currentProgress;
  let targetSpin = 0;
  let spin = 0;
  let autoRotation = 0;
  let lastScrollY = window.scrollY;
  let lastTime = 0;
  let frameId = 0;

  const updateProgress = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    lastScrollY = currentY;
    currentProgress = readJourneyProgress();
    targetSpin += Math.max(-2.2, Math.min(2.2, delta * 0.018));
  };

  if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: ".journey",
      start: "top top",
      end: "bottom bottom",
      scrub: 2,
      onUpdate: (self) => {
        currentProgress = self.progress;
      },
    });
  } else {
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  window.addEventListener(
    "wheel",
    (event) => {
      targetSpin += Math.max(-1.8, Math.min(1.8, event.deltaY * 0.006));
    },
    { passive: true }
  );

  const render = (time = 0) => {
    frameId = window.requestAnimationFrame(render);

    if (document.hidden) {
      return;
    }

    if (time - lastTime < 1000 / 12) {
      return;
    }

    const deltaSeconds = lastTime ? (time - lastTime) / 1000 : 1 / 12;
    lastTime = time;
    renderedProgress += (currentProgress - renderedProgress) * 0.08;
    spin += (targetSpin - spin) * 0.14;
    targetSpin *= 0.84;
    autoRotation += deltaSeconds * (prefersReducedMotion ? 8 : 18);

    const narrowScreen = window.innerWidth < 760;
    const scale = (narrowScreen ? 0.7 : 0.88) + renderedProgress * (narrowScreen ? 0.1 : 0.14);
    const shiftY = (narrowScreen ? 38 : 42) + renderedProgress * (narrowScreen ? 8 : 10);
    const bodyRotation = autoRotation * 0.02 + spin * 2;
    const ringRotation = -6 + autoRotation * 0.05 + spin * 0.8;
    const streamRotation = -31 + autoRotation * 0.08 + spin * 1.4;

    shell.style.setProperty("--planet-scale", scale.toFixed(3));
    shell.style.setProperty("--planet-shift-y", `${shiftY.toFixed(1)}px`);
    shell.style.setProperty("--planet-rotation", `${bodyRotation.toFixed(2)}deg`);
    shell.style.setProperty("--ring-rotation", `${ringRotation.toFixed(2)}deg`);
    shell.style.setProperty("--stream-rotation", `${streamRotation.toFixed(2)}deg`);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }

    if (!frameId) {
      lastTime = 0;
      render();
    }
  });

  render();
  return true;
};

const resolveThreeRuntime = async () => {
  try {
    const threeModule = await import(THREE_MODULE_URL);
    return { THREE: threeModule };
  } catch (error) {
    return { THREE: window.THREE };
  }
};

const createAccretionTexture = (THREE, size = 1024) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const center = size / 2;
  const outerRadius = size * 0.46;
  const innerRadius = size * 0.36;
  const gradient = typeof context.createConicGradient === "function"
    ? context.createConicGradient(0, center, center)
    : context.createRadialGradient(center, center, innerRadius, center, center, outerRadius);

  gradient.addColorStop(0, "rgba(255, 245, 228, 0.98)");
  gradient.addColorStop(0.18, "rgba(255, 216, 154, 0.98)");
  gradient.addColorStop(0.42, "rgba(255, 170, 96, 0.96)");
  gradient.addColorStop(0.64, "rgba(255, 134, 69, 0.86)");
  gradient.addColorStop(0.84, "rgba(255, 196, 118, 0.94)");
  gradient.addColorStop(1, "rgba(255, 245, 228, 0.98)");

  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.arc(center, center, outerRadius, 0, Math.PI * 2);
  context.arc(center, center, innerRadius, 0, Math.PI * 2, true);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.save();
  context.globalCompositeOperation = "source-atop";
  for (let index = 0; index < 220; index += 1) {
    const angle = (Math.PI * 2 * index) / 220;
    const radius = innerRadius + (outerRadius - innerRadius) * ((index % 21) / 21);
    const streakLength = outerRadius * (0.08 + (index % 7) / 26);
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const alpha = 0.03 + (index % 6) * 0.012;

    context.strokeStyle = `rgba(255, ${120 + (index % 80)}, ${90 + (index % 70)}, ${alpha})`;
    context.lineWidth = 2 + (index % 3);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * streakLength, y + Math.sin(angle) * streakLength);
    context.stroke();
  }
  context.restore();

  const vignette = context.createRadialGradient(center, center, innerRadius * 0.7, center, center, outerRadius);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.56, "rgba(18, 10, 6, 0.06)");
  vignette.addColorStop(0.82, "rgba(8, 5, 4, 0.24)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  context.fillStyle = vignette;
  context.beginPath();
  context.arc(center, center, outerRadius, 0, Math.PI * 2);
  context.arc(center, center, innerRadius, 0, Math.PI * 2, true);
  context.closePath();
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
};

const createStreamTexture = (THREE, width = 2048, height = 384) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, height / 2, width, height / 2);
  gradient.addColorStop(0, "rgba(255, 170, 96, 0)");
  gradient.addColorStop(0.12, "rgba(255, 228, 182, 0.26)");
  gradient.addColorStop(0.28, "rgba(255, 247, 232, 0.98)");
  gradient.addColorStop(0.42, "rgba(255, 191, 120, 0.92)");
  gradient.addColorStop(0.55, "rgba(255, 140, 82, 0.82)");
  gradient.addColorStop(0.7, "rgba(255, 228, 182, 0.94)");
  gradient.addColorStop(0.86, "rgba(255, 188, 108, 0.18)");
  gradient.addColorStop(1, "rgba(255, 170, 96, 0)");

  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(width / 2, height / 2, width * 0.46, height * 0.14, 0, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 140; index += 1) {
    const x = width * (0.06 + (index / 140) * 0.88);
    const y = height * (0.28 + ((index * 17) % 43) / 100);
    const length = width * (0.08 + (index % 9) / 60);
    const alpha = 0.03 + (index % 6) * 0.015;

    context.strokeStyle = `rgba(255, ${190 + (index % 55)}, ${150 + (index % 45)}, ${alpha})`;
    context.lineWidth = 2 + (index % 3);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + ((index % 2 === 0) ? 1 : -1) * height * 0.06);
    context.stroke();
  }
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
};

const initSpaceScene = async () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas) {
    return false;
  }

  const { THREE } = await resolveThreeRuntime();

  if (!THREE) {
    return false;
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
  const blackHoleGroup = new THREE.Group();

  scene.add(group);
  group.add(blackHoleGroup);
  camera.position.set(0, 0.08, 10.6);
  const setRendererSize = () => {
    const maxDpr = window.innerWidth < 760 ? 1 : 1.12;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  setRendererSize();

  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  scene.background = new THREE.Color(0x020713);
  scene.fog = new THREE.FogExp2(0x020713, 0.026);

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

  const deepStars = createStarField(980, 8.6, -11.8, 0.35, 0.014, 0.52);
  const nearStars = createStarField(540, 5.8, -8.2, 0.3, 0.024, 0.76);
  group.add(deepStars, nearStars);

  const diskTexture = createAccretionTexture(THREE);
  const streamTexture = createStreamTexture(THREE);
  const accretionDisk = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 3.28, 192, 6),
    new THREE.MeshBasicMaterial({
      map: diskTexture,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffffff,
    })
  );
  accretionDisk.rotation.x = Math.PI * 0.5 - 0.22;
  accretionDisk.scale.set(2.08, 0.22, 1);
  blackHoleGroup.add(accretionDisk);

  const accretionDiskInner = new THREE.Mesh(
    new THREE.RingGeometry(1.04, 2.46, 160, 4),
    new THREE.MeshBasicMaterial({
      map: diskTexture,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffddaa,
    })
  );
  accretionDiskInner.rotation.x = Math.PI * 0.5 - 0.18;
  accretionDiskInner.rotation.z = 0.24;
  accretionDiskInner.scale.set(1.58, 0.16, 1);
  blackHoleGroup.add(accretionDiskInner);

  const streamMaterial = new THREE.MeshBasicMaterial({
    map: streamTexture,
    transparent: true,
    opacity: 0.98,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xffffff,
  });
  const streamGeometry = new THREE.PlaneGeometry(8.4, 0.72, 1, 1);
  const accretionStreamFront = new THREE.Mesh(streamGeometry, streamMaterial);
  accretionStreamFront.rotation.z = -0.62;
  accretionStreamFront.position.z = 0.18;
  blackHoleGroup.add(accretionStreamFront);

  const accretionStreamBack = new THREE.Mesh(streamGeometry, streamMaterial.clone());
  accretionStreamBack.material.opacity = 0.54;
  accretionStreamBack.rotation.z = -0.62;
  accretionStreamBack.position.z = -0.22;
  accretionStreamBack.scale.set(0.92, 0.72, 1);
  blackHoleGroup.add(accretionStreamBack);

  const photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.06, 12, 220),
    new THREE.MeshBasicMaterial({
      color: 0xffc36b,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  blackHoleGroup.add(photonRing);

  const blackCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x010102,
    })
  );
  blackHoleGroup.add(blackCore);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.24, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffc27d) },
        intensity: { value: 0.24 },
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
          float glow = pow(rim, 2.6) * intensity;
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  blackHoleGroup.add(glow);

  scene.add(new THREE.AmbientLight(0x1a120d, 0.38));
  const keyLight = new THREE.DirectionalLight(0xffe6bf, 1.92);
  keyLight.position.set(4.2, 1.8, 4.8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffa86a, 0.82);
  fillLight.position.set(-3.2, 1.4, 2.6);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffd39a, 0.48);
  rimLight.position.set(-4, 1.6, -1.4);
  scene.add(rimLight);

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
  camera.position.y = 0.04 - eased * 0.04;
  camera.position.z = (narrowScreen ? 10.1 : 10.9) - eased * (narrowScreen ? 1.1 : 1.4);
  camera.lookAt(0, -0.02, -0.4);

    group.rotation.x = -eased * 0.018;
    blackHoleGroup.position.set(0, narrowScreen ? -0.04 : 0.02, -4.92 + eased * 0.12);
    blackHoleGroup.scale.setScalar((narrowScreen ? 0.82 : 0.88) + eased * (narrowScreen ? 0.12 : 0.18));
    blackHoleGroup.rotation.y = scrollRotation * 0.015;
    accretionDisk.rotation.z = -0.22 + autoRotation * 0.56 + scrollRotation * 0.08;
    accretionDisk.rotation.x = Math.PI * 0.5 - 0.22 + eased * 0.05;
    accretionDiskInner.rotation.z = 0.24 - autoRotation * 0.84 + scrollRotation * 0.02;
    accretionDiskInner.rotation.x = Math.PI * 0.5 - 0.18 + eased * 0.04;
    accretionStreamFront.rotation.z = -0.62 + autoRotation * 0.09 + scrollRotation * 0.05;
    accretionStreamBack.rotation.z = -0.62 + autoRotation * 0.06 + scrollRotation * 0.04;
    photonRing.rotation.z = autoRotation * 0.22 - scrollRotation * 0.05;
    photonRing.scale.setScalar(1 + eased * 0.06);
    glow.material.uniforms.intensity.value = 0.22 + eased * 0.14;
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
  return true;
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

document.addEventListener("DOMContentLoaded", async () => {
  initSmoothScroll();
  initRevealAnimations();
  initEmbeddedPlanet();
  if (shouldUsePlanetFallback()) {
    initPlanetFallback();
  } else {
    const started = await initSpaceScene().catch(() => false);

    if (!started) {
      initPlanetFallback();
    }
  }
  initJourneyMotion();
  initLeadForm();
});

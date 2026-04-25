const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SHUTTLE_FRAME_COUNT = 16;
const SHUTTLE_FRAME_PATHS = Array.from(
  { length: SHUTTLE_FRAME_COUNT },
  (_, index) => `assets/shuttle/frames/frame-${String(index).padStart(2, "0")}.webp`
);
const SATURN_ASSETS = {
  model: "saturn/uploads-files-4052472-Stylized+Planets.dae",
  textureRoot: "saturn/Textures/Saturn 4K/",
  saturnBase: "assets/saturn/saturn-base.png",
  saturnNormal: "assets/saturn/saturn-normal.png",
  saturnRoughness: "assets/saturn/saturn-roughness.png",
  saturnMetallic: "assets/saturn/saturn-metallic.png",
  ringsBase: "assets/saturn/saturn-rings-base.png",
  ringsNormal: "assets/saturn/saturn-rings-normal.png",
  ringsRoughness: "assets/saturn/saturn-rings-roughness.png",
  ringsMetallic: "assets/saturn/saturn-rings-metallic.png",
  moonBase: "assets/saturn/saturn-moon-base.png",
};
const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const COLLADA_LOADER_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/ColladaLoader.js";
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
    autoRotation += deltaSeconds * (prefersReducedMotion ? 4 : 10);

    const narrowScreen = window.innerWidth < 760;
    const scale = (narrowScreen ? 0.78 : 0.82) + renderedProgress * (narrowScreen ? 0.32 : 0.42);
    const shiftY = renderedProgress * (narrowScreen ? 18 : 10);
    const rotation = autoRotation + spin * 28 + renderedProgress * 16;

    shell.style.setProperty("--planet-scale", scale.toFixed(3));
    shell.style.setProperty("--planet-shift-y", `${shiftY.toFixed(1)}px`);
    shell.style.setProperty("--planet-rotation", `${rotation.toFixed(2)}deg`);
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
    const [threeModule, colladaModule] = await Promise.all([import(THREE_MODULE_URL), import(COLLADA_LOADER_URL)]);
    return { THREE: threeModule, ColladaLoader: colladaModule.ColladaLoader };
  } catch (error) {
    return { THREE: window.THREE, ColladaLoader: null };
  }
};

const initSpaceScene = async () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas) {
    return false;
  }

  const { THREE, ColladaLoader } = await resolveThreeRuntime();

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
  const saturnGroup = new THREE.Group();

  scene.add(group);
  group.add(saturnGroup);
  camera.position.set(0, 0.12, 10.2);

  const textureLoader = new THREE.TextureLoader();
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
    renderer.toneMappingExposure = 1.18;
  }
  scene.background = new THREE.Color(0x020713);
  scene.fog = new THREE.FogExp2(0x020713, 0.026);

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

  const textures = {
    saturnBase: loadTexture(SATURN_ASSETS.saturnBase, true),
    saturnNormal: loadTexture(SATURN_ASSETS.saturnNormal),
    saturnRoughness: loadTexture(SATURN_ASSETS.saturnRoughness),
    saturnMetallic: loadTexture(SATURN_ASSETS.saturnMetallic),
    ringsBase: loadTexture(SATURN_ASSETS.ringsBase, true),
    ringsNormal: loadTexture(SATURN_ASSETS.ringsNormal),
    ringsRoughness: loadTexture(SATURN_ASSETS.ringsRoughness),
    ringsMetallic: loadTexture(SATURN_ASSETS.ringsMetallic),
    moonBase: loadTexture(SATURN_ASSETS.moonBase, true),
  };

  const materials = {
    saturn: new THREE.MeshStandardMaterial({
      map: textures.saturnBase,
      normalMap: textures.saturnNormal,
      roughnessMap: textures.saturnRoughness,
      metalnessMap: textures.saturnMetallic,
      roughness: 0.86,
      metalness: 0.02,
      emissive: new THREE.Color(0x1f160b),
      emissiveIntensity: 0.18,
      color: 0xffffff,
    }),
    rings: new THREE.MeshStandardMaterial({
      map: textures.ringsBase,
      alphaMap: textures.ringsBase,
      normalMap: textures.ringsNormal,
      roughnessMap: textures.ringsRoughness,
      metalnessMap: textures.ringsMetallic,
      roughness: 0.78,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.035,
      opacity: 0.98,
      side: THREE.DoubleSide,
      color: 0xffffff,
    }),
    moon: new THREE.MeshStandardMaterial({
      map: textures.moonBase,
      roughness: 0.92,
      metalness: 0,
      color: 0xf2f5ff,
    }),
  };

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 28, 28),
    materials.moon
  );
  moon.position.set(4.8, 1.25, -7.6);
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

  const deepStars = createStarField(980, 8.6, -11.8, 0.35, 0.014, 0.52);
  const nearStars = createStarField(540, 5.8, -8.2, 0.3, 0.024, 0.76);
  group.add(deepStars, nearStars);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.12, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x80caff) },
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
  group.add(glow);

  const chooseMaterial = (sourceName = "") => {
    const name = sourceName.toLowerCase();

    if (name.includes("ring")) {
      return materials.rings;
    }

    if (name.includes("moon")) {
      return materials.moon;
    }

    return materials.saturn;
  };

  const prepareSaturnModel = (model) => {
    model.traverse((object) => {
      if (!object.isMesh) {
        return;
      }

      if (object.geometry && !object.geometry.attributes.normal) {
        object.geometry.computeVertexNormals();
      }

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => chooseMaterial(material?.name || object.name));
      } else {
        object.material = chooseMaterial(object.material?.name || object.name);
      }
    });

    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;

    model.position.sub(center);
    model.scale.multiplyScalar(4.8 / maxSize);
    model.rotation.set(-0.34, -0.18, -0.34);

    return model;
  };

  const createFallbackSaturn = () => {
    const fallback = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.36, 96, 96), materials.saturn);
    const rings = new THREE.Mesh(new THREE.RingGeometry(1.72, 3.48, 192, 4), materials.rings);

    rings.rotation.x = Math.PI * 0.5;
    fallback.add(body, rings);
    fallback.rotation.set(-0.34, -0.18, -0.34);

    return fallback;
  };

  const loadSaturnModel = () =>
    new Promise((resolve) => {
      if (!ColladaLoader) {
        resolve(createFallbackSaturn());
        return;
      }

      const loader = new ColladaLoader();
      loader.setResourcePath(SATURN_ASSETS.textureRoot);
      loader.load(
        SATURN_ASSETS.model,
        (collada) => resolve(prepareSaturnModel(collada.scene)),
        undefined,
        () => resolve(createFallbackSaturn())
      );
    });

  const fallbackSaturn = createFallbackSaturn();
  saturnGroup.add(fallbackSaturn);

  loadSaturnModel().then((saturnModel) => {
    saturnModel.scale.multiplyScalar(1.18);
    saturnModel.position.set(0, 0, 0);
    saturnModel.traverse((object) => {
      if (object.isMesh) {
        object.renderOrder = 2;
      }
    });
    saturnGroup.add(saturnModel);
  });

  scene.add(new THREE.AmbientLight(0xffead0, 0.72));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(5.6, 2.4, 4.8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x84cfff, 1.08);
  fillLight.position.set(-3.2, 1.8, 3.4);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x65d8ff, 1.55);
  rimLight.position.set(-4, 1.6, -2);
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
    camera.position.y = 0.1 - eased * 0.08;
    camera.position.z = (narrowScreen ? 9.8 : 10.4) - eased * (narrowScreen ? 1.2 : 1.5);
    camera.lookAt(0, -0.03, -0.3);

    group.rotation.x = -eased * 0.02;
    saturnGroup.position.set(0, narrowScreen ? -0.1 : -0.04, -4.7 + eased * 0.1);
    saturnGroup.scale.setScalar((narrowScreen ? 1.06 : 0.96) + eased * (narrowScreen ? 0.3 : 0.42));
    saturnGroup.rotation.y = autoRotation + scrollRotation * 0.07 + eased * 0.12;
    saturnGroup.rotation.x = -0.02 + eased * 0.03;
    saturnGroup.rotation.z = -0.015 - eased * 0.025;
    glow.position.copy(saturnGroup.position);
    glow.material.uniforms.intensity.value = 0.18 + eased * 0.08;

    moon.position.x = 4.8 - eased * 0.36;
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

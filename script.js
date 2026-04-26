document.documentElement.classList.add("has-js");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const prefersReducedData = window.matchMedia(
  "(prefers-reduced-data: reduce)",
).matches;
const networkConnection =
  navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const usesConstrainedNetwork =
  prefersReducedData ||
  Boolean(networkConnection?.saveData) ||
  ["slow-2g", "2g"].includes(networkConnection?.effectiveType);

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const withTimeout = (promise, duration) =>
  Promise.race([promise, wait(duration)]);

const markPageReady = () => {
  document.body.classList.add("is-ready");
  document.body.classList.remove("is-loading");

  window.setTimeout(() => {
    document.querySelector("[data-page-loader]")?.setAttribute("aria-hidden", "true");
  }, 360);
};

const getWindowReadyPromise = () => {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
};

const getFontsReadyPromise = () => document.fonts?.ready || Promise.resolve();

const getLiteScenePreference = () =>
  window.innerWidth < 760 || usesConstrainedNetwork || prefersReducedMotion;

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

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  });
};

const initScrollAssist = () => {
  const button = document.querySelector("[data-scroll-assist]");
  const label = document.querySelector("[data-scroll-assist-label]");
  const sections = Array.from(document.querySelectorAll("main > section[id]"));
  const contactSection = document.getElementById("contact");

  if (!button || !label || !sections.length || !contactSection) {
    return;
  }

  const getShouldScrollUp = () => {
    const contactRect = contactSection.getBoundingClientRect();

    return contactRect.top <= 120;
  };

  const updateState = () => {
    const shouldScrollUp = getShouldScrollUp();

    button.classList.toggle("is-up", shouldScrollUp);
    label.textContent = shouldScrollUp ? "Вверх" : "Вниз";
    button.setAttribute(
      "aria-label",
      shouldScrollUp ? "Прокрутить наверх" : "Прокрутить ниже",
    );
  };

  button.addEventListener("click", () => {
    if (getShouldScrollUp()) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      return;
    }

    const nextSection = sections.find(
      (section) => section.offsetTop > window.scrollY + window.innerHeight * 0.28,
    );

    (nextSection || contactSection).scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  window.addEventListener("scroll", updateState, { passive: true });
  window.addEventListener("resize", updateState);
  updateState();
};

const initRevealAnimations = () => {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) {
    setRevealFallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  items.forEach((item) => {
    if (item.classList.contains("hero-copy")) {
      gsap.set(item, { opacity: 1, y: 0 });
      return;
    }

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
      },
    );
  });
};

const THREE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const GLTF_LOADER_URL =
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
const DRACO_LOADER_URL =
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
const DRACO_DECODER_PATH =
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/";
const EARTH_MODEL_URL = "earth/earth.glb";
const SHUTTLE_VIDEO_DESKTOP_URL = "earth/video-720.webm";
const SHUTTLE_VIDEO_MOBILE_URL = "earth/video-540.webm";
const SHUTTLE_VIDEO_FALLBACK_URL = "earth/video.webm";
const SHUTTLE_SCROLL_KEYFRAMES = [
  { progress: 0, time: 0.01 },
  { progress: 0.025, time: 0.8 },
  { progress: 0.05, time: 1.8 },
  { progress: 0.085, time: 3.5 },
  { progress: 0.13, time: 6.6 },
  { progress: 0.22, time: 10.6 },
  { progress: 0.32, time: 14.1 },
];

const getKeyframedVideoTime = (progress, duration) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const lastFrame =
    SHUTTLE_SCROLL_KEYFRAMES[SHUTTLE_SCROLL_KEYFRAMES.length - 1];

  if (clampedProgress <= SHUTTLE_SCROLL_KEYFRAMES[0].progress) {
    return SHUTTLE_SCROLL_KEYFRAMES[0].time;
  }

  if (clampedProgress >= lastFrame.progress) {
    return Math.min(lastFrame.time, Math.max(duration - 0.04, 0));
  }

  for (let i = 1; i < SHUTTLE_SCROLL_KEYFRAMES.length; i += 1) {
    const previousFrame = SHUTTLE_SCROLL_KEYFRAMES[i - 1];
    const nextFrame = SHUTTLE_SCROLL_KEYFRAMES[i];

    if (clampedProgress <= nextFrame.progress) {
      const frameProgress =
        (clampedProgress - previousFrame.progress) /
        (nextFrame.progress - previousFrame.progress);
      const easedFrameProgress =
        frameProgress * frameProgress * (3 - 2 * frameProgress);

      return Math.min(
        previousFrame.time +
          (nextFrame.time - previousFrame.time) * easedFrameProgress,
        Math.max(duration - 0.04, 0),
      );
    }
  }

  return Math.min(lastFrame.time, Math.max(duration - 0.04, 0));
};
const SATURN_RING_EDGE_ON_TILT = -Math.PI * 0.46;
const SATURN_RING_LINE_ANGLE = Math.PI * 0.14;

const resolveThreeRuntime = async () => {
  try {
    const [threeModule, gltfModule, dracoModule] = await Promise.all([
      import(THREE_MODULE_URL),
      import(GLTF_LOADER_URL),
      import(DRACO_LOADER_URL),
    ]);

    return {
      THREE: threeModule,
      GLTFLoader: gltfModule.GLTFLoader,
      DRACOLoader: dracoModule.DRACOLoader,
    };
  } catch (error) {
    return {
      THREE: window.THREE,
      GLTFLoader: null,
      DRACOLoader: null,
    };
  }
};

const initSpaceScene = async () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas || prefersReducedMotion) {
    return;
  }

  const liteScene = getLiteScenePreference();

  const { THREE, GLTFLoader, DRACOLoader } = await resolveThreeRuntime();

  if (!THREE || !GLTFLoader || !DRACOLoader) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !liteScene,
    powerPreference: liteScene ? "default" : "high-performance",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  const group = new THREE.Group();
  const earthGroup = new THREE.Group();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, liteScene ? 1.15 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.46;
  }
  renderer.autoClear = false;
  scene.background = new THREE.Color(0x111015);
  scene.add(group);
  camera.position.set(0, 0.18, 9.6);
  group.add(earthGroup);

  const shuttleScene = new THREE.Scene();
  const shuttleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  const shuttleVideo = document.createElement("video");
  shuttleVideo.src = liteScene ? SHUTTLE_VIDEO_MOBILE_URL : SHUTTLE_VIDEO_DESKTOP_URL;
  shuttleVideo.preload = usesConstrainedNetwork ? "metadata" : "auto";
  shuttleVideo.muted = true;
  shuttleVideo.playsInline = true;
  shuttleVideo.crossOrigin = "anonymous";
  shuttleVideo.playbackRate = 1;
  shuttleVideo.pause();
  shuttleVideo.load();

  let shuttleVideoReady = false;
  let shuttleVideoDuration = 14.2;
  let shuttleVideoAspect = 16 / 9;
  let shuttleSeekQueued = null;
  let shuttleSeekTimer = null;
  let lastShuttleSeekAt = 0;

  const shuttleMetadataReady = new Promise((resolve) => {
    const finish = () => resolve();

    shuttleVideo.addEventListener("loadedmetadata", finish, { once: true });
    shuttleVideo.addEventListener(
      "error",
      () => {
        if (shuttleVideo.src.endsWith(SHUTTLE_VIDEO_FALLBACK_URL)) {
          finish();
          return;
        }

        shuttleVideo.src = SHUTTLE_VIDEO_FALLBACK_URL;
        shuttleVideo.load();
      },
      { once: true },
    );
  });

  const shuttleTexture = new THREE.VideoTexture(shuttleVideo);
  shuttleTexture.minFilter = THREE.LinearFilter;
  shuttleTexture.magFilter = THREE.LinearFilter;
  shuttleTexture.generateMipmaps = false;
  if ("colorSpace" in shuttleTexture && THREE.SRGBColorSpace) {
    shuttleTexture.colorSpace = THREE.SRGBColorSpace;
  }

  const shuttleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: shuttleTexture },
      opacity: { value: 1 },
      brightness: { value: 2.16 },
      contrast: { value: 1.18 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float brightness;
      uniform float contrast;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(map, vUv);
        float alpha = opacity;
        color.rgb = (color.rgb - 0.5) * contrast + 0.5;
        color.rgb *= brightness;
        color.rgb = clamp(color.rgb, 0.0, 1.0);

        if (alpha < 0.025) {
          discard;
        }

        gl_FragColor = vec4(color.rgb, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const shuttlePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    shuttleMaterial,
  );
  shuttlePlane.position.set(-0.12, 0, -1);
  shuttleScene.add(shuttlePlane);

  const resizeShuttleOverlay = () => {
    const viewportAspect = window.innerWidth / window.innerHeight;
    const shuttleScale = 1.12;

    if (shuttleVideoAspect > viewportAspect) {
      shuttlePlane.scale.set(
        (shuttleVideoAspect / viewportAspect) * shuttleScale,
        shuttleScale,
        1,
      );
      return;
    }

    shuttlePlane.scale.set(
      shuttleScale,
      (viewportAspect / shuttleVideoAspect) * shuttleScale,
      1,
    );
  };

  shuttleVideo.addEventListener("loadedmetadata", () => {
    shuttleVideoDuration = Number.isFinite(shuttleVideo.duration)
      ? shuttleVideo.duration
      : shuttleVideoDuration;
    shuttleVideoAspect =
      shuttleVideo.videoWidth && shuttleVideo.videoHeight
        ? shuttleVideo.videoWidth / shuttleVideo.videoHeight
        : shuttleVideoAspect;
    shuttleVideoReady = true;
    shuttleVideo.currentTime = 0.01;
    resizeShuttleOverlay();
  });

  const flushQueuedShuttleSeek = (force = false) => {
    if (!shuttleVideoReady || shuttleSeekQueued === null || shuttleVideo.seeking) {
      return;
    }

    const targetTime = shuttleSeekQueued;
    shuttleSeekQueued = null;
    requestShuttleSeek(targetTime, force);
  };

  function requestShuttleSeek(targetTime, force = false) {
    if (!shuttleVideoReady) {
      return;
    }

    const safeDuration = Math.max(shuttleVideoDuration - 0.04, 0.01);
    const nextTime = Math.min(Math.max(targetTime, 0.01), safeDuration);

    if (Math.abs(nextTime - shuttleVideo.currentTime) < 0.012) {
      shuttleTexture.needsUpdate = true;
      return;
    }

    if (shuttleVideo.seeking) {
      shuttleSeekQueued = nextTime;
      return;
    }

    const now = performance.now();
    const minimumSeekInterval = liteScene ? 72 : 44;

    if (!force && now - lastShuttleSeekAt < minimumSeekInterval) {
      shuttleSeekQueued = nextTime;

      if (!shuttleSeekTimer) {
        shuttleSeekTimer = window.setTimeout(() => {
          shuttleSeekTimer = null;
          flushQueuedShuttleSeek(true);
        }, minimumSeekInterval);
      }

      return;
    }

    if (!shuttleVideo.paused) {
      shuttleVideo.pause();
    }

    lastShuttleSeekAt = now;
    shuttleVideo.currentTime = nextTime;
  }

  shuttleVideo.addEventListener("seeked", () => {
    shuttleTexture.needsUpdate = true;
    window.requestAnimationFrame(() => flushQueuedShuttleSeek(false));
  });
  resizeShuttleOverlay();

  const createStarField = (count, baseRadius, depthOffset, verticalSpread) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963;
      const radius = baseRadius + (i % 97) * 0.095;
      const depth = depthOffset - (i % 41) * 0.55;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = ((i % 53) - 26) * verticalSpread;
      positions[i * 3 + 2] = depth + Math.sin(angle) * 2.6;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  };

  const createOrbitStarField = (count, innerRadius, outerRadius) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963;
      const radius = innerRadius + ((i * 17) % 100) / 100 * (outerRadius - innerRadius);
      const verticalSquash = 0.58 + ((i * 11) % 36) / 100;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * verticalSquash;
      positions[i * 3 + 2] = -1.35 - ((i * 23) % 100) / 100 * 4.6;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  };

  const deepStars = new THREE.Points(
    createStarField(liteScene ? 680 : 1450, 9.2, -12, 0.34),
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: liteScene ? 1.1 : 1.25,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.72,
      depthTest: true,
      depthWrite: false,
    }),
  );
  group.add(deepStars);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = liteScene ? 360 : 760;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const angle = i * 2.399963;
    const radius = 6 + (i % 64) * 0.13;
    const depth = -9 - (i % 28) * 0.8;

    starPositions[i * 3] = Math.cos(angle) * radius;
    starPositions[i * 3 + 1] = ((i % 37) - 18) * 0.32;
    starPositions[i * 3 + 2] = depth + Math.sin(angle) * 2.2;
  }

  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: liteScene ? 1.35 : 1.55,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.86,
      depthTest: true,
      depthWrite: false,
    }),
  );
  group.add(stars);

  const orbitStarGroup = new THREE.Group();
  const orbitStars = new THREE.Points(
    createOrbitStarField(liteScene ? 90 : 170, 2.75, liteScene ? 5.6 : 6.8),
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: liteScene ? 1.45 : 1.7,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.92,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  orbitStarGroup.add(orbitStars);
  group.add(orbitStarGroup);

  const closeStars = new THREE.Points(
    createStarField(liteScene ? 120 : 260, 4.8, -4.8, 0.22),
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: liteScene ? 1.65 : 1.95,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.62,
      depthTest: true,
      depthWrite: false,
    }),
  );
  group.add(closeStars);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.12, liteScene ? 48 : 96, liteScene ? 48 : 96),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x80caff) },
        intensity: { value: 0.4 },
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
          float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
          float glow = smoothstep(0.38, 1.0, rim) * intensity;
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.set(0, -0.12, -5.35);
  group.add(glow);

  const earthParts = {
    surface: null,
    clouds: null,
    atmosphere: null,
  };

  const getObjectIdentity = (object) => {
    const materialNames = (
      Array.isArray(object.material) ? object.material : [object.material]
    )
      .map((material) => material?.name || "")
      .join(" ");

    return `${object.name} ${materialNames}`.toLowerCase();
  };

  const tuneMaterial = (object) => {
    const name = getObjectIdentity(object);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (name.includes("atmo")) {
      object.material = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0x72caff) },
          intensity: { value: 0.12 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vLocalPosition;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewPosition = -mvPosition.xyz;
            vLocalPosition = normalize(position.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vLocalPosition;

          void main() {
            float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
            float longitude = atan(vLocalPosition.z, vLocalPosition.x);
            float latitude = asin(vLocalPosition.y);
            float bands = sin(longitude * 9.0 + latitude * 5.0) * 0.5 + 0.5;
            float wisps = smoothstep(0.54, 1.0, bands) * 0.45;
            float alpha = smoothstep(0.64, 1.0, rim) * intensity * (0.62 + wisps);
            gl_FragColor = vec4(glowColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      });
      return;
    }

    materials.forEach((material) => {
      if (!material) {
        return;
      }

      if (name.includes("clouds") || name.includes("atmo")) {
        material.transparent = true;
        material.depthWrite = false;
      }

      material.needsUpdate = true;
    });
  };

  const prepareEarthModel = (model) => {
    const removable = [];

    model.traverse((object) => {
      if (object.isLight || object.isCamera) {
        removable.push(object);
        return;
      }

      if (!object.isMesh) {
        return;
      }

      if (object.geometry && !object.geometry.attributes.normal) {
        object.geometry.computeVertexNormals();
      }

      const name = getObjectIdentity(object);

      if (name.includes("clouds")) {
        earthParts.clouds = object;
        object.renderOrder = 3;
      } else if (name.includes("atmo")) {
        earthParts.atmosphere = object;
        object.renderOrder = 4;
      } else if (name.includes("earth")) {
        earthParts.surface = object;
        object.renderOrder = 2;
      }

      tuneMaterial(object);
    });

    removable.forEach((object) => object.parent?.remove(object));
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;

    model.position.sub(center);
    model.scale.multiplyScalar(4.2 / maxSize);

    return model;
  };

  const loadEarthModel = () =>
    new Promise((resolve) => {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();

      dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        EARTH_MODEL_URL,
        (gltf) => resolve(prepareEarthModel(gltf.scene)),
        undefined,
        (error) => {
          console.warn("Failed to load Earth GLB", error);
          resolve(null);
        },
      );
    });

  earthGroup.position.set(0, -0.08, -5.6);
  earthGroup.scale.setScalar(0.48);

  const earthModelReady = loadEarthModel().then((earthModel) => {
    if (!earthModel) {
      return;
    }

    earthGroup.add(earthModel);
  });

  scene.add(new THREE.AmbientLight(0x1e2d48, 0.58));
  const keyLight = new THREE.DirectionalLight(0xffffff, 6.7);
  keyLight.position.set(5.6, 2.9, 4.4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x7fb8ff, 1.12);
  fillLight.position.set(-4.8, 1.2, 2.1);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xb5ecff, 3.0);
  rimLight.position.set(-3.4, 2.4, -4.6);
  scene.add(rimLight);

  const motion = { progress: 0 };
  let autoRotationY = 0;
  let scrollRotationY = 0;
  let scrollSpinVelocity = 0;
  let targetScrollSpinVelocity = 0;
  let lastScrollY = window.scrollY;
  let renderedProgress = 0;
  let shuttleRenderedProgress = 0;
  let lastShuttleScrollY = window.scrollY;
  let shuttleIdleFrames = 0;
  let frameId;

  const readScrollProgress = () => {
    const journey = document.querySelector(".journey");
    const max = Math.max(
      (journey?.offsetHeight || window.innerHeight) - window.innerHeight,
      1,
    );
    const top = journey?.offsetTop || 0;
    return Math.min(Math.max((window.scrollY - top) / max, 0), 1);
  };

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(motion, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".journey",
        start: "top top",
        end: "bottom bottom",
        scrub: 2.8,
      },
    });
  } else {
    const updateScroll = () => {
      motion.progress = readScrollProgress();
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
  }

  const applyScrollSpinInput = (delta) => {
    if (!delta) {
      return;
    }

    targetScrollSpinVelocity += Math.max(-26, Math.min(26, delta)) * 0.00022;
  };

  const updateScrollSpin = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;

    applyScrollSpinInput(delta);
  };

  window.addEventListener("scroll", updateScrollSpin, { passive: true });
  window.addEventListener(
    "wheel",
    (event) => {
      applyScrollSpinInput(event.deltaY);
    },
    { passive: true },
  );

  const render = () => {
    const shuttleScrollDelta = window.scrollY - lastShuttleScrollY;
    const shuttleScrollSpeed = Math.abs(shuttleScrollDelta);
    const shuttleIsAdvancing = shuttleScrollDelta > 0.05;
    const shuttleIsReversing = shuttleScrollDelta < -0.05;
    lastShuttleScrollY = window.scrollY;

    renderedProgress +=
      (motion.progress - renderedProgress) * (shuttleIsReversing ? 0.12 : 0.06);
    const eased =
      renderedProgress * renderedProgress * (3 - 2 * renderedProgress);
    const approachProgress = Math.min(renderedProgress / 0.78, 1);
    const smoothApproachProgress =
      approachProgress * approachProgress * (3 - 2 * approachProgress);
    const approachEased =
      approachProgress * 0.36 + smoothApproachProgress * 0.64;
    const cruiseProgress = Math.max((eased - 0.88) / 0.12, 0);
    shuttleRenderedProgress +=
      (motion.progress - shuttleRenderedProgress) * (shuttleIsReversing ? 0.42 : 0.2);
    const shuttleProgress = Math.min(shuttleRenderedProgress / 0.32, 1);
    const shuttleFadeProgress = Math.min(
      Math.max((shuttleRenderedProgress - 0.24) / 0.16, 0),
      1,
    );
    const shuttleFadeEased =
      shuttleFadeProgress * shuttleFadeProgress * (3 - 2 * shuttleFadeProgress);
    const shuttleOpacity = shuttleVideoReady
      ? (1 - shuttleFadeEased) * 0.72
      : 0;
    if (shuttleIsAdvancing || shuttleIsReversing) {
      shuttleIdleFrames = 0;
    } else {
      shuttleIdleFrames += 1;
    }

    const narrowScreen = window.innerWidth < 760;
    const baseScale = narrowScreen ? 0.34 : 0.42;
    const peakScale = narrowScreen ? 2.78 : 3.42;
    const finalY = narrowScreen ? -3.34 : -4.05;
    const finalZ = narrowScreen ? -4.58 : -4.48;

    camera.position.x = 0;
    camera.position.y = 0.18 - approachEased * 0.045;
    camera.position.z = 9.1 - approachEased * 0.56;
    camera.lookAt(0, -0.1 - approachEased * 0.48, -5.25);

    autoRotationY += 0.00034;
    scrollSpinVelocity +=
      (targetScrollSpinVelocity - scrollSpinVelocity) * 0.035;
    scrollRotationY += scrollSpinVelocity;
    targetScrollSpinVelocity *= 0.88;
    scrollSpinVelocity *= 0.965;

    const earthRotation =
      autoRotationY + scrollRotationY + cruiseProgress * 0.24;
    earthGroup.rotation.y = earthRotation;
    earthGroup.rotation.x = 0;
    earthGroup.rotation.z = 0;
    earthGroup.position.x = 0;
    earthGroup.position.y = -0.08 + (finalY + 0.08) * approachEased;
    earthGroup.position.z = -5.6 + (finalZ + 5.6) * approachEased;
    earthGroup.scale.setScalar(
      baseScale + (peakScale - baseScale) * approachEased,
    );

    if (earthParts.surface) {
      earthParts.surface.rotation.y += 0.00005;
    }

    if (earthParts.clouds) {
      earthParts.clouds.rotation.y +=
        0.00018 + Math.abs(scrollSpinVelocity) * 0.01;
    }

    if (earthParts.atmosphere) {
      earthParts.atmosphere.rotation.y +=
        0.1 + Math.abs(scrollSpinVelocity) * 0.19;
    }

    glow.position.x = earthGroup.position.x;
    glow.position.y = earthGroup.position.y;
    glow.position.z = earthGroup.position.z;
    glow.scale.setScalar(
      (narrowScreen ? 0.42 : 0.5) +
        approachEased * (narrowScreen ? 1.34 : 1.58),
    );
    glow.material.uniforms.intensity.value = 0.045 + approachEased * 0.08;

    if (shuttleVideoReady) {
      const shuttleTargetTime = getKeyframedVideoTime(
        shuttleRenderedProgress,
        shuttleVideoDuration,
      );
      const shuttleTimeGap = shuttleTargetTime - shuttleVideo.currentTime;

      if (motion.progress < 0.004 && shuttleVideo.currentTime > 0.04) {
        requestShuttleSeek(0.01, true);
      }

    if (shuttleTimeGap < -0.018 && shuttleOpacity > 0.01) {
        requestShuttleSeek(
          shuttleTargetTime,
          shuttleIsReversing || shuttleScrollSpeed > 9,
        );
      } else if (
        shuttleOpacity > 0.01 &&
        shuttleTimeGap > 0.018 &&
        (shuttleIsAdvancing || shuttleIdleFrames < 10)
      ) {
        shuttleVideo.playbackRate = Math.min(
          Math.max(shuttleTimeGap * 8 + shuttleScrollSpeed * 0.26, 0.5),
          12,
        );

        if (shuttleVideo.paused) {
          shuttleVideo.play().catch(() => {});
        }
      } else {
        if (!shuttleVideo.paused) {
          shuttleVideo.pause();
        }
      }
    }

    shuttleMaterial.uniforms.opacity.value = shuttleOpacity;

    deepStars.rotation.y += 0.00012;
    stars.rotation.y += 0.00025;
    closeStars.rotation.y += 0.00038;
    orbitStarGroup.position.copy(earthGroup.position);
    orbitStarGroup.rotation.z += 0.0018 + Math.abs(scrollSpinVelocity) * 0.065;
    orbitStarGroup.rotation.x = -0.18 + approachEased * 0.06;
    orbitStarGroup.rotation.y = earthRotation * 0.08;
    orbitStarGroup.scale.setScalar(
      (narrowScreen ? 0.76 : 0.82) + approachEased * (narrowScreen ? 0.42 : 0.58),
    );
    deepStars.position.y = -approachEased * 0.72;
    stars.position.y = -approachEased * 1.18;
    closeStars.position.y = -approachEased * 1.7;
    deepStars.position.z = approachEased * 0.32;
    stars.position.z = approachEased * 0.54;
    closeStars.position.z = approachEased * 0.76;
    group.rotation.x = -approachEased * 0.022;

    deepStars.material.opacity = 0.7 - approachEased * 0.08;
    stars.material.opacity = 0.84 - approachEased * 0.1;
    orbitStars.material.opacity = 0.92 - approachEased * 0.12;
    closeStars.material.opacity = 0.62 - approachEased * 0.1;

    renderer.clear();
    renderer.render(scene, camera);

    if (shuttleOpacity > 0.01) {
      renderer.clearDepth();
      renderer.render(shuttleScene, shuttleCamera);
    }

    frameId = window.requestAnimationFrame(render);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeShuttleOverlay();
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
      return;
    }

    render();
  });

  await withTimeout(
    Promise.allSettled([shuttleMetadataReady, earthModelReady]),
    usesConstrainedNetwork ? 3600 : 5200,
  );
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
      status.textContent =
        "Заявка отправлена. Мы свяжемся с вами после изучения проекта.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent =
        "Не удалось отправить заявку. Напишите нам напрямую: florencya08090@gmail.com";
    } finally {
      submitButton.disabled = false;
    }
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  initSmoothScroll();
  initScrollAssist();
  initLeadForm();

  const sceneReady = initSpaceScene().catch((error) => {
    console.warn("Failed to initialize space scene", error);
  });

  initRevealAnimations();
  initJourneyMotion();

  await Promise.allSettled([
    withTimeout(getWindowReadyPromise(), 2800),
    withTimeout(getFontsReadyPromise(), 2800),
    withTimeout(sceneReady, usesConstrainedNetwork ? 4200 : 6200),
    wait(700),
  ]);

  markPageReady();

  if (window.ScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

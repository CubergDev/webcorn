const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const COLLADA_LOADER_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/ColladaLoader.js";

const SATURN_ASSETS = {
  model: "saturn/uploads-files-4052472-Stylized+Planets.dae",
  textureRoot: "saturn/Textures/Saturn 4K/",
  saturnBase: "saturn/Textures/Saturn 4K/Saturn2_Saturn_BaseColor.png",
  saturnNormal: "saturn/Textures/Saturn 4K/Saturn2_Saturn_Normal.png",
  saturnRoughness: "saturn/Textures/Saturn 4K/Saturn2_Saturn_Roughness.png",
  saturnMetallic: "saturn/Textures/Saturn 4K/Saturn2_Saturn_Metallic.png",
  ringsBase: "saturn/Textures/Saturn 4K/Saturn2_Rings_BaseColor.png",
  ringsNormal: "saturn/Textures/Saturn 4K/Saturn2_Rings_Normal.png",
  ringsRoughness: "saturn/Textures/Saturn 4K/Saturn2_Rings_Roughness.png",
  ringsMetallic: "saturn/Textures/Saturn 4K/Saturn2_Rings_Metallic.png",
  moonBase: "saturn/Textures/Moon 4K/Saturn2_Saturn_BaseColor.png",
};

const resolveThreeRuntime = async () => {
  try {
    const [threeModule, colladaModule] = await Promise.all([
      import(THREE_MODULE_URL),
      import(COLLADA_LOADER_URL),
    ]);

    return {
      THREE: threeModule,
      ColladaLoader: colladaModule.ColladaLoader,
    };
  } catch (error) {
    return {
      THREE: window.THREE,
      ColladaLoader: null,
    };
  }
};

const initSpaceScene = async () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas || prefersReducedMotion) {
    return;
  }

  const { THREE, ColladaLoader } = await resolveThreeRuntime();

  if (!THREE) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  const group = new THREE.Group();
  const saturnGroup = new THREE.Group();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
  }
  scene.background = new THREE.Color(0x020713);
  scene.fog = new THREE.FogExp2(0x020713, 0.026);
  scene.add(group);
  camera.position.set(0.18, 0.2, 8.9);
  group.add(saturnGroup);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
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

  const deepStars = new THREE.Points(
    createStarField(1450, 9.2, -12, 0.34),
    new THREE.PointsMaterial({
      color: 0xdaf6ff,
      size: 0.014,
      transparent: true,
      opacity: 0.56,
    })
  );
  group.add(deepStars);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = 760;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const angle = i * 2.399963;
    const radius = 6 + (i % 64) * 0.13;
    const depth = -9 - (i % 28) * 0.8;

    starPositions[i * 3] = Math.cos(angle) * radius;
    starPositions[i * 3 + 1] = ((i % 37) - 18) * 0.32;
    starPositions[i * 3 + 2] = depth + Math.sin(angle) * 2.2;
  }

  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xdaf6ff,
      size: 0.025,
      transparent: true,
      opacity: 0.72,
    })
  );
  group.add(stars);

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
  glow.position.set(2.7, -0.1, -5.25);
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
    const embeddedLights = [];

    model.traverse((object) => {
      if (object.isLight) {
        embeddedLights.push(object);
        return;
      }

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

    embeddedLights.forEach((light) => light.parent?.remove(light));
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;

    model.position.sub(center);
    model.scale.multiplyScalar(4.8 / maxSize);
    model.rotation.set(-0.14, -0.34, -0.18);

    return model;
  };

  const createFallbackSaturn = () => {
    const fallback = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.36, 128, 128), materials.saturn);
    const rings = new THREE.Mesh(new THREE.RingGeometry(1.72, 3.48, 256, 4), materials.rings);
    const ringLineA = new THREE.Mesh(
      new THREE.TorusGeometry(2.02, 0.018, 10, 220),
      new THREE.MeshBasicMaterial({ color: 0xe2c081, transparent: true, opacity: 0.78 })
    );
    const ringLineB = new THREE.Mesh(
      new THREE.TorusGeometry(2.72, 0.014, 10, 220),
      new THREE.MeshBasicMaterial({ color: 0xb88d58, transparent: true, opacity: 0.62 })
    );

    rings.rotation.x = Math.PI * 0.5;
    ringLineA.rotation.x = Math.PI * 0.5;
    ringLineB.rotation.x = Math.PI * 0.5;
    fallback.add(body, rings, ringLineA, ringLineB);
    fallback.rotation.set(-0.34, -0.18, -0.34);

    return fallback;
  };

  const loadSaturnModel = () =>
    new Promise((resolve) => {
      if (!ColladaLoader) {
        resolve(null);
        return;
      }

      const loader = new ColladaLoader();
      loader.setResourcePath(SATURN_ASSETS.textureRoot);
      loader.load(
        SATURN_ASSETS.model,
        (collada) => resolve(prepareSaturnModel(collada.scene)),
        undefined,
        () => resolve(null)
      );
    });

  const fallbackSaturn = createFallbackSaturn();
  saturnGroup.add(fallbackSaturn);
  saturnGroup.position.set(3.28, -0.08, -5.82);
  saturnGroup.scale.setScalar(1.02);

  loadSaturnModel().then((saturnModel) => {
    if (!saturnModel) {
      return;
    }

    saturnGroup.remove(fallbackSaturn);
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
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.4);
  keyLight.position.set(5.8, 3.2, 4.8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x84cfff, 1.18);
  fillLight.position.set(-3.2, 1.8, 3.4);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x65d8ff, 1.75);
  rimLight.position.set(-4, 1.6, -2);
  scene.add(rimLight);

  const motion = { progress: 0 };
  let autoRotationY = 0;
  let renderedProgress = 0;
  let frameId;

  const readScrollProgress = () => {
    const journey = document.querySelector(".journey");
    const max = Math.max((journey?.offsetHeight || window.innerHeight) - window.innerHeight, 1);
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
        scrub: 1.6,
      },
    });
  } else {
    const updateScroll = () => {
      motion.progress = readScrollProgress();
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
  }

  const render = () => {
    renderedProgress += (motion.progress - renderedProgress) * 0.04;
    const eased = renderedProgress * renderedProgress * (3 - 2 * renderedProgress);

    const narrowScreen = window.innerWidth < 760;
    const baseSaturnX = narrowScreen ? 1.42 : 3.28;
    const baseSaturnY = narrowScreen ? -0.28 : -0.08;
    const baseSaturnScale = narrowScreen ? 0.78 : 1.02;

    camera.position.x = 0.02 + eased * 0.14;
    camera.position.y = 0.18 - eased * 0.04;
    camera.position.z = 8.75 - eased * 0.62;
    camera.lookAt(0.34 + eased * 0.12, -0.04, -5.4);

    autoRotationY += 0.00072;
    saturnGroup.rotation.y = autoRotationY + eased * Math.PI * 1.35;
    saturnGroup.rotation.x = -0.02 + eased * 0.035;
    saturnGroup.rotation.z = -0.015 - eased * 0.025;
    saturnGroup.position.x = baseSaturnX - eased * 0.12;
    saturnGroup.position.y = baseSaturnY + eased * 0.035;
    saturnGroup.scale.setScalar(baseSaturnScale + eased * 0.08);
    glow.position.x = saturnGroup.position.x;
    glow.position.y = saturnGroup.position.y;
    glow.scale.setScalar(narrowScreen ? 0.72 : 0.9);
    glow.material.uniforms.intensity.value = 0.13 + eased * 0.055;

    deepStars.rotation.y += 0.00012;
    stars.rotation.y += 0.00025;
    group.rotation.x = -eased * 0.035;

    deepStars.material.opacity = 0.58 - eased * 0.12;
    stars.material.opacity = 0.74 - eased * 0.18;

    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
      return;
    }

    render();
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
  initSpaceScene();
  initJourneyMotion();
  initLeadForm();
});

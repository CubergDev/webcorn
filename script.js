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

const EARTH_ASSETS = {
  diffuse: "assets/space/earth-blue-marble-4096.jpg",
  lights: "assets/space/earth-city-lights-4096.jpg",
  clouds: "assets/space/earth-clouds-1024.png",
  specular: "assets/space/earth-specular-2048.jpg",
  normal: "assets/space/earth-normal-2048.jpg",
  moon: "assets/space/moon-1024.jpg",
};

const initSpaceScene = () => {
  const canvas = document.getElementById("space-canvas");

  if (!canvas || !window.THREE || prefersReducedMotion) {
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
  }
  scene.add(group);
  camera.position.set(0, 0.4, 11.5);

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
    createStarField(1150, 8.4, -12, 0.34),
    new THREE.PointsMaterial({
      color: 0xdaf6ff,
      size: 0.014,
      transparent: true,
      opacity: 0.56,
    })
  );
  group.add(deepStars);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = 680;
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

  // NASA Blue Marble texture replaces the old generated cartoon map.
  const earthTexture = loadTexture(EARTH_ASSETS.diffuse, true);
  const cityLightsTexture = loadTexture(EARTH_ASSETS.lights, true);
  const cloudTexture = loadTexture(EARTH_ASSETS.clouds, true);
  const specularTexture = loadTexture(EARTH_ASSETS.specular);
  const normalTexture = loadTexture(EARTH_ASSETS.normal);
  const moonTexture = loadTexture(EARTH_ASSETS.moon, true);
  const lightDirection = new THREE.Vector3(7.2, 3.4, 5.7).normalize();

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 128, 128),
    new THREE.MeshPhongMaterial({
      map: earthTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.46, 0.46),
      specularMap: specularTexture,
      color: 0xffffff,
      emissive: new THREE.Color(0x143a66),
      emissiveIntensity: 0.1,
      specular: new THREE.Color(0x8ad6ff),
      shininess: 34,
    })
  );
  earth.position.set(2.5, -0.25, -5.8);
  earth.rotation.set(-0.34, 0.7, -0.18);
  group.add(earth);

  const cityLights = new THREE.Mesh(
    new THREE.SphereGeometry(2.207, 128, 128),
    new THREE.ShaderMaterial({
      uniforms: {
        lightsMap: { value: cityLightsTexture },
        lightDirection: { value: lightDirection },
        opacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D lightsMap;
        uniform vec3 lightDirection;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vec3 lights = texture2D(lightsMap, vUv).rgb;
          float lightStrength = max(max(lights.r, lights.g), lights.b);
          float nightSide = 1.0 - smoothstep(-0.16, 0.2, dot(normalize(vWorldNormal), normalize(lightDirection)));
          float cityMask = smoothstep(0.08, 0.82, lightStrength) * nightSide * opacity;
          vec3 cityColor = mix(vec3(1.0, 0.56, 0.2), vec3(0.65, 0.86, 1.0), smoothstep(0.58, 1.0, lightStrength));

          gl_FragColor = vec4(cityColor * lightStrength * 2.35, cityMask);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  cityLights.position.copy(earth.position);
  cityLights.rotation.copy(earth.rotation);
  group.add(cityLights);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(2.225, 128, 128),
    new THREE.MeshLambertMaterial({
      map: cloudTexture,
      alphaMap: cloudTexture,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  clouds.position.copy(earth.position);
  clouds.rotation.copy(earth.rotation);
  group.add(clouds);

  const hazeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x72dcff) },
      lightDirection: { value: lightDirection },
      opacity: { value: 0.52 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = -mvPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform vec3 lightDirection;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldNormal;

      void main() {
        float viewRim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
        float sunSide = smoothstep(-0.18, 0.82, dot(normalize(vWorldNormal), normalize(lightDirection)));
        float horizon = pow(viewRim, 2.1) * 0.74;
        float dayHaze = pow(sunSide, 4.0) * 0.08;
        float alpha = (horizon + dayHaze) * opacity;

        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const atmosphereHaze = new THREE.Mesh(
    new THREE.SphereGeometry(2.34, 128, 128),
    hazeMaterial
  );
  atmosphereHaze.position.copy(earth.position);
  atmosphereHaze.rotation.copy(earth.rotation);
  group.add(atmosphereHaze);

  const rimAtmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x69d9ff) },
      intensity: { value: 1.0 },
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
        float glow = pow(rim, 2.35) * intensity;
        gl_FragColor = vec4(glowColor, glow);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.42, 128, 128),
    rimAtmosphereMaterial
  );
  atmosphere.position.copy(earth.position);
  atmosphere.rotation.copy(earth.rotation);
  group.add(atmosphere);

  const surfaceGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, 128, 128),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x7f8cff) },
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
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
          float glow = pow(rim, 3.4) * 0.55;
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  surfaceGlow.position.copy(earth.position);
  surfaceGlow.rotation.copy(earth.rotation);
  group.add(surfaceGlow);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 64, 64),
    new THREE.MeshPhongMaterial({
      map: moonTexture,
      color: 0xf4f6ff,
      emissive: new THREE.Color(0x111827),
      emissiveIntensity: 0.08,
      shininess: 5,
    })
  );
  moon.position.set(-4.8, 2.15, -7.4);
  moon.rotation.set(0.18, -0.65, 0.08);
  group.add(moon);

  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.74, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xaedfff) },
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
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
          float glow = pow(rim, 2.8) * 0.34;
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  moonGlow.position.copy(moon.position);
  group.add(moonGlow);

  scene.add(new THREE.AmbientLight(0xcfeaff, 0.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.65);
  keyLight.position.set(7.2, 3.4, 5.7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8fcfff, 0.72);
  fillLight.position.set(-2.8, 1.4, 4.5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x65d8ff, 1.7);
  rimLight.position.set(-4, 1.6, -2);
  scene.add(rimLight);

  let scrollProgress = 0;
  let renderedProgress = 0;
  let frameId;

  const updateScroll = () => {
    const journey = document.querySelector(".journey");
    const max = Math.max((journey?.offsetHeight || window.innerHeight) - window.innerHeight, 1);
    const top = journey?.offsetTop || 0;
    scrollProgress = Math.min(Math.max((window.scrollY - top) / max, 0), 1);
  };

  const render = () => {
    renderedProgress += (scrollProgress - renderedProgress) * 0.055;
    const eased = renderedProgress * renderedProgress * (3 - 2 * renderedProgress);
    const cameraZoom = 11.8 - eased * 4.45;

    camera.position.z = cameraZoom;
    camera.position.x = eased * 0.72;
    camera.position.y = 0.42 - eased * 0.32;

    earth.scale.setScalar(1 + eased * 1.42);
    cityLights.scale.setScalar(1 + eased * 1.435);
    clouds.scale.setScalar(1 + eased * 1.46);
    atmosphereHaze.scale.setScalar(1 + eased * 1.49);
    atmosphere.scale.setScalar(1 + eased * 1.52);
    surfaceGlow.scale.setScalar(1 + eased * 1.62);
    moon.position.x = -4.8 + eased * 0.62;
    moon.position.y = 2.15 - eased * 0.16;
    moonGlow.position.copy(moon.position);

    earth.rotation.y += 0.0018;
    cityLights.rotation.y = earth.rotation.y;
    clouds.rotation.y += 0.00235;
    atmosphereHaze.rotation.y = earth.rotation.y - 0.02;
    atmosphere.rotation.y = earth.rotation.y - 0.04;
    surfaceGlow.rotation.y = earth.rotation.y - 0.08;
    moon.rotation.y += 0.00085;
    deepStars.rotation.y += 0.00012;
    stars.rotation.y += 0.00025;
    group.rotation.x = -eased * 0.08;

    atmosphereHaze.material.uniforms.opacity.value = 0.46 + eased * 0.18;
    atmosphere.material.uniforms.intensity.value = 0.84 + eased * 0.34;
    cityLights.material.uniforms.opacity.value = 0.74 + eased * 0.22;
    deepStars.material.opacity = 0.58 - eased * 0.12;
    stars.material.opacity = 0.72 - eased * 0.28;

    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
      return;
    }

    render();
  });

  updateScroll();
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

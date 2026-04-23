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
  diffuse: "assets/space/earth-blue-marble-3072.jpg",
  clouds: "assets/space/earth-clouds-1024.png",
  specular: "assets/space/earth-specular-2048.jpg",
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
  renderer.setSize(window.innerWidth, window.innerHeight);
  scene.add(group);
  camera.position.set(0, 0.4, 11.5);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const loadTexture = (url, isColorTexture = false) => {
    const texture = textureLoader.load(url);
    texture.anisotropy = maxAnisotropy;

    if (isColorTexture) {
      if ("colorSpace" in texture && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
      }
    }

    return texture;
  };

  const starGeometry = new THREE.BufferGeometry();
  const starCount = 520;
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
  const cloudTexture = loadTexture(EARTH_ASSETS.clouds, true);
  const specularTexture = loadTexture(EARTH_ASSETS.specular);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 128, 128),
    new THREE.MeshPhongMaterial({
      map: earthTexture,
      specularMap: specularTexture,
      specular: new THREE.Color(0x2c7fff),
      shininess: 18,
    })
  );
  earth.position.set(2.5, -0.25, -5.8);
  group.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(2.225, 128, 128),
    new THREE.MeshLambertMaterial({
      map: cloudTexture,
      alphaMap: cloudTexture,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  clouds.position.copy(earth.position);
  group.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.38, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x64d8ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  atmosphere.position.copy(earth.position);
  group.add(atmosphere);

  const surfaceGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.52, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x8e7bff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  surfaceGlow.position.copy(earth.position);
  group.add(surfaceGlow);

  scene.add(new THREE.AmbientLight(0x9fcfff, 0.44));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(6.5, 2.8, 5.2);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x65d8ff, 0.9);
  rimLight.position.set(-4, 1.6, -2);
  scene.add(rimLight);

  let scrollProgress = 0;
  let frameId;

  const updateScroll = () => {
    const journey = document.querySelector(".journey");
    const max = Math.max((journey?.offsetHeight || window.innerHeight) - window.innerHeight, 1);
    const top = journey?.offsetTop || 0;
    scrollProgress = Math.min(Math.max((window.scrollY - top) / max, 0), 1);
  };

  const render = () => {
    const eased = 1 - Math.pow(1 - scrollProgress, 3);
    const cameraZoom = 11.5 - eased * 6.9;

    camera.position.z = cameraZoom;
    camera.position.x = eased * 1.1;
    camera.position.y = 0.4 - eased * 0.52;

    earth.scale.setScalar(1 + eased * 2.15);
    clouds.scale.setScalar(1 + eased * 2.17);
    atmosphere.scale.setScalar(1 + eased * 2.18);
    surfaceGlow.scale.setScalar(1 + eased * 2.28);

    earth.rotation.y += 0.0018;
    clouds.rotation.y += 0.00235;
    atmosphere.rotation.y -= 0.001;
    stars.rotation.y += 0.00025;
    group.rotation.x = -eased * 0.08;

    atmosphere.material.opacity = 0.12 + eased * 0.22;
    surfaceGlow.material.opacity = 0.03 + eased * 0.13;
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

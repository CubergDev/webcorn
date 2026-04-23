const LEADS_STORAGE_KEY = "webfactory-crm-leads";
const LEGACY_REQUESTS_KEY = "webfactory-template-requests";
const SELECTION_STORAGE_KEY = "webfactory-active-selection";
const PAYMENT_PROFILE_STORAGE_KEY = "webfactory-payment-profile";
const PENDING_LEAD_KEY = "webfactory-pending-lead";
const STATUS_NEW = "Новый";
const ORDER_STATUS_PENDING = "Ожидает оплаты";
const ORDER_STATUS_PAID = "Оплачен";
const ORDER_STATUS_FAILED = "Ошибка оплаты";
const LANGUAGE_LOCALES = {
  ru: "ru-RU",
  en: "en-US",
};
const CLOUDPAYMENTS_LOCALES = {
  ru: "ru-RU",
  en: "en-US",
};

const header = document.querySelector(".site-header");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".site-nav a");
const revealNodes = document.querySelectorAll("[data-reveal]");
const progressBar = document.querySelector("[data-scroll-progress]");
const packageButtons = document.querySelectorAll("[data-pick-package]");
const paymentButtons = document.querySelectorAll("[data-pay-product]");
const leadForms = document.querySelectorAll("[data-lead-form]");
const accountLinks = document.querySelectorAll("[data-account-link]");

let paymentDialog = null;
let activePaymentContext = null;
let cloudPaymentsScriptPromise = null;
let threeScriptPromise = null;
let authStatePromise = null;

const getSiteLanguage = () => window.WebfactoryI18n?.language ?? "ru";
const getSiteLocale = () => LANGUAGE_LOCALES[getSiteLanguage()] ?? LANGUAGE_LOCALES.ru;
const translateMessage = (key, fallback, params = {}) =>
  window.WebfactoryI18n?.message(key, params) || fallback;
const translateText = (value) => window.WebfactoryI18n?.text(value) ?? value;
const API_ORIGIN = (() => {
  const params = new URLSearchParams(window.location.search);
  const explicit = (params.get("api") || window.localStorage?.getItem("webfactory-api-origin") || "").trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (window.location.protocol === "file:") {
    return "http://localhost:8080";
  }

  return "";
})();

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const readPendingLead = () =>
  safeJsonParse(window.sessionStorage?.getItem(PENDING_LEAD_KEY) ?? "null") ?? null;

const savePendingLead = (payload) => {
  if (!window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(payload));
};

const getAuthState = async (force = false) => {
  if (!force && authStatePromise) {
    return authStatePromise;
  }

  authStatePromise = fetchJson("/api/auth/me")
    .then((payload) => ({
      authenticated: Boolean(payload.authenticated),
      user: payload.user ?? null,
    }))
    .catch(() => ({
      authenticated: false,
      user: null,
    }));

  return authStatePromise;
};

const updateAccountLinks = (authState) => {
  accountLinks.forEach((link) => {
    if (authState.authenticated && authState.user?.role === "customer") {
      link.textContent = translateText("Кабинет");
      link.setAttribute("href", "account.html");
      return;
    }

    link.textContent = translateText("Войти");
    link.setAttribute("href", "account.html");
  });
};

const syncLeadFormsWithAuth = (authState) => {
  if (!leadForms.length) {
    return;
  }

  leadForms.forEach((form) => {
    const fullNameField = form.querySelector('[name="fullName"]');
    const businessNameField = form.querySelector('[name="businessName"]');
    const emailField = form.querySelector('[name="email"]');

    if (authState.authenticated && authState.user?.role === "customer") {
      if (fullNameField && !fullNameField.value) {
        fullNameField.value = authState.user.fullName ?? "";
      }
      if (businessNameField && !businessNameField.value) {
        businessNameField.value = authState.user.businessName ?? "";
      }
      if (emailField) {
        emailField.value = authState.user.email ?? "";
        emailField.readOnly = true;
      }
      return;
    }

    if (emailField) {
      emailField.readOnly = false;
    }
  });
};

const readStorageList = (key) => {
  if (!window.localStorage) {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  const parsed = raw ? safeJsonParse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
};

const saveStorageList = (key, value) => {
  if (!window.localStorage) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const mapLegacyStatus = (value) => {
  const statusMap = {
    New: "Новый",
    Contacted: "Контакт",
    "Proposal Sent": "КП отправлено",
    "In Progress": "В работе",
    "Closed Won": "Успешно",
    "Closed Lost": "Закрыт",
  };

  return statusMap[value] ?? value ?? STATUS_NEW;
};

const normalizeLead = (lead = {}) => ({
  id: lead.id ?? `WF-${Date.now().toString(36).toUpperCase()}`,
  status: mapLegacyStatus(lead.status),
  fullName: lead.fullName ?? "",
  businessName: lead.businessName ?? "",
  email: lead.email ?? "",
  phone: lead.phone ?? "",
  country: lead.country ?? "",
  niche: lead.niche ?? lead.businessType ?? "",
  packageTier: lead.packageTier ?? lead.tier ?? "",
  selectedTemplate: lead.selectedTemplate ?? lead.template ?? "",
  currentWebsite: lead.currentWebsite ?? "",
  budgetRange: lead.budgetRange ?? lead.budget ?? "",
  timeline: lead.timeline ?? "",
  projectDetails: lead.projectDetails ?? lead.customizationNeeds ?? lead.customization ?? "",
  source: lead.source ?? "Сайт webcorn",
  notes: lead.notes ?? "",
  invoiceId: lead.invoiceId ?? "",
  paymentStatus: lead.paymentStatus ?? "",
  paymentAmount: lead.paymentAmount ?? "",
  paymentCurrency: lead.paymentCurrency ?? "",
  paidAt: lead.paidAt ?? "",
  orderStatus: lead.orderStatus ?? "",
  cloudpaymentsTransactionId: lead.cloudpaymentsTransactionId ?? "",
  submittedAt: lead.submittedAt ?? new Date().toISOString(),
  lastUpdatedAt: lead.lastUpdatedAt ?? lead.submittedAt ?? new Date().toISOString(),
});

const normalizePackageTier = (value) => {
  const map = {
    Lite: "Легкий",
    Pro: "Средний",
    Signature: "Премиум",
  };

  return map[value] ?? value ?? "";
};

const migrateLegacyLeads = () => {
  const current = readStorageList(LEADS_STORAGE_KEY);

  if (current.length) {
    return current.map(normalizeLead);
  }

  const legacy = readStorageList(LEGACY_REQUESTS_KEY);

  if (!legacy.length) {
    return [];
  }

  const migrated = legacy.map((lead) =>
    normalizeLead({
      ...lead,
      niche: lead.niche ?? lead.businessType ?? "",
      packageTier: lead.packageTier ?? lead.tier ?? "",
      selectedTemplate: lead.selectedTemplate ?? lead.template ?? "",
      budgetRange: lead.budgetRange ?? lead.budget ?? "",
      projectDetails: lead.projectDetails ?? lead.customization ?? "",
    })
  );

  saveStorageList(LEADS_STORAGE_KEY, migrated);
  return migrated;
};

const getStoredLeads = () => migrateLegacyLeads();

const saveLead = (lead) => {
  const leads = getStoredLeads().filter((item) => item.id !== lead.id);
  leads.unshift(normalizeLead(lead));
  saveStorageList(LEADS_STORAGE_KEY, leads);
};

const readSelection = () => {
  const params = new URLSearchParams(window.location.search);
  const stored = safeJsonParse(window.sessionStorage?.getItem(SELECTION_STORAGE_KEY) ?? "null") ?? {};
  return {
    niche: params.get("niche") ?? stored.niche ?? "",
    packageTier: normalizePackageTier(params.get("paket") ?? stored.packageTier ?? ""),
    selectedTemplate: params.get("demo") ?? stored.selectedTemplate ?? "",
  };
};

const saveSelection = (selection) => {
  if (!window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
};

const readPaymentProfile = () =>
  safeJsonParse(window.localStorage?.getItem(PAYMENT_PROFILE_STORAGE_KEY) ?? "null") ?? {};

const savePaymentProfile = (profile) => {
  if (!window.localStorage) {
    return;
  }

  window.localStorage.setItem(PAYMENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

const buildFormBody = (payload) => {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    params.set(key, String(value));
  });

  return params;
};

const apiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_ORIGIN}${path}`;
};

const normalizeRequestError = (error, fallback) => {
  const raw = String(error?.message ?? "").trim();
  const networkMessages = new Set([
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
  ]);

  if (networkMessages.has(raw)) {
    return translateText(
      "Не удалось подключиться к серверу. Откройте сайт через http://localhost:8080 или запустите java src/Main.java."
    );
  }

  return raw || fallback;
};

const readResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  const parsed = safeJsonParse(text);
  return parsed ?? { message: text };
};

const fetchJson = async (url) => {
  try {
    const response = await window.fetch(apiUrl(url), {
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await readResponsePayload(response);

    if (!response.ok || payload.success === false) {
      throw new Error(translateText(payload.message ?? "Сервер вернул ошибку."));
    }

    return payload;
  } catch (error) {
    throw new Error(normalizeRequestError(error, translateText("Сервер вернул ошибку.")));
  }
};

const postForm = async (url, payload) => {
  try {
    const response = await window.fetch(apiUrl(url), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json",
      },
      body: buildFormBody(payload).toString(),
    });
    const result = await readResponsePayload(response);

    if (!response.ok || result.success === false) {
      throw new Error(translateText(result.message ?? "Не удалось выполнить запрос."));
    }

    return result;
  } catch (error) {
    throw new Error(normalizeRequestError(error, translateText("Не удалось выполнить запрос.")));
  }
};

const formatAmount = (amount, currency = "KZT") => {
  const numeric = Number(String(amount ?? "").replace(",", "."));
  const suffix = currency === "KZT" ? "₸" : currency;

  if (!Number.isFinite(numeric)) {
    return amount ? `${amount} ${suffix}` : "—";
  }

  return `${new Intl.NumberFormat(getSiteLocale()).format(numeric)} ${suffix}`;
};

const initEmbeddedPreviewMode = () => {
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = params.get("embed") === "1" || window.self !== window.top;

  if (!isEmbedded) {
    return;
  }

  document.body.classList.add("is-embed-preview");
};

const setHeaderState = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 40);
};

const initHeader = () => {
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  navToggle?.addEventListener("click", () => {
    header.classList.toggle("is-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      header?.classList.remove("is-open");
    });
  });
};

const initProgress = () => {
  if (!progressBar) {
    return;
  }

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
};

const initReveals = () => {
  if (!revealNodes.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  revealNodes.forEach((node) => observer.observe(node));
};

const updateSelectionUI = (selection) => {
  document.querySelectorAll("[data-selection-title]").forEach((node) => {
    node.classList.remove("is-attention");
    node.textContent = selection.selectedTemplate
      ? translateText(selection.selectedTemplate)
      : translateText("Выберите уровень");
  });

  document.querySelectorAll("[data-selection-tier]").forEach((node) => {
    node.textContent = selection.packageTier
      ? translateText(selection.packageTier)
      : translateText("Без пакета");
  });

  document.querySelectorAll("[data-selection-niche]").forEach((node) => {
    node.textContent = selection.niche ? translateText(selection.niche) : translateText("Без ниши");
  });

  leadForms.forEach((form) => {
    const nicheField = form.querySelector('[name="niche"]');
    const packageField = form.querySelector('[name="packageTier"]');
    const templateField = form.querySelector('[name="selectedTemplate"]');

    if (nicheField && selection.niche) {
      nicheField.value = selection.niche;
    }

    if (packageField && selection.packageTier) {
      packageField.value = selection.packageTier;
    }

    if (templateField && selection.selectedTemplate) {
      templateField.value = selection.selectedTemplate;
    }
  });

  packageButtons.forEach((button) => {
    const isActive =
      normalizePackageTier(button.dataset.package) === selection.packageTier &&
      button.dataset.template === selection.selectedTemplate &&
      button.dataset.niche === selection.niche;
    button.classList.toggle("is-active", Boolean(isActive));
  });
};

const readSelectionFromButton = (button) => ({
  niche: button.dataset.niche ?? "",
  packageTier: normalizePackageTier(button.dataset.package ?? button.dataset.packageTier ?? ""),
  selectedTemplate: button.dataset.template ?? "",
});

const syncSelectionFromButton = (button) => {
  const selection = readSelectionFromButton(button);

  if (selection.niche || selection.packageTier || selection.selectedTemplate) {
    saveSelection(selection);
    updateSelectionUI(selection);
  }

  return selection;
};

const initPackageSelection = () => {
  updateSelectionUI(readSelection());

  packageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      syncSelectionFromButton(button);

      if (button.dataset.payProduct) {
        return;
      }

      const target = document.getElementById(button.dataset.target ?? "request");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

const validateField = (field) => {
  const value = field.value.trim();
  const isRequired = field.hasAttribute("required");
  const isEmail = field.type === "email";
  let valid = true;

  if (isRequired && !value) {
    valid = false;
  }

  if (valid && isEmail && value) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  field.classList.toggle("is-invalid", !valid);
  return valid;
};

const collectFormData = (form) => {
  const formData = new FormData(form);
  const selection = readSelection();

  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    businessName: String(formData.get("businessName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    niche: String(formData.get("niche") ?? selection.niche ?? "").trim(),
    packageTier: String(formData.get("packageTier") ?? selection.packageTier ?? "").trim(),
    selectedTemplate: String(formData.get("selectedTemplate") ?? selection.selectedTemplate ?? "").trim(),
    currentWebsite: String(formData.get("currentWebsite") ?? "").trim(),
    budgetRange: String(formData.get("budgetRange") ?? "").trim(),
    timeline: String(formData.get("timeline") ?? "").trim(),
    projectDetails: String(formData.get("projectDetails") ?? "").trim(),
  };
};

const resetFormState = (form) => {
  form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
  const box = form.querySelector(".form-success");
  box?.classList.remove("is-visible", "is-error");
};

const showFormMessage = (form, message, tone = "success") => {
  const box = form.querySelector(".form-success");

  if (!box) {
    return;
  }

  if (tone === "error") {
    box.textContent = translateText(message);
  } else {
    box.innerHTML = message;
  }
  box.classList.toggle("is-error", tone === "error");
  box.classList.add("is-visible");
};

const showSuccessState = (form, lead) => {
  showFormMessage(
    form,
    translateMessage(
    "leadFormSuccess",
      `<strong>Заявка принята.</strong> Код ${lead.id}. Теперь ее статус будет виден в вашем личном кабинете.`,
      { id: lead.id }
    ),
    "success"
  );
};

const submitLeadToServer = async (form, leadData) => {
  const response = await postForm("/api/leads/create", {
    ...leadData,
    source: form.dataset.source ?? "Сайт webcorn",
  });

  return normalizeLead(response.lead ?? leadData);
};

const ensureCustomerForLead = async (form, leadData) => {
  const authState = await getAuthState();

  if (authState.authenticated && authState.user?.role === "customer") {
    return authState;
  }

  savePendingLead({
    payload: leadData,
    source: form.dataset.source ?? "Сайт webcorn",
    pageUrl: window.location.href,
    createdAt: new Date().toISOString(),
  });

  window.location.href = "account.html";
  return null;
};

const initLeadForms = () => {
  if (!leadForms.length) {
    return;
  }

  leadForms.forEach((form) => {
    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.classList.contains("is-invalid")) {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      resetFormState(form);

      const requiredFields = Array.from(form.querySelectorAll("[required]"));
      const formValid = requiredFields.every((field) => validateField(field));
      const leadData = collectFormData(form);
      const requiresSelection = form.hasAttribute("data-requires-selection");
      const hasSelection = leadData.niche && leadData.packageTier && leadData.selectedTemplate;

      if (!formValid || (requiresSelection && !hasSelection)) {
        if (requiresSelection && !hasSelection) {
          const summaryTitle = document.querySelector("[data-selection-title]");
          summaryTitle?.classList.add("is-attention");
        }
        return;
      }

      const authState = await ensureCustomerForLead(form, leadData);
      if (!authState) {
        return;
      }

      const submitButton = form.querySelector('[type="submit"]');
      submitButton?.setAttribute("disabled", "disabled");
      let lead = normalizeLead({
        ...leadData,
        email: authState.user?.email ?? leadData.email,
      });

      try {
        lead = await submitLeadToServer(form, leadData);
      } catch (error) {
        showFormMessage(
          form,
          error.message || translateText("Не удалось отправить заявку. Попробуйте еще раз."),
          "error"
        );
        return;
      } finally {
        submitButton?.removeAttribute("disabled");
      }

      savePaymentProfile({
        fullName: leadData.fullName,
        businessName: leadData.businessName,
        phone: leadData.phone,
        email: authState.user?.email ?? leadData.email,
      });

      saveSelection({
        niche: lead.niche,
        packageTier: lead.packageTier,
        selectedTemplate: lead.selectedTemplate,
      });
      showSuccessState(form, lead);

      form.reset();
      syncLeadFormsWithAuth(await getAuthState());
      updateSelectionUI(readSelection());
    });
  });
};

const initAccountAccess = async () => {
  const authState = await getAuthState();
  updateAccountLinks(authState);
  syncLeadFormsWithAuth(authState);
};

const createPaymentDialog = () => {
  const wrapper = document.createElement("div");
  wrapper.className = "payment-modal";
  wrapper.hidden = true;
  wrapper.innerHTML = `
    <div class="payment-modal__backdrop" data-payment-close></div>
    <section class="payment-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
      <button class="payment-modal__close" type="button" data-payment-close aria-label="Закрыть окно оплаты">×</button>

      <div class="payment-modal__view is-visible" data-payment-view="form">
        <span class="summary-badge">Оплата через CloudPayments</span>
        <h2 id="payment-dialog-title" class="payment-modal__title">Оплатить и начать</h2>
        <p class="payment-modal__copy">
          Оставьте контактный email, и мы откроем защищенную форму оплаты картой Visa / Mastercard.
        </p>

        <div class="payment-modal__summary">
          <article class="payment-modal__summary-item">
            <span>Ниша</span>
            <strong data-payment-niche>—</strong>
          </article>
          <article class="payment-modal__summary-item">
            <span>Пакет</span>
            <strong data-payment-package>—</strong>
          </article>
          <article class="payment-modal__summary-item payment-modal__summary-item--wide">
            <span>Шаблон</span>
            <strong data-payment-template>—</strong>
          </article>
        </div>

        <form class="payment-form" data-payment-form>
          <div class="payment-form__grid">
            <label class="field">
              <span>Ваше имя</span>
              <input type="text" name="fullName" placeholder="Как к вам обращаться" />
            </label>
            <label class="field">
              <span>Название бизнеса</span>
              <input type="text" name="businessName" placeholder="Компания или проект" />
            </label>
            <label class="field field--full">
              <span>Email для счета и связи</span>
              <input type="email" name="email" required placeholder="name@company.com" />
            </label>
            <label class="field field--full">
              <span>Телефон / WhatsApp</span>
              <input type="text" name="phone" placeholder="+7 700 000 00 00" />
            </label>
          </div>
          <div class="payment-modal__note">
            Сумма в тенге и номер счета будут переданы в CloudPayments автоматически после создания заказа.
          </div>
          <div class="payment-modal__actions">
            <button class="button button--primary" type="submit">Перейти к оплате</button>
            <button class="button button--ghost" type="button" data-payment-close>Отмена</button>
          </div>
        </form>
      </div>

      <div class="payment-modal__view" data-payment-view="processing">
        <span class="summary-badge">Подождите</span>
        <h2 class="payment-modal__title" data-payment-processing-title>Подготавливаем оплату</h2>
        <p class="payment-modal__copy" data-payment-processing-text>
          Создаем заказ и открываем защищенную форму CloudPayments.
        </p>
        <div class="payment-modal__status-line" data-payment-processing-meta></div>
      </div>

      <div class="payment-modal__view" data-payment-view="success">
        <span class="summary-badge">Заказ сохранен</span>
        <h2 class="payment-modal__title">Оплата прошла успешно</h2>
        <p class="payment-modal__copy" data-payment-success-text>
          Заказ оплачен, статус обновлен, данные переданы в CRM.
        </p>
        <div class="payment-modal__status-line" data-payment-success-meta></div>
        <div class="payment-modal__actions">
          <button class="button button--primary" type="button" data-payment-done>Закрыть</button>
        </div>
      </div>

      <div class="payment-modal__view" data-payment-view="fail">
        <span class="summary-badge">Нужна повторная попытка</span>
        <h2 class="payment-modal__title">Оплата не прошла</h2>
        <p class="payment-modal__copy" data-payment-fail-text>
          Попробуйте еще раз или используйте другую карту.
        </p>
        <div class="payment-modal__actions">
          <button class="button button--primary" type="button" data-payment-retry>Попробовать снова</button>
          <button class="button button--ghost" type="button" data-payment-close>Закрыть</button>
        </div>
      </div>
    </section>
  `;

  document.body.append(wrapper);
  window.WebfactoryI18n?.translateTree?.(wrapper);

  const dialog = {
    root: wrapper,
    formView: wrapper.querySelector('[data-payment-view="form"]'),
    processingView: wrapper.querySelector('[data-payment-view="processing"]'),
    successView: wrapper.querySelector('[data-payment-view="success"]'),
    failView: wrapper.querySelector('[data-payment-view="fail"]'),
    form: wrapper.querySelector("[data-payment-form]"),
    niche: wrapper.querySelector("[data-payment-niche]"),
    packageTier: wrapper.querySelector("[data-payment-package]"),
    template: wrapper.querySelector("[data-payment-template]"),
    processingTitle: wrapper.querySelector("[data-payment-processing-title]"),
    processingText: wrapper.querySelector("[data-payment-processing-text]"),
    processingMeta: wrapper.querySelector("[data-payment-processing-meta]"),
    successText: wrapper.querySelector("[data-payment-success-text]"),
    successMeta: wrapper.querySelector("[data-payment-success-meta]"),
    failText: wrapper.querySelector("[data-payment-fail-text]"),
  };

  wrapper.querySelectorAll("[data-payment-close]").forEach((node) => {
    node.addEventListener("click", () => {
      closePaymentDialog();
    });
  });

  wrapper.querySelector("[data-payment-retry]")?.addEventListener("click", () => {
    showPaymentView("form");
  });

  wrapper.querySelector("[data-payment-done]")?.addEventListener("click", () => {
    closePaymentDialog();
  });

  dialog.form?.addEventListener("submit", handlePaymentSubmit);
  document.addEventListener("keydown", handlePaymentEscape);

  paymentDialog = dialog;
  return dialog;
};

const getPaymentDialog = () => paymentDialog ?? createPaymentDialog();

const handlePaymentEscape = (event) => {
  if (event.key === "Escape" && !getPaymentDialog().root.hidden) {
    closePaymentDialog();
  }
};

const showPaymentView = (view) => {
  const dialog = getPaymentDialog();
  dialog.formView.classList.toggle("is-visible", view === "form");
  dialog.processingView.classList.toggle("is-visible", view === "processing");
  dialog.successView.classList.toggle("is-visible", view === "success");
  dialog.failView.classList.toggle("is-visible", view === "fail");
};

const openPaymentDialog = (context) => {
  activePaymentContext = context;
  const dialog = getPaymentDialog();
  const profile = readPaymentProfile();

  dialog.niche.textContent = context.niche ? translateText(context.niche) : "—";
  dialog.packageTier.textContent = context.packageTier ? translateText(context.packageTier) : "—";
  dialog.template.textContent = context.selectedTemplate ? translateText(context.selectedTemplate) : "—";

  dialog.form.fullName.value = profile.fullName ?? "";
  dialog.form.businessName.value = profile.businessName ?? "";
  dialog.form.email.value = profile.email ?? "";
  dialog.form.phone.value = profile.phone ?? "";

  dialog.root.hidden = false;
  document.body.classList.add("payment-modal-open");
  showPaymentView("form");
};

const closePaymentDialog = () => {
  const dialog = getPaymentDialog();
  dialog.root.hidden = true;
  document.body.classList.remove("payment-modal-open");
};

const setProcessingState = (title, text, meta = "") => {
  const dialog = getPaymentDialog();
  dialog.processingTitle.textContent = title;
  dialog.processingText.textContent = text;
  dialog.processingMeta.textContent = meta;
  showPaymentView("processing");
};

const showPaymentSuccess = (order) => {
  const dialog = getPaymentDialog();
  const amountLabel = formatAmount(order?.amount, order?.currency ?? "KZT");
  const invoiceLabel = order?.invoiceId
    ? translateMessage("orderLabel", `Заказ ${order.invoiceId}`, { id: order.invoiceId })
    : translateMessage("orderSaved", "Заказ сохранен");
  const statusText =
    order?.status === ORDER_STATUS_PAID
      ? translateMessage(
          "paymentSuccessPaid",
          "Заказ оплачен, статус обновлен до «Оплачен», данные переданы в CRM."
        )
      : translateMessage(
          "paymentSuccessPending",
          "Платеж принят. Если webhook придет чуть позже, статус заказа обновится автоматически."
        );

  dialog.successText.textContent = statusText;
  dialog.successMeta.textContent = `${invoiceLabel} • ${amountLabel}`;
  showPaymentView("success");
};

const showPaymentFailure = (message) => {
  const dialog = getPaymentDialog();
  dialog.failText.textContent =
    translateText(
      message || translateMessage("paymentFailureRetry", "Попробуйте снова или используйте другую карту.")
    );
  showPaymentView("fail");
};

const ensureCloudPaymentsWidget = () => {
  if (window.cp?.CloudPayments) {
    return Promise.resolve();
  }

  if (cloudPaymentsScriptPromise) {
    return cloudPaymentsScriptPromise;
  }

  cloudPaymentsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://widget.cloudpayments.ru/bundles/cloudpayments.js";
    script.async = true;
    script.onload = () => {
      if (window.cp?.CloudPayments) {
        resolve();
        return;
      }

      reject(
        new Error(translateMessage("widgetNotLoaded", "CloudPayments widget не загрузился."))
      );
    };
    script.onerror = () => {
      reject(
        new Error(translateMessage("widgetLoadFailed", "Не удалось загрузить CloudPayments widget."))
      );
    };
    document.head.append(script);
  });

  return cloudPaymentsScriptPromise;
};

const normalizePaymentError = (reason) => {
  if (typeof reason === "string" && reason.trim()) {
    return translateMessage(
      "paymentCancelledWithReason",
      `Платеж был отменен или отклонен: ${reason.trim()}.`,
      { reason: reason.trim() }
    );
  }

  if (reason?.message) {
    return translateMessage(
      "paymentCancelledWithReason",
      `Платеж был отменен или отклонен: ${reason.message}.`,
      { reason: reason.message }
    );
  }

  return translateMessage(
    "paymentCancelledGeneric",
    "Платеж был отменен или отклонен банком. Попробуйте еще раз или используйте другую карту."
  );
};

const openCloudPaymentsWidget = (publicId, order) =>
  new Promise((resolve, reject) => {
    let settled = false;

    const finishResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    const finishReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(
        error instanceof Error
          ? error
          : new Error(String(error ?? translateMessage("paymentFailedGeneric", "Оплата не прошла.")))
      );
    };

    try {
      const widget = new window.cp.CloudPayments({
        language: CLOUDPAYMENTS_LOCALES[getSiteLanguage()] ?? CLOUDPAYMENTS_LOCALES.ru,
      });
      widget.pay(
        "charge",
        {
          publicId,
          description: order.description,
          amount: Number(order.amount),
          currency: order.currency ?? "KZT",
          invoiceId: order.invoiceId,
          email: order.email,
          accountId: order.email,
          requireEmail: true,
          skin: "classic",
        },
        {
          onSuccess: () => {
            finishResolve();
          },
          onFail: (reason) => {
            finishReject(new Error(normalizePaymentError(reason)));
          },
          onComplete: (paymentResult) => {
            if (paymentResult && paymentResult.success === false) {
              finishReject(new Error(normalizePaymentError(paymentResult.reason)));
            }
          },
        }
      );
    } catch (error) {
      finishReject(error);
    }
  });

const waitForPaidOrder = async (invoiceId) => {
  let latestOrder = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetchJson(`/api/orders/status?invoiceId=${encodeURIComponent(invoiceId)}`);
      latestOrder = response.order ?? latestOrder;

      if (latestOrder?.status === ORDER_STATUS_PAID) {
        return latestOrder;
      }
    } catch (error) {
      // Игнорируем кратковременный лаг между onSuccess и приходом webhook pay.
    }

    await wait(1500);
  }

  return latestOrder;
};

const markOrderFailed = async (invoiceId, reason) => {
  if (!invoiceId) {
    return;
  }

  try {
    await postForm("/api/orders/fail", { invoiceId, reason });
  } catch (error) {
    // Если не удалось сохранить статус ошибки, не блокируем повторную попытку оплаты.
  }
};

const collectPaymentFormData = (form) => ({
  fullName: String(new FormData(form).get("fullName") ?? "").trim(),
  businessName: String(new FormData(form).get("businessName") ?? "").trim(),
  email: String(new FormData(form).get("email") ?? "").trim(),
  phone: String(new FormData(form).get("phone") ?? "").trim(),
});

async function handlePaymentSubmit(event) {
  event.preventDefault();

  if (!activePaymentContext) {
    return;
  }

  const dialog = getPaymentDialog();
  const fields = Array.from(dialog.form.querySelectorAll("input"));
  const valid = fields.every((field) => validateField(field));

  if (!valid) {
    return;
  }

  const paymentData = collectPaymentFormData(dialog.form);
  savePaymentProfile(paymentData);

  setProcessingState(
    translateMessage("processingPrepareTitle", "Подготавливаем оплату"),
    translateMessage(
      "processingPrepareText",
      "Создаем заказ и открываем защищенную форму CloudPayments."
    )
  );

  let orderResponse;
  try {
    orderResponse = await postForm("/api/orders/create", {
      productId: activePaymentContext.productId,
      fullName: paymentData.fullName,
      businessName: paymentData.businessName,
      phone: paymentData.phone,
      email: paymentData.email,
      source: `${window.WebfactoryI18n?.text("Оплата") ?? "Оплата"} / ${document.title}`,
      pageUrl: window.location.href,
    });
  } catch (error) {
    showPaymentFailure(
      error.message ||
        translateMessage(
          "paymentPrepareError",
          "Не удалось подготовить оплату. Проверьте настройки сервера."
        )
    );
    return;
  }

  const order = orderResponse.order ?? {};
  setProcessingState(
    translateMessage("processingOpenTitle", "Открываем форму оплаты"),
    translateMessage(
      "processingOpenText",
      "CloudPayments покажет форму оплаты картой Visa / Mastercard."
    ),
    translateMessage(
      "amountMeta",
      `К оплате: ${formatAmount(order.amount, order.currency)} • ${order.invoiceId ?? ""}`,
      {
        amount: formatAmount(order.amount, order.currency),
        invoiceId: order.invoiceId ?? "",
      }
    )
  );

  try {
    await ensureCloudPaymentsWidget();
    await openCloudPaymentsWidget(orderResponse.publicId, order);

    setProcessingState(
      translateMessage("processingConfirmTitle", "Подтверждаем оплату"),
      translateMessage(
        "processingConfirmText",
        "Проверяем статус заказа и ждем webhook CloudPayments."
      ),
      order.invoiceId ?? ""
    );

    const confirmedOrder = (await waitForPaidOrder(order.invoiceId)) ?? order;
    showPaymentSuccess(confirmedOrder);
  } catch (error) {
    await markOrderFailed(order.invoiceId, error.message);
    showPaymentFailure(
      error.message || translateMessage("paymentTryAgain", "Оплата не прошла. Попробуйте снова.")
    );
  }
}

const initPaymentButtons = () => {
  if (!paymentButtons.length) {
    return;
  }

  paymentButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const selection = syncSelectionFromButton(button);
      openPaymentDialog({
        productId: button.dataset.payProduct ?? "",
        niche: selection.niche,
        packageTier: selection.packageTier,
        selectedTemplate: selection.selectedTemplate,
      });
    });
  });
};

window.addEventListener("webfactory:languagechange", () => {
  updateSelectionUI(readSelection());
  if (paymentDialog) {
    window.WebfactoryI18n?.translateTree?.(paymentDialog.root);
  }
  void getAuthState().then((authState) => {
    updateAccountLinks(authState);
  });
});

const createPlanetTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#06213f");
  ocean.addColorStop(0.38, "#0d3f69");
  ocean.addColorStop(0.68, "#1e6691");
  ocean.addColorStop(1, "#0c3158");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const drawLand = (x, y, radiusX, radiusY, rotation, color) => {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(radiusX, radiusY);
    context.beginPath();
    context.moveTo(0.1, -0.8);
    context.bezierCurveTo(0.88, -0.56, 0.86, 0.18, 0.38, 0.88);
    context.bezierCurveTo(-0.18, 1.12, -0.88, 0.44, -0.84, -0.28);
    context.bezierCurveTo(-0.56, -0.96, -0.12, -1.08, 0.1, -0.8);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.restore();
  };

  drawLand(420, 300, 250, 190, -0.2, "#497f5b");
  drawLand(730, 580, 180, 150, 0.48, "#567e4f");
  drawLand(1030, 320, 350, 240, 0.18, "#4d7851");
  drawLand(1460, 520, 320, 170, -0.44, "#6f8753");
  drawLand(1750, 270, 170, 110, 0.3, "#597e5a");

  context.globalAlpha = 0.25;
  const heat = context.createRadialGradient(1480, 430, 40, 1480, 430, 260);
  heat.addColorStop(0, "#d9b97e");
  heat.addColorStop(1, "rgba(217, 185, 126, 0)");
  context.fillStyle = heat;
  context.fillRect(1160, 180, 640, 520);

  context.globalAlpha = 1;
  for (let i = 0; i < 120; i += 1) {
    context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.06})`;
    context.beginPath();
    context.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2.6, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createCloudTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 18 + Math.random() * 120;
    const gradient = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.26 + Math.random() * 0.2})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createGlowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(256, 256, 26, 256, 256, 240);
  gradient.addColorStop(0, "rgba(194, 234, 255, 0.95)");
  gradient.addColorStop(0.26, "rgba(152, 185, 255, 0.42)");
  gradient.addColorStop(0.58, "rgba(126, 120, 255, 0.16)");
  gradient.addColorStop(1, "rgba(126, 120, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createStarField = (count, radius, size, color, spread = 1) => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const i = index * 3;
    const r = radius + Math.random() * spread;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = r * Math.cos(phi);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
};

const sampleFrames = (frames, progress) => {
  if (progress <= frames[0].p) {
    return frames[0];
  }

  if (progress >= frames[frames.length - 1].p) {
    return frames[frames.length - 1];
  }

  let nextIndex = 1;
  while (nextIndex < frames.length && progress > frames[nextIndex].p) {
    nextIndex += 1;
  }

  const start = frames[nextIndex - 1];
  const end = frames[nextIndex];
  const localProgress = (progress - start.p) / (end.p - start.p);
  const mix = (a, b) => a + (b - a) * localProgress;

  return {
    camera: {
      x: mix(start.camera.x, end.camera.x),
      y: mix(start.camera.y, end.camera.y),
      z: mix(start.camera.z, end.camera.z),
    },
    earth: {
      x: mix(start.earth.x, end.earth.x),
      y: mix(start.earth.y, end.earth.y),
      z: mix(start.earth.z, end.earth.z),
    },
    lookAt: {
      x: mix(start.lookAt.x, end.lookAt.x),
      y: mix(start.lookAt.y, end.lookAt.y),
      z: mix(start.lookAt.z, end.lookAt.z),
    },
    scale: mix(start.scale, end.scale),
    glow: mix(start.glow, end.glow),
  };
};

const createPortalPanelTexture = (accent = "#8fd8ff") => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext("2d");

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "rgba(8, 16, 34, 0.94)");
  background.addColorStop(1, "rgba(10, 20, 42, 0.42)");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 2;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.strokeStyle = `${accent}88`;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(48, 76);
  context.lineTo(canvas.width - 48, 76);
  context.stroke();

  const chart = context.createLinearGradient(0, 0, canvas.width, 0);
  chart.addColorStop(0, `${accent}22`);
  chart.addColorStop(0.5, `${accent}aa`);
  chart.addColorStop(1, `${accent}22`);
  context.strokeStyle = chart;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(60, 274);
  context.bezierCurveTo(170, 220, 228, 330, 320, 210);
  context.bezierCurveTo(410, 112, 478, 198, 580, 132);
  context.stroke();

  context.fillStyle = `${accent}cc`;
  context.beginPath();
  context.arc(122, 142, 28, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.76;
  for (let index = 0; index < 6; index += 1) {
    const width = 92 + index * 28;
    context.fillStyle = `${accent}${index % 2 === 0 ? "33" : "22"}`;
    context.fillRect(60, 316 + index * 8, width, 6);
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createPortalPanel = (texture, edgeColor, width, height, depth) => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xf3f8ff,
    transparent: true,
    opacity: 0.17,
    metalness: 0.1,
    roughness: 0.2,
    emissive: new THREE.Color(edgeColor).multiplyScalar(0.24),
    emissiveIntensity: 1,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );

  const group = new THREE.Group();
  group.add(mesh, edges);
  return group;
};

const sampleImmersiveFrame = (frames, progress) => {
  if (progress <= frames[0].p) {
    return frames[0];
  }

  if (progress >= frames[frames.length - 1].p) {
    return frames[frames.length - 1];
  }

  let nextIndex = 1;
  while (nextIndex < frames.length && progress > frames[nextIndex].p) {
    nextIndex += 1;
  }

  const start = frames[nextIndex - 1];
  const end = frames[nextIndex];
  const localProgress = (progress - start.p) / (end.p - start.p);
  const mix = (a, b) => a + (b - a) * localProgress;
  const mixVector = (from, to) => ({
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    z: mix(from.z, to.z),
  });

  return {
    camera: mixVector(start.camera, end.camera),
    stage: mixVector(start.stage, end.stage),
    rotation: mixVector(start.rotation, end.rotation),
    lookAt: mixVector(start.lookAt, end.lookAt),
    coreScale: mix(start.coreScale, end.coreScale),
    glow: mix(start.glow, end.glow),
    panelSpread: mix(start.panelSpread, end.panelSpread),
  };
};

const disposeSceneGraph = (root) => {
  const geometries = new Set();
  const materials = new Set();

  root.traverse((node) => {
    if (node.geometry) {
      geometries.add(node.geometry);
    }

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => materials.add(material));
      return;
    }

    if (node.material) {
      materials.add(node.material);
    }
  });

  geometries.forEach((geometry) => geometry.dispose?.());
  materials.forEach((material) => disposeMaterial(material));
};

const ensureThreeScript = () => {
  if (window.THREE) {
    return Promise.resolve(window.THREE);
  }

  if (threeScriptPromise) {
    return threeScriptPromise;
  }

  threeScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.min.js";
    script.async = true;
    script.onload = () => {
      if (window.THREE) {
        resolve(window.THREE);
        return;
      }

      reject(new Error("THREE is unavailable"));
    };
    script.onerror = () => reject(new Error("THREE failed to load"));
    document.head.append(script);
  });

  return threeScriptPromise;
};

const disposeMaterial = (material) => {
  if (!material) {
    return;
  }

  if (material.map) {
    material.map.dispose();
  }

  material.dispose?.();
};

const initHomeSpaceJourney = async () => {
  const canvas = document.getElementById("space-canvas");
  const isHomePage = document.body?.classList.contains("page-home");

  if (!canvas || !isHomePage) {
    return;
  }

  try {
    await ensureThreeScript();
  } catch (error) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = window.matchMedia("(max-width: 900px)").matches;
  const deviceMemory = Number(window.navigator?.deviceMemory || 8);
  const lowPower = compact || reducedMotion || deviceMemory <= 4;
  const targetFrameDuration = 1000 / (lowPower ? 30 : 48);
  const maxPixelRatio = lowPower ? 1 : 1.2;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !lowPower,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050914, 7.6, 18.6);
  const camera = new THREE.PerspectiveCamera(compact ? 42 : 34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(-0.4, 0.18, 8.9);

  scene.add(new THREE.AmbientLight(0xbfd2ff, 0.78));

  const sun = new THREE.DirectionalLight(0xf5fbff, 2.9);
  sun.position.set(4.8, 2.2, 6.4);
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x73d7ff, 1.28);
  rim.position.set(-4.4, -1.8, 4.2);
  scene.add(rim);

  const stage = new THREE.Group();
  stage.position.set(2.18, 0.3, -4.9);
  scene.add(stage);

  const shell = new THREE.Group();
  stage.add(shell);

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7eeff,
    metalness: 0.76,
    roughness: 0.2,
    emissive: 0x243c84,
    emissiveIntensity: 0.34,
  });
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.62, 0.22, lowPower ? 16 : 24, lowPower ? 120 : 180),
    ringMaterial
  );

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.06, 12, lowPower ? 96 : 150),
    new THREE.MeshStandardMaterial({
      color: 0xb9cfff,
      metalness: 0.62,
      roughness: 0.18,
      emissive: 0x102958,
      emissiveIntensity: 0.62,
    })
  );

  const arcMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bcbff,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const arcOne = new THREE.Mesh(
    new THREE.TorusGeometry(1.84, 0.03, 10, lowPower ? 80 : 140, Math.PI * 1.34),
    arcMaterial
  );
  arcOne.rotation.set(0.9, 0.28, 0.14);

  const arcTwo = new THREE.Mesh(
    new THREE.TorusGeometry(1.54, 0.024, 10, lowPower ? 70 : 130, Math.PI * 1.12),
    new THREE.MeshBasicMaterial({
      color: 0xa7f0ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  arcTwo.rotation.set(1.22, -0.48, 0.74);

  const viewportMaterial = new THREE.MeshBasicMaterial({
    color: 0x9abfff,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const viewportDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.14, lowPower ? 48 : 80),
    viewportMaterial
  );
  viewportDisc.position.z = -0.08;

  shell.add(outerRing, innerRing, arcOne, arcTwo, viewportDisc);

  const braceMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f8ff,
    metalness: 0.64,
    roughness: 0.28,
    emissive: 0x183976,
    emissiveIntensity: 0.36,
  });
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.52),
      braceMaterial
    );
    brace.position.set(Math.cos(angle) * 2.38, Math.sin(angle) * 2.38, 0.12);
    brace.rotation.z = angle;
    shell.add(brace);
  }

  const coreGroup = new THREE.Group();
  coreGroup.position.z = 0.42;
  stage.add(coreGroup);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(lowPower ? 0.88 : 1.02, lowPower ? 1 : 2),
    new THREE.MeshStandardMaterial({
      color: 0x92eeff,
      emissive: 0x3b6dff,
      emissiveIntensity: 1.08,
      metalness: 0.12,
      roughness: 0.12,
      flatShading: true,
    })
  );

  const coreShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, lowPower ? 20 : 36, lowPower ? 20 : 36),
    new THREE.MeshBasicMaterial({
      color: 0x88d8ff,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    })
  );

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xd2deff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.set(5.9, 5.9, 1);
  halo.position.set(0, 0, -0.3);

  const orbitRingPrimary = new THREE.Mesh(
    new THREE.TorusGeometry(1.46, 0.018, 8, lowPower ? 80 : 120),
    new THREE.MeshBasicMaterial({
      color: 0xaed8ff,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  orbitRingPrimary.rotation.set(1.04, 0.18, 0.24);

  const orbitRingSecondary = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.014, 8, lowPower ? 64 : 110),
    new THREE.MeshBasicMaterial({
      color: 0x99fff0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  orbitRingSecondary.rotation.set(0.58, -0.68, 0.82);

  coreGroup.add(halo, orbitRingPrimary, orbitRingSecondary, coreShell, core);

  const coreLight = new THREE.PointLight(0x92deff, lowPower ? 4.2 : 6.4, 16, 2);
  coreLight.position.set(0, 0, 1);
  stage.add(coreLight);

  const panelRefs = [];
  const panelGroup = new THREE.Group();
  stage.add(panelGroup);
  const panelConfigs = [
    {
      accent: "#9fd4ff",
      edge: 0x9fd4ff,
      size: [1.56, 0.96, 0.08],
      position: { x: -2.28, y: 1.1, z: 0.88 },
      rotation: { x: -0.26, y: 0.56, z: -0.2 },
      floatOffset: 0.4,
    },
    {
      accent: "#96fff1",
      edge: 0x96fff1,
      size: [1.18, 0.72, 0.06],
      position: { x: -2.74, y: -1.08, z: 0.54 },
      rotation: { x: 0.24, y: -0.64, z: 0.2 },
      floatOffset: 1.9,
    },
    {
      accent: "#ffd0ac",
      edge: 0xffcb9d,
      size: [1.02, 0.64, 0.05],
      position: { x: 1.68, y: -2.08, z: 0.36 },
      rotation: { x: -0.34, y: 0.3, z: 0.38 },
      floatOffset: 3.2,
    },
  ];

  const tunnelGroup = new THREE.Group();
  tunnelGroup.position.set(0.08, 0.02, -0.52);
  stage.add(tunnelGroup);
  const tunnelRings = [];
  const tunnelRingGeometry = new THREE.TorusGeometry(3.08, 0.052, 10, lowPower ? 56 : 92);
  const tunnelSpacing = 1.42;
  for (let index = 0; index < (lowPower ? 5 : 8); index += 1) {
    const opacity = Math.max(0.05, 0.18 - index * 0.014);
    const ring = new THREE.Mesh(
      tunnelRingGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0x9dcfff : 0x94fff2,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
    const baseScale = 1 + index * 0.14;
    ring.position.z = -2.36 - index * tunnelSpacing;
    ring.scale.setScalar(baseScale);
    ring.rotation.set(0.22 + index * 0.06, -0.16 + index * 0.08, index * 0.18);
    tunnelGroup.add(ring);
    tunnelRings.push({
      mesh: ring,
      baseZ: ring.position.z,
      baseScale,
      baseRotationZ: ring.rotation.z,
      opacity,
      drift: index * 0.68,
    });
  }

  const shardGroup = new THREE.Group();
  stage.add(shardGroup);
  const shardRefs = [];
  const shardGeometry = new THREE.PlaneGeometry(0.28, 1.12);
  const shardPalette = [0xc8dcff, 0xa6f2ff, 0xffd3ac];
  const shardCount = lowPower ? 5 : 9;
  for (let index = 0; index < shardCount; index += 1) {
    const opacity = 0.06 + (index % 3) * 0.02;
    const material = new THREE.MeshBasicMaterial({
      color: shardPalette[index % shardPalette.length],
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shard = new THREE.Mesh(shardGeometry, material);
    const radius = 3.18 + (index % 3) * 0.34;
    const angle = (index / shardCount) * Math.PI * 2;
    const baseY = Math.sin(index * 1.6) * 1.18;
    const baseZ = -0.48 - (index % 4) * 0.74;
    const baseRotation = {
      x: 0.3 + (index % 3) * 0.12,
      y: angle,
      z: 0.18 + index * 0.16,
    };
    shard.position.set(Math.cos(angle) * radius, baseY, baseZ);
    shard.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);
    shardGroup.add(shard);
    shardRefs.push({
      mesh: shard,
      angle,
      radius,
      baseY,
      baseZ,
      baseRotation,
      opacity,
      floatOffset: index * 0.76,
    });
  }

  panelConfigs.forEach((config) => {
    const panel = createPortalPanel(
      createPortalPanelTexture(config.accent),
      config.edge,
      config.size[0],
      config.size[1],
      config.size[2]
    );
    panel.position.set(config.position.x, config.position.y, config.position.z);
    panel.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    panelGroup.add(panel);
    panelRefs.push({
      group: panel,
      basePosition: config.position,
      baseRotation: config.rotation,
      floatOffset: config.floatOffset,
    });
  });

  const distantStars = createStarField(
    compact ? 680 : lowPower ? 980 : 1480,
    compact ? 20 : 24,
    compact ? 0.02 : 0.026,
    0xf7fbff,
    18
  );
  const nearStars = createStarField(
    compact ? 150 : lowPower ? 220 : 320,
    compact ? 10 : 12,
    compact ? 0.028 : 0.042,
    0xbed7ff,
    7
  );
  const dustField = createStarField(
    compact ? 52 : lowPower ? 84 : 132,
    compact ? 9 : 10.5,
    compact ? 0.024 : 0.032,
    0x8fe5ff,
    5.6
  );
  dustField.material.opacity = 0.14;
  scene.add(distantStars, nearStars, dustField);

  const state = {
    progress: 0,
    targetProgress: 0,
    pointerX: 0,
    pointerY: 0,
    lastFrameTime: 0,
    rafId: 0,
    scrollTicking: false,
    frameSamples: 0,
    frameBudgetTotal: 0,
    degraded: false,
    disposed: false,
  };

  const desktopFrames = [
    {
      p: 0,
      camera: { x: -0.62, y: 0.42, z: 9.2 },
      stage: { x: 2.42, y: 0.54, z: -5.24 },
      rotation: { x: -0.12, y: 0.44, z: -0.12 },
      lookAt: { x: 0.52, y: 0.08, z: -3.2 },
      coreScale: 0.9,
      glow: 0.2,
      panelSpread: 1,
    },
    {
      p: 0.34,
      camera: { x: -0.42, y: 0.18, z: 7.9 },
      stage: { x: 1.84, y: 0.38, z: -4.56 },
      rotation: { x: -0.06, y: 0.72, z: 0.02 },
      lookAt: { x: 0.42, y: 0.04, z: -2.8 },
      coreScale: 0.98,
      glow: 0.24,
      panelSpread: 0.94,
    },
    {
      p: 0.68,
      camera: { x: -0.18, y: 0.04, z: 6.66 },
      stage: { x: 1.08, y: 0.16, z: -3.84 },
      rotation: { x: 0.02, y: 0.98, z: 0.16 },
      lookAt: { x: 0.28, y: 0, z: -2.18 },
      coreScale: 1.08,
      glow: 0.3,
      panelSpread: 0.88,
    },
    {
      p: 1,
      camera: { x: 0.06, y: -0.1, z: 5.7 },
      stage: { x: 0.46, y: 0.04, z: -3.12 },
      rotation: { x: 0.08, y: 1.18, z: 0.26 },
      lookAt: { x: 0.1, y: -0.04, z: -1.58 },
      coreScale: 1.16,
      glow: 0.36,
      panelSpread: 0.82,
    },
  ];

  const compactFrames = [
    {
      p: 0,
      camera: { x: -0.12, y: 0.24, z: 8.14 },
      stage: { x: 1.34, y: 0.24, z: -4.46 },
      rotation: { x: -0.08, y: 0.48, z: -0.06 },
      lookAt: { x: 0.18, y: 0, z: -2.46 },
      coreScale: 0.86,
      glow: 0.18,
      panelSpread: 0.92,
    },
    {
      p: 0.5,
      camera: { x: 0, y: 0.02, z: 6.56 },
      stage: { x: 0.82, y: 0.12, z: -3.62 },
      rotation: { x: 0.02, y: 0.84, z: 0.08 },
      lookAt: { x: 0.06, y: -0.04, z: -1.94 },
      coreScale: 0.98,
      glow: 0.26,
      panelSpread: 0.84,
    },
    {
      p: 1,
      camera: { x: 0.06, y: -0.08, z: 5.84 },
      stage: { x: 0.38, y: 0.02, z: -2.96 },
      rotation: { x: 0.06, y: 1.08, z: 0.16 },
      lookAt: { x: -0.02, y: -0.06, z: -1.48 },
      coreScale: 1.08,
      glow: 0.32,
      panelSpread: 0.76,
    },
  ];

  const getFrames = () => (window.innerWidth <= 900 ? compactFrames : desktopFrames);

  const updateProgress = (value) => {
    state.targetProgress = Math.min(Math.max(value, 0), 1);
    if (progressBar) {
      progressBar.style.width = `${state.targetProgress * 100}%`;
    }
  };

  const readScrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  };

  const syncScrollProgress = () => {
    state.scrollTicking = false;
    updateProgress(readScrollProgress());
  };

  const render = (timestamp = 0) => {
    if (state.disposed) {
      return;
    }

    const elapsedMs = state.lastFrameTime ? timestamp - state.lastFrameTime : targetFrameDuration;
    if (elapsedMs < targetFrameDuration) {
      state.rafId = window.requestAnimationFrame(render);
      return;
    }

    const frameDelta = state.lastFrameTime ? Math.min(elapsedMs / 16.666, 2.2) : 1;
    state.lastFrameTime = timestamp;

    // Fall back to a lighter variant if the first seconds render too slowly on the device.
    if (!lowPower && !state.degraded && state.frameSamples < 96) {
      state.frameSamples += 1;
      state.frameBudgetTotal += elapsedMs;
      if (state.frameSamples === 96) {
        const averageFrame = state.frameBudgetTotal / state.frameSamples;
        if (averageFrame > 28) {
          state.degraded = true;
          renderer.setPixelRatio(1);
          dustField.visible = false;
          shardGroup.visible = false;
          const lastPanel = panelRefs[panelRefs.length - 1];
          if (lastPanel) {
            lastPanel.group.visible = false;
          }
        }
      }
    }

    state.progress += (state.targetProgress - state.progress) * Math.min(0.18 * frameDelta, 0.34);
    const frame = sampleImmersiveFrame(getFrames(), state.progress);
    const driftX = reducedMotion ? 0 : state.pointerX * 0.14;
    const driftY = reducedMotion ? 0 : state.pointerY * 0.1;

    camera.position.set(frame.camera.x + driftX, frame.camera.y + driftY, frame.camera.z);
    stage.position.set(frame.stage.x - driftX * 0.72, frame.stage.y - driftY * 0.52, frame.stage.z);
    stage.rotation.set(
      frame.rotation.x + driftY * 0.05,
      frame.rotation.y + driftX * 0.08,
      frame.rotation.z - driftX * 0.04
    );
    camera.lookAt(frame.lookAt.x, frame.lookAt.y, frame.lookAt.z);

    shell.rotation.z += 0.00042 * frameDelta;
    tunnelGroup.rotation.z -= 0.00024 * frameDelta;
    tunnelGroup.rotation.x = 0.04 + driftY * 0.04;
    outerRing.rotation.x += 0.00018 * frameDelta;
    outerRing.rotation.y += 0.00054 * frameDelta;
    arcOne.rotation.z += 0.0011 * frameDelta;
    arcTwo.rotation.z -= 0.00084 * frameDelta;
    core.rotation.x += 0.0015 * frameDelta;
    core.rotation.y += 0.0022 * frameDelta;
    orbitRingPrimary.rotation.x += 0.00076 * frameDelta;
    orbitRingPrimary.rotation.y += 0.00112 * frameDelta;
    orbitRingSecondary.rotation.x -= 0.00064 * frameDelta;
    orbitRingSecondary.rotation.z += 0.00136 * frameDelta;
    coreGroup.scale.setScalar(frame.coreScale);
    halo.material.opacity = 0.28 + frame.glow * 0.78;
    ringMaterial.emissiveIntensity = 0.28 + frame.glow * 0.62;
    viewportMaterial.opacity = 0.05 + frame.glow * 0.08;
    coreLight.intensity = (lowPower ? 4.2 : 6.2) + frame.glow * (lowPower ? 4 : 6);

    tunnelRings.forEach((ring, index) => {
      const pulse = 1 + Math.sin(timestamp * 0.00054 + ring.drift) * 0.026;
      const z = ring.baseZ + state.progress * 3.8;
      const fade = THREE.MathUtils.clamp(1 - Math.max(0, z + 0.7) * 0.24, 0.02, 1);
      ring.mesh.position.z = z;
      ring.mesh.scale.setScalar((ring.baseScale + frame.glow * 0.26) * pulse);
      ring.mesh.rotation.z =
        ring.baseRotationZ + state.progress * 0.54 + timestamp * 0.00018 * (index % 2 === 0 ? 1 : -1);
      ring.mesh.material.opacity = Math.max(0.02, ring.opacity * fade + frame.glow * 0.08);
    });

    panelRefs.forEach((panel, index) => {
      const phase = timestamp * 0.00042 + panel.floatOffset;
      panel.group.position.set(
        panel.basePosition.x * frame.panelSpread + Math.cos(phase) * 0.16,
        panel.basePosition.y * frame.panelSpread + Math.sin(phase * 1.12) * 0.12,
        panel.basePosition.z + Math.sin(phase * 0.84) * 0.16
      );
      panel.group.rotation.set(
        panel.baseRotation.x + Math.sin(phase * 0.74) * 0.08 + driftY * 0.05,
        panel.baseRotation.y + Math.cos(phase * 0.82) * 0.12 + driftX * 0.08,
        panel.baseRotation.z + Math.sin(phase * 0.54) * 0.06
      );
    });

    shardRefs.forEach((shard) => {
      const phase = timestamp * 0.00034 + shard.floatOffset;
      const orbitAngle = shard.angle + state.progress * 0.68 + Math.sin(phase * 0.72) * 0.08;
      const radius = shard.radius + Math.sin(phase) * 0.12;
      shard.mesh.position.set(
        Math.cos(orbitAngle) * radius,
        shard.baseY + Math.sin(phase * 1.22) * 0.16,
        shard.baseZ + Math.cos(phase * 0.86) * 0.22
      );
      shard.mesh.rotation.set(
        shard.baseRotation.x + Math.sin(phase) * 0.12,
        shard.baseRotation.y + phase * 0.16,
        shard.baseRotation.z + Math.cos(phase * 0.68) * 0.14
      );
      shard.mesh.material.opacity = Math.min(0.22, shard.opacity + frame.glow * 0.05);
    });

    distantStars.rotation.y += 0.000012 * frameDelta;
    distantStars.rotation.x -= 0.000004 * frameDelta;
    nearStars.rotation.y -= 0.000024 * frameDelta;
    nearStars.rotation.z += 0.000014 * frameDelta;
    dustField.rotation.y += 0.000036 * frameDelta;

    renderer.render(scene, camera);
    state.rafId = window.requestAnimationFrame(render);
  };

  const handleScroll = () => {
    if (state.scrollTicking) {
      return;
    }

    state.scrollTicking = true;
    window.requestAnimationFrame(syncScrollProgress);
  };

  const handlePointer = (event) => {
    if (window.innerWidth <= 900 || reducedMotion) {
      state.pointerX = 0;
      state.pointerY = 0;
      return;
    }

    state.pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth <= 900 ? 1 : maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    handleScroll();
  };

  const stopRender = () => {
    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  };

  const startRender = () => {
    if (state.disposed || state.rafId) {
      return;
    }

    state.lastFrameTime = 0;
    state.rafId = window.requestAnimationFrame(render);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopRender();
      return;
    }

    startRender();
  };

  const cleanup = () => {
    if (state.disposed) {
      return;
    }

    state.disposed = true;
    stopRender();
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("pointermove", handlePointer);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    disposeSceneGraph(stage);
    disposeSceneGraph(distantStars);
    disposeSceneGraph(nearStars);
    disposeSceneGraph(dustField);
    renderer.dispose();
  };

  updateProgress(readScrollProgress());
  state.progress = state.targetProgress;
  renderer.render(scene, camera);

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("resize", handleResize);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", cleanup, { once: true });
  startRender();
};

initHeader();
initEmbeddedPreviewMode();
initProgress();
initReveals();
initPackageSelection();
void initAccountAccess();
initLeadForms();
initPaymentButtons();
void initHomeSpaceJourney();

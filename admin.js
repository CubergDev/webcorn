const LEADS_STORAGE_KEY = "webfactory-crm-leads";
const LEGACY_REQUESTS_KEY = "webfactory-template-requests";
const STATUSES = ["Новый", "Контакт", "КП отправлено", "В работе", "Успешно", "Закрыт"];
const ORDER_STATUS_PAID = "Оплачен";
const LANGUAGE_LOCALES = {
  ru: "ru-RU",
  en: "en-US",
};

const elements = {
  total: document.getElementById("total-leads"),
  fresh: document.getElementById("new-leads"),
  active: document.getElementById("active-leads"),
  won: document.getElementById("won-leads"),
  search: document.getElementById("lead-search"),
  filter: document.getElementById("status-filter"),
  status: document.getElementById("lead-status"),
  list: document.getElementById("lead-list"),
  chips: document.getElementById("status-chips"),
  note: document.getElementById("integration-note"),
  saveNotes: document.getElementById("save-notes"),
  notes: document.getElementById("detail-notes"),
  detailTitle: document.getElementById("detail-title"),
  detailClient: document.getElementById("detail-client"),
  detailCompany: document.getElementById("detail-company"),
  detailEmail: document.getElementById("detail-email"),
  detailPhone: document.getElementById("detail-phone"),
  detailNiche: document.getElementById("detail-niche"),
  detailPackage: document.getElementById("detail-package"),
  detailTemplate: document.getElementById("detail-template"),
  detailCountry: document.getElementById("detail-country"),
  detailBudget: document.getElementById("detail-budget"),
  detailTimeline: document.getElementById("detail-timeline"),
  detailPaymentStatus: document.getElementById("detail-payment-status"),
  detailInvoice: document.getElementById("detail-invoice"),
  detailPaymentAmount: document.getElementById("detail-payment-amount"),
  detailCurrentSite: document.getElementById("detail-current-site"),
  detailProject: document.getElementById("detail-project"),
  detailMeta: document.getElementById("detail-meta"),
  staffName: document.getElementById("staff-name"),
  logout: document.getElementById("staff-logout"),
};

const sampleLeads = [
  {
    id: "WF-A19X3",
    status: "Новый",
    fullName: "Мария Волкова",
    businessName: "Maison Orbit Hotel",
    email: "maria@maisonorbit.example",
    phone: "+33 6 88 20 10 42",
    country: "Франция",
    niche: "Отели",
    packageTier: "Премиум",
    selectedTemplate: "Maison Orbit",
    budgetRange: "€3000–€5000",
    timeline: "В течение месяца",
    currentWebsite: "https://maisonorbit.example",
    projectDetails: "Нужен более дорогой визуальный образ и сильнее блоки доверия для прямых бронирований.",
    source: "Сайт webcorn",
    notes: "Ждут предложение после созвона. Показать кейсы по бутик-отелям.",
    invoiceId: "WF-CP-DEMO-A19X3",
    paymentStatus: "Оплачен",
    paymentAmount: "1790000",
    paymentCurrency: "KZT",
    paidAt: "2026-04-20T10:05:00.000Z",
    orderStatus: "Оплачен",
    cloudpaymentsTransactionId: "1001001001",
    submittedAt: "2026-04-20T09:15:00.000Z",
    lastUpdatedAt: "2026-04-20T10:05:00.000Z",
  },
  {
    id: "WF-B73K8",
    status: "КП отправлено",
    fullName: "Daniel Foster",
    businessName: "Nordic Care",
    email: "daniel@northline.example",
    phone: "+1 415 555 0162",
    country: "США",
    niche: "Клиники",
    packageTier: "Средний",
    selectedTemplate: "Nordic Care",
    budgetRange: "€1500–€3000",
    timeline: "Гибкий срок",
    currentWebsite: "Нет текущего сайта",
    projectDetails: "Нужна спокойная подача, сильнее раскрыть врачей и упростить запись с мобильных.",
    source: "Сайт webcorn",
    notes: "КП отправлено. Ждут подтверждение по срокам и стартовому платежу.",
    submittedAt: "2026-04-18T14:40:00.000Z",
    lastUpdatedAt: "2026-04-18T14:40:00.000Z",
  },
  {
    id: "WF-C51M2",
    status: "В работе",
    fullName: "Софи Мартен",
    businessName: "Noir Atelier",
    email: "sophie@noiratelier.example",
    phone: "+44 7700 900321",
    country: "Великобритания",
    niche: "Рестораны",
    packageTier: "Премиум",
    selectedTemplate: "Noir Atelier",
    budgetRange: "€3000–€5000",
    timeline: "Как можно скорее",
    currentWebsite: "https://noiratelier.example",
    projectDetails: "Нужны частные ужины, история шефа, дегустационное меню и дорогая атмосфера бренда.",
    source: "Сайт webcorn",
    notes: "Контент в сборе. Следующий шаг: утвердить главный экран и маршрут брони.",
    submittedAt: "2026-04-15T11:05:00.000Z",
    lastUpdatedAt: "2026-04-19T11:05:00.000Z",
  },
];

let leads = [];
let selectedLeadId = null;
let usesServer = false;

const getSiteLanguage = () => window.WebfactoryI18n?.language ?? "ru";
const getSiteLocale = () => LANGUAGE_LOCALES[getSiteLanguage()] ?? LANGUAGE_LOCALES.ru;
const translateMessage = (key, fallback, params = {}) =>
  window.WebfactoryI18n?.message(key, params) || fallback;
const translateText = (value) => window.WebfactoryI18n?.text(value) ?? value;

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const normalizeLead = (lead = {}) => ({
  id: lead.id ?? `WF-${Date.now().toString(36).toUpperCase()}`,
  status: lead.status ?? "Новый",
  fullName: lead.fullName ?? "",
  businessName: lead.businessName ?? "",
  email: lead.email ?? "",
  phone: lead.phone ?? "",
  country: lead.country ?? "",
  niche: lead.niche ?? lead.businessType ?? "",
  packageTier: lead.packageTier ?? lead.tier ?? "",
  selectedTemplate: lead.selectedTemplate ?? lead.template ?? "",
  budgetRange: lead.budgetRange ?? lead.budget ?? "",
  timeline: lead.timeline ?? "",
  currentWebsite: lead.currentWebsite ?? "",
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

const readStorageList = (key) => {
  const parsed = safeJsonParse(window.localStorage.getItem(key) ?? "[]");
  return Array.isArray(parsed) ? parsed : [];
};

const saveStoredLeads = (nextLeads) => {
  window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(nextLeads.map(normalizeLead)));
};

const getStoredLeads = () => {
  const current = readStorageList(LEADS_STORAGE_KEY);

  if (current.length) {
    return current.map(normalizeLead);
  }

  const legacy = readStorageList(LEGACY_REQUESTS_KEY).map((lead) =>
    normalizeLead({
      ...lead,
      packageTier: lead.packageTier ?? lead.tier ?? "",
      selectedTemplate: lead.selectedTemplate ?? lead.template ?? "",
      budgetRange: lead.budgetRange ?? lead.budget ?? "",
      projectDetails: lead.projectDetails ?? lead.customization ?? "",
    })
  );

  if (legacy.length) {
    saveStoredLeads(legacy);
    return legacy;
  }

  saveStoredLeads(sampleLeads);
  return sampleLeads.map(normalizeLead);
};

const readResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  return safeJsonParse(text) ?? { message: text };
};

const fetchJson = async (url) => {
  const response = await window.fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await readResponsePayload(response);

  if (!response.ok || payload.success === false) {
    throw new Error(translateText(payload.message ?? "Не удалось загрузить данные."));
  }

  return payload;
};

const postForm = async (url, payload) => {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    body.set(key, String(value));
  });

  const response = await window.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const payloadResponse = await readResponsePayload(response);

  if (!response.ok || payloadResponse.success === false) {
    throw new Error(translateText(payloadResponse.message ?? "Не удалось сохранить изменения."));
  }

  return payloadResponse;
};

const loadCurrentStaff = async () => {
  const response = await fetchJson("/api/auth/me");

  if (!response.authenticated || response.user?.role !== "staff") {
    throw new Error(translateText("Требуется вход сотрудника."));
  }

  return response.user;
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat(getSiteLocale(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

const formatAmount = (amount, currency = "KZT") => {
  const numeric = Number(String(amount ?? "").replace(",", "."));
  const suffix = currency === "KZT" ? "₸" : currency;

  if (!Number.isFinite(numeric)) {
    return amount ? `${amount} ${suffix}` : "—";
  }

  return `${new Intl.NumberFormat(getSiteLocale()).format(numeric)} ${suffix}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const setMessage = (message, tone = "info") => {
  if (!elements.note) {
    return;
  }

  elements.note.textContent = translateText(message);
  elements.note.classList.remove("is-info", "is-success");
  elements.note.classList.add(tone === "success" ? "is-success" : "is-info");
};

const getSelectedLead = () => leads.find((lead) => lead.id === selectedLeadId) ?? null;

const getPaymentStatus = (lead) => lead.paymentStatus || lead.orderStatus || "";

const getFilteredLeads = () => {
  const searchTerm = elements.search?.value.trim().toLowerCase() ?? "";
  const statusValue = elements.filter?.value ?? "Все";

  return leads.filter((lead) => {
    const matchesStatus = statusValue === "Все" ? true : lead.status === statusValue;
    const haystack = [
      lead.fullName,
      lead.businessName,
      lead.email,
      lead.niche,
      lead.packageTier,
      lead.selectedTemplate,
      lead.invoiceId,
      getPaymentStatus(lead),
    ]
      .join(" ")
      .toLowerCase();

    return matchesStatus && (searchTerm ? haystack.includes(searchTerm) : true);
  });
};

const updateSummary = () => {
  elements.total.textContent = String(leads.length);
  elements.fresh.textContent = String(leads.filter((lead) => lead.status === "Новый").length);
  elements.active.textContent = String(
    leads.filter((lead) => ["Контакт", "КП отправлено", "В работе"].includes(lead.status)).length
  );
  elements.won.textContent = String(
    leads.filter((lead) => getPaymentStatus(lead) === ORDER_STATUS_PAID || lead.status === "Успешно").length
  );
};

const renderStatusChips = () => {
  if (!elements.chips) {
    return;
  }

  elements.chips.innerHTML = "";
  STATUSES.forEach((status) => {
    const chip = document.createElement("span");
    chip.className = "status-chip";
    chip.textContent = `${translateText(status)} · ${leads.filter((lead) => lead.status === status).length}`;
    elements.chips.appendChild(chip);
  });
};

const getPaymentPillClass = (status) => {
  if (status === ORDER_STATUS_PAID) {
    return "payment-pill payment-pill--paid";
  }

  if (status === "Ожидает оплаты") {
    return "payment-pill payment-pill--pending";
  }

  if (status === "Ошибка оплаты") {
    return "payment-pill payment-pill--failed";
  }

  return "payment-pill";
};

const renderLeadList = () => {
  if (!elements.list) {
    return;
  }

  const filtered = getFilteredLeads();
  elements.list.innerHTML = "";

  if (!filtered.length) {
    elements.list.innerHTML = `
      <article class="lead-item">
        <div class="lead-item__head"><strong>${escapeHtml(translateText("Ничего не найдено"))}</strong></div>
        <p class="lead-item__company">${escapeHtml(
          translateText("Измените статус-фильтр или поисковый запрос.")
        )}</p>
      </article>
    `;
    return;
  }

  if (!filtered.some((lead) => lead.id === selectedLeadId)) {
    selectedLeadId = filtered[0].id;
  }

  filtered.forEach((lead) => {
    const paymentStatus = getPaymentStatus(lead);
    const paymentBadge = paymentStatus
      ? `<span class="${getPaymentPillClass(paymentStatus)}">${escapeHtml(translateText(paymentStatus))}</span>`
      : "";
    const invoiceTag = lead.invoiceId
      ? `<span class="lead-item__tag">Invoice ${escapeHtml(lead.invoiceId)}</span>`
      : "";

    const item = document.createElement("article");
    item.className = `lead-item${lead.id === selectedLeadId ? " is-active" : ""}`;
    item.innerHTML = `
      <div class="lead-item__head">
        <strong>${escapeHtml(lead.fullName || lead.businessName || lead.email)}</strong>
        <span class="status-pill">${escapeHtml(translateText(lead.status))}</span>
      </div>
      <p class="lead-item__company">${escapeHtml(
        lead.businessName || translateText("Без названия компании")
      )}</p>
      <div class="lead-item__meta">
        <span class="lead-item__tag">${escapeHtml(
          lead.niche ? translateText(lead.niche) : translateText("Без ниши")
        )}</span>
        <span class="lead-item__tag">${escapeHtml(
          lead.packageTier ? translateText(lead.packageTier) : translateText("Без пакета")
        )}</span>
        <span class="lead-item__tag">${escapeHtml(
          lead.selectedTemplate ? translateText(lead.selectedTemplate) : translateText("Без шаблона")
        )}</span>
        ${invoiceTag}
        ${paymentBadge}
      </div>
      <div class="lead-item__foot">
        <span>${escapeHtml(lead.id)}</span>
        <span>${formatDate(lead.submittedAt)}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      selectedLeadId = lead.id;
      renderLeadList();
      renderLeadDetail();
    });

    elements.list.appendChild(item);
  });
};

const renderLeadDetail = () => {
  const lead = getSelectedLead();

  if (!lead) {
    elements.detailTitle.textContent = translateMessage("chooseLead", "Выберите лид");
    elements.detailClient.textContent = translateMessage("leadNotSelected", "Лид не выбран");
    elements.detailCompany.textContent = translateMessage("openLeadLeft", "Откройте карточку слева.");
    elements.detailEmail.textContent = "—";
    elements.detailPhone.textContent = "—";
    elements.detailNiche.textContent = "—";
    elements.detailPackage.textContent = "—";
    elements.detailTemplate.textContent = "—";
    elements.detailCountry.textContent = "—";
    elements.detailBudget.textContent = "—";
    elements.detailTimeline.textContent = "—";
    elements.detailPaymentStatus.textContent = "—";
    elements.detailInvoice.textContent = "—";
    elements.detailPaymentAmount.textContent = "—";
    elements.detailCurrentSite.textContent = "—";
    elements.detailProject.textContent = "—";
    elements.detailMeta.textContent = "—";
    elements.notes.value = "";
    return;
  }

  const paymentStatus = getPaymentStatus(lead);
  const metaParts = [
    lead.source ? translateText(lead.source) : "",
    formatDate(lead.submittedAt),
    translateMessage("metaUpdated", `обновлено ${formatDate(lead.lastUpdatedAt)}`, {
      date: formatDate(lead.lastUpdatedAt),
    }),
  ];

  if (lead.paidAt) {
    metaParts.push(
      translateMessage("metaPaid", `оплачено ${formatDate(lead.paidAt)}`, {
        date: formatDate(lead.paidAt),
      })
    );
  }

  if (lead.cloudpaymentsTransactionId) {
    metaParts.push(
      translateMessage("metaTransaction", `транзакция ${lead.cloudpaymentsTransactionId}`, {
        id: lead.cloudpaymentsTransactionId,
      })
    );
  }

  elements.detailTitle.textContent =
    lead.businessName || lead.fullName || translateMessage("cardTitleDefault", "Карточка лида");
  elements.detailClient.textContent = lead.fullName || translateMessage("nameMissing", "Имя не указано");
  elements.detailCompany.textContent = `${lead.businessName || translateText("Без названия")} · ${lead.id}`;
  elements.detailEmail.textContent = lead.email || "—";
  elements.detailPhone.textContent = lead.phone || "—";
  elements.detailNiche.textContent = lead.niche ? translateText(lead.niche) : "—";
  elements.detailPackage.textContent = lead.packageTier ? translateText(lead.packageTier) : "—";
  elements.detailTemplate.textContent = lead.selectedTemplate ? translateText(lead.selectedTemplate) : "—";
  elements.detailCountry.textContent = lead.country || "—";
  elements.detailBudget.textContent = lead.budgetRange || "—";
  elements.detailTimeline.textContent = lead.timeline || "—";
  elements.detailPaymentStatus.textContent = paymentStatus
    ? translateText(paymentStatus)
    : translateMessage("unpaid", "Не оплачено");
  elements.detailInvoice.textContent = lead.invoiceId || "—";
  elements.detailPaymentAmount.textContent = lead.paymentAmount
    ? formatAmount(lead.paymentAmount, lead.paymentCurrency || "KZT")
    : "—";
  elements.detailCurrentSite.textContent = lead.currentWebsite || translateMessage("notSpecified", "Не указан");
  elements.detailProject.textContent =
    lead.projectDetails || translateMessage("descriptionMissing", "Описание не добавлено");
  elements.detailMeta.textContent = metaParts.filter(Boolean).join(" · ");
  elements.notes.value = lead.notes || "";
  elements.status.value = lead.status;
};

const updateLeadLocally = (id, patch) => {
  leads = leads.map((lead) =>
    lead.id === id
      ? normalizeLead({
          ...lead,
          ...patch,
          lastUpdatedAt: new Date().toISOString(),
        })
      : lead
  );
  saveStoredLeads(leads);
  return getSelectedLead();
};

const persistLeadUpdate = async (id, patch) => {
  if (!usesServer) {
    return updateLeadLocally(id, patch);
  }

  const response = await postForm("/api/crm/leads/update", { id, ...patch });
  const updatedLead = normalizeLead(response.lead ?? {});
  leads = leads.map((lead) => (lead.id === id ? updatedLead : lead));
  return updatedLead;
};

const initEvents = () => {
  elements.search?.addEventListener("input", renderLeadList);
  elements.filter?.addEventListener("change", renderLeadList);
  elements.logout?.addEventListener("click", async () => {
    try {
      await postForm("/api/auth/logout", {});
    } finally {
      window.location.href = "/staff-login.html";
    }
  });

  elements.status?.addEventListener("change", async () => {
    const lead = getSelectedLead();

    if (!lead) {
      return;
    }

    try {
      await persistLeadUpdate(lead.id, { status: elements.status.value });
      setMessage(
        translateMessage(
          "statusUpdated",
          `Статус обновлен: ${lead.businessName || lead.fullName} → ${elements.status.value}.`,
          {
            name: lead.businessName || lead.fullName,
            status: translateText(elements.status.value),
          }
        ),
        "success"
      );
      renderStatusChips();
      renderLeadList();
      renderLeadDetail();
      updateSummary();
    } catch (error) {
      setMessage(error.message || translateMessage("statusUpdateFailed", "Не удалось обновить статус."), "info");
      renderLeadDetail();
    }
  });

  elements.saveNotes?.addEventListener("click", async () => {
    const lead = getSelectedLead();

    if (!lead) {
      return;
    }

    try {
      await persistLeadUpdate(lead.id, { notes: elements.notes.value.trim() });
      setMessage(
        translateMessage("notesSaved", `Заметки сохранены для ${lead.businessName || lead.fullName}.`, {
          name: lead.businessName || lead.fullName,
        }),
        "success"
      );
      renderLeadDetail();
    } catch (error) {
      setMessage(error.message || translateMessage("notesSaveFailed", "Не удалось сохранить заметки."), "info");
    }
  });

  window.addEventListener("storage", (event) => {
    if (usesServer || event.key !== LEADS_STORAGE_KEY) {
      return;
    }

    leads = getStoredLeads();
    if (!leads.some((lead) => lead.id === selectedLeadId)) {
      selectedLeadId = leads[0]?.id ?? null;
    }
    updateSummary();
    renderStatusChips();
    renderLeadList();
    renderLeadDetail();
    setMessage(translateMessage("crmUpdated", "CRM обновлена: появились новые данные из сайта."), "info");
  });
};

const loadInitialLeads = async () => {
  try {
    const response = await fetchJson("/api/crm/leads");
    usesServer = true;
    setMessage(
      translateMessage("crmConnected", "CRM подключена к серверным заявкам и статусам."),
      "success"
    );
    return (response.leads ?? []).map(normalizeLead);
  } catch (error) {
    usesServer = false;
    throw error;
  }
};

const initDashboard = async () => {
  try {
    const staff = await loadCurrentStaff();
    if (elements.staffName) {
      elements.staffName.textContent = staff.fullName || staff.email || "Сотрудник";
    }
  } catch (error) {
    window.location.href = "/staff-login.html?next=%2Fadmin.html";
    return;
  }

  try {
    leads = await loadInitialLeads();
  } catch (error) {
    leads = [];
    setMessage(error.message || translateMessage("crmUnavailable", "Не удалось загрузить CRM."), "info");
  }

  selectedLeadId = leads[0]?.id ?? null;
  updateSummary();
  renderStatusChips();
  renderLeadList();
  renderLeadDetail();
  initEvents();
};

window.addEventListener("webfactory:languagechange", () => {
  updateSummary();
  renderStatusChips();
  renderLeadList();
  renderLeadDetail();
});

void initDashboard();

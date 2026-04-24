const ORDER_STATUS_PAID = "Оплачен";
const TASK_STATUS_OPEN = "open";
const TASK_STATUS_DONE = "done";

const state = {
  currentUser: null,
  users: [],
  columns: [],
  leads: [],
  tasks: [],
  selectedLeadId: null,
  activeView: "kanban",
};

const elements = {
  staffName: document.getElementById("staff-name"),
  logout: document.getElementById("staff-logout"),
  note: document.getElementById("integration-note"),
  total: document.getElementById("total-leads"),
  fresh: document.getElementById("new-leads"),
  active: document.getElementById("active-leads"),
  won: document.getElementById("won-leads"),
  myTasks: document.getElementById("my-tasks-count"),
  overdueTasks: document.getElementById("overdue-tasks-count"),
  search: document.getElementById("lead-search"),
  assigneeFilter: document.getElementById("assignee-filter"),
  kanban: document.getElementById("crm-kanban"),
  leadList: document.getElementById("lead-list"),
  taskFilter: document.getElementById("task-filter"),
  myTaskList: document.getElementById("my-task-list"),
  leadTaskList: document.getElementById("lead-task-list"),
  taskForm: document.getElementById("task-form"),
  staffForm: document.getElementById("staff-form"),
  staffList: document.getElementById("staff-list"),
  columnForm: document.getElementById("column-form"),
  columnList: document.getElementById("column-list"),
  saveLead: document.getElementById("save-lead"),
  leadColumn: document.getElementById("lead-column"),
  leadAssignee: document.getElementById("lead-assignee"),
  leadDescription: document.getElementById("lead-description"),
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
  detailPaymentAmount: document.getElementById("detail-payment-amount"),
  detailCurrentSite: document.getElementById("detail-current-site"),
  detailProject: document.getElementById("detail-project"),
  detailMeta: document.getElementById("detail-meta"),
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const readResponsePayload = async (response) => {
  const text = await response.text();
  return text ? safeJsonParse(text) ?? { message: text } : {};
};

const handleRequestError = (status, payload) => {
  if (status === 401) {
    window.location.href = "/staff-login.html?next=%2Fadmin.html";
    return new Error("Требуется вход сотрудника.");
  }
  return new Error(payload.message || "Не удалось выполнить действие.");
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await readResponsePayload(response);
  if (!response.ok || payload.success === false) {
    throw handleRequestError(response.status, payload);
  }
  return payload;
};

const postForm = async (url, payload) => {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      body.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const payloadResponse = await readResponsePayload(response);
  if (!response.ok || payloadResponse.success === false) {
    throw handleRequestError(response.status, payloadResponse);
  }
  return payloadResponse;
};

const normalizeLead = (lead = {}) => ({
  id: lead.id ?? "",
  status: lead.status ?? "Новый",
  columnId: lead.columnId ?? "",
  assignedToUserId: lead.assignedToUserId ?? "",
  fullName: lead.fullName ?? "",
  businessName: lead.businessName ?? "",
  email: lead.email ?? "",
  phone: lead.phone ?? "",
  country: lead.country ?? "",
  niche: lead.niche ?? "",
  packageTier: lead.packageTier ?? "",
  selectedTemplate: lead.selectedTemplate ?? "",
  currentWebsite: lead.currentWebsite ?? "",
  budgetRange: lead.budgetRange ?? "",
  timeline: lead.timeline ?? "",
  projectDetails: lead.projectDetails ?? "",
  description: lead.description ?? "",
  source: lead.source ?? "Сайт webcorn",
  notes: lead.notes ?? "",
  submittedAt: lead.submittedAt ?? "",
  lastUpdatedAt: lead.lastUpdatedAt ?? "",
  invoiceId: lead.invoiceId ?? "",
  paymentStatus: lead.paymentStatus ?? "",
  paymentAmount: lead.paymentAmount ?? "",
  paymentCurrency: lead.paymentCurrency ?? "KZT",
  paidAt: lead.paidAt ?? "",
  orderStatus: lead.orderStatus ?? "",
  cloudpaymentsTransactionId: lead.cloudpaymentsTransactionId ?? "",
});

const normalizeTask = (task = {}) => ({
  id: task.id ?? "",
  leadId: task.leadId ?? "",
  title: task.title ?? "",
  description: task.description ?? "",
  status: task.status ?? TASK_STATUS_OPEN,
  assignedToUserId: task.assignedToUserId ?? "",
  createdByUserId: task.createdByUserId ?? "",
  dueAt: task.dueAt ?? "",
  completedAt: task.completedAt ?? "",
  createdAt: task.createdAt ?? "",
  lastUpdatedAt: task.lastUpdatedAt ?? "",
});

const normalizeColumn = (column = {}) => ({
  id: column.id ?? "",
  title: column.title ?? "",
  sortOrder: Number(column.sortOrder ?? 0),
  isDefault: Boolean(column.isDefault),
});

const normalizeUser = (user = {}) => ({
  id: user.id ?? "",
  role: user.role ?? "",
  staffRole: user.staffRole ?? "",
  fullName: user.fullName ?? "",
  businessName: user.businessName ?? "",
  email: user.email ?? "",
});

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "—";

const formatAmount = (amount, currency = "KZT") => {
  const numeric = Number(String(amount ?? "").replace(",", "."));
  const suffix = currency === "KZT" ? "₸" : currency;
  return Number.isFinite(numeric) ? `${new Intl.NumberFormat("ru-RU").format(numeric)} ${suffix}` : "—";
};

const setMessage = (message, tone = "info") => {
  elements.note.textContent = message;
  elements.note.classList.toggle("is-success", tone === "success");
  elements.note.classList.toggle("is-info", tone !== "success");
};

const isManager = () => state.currentUser?.staffRole === "manager";
const isSales = () => state.currentUser?.staffRole === "sales";
const canEditLeads = () => isManager() || isSales();

const roleLabel = (role) =>
  ({ manager: "Менеджер", sales: "Продажник", developer: "Разработчик" })[role] || "Сотрудник";

const getSelectedLead = () => state.leads.find((lead) => lead.id === state.selectedLeadId) ?? null;
const getUser = (id) => state.users.find((user) => user.id === id) ?? null;
const getUserLabel = (id) => {
  const user = getUser(id);
  return user ? user.fullName || user.email : "Не назначен";
};
const getPaymentStatus = (lead) => lead.paymentStatus || lead.orderStatus || "";
const getLeadTasks = (leadId) => state.tasks.filter((task) => task.leadId === leadId);
const getOpenTaskCount = (leadId) => getLeadTasks(leadId).filter((task) => task.status !== TASK_STATUS_DONE).length;
const todayDate = () => new Date().toISOString().slice(0, 10);
const isOverdue = (task) => task.status !== TASK_STATUS_DONE && task.dueAt && task.dueAt < todayDate();

const getFallbackColumnId = () => state.columns[0]?.id ?? "";
const getLeadColumnId = (lead) => {
  if (state.columns.some((column) => column.id === lead.columnId)) {
    return lead.columnId;
  }
  return state.columns.find((column) => column.title === lead.status)?.id || getFallbackColumnId();
};

const getFilteredLeads = () => {
  const term = elements.search?.value.trim().toLowerCase() ?? "";
  const assignee = elements.assigneeFilter?.value ?? "all";
  return state.leads.filter((lead) => {
    const haystack = [
      lead.fullName,
      lead.businessName,
      lead.email,
      lead.phone,
      lead.niche,
      lead.packageTier,
      lead.selectedTemplate,
      lead.invoiceId,
    ]
      .join(" ")
      .toLowerCase();
    const matchesAssignee = assignee === "all" ? true : (lead.assignedToUserId || "none") === assignee;
    return matchesAssignee && (term ? haystack.includes(term) : true);
  });
};

const renderAssigneeOptions = (select, selected = "") => {
  if (!select) {
    return;
  }
  select.innerHTML = `<option value="">Не назначен</option>${state.users
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}"${user.id === selected ? " selected" : ""}>${escapeHtml(
          user.fullName || user.email
        )} · ${escapeHtml(roleLabel(user.staffRole))}</option>`
    )
    .join("")}`;
};

const renderColumnOptions = () => {
  elements.leadColumn.innerHTML = state.columns
    .map((column) => `<option value="${escapeHtml(column.id)}">${escapeHtml(column.title)}</option>`)
    .join("");
};

const renderFilters = () => {
  const selected = elements.assigneeFilter.value || "all";
  elements.assigneeFilter.innerHTML = `<option value="all"${selected === "all" ? " selected" : ""}>Все ответственные</option><option value="none"${
    selected === "none" ? " selected" : ""
  }>Не назначен</option>${state.users
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}"${user.id === selected ? " selected" : ""}>${escapeHtml(
          user.fullName || user.email
        )}</option>`
    )
    .join("")}`;
};

const updateSummary = () => {
  const myOpenTasks = state.tasks.filter(
    (task) => task.assignedToUserId === state.currentUser?.id && task.status !== TASK_STATUS_DONE
  );
  elements.total.textContent = String(state.leads.length);
  elements.fresh.textContent = String(state.leads.filter((lead) => lead.status === "Новый").length);
  elements.active.textContent = String(
    state.leads.filter((lead) => ["Контакт", "КП отправлено", "В работе"].includes(lead.status)).length
  );
  elements.won.textContent = String(
    state.leads.filter((lead) => getPaymentStatus(lead) === ORDER_STATUS_PAID || lead.status === "Успешно").length
  );
  elements.myTasks.textContent = String(myOpenTasks.length);
  elements.overdueTasks.textContent = String(myOpenTasks.filter(isOverdue).length);
};

const renderTabs = () => {
  document.querySelectorAll("[data-view-tab]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.viewTab === state.activeView);
  });
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === state.activeView);
  });
};

const renderKanban = () => {
  const filteredLeads = getFilteredLeads();
  if (!state.columns.length) {
    elements.kanban.innerHTML = `<article class="crm-empty"><strong>Колонки не настроены</strong><p>Менеджер может добавить колонки в настройках.</p></article>`;
    return;
  }

  elements.kanban.innerHTML = state.columns
    .map((column, index) => {
      const columnLeads = filteredLeads.filter((lead) => getLeadColumnId(lead) === column.id);
      const cards = columnLeads.length
        ? columnLeads
            .map((lead) => {
              const payment = getPaymentStatus(lead);
              const taskCount = getOpenTaskCount(lead.id);
              return `<article class="kanban-card${lead.id === state.selectedLeadId ? " is-active" : ""}" data-lead-id="${escapeHtml(
                lead.id
              )}">
                <div class="kanban-card__head">
                  <strong>${escapeHtml(lead.businessName || lead.fullName || lead.email || lead.id)}</strong>
                  <span>${escapeHtml(lead.id)}</span>
                </div>
                <p>${escapeHtml(lead.projectDetails || "Описание заявки не добавлено.")}</p>
                <div class="lead-item__meta">
                  <span class="lead-item__tag">${escapeHtml(lead.niche || "Без ниши")}</span>
                  <span class="lead-item__tag">${escapeHtml(getUserLabel(lead.assignedToUserId))}</span>
                  <span class="lead-item__tag">${taskCount} задач</span>
                  ${payment ? `<span class="payment-pill">${escapeHtml(payment)}</span>` : ""}
                </div>
                <div class="kanban-card__actions">
                  <button type="button" data-move-lead="${escapeHtml(lead.id)}" data-column-index="${index - 1}" ${
                    !canEditLeads() || index === 0 ? "disabled" : ""
                  }>Назад</button>
                  <button type="button" data-move-lead="${escapeHtml(lead.id)}" data-column-index="${index + 1}" ${
                    !canEditLeads() || index === state.columns.length - 1 ? "disabled" : ""
                  }>Дальше</button>
                </div>
              </article>`;
            })
            .join("")
        : `<article class="crm-empty crm-empty--compact"><strong>Пусто</strong><p>Лиды появятся после заявки или смены колонки.</p></article>`;
      return `<section class="kanban-column">
        <header><strong>${escapeHtml(column.title)}</strong><span>${columnLeads.length}</span></header>
        <div class="kanban-column__body">${cards}</div>
      </section>`;
    })
    .join("");
};

const renderLeadList = () => {
  const leads = getFilteredLeads();
  elements.leadList.innerHTML = leads.length
    ? leads
        .map(
          (lead) => `<article class="lead-item${lead.id === state.selectedLeadId ? " is-active" : ""}" data-lead-id="${escapeHtml(
            lead.id
          )}">
            <div class="lead-item__head"><strong>${escapeHtml(
              lead.businessName || lead.fullName || lead.email || lead.id
            )}</strong><span class="status-pill">${escapeHtml(
              state.columns.find((column) => column.id === getLeadColumnId(lead))?.title || lead.status
            )}</span></div>
            <p class="lead-item__company">${escapeHtml(lead.projectDetails || "Описание не добавлено.")}</p>
            <div class="lead-item__meta"><span class="lead-item__tag">${escapeHtml(
              lead.niche || "Без ниши"
            )}</span><span class="lead-item__tag">${escapeHtml(getUserLabel(lead.assignedToUserId))}</span></div>
          </article>`
        )
        .join("")
    : `<article class="crm-empty"><strong>Лидов не найдено</strong><p>Измените поиск или фильтр.</p></article>`;
};

const renderLeadDetail = () => {
  const lead = getSelectedLead();
  renderColumnOptions();
  renderAssigneeOptions(elements.leadAssignee, lead?.assignedToUserId ?? "");
  renderAssigneeOptions(elements.taskForm?.elements.assignedToUserId, state.currentUser?.id ?? "");

  const leadControls = [elements.leadColumn, elements.leadAssignee, elements.leadDescription];
  leadControls.forEach((control) => {
    if (control) {
      control.disabled = !canEditLeads();
    }
  });

  if (!lead) {
    elements.detailTitle.textContent = "Выберите лид";
    elements.detailClient.textContent = "Лид не выбран";
    elements.detailCompany.textContent = "Откройте карточку в канбане или списке.";
    [
      elements.detailEmail,
      elements.detailPhone,
      elements.detailNiche,
      elements.detailPackage,
      elements.detailTemplate,
      elements.detailCountry,
      elements.detailBudget,
      elements.detailTimeline,
      elements.detailPaymentStatus,
      elements.detailPaymentAmount,
      elements.detailCurrentSite,
      elements.detailProject,
      elements.detailMeta,
    ].forEach((node) => (node.textContent = "—"));
    elements.notes.value = "";
    elements.leadDescription.value = "";
    elements.leadTaskList.innerHTML = `<article class="crm-empty crm-empty--compact"><strong>Нет выбранного лида</strong><p>Выберите лид, чтобы создать задачу.</p></article>`;
    elements.taskForm.hidden = true;
    return;
  }

  elements.taskForm.hidden = false;
  elements.detailTitle.textContent = lead.businessName || lead.fullName || "Карточка лида";
  elements.detailClient.textContent = lead.fullName || "Имя не указано";
  elements.detailCompany.textContent = `${lead.businessName || "Без названия"} · ${lead.id}`;
  elements.detailEmail.textContent = lead.email || "—";
  elements.detailPhone.textContent = lead.phone || "—";
  elements.detailNiche.textContent = lead.niche || "—";
  elements.detailPackage.textContent = lead.packageTier || "—";
  elements.detailTemplate.textContent = lead.selectedTemplate || "—";
  elements.detailCountry.textContent = lead.country || "—";
  elements.detailBudget.textContent = lead.budgetRange || "—";
  elements.detailTimeline.textContent = lead.timeline || "—";
  elements.detailPaymentStatus.textContent = getPaymentStatus(lead) || "Не оплачено";
  elements.detailPaymentAmount.textContent = lead.paymentAmount ? formatAmount(lead.paymentAmount, lead.paymentCurrency) : "—";
  elements.detailCurrentSite.textContent = lead.currentWebsite || "Не указан";
  elements.detailProject.textContent = lead.projectDetails || "Описание не добавлено";
  elements.detailMeta.textContent = [lead.source, formatDate(lead.submittedAt), `обновлено ${formatDate(lead.lastUpdatedAt)}`]
    .filter(Boolean)
    .join(" · ");
  elements.leadColumn.value = getLeadColumnId(lead);
  elements.leadAssignee.value = lead.assignedToUserId;
  elements.leadDescription.value = lead.description;
  elements.notes.value = lead.notes;
  renderLeadTasks();
};

const taskCard = (task, options = {}) => {
  const lead = state.leads.find((item) => item.id === task.leadId);
  const done = task.status === TASK_STATUS_DONE;
  return `<article class="task-card${done ? " is-done" : ""}${isOverdue(task) ? " is-overdue" : ""}" data-task-id="${escapeHtml(
    task.id
  )}">
    <div class="task-card__head">
      <div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(
        options.showLead && lead ? lead.businessName || lead.fullName || lead.id : getUserLabel(task.assignedToUserId)
      )}</span></div>
      <button type="button" data-toggle-task="${escapeHtml(task.id)}">${done ? "Вернуть" : "Выполнить"}</button>
    </div>
    <textarea data-task-description="${escapeHtml(task.id)}" aria-label="Описание задачи">${escapeHtml(
      task.description
    )}</textarea>
    <div class="task-card__foot">
      <span>${task.dueAt ? `срок ${escapeHtml(formatDate(task.dueAt))}` : "без срока"}</span>
      <button type="button" data-save-task="${escapeHtml(task.id)}">Сохранить описание</button>
    </div>
  </article>`;
};

const renderLeadTasks = () => {
  const lead = getSelectedLead();
  const tasks = lead ? getLeadTasks(lead.id) : [];
  elements.leadTaskList.innerHTML = tasks.length
    ? tasks.map((task) => taskCard(task)).join("")
    : `<article class="crm-empty crm-empty--compact"><strong>Задач пока нет</strong><p>Создайте задачу для продажника или разработчика.</p></article>`;
};

const renderMyTasks = () => {
  const filter = elements.taskFilter?.value ?? TASK_STATUS_OPEN;
  const tasks = state.tasks.filter((task) => {
    const isMine = task.assignedToUserId === state.currentUser?.id;
    const matchesFilter = filter === "all" ? true : task.status === filter;
    return isMine && matchesFilter;
  });
  elements.myTaskList.innerHTML = tasks.length
    ? tasks.map((task) => taskCard(task, { showLead: true })).join("")
    : `<article class="crm-empty"><strong>Задач нет</strong><p>Когда вам назначат задачу, она появится здесь.</p></article>`;
};

const renderStaff = () => {
  elements.staffForm.hidden = !isManager();
  elements.staffList.innerHTML = state.users
    .map(
      (user) => `<article class="staff-card"><strong>${escapeHtml(user.fullName || user.email)}</strong><span>${escapeHtml(
        user.email
      )}</span><em>${escapeHtml(roleLabel(user.staffRole))}</em></article>`
    )
    .join("");
  if (!isManager()) {
    elements.staffList.insertAdjacentHTML(
      "afterbegin",
      `<article class="crm-empty crm-empty--compact"><strong>Добавление сотрудников защищено</strong><p>Новых пользователей может добавлять только менеджер.</p></article>`
    );
  }
};

const renderColumns = () => {
  elements.columnForm.hidden = !isManager();
  elements.columnList.innerHTML = state.columns
    .map(
      (column, index) => `<article class="column-card" data-column-id="${escapeHtml(column.id)}">
        <input type="text" value="${escapeHtml(column.title)}" data-column-title="${escapeHtml(column.id)}" ${
        isManager() ? "" : "disabled"
      } />
        <span>Порядок ${index + 1}</span>
        <button type="button" data-save-column="${escapeHtml(column.id)}" ${isManager() ? "" : "disabled"}>Сохранить</button>
        <button type="button" data-delete-column="${escapeHtml(column.id)}" ${
        isManager() && !column.isDefault ? "" : "disabled"
      }>Удалить</button>
      </article>`
    )
    .join("");
  if (!isManager()) {
    elements.columnList.insertAdjacentHTML(
      "afterbegin",
      `<article class="crm-empty crm-empty--compact"><strong>Колонки защищены</strong><p>Настраивать канбан может только менеджер.</p></article>`
    );
  }
};

const renderAll = () => {
  updateSummary();
  renderTabs();
  renderFilters();
  renderKanban();
  renderLeadList();
  renderLeadDetail();
  renderMyTasks();
  renderStaff();
  renderColumns();
};

const replaceLead = (lead) => {
  const normalized = normalizeLead(lead);
  state.leads = state.leads.map((item) => (item.id === normalized.id ? normalized : item));
};

const replaceTask = (task) => {
  const normalized = normalizeTask(task);
  state.tasks = state.tasks.some((item) => item.id === normalized.id)
    ? state.tasks.map((item) => (item.id === normalized.id ? normalized : item))
    : [normalized, ...state.tasks];
};

const updateLead = async (id, patch) => {
  const response = await postForm("/api/crm/leads/update", { id, ...patch });
  replaceLead(response.lead);
  renderAll();
};

const updateTask = async (id, patch) => {
  const response = await postForm("/api/crm/tasks/update", { id, ...patch });
  replaceTask(response.task);
  renderAll();
};

const initEvents = () => {
  document.querySelectorAll("[data-view-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeView = tab.dataset.viewTab;
      renderTabs();
    });
  });

  elements.logout.addEventListener("click", async () => {
    try {
      await postForm("/api/auth/logout", {});
    } finally {
      window.location.href = "/staff-login.html";
    }
  });

  elements.search.addEventListener("input", renderAll);
  elements.assigneeFilter.addEventListener("change", renderAll);
  elements.taskFilter.addEventListener("change", renderMyTasks);

  document.addEventListener("click", async (event) => {
    const leadCard = event.target.closest("[data-lead-id]");
    const moveButton = event.target.closest("[data-move-lead]");
    const toggleTaskButton = event.target.closest("[data-toggle-task]");
    const saveTaskButton = event.target.closest("[data-save-task]");
    const saveColumnButton = event.target.closest("[data-save-column]");
    const deleteColumnButton = event.target.closest("[data-delete-column]");

    try {
      if (moveButton) {
        event.stopPropagation();
        const column = state.columns[Number(moveButton.dataset.columnIndex)];
        if (column) {
          await updateLead(moveButton.dataset.moveLead, { columnId: column.id, status: column.title });
          setMessage("Лид перемещен по канбану.", "success");
        }
        return;
      }
      if (leadCard) {
        state.selectedLeadId = leadCard.dataset.leadId;
        renderAll();
        return;
      }
      if (toggleTaskButton) {
        const task = state.tasks.find((item) => item.id === toggleTaskButton.dataset.toggleTask);
        await updateTask(task.id, { status: task.status === TASK_STATUS_DONE ? TASK_STATUS_OPEN : TASK_STATUS_DONE });
        setMessage("Статус задачи обновлен.", "success");
        return;
      }
      if (saveTaskButton) {
        const taskId = saveTaskButton.dataset.saveTask;
        const textarea = document.querySelector(`[data-task-description="${taskId}"]`);
        await updateTask(taskId, { description: textarea?.value ?? "" });
        setMessage("Описание задачи сохранено.", "success");
        return;
      }
      if (saveColumnButton) {
        const columnId = saveColumnButton.dataset.saveColumn;
        const input = document.querySelector(`[data-column-title="${columnId}"]`);
        const response = await postForm("/api/crm/columns/update", { id: columnId, title: input?.value ?? "" });
        const updated = normalizeColumn(response.column);
        state.columns = state.columns.map((column) => (column.id === updated.id ? updated : column));
        renderAll();
        setMessage("Колонка сохранена.", "success");
        return;
      }
      if (deleteColumnButton) {
        await postForm("/api/crm/columns/delete", { id: deleteColumnButton.dataset.deleteColumn });
        await bootstrap();
        setMessage("Колонка удалена, лиды перенесены в первую колонку.", "success");
      }
    } catch (error) {
      setMessage(error.message, "info");
    }
  });

  elements.saveLead.addEventListener("click", async () => {
    const lead = getSelectedLead();
    if (!lead) {
      return;
    }
    const column = state.columns.find((item) => item.id === elements.leadColumn.value);
    const patch = {
      notes: elements.notes.value,
      columnId: elements.leadColumn.value,
      status: column?.title || lead.status,
      assignedToUserId: elements.leadAssignee.value,
      description: elements.leadDescription.value,
    };
    if (!canEditLeads()) {
      delete patch.columnId;
      delete patch.status;
      delete patch.assignedToUserId;
      delete patch.description;
    }
    try {
      await updateLead(lead.id, patch);
      setMessage("Карточка лида сохранена.", "success");
    } catch (error) {
      setMessage(error.message, "info");
    }
  });

  elements.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lead = getSelectedLead();
    if (!lead) {
      return;
    }
    const values = Object.fromEntries(new FormData(elements.taskForm).entries());
    try {
      const response = await postForm("/api/crm/tasks/create", { ...values, leadId: lead.id });
      replaceTask(response.task);
      elements.taskForm.reset();
      renderAll();
      setMessage("Задача добавлена к лиду.", "success");
    } catch (error) {
      setMessage(error.message, "info");
    }
  });

  elements.staffForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(elements.staffForm).entries());
    try {
      const response = await postForm("/api/crm/users/create", values);
      state.users = [...state.users, normalizeUser(response.user)];
      elements.staffForm.reset();
      renderAll();
      setMessage("Сотрудник добавлен.", "success");
    } catch (error) {
      setMessage(error.message, "info");
    }
  });

  elements.columnForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(elements.columnForm).entries());
    try {
      const response = await postForm("/api/crm/columns/create", values);
      state.columns = [...state.columns, normalizeColumn(response.column)].sort((a, b) => a.sortOrder - b.sortOrder);
      elements.columnForm.reset();
      renderAll();
      setMessage("Колонка добавлена.", "success");
    } catch (error) {
      setMessage(error.message, "info");
    }
  });
};

const bootstrap = async () => {
  const payload = await fetchJson("/api/crm/bootstrap");
  state.currentUser = normalizeUser(payload.user);
  state.users = (payload.users ?? []).map(normalizeUser);
  state.columns = (payload.columns ?? []).map(normalizeColumn).sort((a, b) => a.sortOrder - b.sortOrder);
  state.leads = (payload.leads ?? []).map(normalizeLead);
  state.tasks = (payload.tasks ?? []).map(normalizeTask);
  if (!state.leads.some((lead) => lead.id === state.selectedLeadId)) {
    state.selectedLeadId = state.leads[0]?.id ?? null;
  }
  elements.staffName.textContent = `${state.currentUser.fullName || state.currentUser.email} · ${roleLabel(
    state.currentUser.staffRole
  )}`;
  setMessage("CRM подключена к серверным данным.", "success");
  renderAll();
};

const initDashboard = async () => {
  try {
    await bootstrap();
    initEvents();
  } catch (error) {
    setMessage(error.message || "Не удалось загрузить CRM.", "info");
  }
};

void initDashboard();

(function () {
  const PENDING_LEAD_KEY = "webfactory-pending-lead";
  const accountPage = document.querySelector("[data-account-page]");
  const staffLoginPage = document.querySelector("[data-staff-login-page]");

  if (!accountPage && !staffLoginPage) {
    return;
  }

  const translateText = (value) => window.WebfactoryI18n?.text(value) ?? value;
  const translateMessage = (key, fallback, params = {}) =>
    window.WebfactoryI18n?.message(key, params) ?? fallback;
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

  const readPendingLead = () =>
    safeJsonParse(window.sessionStorage?.getItem(PENDING_LEAD_KEY) ?? "null") ?? null;

  const clearPendingLead = () => {
    window.sessionStorage?.removeItem(PENDING_LEAD_KEY);
  };

  const buildBody = (payload) => {
    const body = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      body.set(key, String(value));
    });

    return body.toString();
  };

  const readResponsePayload = async (response) => {
    const text = await response.text();
    return text ? safeJsonParse(text) ?? { message: text } : {};
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

  const fetchJson = async (url) => {
    try {
      const response = await window.fetch(apiUrl(url), {
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readResponsePayload(response);

      if (!response.ok || payload.success === false) {
        throw new Error(translateText(payload.message ?? "Не удалось загрузить данные."));
      }

      return payload;
    } catch (error) {
      throw new Error(normalizeRequestError(error, translateText("Не удалось загрузить данные.")));
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
        body: buildBody(payload),
      });
      const result = await readResponsePayload(response);

      if (!response.ok || result.success === false) {
        throw new Error(translateText(result.message ?? "Не удалось выполнить действие."));
      }

      return result;
    } catch (error) {
      throw new Error(normalizeRequestError(error, translateText("Не удалось выполнить действие.")));
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(window.WebfactoryI18n?.language === "en" ? "en-US" : "ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const setMessage = (node, message, tone = "info") => {
    if (!node) {
      return;
    }

    if (!message) {
      node.hidden = true;
      node.textContent = "";
      node.classList.remove("is-error", "is-success");
      return;
    }

    node.hidden = false;
    node.textContent = translateText(message);
    node.classList.toggle("is-error", tone === "error");
    node.classList.toggle("is-success", tone === "success");
  };

  const syncAccountLinks = (authenticated) => {
    document.querySelectorAll("[data-account-link]").forEach((link) => {
      link.textContent = translateText(authenticated ? "Кабинет" : "Войти");
      link.setAttribute("href", "account.html");
    });
  };

  const getAuthModeFromUrl = () => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    return mode === "register" ? "register" : "login";
  };

  const setAuthModeInUrl = (mode) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    window.history.replaceState({}, "", url);
  };

  const readFormValues = (form) => {
    const data = new FormData(form);
    return Object.fromEntries(
      Array.from(data.entries()).map(([key, value]) => [key, String(value ?? "").trim()])
    );
  };

  const getNextUrl = () => {
    const value = new URLSearchParams(window.location.search).get("next") || "";
    return value.startsWith("/") ? value : "/admin.html";
  };

  const submitPendingLead = async () => {
    const pending = readPendingLead();

    if (!pending?.payload) {
      return null;
    }

    const response = await postForm("/api/leads/create", {
      ...pending.payload,
      source: pending.source ?? "Личный кабинет webcorn",
    });

    clearPendingLead();
    return response.lead ?? null;
  };

  const renderLeadCards = (container, leads) => {
    if (!container) {
      return;
    }

    if (!Array.isArray(leads) || !leads.length) {
      container.innerHTML = `
        <article class="account-empty">
          <strong>${translateText("Пока заявок нет")}</strong>
          <p>${translateText("Выберите нишу, откройте демо и отправьте первую заявку через сайт.")}</p>
        </article>
      `;
      return;
    }

    container.innerHTML = leads
      .map((lead) => {
        const summary = [lead.niche, lead.packageTier, lead.selectedTemplate]
          .filter(Boolean)
          .map((value) => translateText(value))
          .join(" / ");
        const meta = [
          lead.id,
          formatDate(lead.submittedAt),
          lead.currentWebsite || "",
        ]
          .filter(Boolean)
          .join(" • ");

        return `
          <article class="account-lead-card">
            <div class="account-lead-card__head">
              <div>
                <strong>${lead.businessName || lead.fullName || lead.email}</strong>
                <span>${summary || translateText("Заявка без выбранного демо")}</span>
              </div>
              <span class="account-status-badge">${translateText(lead.status || "Новый")}</span>
            </div>
            <p>${lead.projectDetails || translateText("Описание задачи пока не добавлено.")}</p>
            <div class="account-lead-card__meta">
              <span>${meta || "—"}</span>
              <span>${translateMessage("accountUpdatedAt", `Обновлено ${formatDate(lead.lastUpdatedAt)}`, {
                date: formatDate(lead.lastUpdatedAt),
              })}</span>
            </div>
          </article>
        `;
      })
      .join("");
  };

  async function initAccountPage() {
    if (!accountPage) {
      return;
    }

    const authPanel = accountPage.querySelector("[data-account-auth]");
    const dashboardPanel = accountPage.querySelector("[data-account-dashboard]");
    const messageNode = accountPage.querySelector("[data-account-message]");
    const dashboardMessageNode = accountPage.querySelector("[data-account-dashboard-message]");
    const loginForm = accountPage.querySelector("[data-login-form]");
    const registerForm = accountPage.querySelector("[data-register-form]");
    const leadList = accountPage.querySelector("[data-account-leads]");
    const userTitle = accountPage.querySelector("[data-account-user-title]");
    const userCopy = accountPage.querySelector("[data-account-user-copy]");
    const userName = accountPage.querySelector("[data-account-user-name]");
    const userEmail = accountPage.querySelector("[data-account-user-email]");
    const logoutButton = accountPage.querySelector("[data-account-logout]");
    const authTabs = accountPage.querySelectorAll("[data-auth-tab]");

    const setAuthMode = (mode, options = {}) => {
      authTabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.authTab === mode);
      });
      loginForm.hidden = mode !== "login";
      registerForm.hidden = mode !== "register";

      if (!options.skipUrlSync) {
        setAuthModeInUrl(mode);
      }
    };

    const showAuthState = (message = "", tone = "info") => {
      authPanel.hidden = false;
      dashboardPanel.hidden = true;
      syncAccountLinks(false);
      setMessage(messageNode, message, tone);
      setMessage(dashboardMessageNode, "");
    };

    const renderDashboard = async (user, message = "", tone = "success") => {
      authPanel.hidden = true;
      dashboardPanel.hidden = false;
      syncAccountLinks(true);
      setMessage(messageNode, "");
      setMessage(dashboardMessageNode, message, tone);

      userTitle.textContent = translateText("Кабинет клиента");
      userCopy.textContent = translateText("Здесь хранятся все заявки, которые вы отправили через webcorn.");
      userName.textContent = user.fullName || translateText("Клиент webcorn");
      userEmail.textContent = user.email || "—";

      const leadsResponse = await fetchJson("/api/account/leads");
      renderLeadCards(leadList, leadsResponse.leads ?? []);
    };

    const finishCustomerAuth = async (user, successMessage = "") => {
      let finalMessage = successMessage;

      try {
        const submittedLead = await submitPendingLead();
        if (submittedLead) {
          finalMessage = translateMessage(
            "accountLeadCreated",
            `Заявка ${submittedLead.id} отправлена и уже появилась в вашем кабинете.`,
            { id: submittedLead.id }
          );
        }
      } catch (error) {
        await renderDashboard(user);
        setMessage(
          dashboardMessageNode,
          error.message || translateText("Не удалось отправить сохраненную заявку."),
          "error"
        );
        return;
      }

      await renderDashboard(user, finalMessage, "success");
    };

    authTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setAuthMode(tab.dataset.authTab ?? "login");
      });
    });

    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(messageNode, "");

      try {
        const values = readFormValues(loginForm);
        const response = await postForm("/api/auth/login", {
          email: values.email ?? "",
          password: values.password ?? "",
          role: "customer",
        });
        await finishCustomerAuth(
          response.user ?? {},
          translateText("Вы вошли в личный кабинет.")
        );
      } catch (error) {
        showAuthState(error.message || translateText("Не удалось войти."), "error");
      }
    });

    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(messageNode, "");

      try {
        const values = readFormValues(registerForm);
        const response = await postForm("/api/auth/register", {
          fullName: values.fullName ?? "",
          businessName: values.businessName ?? "",
          email: values.email ?? "",
          password: values.password ?? "",
        });
        await finishCustomerAuth(
          response.user ?? {},
          translateText("Аккаунт создан. Теперь вы можете отслеживать заявки в кабинете.")
        );
      } catch (error) {
        showAuthState(error.message || translateText("Не удалось создать аккаунт."), "error");
      }
    });

    logoutButton?.addEventListener("click", async () => {
      try {
        await postForm("/api/auth/logout", {});
      } finally {
        showAuthState(translateText("Вы вышли из личного кабинета."), "success");
        setAuthMode("login");
        renderLeadCards(leadList, []);
      }
    });

    setAuthMode(getAuthModeFromUrl(), { skipUrlSync: true });

    try {
      const session = await fetchJson("/api/auth/me");

      if (session.authenticated && session.user?.role === "staff") {
        window.location.href = "/admin.html";
        return;
      }

      if (session.authenticated && session.user?.role === "customer") {
        await finishCustomerAuth(session.user);
        return;
      }
    } catch (error) {
      // Leave the auth view visible if session lookup fails.
    }

    showAuthState(
      readPendingLead()
        ? translateText("Сначала войдите или зарегистрируйтесь. После этого заявка отправится в ваш кабинет.")
        : ""
    );
  }

  async function initStaffLoginPage() {
    if (!staffLoginPage) {
      return;
    }

    const form = staffLoginPage.querySelector("[data-staff-login-form]");
    const messageNode = staffLoginPage.querySelector("[data-staff-message]");

    const redirectToCRM = () => {
      window.location.href = getNextUrl();
    };

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(messageNode, "");

      try {
        const values = readFormValues(form);
        await postForm("/api/auth/login", {
          email: values.email ?? "",
          password: values.password ?? "",
          role: "staff",
        });
        redirectToCRM();
      } catch (error) {
        setMessage(messageNode, error.message || translateText("Не удалось войти в CRM."), "error");
      }
    });

    try {
      const session = await fetchJson("/api/auth/me");
      if (session.authenticated && session.user?.role === "staff") {
        redirectToCRM();
      }
    } catch (error) {
      // Keep the login form visible.
    }
  }

  void initAccountPage();
  void initStaffLoginPage();
})();

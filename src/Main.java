import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.PBEKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

public class Main {
    private static final Path ROOT_DIR = Path.of("").toAbsolutePath().normalize();
    private static final Path DATA_DIR = ROOT_DIR.resolve("data").normalize();
    private static final Path LEADS_DIR = DATA_DIR.resolve("leads");
    private static final Path ORDERS_DIR = DATA_DIR.resolve("orders");
    private static final Path USERS_DIR = DATA_DIR.resolve("users");
    private static final Path SESSIONS_DIR = DATA_DIR.resolve("sessions");
    private static final int PORT = readPort();
    private static final String DEFAULT_CURRENCY = "KZT";
    private static final String STATUS_NEW = "Новый";
    private static final String ORDER_STATUS_PENDING = "Ожидает оплаты";
    private static final String ORDER_STATUS_PAID = "Оплачен";
    private static final String ORDER_STATUS_FAILED = "Ошибка оплаты";
    private static final String ROLE_CUSTOMER = "customer";
    private static final String ROLE_STAFF = "staff";
    private static final String SESSION_COOKIE = "wf_session";
    private static final long SESSION_MAX_AGE_SECONDS = 60L * 60L * 24L * 30L;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    // TODO: Укажите доступы сотрудников через переменные окружения, чтобы CRM была доступна только команде.
    private static final String STAFF_BOOTSTRAP_EMAIL =
            System.getenv().getOrDefault("WEBFACTORY_STAFF_EMAIL", "").trim();
    private static final String STAFF_BOOTSTRAP_PASSWORD =
            System.getenv().getOrDefault("WEBFACTORY_STAFF_PASSWORD", "").trim();
    private static final String STAFF_BOOTSTRAP_NAME =
            System.getenv().getOrDefault("WEBFACTORY_STAFF_NAME", "Команда webcorn").trim();
    // TODO: Подставьте сюда publicId из личного кабинета CloudPayments через переменную окружения.
    // Секретный ключ на фронтенд не передаем и не храним.
    private static final String CLOUDPAYMENTS_PUBLIC_ID =
            System.getenv().getOrDefault("CLOUDPAYMENTS_PUBLIC_ID", "").trim();
    // TODO: Подключите secret key CloudPayments только на сервере через переменную окружения.
    // Он используется для проверки webhook-подписей и не должен попадать во frontend.
    private static final String CLOUDPAYMENTS_API_SECRET =
            System.getenv().getOrDefault("CLOUDPAYMENTS_API_SECRET", "").trim();
    private static final Map<String, Product> PRODUCT_CATALOG = createProductCatalog();

    public static void main(String[] args) throws Exception {
        ensureStorageDirectories();
        ensureStaffAccount();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/", Main::handleRequest);
        server.setExecutor(Executors.newFixedThreadPool(12));
        server.start();

        System.out.println("webcorn server started on http://localhost:" + PORT);
        System.out.println("Staff account configured: " + (!STAFF_BOOTSTRAP_EMAIL.isBlank() && !STAFF_BOOTSTRAP_PASSWORD.isBlank()));
        System.out.println("CloudPayments publicId configured: " + (!CLOUDPAYMENTS_PUBLIC_ID.isBlank()));
        System.out.println("CloudPayments API secret configured: " + (!CLOUDPAYMENTS_API_SECRET.isBlank()));
        // TODO: Эти URL нужно указать в личном кабинете CloudPayments в настройках уведомлений.
        // Для production замените localhost на ваш реальный домен.
        System.out.println("Webhook check URL: http://localhost:" + PORT + "/webhooks/cloudpayments/check");
        System.out.println("Webhook pay URL: http://localhost:" + PORT + "/webhooks/cloudpayments/pay");
    }

    private static void handleRequest(HttpExchange exchange) throws IOException {
        try {
            String method = exchange.getRequestMethod().toUpperCase(Locale.ROOT);
            String path = normalizePath(exchange.getRequestURI().getPath());

            if ("/admin.html".equals(path) && "GET".equals(method) && !isAuthorized(exchange, ROLE_STAFF)) {
                redirect(exchange, "/staff-login.html?next=" + urlEncode("/admin.html"));
                return;
            }

            if ("/staff-login.html".equals(path) && "GET".equals(method) && isAuthorized(exchange, ROLE_STAFF)) {
                redirect(exchange, "/admin.html");
                return;
            }

            if ("/api/health".equals(path) && "GET".equals(method)) {
                sendJson(exchange, 200, Map.of(
                        "success", true,
                        "configured", Map.of(
                                "publicId", !CLOUDPAYMENTS_PUBLIC_ID.isBlank(),
                                "apiSecret", !CLOUDPAYMENTS_API_SECRET.isBlank(),
                                "staffAuth", !STAFF_BOOTSTRAP_EMAIL.isBlank() && !STAFF_BOOTSTRAP_PASSWORD.isBlank()
                        )
                ));
                return;
            }

            if ("/api/auth/me".equals(path) && "GET".equals(method)) {
                handleAuthMe(exchange);
                return;
            }

            if ("/api/auth/register".equals(path) && "POST".equals(method)) {
                handleRegister(exchange);
                return;
            }

            if ("/api/auth/login".equals(path) && "POST".equals(method)) {
                handleLogin(exchange);
                return;
            }

            if ("/api/auth/logout".equals(path) && "POST".equals(method)) {
                handleLogout(exchange);
                return;
            }

            if ("/api/account/leads".equals(path) && "GET".equals(method)) {
                handleAccountLeads(exchange);
                return;
            }

            if ("/api/orders/create".equals(path) && "POST".equals(method)) {
                handleCreateOrder(exchange);
                return;
            }

            if ("/api/orders/status".equals(path) && "GET".equals(method)) {
                handleOrderStatus(exchange);
                return;
            }

            if ("/api/orders/fail".equals(path) && "POST".equals(method)) {
                handleOrderFailure(exchange);
                return;
            }

            if ("/api/leads/create".equals(path) && "POST".equals(method)) {
                handleCreateLead(exchange);
                return;
            }

            if ("/api/crm/leads".equals(path) && "GET".equals(method)) {
                handleListLeads(exchange);
                return;
            }

            if ("/api/crm/leads/update".equals(path) && "POST".equals(method)) {
                handleUpdateLead(exchange);
                return;
            }

            if ("/webhooks/cloudpayments/check".equals(path) && "POST".equals(method)) {
                handleCheckWebhook(exchange);
                return;
            }

            if ("/webhooks/cloudpayments/pay".equals(path) && "POST".equals(method)) {
                handlePayWebhook(exchange);
                return;
            }

            serveStatic(exchange, path, method);
        } catch (HttpError error) {
            sendJson(exchange, error.statusCode, Map.of(
                    "success", false,
                    "message", error.getMessage()
            ));
        } catch (Exception error) {
            error.printStackTrace();
            sendJson(exchange, 500, Map.of(
                    "success", false,
                    "message", "Внутренняя ошибка сервера."
            ));
        } finally {
            exchange.close();
        }
    }

    private static void handleCreateOrder(HttpExchange exchange) throws IOException {
        if (CLOUDPAYMENTS_PUBLIC_ID.isBlank()) {
            throw new HttpError(503, "CloudPayments publicId не настроен на сервере.");
        }

        FormRequest request = readFormRequest(exchange);
        String productId = requireValue(request.params(), "productId");
        String email = requireEmail(request.params(), "email");
        Product product = requireProduct(productId);

        LeadRecord lead = upsertPaymentLead(request.params(), product, email);
        OrderRecord order = createOrder(request.params(), product, lead);

        lead.invoiceId = order.invoiceId;
        lead.paymentStatus = ORDER_STATUS_PENDING;
        lead.orderStatus = ORDER_STATUS_PENDING;
        lead.paymentAmount = order.amount;
        lead.paymentCurrency = order.currency;
        lead.lastUpdatedAt = now();

        saveLead(lead);
        saveOrder(order);

        sendJson(exchange, 200, Map.of(
                "success", true,
                "publicId", CLOUDPAYMENTS_PUBLIC_ID,
                "order", order.toMap()
        ));
    }

    private static void handleOrderStatus(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseFormEncoded(exchange.getRequestURI().getRawQuery());
        String invoiceId = requireValue(params, "invoiceId");
        OrderRecord order = loadOrder(invoiceId)
                .orElseThrow(() -> new HttpError(404, "Заказ не найден."));

        sendJson(exchange, 200, Map.of(
                "success", true,
                "order", order.toMap()
        ));
    }

    private static void handleOrderFailure(HttpExchange exchange) throws IOException {
        FormRequest request = readFormRequest(exchange);
        String invoiceId = requireValue(request.params(), "invoiceId");
        OrderRecord order = loadOrder(invoiceId)
                .orElseThrow(() -> new HttpError(404, "Заказ не найден."));

        if (!ORDER_STATUS_PAID.equals(order.status)) {
            order.status = ORDER_STATUS_FAILED;
            order.failureReason = valueOrBlank(request.params().get("reason"));
            order.failedAt = now();
            order.lastUpdatedAt = order.failedAt;
            saveOrder(order);

            loadLead(order.leadId).ifPresent((lead) -> {
                lead.paymentStatus = ORDER_STATUS_FAILED;
                lead.orderStatus = ORDER_STATUS_FAILED;
                lead.lastUpdatedAt = now();
                try {
                    saveLead(lead);
                } catch (IOException error) {
                    throw new RuntimeException(error);
                }
            });
        }

        sendJson(exchange, 200, Map.of(
                "success", true,
                "order", order.toMap()
        ));
    }

    private static void handleCreateLead(HttpExchange exchange) throws IOException {
        AuthContext auth = requireAuth(exchange, ROLE_CUSTOMER);
        FormRequest request = readFormRequest(exchange);
        String email = auth.user.email;
        String userId = auth.user.id;

        LeadRecord lead = findLeadByUserAndSelection(
                userId,
                email,
                valueOrBlank(request.params().get("niche")),
                valueOrBlank(request.params().get("packageTier")),
                valueOrBlank(request.params().get("selectedTemplate"))
        ).orElseGet(LeadRecord::newLead);

        String timestamp = now();
        if (lead.submittedAt.isBlank()) {
            lead.submittedAt = timestamp;
        }

        lead.status = firstNonBlank(lead.status, STATUS_NEW);
        lead.userId = userId;
        lead.fullName = mergeValue(mergeValue(lead.fullName, auth.user.fullName), request.params().get("fullName"));
        lead.businessName = mergeValue(mergeValue(lead.businessName, auth.user.businessName), request.params().get("businessName"));
        lead.email = email;
        lead.phone = mergeValue(lead.phone, request.params().get("phone"));
        lead.country = mergeValue(lead.country, request.params().get("country"));
        lead.niche = mergeValue(lead.niche, request.params().get("niche"));
        lead.packageTier = mergeValue(lead.packageTier, request.params().get("packageTier"));
        lead.selectedTemplate = mergeValue(lead.selectedTemplate, request.params().get("selectedTemplate"));
        lead.currentWebsite = mergeValue(lead.currentWebsite, request.params().get("currentWebsite"));
        lead.budgetRange = mergeValue(lead.budgetRange, request.params().get("budgetRange"));
        lead.timeline = mergeValue(lead.timeline, request.params().get("timeline"));
        lead.projectDetails = mergeValue(lead.projectDetails, request.params().get("projectDetails"));
        lead.source = firstNonBlank(request.params().get("source"), lead.source, "Сайт webcorn");
        lead.lastUpdatedAt = timestamp;

        saveLead(lead);

        sendJson(exchange, 200, Map.of(
                "success", true,
                "lead", lead.toMap()
        ));
    }

    private static void handleListLeads(HttpExchange exchange) throws IOException {
        requireAuth(exchange, ROLE_STAFF);
        List<Map<String, Object>> leads = loadAllLeads().stream()
                .sorted(Comparator.comparing(Main::leadSortInstant).reversed())
                .map(LeadRecord::toMap)
                .toList();

        sendJson(exchange, 200, Map.of(
                "success", true,
                "leads", leads
        ));
    }

    private static void handleUpdateLead(HttpExchange exchange) throws IOException {
        requireAuth(exchange, ROLE_STAFF);
        FormRequest request = readFormRequest(exchange);
        String id = requireValue(request.params(), "id");
        LeadRecord lead = loadLead(id)
                .orElseThrow(() -> new HttpError(404, "Лид не найден."));

        if (request.params().containsKey("status")) {
            lead.status = valueOrBlank(request.params().get("status"));
        }
        if (request.params().containsKey("notes")) {
            lead.notes = valueOrBlank(request.params().get("notes"));
        }
        lead.lastUpdatedAt = now();
        saveLead(lead);

        sendJson(exchange, 200, Map.of(
                "success", true,
                "lead", lead.toMap()
        ));
    }

    private static void handleAuthMe(HttpExchange exchange) throws IOException {
        Optional<AuthContext> auth = findAuth(exchange);

        if (auth.isEmpty()) {
            sendJson(exchange, 200, Map.of(
                    "success", true,
                    "authenticated", false
            ));
            return;
        }

        sendJson(exchange, 200, Map.of(
                "success", true,
                "authenticated", true,
                "user", auth.get().user.toPublicMap()
        ));
    }

    private static void handleRegister(HttpExchange exchange) throws IOException {
        FormRequest request = readFormRequest(exchange);
        String fullName = requireValue(request.params(), "fullName");
        String email = requireEmail(request.params(), "email");
        String password = requireStrongPassword(request.params(), "password");

        if (findUserByEmail(email).isPresent()) {
            throw new HttpError(409, "Аккаунт с таким email уже существует.");
        }

        UserRecord user = UserRecord.newUser(ROLE_CUSTOMER);
        user.fullName = fullName;
        user.businessName = valueOrBlank(request.params().get("businessName"));
        user.email = email;
        user.passwordSalt = generateSalt();
        user.passwordHash = hashPassword(password, user.passwordSalt);
        user.createdAt = now();
        user.lastLoginAt = user.createdAt;

        saveUser(user);
        attachLooseLeadsToUser(user);
        SessionRecord session = createSession(user);
        setSessionCookie(exchange, session.id, SESSION_MAX_AGE_SECONDS);

        sendJson(exchange, 200, Map.of(
                "success", true,
                "user", user.toPublicMap()
        ));
    }

    private static void handleLogin(HttpExchange exchange) throws IOException {
        FormRequest request = readFormRequest(exchange);
        String email = requireEmail(request.params(), "email");
        String password = requireValue(request.params(), "password");
        String role = firstNonBlank(request.params().get("role"), ROLE_CUSTOMER);

        UserRecord user = findUserByEmail(email)
                .orElseThrow(() -> new HttpError(401, "Неверный email или пароль."));

        if (!role.equals(user.role)) {
            throw new HttpError(403, ROLE_STAFF.equals(role)
                    ? "Этот аккаунт не имеет доступа к CRM."
                    : "Войдите через клиентский кабинет.");
        }

        if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
            throw new HttpError(401, "Неверный email или пароль.");
        }

        user.lastLoginAt = now();
        saveUser(user);
        attachLooseLeadsToUser(user);
        SessionRecord session = createSession(user);
        setSessionCookie(exchange, session.id, SESSION_MAX_AGE_SECONDS);

        sendJson(exchange, 200, Map.of(
                "success", true,
                "user", user.toPublicMap()
        ));
    }

    private static void handleLogout(HttpExchange exchange) throws IOException {
        Optional<String> sessionId = readSessionId(exchange);
        if (sessionId.isPresent()) {
            deleteSession(sessionId.get());
        }

        setSessionCookie(exchange, "", 0);
        sendJson(exchange, 200, Map.of("success", true));
    }

    private static void handleAccountLeads(HttpExchange exchange) throws IOException {
        AuthContext auth = requireAuth(exchange, ROLE_CUSTOMER);
        List<Map<String, Object>> leads = loadAllLeads().stream()
                .filter((lead) -> auth.user.id.equals(lead.userId) || auth.user.email.equalsIgnoreCase(lead.email))
                .sorted(Comparator.comparing(Main::leadSortInstant).reversed())
                .map(LeadRecord::toMap)
                .toList();

        sendJson(exchange, 200, Map.of(
                "success", true,
                "leads", leads
        ));
    }

    private static void handleCheckWebhook(HttpExchange exchange) throws IOException {
        try {
            FormRequest request = readFormRequest(exchange);

            if (!isCloudPaymentsSignatureValid(exchange.getRequestHeaders(), request.rawBody())) {
                sendWebhookCode(exchange, 13);
                return;
            }

            String invoiceId = readNotificationValue(request.params(), "InvoiceId", "invoiceId");
            if (invoiceId.isBlank()) {
                sendWebhookCode(exchange, 10);
                return;
            }

            OrderRecord order = loadOrder(invoiceId).orElse(null);
            if (order == null) {
                sendWebhookCode(exchange, 10);
                return;
            }

            if (ORDER_STATUS_PAID.equals(order.status)) {
                sendWebhookCode(exchange, 13);
                return;
            }

            sendWebhookCode(exchange, validateNotification(order, request.params()));
        } catch (Exception error) {
            error.printStackTrace();
            sendWebhookCode(exchange, 13);
        }
    }

    private static void handlePayWebhook(HttpExchange exchange) throws IOException {
        try {
            FormRequest request = readFormRequest(exchange);

            if (!isCloudPaymentsSignatureValid(exchange.getRequestHeaders(), request.rawBody())) {
                sendWebhookCode(exchange, 13);
                return;
            }

            String invoiceId = readNotificationValue(request.params(), "InvoiceId", "invoiceId");
            if (invoiceId.isBlank()) {
                sendWebhookCode(exchange, 10);
                return;
            }

            OrderRecord order = loadOrder(invoiceId).orElse(null);
            if (order == null) {
                sendWebhookCode(exchange, 10);
                return;
            }

            String transactionId = readNotificationValue(request.params(), "TransactionId", "transactionId");
            if (ORDER_STATUS_PAID.equals(order.status) && Objects.equals(order.transactionId, transactionId)) {
                sendWebhookCode(exchange, 0);
                return;
            }

            int validationCode = validateNotification(order, request.params());
            if (validationCode != 0) {
                sendWebhookCode(exchange, validationCode);
                return;
            }

            applySuccessfulPayment(order, request.params());
            sendWebhookCode(exchange, 0);
        } catch (Exception error) {
            error.printStackTrace();
            sendWebhookCode(exchange, 13);
        }
    }

    private static void serveStatic(HttpExchange exchange, String path, String method) throws IOException {
        if (!"GET".equals(method) && !"HEAD".equals(method)) {
            throw new HttpError(405, "Метод не поддерживается.");
        }

        String relativePath = "/".equals(path) ? "index.html" : path.substring(1);
        Path file = ROOT_DIR.resolve(relativePath).normalize();

        if (!file.startsWith(ROOT_DIR)
                || file.startsWith(DATA_DIR)
                || file.startsWith(ROOT_DIR.resolve("src"))
                || Files.isDirectory(file)
                || !Files.exists(file)) {
            throw new HttpError(404, "Файл не найден.");
        }

        byte[] body = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", detectContentType(file));
        exchange.sendResponseHeaders(200, "HEAD".equals(method) ? -1 : body.length);

        if (!"HEAD".equals(method)) {
            exchange.getResponseBody().write(body);
        }
    }

    private static int validateNotification(OrderRecord order, Map<String, String> params) {
        String invoiceId = readNotificationValue(params, "InvoiceId", "invoiceId");
        if (!order.invoiceId.equals(invoiceId)) {
            return 10;
        }

        BigDecimal amount = parseAmount(firstNonBlank(
                readNotificationValue(params, "Amount", "amount"),
                readNotificationValue(params, "PaymentAmount", "paymentAmount")
        ));
        if (amount == null || amount.compareTo(parseAmount(order.amount)) != 0) {
            return 12;
        }

        String currency = firstNonBlank(
                readNotificationValue(params, "Currency", "currency"),
                readNotificationValue(params, "PaymentCurrency", "paymentCurrency"),
                DEFAULT_CURRENCY
        );
        if (!DEFAULT_CURRENCY.equalsIgnoreCase(currency)) {
            return 12;
        }

        return 0;
    }

    private static void applySuccessfulPayment(OrderRecord order, Map<String, String> params) throws IOException {
        String timestamp = now();
        order.status = ORDER_STATUS_PAID;
        order.email = mergeValue(order.email, readNotificationValue(params, "Email", "email"));
        order.paymentMethod = firstNonBlank(
                readNotificationValue(params, "PaymentMethod", "paymentMethod"),
                "Банковская карта"
        );
        order.transactionId = readNotificationValue(params, "TransactionId", "transactionId");
        order.cardType = firstNonBlank(
                readNotificationValue(params, "CardType", "cardType"),
                readNotificationValue(params, "CardTypeCode", "cardTypeCode")
        );
        order.paidAt = firstNonBlank(
                readNotificationValue(params, "DateTime", "dateTime"),
                timestamp
        );
        order.lastUpdatedAt = timestamp;
        saveOrder(order);

        LeadRecord lead = loadLead(order.leadId).orElseGet(() -> LeadRecord.fromOrder(order));
        lead.email = mergeValue(lead.email, order.email);
        lead.niche = mergeValue(lead.niche, order.niche);
        lead.packageTier = mergeValue(lead.packageTier, order.packageTier);
        lead.selectedTemplate = mergeValue(lead.selectedTemplate, order.selectedTemplate);
        lead.source = firstNonBlank(lead.source, order.source, "Сайт webcorn");
        lead.invoiceId = order.invoiceId;
        lead.paymentStatus = ORDER_STATUS_PAID;
        lead.orderStatus = ORDER_STATUS_PAID;
        lead.paymentAmount = order.amount;
        lead.paymentCurrency = order.currency;
        lead.cloudpaymentsTransactionId = order.transactionId;
        lead.paidAt = order.paidAt;
        lead.lastUpdatedAt = timestamp;
        if (lead.submittedAt.isBlank()) {
            lead.submittedAt = timestamp;
        }
        if (lead.status.isBlank()) {
            lead.status = STATUS_NEW;
        }
        saveLead(lead);
    }

    private static Optional<AuthContext> findAuth(HttpExchange exchange) throws IOException {
        Optional<String> sessionId = readSessionId(exchange);
        if (sessionId.isEmpty()) {
            return Optional.empty();
        }

        SessionRecord session = loadSession(sessionId.get()).orElse(null);
        if (session == null) {
            return Optional.empty();
        }

        Instant expiresAt = parseInstant(session.expiresAt);
        if (!Instant.EPOCH.equals(expiresAt) && expiresAt.isBefore(Instant.now())) {
            deleteSession(session.id);
            return Optional.empty();
        }

        UserRecord user = loadUser(session.userId).orElse(null);
        if (user == null) {
            deleteSession(session.id);
            return Optional.empty();
        }

        session.lastAccessAt = now();
        saveSession(session);
        return Optional.of(new AuthContext(user, session));
    }

    private static AuthContext requireAuth(HttpExchange exchange, String role) throws IOException {
        AuthContext auth = findAuth(exchange)
                .orElseThrow(() -> new HttpError(401, ROLE_STAFF.equals(role)
                        ? "Требуется вход сотрудника."
                        : "Войдите в личный кабинет, чтобы отправлять заявки и видеть их статус."));

        if (!role.equals(auth.user.role)) {
            throw new HttpError(403, ROLE_STAFF.equals(role)
                    ? "Доступ к CRM есть только у сотрудников."
                    : "Этот раздел доступен только клиентскому кабинету.");
        }

        return auth;
    }

    private static boolean isAuthorized(HttpExchange exchange, String role) throws IOException {
        Optional<AuthContext> auth = findAuth(exchange);
        return auth.isPresent() && role.equals(auth.get().user.role);
    }

    private static Optional<String> readSessionId(HttpExchange exchange) {
        Map<String, String> cookies = parseCookies(exchange.getRequestHeaders());
        String sessionId = valueOrBlank(cookies.get(SESSION_COOKIE));
        return sessionId.isBlank() ? Optional.empty() : Optional.of(sessionId);
    }

    private static Map<String, String> parseCookies(Headers headers) {
        Map<String, String> cookies = new LinkedHashMap<>();
        String raw = valueOrBlank(headers.getFirst("Cookie"));
        if (raw.isBlank()) {
            return cookies;
        }

        for (String part : raw.split(";")) {
            String[] pieces = part.split("=", 2);
            if (pieces.length != 2) {
                continue;
            }
            cookies.put(pieces[0].trim(), urlDecode(pieces[1].trim()));
        }

        return cookies;
    }

    private static void setSessionCookie(HttpExchange exchange, String value, long maxAgeSeconds) {
        String encodedValue = urlEncode(value);
        String cookie = SESSION_COOKIE + "=" + encodedValue
                + "; Max-Age=" + Math.max(maxAgeSeconds, 0)
                + "; Path=/; HttpOnly; SameSite=Lax";
        exchange.getResponseHeaders().add("Set-Cookie", cookie);
    }

    private static void redirect(HttpExchange exchange, String location) throws IOException {
        exchange.getResponseHeaders().set("Location", location);
        exchange.sendResponseHeaders(302, -1);
    }

    private static String requireStrongPassword(Map<String, String> params, String key) {
        String password = requireValue(params, key);
        if (password.length() < 8) {
            throw new HttpError(400, "Пароль должен содержать минимум 8 символов.");
        }
        return password;
    }

    private static String generateSalt() {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    private static String hashPassword(String password, String salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), Base64.getDecoder().decode(salt), 120_000, 256);
            byte[] hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                    .generateSecret(spec)
                    .getEncoded();
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception error) {
            throw new RuntimeException("Не удалось захэшировать пароль.", error);
        }
    }

    private static boolean verifyPassword(String password, String salt, String expectedHash) {
        byte[] actual = hashPassword(password, salt).getBytes(StandardCharsets.UTF_8);
        byte[] expected = valueOrBlank(expectedHash).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(actual, expected);
    }

    private static SessionRecord createSession(UserRecord user) throws IOException {
        SessionRecord session = SessionRecord.newSession(user.id, user.role);
        saveSession(session);
        return session;
    }

    private static Optional<UserRecord> findUserByEmail(String email) throws IOException {
        if (email.isBlank() || !Files.exists(USERS_DIR)) {
            return Optional.empty();
        }

        try (Stream<Path> files = Files.list(USERS_DIR)) {
            return files.filter((file) -> file.getFileName().toString().endsWith(".properties"))
                    .map((file) -> {
                        try {
                            return UserRecord.fromProperties(readProperties(file));
                        } catch (IOException error) {
                            throw new RuntimeException(error);
                        }
                    })
                    .filter((user) -> email.equalsIgnoreCase(user.email))
                    .findFirst();
        } catch (RuntimeException error) {
            if (error.getCause() instanceof IOException ioError) {
                throw ioError;
            }
            throw error;
        }
    }

    private static Optional<UserRecord> loadUser(String userId) throws IOException {
        Path file = USERS_DIR.resolve(safeFileName(userId) + ".properties");
        if (!Files.exists(file)) {
            return Optional.empty();
        }
        return Optional.of(UserRecord.fromProperties(readProperties(file)));
    }

    private static Optional<SessionRecord> loadSession(String sessionId) throws IOException {
        Path file = SESSIONS_DIR.resolve(safeFileName(sessionId) + ".properties");
        if (!Files.exists(file)) {
            return Optional.empty();
        }
        return Optional.of(SessionRecord.fromProperties(readProperties(file)));
    }

    private static void saveUser(UserRecord user) throws IOException {
        Path file = USERS_DIR.resolve(safeFileName(user.id) + ".properties");
        writeProperties(file, user.toProperties(), "webcorn user");
    }

    private static void saveSession(SessionRecord session) throws IOException {
        Path file = SESSIONS_DIR.resolve(safeFileName(session.id) + ".properties");
        writeProperties(file, session.toProperties(), "webcorn session");
    }

    private static void deleteSession(String sessionId) throws IOException {
        Path file = SESSIONS_DIR.resolve(safeFileName(sessionId) + ".properties");
        Files.deleteIfExists(file);
    }

    private static void ensureStaffAccount() throws IOException {
        if (STAFF_BOOTSTRAP_EMAIL.isBlank() || STAFF_BOOTSTRAP_PASSWORD.isBlank()) {
            return;
        }

        UserRecord user = findUserByEmail(STAFF_BOOTSTRAP_EMAIL)
                .orElseGet(() -> UserRecord.newUser(ROLE_STAFF));
        user.role = ROLE_STAFF;
        user.fullName = firstNonBlank(STAFF_BOOTSTRAP_NAME, user.fullName, "Команда webcorn");
        user.email = STAFF_BOOTSTRAP_EMAIL;
        user.businessName = firstNonBlank(user.businessName, "webcorn");
        user.passwordSalt = generateSalt();
        user.passwordHash = hashPassword(STAFF_BOOTSTRAP_PASSWORD, user.passwordSalt);
        if (user.createdAt.isBlank()) {
            user.createdAt = now();
        }
        saveUser(user);
    }

    private static void attachLooseLeadsToUser(UserRecord user) throws IOException {
        List<LeadRecord> leads = loadAllLeads();
        for (LeadRecord lead : leads) {
            if (user.email.equalsIgnoreCase(lead.email) && lead.userId.isBlank()) {
                lead.userId = user.id;
                lead.fullName = mergeValue(lead.fullName, user.fullName);
                lead.businessName = mergeValue(lead.businessName, user.businessName);
                lead.lastUpdatedAt = now();
                saveLead(lead);
            }
        }
    }

    private static LeadRecord upsertPaymentLead(Map<String, String> params, Product product, String email) throws IOException {
        LeadRecord lead = findLeadByEmailAndSelection(email, product.niche, product.packageTier, product.template)
                .orElseGet(LeadRecord::newLead);
        String timestamp = now();

        if (lead.submittedAt.isBlank()) {
            lead.submittedAt = timestamp;
        }

        lead.status = firstNonBlank(lead.status, STATUS_NEW);
        lead.fullName = mergeValue(lead.fullName, params.get("fullName"));
        lead.businessName = mergeValue(lead.businessName, params.get("businessName"));
        lead.email = email;
        lead.phone = mergeValue(lead.phone, params.get("phone"));
        lead.niche = product.niche;
        lead.packageTier = product.packageTier;
        lead.selectedTemplate = product.template;
        lead.source = firstNonBlank(params.get("source"), lead.source, "Оплата с сайта webcorn");
        lead.lastUpdatedAt = timestamp;

        return lead;
    }

    private static OrderRecord createOrder(Map<String, String> params, Product product, LeadRecord lead) {
        String timestamp = now();
        OrderRecord order = new OrderRecord();
        order.invoiceId = nextInvoiceId();
        order.leadId = lead.id;
        order.productId = product.id;
        order.status = ORDER_STATUS_PENDING;
        order.email = requireEmail(params, "email");
        order.fullName = valueOrBlank(params.get("fullName"));
        order.businessName = valueOrBlank(params.get("businessName"));
        order.phone = valueOrBlank(params.get("phone"));
        order.niche = product.niche;
        order.packageTier = product.packageTier;
        order.selectedTemplate = product.template;
        order.description = product.description;
        order.amount = product.amount.toPlainString();
        order.currency = DEFAULT_CURRENCY;
        order.source = firstNonBlank(params.get("source"), "Сайт webcorn");
        order.pageUrl = valueOrBlank(params.get("pageUrl"));
        order.createdAt = timestamp;
        order.lastUpdatedAt = timestamp;
        order.paymentMethod = "Банковская карта";
        return order;
    }

    private static Optional<LeadRecord> findLeadByUserAndSelection(
            String userId,
            String email,
            String niche,
            String packageTier,
            String selectedTemplate
    ) throws IOException {
        if (email.isBlank() && userId.isBlank()) {
            return Optional.empty();
        }

        return loadAllLeads().stream()
                .filter((lead) -> userId.isBlank() || userId.equals(lead.userId) || email.equalsIgnoreCase(lead.email))
                .filter((lead) -> niche.isBlank() || niche.equalsIgnoreCase(lead.niche))
                .filter((lead) -> packageTier.isBlank() || packageTier.equalsIgnoreCase(lead.packageTier))
                .filter((lead) -> selectedTemplate.isBlank() || selectedTemplate.equalsIgnoreCase(lead.selectedTemplate))
                .max(Comparator.comparing(Main::leadSortInstant));
    }

    private static Optional<LeadRecord> findLeadByEmailAndSelection(
            String email,
            String niche,
            String packageTier,
            String selectedTemplate
    ) throws IOException {
        return findLeadByUserAndSelection("", email, niche, packageTier, selectedTemplate);
    }

    private static Optional<LeadRecord> loadLead(String leadId) throws IOException {
        Path file = LEADS_DIR.resolve(safeFileName(leadId) + ".properties");
        if (!Files.exists(file)) {
            return Optional.empty();
        }

        return Optional.of(LeadRecord.fromProperties(readProperties(file)));
    }

    private static Optional<OrderRecord> loadOrder(String invoiceId) throws IOException {
        Path file = ORDERS_DIR.resolve(safeFileName(invoiceId) + ".properties");
        if (!Files.exists(file)) {
            return Optional.empty();
        }

        return Optional.of(OrderRecord.fromProperties(readProperties(file)));
    }

    private static List<LeadRecord> loadAllLeads() throws IOException {
        if (!Files.exists(LEADS_DIR)) {
            return List.of();
        }

        List<LeadRecord> leads = new ArrayList<>();
        try (Stream<Path> files = Files.list(LEADS_DIR)) {
            files.filter((file) -> file.getFileName().toString().endsWith(".properties"))
                    .forEach((file) -> {
                        try {
                            leads.add(LeadRecord.fromProperties(readProperties(file)));
                        } catch (IOException error) {
                            throw new RuntimeException(error);
                        }
                    });
        } catch (RuntimeException error) {
            if (error.getCause() instanceof IOException ioError) {
                throw ioError;
            }
            throw error;
        }

        return leads;
    }

    private static void saveLead(LeadRecord lead) throws IOException {
        Path file = LEADS_DIR.resolve(safeFileName(lead.id) + ".properties");
        writeProperties(file, lead.toProperties(), "webcorn CRM lead");
    }

    private static void saveOrder(OrderRecord order) throws IOException {
        Path file = ORDERS_DIR.resolve(safeFileName(order.invoiceId) + ".properties");
        writeProperties(file, order.toProperties(), "webcorn CloudPayments order");
    }

    private static boolean isCloudPaymentsSignatureValid(Headers headers, String rawBody) {
        if (CLOUDPAYMENTS_API_SECRET.isBlank()) {
            return true;
        }

        String encodedHeader = headerValue(headers, "Content-HMAC");
        String decodedHeader = headerValue(headers, "X-Content-HMAC");
        String decodedBody = decodeWebhookBody(rawBody);

        boolean encodedMatches = !encodedHeader.isBlank()
                && encodedHeader.equals(calculateHmac(rawBody, CLOUDPAYMENTS_API_SECRET));
        boolean decodedMatches = !decodedHeader.isBlank()
                && decodedHeader.equals(calculateHmac(decodedBody, CLOUDPAYMENTS_API_SECRET));

        return encodedMatches || decodedMatches;
    }

    private static String decodeWebhookBody(String rawBody) {
        try {
            return URLDecoder.decode(rawBody, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException error) {
            return rawBody;
        }
    }

    private static String calculateHmac(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature);
        } catch (Exception error) {
            throw new RuntimeException("Не удалось вычислить HMAC.", error);
        }
    }

    private static void sendWebhookCode(HttpExchange exchange, int code) throws IOException {
        sendJson(exchange, 200, Map.of("code", code));
    }

    private static void sendJson(HttpExchange exchange, int statusCode, Object body) throws IOException {
        byte[] bytes = toJson(body).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        exchange.getResponseBody().write(bytes);
    }

    private static FormRequest readFormRequest(HttpExchange exchange) throws IOException {
        String rawBody = readRequestBody(exchange.getRequestBody());
        return new FormRequest(parseFormEncoded(rawBody), rawBody);
    }

    private static String readRequestBody(InputStream body) throws IOException {
        return new String(body.readAllBytes(), StandardCharsets.UTF_8);
    }

    private static Map<String, String> parseFormEncoded(String raw) {
        Map<String, String> values = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) {
            return values;
        }

        for (String part : raw.split("&")) {
            if (part.isBlank()) {
                continue;
            }

            int separator = part.indexOf('=');
            String key = separator >= 0 ? part.substring(0, separator) : part;
            String value = separator >= 0 ? part.substring(separator + 1) : "";
            values.put(urlDecode(key), urlDecode(value));
        }

        return values;
    }

    private static String urlDecode(String value) {
        return URLDecoder.decode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static Product requireProduct(String productId) {
        Product product = PRODUCT_CATALOG.get(productId);
        if (product == null) {
            throw new HttpError(400, "Неизвестный продукт для оплаты.");
        }
        return product;
    }

    private static String requireValue(Map<String, String> params, String key) {
        String value = valueOrBlank(params.get(key));
        if (value.isBlank()) {
            throw new HttpError(400, "Поле " + key + " обязательно.");
        }
        return value;
    }

    private static String requireEmail(Map<String, String> params, String key) {
        String email = requireValue(params, key);
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new HttpError(400, "Укажите корректный email.");
        }
        return email;
    }

    private static String valueOrBlank(String value) {
        return value == null ? "" : value.trim();
    }

    private static String mergeValue(String currentValue, String nextValue) {
        String normalized = valueOrBlank(nextValue);
        return normalized.isBlank() ? valueOrBlank(currentValue) : normalized;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private static String readNotificationValue(Map<String, String> params, String preferredKey, String fallbackKey) {
        return firstNonBlank(params.get(preferredKey), params.get(fallbackKey));
    }

    private static String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private static String detectContentType(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".html")) {
            return "text/html; charset=UTF-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=UTF-8";
        }
        if (name.endsWith(".js")) {
            return "application/javascript; charset=UTF-8";
        }
        if (name.endsWith(".json")) {
            return "application/json; charset=UTF-8";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".ico")) {
            return "image/x-icon";
        }
        return "text/plain; charset=UTF-8";
    }

    private static void ensureStorageDirectories() throws IOException {
        Files.createDirectories(LEADS_DIR);
        Files.createDirectories(ORDERS_DIR);
        Files.createDirectories(USERS_DIR);
        Files.createDirectories(SESSIONS_DIR);
    }

    private static Properties readProperties(Path file) throws IOException {
        Properties properties = new Properties();
        try (InputStream input = Files.newInputStream(file)) {
            properties.load(input);
        }
        return properties;
    }

    private static void writeProperties(Path file, Properties properties, String comment) throws IOException {
        try (var output = Files.newOutputStream(file)) {
            properties.store(output, comment);
        }
    }

    private static String safeFileName(String value) {
        return value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static BigDecimal parseAmount(String value) {
        try {
            String normalized = valueOrBlank(value).replace(',', '.');
            return normalized.isBlank() ? null : new BigDecimal(normalized);
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private static Instant leadSortInstant(LeadRecord lead) {
        return parseInstant(firstNonBlank(lead.lastUpdatedAt, lead.submittedAt));
    }

    private static Instant parseInstant(String value) {
        try {
            return Instant.parse(value);
        } catch (Exception error) {
            return Instant.EPOCH;
        }
    }

    private static int readPort() {
        try {
            return Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        } catch (NumberFormatException error) {
            return 8080;
        }
    }

    private static String now() {
        return Instant.now().toString();
    }

    private static String nextInvoiceId() {
        long now = System.currentTimeMillis();
        return "WF-CP-" + Long.toString(now, 36).toUpperCase(Locale.ROOT)
                + "-" + Integer.toHexString((int) (Math.random() * 0xFFFF)).toUpperCase(Locale.ROOT);
    }

    private static String nextLeadId() {
        long now = System.currentTimeMillis();
        return "WF-" + Long.toString(now, 36).toUpperCase(Locale.ROOT);
    }

    private static String nextUserId() {
        long now = System.currentTimeMillis();
        return "WF-USER-" + Long.toString(now, 36).toUpperCase(Locale.ROOT)
                + "-" + Integer.toHexString((int) (Math.random() * 0xFFFF)).toUpperCase(Locale.ROOT);
    }

    private static String nextSessionId() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String headerValue(Headers headers, String key) {
        return valueOrBlank(headers.getFirst(key));
    }

    private static Map<String, Product> createProductCatalog() {
        Map<String, Product> products = new LinkedHashMap<>();
        // TODO: При необходимости замените суммы ниже на ваш фактический прайс в тенге.
        products.put("hotel-lite", new Product(
                "hotel-lite", "Отели", "Легкий", "Atlas Stay",
                new BigDecimal("535000"),
                "webcorn / Отели / Легкий / Atlas Stay"
        ));
        products.put("hotel-medium", new Product(
                "hotel-medium", "Отели", "Средний", "Harbor House",
                new BigDecimal("925000"),
                "webcorn / Отели / Средний / Harbor House"
        ));
        products.put("hotel-premium", new Product(
                "hotel-premium", "Отели", "Премиум", "Maison Orbit",
                new BigDecimal("1790000"),
                "webcorn / Отели / Премиум / Maison Orbit"
        ));
        products.put("clinic-lite", new Product(
                "clinic-lite", "Клиники", "Легкий", "Northline Care",
                new BigDecimal("495000"),
                "webcorn / Клиники / Легкий / Northline Care"
        ));
        products.put("clinic-medium", new Product(
                "clinic-medium", "Клиники", "Средний", "Nordic Care",
                new BigDecimal("885000"),
                "webcorn / Клиники / Средний / Nordic Care"
        ));
        products.put("clinic-premium", new Product(
                "clinic-premium", "Клиники", "Премиум", "Verde Medical",
                new BigDecimal("1650000"),
                "webcorn / Клиники / Премиум / Verde Medical"
        ));
        products.put("restaurant-lite", new Product(
                "restaurant-lite", "Рестораны", "Легкий", "Foundry Table",
                new BigDecimal("460000"),
                "webcorn / Рестораны / Легкий / Foundry Table"
        ));
        products.put("restaurant-medium", new Product(
                "restaurant-medium", "Рестораны", "Средний", "Atelier Dining",
                new BigDecimal("830000"),
                "webcorn / Рестораны / Средний / Atelier Dining"
        ));
        products.put("restaurant-premium", new Product(
                "restaurant-premium", "Рестораны", "Премиум", "Noir Atelier",
                new BigDecimal("1600000"),
                "webcorn / Рестораны / Премиум / Noir Atelier"
        ));
        return products;
    }

    private static String toJson(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String string) {
            return "\"" + escapeJson(string) + "\"";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        if (value instanceof Map<?, ?> map) {
            StringBuilder builder = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) {
                    builder.append(',');
                }
                builder.append(toJson(String.valueOf(entry.getKey())))
                        .append(':')
                        .append(toJson(entry.getValue()));
                first = false;
            }
            return builder.append('}').toString();
        }
        if (value instanceof Collection<?> collection) {
            StringBuilder builder = new StringBuilder("[");
            boolean first = true;
            for (Object item : collection) {
                if (!first) {
                    builder.append(',');
                }
                builder.append(toJson(item));
                first = false;
            }
            return builder.append(']').toString();
        }
        return toJson(String.valueOf(value));
    }

    private static String escapeJson(String value) {
        StringBuilder builder = new StringBuilder(value.length() + 16);
        for (char character : value.toCharArray()) {
            switch (character) {
                case '\\' -> builder.append("\\\\");
                case '"' -> builder.append("\\\"");
                case '\b' -> builder.append("\\b");
                case '\f' -> builder.append("\\f");
                case '\n' -> builder.append("\\n");
                case '\r' -> builder.append("\\r");
                case '\t' -> builder.append("\\t");
                default -> {
                    if (character < 0x20) {
                        builder.append(String.format("\\u%04x", (int) character));
                    } else {
                        builder.append(character);
                    }
                }
            }
        }
        return builder.toString();
    }

    private record FormRequest(Map<String, String> params, String rawBody) {
    }

    private record Product(
            String id,
            String niche,
            String packageTier,
            String template,
            BigDecimal amount,
            String description
    ) {
    }

    private record AuthContext(UserRecord user, SessionRecord session) {
    }

    private static final class LeadRecord {
        private String id = nextLeadId();
        private String userId = "";
        private String status = STATUS_NEW;
        private String fullName = "";
        private String businessName = "";
        private String email = "";
        private String phone = "";
        private String country = "";
        private String niche = "";
        private String packageTier = "";
        private String selectedTemplate = "";
        private String currentWebsite = "";
        private String budgetRange = "";
        private String timeline = "";
        private String projectDetails = "";
        private String source = "Сайт webcorn";
        private String notes = "";
        private String submittedAt = "";
        private String lastUpdatedAt = "";
        private String invoiceId = "";
        private String paymentStatus = "";
        private String paymentAmount = "";
        private String paymentCurrency = "";
        private String paidAt = "";
        private String orderStatus = "";
        private String cloudpaymentsTransactionId = "";

        private static LeadRecord newLead() {
            LeadRecord lead = new LeadRecord();
            String timestamp = now();
            lead.submittedAt = timestamp;
            lead.lastUpdatedAt = timestamp;
            return lead;
        }

        private static LeadRecord fromOrder(OrderRecord order) {
            LeadRecord lead = newLead();
            lead.id = firstNonBlank(order.leadId, nextLeadId());
            lead.fullName = order.fullName;
            lead.businessName = order.businessName;
            lead.email = order.email;
            lead.phone = order.phone;
            lead.niche = order.niche;
            lead.packageTier = order.packageTier;
            lead.selectedTemplate = order.selectedTemplate;
            lead.source = firstNonBlank(order.source, "Сайт webcorn");
            lead.invoiceId = order.invoiceId;
            lead.paymentAmount = order.amount;
            lead.paymentCurrency = order.currency;
            lead.paymentStatus = order.status;
            lead.orderStatus = order.status;
            lead.paidAt = order.paidAt;
            lead.cloudpaymentsTransactionId = order.transactionId;
            return lead;
        }

        private static LeadRecord fromProperties(Properties properties) {
            LeadRecord lead = new LeadRecord();
            lead.id = properties.getProperty("id", nextLeadId());
            lead.userId = properties.getProperty("userId", "");
            lead.status = properties.getProperty("status", STATUS_NEW);
            lead.fullName = properties.getProperty("fullName", "");
            lead.businessName = properties.getProperty("businessName", "");
            lead.email = properties.getProperty("email", "");
            lead.phone = properties.getProperty("phone", "");
            lead.country = properties.getProperty("country", "");
            lead.niche = properties.getProperty("niche", "");
            lead.packageTier = properties.getProperty("packageTier", "");
            lead.selectedTemplate = properties.getProperty("selectedTemplate", "");
            lead.currentWebsite = properties.getProperty("currentWebsite", "");
            lead.budgetRange = properties.getProperty("budgetRange", "");
            lead.timeline = properties.getProperty("timeline", "");
            lead.projectDetails = properties.getProperty("projectDetails", "");
            lead.source = properties.getProperty("source", "Сайт webcorn");
            lead.notes = properties.getProperty("notes", "");
            lead.submittedAt = properties.getProperty("submittedAt", "");
            lead.lastUpdatedAt = properties.getProperty("lastUpdatedAt", lead.submittedAt);
            lead.invoiceId = properties.getProperty("invoiceId", "");
            lead.paymentStatus = properties.getProperty("paymentStatus", "");
            lead.paymentAmount = properties.getProperty("paymentAmount", "");
            lead.paymentCurrency = properties.getProperty("paymentCurrency", "");
            lead.paidAt = properties.getProperty("paidAt", "");
            lead.orderStatus = properties.getProperty("orderStatus", "");
            lead.cloudpaymentsTransactionId = properties.getProperty("cloudpaymentsTransactionId", "");
            return lead;
        }

        private Properties toProperties() {
            Properties properties = new Properties();
            properties.setProperty("id", id);
            properties.setProperty("userId", userId);
            properties.setProperty("status", status);
            properties.setProperty("fullName", fullName);
            properties.setProperty("businessName", businessName);
            properties.setProperty("email", email);
            properties.setProperty("phone", phone);
            properties.setProperty("country", country);
            properties.setProperty("niche", niche);
            properties.setProperty("packageTier", packageTier);
            properties.setProperty("selectedTemplate", selectedTemplate);
            properties.setProperty("currentWebsite", currentWebsite);
            properties.setProperty("budgetRange", budgetRange);
            properties.setProperty("timeline", timeline);
            properties.setProperty("projectDetails", projectDetails);
            properties.setProperty("source", source);
            properties.setProperty("notes", notes);
            properties.setProperty("submittedAt", submittedAt);
            properties.setProperty("lastUpdatedAt", lastUpdatedAt);
            properties.setProperty("invoiceId", invoiceId);
            properties.setProperty("paymentStatus", paymentStatus);
            properties.setProperty("paymentAmount", paymentAmount);
            properties.setProperty("paymentCurrency", paymentCurrency);
            properties.setProperty("paidAt", paidAt);
            properties.setProperty("orderStatus", orderStatus);
            properties.setProperty("cloudpaymentsTransactionId", cloudpaymentsTransactionId);
            return properties;
        }

        private Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", id);
            result.put("userId", userId);
            result.put("status", status);
            result.put("fullName", fullName);
            result.put("businessName", businessName);
            result.put("email", email);
            result.put("phone", phone);
            result.put("country", country);
            result.put("niche", niche);
            result.put("packageTier", packageTier);
            result.put("selectedTemplate", selectedTemplate);
            result.put("currentWebsite", currentWebsite);
            result.put("budgetRange", budgetRange);
            result.put("timeline", timeline);
            result.put("projectDetails", projectDetails);
            result.put("source", source);
            result.put("notes", notes);
            result.put("submittedAt", submittedAt);
            result.put("lastUpdatedAt", lastUpdatedAt);
            result.put("invoiceId", invoiceId);
            result.put("paymentStatus", paymentStatus);
            result.put("paymentAmount", paymentAmount);
            result.put("paymentCurrency", paymentCurrency);
            result.put("paidAt", paidAt);
            result.put("orderStatus", orderStatus);
            result.put("cloudpaymentsTransactionId", cloudpaymentsTransactionId);
            return result;
        }
    }

    private static final class UserRecord {
        private String id = nextUserId();
        private String role = ROLE_CUSTOMER;
        private String fullName = "";
        private String businessName = "";
        private String email = "";
        private String passwordHash = "";
        private String passwordSalt = "";
        private String createdAt = "";
        private String lastLoginAt = "";

        private static UserRecord newUser(String role) {
            UserRecord user = new UserRecord();
            user.role = role;
            user.createdAt = now();
            return user;
        }

        private static UserRecord fromProperties(Properties properties) {
            UserRecord user = new UserRecord();
            user.id = properties.getProperty("id", nextUserId());
            user.role = properties.getProperty("role", ROLE_CUSTOMER);
            user.fullName = properties.getProperty("fullName", "");
            user.businessName = properties.getProperty("businessName", "");
            user.email = properties.getProperty("email", "");
            user.passwordHash = properties.getProperty("passwordHash", "");
            user.passwordSalt = properties.getProperty("passwordSalt", "");
            user.createdAt = properties.getProperty("createdAt", "");
            user.lastLoginAt = properties.getProperty("lastLoginAt", "");
            return user;
        }

        private Properties toProperties() {
            Properties properties = new Properties();
            properties.setProperty("id", id);
            properties.setProperty("role", role);
            properties.setProperty("fullName", fullName);
            properties.setProperty("businessName", businessName);
            properties.setProperty("email", email);
            properties.setProperty("passwordHash", passwordHash);
            properties.setProperty("passwordSalt", passwordSalt);
            properties.setProperty("createdAt", createdAt);
            properties.setProperty("lastLoginAt", lastLoginAt);
            return properties;
        }

        private Map<String, Object> toPublicMap() {
            return Map.of(
                    "id", id,
                    "role", role,
                    "fullName", fullName,
                    "businessName", businessName,
                    "email", email,
                    "createdAt", createdAt,
                    "lastLoginAt", lastLoginAt
            );
        }
    }

    private static final class SessionRecord {
        private String id = nextSessionId();
        private String userId = "";
        private String role = ROLE_CUSTOMER;
        private String createdAt = "";
        private String lastAccessAt = "";
        private String expiresAt = "";

        private static SessionRecord newSession(String userId, String role) {
            SessionRecord session = new SessionRecord();
            String timestamp = now();
            session.userId = userId;
            session.role = role;
            session.createdAt = timestamp;
            session.lastAccessAt = timestamp;
            session.expiresAt = Instant.now().plusSeconds(SESSION_MAX_AGE_SECONDS).toString();
            return session;
        }

        private static SessionRecord fromProperties(Properties properties) {
            SessionRecord session = new SessionRecord();
            session.id = properties.getProperty("id", nextSessionId());
            session.userId = properties.getProperty("userId", "");
            session.role = properties.getProperty("role", ROLE_CUSTOMER);
            session.createdAt = properties.getProperty("createdAt", "");
            session.lastAccessAt = properties.getProperty("lastAccessAt", "");
            session.expiresAt = properties.getProperty("expiresAt", "");
            return session;
        }

        private Properties toProperties() {
            Properties properties = new Properties();
            properties.setProperty("id", id);
            properties.setProperty("userId", userId);
            properties.setProperty("role", role);
            properties.setProperty("createdAt", createdAt);
            properties.setProperty("lastAccessAt", lastAccessAt);
            properties.setProperty("expiresAt", expiresAt);
            return properties;
        }
    }

    private static final class OrderRecord {
        private String invoiceId = "";
        private String leadId = "";
        private String productId = "";
        private String status = ORDER_STATUS_PENDING;
        private String email = "";
        private String fullName = "";
        private String businessName = "";
        private String phone = "";
        private String niche = "";
        private String packageTier = "";
        private String selectedTemplate = "";
        private String description = "";
        private String amount = "";
        private String currency = DEFAULT_CURRENCY;
        private String source = "";
        private String pageUrl = "";
        private String createdAt = "";
        private String lastUpdatedAt = "";
        private String paidAt = "";
        private String failedAt = "";
        private String failureReason = "";
        private String transactionId = "";
        private String cardType = "";
        private String paymentMethod = "Банковская карта";

        private static OrderRecord fromProperties(Properties properties) {
            OrderRecord order = new OrderRecord();
            order.invoiceId = properties.getProperty("invoiceId", "");
            order.leadId = properties.getProperty("leadId", "");
            order.productId = properties.getProperty("productId", "");
            order.status = properties.getProperty("status", ORDER_STATUS_PENDING);
            order.email = properties.getProperty("email", "");
            order.fullName = properties.getProperty("fullName", "");
            order.businessName = properties.getProperty("businessName", "");
            order.phone = properties.getProperty("phone", "");
            order.niche = properties.getProperty("niche", "");
            order.packageTier = properties.getProperty("packageTier", "");
            order.selectedTemplate = properties.getProperty("selectedTemplate", "");
            order.description = properties.getProperty("description", "");
            order.amount = properties.getProperty("amount", "");
            order.currency = properties.getProperty("currency", DEFAULT_CURRENCY);
            order.source = properties.getProperty("source", "");
            order.pageUrl = properties.getProperty("pageUrl", "");
            order.createdAt = properties.getProperty("createdAt", "");
            order.lastUpdatedAt = properties.getProperty("lastUpdatedAt", order.createdAt);
            order.paidAt = properties.getProperty("paidAt", "");
            order.failedAt = properties.getProperty("failedAt", "");
            order.failureReason = properties.getProperty("failureReason", "");
            order.transactionId = properties.getProperty("transactionId", "");
            order.cardType = properties.getProperty("cardType", "");
            order.paymentMethod = properties.getProperty("paymentMethod", "Банковская карта");
            return order;
        }

        private Properties toProperties() {
            Properties properties = new Properties();
            properties.setProperty("invoiceId", invoiceId);
            properties.setProperty("leadId", leadId);
            properties.setProperty("productId", productId);
            properties.setProperty("status", status);
            properties.setProperty("email", email);
            properties.setProperty("fullName", fullName);
            properties.setProperty("businessName", businessName);
            properties.setProperty("phone", phone);
            properties.setProperty("niche", niche);
            properties.setProperty("packageTier", packageTier);
            properties.setProperty("selectedTemplate", selectedTemplate);
            properties.setProperty("description", description);
            properties.setProperty("amount", amount);
            properties.setProperty("currency", currency);
            properties.setProperty("source", source);
            properties.setProperty("pageUrl", pageUrl);
            properties.setProperty("createdAt", createdAt);
            properties.setProperty("lastUpdatedAt", lastUpdatedAt);
            properties.setProperty("paidAt", paidAt);
            properties.setProperty("failedAt", failedAt);
            properties.setProperty("failureReason", failureReason);
            properties.setProperty("transactionId", transactionId);
            properties.setProperty("cardType", cardType);
            properties.setProperty("paymentMethod", paymentMethod);
            return properties;
        }

        private Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("invoiceId", invoiceId);
            result.put("leadId", leadId);
            result.put("productId", productId);
            result.put("status", status);
            result.put("email", email);
            result.put("fullName", fullName);
            result.put("businessName", businessName);
            result.put("phone", phone);
            result.put("niche", niche);
            result.put("packageTier", packageTier);
            result.put("selectedTemplate", selectedTemplate);
            result.put("description", description);
            result.put("amount", amount);
            result.put("currency", currency);
            result.put("source", source);
            result.put("pageUrl", pageUrl);
            result.put("createdAt", createdAt);
            result.put("lastUpdatedAt", lastUpdatedAt);
            result.put("paidAt", paidAt);
            result.put("failedAt", failedAt);
            result.put("failureReason", failureReason);
            result.put("transactionId", transactionId);
            result.put("cardType", cardType);
            result.put("paymentMethod", paymentMethod);
            return result;
        }
    }

    private static final class HttpError extends RuntimeException {
        private final int statusCode;

        private HttpError(int statusCode, String message) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}

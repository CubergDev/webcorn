(function () {
  const STORAGE_KEY = "webfactory-site-language";
  const LANGUAGES = ["ru", "en"];
  const TEXT_ATTRIBUTES = ["placeholder", "title", "aria-label", "content"];
  const textSourceMap = new WeakMap();
  const attrSourceMap = new WeakMap();

  const entry = (en, tr, ru) => ({ en, tr, ru });

  const TEXTS = {
    "webcorn — сайты по нишам с реальными демо": entry(
      "webcorn — niche websites with real demos",
      "webcorn — gerçek demolara sahip niş web siteleri"
    ),
    "webcorn — сайты для отелей": entry(
      "webcorn — websites for hotels",
      "webcorn — oteller için web siteleri"
    ),
    "webcorn — сайты для клиник": entry(
      "webcorn — websites for clinics",
      "webcorn — klinikler için web siteleri"
    ),
    "webcorn — сайты для ресторанов": entry(
      "webcorn — websites for restaurants",
      "webcorn — restoranlar için web siteleri"
    ),
    "webcorn CRM": entry("webcorn CRM", "webcorn CRM"),
    "Atlas Stay — демо-сайт отеля": entry(
      "Atlas Stay — hotel demo site",
      "Atlas Stay — otel demo sitesi"
    ),
    "Harbor House — демо-сайт отеля": entry(
      "Harbor House — hotel demo site",
      "Harbor House — otel demo sitesi"
    ),
    "Maison Orbit — демо-сайт отеля": entry(
      "Maison Orbit — hotel demo site",
      "Maison Orbit — otel demo sitesi"
    ),
    "Northline Care — демо-сайт клиники": entry(
      "Northline Care — clinic demo site",
      "Northline Care — klinik demo sitesi"
    ),
    "Nordic Care — демо-сайт клиники": entry(
      "Nordic Care — clinic demo site",
      "Nordic Care — klinik demo sitesi"
    ),
    "Verde Medical — демо-сайт клиники": entry(
      "Verde Medical — clinic demo site",
      "Verde Medical — klinik demo sitesi"
    ),
    "Foundry Table — демо-сайт ресторана": entry(
      "Foundry Table — restaurant demo site",
      "Foundry Table — restoran demo sitesi"
    ),
    "Atelier Dining — демо-сайт ресторана": entry(
      "Atelier Dining — restaurant demo site",
      "Atelier Dining — restoran demo sitesi"
    ),
    "Noir Atelier — демо-сайт ресторана": entry(
      "Noir Atelier — restaurant demo site",
      "Noir Atelier — restoran demo sitesi"
    ),
    "webcorn показывает реальные демо-сайты для отелей, клиник и ресторанов. Выберите нишу, откройте уровень и закажите адаптацию под свой бизнес.": entry(
      "webcorn shows real demo websites for hotels, clinics, and restaurants. Choose a niche, open a tier, and order an adaptation for your business.",
      "webcorn; oteller, klinikler ve restoranlar için gerçek demo siteler gösterir. Bir niş seçin, seviyeyi açın ve işletmenize göre uyarlama siparişi verin."
    ),
    "Выберите демо-сайт отеля от webcorn: Lite, Pro или Signature. Откройте готовый пример и закажите адаптацию под свой объект.": entry(
      "Choose a hotel demo site from webcorn: Lite, Pro, or Signature. Open the ready-made example and order an adaptation for your property.",
      "webcorn'den bir otel demo sitesi seçin: Lite, Pro veya Signature. Hazır örneği açın ve tesisiniz için uyarlama siparişi verin."
    ),
    "Выберите демо-сайт клиники от webcorn: Lite, Pro или Signature. Откройте готовый пример и закажите адаптацию под свою клинику.": entry(
      "Choose a clinic demo site from webcorn: Lite, Pro, or Signature. Open the ready-made example and order an adaptation for your clinic.",
      "webcorn'den bir klinik demo sitesi seçin: Lite, Pro veya Signature. Hazır örneği açın ve kliniğiniz için uyarlama siparişi verin."
    ),
    "Выберите демо-сайт ресторана от webcorn: Lite, Pro или Signature. Откройте готовый пример и закажите адаптацию под свое заведение.": entry(
      "Choose a restaurant demo site from webcorn: Lite, Pro, or Signature. Open the ready-made example and order an adaptation for your venue.",
      "webcorn'den bir restoran demo sitesi seçin: Lite, Pro veya Signature. Hazır örneği açın ve mekanınız için uyarlama siparişi verin."
    ),
    "Готовые сайты под ниши": entry("Ready-made websites for niches", "Nişlere özel hazır siteler"),
    "Сайты для отелей": entry("Websites for hotels", "Oteller için web siteleri"),
    "Сайты для клиник": entry("Websites for clinics", "Klinikler için web siteleri"),
    "Сайты для ресторанов": entry("Websites for restaurants", "Restoranlar için web siteleri"),
    "Нишевые сайты с демо": entry("Niche websites with demos", "Demolu niş web siteleri"),
    "Лиды, оплаты CloudPayments и заметки по проектам": entry(
      "Leads, CloudPayments payments, and project notes",
      "Lead'ler, CloudPayments ödemeleri ve proje notları"
    ),
    "Лиды клиентов, статусы проектов и заметки команды": entry(
      "Client leads, project statuses, and team notes"
    ),
    "Старт": entry("Start", "Başlangıç"),
    "Ниши": entry("Niches", "Nişler"),
    "Главная навигация": entry("Main navigation", "Ana gezinme"),
    "Навигация": entry("Navigation", "Gezinme"),
    "Главная": entry("Home", "Ana sayfa"),
    "Отели": entry("Hotels", "Oteller"),
    "Клиники": entry("Clinics", "Klinikler"),
    "Рестораны": entry("Restaurants", "Restoranlar"),
    "Смотреть сайты": entry("Browse websites", "Siteleri incele"),
    "Смотреть уровни": entry("View tiers", "Seviyeleri görüntüle"),
    "Открыть меню": entry("Open menu", "Menüyü aç"),
    "Выберите нишу. Откройте демо. Закажите свой сайт.": entry(
      "Choose a niche. Open the demo. Order your site.",
      "Bir niş seçin. Demoyu açın. Sitenizi sipariş edin."
    ),
    "Не карточки-заглушки, а реальные мини-сайты для отелей, клиник и ресторанов. Сразу видно, что получит ваш бизнес в Lite, Pro и Signature.": entry(
      "Not placeholder cards, but real mini-sites for hotels, clinics, and restaurants. You immediately see what your business gets in Lite, Pro, and Signature.",
      "Bunlar boş kartlar değil; oteller, klinikler ve restoranlar için gerçek mini siteler. İşletmenizin Lite, Pro ve Signature'da ne alacağını hemen görürsünüz."
    ),
    "Обсудить проект": entry("Discuss the project", "Projeyi görüş"),
    "Живой просмотр: Maison Orbit": entry("Live preview: Maison Orbit", "Canlı önizleme: Maison Orbit"),
    "Встроенное демо сайта отеля Maison Orbit": entry(
      "Embedded demo of the Maison Orbit hotel website",
      "Maison Orbit otel web sitesinin gömülü demosu"
    ),
    "1 шаг": entry("Step 1", "1. adım"),
    "2 шаг": entry("Step 2", "2. adım"),
    "3 шаг": entry("Step 3", "3. adım"),
    "4 шаг": entry("Step 4", "4. adım"),
    "Выбираете нишу": entry("Choose a niche", "Bir niş seçin"),
    "Смотрите уровень": entry("Review the tier", "Seviyeyi inceleyin"),
    "Открываете демо": entry("Open the demo", "Demoyu açın"),
    "Заказываете адаптацию": entry("Order an adaptation", "Uyarlama siparişi verin"),
    "Три направления, где уже есть готовые сайты.": entry(
      "Three directions where ready-made sites already exist.",
      "Hazır sitelerin zaten bulunduğu üç yön."
    ),
    "Открывайте подборку, сравнивайте уровни и переходите в реальные демо-страницы.": entry(
      "Open a collection, compare tiers, and move into real demo pages.",
      "Bir koleksiyonu açın, seviyeleri karşılaştırın ve gerçek demo sayfalarına geçin."
    ),
    "Отель / Signature": entry("Hotel / Signature", "Otel / Signature", "Отель / Signature"),
    "Клиника / Signature": entry("Clinic / Signature", "Klinik / Signature", "Клиника / Signature"),
    "Ресторан / Signature": entry("Restaurant / Signature", "Restoran / Signature", "Ресторан / Signature"),
    "Встроенное демо сайта для отеля": entry(
      "Embedded demo of a hotel website",
      "Bir otel web sitesinin gömülü demosu"
    ),
    "Встроенное демо сайта для клиники": entry(
      "Embedded demo of a clinic website",
      "Bir klinik web sitesinin gömülü demosu"
    ),
    "Встроенное демо сайта для ресторана": entry(
      "Embedded demo of a restaurant website",
      "Bir restoran web sitesinin gömülü demosu"
    ),
    "Номера, галереи, доверие, прямые бронирования и сильное первое впечатление.": entry(
      "Rooms, galleries, trust, direct bookings, and a strong first impression.",
      "Odalar, galeriler, güven, doğrudan rezervasyonlar ve güçlü bir ilk izlenim."
    ),
    "Услуги, врачи, блоки доверия, запись и спокойная медицинская подача.": entry(
      "Services, doctors, trust blocks, appointment flow, and calm medical presentation.",
      "Hizmetler, doktorlar, güven blokları, randevu akışı ve sakin tıbbi sunum."
    ),
    "Меню, атмосфера, галерея, бронь и уверенный образ заведения.": entry(
      "Menu, atmosphere, gallery, booking, and a confident venue image.",
      "Menü, atmosfer, galeri, rezervasyon ve mekanın güçlü bir imajı."
    ),
    "Одна логика для всех ниш.": entry("One logic for all niches.", "Tüm nişler için tek mantık."),
    "Lite для быстрого старта, Pro для основного коммерческого сценария, Signature для дорогой подачи бренда.": entry(
      "Lite for a fast start, Pro for the main commercial flow, Signature for premium brand presentation.",
      "Lite hızlı başlangıç için, Pro ana ticari akış için, Signature ise premium marka sunumu için."
    ),
    "Минимум экранов, быстрый запуск, чистая структура.": entry(
      "Minimal screens, fast launch, clean structure.",
      "Minimum ekran, hızlı başlangıç, temiz yapı."
    ),
    "Больше разделов, сильнее доверие, заметнее путь к заявке.": entry(
      "More sections, stronger trust, a clearer path to inquiry.",
      "Daha fazla bölüm, daha güçlü güven, başvuruya daha net bir yol."
    ),
    "Премиальная подача, больше контента и самый сильный образ бренда.": entry(
      "Premium presentation, more content, and the strongest brand image.",
      "Premium sunum, daha fazla içerik ve en güçlü marka imajı."
    ),
    "Lite": entry("Lite", "Lite"),
    "Pro": entry("Pro", "Pro"),
    "Signature": entry("Signature", "Signature"),
    "© 2026 webcorn": entry("© 2026 webcorn", "© 2026 webcorn"),
    "Уровни": entry("Tiers", "Seviyeler"),
    "Заявка": entry("Inquiry", "Talep"),
    "Текущий выбор": entry("Current selection", "Mevcut seçim"),
    "Выбранный пакет": entry("Selected tier", "Seçilen paket"),
    "Без пакета": entry("No tier", "Paket yok"),
    "Выберите уровень выше": entry("Choose a tier above", "Yukarıdan bir seviye seçin"),
    "Выберите уровень": entry("Choose a tier", "Bir seviye seçin"),
    "Без ниши": entry("No niche", "Niş yok"),
    "Отправить заявку": entry("Send inquiry", "Talep gönder"),
    "Имя": entry("Name", "İsim"),
    "Почта": entry("Email", "E-posta"),
    "Телефон": entry("Phone", "Telefon"),
    "Страна": entry("Country", "Ülke"),
    "Текущий сайт": entry("Current website", "Mevcut site"),
    "Бюджет": entry("Budget", "Bütçe"),
    "Срок": entry("Timeline", "Zaman planı"),
    "Что важно для сайта": entry("What matters for the website", "Site için önemli olanlar"),
    "Не выбрано": entry("Not selected", "Seçilmedi"),
    "до $1500": entry("up to $1500", "€1500'ye kadar"),
    "$1500–$3000": entry("$1500–$3000", "€1500–€3000"),
    "$3000–$5000": entry("$3000–$5000", "€3000–€5000"),
    "$5000+": entry("$5000+", "€5000+"),
    "Как можно скорее": entry("As soon as possible", "Mümkün olan en kısa sürede"),
    "В течение 2 недель": entry("Within 2 weeks", "2 hafta içinde"),
    "В течение месяца": entry("Within a month", "Bir ay içinde"),
    "Гибкий срок": entry("Flexible timeline", "Esnek zamanlama"),
    "Если уже есть": entry("If you already have one", "Zaten varsa"),
    "Открыть сайт": entry("Open website", "Siteyi aç"),
    "Смотреть демо": entry("View demos", "Demoları görüntüle"),
    "Новая заявка": entry("New inquiry", "Yeni talep"),
    "Всего лидов": entry("Total leads", "Toplam lead"),
    "Новые": entry("New", "Yeni"),
    "В работе": entry("In progress", "İşlemde"),
    "Оплачено": entry("Paid", "Ödendi"),
    "Входящий поток": entry("Incoming pipeline", "Gelen akış"),
    "Лиды": entry("Leads", "Lead'ler"),
    "CRM подключается к серверным лидам и оплатам. При недоступности API будет использован локальный fallback.": entry(
      "CRM connects to server-side leads and payments. If the API is unavailable, a local fallback will be used.",
      "CRM, sunucu tarafındaki lead ve ödemelere bağlanır. API kullanılamazsa yerel bir yedek çözüm kullanılacaktır."
    ),
    "CRM подключается к серверным лидам и статусам заявок.": entry(
      "CRM connects to server-side leads and inquiry statuses."
    ),
    "Поиск": entry("Search", "Ara"),
    "Имя, компания, ниша": entry("Name, company, niche", "İsim, şirket, niş"),
    "Статус": entry("Status", "Durum"),
    "Все": entry("All", "Tümü"),
    "Контакт": entry("Contact", "İletişim"),
    "КП отправлено": entry("Proposal sent", "Teklif gönderildi"),
    "Успешно": entry("Successful", "Başarılı"),
    "Закрыт": entry("Closed", "Kapandı"),
    "Карточка лида": entry("Lead card", "Lead kartı"),
    "Выберите лид": entry("Select a lead", "Bir lead seçin"),
    "Лид не выбран": entry("No lead selected", "Lead seçilmedi"),
    "Откройте карточку слева, чтобы увидеть детали.": entry(
      "Open a card on the left to see details.",
      "Detayları görmek için soldaki kartı açın."
    ),
    "Телефон / WhatsApp": entry("Phone / WhatsApp", "Telefon / WhatsApp"),
    "Выбранное демо": entry("Selected demo", "Seçilen demo"),
    "Статус оплаты": entry("Payment status", "Ödeme durumu"),
    "Сумма оплаты": entry("Payment amount", "Ödeme tutarı"),
    "Описание задачи": entry("Project description", "İş tanımı"),
    "Источник и дата": entry("Source and date", "Kaynak ve tarih"),
    "Заметки": entry("Notes", "Notlar"),
    "Что обсудили, какой следующий шаг, когда вернуться к лиду.": entry(
      "What was discussed, the next step, and when to return to the lead.",
      "Nelerin konuşulduğu, sonraki adım ve lead'e ne zaman dönüleceği."
    ),
    "Сохранить заметки": entry("Save notes", "Notları kaydet"),
    "Новый": entry("New", "Yeni"),
    "Ожидает оплаты": entry("Awaiting payment", "Ödeme bekleniyor"),
    "Оплачен": entry("Paid", "Ödendi"),
    "Ошибка оплаты": entry("Payment failed", "Ödeme başarısız"),
    "Премиум": entry("Premium", "Premium"),
    "Средний": entry("Mid-tier", "Orta seviye"),
    "Легкий": entry("Lite", "Lite", "Легкий"),
    "Страница Отели": entry("Hotels page", "Oteller sayfası"),
    "Страница Клиники": entry("Clinics page", "Klinikler sayfası"),
    "Страница Рестораны": entry("Restaurants page", "Restoranlar sayfası"),
    "Сайт webcorn": entry("webcorn website", "webcorn sitesi"),
    "Оплата через CloudPayments": entry(
      "Payment via CloudPayments",
      "CloudPayments ile ödeme"
    ),
    "Оплатить и начать": entry("Pay and get started", "Öde ve başla"),
    "Подождите": entry("Please wait", "Lütfen bekleyin"),
    "Заказ сохранен": entry("Order saved", "Sipariş kaydedildi"),
    "Оплата прошла успешно": entry("Payment completed successfully", "Ödeme başarıyla tamamlandı"),
    "Нужна повторная попытка": entry("Another attempt is needed", "Yeni bir deneme gerekiyor"),
    "Оплата не прошла": entry("Payment failed", "Ödeme başarısız oldu"),
    "Попробовать снова": entry("Try again", "Tekrar dene"),
    "Отмена": entry("Cancel", "İptal"),
    "Закрыть": entry("Close", "Kapat"),
    "Закрыть окно оплаты": entry("Close payment window", "Ödeme penceresini kapat"),
    "Оставьте контактный email, и мы откроем защищенную форму оплаты картой Visa / Mastercard.": entry(
      "Leave your contact email, and we will open a secure Visa / Mastercard payment form.",
      "İletişim e-postanızı bırakın, biz de güvenli bir Visa / Mastercard ödeme formu açalım."
    ),
    "Ваше имя": entry("Your name", "Adınız"),
    "Название бизнеса": entry("Business name", "İşletme adı"),
    "Email для счета и связи": entry("Email for invoice and contact", "Fatura ve iletişim e-postası"),
    "Телефон / WhatsApp": entry("Phone / WhatsApp", "Telefon / WhatsApp"),
    "Как к вам обращаться": entry("How should we address you?", "Size nasıl hitap edelim?"),
    "Компания или проект": entry("Company or project", "Şirket veya proje"),
    "Сумма в тенге и номер счета будут переданы в CloudPayments автоматически после создания заказа.": entry(
      "The amount in KZT and invoice number will be sent to CloudPayments automatically after the order is created.",
      "Tenge cinsinden tutar ve fatura numarası, sipariş oluşturulduktan sonra CloudPayments'e otomatik olarak gönderilecektir."
    ),
    "Перейти к оплате": entry("Proceed to payment", "Ödemeye geç"),
    "Заказ оплачен, статус обновлен, данные переданы в CRM.": entry(
      "The order is paid, the status is updated, and the data has been sent to the CRM.",
      "Sipariş ödendi, durum güncellendi ve veriler CRM'e aktarıldı."
    ),
    "Встроенное демо Atlas Stay": entry("Embedded Atlas Stay demo", "Gömülü Atlas Stay demosu"),
    "Встроенное демо Harbor House": entry("Embedded Harbor House demo", "Gömülü Harbor House demosu"),
    "Встроенное демо Maison Orbit": entry("Embedded Maison Orbit demo", "Gömülü Maison Orbit demosu"),
    "Встроенное демо Northline Care": entry("Embedded Northline Care demo", "Gömülü Northline Care demosu"),
    "Встроенное демо Nordic Care": entry("Embedded Nordic Care demo", "Gömülü Nordic Care demosu"),
    "Встроенное демо Verde Medical": entry("Embedded Verde Medical demo", "Gömülü Verde Medical demosu"),
    "Встроенное демо Foundry Table": entry("Embedded Foundry Table demo", "Gömülü Foundry Table demosu"),
    "Встроенное демо Atelier Dining": entry("Embedded Atelier Dining demo", "Gömülü Atelier Dining demosu"),
    "Встроенное демо Noir Atelier": entry("Embedded Noir Atelier demo", "Gömülü Noir Atelier demosu"),
    "Открыть демо": entry("Open demo", "Demoyu aç"),
    "Заказать такой сайт": entry("Order this website", "Bu siteyi sipariş et"),
    "← К подборке отелей": entry("← Back to hotels", "← Otellere dön"),
    "← К подборке клиник": entry("← Back to clinics", "← Kliniklere dön"),
    "← К подборке ресторанов": entry("← Back to restaurants", "← Restoranlara dön"),
    "Демо отеля / Lite": entry("Hotel demo / Lite", "Otel demosu / Lite"),
    "Демо отеля / Pro": entry("Hotel demo / Pro", "Otel demosu / Pro"),
    "Демо отеля / Signature": entry("Hotel demo / Signature", "Otel demosu / Signature"),
    "Демо клиники / Lite": entry("Clinic demo / Lite", "Klinik demosu / Lite"),
    "Демо клиники / Pro": entry("Clinic demo / Pro", "Klinik demosu / Pro"),
    "Демо клиники / Signature": entry("Clinic demo / Signature", "Klinik demosu / Signature"),
    "Демо ресторана / Lite": entry("Restaurant demo / Lite", "Restoran demosu / Lite"),
    "Демо ресторана / Pro": entry("Restaurant demo / Pro", "Restoran demosu / Pro"),
    "Демо ресторана / Signature": entry("Restaurant demo / Signature", "Restoran demosu / Signature"),
    "Номера": entry("Rooms", "Odalar"),
    "Галерея": entry("Gallery", "Galeri"),
    "Отзывы": entry("Reviews", "Yorumlar"),
    "Бронь": entry("Booking", "Rezervasyon"),
    "Услуги": entry("Services", "Hizmetler"),
    "Врач": entry("Doctor", "Doktor"),
    "Доверие": entry("Trust", "Güven"),
    "Запись": entry("Appointment", "Randevu"),
    "Меню": entry("Menu", "Menü"),
    "События": entry("Events", "Etkinlikler"),
    "Шеф": entry("Chef", "Şef"),
    "Частные ужины": entry("Private dinners", "Özel akşam yemekleri"),
    "Сервис": entry("Service", "Hizmet"),
    "Преимущества": entry("Benefits", "Avantajlar"),
    "Нужен такой же Lite-сайт для клиники?": entry(
      "Need the same Lite site for your clinic?",
      "Kliniğiniz için aynı Lite siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же сайт для вашего отеля?": entry(
      "Need a similar website for your hotel?",
      "Oteliniz için benzer bir siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же Pro-сайт для отеля?": entry(
      "Need the same Pro site for your hotel?",
      "Oteliniz için aynı Pro siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же Signature-сайт для отеля?": entry(
      "Need the same Signature site for your hotel?",
      "Oteliniz için aynı Signature siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же Pro-сайт для ресторана?": entry(
      "Need the same Pro site for your restaurant?",
      "Restoranınız için aynı Pro siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же Signature-сайт для ресторана?": entry(
      "Need the same Signature site for your restaurant?",
      "Restoranınız için aynı Signature siteye mi ihtiyacınız var?"
    ),
    "Нужен такой же Lite-сайт для заведения?": entry(
      "Need the same Lite site for your venue?",
      "Mekanınız için aynı Lite siteye mi ihtiyacınız var?"
    ),
    "Что входит в Lite": entry("What is included in Lite", "Lite'ta neler var"),
    "Что усиливает Pro": entry("What Pro strengthens", "Pro'nun güçlendirdiği şeyler"),
    "Что делает Signature": entry("What Signature does", "Signature'ın sağladıkları"),
    "Форма для отеля": entry("Form for a hotel", "Otel için form"),
    "Форма для клиники": entry("Form for a clinic", "Klinik için form"),
    "Форма для ресторана": entry("Form for a restaurant", "Restoran için form"),
    "Atlas Stay": entry("Atlas Stay"),
    "Harbor House": entry("Harbor House"),
    "Maison Orbit": entry("Maison Orbit"),
    "Northline Care": entry("Northline Care"),
    "Nordic Care": entry("Nordic Care"),
    "Verde Medical": entry("Verde Medical"),
    "Foundry Table": entry("Foundry Table"),
    "Atelier Dining": entry("Atelier Dining"),
    "Noir Atelier": entry("Noir Atelier"),
    "Чистый одностраничный формат: номера, базовая галерея, отзывы и быстрая заявка на проживание.": entry(
      "A clean one-page format: rooms, a basic gallery, reviews, and a quick stay request."
    ),
    "2 категории номеров": entry("2 room categories"),
    "Wi-Fi включен": entry("Wi-Fi included"),
    "5 минут до центра": entry("5 minutes to the center"),
    "Стандартный номер": entry("Standard room"),
    "Аккуратный номер для городской поездки с рабочей зоной и душем.": entry(
      "A neat room for a city trip with a work area and shower."
    ),
    "Почему гости выбирают Atlas Stay": entry("Why guests choose Atlas Stay"),
    "Локация, тишина, быстрое заселение и простой путь к бронированию.": entry(
      "Location, quiet, quick check-in, and a simple path to booking."
    ),
    "Два понятных формата размещения без лишнего выбора и визуального шума.": entry(
      "Two clear accommodation formats without unnecessary choice or visual noise."
    ),
    "Стандарт": entry("Standard"),
    "Кровать queen size, рабочий стол, душ и быстрый интернет для короткого проживания.": entry(
      "Queen-size bed, work desk, shower, and fast internet for a short stay."
    ),
    "Семейный": entry("Family"),
    "Больше площади, диван и спокойная подача для семьи или длительного визита.": entry(
      "More space, a sofa, and a calm presentation for a family or extended stay."
    ),
    "Несколько кадров, чтобы гость понял атмосферу и уровень объекта.": entry(
      "A few frames so the guest can understand the atmosphere and level of the property."
    ),
    "Анна, гость на 2 ночи": entry("Anna, guest for 2 nights"),
    "Простая форма для прямого контакта без сложной логики и длинного сценария.": entry(
      "A simple form for direct contact without complex logic or a long flow."
    ),
    "webcorn адаптирует это Lite-демо под ваш бренд, тип номеров, фотографии и прямые запросы на проживание.": entry(
      "webcorn adapts this Lite demo to your brand, room types, photography, and direct stay inquiries."
    ),
    "Первый экран, номера, галерея, отзыв и базовая форма брони.": entry(
      "Hero section, rooms, gallery, review, and a basic booking form."
    ),
    "Больше структуры, больше доверия и сильнее путь от первого экрана до запроса на проживание.": entry(
      "More structure, more trust, and a stronger path from the first screen to a stay inquiry."
    ),
    "3 категории номеров": entry("3 room categories"),
    "Поздний заезд": entry("Late check-in"),
    "Отзывы 4.9/5": entry("Reviews 4.9/5"),
    "Harbor Suite": entry("Harbor Suite"),
    "Вид на воду, мягкий свет и lounge-зона для спокойного отдыха.": entry(
      "Water view, soft light, and a lounge area for a calm stay."
    ),
    "Что усиливает этот уровень": entry("What this tier adds"),
    "Отзывы, сильнее room cards, больше блоков доверия и заметнее форма бронирования.": entry(
      "Reviews, stronger room cards, more trust blocks, and a more visible booking form."
    ),
    "Категории номеров": entry("Room categories"),
    "Номера подаются как разные сценарии проживания, а не просто как список комнат.": entry(
      "Rooms are presented as different stay scenarios, not just a list of rooms."
    ),
    "Городской стандарт": entry("City Standard"),
    "Для коротких поездок, командировок и удобной остановки в центре.": entry(
      "For short trips, business travel, and a convenient stay in the center."
    ),
    "Вид на воду, просторная ванная и отдельная зона отдыха.": entry(
      "Water view, a spacious bathroom, and a separate lounge area."
    ),
    "Family Loft": entry("Family Loft"),
    "Большая площадь и понятная подача для семьи или длинного проживания.": entry(
      "More space and a clear presentation for a family or a longer stay."
    ),
    "Почему гости выбирают Harbor House": entry("Why guests choose Harbor House"),
    "Здесь уже есть полноценная коммерческая структура, которая помогает довести интерес до брони.": entry(
      "There is already a full commercial structure here that helps turn interest into a booking."
    ),
    "Локация у набережной": entry("Waterfront location"),
    "Завтрак и трансфер по запросу": entry("Breakfast and transfer on request"),
    "Ненавязчивый, но заметный CTA на каждом ключевом экране": entry(
      "A subtle but visible CTA on every key screen."
    ),
    "Что получает отель": entry("What the hotel gets"),
    "Более зрелый визуальный образ": entry("A more mature visual image"),
    "Больше доверия к номерам и сервису": entry("More trust in rooms and service"),
    "Понятнее путь к прямому запросу": entry("A clearer path to a direct inquiry"),
    "Галерея отеля": entry("Hotel gallery"),
    "Несколько экранов, чтобы показать номера, общие зоны и вид на воду.": entry(
      "Several screens to show rooms, public areas, and the water view."
    ),
    "Марина, гость из Праги": entry("Marina, guest from Prague"),
    "FAQ перед бронью": entry("FAQ before booking"),
    "Есть ли парковка — да, рядом с отелем": entry("Is there parking? Yes, next to the hotel."),
    "Можно ли с детьми — да, есть семейные комнаты": entry(
      "Can you stay with children? Yes, there are family rooms."
    ),
    "Поздний заезд — по запросу до 02:00": entry("Late check-in is available on request until 02:00."),
    "Более заметная и взрослая форма, которая помогает собирать прямые запросы.": entry(
      "A more visible and mature form that helps collect direct inquiries."
    ),
    "webcorn адаптирует это демо под ваш номерной фонд, сервис, фотографии и точки прямого бронирования.": entry(
      "webcorn adapts this demo to your room stock, service, photography, and direct booking touchpoints."
    ),
    "Больше экранов, больше доверия и лучше путь к прямому запросу.": entry(
      "More screens, more trust, and a better path to a direct inquiry."
    ),
    "Нужен поздний заезд, трансфер или завтрак?": entry(
      "Need late check-in, a transfer, or breakfast?"
    ),
    "Премиальный демо-сайт с дорогими номерами, сервисными блоками, галереей и сильным маршрутом к бронированию.": entry(
      "A premium demo site with high-end rooms, service blocks, a gallery, and a strong path to booking."
    ),
    "Номера высокого класса": entry("High-end rooms"),
    "Трансфер": entry("Transfer"),
    "Премиальный сервис": entry("Premium service"),
    "Панорамный сьют": entry("Panoramic suite"),
    "Широкий вид, отдельная лаунж-зона, ванна у окна и персональный сервис.": entry(
      "Wide views, a separate lounge area, a bath by the window, and personal service."
    ),
    "Signature-уровень": entry("Signature tier"),
    "Не просто показывает номера, а продает стиль отдыха, сервис и уровень объекта.": entry(
      "It does not just show rooms, it sells the style of stay, service, and class of the property."
    ),
    "Каждая категория выглядит как отдельный сценарий проживания и оправдывает более высокий чек.": entry(
      "Each category feels like a separate stay scenario and supports a higher price point."
    ),
    "Широкий вид на город, приватный lounge и вечерний сервис в номере.": entry(
      "Wide city views, a private lounge, and evening in-room service."
    ),
    "Садовый люкс": entry("Garden suite"),
    "Терраса, мягкий свет и сценарий медленного отдыха без городского шума.": entry(
      "Terrace, soft light, and a slower rest scenario away from city noise."
    ),
    "Резиденция лофт": entry("Residence loft"),
    "Для длинного проживания, приватных встреч и семейного формата премиум-класса.": entry(
      "For long stays, private meetings, and premium family stays."
    ),
    "Сервис и впечатление": entry("Service and experience"),
    "Signature-сайт усиливает не только номера, но и весь образ проживания внутри отеля.": entry(
      "A Signature site strengthens not only the rooms but the entire image of the stay."
    ),
    "Сервис и образ проживания": entry("Service and stay image"),
    "Индивидуальный заезд и трансфер": entry("Personalized arrival and transfer"),
    "Городские маршруты и закрытые ужины по запросу": entry(
      "City itineraries and private dinners on request."
    ),
    "Дополнительные услуги продаются как часть опыта": entry(
      "Additional services are sold as part of the experience."
    ),
    "Что это дает отелю": entry("What this gives the hotel"),
    "Сильнее позиционирование отеля": entry("Stronger hotel positioning"),
    "Легче продавать дорогие номера и доп. сервис": entry(
      "Easier to sell premium rooms and add-on services."
    ),
    "Сайт выглядит как часть статуса объекта": entry(
      "The site feels like part of the property's status."
    ),
    "Здесь сайт уже работает как витрина атмосферы, а не просто как каталог номеров.": entry(
      "Here the site already works as a showcase of atmosphere, not just a room catalog."
    ),
    "Лаура, гостья из Берлина": entry("Laura, guest from Berlin"),
    "Что усиливает решение": entry("What strengthens the solution"),
    "Отзывы встроены ближе к решению о бронировании": entry(
      "Reviews are placed closer to the booking decision."
    ),
    "FAQ закрывает вопросы до контакта": entry("FAQ answers questions before contact."),
    "Сервис делает путь к брони заметно дороже по ощущению": entry(
      "The service layer makes the path to booking feel significantly more premium."
    ),
    "Форма выглядит как часть премиального сервиса, а не как утилитарный блок внизу страницы.": entry(
      "The form feels like part of the premium service, not a utilitarian block at the bottom of the page."
    ),
    "webcorn адаптирует этот демо-сайт под ваш объект, сервис, галерею и сценарий прямого бронирования.": entry(
      "webcorn adapts this demo site to your property, service, gallery, and direct booking scenario."
    ),
    "Превращает сайт в часть образа отеля и помогает продавать более высокий уровень проживания.": entry(
      "Turns the site into part of the hotel's image and helps sell a higher level of stay."
    ),
    "Нужен трансфер, ранний заезд или особый формат проживания.": entry(
      "Need a transfer, early check-in, or a special stay format?"
    ),
    "Минимальный набор экранов: услуги, врач, короткий блок доверия и форма записи на прием.": entry(
      "A minimal set of screens: services, doctor, a short trust block, and an appointment form."
    ),
    "Первичный прием": entry("Initial appointment"),
    "Онлайн-запись": entry("Online booking"),
    "Прием по будням": entry("Weekday appointments"),
    "Первичная консультация": entry("Initial consultation"),
    "Первичный прием с коротким и понятным маршрутом записи.": entry(
      "An initial appointment with a short and clear booking path."
    ),
    "Клиника выглядит аккуратно и профессионально, без перегруженной медицинской архитектуры.": entry(
      "The clinic looks neat and professional without overloaded medical architecture."
    ),
    "Три базовых направления, которые пациент быстро считывает и понимает.": entry(
      "Three basic service lines that a patient understands quickly."
    ),
    "Консультация, сбор анамнеза и понятный план следующего шага.": entry(
      "Consultation, history intake, and a clear next-step plan."
    ),
    "Диагностика": entry("Diagnostics"),
    "Базовые обследования и расшифровка результатов без лишних экранов.": entry(
      "Basic examinations and result interpretation without extra screens."
    ),
    "Контроль лечения": entry("Treatment follow-up"),
    "Повторные визиты и корректировка схемы по назначению врача.": entry(
      "Repeat visits and treatment adjustments as prescribed by the doctor."
    ),
    "Одна понятная карточка врача: опыт, специализация и спокойная фотография без перегруза.": entry(
      "One clear doctor card: experience, specialty, and a calm portrait without overload."
    ),
    "Пациент понимает": entry("The patient understands"),
    "Кто принимает": entry("Who will see them"),
    "С чем можно обратиться": entry("What issues they can come with"),
    "Как быстро записаться": entry("How quickly to book"),
    "Пациент клиники": entry("Clinic patient"),
    "Базовая форма для частной клиники, кабинета или небольшого медицинского центра.": entry(
      "A basic form for a private clinic, practice, or small medical center."
    ),
    "webcorn адаптирует это демо под ваши услуги, врача, контакты и реальный поток записи.": entry(
      "webcorn adapts this demo to your services, doctor, contacts, and real booking flow."
    ),
    "Первый экран, услуги, карточка врача, доверие и базовая запись.": entry(
      "Hero section, services, doctor profile, trust, and a basic appointment form."
    ),
    "Более сильная структура: услуги, врачи, блоки доверия, отзывы и уверенный путь к записи.": entry(
      "A stronger structure: services, doctors, trust blocks, reviews, and a confident path to booking."
    ),
    "3 направления": entry("3 specialties"),
    "4 врача": entry("4 doctors"),
    "Запись в 1 экран": entry("Booking in 1 screen"),
    "Кардиологическое направление": entry("Cardiology focus"),
    "Услуги упакованы как понятное направление, а не как сухой список процедур.": entry(
      "Services are packaged as a clear specialty, not a dry list of procedures."
    ),
    "Больше доверия, больше экранов и заметно взрослее подача для частной клиники.": entry(
      "More trust, more screens, and a noticeably more mature presentation for a private clinic."
    ),
    "Направления": entry("Specialties"),
    "Услуги поданы как понятные маршруты пациента с ясным CTA.": entry(
      "Services are presented as clear patient journeys with a clear CTA."
    ),
    "Кардиология": entry("Cardiology"),
    "Профилактика, диагностика и наблюдение с понятным входом в запись.": entry(
      "Prevention, diagnostics, and follow-up with a clear path into booking."
    ),
    "Оборудование, подготовка и расшифровка результатов без перегруза.": entry(
      "Equipment, preparation, and result interpretation without overload."
    ),
    "Терапия": entry("Therapy"),
    "Базовые обращения и системный подход к пациенту в частной клинике.": entry(
      "Core visits and a systematic patient approach for a private clinic."
    ),
    "Команда врачей": entry("Medical team"),
    "Врачи — часть системы доверия, а не просто декоративные карточки.": entry(
      "Doctors are part of the trust system, not just decorative cards."
    ),
    "Анна Соколова": entry("Anna Sokolova"),
    "Кардиолог, 12 лет практики, сопровождение пациентов с хроническими случаями.": entry(
      "Cardiologist, 12 years of practice, focused on patients with chronic cases."
    ),
    "Дмитрий Норден": entry("Dmitry Norden"),
    "Терапевт, профилактические осмотры и построение маршрута обследования.": entry(
      "General physician focused on preventive checkups and examination planning."
    ),
    "Почему пациенты доверяют": entry("Why patients trust"),
    "Четкая подача услуг и врачей": entry("Clear presentation of services and doctors"),
    "Блоки доверия и отзывов встроены в нужных местах": entry(
      "Trust and review blocks are placed in the right places."
    ),
    "Запись заметна, но не мешает чтению": entry("Booking is visible without interrupting reading."),
    "Пациент Nordic Care": entry("Nordic Care patient"),
    "Форма уже встроена в коммерческий маршрут клиники и закрывает базовый сценарий обращения.": entry(
      "The form is already integrated into the clinic's commercial flow and covers the core inquiry scenario."
    ),
    "webcorn адаптирует это демо под ваши направления, врачей, отзывы и реальный сценарий записи.": entry(
      "webcorn adapts this demo to your specialties, doctors, reviews, and real booking scenario."
    ),
    "Больше доверия, понятнее структура и лучше путь к записи для клиники.": entry(
      "More trust, a clearer structure, and a better path to booking for the clinic."
    ),
    "Коротко опишите причину обращения": entry("Briefly describe the reason for your visit"),
    "Программы": entry("Programs"),
    "Специалисты": entry("Specialists"),
    "Технологии": entry("Technology"),
    "Флагманский демо-сайт: программы здоровья, специалисты, технологии и сильная подача доверия.": entry(
      "A flagship demo site: health programs, specialists, technology, and a strong trust presentation."
    ),
    "Программы здоровья": entry("Health programs"),
    "Доверие премиум-уровня": entry("Premium-level trust"),
    "Путь пациента": entry("Patient journey"),
    "Персональная программа здоровья": entry("Personal health program"),
    "Не список услуг, а понятная программа наблюдения и сопровождения пациента.": entry(
      "Not a list of services, but a clear program for patient monitoring and support."
    ),
    "Signature-эффект": entry("Signature effect"),
    "Сайт усиливает бренд клиники и создает ощущение порядка, технологичности и высокого класса.": entry(
      "The site strengthens the clinic brand and creates a sense of order, technology, and high class."
    ),
    "Премиальный уровень показывает не только услуги, но и готовые сценарии ведения пациента.": entry(
      "The premium tier shows not only services but ready-made patient care scenarios."
    ),
    "Комплексное обследование": entry("Comprehensive check-up"),
    "Комплексная программа обследования с быстрым маршрутом и персональным сопровождением.": entry(
      "A comprehensive check-up program with a fast route and personal support."
    ),
    "Кардио баланс": entry("Cardio Balance"),
    "Наблюдение, профилактика и контроль рисков для пациентов с сердечно-сосудистым профилем.": entry(
      "Monitoring, prevention, and risk control for patients with cardiovascular profiles."
    ),
    "Долгий ресурс": entry("Long-term Vitality"),
    "Долгосрочный формат сопровождения с персональной программой и регулярным контролем.": entry(
      "A long-term support format with a personal program and regular check-ins."
    ),
    "Экспертиза команды подана как часть премиального позиционирования клиники.": entry(
      "Team expertise is presented as part of the clinic's premium positioning."
    ),
    "Мария Верде": entry("Maria Verde"),
    "Кардиолог и куратор программ наблюдения с акцентом на комплексный подход.": entry(
      "Cardiologist and curator of care programs focused on a comprehensive approach."
    ),
    "Илья Левин": entry("Ilya Levin"),
    "Диагност и специалист по превентивной медицине для пациентов с плотным графиком.": entry(
      "Diagnostics specialist and preventive medicine expert for patients with demanding schedules."
    ),
    "Технологии и доверие": entry("Technology and trust"),
    "Современная диагностика подана без медицинского хаоса": entry(
      "Modern diagnostics are presented without medical chaos."
    ),
    "Маршрут пациента объясняет путь от заявки до сопровождения": entry(
      "The patient journey explains the path from inquiry to ongoing care."
    ),
    "Бренд клиники воспринимается дороже и увереннее": entry(
      "The clinic brand feels more premium and more confident."
    ),
    "Комментарий о Signature-уровне": entry("Comment on the Signature tier"),
    "Форма выглядит как часть бренда и помогает перевести доверие в реальное обращение.": entry(
      "The form feels like part of the brand and helps turn trust into a real inquiry."
    ),
    "webcorn адаптирует этот демо-сайт под ваш бренд, направления, команду и маршрут пациента.": entry(
      "webcorn adapts this demo site to your brand, specialties, team, and patient journey."
    ),
    "Усиливает медицинский бренд и помогает клинике выглядеть заметно выше по классу.": entry(
      "Strengthens the medical brand and helps the clinic look noticeably higher-class."
    ),
    "Напишите, какой формат сопровождения вас интересует": entry(
      "Tell us which care format interests you."
    ),
    "О нас": entry("About"),
    "Базовый ресторанный сайт: меню, блок о заведении, галерея и быстрая бронь стола без лишних переходов.": entry(
      "A basic restaurant site: menu, venue section, gallery, and quick table booking without extra steps."
    ),
    "Европейская кухня": entry("European cuisine"),
    "12:00–23:00": entry("12:00–23:00"),
    "Бронь за 1 минуту": entry("Book in 1 minute"),
    "Блюдо вечера": entry("Dish of the evening"),
    "Подача блюда и атмосферы уже на первом экране.": entry(
      "The dish and the atmosphere are presented right on the first screen."
    ),
    "Сайт быстро объясняет формат заведения и приводит гостя к брони без лишнего контента.": entry(
      "The site quickly explains the venue format and moves the guest to booking without extra content."
    ),
    "Хиты меню": entry("Menu highlights"),
    "Короткая и вкусная подача нескольких ключевых позиций.": entry(
      "A short and appetizing presentation of a few key dishes."
    ),
    "Паста с трюфелем": entry("Truffle pasta"),
    "Домашняя паста, сливочный соус и мягкий трюфельный акцент.": entry(
      "House-made pasta, cream sauce, and a soft truffle note."
    ),
    "Гриль-лосось": entry("Grilled salmon"),
    "Теплая овощная подача и легкий цитрусовый соус.": entry(
      "Warm vegetables and a light citrus sauce."
    ),
    "Шоколадный тарт": entry("Chocolate tart"),
    "Финальный акцент для вечернего визита или свидания.": entry(
      "A final accent for an evening visit or a date."
    ),
    "О заведении": entry("About the venue"),
    "Небольшой ресторан с открытой кухней, теплым светом и простым маршрутом от сайта до стола.": entry(
      "A small restaurant with an open kitchen, warm light, and a simple path from site to table."
    ),
    "Вечерние ужины": entry("Evening dinners"),
    "Небольшие встречи": entry("Small gatherings"),
    "Быстрая бронь без длинной истории бренда": entry(
      "Fast booking without a long brand story."
    ),
    "Несколько кадров еды и зала, чтобы гость сразу понял атмосферу.": entry(
      "A few shots of dishes and the dining room so guests immediately understand the atmosphere."
    ),
    "Простой сценарий для ресторана, которому важно не потерять гостя на пути к действию.": entry(
      "A simple scenario for a restaurant that cannot afford to lose guests on the way to action."
    ),
    "webcorn адаптирует это демо под ваше меню, часы работы, бренд и реальный формат брони.": entry(
      "webcorn adapts this demo to your menu, opening hours, brand, and real booking format."
    ),
    "Первый экран, меню, блок о заведении, галерея и базовая форма брони.": entry(
      "Hero section, menu, venue section, gallery, and a basic booking form."
    ),
    "Больше разделов, сильнее атмосфера, отдельные экраны под события и более убедительный путь к брони.": entry(
      "More sections, stronger atmosphere, dedicated event screens, and a more convincing path to booking."
    ),
    "Сезонное меню": entry("Seasonal menu"),
    "Частные события": entry("Private events"),
    "Путь к брони": entry("Path to booking"),
    "Ужин от шефа": entry("Chef's dinner"),
    "Отдельный сценарий под ужины, специальные даты и закрытые брони.": entry(
      "A dedicated flow for dinners, special dates, and private bookings."
    ),
    "Сайт удерживает внимание дольше и дает ресторану больше поводов перевести интерес в бронь.": entry(
      "The site keeps attention longer and gives the restaurant more reasons to turn interest into a booking."
    ),
    "Разделы меню уже подаются не как список, а как отобранная подача ресторана.": entry(
      "Menu sections are no longer shown as a list, but as a curated restaurant presentation."
    ),
    "Авторские закуски": entry("Signature starters"),
    "Небольшие тарелки и закуски для начала вечера.": entry(
      "Small plates and starters to begin the evening."
    ),
    "Основная подача": entry("Main course"),
    "Основные блюда с сезонным акцентом и подачей шефа.": entry(
      "Main dishes with a seasonal focus and chef-led presentation."
    ),
    "Десерт и вино": entry("Dessert and wine"),
    "Сладкий финал и пара по напиткам в одном сценарии.": entry(
      "A sweet finish and drink pairing within one scenario."
    ),
    "Стол шефа по пятницам": entry("Chef's table on Fridays"),
    "Винные ужины и закрытые форматы": entry("Wine dinners and private formats"),
    "Корпоративные и камерные вечера": entry("Corporate and intimate evenings"),
    "Более взрослый образ заведения": entry("A more mature venue image"),
    "Отдельные поводы для брони": entry("More reasons to book"),
    "Лучше визуальная глубина и атмосфера": entry("Better visual depth and atmosphere"),
    "Интерьер, блюда и свет работают как часть ресторанного бренда.": entry(
      "Interior, dishes, and lighting work together as part of the restaurant brand."
    ),
    "Гость Atelier Dining": entry("Atelier Dining guest"),
    "webcorn адаптирует это демо под ваше меню, атмосферу, события и реальный формат бронирования.": entry(
      "webcorn adapts this demo to your menu, atmosphere, events, and real booking format."
    ),
    "Сайт выглядит взрослее и дает больше поводов дойти до брони.": entry(
      "The site looks more mature and gives more reasons to complete a booking."
    ),
    "Премиальный демо-сайт с дегустационным меню, историей шефа, частными ужинами, галереей и сильной бронью.": entry(
      "A premium demo site with a tasting menu, chef story, private dinners, gallery, and strong booking flow."
    ),
    "Дегустационное меню": entry("Tasting menu"),
    "История шефа": entry("Chef's story"),
    "Сезонный дегустационный сет": entry("Seasonal tasting set"),
    "Отдельная подача сетов и сезонности уже на первом экране.": entry(
      "The tasting sets and seasonal focus are presented right on the first screen."
    ),
    "Сайт работает как продолжение ресторана и усиливает ощущение уровня еще до брони.": entry(
      "The site works like an extension of the restaurant and strengthens the sense of quality before booking."
    ),
    "Премиальный уровень показывает кухню как цельный опыт, а не просто как список позиций.": entry(
      "The premium tier presents the cuisine as a complete experience, not just a list of items."
    ),
    "Пролог": entry("Prologue"),
    "Небольшие amuse-bouche и первый акцент на философии кухни.": entry(
      "Small amuse-bouche and the first accent on the kitchen philosophy."
    ),
    "Главный сет с сезонными продуктами и авторской подачей.": entry(
      "The main tasting set with seasonal products and signature presentation."
    ),
    "Финальный акцент": entry("Final note"),
    "Десерт и сопровождение напитками, которые завершают весь ужин.": entry(
      "Dessert and drink pairing that complete the entire dinner."
    ),
    "Личность шефа становится частью бренда и усиливает доверие к концепции ресторана.": entry(
      "The chef's personality becomes part of the brand and strengthens trust in the restaurant concept."
    ),
    "Что дает этот экран": entry("What this screen adds"),
    "Ресторан выглядит как культурный бренд": entry("The restaurant feels like a cultural brand"),
    "Гостю проще оправдать более высокий чек": entry(
      "It is easier for the guest to justify a higher check."
    ),
    "История шефа усиливает частные форматы": entry(
      "The chef's story strengthens private formats."
    ),
    "Интерьер, сервировка и кухня собраны как единый дорогой образ ресторана.": entry(
      "Interior, table setting, and cuisine are presented as one premium restaurant image."
    ),
    "Камерные ужины до 12 гостей": entry("Private dinners for up to 12 guests"),
    "Корпоративные вечера и закрытые дегустации": entry(
      "Corporate evenings and closed tasting events"
    ),
    "Отдельный маршрут под специальные форматы": entry(
      "A separate flow for special formats."
    ),
    "Форма брони выглядит как часть сервиса и подходит для дегустаций, стола шефа и частных ужинов.": entry(
      "The booking form feels like part of the service and fits tasting menus, the chef's table, and private dinners."
    ),
    "Частный ужин": entry("Private dinner"),
    "webcorn адаптирует этот демо-сайт под ваш бренд, меню, шефа, частные ужины и весь образ заведения.": entry(
      "webcorn adapts this demo site to your brand, menu, chef, private dinners, and the overall image of the venue."
    ),
    "Помогает ресторану выглядеть дороже и продает не только стол, но и саму атмосферу бренда.": entry(
      "Helps the restaurant look more premium and sells not just a table, but the entire brand atmosphere."
    ),
    "Напишите, если нужен частный ужин или специальный сет": entry(
      "Tell us if you need a private dinner or a special tasting set."
    ),
    "+7 / WhatsApp": entry("+7 / WhatsApp"),
    "Название объекта": entry("Property name", "Tesis adı"),
    "Название клиники": entry("Clinic name", "Klinik adı"),
    "Название заведения": entry("Venue name", "Mekan adı"),
    "WhatsApp / телефон": entry("WhatsApp / phone", "WhatsApp / telefon"),
    "Выбранное демо": entry("Selected demo", "Seçilen demo"),
    "Например: усилить прямые бронирования, показать номера, добавить доверие и FAQ.": entry(
      "For example: strengthen direct bookings, show rooms, add trust and FAQ blocks.",
      "Örneğin: doğrudan rezervasyonları güçlendirmek, odaları göstermek, güven ve SSS blokları eklemek."
    ),
    "Например: показать направления, усилить доверие, улучшить запись и мобильную подачу.": entry(
      "For example: show specialties, strengthen trust, improve appointments and mobile presentation.",
      "Örneğin: branşları göstermek, güveni artırmak, randevu akışını ve mobil sunumu iyileştirmek."
    ),
    "Например: показать меню, усилить атмосферу бренда, добавить удобную бронь и блоки событий.": entry(
      "For example: show the menu, strengthen the brand atmosphere, add convenient booking and event blocks.",
      "Örneğin: menüyü göstermek, marka atmosferini güçlendirmek, kolay rezervasyon ve etkinlik blokları eklemek."
    ),
    "Шаблон": entry("Template"),
    "Выйти": entry("Sign out"),
    "Выбор формы входа": entry("Choose auth form"),
    "Без шаблона": entry("No template"),
    "Подготавливаем оплату": entry("Preparing payment"),
    "Создаем заказ и открываем защищенную форму CloudPayments.": entry(
      "We are creating the order and opening the secure CloudPayments form."
    ),
    "Попробуйте еще раз или используйте другую карту.": entry(
      "Try again or use another card."
    ),
    "Не удалось подключиться к серверу. Откройте сайт через http://localhost:8080 или запустите java src/Main.java.": entry(
      "Could not connect to the server. Open the site via http://localhost:8080 or run java src/Main.java."
    ),
    "Не удалось загрузить данные.": entry("Failed to load data."),
    "Не удалось выполнить действие.": entry("Failed to complete the action."),
    "Не удалось сохранить изменения.": entry("Failed to save the changes."),
    "Сервер вернул ошибку.": entry("The server returned an error."),
    "Не удалось выполнить запрос.": entry("Failed to complete the request."),
    "Не удалось отправить заявку. Попробуйте еще раз.": entry(
      "Failed to send the inquiry. Please try again."
    ),
    "Не удалось войти в CRM.": entry("Failed to sign in to the CRM."),
    "Аккаунт с таким email уже существует.": entry(
      "An account with this email already exists."
    ),
    "Неверный email или пароль.": entry("Invalid email or password."),
    "Этот аккаунт не имеет доступа к CRM.": entry(
      "This account does not have access to the CRM."
    ),
    "Войдите через клиентский кабинет.": entry(
      "Sign in through the client account."
    ),
    "Войдите в личный кабинет, чтобы отправлять заявки и видеть их статус.": entry(
      "Sign in to your account to submit inquiries and see their status."
    ),
    "Доступ к CRM есть только у сотрудников.": entry(
      "Only staff members can access the CRM."
    ),
    "Этот раздел доступен только клиентскому кабинету.": entry(
      "This section is available only in the client account."
    ),
    "CloudPayments publicId не настроен на сервере.": entry(
      "CloudPayments publicId is not configured on the server."
    ),
    "Заказ не найден.": entry("Order not found."),
    "Требуется вход сотрудника.": entry("Staff sign-in is required."),
    "Если пакет еще не выбран, нажмите «Выбрать уровень» на карточке выше.": entry(
      "If the tier has not been selected yet, click “Choose this tier” on the card above.",
      "Paket henüz seçilmediyse yukarıdaki kartta “Bu siteyi sipariş et” seçeneğine tıklayın."
    ),
    "Оставьте контакты, формат клиники и основные задачи для сайта.": entry(
      "Leave your contacts, clinic format, and the main goals for the website.",
      "İletişim bilgilerinizi, klinik formatını ve site için ana hedefleri bırakın."
    ),
    "Оставьте контакт, формат заведения и что важно для нового сайта.": entry(
      "Leave your contact, venue format, and what matters for the new website.",
      "İletişiminizi, mekan formatını ve yeni site için önemli olanları bırakın."
    ),
    "Оставьте контакт, название объекта и что важно для нового сайта.": entry(
      "Leave your contact, property name, and what matters for the new website.",
      "İletişiminizi, tesis adını ve yeni site için önemli olanları bırakın."
    )
  };

  Object.assign(TEXTS, {
    "Оплата": entry("Payment", "Ödeme"),
    "Ничего не найдено": entry("Nothing found", "Hiçbir şey bulunamadı"),
    "Без названия компании": entry("No company name", "Şirket adı yok"),
    "Измените статус-фильтр или поисковый запрос.": entry(
      "Change the status filter or the search query.",
      "Durum filtresini veya arama sorgusunu değiştirin."
    ),
    "Без названия": entry("Untitled", "Adsız"),
    "Сайты для отелей и апарт-отелей.": entry(
      "Websites for hotels and apartment hotels.",
      "Oteller ve apart oteller için web siteleri."
    ),
    "Подача номеров, прямые бронирования, сервис и дорогой образ объекта.": entry(
      "Room presentation, direct bookings, service, and a premium property image.",
      "Oda sunumu, doğrudan rezervasyonlar, servis ve tesisin premium imajı."
    ),
    "Сайты для клиник и частных кабинетов.": entry(
      "Websites for clinics and private practices.",
      "Klinikler ve özel muayenehaneler için web siteleri."
    ),
    "Услуги, врачи, доверие и запись в спокойной медицинской стилистике.": entry(
      "Services, doctors, trust, and appointment flow in a calm medical style.",
      "Sakin bir tıbbi üslupla hizmetler, doktorlar, güven ve randevu akışı."
    ),
    "Сайты для ресторанов, кафе и гастро-брендов.": entry(
      "Websites for restaurants, cafes, and gastro brands.",
      "Restoranlar, kafeler ve gastro markaları için web siteleri."
    ),
    "Меню, атмосфера, бронь и подача заведения как полноценного бренда.": entry(
      "Menu, atmosphere, booking, and a venue presented as a full-fledged brand.",
      "Menü, atmosfer, rezervasyon ve mekanı tam gelişmiş bir marka olarak sunum."
    ),
    "Выберите сайт для отеля под формат вашего объекта.": entry(
      "Choose a hotel website that fits your property format.",
      "Tesisinizin formatına uygun otel sitesini seçin."
    ),
    "Все три уровня уже собраны как реальные демо-сайты. Откройте нужный вариант и посмотрите, как будет выглядеть ваш будущий сайт.": entry(
      "All three tiers are already assembled as real demo websites. Open the right option and see how your future website will look.",
      "Üç seviyenin tamamı gerçek demo siteler olarak hazır. Doğru seçeneği açın ve gelecekteki sitenizin nasıl görüneceğini görün."
    ),
    "Открыть демо Signature": entry("Open Signature demo", "Signature demosunu aç"),
    "Три готовых формата для отелей.": entry(
      "Three ready-made formats for hotels.",
      "Oteller için üç hazır format."
    ),
    "Разница в глубине структуры, визуальной подаче и силе пути к прямому бронированию.": entry(
      "The difference lies in structural depth, visual presentation, and the strength of the direct-booking path.",
      "Fark; yapı derinliği, görsel sunum ve doğrudan rezervasyon yolunun gücündedir."
    ),
    "от $1,050": entry("from $1,050", "€950'den başlayan"),
    "Короткий сайт-визитка для небольшого отеля, апарт-отеля или гостевого дома.": entry(
      "A short brochure-style website for a small hotel, aparthotel, or guest house.",
      "Küçük bir otel, apart otel veya konukevi için kısa bir tanıtım sitesi."
    ),
    "Первый экран, номера, галерея, отзывы и форма запроса": entry(
      "Hero screen, rooms, gallery, reviews, and an inquiry form.",
      "İlk ekran, odalar, galeri, yorumlar ve talep formu."
    ),
    "Быстрый запуск и чистая структура": entry(
      "Fast launch and a clean structure.",
      "Hızlı başlangıç ve temiz yapı."
    ),
    "Для объектов без сложной архитектуры": entry(
      "For properties without a complex architecture.",
      "Karmaşık mimarisi olmayan tesisler için."
    ),
    "Выбрать уровень": entry("Choose this tier", "Bu seviyeyi seç"),
    "от $1,850": entry("from $1,850", "€1650'den başlayan"),
    "Основной коммерческий формат для отеля, которому нужны доверие, структура и прямые запросы.": entry(
      "The main commercial format for a hotel that needs trust, structure, and direct inquiries.",
      "Güven, yapı ve doğrudan taleplere ihtiyaç duyan oteller için ana ticari format."
    ),
    "Больше экранов под номера, сервис и преимущества": entry(
      "More screens for rooms, service, and advantages.",
      "Odalar, servis ve avantajlar için daha fazla ekran."
    ),
    "Сильнее сценарий прямого бронирования": entry(
      "A stronger direct-booking flow.",
      "Daha güçlü bir doğrudan rezervasyon akışı."
    ),
    "Лучший баланс цены и результата": entry(
      "The best balance of price and outcome.",
      "Fiyat ve sonuç arasında en iyi denge."
    ),
    "от $3,450": entry("from $3,450", "€3200'den başlayan"),
    "Флагманский сайт для брендовых объектов, где сайт должен усиливать класс отеля.": entry(
      "A flagship website for branded properties where the site must elevate the class of the hotel.",
      "Sitenin otelin sınıfını yükseltmesi gereken markalı tesisler için amiral gemisi site."
    ),
    "Премиальная подача, номера высокого класса, галерея и сервис": entry(
      "Premium presentation, high-end rooms, gallery, and service.",
      "Premium sunum, üst sınıf odalar, galeri ve servis."
    ),
    "Сильный визуальный образ и больше контента": entry(
      "A strong visual image and more content.",
      "Güçlü bir görsel imaj ve daha fazla içerik."
    ),
    "Для бутик- и премиальных отелей": entry(
      "For boutique and premium hotels.",
      "Butik ve premium oteller için."
    ),
    "Выберите уровень и отправьте короткий бриф.": entry(
      "Choose a tier and send a short brief.",
      "Bir seviye seçin ve kısa bir brif gönderin."
    ),
    "После заявки webcorn свяжется и подготовит адаптацию выбранного демо под ваш объект.": entry(
      "After the inquiry, webcorn will contact you and prepare an adaptation of the selected demo for your property.",
      "Başvurudan sonra webcorn sizinle iletişime geçecek ve seçilen demonun tesisinize uyarlamasını hazırlayacak."
    ),
    "Можно сначала открыть демо, а затем вернуться и отправить заявку на тот же уровень.": entry(
      "You can open the demo first, then return and submit an inquiry for the same tier.",
      "Önce demoyu açabilir, sonra geri dönüp aynı seviye için talep gönderebilirsiniz."
    ),
    "Lite — быстрый старт": entry("Lite — fast start", "Lite — hızlı başlangıç"),
    "Pro — основной коммерческий вариант": entry(
      "Pro — main commercial option",
      "Pro — ana ticari seçenek"
    ),
    "Signature — премиальная подача бренда": entry(
      "Signature — premium brand presentation",
      "Signature — premium marka sunumu"
    ),
    "Выберите сайт для клиники под ваш уровень подачи.": entry(
      "Choose a clinic website for your preferred presentation level.",
      "Sunum seviyenize uygun klinik sitesini seçin."
    ),
    "Все уровни уже открываются как реальные демо-сайты: с услугами, врачами, блоками доверия и записью. Выберите формат и переходите в демо.": entry(
      "All tiers already open as real demo websites: with services, doctors, trust blocks, and appointment flow. Choose a format and open the demo.",
      "Tüm seviyeler; hizmetler, doktorlar, güven blokları ve randevu akışıyla gerçek demo siteler olarak açılıyor. Bir format seçin ve demoya geçin."
    ),
    "Врачи": entry("Doctors", "Doktorlar"),
    "Три формата для медицинского сайта.": entry(
      "Three formats for a medical website.",
      "Tıbbi bir web sitesi için üç format."
    ),
    "От быстрого сайта услуг до сильного брендового решения для частной клиники.": entry(
      "From a fast service website to a strong brand solution for a private clinic.",
      "Hızlı bir hizmet sitesinden özel klinik için güçlü bir marka çözümüne kadar."
    ),
    "от $990": entry("from $990", "€880'den başlayan"),
    "Базовый медицинский сайт с услугами, карточкой врача, блоком доверия и записью.": entry(
      "A basic medical website with services, doctor profile, trust block, and appointment flow.",
      "Hizmetler, doktor kartı, güven bloğu ve randevu akışı içeren temel bir tıbbi site."
    ),
    "Подходит для кабинета, врача или маленькой клиники": entry(
      "Suitable for a private office, a doctor, or a small clinic.",
      "Muayenehane, doktor veya küçük klinik için uygundur."
    ),
    "Чистая структура без перегруза": entry(
      "Clean structure without overload.",
      "Aşırı yük olmadan temiz yapı."
    ),
    "Быстрый запуск и понятный контакт": entry(
      "Fast launch and clear contact path.",
      "Hızlı başlangıç ve net iletişim yolu."
    ),
    "от $1,780": entry("from $1,780", "€1580'den başlayan"),
    "Основной формат для клиники с врачами, услугами, доверием и записью.": entry(
      "The main format for a clinic with doctors, services, trust, and appointment flow.",
      "Doktorlar, hizmetler, güven ve randevu akışı olan klinik için ana format."
    ),
    "Больше экранов под направления и команду": entry(
      "More screens for specialties and team.",
      "Branşlar ve ekip için daha fazla ekran."
    ),
    "Больше доверия и лучше путь к записи": entry(
      "More trust and a better path to appointment.",
      "Daha fazla güven ve randevuya daha iyi bir yol."
    ),
    "Подходит большинству частных клиник": entry(
      "Suitable for most private clinics.",
      "Çoğu özel klinik için uygundur."
    ),
    "от $3,250": entry("from $3,250", "€2950'den başlayan"),
    "Премиальный сайт клиники с сильной подачей бренда, технологий и маршрута пациента.": entry(
      "A premium clinic website with a strong presentation of brand, technology, and patient journey.",
      "Marka, teknoloji ve hasta yolculuğunu güçlü biçimde sunan premium klinik sitesi."
    ),
    "Программы, специалисты, технологии и сильные блоки доверия": entry(
      "Programs, specialists, technology, and strong trust blocks.",
      "Programlar, uzmanlar, teknoloji ve güçlü güven blokları."
    ),
    "Для клиник с высоким уровнем сервиса": entry(
      "For clinics with a high level of service.",
      "Yüksek hizmet seviyesine sahip klinikler için."
    ),
    "Самая сильная визуальная подача": entry(
      "The strongest visual presentation.",
      "En güçlü görsel sunum."
    ),
    "Отправьте бриф по клинике и выбранному уровню.": entry(
      "Send a brief about the clinic and the selected tier.",
      "Klinik ve seçilen seviye hakkında bir brif gönderin."
    ),
    "Сначала можно открыть демо, затем вернуться и заказать адаптацию той же структуры под свою клинику.": entry(
      "You can open the demo first, then return and order an adaptation of the same structure for your clinic.",
      "Önce demoyu açabilir, sonra geri dönüp aynı yapının kliniğinize uyarlamasını sipariş edebilirsiniz."
    ),
    "webcorn адаптирует выбранное демо под ваши услуги, врачей и сценарий записи.": entry(
      "webcorn will adapt the selected demo to your services, doctors, and appointment flow.",
      "webcorn seçilen demoyu hizmetlerinize, doktorlarınıza ve randevu akışınıza uyarlayacaktır."
    ),
    "Lite — для быстрого медицинского старта": entry(
      "Lite — for a fast medical start",
      "Lite — hızlı tıbbi başlangıç için"
    ),
    "Pro — для основной коммерческой подачи": entry(
      "Pro — for the main commercial presentation",
      "Pro — ana ticari sunum için"
    ),
    "Signature — для сильной бренд-подачи": entry(
      "Signature — for strong brand presentation",
      "Signature — güçlü marka sunumu için"
    ),
    "Выберите сайт для ресторана под класс вашего заведения.": entry(
      "Choose a restaurant website that matches the level of your venue.",
      "Mekanınızın seviyesine uygun restoran sitesini seçin."
    ),
    "От короткой визитки с меню и бронью до премиального сайта с атмосферой, историей бренда и частными форматами. Все варианты уже доступны как демо.": entry(
      "From a short brochure with menu and booking to a premium website with atmosphere, brand story, and private formats. All options are already available as demos.",
      "Menü ve rezervasyonlu kısa bir tanıtım sitesinden; atmosfer, marka hikayesi ve özel formatlar içeren premium siteye kadar tüm seçenekler demo olarak hazır."
    ),
    "Три готовых формата для ресторанного сайта.": entry(
      "Three ready-made formats for a restaurant website.",
      "Restoran sitesi için üç hazır format."
    ),
    "Разница в атмосфере, глубине структуры и том, насколько сильно сайт продает бронь и бренд.": entry(
      "The difference is in atmosphere, structural depth, and how strongly the site sells booking and brand.",
      "Fark; atmosferde, yapı derinliğinde ve sitenin rezervasyon ile markayı ne kadar güçlü sattığında."
    ),
    "от $950": entry("from $950", "€820'den başlayan"),
    "Лаконичный сайт для ресторана или кафе: первый экран, меню, блок о заведении, галерея и бронь.": entry(
      "A concise website for a restaurant or cafe: hero screen, menu, about section, gallery, and booking.",
      "Restoran veya kafe için özlü bir site: ilk ekran, menü, mekan bölümü, galeri ve rezervasyon."
    ),
    "Подходит для быстрого запуска без сложной структуры": entry(
      "Suitable for a fast launch without complex structure.",
      "Karmaşık yapı olmadan hızlı başlangıç için uygundur."
    ),
    "Меню и контакт видны сразу": entry(
      "Menu and contact are visible immediately.",
      "Menü ve iletişim hemen görünür."
    ),
    "Хорош для небольших заведений и кафе": entry(
      "A good fit for small venues and cafes.",
      "Küçük mekanlar ve kafeler için uygundur."
    ),
    "от $1,690": entry("from $1,690", "€1480'den başlayan"),
    "Основной формат с меню, событиями, галереей, блоком о заведении и удобной бронью.": entry(
      "The main format with menu, events, gallery, venue story, and convenient booking.",
      "Menü, etkinlikler, galeri, mekan bölümü ve rahat rezervasyon içeren ana format."
    ),
    "Больше экранов и больше контента": entry(
      "More screens and more content.",
      "Daha fazla ekran ve daha fazla içerik."
    ),
    "Сильнее путь от атмосферы к бронированию": entry(
      "A stronger path from atmosphere to booking.",
      "Atmosferden rezervasyona daha güçlü bir yol."
    ),
    "Подходит большинству ресторанов": entry(
      "Suitable for most restaurants.",
      "Çoğu restoran için uygundur."
    ),
    "от $3,150": entry("from $3,150", "€2850'den başlayan"),
    "Премиальный сайт с атмосферой бренда, историей шефа, дегустационным меню, галереей и сильной бронью.": entry(
      "A premium website with brand atmosphere, chef story, tasting menu, gallery, and strong booking flow.",
      "Marka atmosferi, şef hikayesi, tadım menüsü, galeri ve güçlü rezervasyon akışı olan premium site."
    ),
    "Сильная эмоциональная подача и дорогой образ заведения": entry(
      "Strong emotional presentation and an upscale venue image.",
      "Güçlü duygusal sunum ve mekanın üst segment imajı."
    ),
    "Для заведений с высокой визуальной ставкой": entry(
      "For venues with a high visual standard.",
      "Görsel standardı yüksek mekanlar için."
    ),
    "Самый богатый контент и структура": entry(
      "The richest content and structure.",
      "En zengin içerik ve yapı."
    ),
    "Выберите уровень и отправьте бриф по заведению.": entry(
      "Choose a tier and send a brief about the venue.",
      "Bir seviye seçin ve mekanla ilgili bir brif gönderin."
    ),
    "webcorn адаптирует выбранное демо под меню, атмосферу, бронь и реальный формат вашего заведения.": entry(
      "webcorn will adapt the selected demo to your menu, atmosphere, booking flow, and actual venue format.",
      "webcorn seçilen demoyu menünüze, atmosferinize, rezervasyon akışınıza ve mekanınızın gerçek formatına uyarlayacaktır."
    ),
    "Можно пройти демо, понять стиль и затем вернуться к заказу того же уровня.": entry(
      "You can go through the demo, understand the style, and then return to order the same tier.",
      "Demoyu inceleyip tarzı anlayabilir, ardından geri dönüp aynı seviyeyi sipariş edebilirsiniz."
    ),
    "Lite — для быстрого запуска": entry(
      "Lite — for a quick launch",
      "Lite — hızlı başlangıç için"
    ),
    "Signature — для премиального бренда": entry(
      "Signature — for a premium brand",
      "Signature — premium marka için"
    ),
    "Ниша": entry("Niche", "Niş"),
    "Пакет": entry("Tier", "Paket"),
    "Lite / Отель": entry("Lite / Hotel", "Lite / Otel"),
    "Pro / Отель": entry("Pro / Hotel", "Pro / Otel"),
    "Signature / Отель": entry("Signature / Hotel", "Signature / Otel"),
    "Lite / Клиника": entry("Lite / Clinic", "Lite / Klinik"),
    "Pro / Клиника": entry("Pro / Clinic", "Pro / Klinik"),
    "Signature / Клиника": entry("Signature / Clinic", "Signature / Klinik"),
    "Lite / Ресторан": entry("Lite / Restaurant", "Lite / Restoran"),
    "Pro / Ресторан": entry("Pro / Restaurant", "Pro / Restoran"),
    "Signature / Ресторан": entry("Signature / Restaurant", "Signature / Restoran"),
    "Тихий отель в центре для коротких поездок.": entry(
      "A quiet hotel in the center for short trips.",
      "Kısa seyahatler için merkezde sakin bir otel."
    ),
    "Проверить даты": entry("Check dates", "Tarihleri kontrol et"),
    "Смотреть номера": entry("View rooms", "Odaları görüntüle"),
    "Быстрый запрос на проживание": entry(
      "Quick stay inquiry",
      "Konaklama için hızlı talep"
    ),
    "1 взрослый": entry("1 adult", "1 yetişkin"),
    "2 взрослых": entry("2 adults", "2 yetişkin"),
    "Семья": entry("Family", "Aile"),
    "Отправить запрос": entry("Send request", "Talep gönder"),
    "Бутик-отель у воды с понятным маршрутом к брони.": entry(
      "A boutique hotel by the water with a clear path to booking.",
      "Rezarvasyona giden net bir rotaya sahip, su kenarında butik otel."
    ),
    "Почему мы": entry("Why us", "Neden biz"),
    "Форма прямой брони": entry("Direct booking form", "Doğrudan rezervasyon formu"),
    "Тип номера": entry("Room type", "Oda tipi"),
    "Отель, который хочется забронировать уже на уровне ощущения.": entry(
      "A hotel you want to book at the level of feeling alone.",
      "Daha his düzeyindeyken rezervasyon yapmak isteyeceğiniz bir otel."
    ),
    "Забронировать": entry("Book now", "Rezervasyon yap"),
    "Смотреть сервис": entry("View services", "Hizmetleri görüntüle"),
    "Забронировать номер": entry("Book a room", "Oda rezerve et"),
    "Отправить запрос на бронь": entry(
      "Send booking request",
      "Rezervasyon talebi gönder"
    ),
    "Заезд": entry("Check-in", "Giriş"),
    "Выезд": entry("Check-out", "Çıkış"),
    "Категория": entry("Category", "Kategori"),
    "Пожелания": entry("Requests", "Talepler"),
    "Чистая медицинская подача без лишнего шума.": entry(
      "Clean medical presentation without extra noise.",
      "Gereksiz gürültü olmadan temiz bir tıbbi sunum."
    ),
    "Записаться": entry("Book appointment", "Randevu al"),
    "Что показывает Lite": entry("What Lite shows", "Lite'ın gösterdikleri"),
    "Форма записи": entry("Appointment form", "Randevu formu"),
    "Услуга": entry("Service", "Hizmet"),
    "Повторный визит": entry("Follow-up visit", "Kontrol ziyareti"),
    "Желаемая дата": entry("Preferred date", "Tercih edilen tarih"),
    "Клиника, которой доверяют еще до первого звонка.": entry(
      "A clinic trusted even before the first call.",
      "İlk telefondan önce bile güven uyandıran bir klinik."
    ),
    "Наша команда": entry("Our team", "Ekibimiz"),
    "Почему Pro сильнее": entry("Why Pro is stronger", "Pro neden daha güçlü"),
    "Форма записи на прием": entry("Appointment request form", "Muayene randevu formu"),
    "Направление": entry("Specialty", "Branş"),
    "Нужен такой же Pro-сайт для клиники?": entry(
      "Need the same Pro website for your clinic?",
      "Kliniğiniz için aynı Pro siteye mi ihtiyacınız var?"
    ),
    "Клиника, которая выглядит спокойно, сильно и дорого.": entry(
      "A clinic that looks calm, strong, and premium.",
      "Sakin, güçlü ve premium görünen bir klinik."
    ),
    "Запись на консультацию": entry("Consultation booking", "Danışmanlık randevusu"),
    "Программа": entry("Program", "Program"),
    "Комментарий": entry("Comment", "Yorum"),
    "Нужен такой же Signature-сайт для клиники?": entry(
      "Need the same Signature website for your clinic?",
      "Kliniğiniz için aynı Signature siteye mi ihtiyacınız var?"
    ),
    "Теплое место для ужина в центре города.": entry(
      "A warm place for dinner in the city center.",
      "Şehir merkezinde akşam yemeği için sıcak bir mekan."
    ),
    "Смотреть меню": entry("View menu", "Menüyü görüntüle"),
    "Бронь стола": entry("Table booking", "Masa rezervasyonu"),
    "Гости": entry("Guests", "Misafirler"),
    "2 гостя": entry("2 guests", "2 misafir"),
    "4 гостя": entry("4 guests", "4 misafir"),
    "6 гостей": entry("6 guests", "6 misafir"),
    "Ресторан, который выглядит как полноценный бренд.": entry(
      "A restaurant that looks like a full-fledged brand.",
      "Tam teşekküllü bir marka gibi görünen restoran."
    ),
    "Забронировать стол": entry("Book a table", "Masa ayırt"),
    "Смотреть события": entry("View events", "Etkinlikleri görüntüle"),
    "Что получает ресторан": entry("What the restaurant gets", "Restoranın kazandıkları"),
    "Галерея ресторана": entry("Restaurant gallery", "Restoran galerisi"),
    "Дата": entry("Date", "Tarih"),
    "Время": entry("Time", "Saat"),
    "Формат": entry("Format", "Format"),
    "Основной зал": entry("Main hall", "Ana salon"),
    "Стол шефа": entry("Chef's table", "Şef masası"),
    "Закрытый ужин": entry("Private dinner", "Özel akşam yemeği"),
    "Отправить бронь": entry("Send booking", "Rezervasyonu gönder"),
    "Ресторан, который продает атмосферу еще до первого блюда.": entry(
      "A restaurant that sells atmosphere before the first dish arrives.",
      "İlk yemekten önce bile atmosferi satan bir restoran."
    ),
    "Изучить шефа": entry("Meet the chef", "Şefi keşfet"),
    "Бронь столика": entry("Table reservation", "Masa rezervasyonu"),
    "«Сайт выглядит спокойно и понятно. Было легко разобраться, кто принимает и как записаться на ближайшее время.»": entry(
      '"The website feels calm and clear. It was easy to understand who is available and how to book the nearest appointment."',
      '"Site sakin ve anlaşılır görünüyor. Kimin kabul ettiğini ve en yakın randevunun nasıl alınacağını anlamak kolaydı."'
    ),
    "«После просмотра сайта захотелось не только забронировать стол, но и прийти именно на специальный ужин. Видно, что у ресторана есть характер.»": entry(
      '"After viewing the site, I wanted not only to book a table, but to come specifically for the special dinner. You can feel the restaurant has character."',
      '"Siteyi gördükten sonra sadece masa ayırtmak değil, özellikle özel akşam yemeğine gelmek istedim. Restoranın karakteri olduğu hissediliyor."'
    ),
    "«Редкий пример медицинского сайта, который одновременно выглядит технологично, спокойно и действительно вызывает доверие.»": entry(
      '"A rare example of a medical website that looks advanced, calm, and genuinely inspires trust at the same time."',
      '"Hem teknolojik hem sakin görünen ve gerçekten güven veren nadir bir sağlık sitesi örneği."'
    ),
    "«Сайт передал именно то ощущение, которое мы искали: не просто красивый номер, а весь ритм отдыха. После просмотра захотелось бронировать напрямую.»": entry(
      '"The website conveyed exactly the feeling we were looking for: not just a beautiful room, but the whole rhythm of the stay. After viewing it, I wanted to book directly."',
      '"Site tam aradığımız duyguyu verdi: sadece güzel bir oda değil, tüm konaklama ritmini hissettirdi. İzledikten sonra doğrudan rezervasyon yapmak istedim."'
    ),
    "«Здесь все выглядит серьезно и спокойно. Я сразу увидела врача, направление и форму записи, не пришлось ничего искать.»": entry(
      '"Everything here looks serious and calm. I immediately saw the doctor, the specialty, and the booking form, without having to search for anything."',
      '"Burada her şey ciddi ve sakin görünüyor. Doktoru, branşı ve randevu formunu hemen gördüm; hiçbir şeyi aramak gerekmedi."'
    ),
    "«Очень понятный сайт: сразу увидели номер, условия и легко отправили запрос напрямую, без агрегатора.»": entry(
      '"A very clear website: we immediately saw the room, the conditions, and easily sent a direct inquiry without an aggregator."',
      '"Çok anlaşılır bir site: odayı ve koşulları hemen gördük ve aracı kullanmadan doğrudan talep gönderdik."'
    ),
    "«Все было быстро и спокойно: понятный сайт, легкая бронь и полное соответствие ожиданиям по номеру.»": entry(
      '"Everything was quick and calm: a clear website, easy booking, and the room fully matched expectations."',
      '"Her şey hızlı ve sakindi: anlaşılır bir site, kolay rezervasyon ve odanın beklentilerle tamamen örtüşmesi."'
    ),
    "«Сайт передает ритм ресторана и выглядит как продолжение пространства. Возникает ощущение, что вы уже внутри этого вечера.»": entry(
      '"The website conveys the rhythm of the restaurant and feels like an extension of the space. It gives the impression that you are already inside the evening."',
      '"Site restoranın ritmini aktarıyor ve mekanın devamı gibi görünüyor. Daha şimdiden o akşamın içindeymişsiniz hissi veriyor."'
    ),
  });

  const MESSAGES = {
    languageSwitcherAria: {
      ru: "Язык сайта",
      en: "Site language",
      tr: "Site dili"
    },
    selectionTitleEmpty: {
      ru: "Выберите уровень",
      en: "Choose a tier",
      tr: "Bir seviye seçin"
    },
    selectionTierEmpty: {
      ru: "Без пакета",
      en: "No tier",
      tr: "Paket yok"
    },
    selectionNicheEmpty: {
      ru: "Без ниши",
      en: "No niche",
      tr: "Niş yok"
    },
    leadFormSuccess: {
      ru: "<strong>Заявка принята.</strong> Код {{id}}. Теперь ее статус будет виден в вашем личном кабинете.",
      en: "<strong>Inquiry received.</strong> Code {{id}}. Its status is now visible in your account.",
      tr: "<strong>Talep alındı.</strong> Kod {{id}}. webcorn sizinle e-posta veya WhatsApp üzerinden iletişime geçecek."
    },
    orderLabel: {
      ru: "Заказ {{id}}",
      en: "Order {{id}}",
      tr: "Sipariş {{id}}"
    },
    orderSaved: {
      ru: "Заказ сохранен",
      en: "Order saved",
      tr: "Sipariş kaydedildi"
    },
    paymentSuccessPaid: {
      ru: "Заказ оплачен, статус обновлен до «Оплачен», данные переданы в CRM.",
      en: "The order is paid, the status is updated to “Paid”, and the data has been sent to the CRM.",
      tr: "Sipariş ödendi, durum “Ödendi” olarak güncellendi ve veriler CRM'e aktarıldı."
    },
    paymentSuccessPending: {
      ru: "Платеж принят. Если webhook придет чуть позже, статус заказа обновится автоматически.",
      en: "The payment is accepted. If the webhook arrives a bit later, the order status will update automatically.",
      tr: "Ödeme alındı. Webhook biraz geç gelirse sipariş durumu otomatik olarak güncellenecektir."
    },
    paymentFailureRetry: {
      ru: "Попробуйте снова или используйте другую карту.",
      en: "Try again or use another card.",
      tr: "Tekrar deneyin veya başka bir kart kullanın."
    },
    widgetNotLoaded: {
      ru: "CloudPayments widget не загрузился.",
      en: "The CloudPayments widget did not load.",
      tr: "CloudPayments widget'ı yüklenmedi."
    },
    widgetLoadFailed: {
      ru: "Не удалось загрузить CloudPayments widget.",
      en: "Failed to load the CloudPayments widget.",
      tr: "CloudPayments widget'ı yüklenemedi."
    },
    paymentCancelledWithReason: {
      ru: "Платеж был отменен или отклонен: {{reason}}.",
      en: "The payment was cancelled or declined: {{reason}}.",
      tr: "Ödeme iptal edildi veya reddedildi: {{reason}}."
    },
    paymentCancelledGeneric: {
      ru: "Платеж был отменен или отклонен банком. Попробуйте еще раз или используйте другую карту.",
      en: "The payment was cancelled or declined by the bank. Try again or use another card.",
      tr: "Ödeme banka tarafından iptal edildi veya reddedildi. Tekrar deneyin veya başka bir kart kullanın."
    },
    paymentFailedGeneric: {
      ru: "Оплата не прошла.",
      en: "The payment failed.",
      tr: "Ödeme başarısız oldu."
    },
    processingPrepareTitle: {
      ru: "Подготавливаем оплату",
      en: "Preparing payment",
      tr: "Ödeme hazırlanıyor"
    },
    processingPrepareText: {
      ru: "Создаем заказ и открываем защищенную форму CloudPayments.",
      en: "We are creating the order and opening the secure CloudPayments form.",
      tr: "Siparişi oluşturuyor ve güvenli CloudPayments formunu açıyoruz."
    },
    processingOpenTitle: {
      ru: "Открываем форму оплаты",
      en: "Opening the payment form",
      tr: "Ödeme formu açılıyor"
    },
    processingOpenText: {
      ru: "CloudPayments покажет форму оплаты картой Visa / Mastercard.",
      en: "CloudPayments will show the Visa / Mastercard payment form.",
      tr: "CloudPayments, Visa / Mastercard ödeme formunu gösterecek."
    },
    processingConfirmTitle: {
      ru: "Подтверждаем оплату",
      en: "Confirming payment",
      tr: "Ödeme doğrulanıyor"
    },
    processingConfirmText: {
      ru: "Проверяем статус заказа и ждем webhook CloudPayments.",
      en: "We are checking the order status and waiting for the CloudPayments webhook.",
      tr: "Sipariş durumunu kontrol ediyor ve CloudPayments webhook'unu bekliyoruz."
    },
    amountMeta: {
      ru: "К оплате: {{amount}} • {{invoiceId}}",
      en: "To pay: {{amount}} • {{invoiceId}}",
      tr: "Ödenecek: {{amount}} • {{invoiceId}}"
    },
    paymentPrepareError: {
      ru: "Не удалось подготовить оплату. Проверьте настройки сервера.",
      en: "Failed to prepare the payment. Check the server settings.",
      tr: "Ödeme hazırlanamadı. Sunucu ayarlarını kontrol edin."
    },
    paymentTryAgain: {
      ru: "Оплата не прошла. Попробуйте снова.",
      en: "The payment failed. Please try again.",
      tr: "Ödeme başarısız oldu. Lütfen tekrar deneyin."
    },
    noCompanyName: {
      ru: "Без названия компании",
      en: "No company name",
      tr: "Şirket adı yok"
    },
    noNicheName: {
      ru: "Без ниши",
      en: "No niche",
      tr: "Niş yok"
    },
    noPackageName: {
      ru: "Без пакета",
      en: "No tier",
      tr: "Paket yok"
    },
    noTemplateName: {
      ru: "Без шаблона",
      en: "No template",
      tr: "Şablon yok"
    },
    chooseLead: {
      ru: "Выберите лид",
      en: "Select a lead",
      tr: "Bir lead seçin"
    },
    leadNotSelected: {
      ru: "Лид не выбран",
      en: "No lead selected",
      tr: "Lead seçilmedi"
    },
    openLeadLeft: {
      ru: "Откройте карточку слева.",
      en: "Open a card on the left.",
      tr: "Soldaki kartı açın."
    },
    cardTitleDefault: {
      ru: "Карточка лида",
      en: "Lead card",
      tr: "Lead kartı"
    },
    nameMissing: {
      ru: "Имя не указано",
      en: "Name not specified",
      tr: "İsim belirtilmedi"
    },
    unpaid: {
      ru: "Не оплачено",
      en: "Not paid",
      tr: "Ödenmedi"
    },
    notSpecified: {
      ru: "Не указан",
      en: "Not specified",
      tr: "Belirtilmedi"
    },
    descriptionMissing: {
      ru: "Описание не добавлено",
      en: "No description added",
      tr: "Açıklama eklenmedi"
    },
    metaUpdated: {
      ru: "обновлено {{date}}",
      en: "updated {{date}}",
      tr: "{{date}} tarihinde güncellendi"
    },
    metaPaid: {
      ru: "оплачено {{date}}",
      en: "paid {{date}}",
      tr: "{{date}} tarihinde ödendi"
    },
    metaTransaction: {
      ru: "транзакция {{id}}",
      en: "transaction {{id}}",
      tr: "işlem {{id}}"
    },
    statusUpdated: {
      ru: "Статус обновлен: {{name}} → {{status}}.",
      en: "Status updated: {{name}} → {{status}}.",
      tr: "Durum güncellendi: {{name}} → {{status}}."
    },
    notesSaved: {
      ru: "Заметки сохранены для {{name}}.",
      en: "Notes saved for {{name}}.",
      tr: "{{name}} için notlar kaydedildi."
    },
    statusUpdateFailed: {
      ru: "Не удалось обновить статус.",
      en: "Failed to update the status.",
      tr: "Durum güncellenemedi."
    },
    notesSaveFailed: {
      ru: "Не удалось сохранить заметки.",
      en: "Failed to save notes.",
      tr: "Notlar kaydedilemedi."
    },
    crmUpdated: {
      ru: "CRM обновлена: появились новые данные из сайта.",
      en: "CRM updated: new data arrived from the website.",
      tr: "CRM güncellendi: siteden yeni veriler geldi."
    },
    crmConnected: {
      ru: "CRM подключена к серверным заявкам и статусам.",
      en: "CRM is connected to server-side inquiries and statuses.",
      tr: "CRM, sunucu tarafındaki taleplere ve durumlara bağlandı."
    },
    crmUnavailable: {
      ru: "Не удалось загрузить CRM.",
      en: "Failed to load the CRM.",
      tr: "CRM yüklenemedi."
    },
    accountUpdatedAt: {
      ru: "Обновлено {{date}}",
      en: "Updated {{date}}",
      tr: "{{date}} tarihinde güncellendi"
    },
    accountLeadCreated: {
      ru: "Заявка {{id}} отправлена и уже появилась в вашем кабинете.",
      en: "Inquiry {{id}} has been sent and already appears in your account.",
      tr: "{{id}} talebi gönderildi ve hesabınızda görünüyor."
    },
    crmFallback: {
      ru: "API недоступен. Используется локальный fallback из браузерного хранилища.",
      en: "API is unavailable. A local fallback from browser storage is being used.",
      tr: "API kullanılamıyor. Tarayıcı depolamasındaki yerel yedek çözüm kullanılıyor."
    }
  };

  Object.assign(TEXTS, {
    "webcorn — личный кабинет": entry("webcorn — account"),
    "Личный кабинет webcorn: вход, регистрация и отслеживание статуса заявок на сайт.": entry(
      "webcorn account: sign in, register, and track your website inquiries."
    ),
    "webcorn — вход для сотрудников": entry("webcorn — staff login"),
    "Вход сотрудников webcorn в CRM.": entry("webcorn staff login for the CRM."),
    "Личный кабинет": entry("Account"),
    "Кабинет": entry("Account"),
    "Войти": entry("Sign in"),
    "Войдите, чтобы отправлять заявки и следить за их статусом.": entry(
      "Sign in to submit inquiries and track their status."
    ),
    "После входа все ваши заявки на сайт будут собраны в одном месте: с выбранным демо, пакетом и текущим статусом.": entry(
      "After you sign in, all your website inquiries will be gathered in one place with the chosen demo, tier, and current status."
    ),
    "Оставить заявку": entry("Submit an inquiry"),
    "Мои заявки": entry("My inquiries"),
    "Доступ": entry("Access"),
    "Вход или регистрация": entry("Sign in or register"),
    "Создайте аккаунт один раз, чтобы видеть все свои заявки и их статусы.": entry(
      "Create an account once to see all your inquiries and their statuses."
    ),
    "Вход": entry("Sign in"),
    "Регистрация": entry("Register"),
    "Войти в кабинет": entry("Sign in to your account"),
    "Компания / проект": entry("Company / project"),
    "Пароль": entry("Password"),
    "Пароль должен содержать минимум 8 символов.": entry(
      "The password must contain at least 8 characters."
    ),
    "Создать аккаунт": entry("Create account"),
    "Кабинет клиента": entry("Client account"),
    "Здесь появятся ваши заявки и их актуальные статусы.": entry(
      "Your inquiries and their current statuses will appear here."
    ),
    "Здесь хранятся все заявки, которые вы отправили через webcorn.": entry(
      "All inquiries you submitted through webcorn are stored here."
    ),
    "Клиент webcorn": entry("webcorn client"),
    "Пока заявок нет": entry("No inquiries yet"),
    "Выберите нишу, откройте демо и отправьте первую заявку через сайт.": entry(
      "Choose a niche, open a demo, and send your first inquiry through the website."
    ),
    "Заявка без выбранного демо": entry("Inquiry without a selected demo"),
    "Описание задачи пока не добавлено.": entry("No project description has been added yet."),
    "Вы вошли в личный кабинет.": entry("You are signed in to your account."),
    "Аккаунт создан. Теперь вы можете отслеживать заявки в кабинете.": entry(
      "Account created. You can now track inquiries in your account."
    ),
    "Не удалось войти.": entry("Failed to sign in."),
    "Не удалось создать аккаунт.": entry("Failed to create the account."),
    "Вы вышли из личного кабинета.": entry("You signed out of your account."),
    "Сначала войдите или зарегистрируйтесь. После этого заявка отправится в ваш кабинет.": entry(
      "Sign in or register first. After that, the inquiry will be sent to your account."
    ),
    "Не удалось отправить сохраненную заявку.": entry("Failed to send the saved inquiry."),
    "Только для сотрудников": entry("Staff only"),
    "Вход сотрудников": entry("Staff sign in"),
    "CRM закрыта для клиентов и доступна только команде.": entry(
      "The CRM is closed to clients and available only to the team."
    ),
    "Используйте служебный email и пароль, чтобы открыть CRM и работать с заявками.": entry(
      "Use the staff email and password to open the CRM and work with inquiries."
    ),
    "Почта сотрудника": entry("Staff email"),
    "Войти в CRM": entry("Sign in to CRM"),
    "Сотрудник": entry("Staff"),
    "Чтобы отправить заявку и видеть ее статус, войдите в личный кабинет. Если пакет еще не выбран, нажмите «Выбрать уровень» на карточке выше.": entry(
      "To send an inquiry and see its status, sign in to your account. If the tier is not selected yet, click “Choose this tier” on the card above."
    )
  });

  const getStoredLanguage = () => {
    const value = window.localStorage?.getItem(STORAGE_KEY) ?? "ru";
    return LANGUAGES.includes(value) ? value : "ru";
  };

  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const interpolate = (template, params = {}) =>
    String(template ?? "").replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ""));

  const normalizeLegacyBrand = (value) => String(value ?? "").replace(/\bWebfactory\b/g, "webcorn");

  const translateExact = (value, language) => {
    const normalized = normalize(value);
    if (!normalized) {
      return value;
    }

    const normalizedWithBrand = normalize(normalizeLegacyBrand(normalized));
    const match = TEXTS[normalized] ?? TEXTS[normalizedWithBrand];
    if (!match) {
      if (language === "ru") {
        return normalizeLegacyBrand(value);
      }
      return value;
    }

    if (language === "ru") {
      return match.ru ?? normalizeLegacyBrand(value);
    }

    return match[language] ?? value;
  };

  const getCurrentLanguage = () => getStoredLanguage();

  const message = (key, params = {}) => {
    const lang = getCurrentLanguage();
    const source = MESSAGES[key];
    if (!source) {
      return "";
    }

    const template = source[lang] ?? source.ru ?? "";
    return interpolate(template, params);
  };

  const text = (value) => translateExact(value, getCurrentLanguage());

  const preserveSpacing = (source, translated) => {
    const raw = String(source ?? "");
    const leading = raw.match(/^\s*/)?.[0] ?? "";
    const trailing = raw.match(/\s*$/)?.[0] ?? "";
    return `${leading}${translated}${trailing}`;
  };

  const translatedSourceMatches = (currentValue, sourceValue) => {
    const normalizedCurrent = normalize(currentValue);

    if (!normalizedCurrent) {
      return false;
    }

    const variants = new Set([normalize(sourceValue)]);
    LANGUAGES.forEach((language) => {
      variants.add(normalize(translateExact(sourceValue, language)));
    });

    return variants.has(normalizedCurrent);
  };

  const setTextSource = (node, source) => {
    textSourceMap.set(node, String(source ?? ""));
  };

  const getTextSource = (node) => textSourceMap.get(node);

  const getAttrSources = (element) => {
    let map = attrSourceMap.get(element);
    if (!map) {
      map = {};
      attrSourceMap.set(element, map);
    }
    return map;
  };

  const translateTextNode = (node) => {
    if (!node || !node.textContent || !normalize(node.textContent)) {
      return;
    }

    const previousSource = getTextSource(node);
    const rawValue = node.textContent;

    if (!previousSource || !translatedSourceMatches(rawValue, previousSource)) {
      setTextSource(node, rawValue);
    }

    const source = getTextSource(node);
    const translated = translateExact(source, getCurrentLanguage());

    if (normalize(rawValue) !== normalize(translated)) {
      node.textContent = preserveSpacing(source, translated);
    }
  };

  const translateAttributes = (element) => {
    const sources = getAttrSources(element);

    TEXT_ATTRIBUTES.forEach((attributeName) => {
      if (!element.hasAttribute(attributeName)) {
        return;
      }

      const currentValue = element.getAttribute(attributeName) ?? "";
      const sourceValue = sources[attributeName];

      if (!sourceValue || !translatedSourceMatches(currentValue, sourceValue)) {
        sources[attributeName] = currentValue;
      }

      const translated = translateExact(sources[attributeName], getCurrentLanguage());
      if (currentValue !== translated) {
        element.setAttribute(attributeName, translated);
      }
    });
  };

  const shouldSkipNode = (node) => {
    const parent = node.parentElement;
    return Boolean(
      parent?.closest("script, style, noscript") ||
        parent?.hasAttribute("data-lang-switcher") ||
        parent?.closest("[data-lang-switcher]")
    );
  };

  const translateTree = (root = document) => {
    if (!root) {
      return;
    }

    const attributeTargets =
      root.nodeType === Node.ELEMENT_NODE
        ? [root, ...root.querySelectorAll("*")]
        : root.querySelectorAll?.("*") ?? [];

    attributeTargets.forEach((element) => translateAttributes(element));

    const walker = document.createTreeWalker(
      root.nodeType === Node.DOCUMENT_NODE ? document.documentElement : root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }

    document.documentElement.lang = getCurrentLanguage();
    document.body?.setAttribute("data-site-language", getCurrentLanguage());
  };

  const buildSwitcher = () => {
    const switcher = document.createElement("div");
    switcher.className = "lang-switcher";
    switcher.setAttribute("data-lang-switcher", "true");
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", message("languageSwitcherAria"));

    [
      { code: "ru", label: "RU" },
      { code: "en", label: "EN" }
    ].forEach(({ code, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lang-switcher__button";
      button.dataset.langValue = code;
      button.textContent = label;
      button.addEventListener("click", () => {
        setLanguage(code);
      });
      switcher.append(button);
    });

    return switcher;
  };

  const syncSwitchers = () => {
    document.querySelectorAll("[data-lang-switcher]").forEach((switcher) => {
      switcher.setAttribute("aria-label", message("languageSwitcherAria"));
      switcher.querySelectorAll("[data-lang-value]").forEach((button) => {
        const isActive = button.dataset.langValue === getCurrentLanguage();
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    });
  };

  const initEmbeddedPreviewMode = () => {
    const params = new URLSearchParams(window.location.search);
    const isEmbedded = params.get("embed") === "1" || window.self !== window.top;

    if (!isEmbedded) {
      return;
    }

    document.body?.classList.add("is-embed-preview");
  };

  const mountSwitcher = (container, positioner) => {
    if (!container || container.querySelector("[data-lang-switcher]")) {
      return;
    }

    positioner(buildSwitcher());
  };

  const syncPreviewFrame = (frame, language) => {
    try {
      frame.contentWindow?.WebfactoryI18n?.setLanguage?.(language, { broadcast: false });
    } catch (error) {
      // Ignore access issues while the iframe is still booting or is cross-context.
    }

    try {
      frame.contentWindow?.postMessage(
        {
          type: "webfactory:set-language",
          language
        },
        "*"
      );
    } catch (error) {
      // Ignore cross-context delivery issues in sandboxed preview frames.
    }
  };

  const syncEmbeddedPreviews = (language) => {
    document.querySelectorAll("iframe").forEach((frame) => {
      syncPreviewFrame(frame, language);
    });
  };

  const injectSwitchers = () => {
    const headerInner = document.querySelector(".site-header__inner");
    mountSwitcher(headerInner, (switcher) => {
      const before = headerInner.querySelector(".site-header__cta") || headerInner.querySelector(".nav-toggle");
      if (before) {
        headerInner.insertBefore(switcher, before);
        return;
      }
      headerInner.append(switcher);
    });

    const demoBarLinks = document.querySelector(".site-demo-bar__links");
    mountSwitcher(demoBarLinks, (switcher) => {
      demoBarLinks.append(switcher);
    });

    const crmActions = document.querySelector(".crm-topbar__actions");
    mountSwitcher(crmActions, (switcher) => {
      crmActions.prepend(switcher);
    });

    syncSwitchers();
  };

  const setLanguage = (language, options = {}) => {
    const { broadcast = true } = options;
    const nextLanguage = LANGUAGES.includes(language) ? language : "ru";
    window.localStorage?.setItem(STORAGE_KEY, nextLanguage);
    syncSwitchers();
    translateTree(document);
    if (broadcast) {
      syncEmbeddedPreviews(nextLanguage);
    }
    window.dispatchEvent(
      new CustomEvent("webfactory:languagechange", {
        detail: { language: nextLanguage }
      })
    );
  };

  let translateScheduled = false;
  const scheduleTranslate = () => {
    if (translateScheduled) {
      return;
    }

    translateScheduled = true;
    window.requestAnimationFrame(() => {
      translateScheduled = false;
      translateTree(document);
    });
  };

  const initObserver = () => {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node);
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node);
          }
        });
      });

      scheduleTranslate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  const initFrameLanguageSync = () => {
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "webfactory:set-language") {
        return;
      }

      const nextLanguage = LANGUAGES.includes(event.data.language) ? event.data.language : "ru";
      setLanguage(nextLanguage, { broadcast: false });
    });
  };

  const initIframeLoadSync = () => {
    document.querySelectorAll("iframe").forEach((frame) => {
      if (frame.dataset.langSyncBound === "true") {
        return;
      }

      frame.dataset.langSyncBound = "true";
      frame.addEventListener("load", () => {
        syncPreviewFrame(frame, getCurrentLanguage());
      });
    });
  };

  const initStorageSync = () => {
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const nextLanguage = LANGUAGES.includes(event.newValue) ? event.newValue : "ru";
      setLanguage(nextLanguage, { broadcast: false });
    });
  };

  window.WebfactoryI18n = {
    get language() {
      return getCurrentLanguage();
    },
    text,
    message,
    setLanguage,
    translateTree,
    syncSwitchers
  };

  const boot = () => {
    initEmbeddedPreviewMode();
    injectSwitchers();
    translateTree(document);
    initObserver();
    initStorageSync();
    initFrameLanguageSync();
    initIframeLoadSync();
    syncEmbeddedPreviews(getCurrentLanguage());
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

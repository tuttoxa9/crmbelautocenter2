# АНАЛИЗ ПРОЕКТА ЗАВЕРШЁН

**Полный детальный отчёт по архитектуре и логике CRM "crmbelautocenter2"**

## 1. Архитектура и структура папок
Проект написан на **Next.js 15 (App Router)** с использованием **TypeScript** и стилизацией через **Tailwind CSS**. В качестве основного бэкенда (БД и Аутентификация) используется **Firebase**. Для файлового менеджера — **Cloudflare R2 (через S3 API)**.

Основная структура в папке `src/`:
*   `app/` — Главные маршруты приложения:
    *   `(dashboard)/` — Закрытая часть (авторизованная зона CRM).
        *   `leads/` — Страница с общим видом лидов (таблицей и карточками).
        *   `files/` — Модуль файлового менеджера.
        *   `settings/` — Страница настроек.
    *   `api/` — Серверные эндпоинты (API Routes).
    *   `login/` — Авторизация.
*   `components/` — Модульный UI:
    *   `files/` — Компоненты файловой системы (загрузка, корзина, компрессия видео).
    *   `layout/` — Структура интерфейса (сайдбар, меню).
    *   `leads/` — Таблицы, бейджи статусов, предпросмотры, логика отображения лидов.
    *   `ui/` — Переиспользуемые атомарные элементы (кнопки, диалоги, инпуты на базе `shadcn/ui`).
*   `lib/` — Данные и бизнес-логика:
    *   `firebase.ts` / `firebaseAdmin.ts` — Инициализация подключения.
    *   `leadService.ts` — Все CRUD операции с лидами в firestore.
    *   `types.ts` — Строгие TypeScript-интерфейсы и типы.
    *   `s3.ts` — Конфигурация клиента Cloudflare R2 под S3.

## 2. Хранение лидов (база данных, модели, таблицы)
Все лиды хранятся в **Firebase Firestore** в корневой коллекции `leads`.

Согласно интерфейсам в `src/lib/types.ts`, основная модель (`Lead`) состоит из:
*   `id` — Уникальный ID документа.
*   `name` — Имя клиента.
*   `phone` — Телефонный номер.
*   `car` — Интересующий автомобиль.
*   `source` — Источник `LeadSource` (site, instagram, tiktok, kufar, call, zapier, telegram, walk_in).
*   `status` — Статус воронки `LeadStatus` (new, in_progress, visit, refusal, bank_refusal, success, no_answer, spam, thinking, callback).
*   `nextActionDate` — Дата следующего касания/перезвона (timestamp).
*   `notes` — Текстовые заметки для менеджеров.
*   `history` — Массив объектов изменения статусов (лог: кто, когда и какой статус установил).
*   `payload` — Динамический JSON-объект, в котором записываются все исходные (сырые) данные: например, ответы и метки (UTM) из рекламных форм или от Zapier.

## 3. API-роуты и Serverless-функции
В папке `src/app/api/` реализованы 8 серверных функций:

**Для приема лидов:**
*   `POST /api/webhook/lead/route.ts` — Единственный входной шлюз для всех лидов извне.

**Для файлового менеджера (S3 Cloudflare R2):**
*   `POST /api/s3/create-folder`
*   `POST /api/s3/delete`
*   `GET  /api/s3/download`
*   `GET  /api/s3/list`
*   `POST /api/s3/presigned` (генерация Presigned URL для прямой загрузки файлов)
*   `POST /api/s3/rename`
*   `POST /api/s3/upload`

## 4. Логика обработки и сохранения лидов (Webhook)
В проекте сейчас обрабатываются внешние лиды **напрямую в Webhook**, но зачастую через прослойку (например, Zapier или сайт).
Логика Endpoint-а (`/api/webhook/lead`):
1.  **Авторизация**: Запрос валидируется через заголовок `Authorization: Bearer <WEBHOOK_SECRET>`.
2.  **Детекция источника**: Если передано `source: "zapier"` или `"telegram"` (то есть базовые интеграторы), скрипт парсит всё тело запроса как строку. Если в данных встречаются слова (`"instagram"`, `"ig"`, `"tiktok"`, `"tik tok"`, `"site"`, `"kufar"`), скрипт **автоматически меняет источник** на нужный.
3.  **Создание объекта**: Если в поле `notes` передается подпись "Получено через API", она автоматически очищается. Ставится статус `new`.
4.  **Запись в лог**: Инициализируется History-запись ("Создание лида", автор: "API Webhook").
5.  **Добавление в БД**: Через серверный `adminDb` (Firebase Admin SDK) лид моментально добавляется в коллекцию `leads`.

## 5. Интеграции с Meta, TikTok и рекламными кампаниями
Прямых (native API) интеграций или встроенных скриптов Meta Pixel/TikTok Pixel внутри кода самой CRM **не существует**. CRM функционирует математически как "пассивная воронка" приема.
Все рекламные кампании, Lead-формы Meta или TikTok пересылают данные сюда двумя путями:
*   Они интегрированы через **Zapier**, который формирует JSON и стреляет в Webhook CRM.
*   Они отправляются собственным бэкендом сайта (`belautocenter2`).
Все трафиковые метки и поля из форм пробрасываются в поле `payload` без потерь, где их в дальнейшем видит менеджер.

## 6. Environment Variables (.env)
Ожидаемые переменные окружения:

**Firebase Admin (Для записи из API):**
*   `FIREBASE_PROJECT_ID`
*   `FIREBASE_CLIENT_EMAIL`
*   `FIREBASE_PRIVATE_KEY`

**Firebase Client (Для клиента UI):**
*   `NEXT_PUBLIC_FIREBASE_API_KEY`
*   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
*   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
*   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
*   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
*   `NEXT_PUBLIC_FIREBASE_APP_ID`

**Облачное хранилище (Cloudflare R2 API):**
*   `CLOUDFLARE_R2_ENDPOINT`
*   `CLOUDFLARE_R2_ACCESS_KEY_ID`
*   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
*   `CLOUDFLARE_R2_BUCKET_NAME`
*   `NEXT_PUBLIC_CLOUDFLARE_R2_DEV_URL`

**Безопасность:**
*   `WEBHOOK_SECRET` — Bearer токен для Webhook.

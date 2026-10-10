# InniConstr — конструктор тем для MP3-плеера Innoasis Y1

Колледж-проект по веб-разработке. Backend (API) для сайта-конструктора тем
MP3-плеера: регистрация, загрузка своих тем со спрайтами, модерация тем
администратором, поиск и сортировка.

## Стек

- Node.js + Express 4
- SQLite (sqlite3 + sqlite) — файл `data/data.db`, схема в `src/db/schema.sql`
- JWT-авторизация (`bcryptjs` для паролей)
- `multer` — загрузка спрайтов и превью

## Структура

```
src/
  index.js                точка входа, монтирование роутов
  db/
    index.js              подключение к SQLite + низкоуровневые хелперы
    schema.sql            схема БД (8 таблиц)
    repositories/         CRUD-слой: users, roles, themes, elements, tags, moderation
  routes/                 auth, themes, admin, uploads, tags
  middleware/             auth (JWT, роли), upload (multer)
  utils/                  passwords, validate, constants
scripts/
  seed.js                 создаёт админа и модератора
data/                     файл БД (в git не попадает)
uploads/                  загруженные спрайты и превью (в git не попадают)
```

## Запуск

```bash
npm install

# настроить .env (пример уже есть в корне):
#   PORT=3000
#   JWT_SECRET=<случайная строка>
#   DB_PATH=./data/data.db
#   UPLOAD_DIR=./uploads

# создание админа (admin/admin123456) и модератора (moderator/moder123456)
npm run seed

# dev-сервер с автоперезапуском
npm run dev
# или обычный старт
npm start
```

Сервер: http://localhost:3000, файлы отдаются из `/uploads/...`.

## Роли

- `user` — регистрируется, создаёт темы, отправляет их на модерацию
- `moderator` — видит очередь, одобряет/отклоняет темы
- `admin` — всё, что может модератор + журнал модерации и управление пользователями/ролями

## Статусы темы

`draft` → `pending` → `approved` | `rejected` (после правки отклонённую тему можно
снова отправить на проверку).

## Основные эндпоинты API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET|PUT /api/auth/me`
- `GET /api/themes` — поиск и сортировка (`q`, `sort=date|title|author|created`,
  `order=asc|desc`, `limit`, `offset`)
- `POST /api/themes`, `GET|PUT|DELETE /api/themes/:id`, `POST /api/themes/:id/submit`
- `GET|POST /api/themes/:id/elements`, `PUT|DELETE /api/themes/:id/elements/:elementId`
- `POST /api/uploads/sprite`, `POST /api/uploads/preview` (multipart)
- `GET /api/tags`
- Админка: `GET /api/admin/pending`, `POST /api/admin/themes/:id/approve|reject`,
  `GET /api/admin/log`, `GET /api/admin/users`, управление ролями (`/api/admin/users/:id/roles`)

Полное описание схемы API оформляется отдельно.
// Генератор Word-документа «Схема REST API» для проекта InnoConstr.
// Запуск: npm run docs  →  docs/API_InnoConstr.docx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'API_InnoConstr.docx');

const ACCENT = '1F4E79'; // тёмно-синий
const ACCENT_LIGHT = 'D9E2F3'; // светло-синий
const ZEBRA = 'F2F6FB';
const BORDER = '9CB4D0';
const GREY = '595959';

const METHOD_COLOR = {
  POST: '1E7D32', // зелёный
  GET: '0B5FCC', // синий
  PUT: 'B25E00', // оранжевый
  DELETE: 'C0392B', // красный
};

const tw = (cm) => Math.round(cm * 567); // см → твипсы
const now = new Date().toLocaleDateString('ru-RU');

// ---------- базовые блоки ----------

const h1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text })] });
const h2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text })] });

const p = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });

const code = (text) =>
  new Paragraph({
    shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text, font: 'Consolas', size: 19, color: '1F1F1F' })],
  });

const spacer = (after = 80) =>
  new Paragraph({ children: [], spacing: { after } });

function cell(text, { bold = false, fill = null, widthCm = null, align = AlignmentType.LEFT } = {}) {
  const paragraphs = (Array.isArray(text) ? text : [text]).map(
    (line) =>
      new Paragraph({
        alignment: align,
        spacing: { after: 40, line: 240 },
        children: [new TextRun({ text: line, bold, size: 20 })],
      })
  );
  return new TableCell({
    width: widthCm ? { size: widthCm, type: WidthType.CM } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: tw(0.12), bottom: tw(0.12), left: tw(0.15), right: tw(0.15) },
    children: paragraphs,
  });
}

function makeTable(headers, rows, widthsCm, { zebra = true } = {}) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, { bold: true, fill: ACCENT_LIGHT, widthCm: widthsCm[i] })
    ),
  });
  const bodyRows = rows.map((r, idx) =>
    new TableRow({
      children: r.map((c, i) =>
        cell(c, { fill: zebra && idx % 2 === 1 ? ZEBRA : null, widthCm: widthsCm[i] })
      ),
    })
  );
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widthsCm.map((w) => tw(w)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'C9D8EA' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'C9D8EA' },
    },
    rows: [headerRow, ...bodyRows],
  });
}

// ---------- описание эндпоинта ----------

function endpoint({ title, method, pathStr, access, query = [], bodyFields = [], bodyNote, response, errors }) {
  const items = [];
  const methodColor = METHOD_COLOR[method] || GREY;

  items.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({ text: method, bold: true, color: methodColor, size: 24 }),
        new TextRun({ text: '  ', size: 24 }),
        new TextRun({ text: pathStr, font: 'Consolas', bold: true, size: 22, color: '1A1A1A' }),
        new TextRun({ text: `  —  ${title}`, italics: true, size: 22, color: GREY }),
      ],
    })
  );

  const def = [
    ['Доступ', access],
    ['Метод / путь', `${method} ${pathStr}`],
  ];
  if (query.length) {
    def.push(['Query-параметры', query.map((q) => `${q[0]} — ${q[1]}`).join(';  ')]);
  }
  if (bodyNote) def.push(['Тело запроса', bodyNote]);
  def.push(['Ответ', response]);
  def.push(['Ошибки', errors]);

  items.push(makeTable(['Поле', 'Описание'], def.map((d) => [d[0], d[1]]), [3.6, 12.9]));

  if (bodyFields.length) {
    items.push(spacer(60));
    items.push(
      makeTable(
        ['Поле', 'Тип', 'Обязательное', 'Описание'],
        bodyFields.map((f) => [f[0], f[1], f[2], f[3]]),
        [3.4, 1.8, 2.6, 8.7]
      )
    );
  }
  return items;
}

// ---------- сборка документа ----------

const children = [];

// Титульный блок
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 200 },
    children: [new TextRun({ text: 'InnoConstr', bold: true, size: 72, color: ACCENT })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: 'Конструктор тем для MP3-плеера Innoasis Y1',
        size: 28,
        color: GREY,
      }),
    ],
  }),
  spacer(200),
  makeTable(
    ['Параметр', 'Значение'],
    [
      ['Тип документа', 'Схема REST API (бэкенд)'],
      ['Стек', 'Node.js, Express 4, SQLite, JWT, multer'],
      ['Базовый URL', 'http://localhost:3000'],
      ['Дата', now],
    ],
    [4.5, 12]
  ),
  spacer(200),
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: 'Документ описывает все эндпоинты сервера: метод, путь, права доступа, параметры запроса, формат ответа и коды ошибок.',
        size: 22,
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// 1. Общие сведения
children.push(h1('1. Общие сведения'));
children.push(
  p('Формат обмена данными — JSON. При успехе сервер возвращает результат, при ошибке — объект вида {"error": "текст ошибки"} с соответствующим HTTP-кодом.')
);
children.push(h2('1.1 Авторизация'));
children.push(p('Доступ к защищённым маршрутам выполняется заголовком:'));
children.push(code('Authorization: Bearer <token>'));
children.push(
  p('Токен (JWT) выдаётся при регистрации или входе, срок действия — 7 дней. Права проверяются на сервере для каждого запроса.')
);
children.push(h2('1.2 Роли пользователей'));
children.push(
  makeTable(
    ['Роль', 'Права'],
    [
      ['user', 'Регистрация, создание тем, загрузка спрайтов, отправка тем на модерацию'],
      ['moderator', 'Всё, что user; просмотр очереди, одобрение/отклонение тем, журнал модерации'],
      ['admin', 'Всё, что moderator; журнал, управление пользователями и ролями, удаление пользователей'],
    ],
    [3.2, 13.3]
  )
);
children.push(spacer());
children.push(h2('1.3 Статусы темы'));
children.push(
  p('draft (черновик) → отправка на модерацию → pending → approve → approved (тема появляется в публичном каталоге) или reject → rejected (автор видит причину и может отправить снова). Одобренную тему изменить нельзя.')
);
children.push(h2('1.4 Типы элементов темы (спрайты)'));
children.push(
  p('background, play_button, pause_button, next_button, prev_button, volume, progress_bar, album_art, menu_icon, text_label. На один тип элемента приходится один спрайт.')
);
children.push(h2('1.5 Коды ответов'));
children.push(
  makeTable(
    ['Код', 'Значение'],
    [
      ['200 / 201', 'Успех (201 — создание новой сущности)'],
      ['400', 'Невалидные данные запроса (отсутствуют/некорректны поля)'],
      ['401', 'Нет токена или токен невалиден'],
      ['403', 'Недостаточно прав / не ваша тема'],
      ['404', 'Сущность или маршрут не найдены'],
      ['409', 'Конфликт (логин или email уже занят)'],
      ['500', 'Внутренняя ошибка сервера'],
    ],
    [2.4, 14.1]
  )
);

// 2. Авторизация
children.push(h1('2. Авторизация'));
children.push(
  ...endpoint({
    title: 'Регистрация',
    method: 'POST',
    pathStr: '/api/auth/register',
    access: 'Публично',
    bodyNote: 'JSON',
    bodyFields: [
      ['username', 'string', 'да', 'Логин: 3–30 символов, буквы/цифры/нижнее подчёркивание'],
      ['email', 'string', 'да', 'Email, базовая проверка формата'],
      ['password', 'string', 'да', 'Пароль, минимум 6 символов'],
    ],
    response: '201: {"token": "<JWT>", "user": {"id": 1, "username": "user"}}',
    errors: '400 — невалидные данные; 409 — логин/email занят',
  }),
  ...endpoint({
    title: 'Вход',
    method: 'POST',
    pathStr: '/api/auth/login',
    access: 'Публично',
    bodyNote: 'JSON',
    bodyFields: [
      ['login', 'string', 'да', 'Логин или email'],
      ['password', 'string', 'да', 'Пароль'],
    ],
    response:
      '200: {"token": "<JWT>", "user": {"id": 1, "username": "user", "roles": ["user"]}}',
    errors: '401 — неверный логин/пароль или пользователь отключён',
  }),
  ...endpoint({
    title: 'Текущий пользователь',
    method: 'GET',
    pathStr: '/api/auth/me',
    access: 'Требуется токен',
    response:
      '200: {"id": 1, "username": "user", "email": "u@mail.com", "created_at": "...", "is_active": 1, "roles": ["user"]}',
    errors: '401 — нет токена; 404 — пользователь не найден',
  }),
  ...endpoint({
    title: 'Обновление профиля',
    method: 'PUT',
    pathStr: '/api/auth/me',
    access: 'Требуется токен',
    bodyNote: 'JSON (все поля необязательны)',
    bodyFields: [
      ['email', 'string', 'нет', 'Новый email'],
      ['currentPassword', 'string', 'при смене пароля', 'Текущий пароль для подтверждения'],
      ['newPassword', 'string', 'нет', 'Новый пароль (минимум 6 символов)'],
    ],
    response: '200: {"ok": true}',
    errors: '400 — невалидные данные; 403 — неверный текущий пароль; 409 — email занят',
  })
);

// 3. Темы
children.push(h1('3. Темы'));
children.push(
  ...endpoint({
    title: 'Каталог одобренных тем (поиск и сортировка)',
    method: 'GET',
    pathStr: '/api/themes',
    access: 'Публично',
    query: [
      ['q', 'поиск по названию темы или имени автора (LIKE)'],
      ['sort', 'date | title | author | created (по умолчанию date)'],
      ['order', 'asc | desc (по умолчанию desc)'],
      ['limit', 'размер страницы, максимум 100 (по умолчанию 20)'],
      ['offset', 'смещение для пагинации (по умолчанию 0)'],
    ],
    response:
      '200: {"items": [{"id": 1, "title": "...", "description": "...", "preview_image": null, "published_at": "...", "author_id": 1, "author": "user"}], "total": 5, "limit": 20, "offset": 0}',
    errors: '—',
  }),
  ...endpoint({
    title: 'Мои темы',
    method: 'GET',
    pathStr: '/api/themes/my/list',
    access: 'Требуется токен',
    response:
      '200: [{"id": 1, "title": "...", "status": "draft", "reject_reason": null, "preview_image": null, "created_at": "...", "published_at": null}]',
    errors: '401 — нет токена',
  }),
  ...endpoint({
    title: 'Тема детально (с элементами и тегами)',
    method: 'GET',
    pathStr: '/api/themes/:id',
    access:
      'Токен необязателен. Одобренная тема видна всем; draft/pending/rejected — только автору или moderator/admin',
    response:
      '200: {…поля темы, "author": "user", "elements": [{...}], "tags": [{"id": 1, "name": "neon"}]}',
    errors: '404 — тема не найдена; 403 — нет доступа к неопубликованной теме',
  }),
  ...endpoint({
    title: 'Создание темы',
    method: 'POST',
    pathStr: '/api/themes',
    access: 'Требуется токен',
    bodyNote: 'JSON',
    bodyFields: [
      ['title', 'string', 'да', 'Название темы (до 100 символов)'],
      ['description', 'string', 'нет', 'Описание'],
      ['status', 'string', 'нет', 'draft (по умолчанию) или pending'],
      ['elements', 'array', 'нет', 'Список элементов темы, см. раздел 4'],
      ['tags', 'array', 'нет', 'Список строк — названия тегов'],
    ],
    response: '201: {"id": 1}',
    errors: '401 — нет токена; 400 — невалидные данные',
  }),
  ...endpoint({
    title: 'Обновление темы',
    method: 'PUT',
    pathStr: '/api/themes/:id',
    access: 'Только автор, статус «не approved»',
    bodyNote: 'JSON (все поля необязательны)',
    bodyFields: [
      ['title', 'string', 'нет', 'Новое название'],
      ['description', 'string', 'нет', 'Новое описание'],
      ['preview_image', 'string', 'нет', 'URL превью (/uploads/previews/...)'],
      ['tags', 'array', 'нет', 'Полный новый набор тегов (заменяет старый)'],
    ],
    response: '200: {"ok": true}',
    errors: '403 — не автор; 400 — тему нельзя править в этом статусе',
  }),
  ...endpoint({
    title: 'Удаление темы',
    method: 'DELETE',
    pathStr: '/api/themes/:id',
    access: 'Автор или admin',
    response: '200: {"ok": true}',
    errors: '404 — не найдена; 403 — нет доступа',
  }),
  ...endpoint({
    title: 'Отправка на модерацию',
    method: 'POST',
    pathStr: '/api/themes/:id/submit',
    access: 'Только автор, статус draft или rejected',
    response: '200: {"ok": true} (статус меняется на pending)',
    errors: '403 — не автор; 400 — нельзя отправить в текущем статусе',
  })
);

// 4. Элементы темы
children.push(h1('4. Элементы темы (спрайты)'));
children.push(
  ...endpoint({
    title: 'Список элементов темы',
    method: 'GET',
    pathStr: '/api/themes/:id/elements',
    access: 'Правила доступа как у GET /api/themes/:id',
    response:
      '200: [{"id": 1, "theme_id": 1, "element_type": "play_button", "sprite_url": "/uploads/sprites/x.png", "pos_x": 100, "pos_y": 200, "width": 32, "height": 32, "z_index": 3}]',
    errors: '404 — тема не найдена; 403 — нет доступа',
  }),
  ...endpoint({
    title: 'Добавить/обновить элемент',
    method: 'POST',
    pathStr: '/api/themes/:id/elements',
    access: 'Только автор, статус «не approved»',
    bodyNote: 'JSON. Работает как upsert: обновляет элемент по паре (theme_id, element_type)',
    bodyFields: [
      ['element_type', 'string', 'да', 'Один из фиксированных типов (см. раздел 1.4)'],
      ['sprite_url', 'string', 'да', 'Путь к загруженному спрайту (/uploads/sprites/...)'],
      ['pos_x / pos_y', 'integer', 'нет', 'Координаты размещения (по умолчанию 0)'],
      ['width / height', 'integer', 'нет', 'Размеры (по умолчанию 0)'],
      ['z_index', 'integer', 'нет', 'Порядок слоя (по умолчанию 0)'],
    ],
    response: '201: обновлённый список всех элементов темы',
    errors: '400 — невалидные данные; 403 — не автор',
  }),
  ...endpoint({
    title: 'Обновить элемент',
    method: 'PUT',
    pathStr: '/api/themes/:id/elements/:elementId',
    access: 'Только автор, статус «не approved»',
    bodyNote: 'JSON, обновляются только переданные поля',
    bodyFields: [
      ['sprite_url', 'string', 'нет', 'Новый путь к спрайту'],
      ['pos_x', 'integer', 'нет', 'Новая координата X'],
      ['pos_y', 'integer', 'нет', 'Новая координата Y'],
      ['width', 'integer', 'нет', 'Новая ширина'],
      ['height', 'integer', 'нет', 'Новая высота'],
      ['z_index', 'integer', 'нет', 'Новый порядок слоя'],
    ],
    response: '200: {"ok": true}',
    errors: '404 — элемент не найден в этой теме; 403 — не автор',
  }),
  ...endpoint({
    title: 'Удалить элемент',
    method: 'DELETE',
    pathStr: '/api/themes/:id/elements/:elementId',
    access: 'Только автор, статус «не approved»',
    response: '200: {"ok": true}',
    errors: '404 — элемент не найден; 403 — не автор',
  })
);

// 5. Загрузка файлов
children.push(h1('5. Загрузка файлов'));
children.push(
  ...endpoint({
    title: 'Загрузка спрайта',
    method: 'POST',
    pathStr: '/api/uploads/sprite',
    access: 'Требуется токен',
    bodyNote: 'multipart/form-data',
    bodyFields: [['file', 'file', 'да', 'Изображение: png, jpeg, webp или gif, до 5 МБ']],
    response: '201: {"url": "/uploads/sprites/….png", "filename": "….png", "size": 1234}',
    errors: '400 — не изображение или файл больше 5 МБ; 401 — нет токена',
  }),
  ...endpoint({
    title: 'Загрузка превью темы',
    method: 'POST',
    pathStr: '/api/uploads/preview',
    access: 'Требуется токен',
    bodyNote: 'multipart/form-data',
    bodyFields: [['file', 'file', 'да', 'Изображение: png, jpeg, webp или gif, до 5 МБ']],
    response: '201: {"url": "/uploads/previews/….png", ...}',
    errors: '400 — не изображение или файл больше 5 МБ; 401 — нет токена',
  })
);

// 6. Теги
children.push(h1('6. Теги'));
children.push(
  ...endpoint({
    title: 'Справочник тегов',
    method: 'GET',
    pathStr: '/api/tags',
    access: 'Публично',
    response: '200: [{"id": 1, "name": "neon"}, {"id": 2, "name": "dark"}]',
    errors: '—',
  })
);

// 7. Администрирование
children.push(h1('7. Администрирование'));
children.push(
  p('Все маршруты раздела требуют токен и роль admin или moderator (исключения помечены).')
);
children.push(
  ...endpoint({
    title: 'Очередь на модерацию',
    method: 'GET',
    pathStr: '/api/admin/pending',
    access: 'admin, moderator',
    response: '200: список тем со статусом pending (самые старые первыми)',
    errors: '401/403',
  }),
  ...endpoint({
    title: 'Одобрить тему',
    method: 'POST',
    pathStr: '/api/admin/themes/:id/approve',
    access: 'admin, moderator',
    bodyNote: 'JSON: {"comment": "..."} — комментарий (необязателен)',
    response:
      '200: {"ok": true}. Статус → approved, проставляется published_at, запись в журнале',
    errors: '404 — не найдена; 400 — тема не в статусе pending',
  }),
  ...endpoint({
    title: 'Отклонить тему',
    method: 'POST',
    pathStr: '/api/admin/themes/:id/reject',
    access: 'admin, moderator',
    bodyNote: 'JSON: {"comment": "причина отклонения"}',
    response: '200: {"ok": true}. Статус → rejected, причина видна автору',
    errors: '404 — не найдена; 400 — тема не в статусе pending',
  }),
  ...endpoint({
    title: 'История модерации темы',
    method: 'GET',
    pathStr: '/api/admin/themes/:id/history',
    access: 'admin, moderator',
    response: '200: записи журнала по конкретной теме',
    errors: '401/403',
  }),
  ...endpoint({
    title: 'Журнал модерации',
    method: 'GET',
    pathStr: '/api/admin/log',
    access: 'только admin',
    response: '200: последние 100 записей журнала',
    errors: '403 — недостаточно прав',
  }),
  ...endpoint({
    title: 'Справочник ролей',
    method: 'GET',
    pathStr: '/api/admin/roles',
    access: 'admin, moderator',
    response: '200: [{"id": 1, "name": "user", "description": "..."}, ...]',
    errors: '401/403',
  }),
  ...endpoint({
    title: 'Список пользователей',
    method: 'GET',
    pathStr: '/api/admin/users',
    access: 'только admin',
    query: [
      ['limit', 'максимум 200 (по умолчанию 50)'],
      ['offset', 'смещение (по умолчанию 0)'],
    ],
    response:
      '200: [{"id": 1, "username": "...", "email": "...", "created_at": "...", "is_active": 1, "roles": ["user", "admin"]}]',
    errors: '403 — недостаточно прав',
  }),
  ...endpoint({
    title: 'Выдать роль',
    method: 'POST',
    pathStr: '/api/admin/users/:id/roles',
    access: 'только admin',
    bodyFields: [['role', 'string', 'да', 'user | moderator | admin']],
    response: '200: {"ok": true, "roles": ["user", "admin"]}',
    errors: '400 — неизвестная роль; 404 — пользователь не найден; 403',
  }),
  ...endpoint({
    title: 'Забрать роль',
    method: 'DELETE',
    pathStr: '/api/admin/users/:id/roles/:role',
    access: 'только admin',
    response: '200: {"ok": true, "roles": [...]}',
    errors: '403',
  }),
  ...endpoint({
    title: 'Удалить пользователя',
    method: 'DELETE',
    pathStr: '/api/admin/users/:id',
    access: 'только admin',
    response: '200: {"ok": true}. Каскадно удаляются его темы, элементы, теги и связки',
    errors: '400 — нельзя удалить самого себя; 404 — не найден; 403',
  })
);

// 8. Пример
children.push(h1('8. Пример сценария: регистрация → тема → модерация'));
const flow = [
  '1) POST /api/auth/register → получаем "token"',
  '2) POST /api/uploads/sprite → получаем "url" спрайта',
  '3) POST /api/themes  {"title": "...", "elements": [{"element_type": "play_button", "sprite_url": "<url>"}]}',
  '4) POST /api/themes/:id/submit → статус pending',
  '5) GET /api/admin/pending (admin) → POST /api/admin/themes/:id/approve → тема в GET /api/themes',
];
for (const line of flow) children.push(code(line));

children.push(spacer(60));
children.push(
  new Paragraph({
    children: [
      new TextRun({
        text: `Сгенерировано автоматически · ${now} · github.com/Adamqqaa/WEB_InniConstruct`,
        size: 18,
        color: '808080',
      }),
    ],
  })
);

// ---------- документ ----------
const doc = new Document({
  creator: 'InnoConstr',
  title: 'Схема REST API — InnoConstr',
  description: 'REST API конструктора тем для MP3-плеера Innoasis Y1',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: '333333' } },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 30, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 320, after: 140 }, keepNext: true },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, color: '2E74B5' },
        paragraph: { spacing: { before: 240, after: 100 }, keepNext: true },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 23, bold: true, color: '404040' },
        paragraph: { spacing: { before: 180, after: 80 }, keepNext: true },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: tw(1.7), right: tw(1.9), bottom: tw(1.7), left: tw(1.9) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'InnoConstr · Схема REST API',
                  size: 18,
                  color: '9AA5B1',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Страница ', size: 18, color: '808080' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080' }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buffer);
console.log('Готово:', OUT, `(${buffer.length} байт)`);
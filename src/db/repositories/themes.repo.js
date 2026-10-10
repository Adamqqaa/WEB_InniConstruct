// Репозиторий тем.
import { query, queryOne, execute, insert } from '../index.js';

// Белый список колонок для сортировки — защита от SQL-инъекции через ?sort=
const SORT_COLUMNS = {
  date: 't.published_at',
  created: 't.created_at',
  title: 't.title',
  author: 'u.username',
};

/** Создать тему, вернуть id. */
export function create({ authorId, title, description = '', status = 'draft' }) {
  return insert(
    `INSERT INTO themes (author_id, title, description, status)
     VALUES (?, ?, ?, ?)`,
    [authorId, title, description, status]
  );
}

/** Сырая запись темы (без автора). */
export function findById(id) {
  return queryOne('SELECT * FROM themes WHERE id = ?', [id]);
}

/** Тема вместе с автором. */
export function findDetail(id) {
  return queryOne(
    `SELECT t.*, u.username AS author
       FROM themes t
       JOIN users u ON u.id = t.author_id
      WHERE t.id = ?`,
    [id]
  );
}

/** Публичный список одобренных тем с поиском и сортировкой. */
export function listApproved({ q = '', sort = 'date', order = 'desc', limit = 20, offset = 0 } = {}) {
  const col = SORT_COLUMNS[sort] || SORT_COLUMNS.date;
  const dir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const like = `%${q}%`;

  return query(
    `SELECT t.id, t.title, t.description, t.preview_image, t.published_at,
            u.id AS author_id, u.username AS author
       FROM themes t
       JOIN users u ON u.id = t.author_id
      WHERE t.status = 'approved'
        AND (t.title LIKE ? OR u.username LIKE ?)
      ORDER BY ${col} ${dir}, t.id DESC
      LIMIT ? OFFSET ?`,
    [like, like, limit, offset]
  );
}

/** Сколько всего тем подходит под фильтр (для пагинации). */
export function countApproved(q = '') {
  const like = `%${q}%`;
  return queryOne(
    `SELECT COUNT(*) AS c
       FROM themes t
       JOIN users u ON u.id = t.author_id
      WHERE t.status = 'approved'
        AND (t.title LIKE ? OR u.username LIKE ?)`,
    [like, like]
  );
}

/** Темы конкретного автора (включая черновики и отклонённые). */
export function listByAuthor(authorId) {
  return query(
    `SELECT id, title, status, reject_reason, preview_image, created_at, published_at
       FROM themes
      WHERE author_id = ?
      ORDER BY created_at DESC`,
    [authorId]
  );
}

/** Очередь модерации. */
export function listPending() {
  return query(
    `SELECT t.id, t.title, t.description, t.preview_image, t.created_at,
            u.username AS author
       FROM themes t
       JOIN users u ON u.id = t.author_id
      WHERE t.status = 'pending'
      ORDER BY t.created_at ASC`
  );
}

/** Обновить текстовые поля темы. */
export async function update(id, { title, description }) {
  await execute(
    `UPDATE themes
        SET title       = COALESCE(?, title),
            description = COALESCE(?, description)
      WHERE id = ?`,
    [title ?? null, description ?? null, id]
  );
}

/** Сменить статус (+ причина отклонения). */
export async function updateStatus(id, status, rejectReason = null) {
  await execute('UPDATE themes SET status = ?, reject_reason = ? WHERE id = ?', [
    status,
    rejectReason,
    id,
  ]);
}

/** Записать путь к превью. */
export async function setPreviewImage(id, previewImage) {
  await execute('UPDATE themes SET preview_image = ? WHERE id = ?', [previewImage, id]);
}

export async function remove(id) {
  await execute('DELETE FROM themes WHERE id = ?', [id]);
}

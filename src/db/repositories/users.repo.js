// Репозиторий пользователей.
// Здесь только работа с БД, без Express и бизнес-логики роутов.
import { query, queryOne, execute, insert } from '../index.js';

const PUBLIC_FIELDS = 'id, username, email, created_at, is_active';

/** Пользователь по id (без хеша пароля). */
export function findById(id) {
  return queryOne(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [id]);
}

/** Полная запись по id (включая password_hash) — только для внутренних нужд. */
export function findByIdWithSecret(id) {
  return queryOne('SELECT * FROM users WHERE id = ?', [id]);
}

/** Поиск по логину ИЛИ email (для входа). Возвращает вместе с хешем пароля. */
export function findByLogin(login) {
  return queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [login, login]);
}

/** Есть ли уже такой логин или email (для регистрации). */
export function findConflict(username, email) {
  return queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
}

/** Создать пользователя, вернуть id. */
export function create({ username, email, passwordHash }) {
  return insert(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash]
  );
}

/** Обновить email. */
export async function updateEmail(id, email) {
  await execute('UPDATE users SET email = ? WHERE id = ?', [email, id]);
}

/** Обновить хеш пароля. */
export async function updatePassword(id, passwordHash) {
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

/** Включить/выключить аккаунт. */
export async function setActive(id, isActive) {
  await execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

export async function remove(id) {
  await execute('DELETE FROM users WHERE id = ?', [id]);
}

/** Список пользователей с ролями (для админки). */
export function listWithRoles({ limit = 50, offset = 0 } = {}) {
  return query(
    `SELECT u.id, u.username, u.email, u.created_at, u.is_active,
            GROUP_CONCAT(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r      ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function count() {
  return queryOne('SELECT COUNT(*) AS c FROM users');
}

// Репозиторий ролей и связующей таблицы user_roles.
import { query, queryOne, execute } from '../index.js';

/** Все роли (справочник). */
export function list() {
  return query('SELECT id, name, description FROM roles ORDER BY id');
}

export function findByName(name) {
  return queryOne('SELECT * FROM roles WHERE name = ?', [name]);
}

/** Имена ролей пользователя. */
export async function getForUser(userId) {
  const rows = await query(
    `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.name);
}

/** Выдать роль. Возвращает false, если роли не существует. */
export async function assign(userId, roleName) {
  const role = await findByName(roleName);
  if (!role) return false;
  await execute(
    'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
    [userId, role.id]
  );
  return true;
}

/** Забрать роль. */
export async function remove(userId, roleName) {
  const role = await findByName(roleName);
  if (!role) return false;
  await execute('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [
    userId,
    role.id,
  ]);
  return true;
}

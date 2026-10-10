// Репозиторий тегов и связующей таблицы theme_tags.
import { query, queryOne, execute } from '../index.js';

export function listAll() {
  return query('SELECT id, name FROM tags ORDER BY name');
}

export function findByName(name) {
  return queryOne('SELECT * FROM tags WHERE name = ?', [name]);
}

export async function create(name) {
  const info = await execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name]);
  // sqlite-драйвер: если тег уже был, changes === 0 — тогда читаем его id
  if (info.changes === 0) return findByName(name);
  return { id: info.lastID, name };
}

/** Найти тег или создать его. */
export async function findOrCreate(name) {
  return (await findByName(name)) || (await create(name));
}

export async function attach(themeId, tagId) {
  await execute('INSERT OR IGNORE INTO theme_tags (theme_id, tag_id) VALUES (?, ?)', [
    themeId,
    tagId,
  ]);
}

export async function detach(themeId, tagId) {
  await execute('DELETE FROM theme_tags WHERE theme_id = ? AND tag_id = ?', [themeId, tagId]);
}

export function listByTheme(themeId) {
  return query(
    `SELECT tg.id, tg.name
       FROM theme_tags tt
       JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.theme_id = ?
      ORDER BY tg.name`,
    [themeId]
  );
}

/** Полностью заменить набор тегов у темы. */
export async function setForTheme(themeId, names = []) {
  await execute('DELETE FROM theme_tags WHERE theme_id = ?', [themeId]);
  const uniq = [...new Set(names.map((n) => String(n).trim().toLowerCase()).filter(Boolean))];
  for (const name of uniq) {
    const tag = await findOrCreate(name);
    await attach(themeId, tag.id);
  }
}

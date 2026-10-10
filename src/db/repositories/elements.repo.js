// Репозиторий элементов темы (спрайты).
//
// У элемента темы уникальна пара (theme_id, element_type) — на каждый элемент
// плеера (play_button, background и т.д.) приходится ровно один спрайт.
// Поэтому create() работает как «вставить или обновить» (upsert).
import { query, queryOne, execute } from '../index.js';

// Какие поля можно менять у элемента.
const EDITABLE = ['sprite_url', 'pos_x', 'pos_y', 'width', 'height', 'z_index'];

export function listByTheme(themeId) {
  return query(
    'SELECT * FROM theme_elements WHERE theme_id = ? ORDER BY z_index ASC, id ASC',
    [themeId]
  );
}

export function findById(id) {
  return queryOne('SELECT * FROM theme_elements WHERE id = ?', [id]);
}

/** Вставить или обновить элемент по (theme_id, element_type). */
export function upsert(themeId, el) {
  return execute(
    `INSERT INTO theme_elements
        (theme_id, element_type, sprite_url, pos_x, pos_y, width, height, z_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(theme_id, element_type) DO UPDATE SET
        sprite_url = excluded.sprite_url,
        pos_x      = excluded.pos_x,
        pos_y      = excluded.pos_y,
        width      = excluded.width,
        height     = excluded.height,
        z_index    = excluded.z_index`,
    [
      themeId,
      el.element_type,
      el.sprite_url,
      el.pos_x ?? 0,
      el.pos_y ?? 0,
      el.width ?? 0,
      el.height ?? 0,
      el.z_index ?? 0,
    ]
  );
}

/** Частичное обновление элемента по id. */
export async function update(id, fields) {
  const sets = [];
  const params = [];
  for (const key of EDITABLE) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (!sets.length) return;
  params.push(id);
  await execute(`UPDATE theme_elements SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function remove(id) {
  await execute('DELETE FROM theme_elements WHERE id = ?', [id]);
}

export async function removeByTheme(themeId) {
  await execute('DELETE FROM theme_elements WHERE theme_id = ?', [themeId]);
}

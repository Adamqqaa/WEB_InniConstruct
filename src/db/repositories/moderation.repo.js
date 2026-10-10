// Репозиторий журнала модерации.
import { query, insert } from '../index.js';

export function add({ themeId, moderatorId, action, comment = '' }) {
  return insert(
    `INSERT INTO moderation_log (theme_id, moderator_id, action, comment)
     VALUES (?, ?, ?, ?)`,
    [themeId, moderatorId, action, comment]
  );
}

export function listRecent(limit = 100) {
  return query(
    `SELECT ml.*, t.title AS theme_title, u.username AS moderator
       FROM moderation_log ml
       JOIN themes t ON t.id = ml.theme_id
       JOIN users u ON u.id = ml.moderator_id
      ORDER BY ml.created_at DESC
      LIMIT ?`,
    [limit]
  );
}

export function listByTheme(themeId) {
  return query(
    `SELECT ml.*, u.username AS moderator
       FROM moderation_log ml
       JOIN users u ON u.id = ml.moderator_id
      WHERE ml.theme_id = ?
      ORDER BY ml.created_at DESC`,
    [themeId]
  );
}

import express from 'express';

import * as themesRepo from '../db/repositories/themes.repo.js';
import * as elementsRepo from '../db/repositories/elements.repo.js';
import * as tagsRepo from '../db/repositories/tags.repo.js';
import { authRequired, authOptional } from '../middleware/auth.js';
import { assert, isNonEmpty } from '../utils/validate.js';
import { ELEMENT_TYPES, EDITABLE_STATUSES } from '../utils/constants.js';

const router = express.Router();

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Доступна ли тема этому зрителю (владелец/модератор видят всё). */
function canView(theme, user) {
  if (theme.status === 'approved') return true;
  if (!user) return false;
  if (user.id === theme.author_id) return true;
  return user.roles?.some((r) => r === 'admin' || r === 'moderator');
}

/** Загрузить тему и убедиться, что текущий user — её автор и её можно править. */
async function loadEditable(req) {
  const theme = await themesRepo.findById(req.params.id);
  if (!theme) throw httpError(404, 'Тема не найдена');
  if (theme.author_id !== req.user.id) throw httpError(403, 'Это не ваша тема');
  if (theme.status === 'approved') throw httpError(400, 'Нельзя править одобренную тему');
  if (!EDITABLE_STATUSES.includes(theme.status)) {
    throw httpError(400, 'Тема в этом статусе недоступна для правки');
  }
  return theme;
}

// ---------- Список и поиск ----------

// GET /api/themes?q=&sort=date|title|author&order=asc|desc&limit=&offset=
router.get('/', async (req, res, next) => {
  try {
    const { q = '', sort = 'date', order = 'desc' } = req.query;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const items = await themesRepo.listApproved({ q, sort, order, limit, offset });
    const { c: total } = await themesRepo.countApproved(q);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/themes/my/list — мои темы (важно: объявлено до /:id)
router.get('/my/list', authRequired, async (req, res, next) => {
  try {
    res.json(await themesRepo.listByAuthor(req.user.id));
  } catch (err) {
    next(err);
  }
});

// ---------- Одна тема ----------

// GET /api/themes/:id
router.get('/:id', authOptional, async (req, res, next) => {
  try {
    const theme = await themesRepo.findDetail(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Тема не найдена' });
    if (!canView(theme, req.user)) return res.status(403).json({ error: 'Нет доступа' });

    theme.elements = await elementsRepo.listByTheme(theme.id);
    theme.tags = await tagsRepo.listByTheme(theme.id);
    res.json(theme);
  } catch (err) {
    next(err);
  }
});

// ---------- CRUD темы ----------

// POST /api/themes
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { title, description = '', status = 'draft', elements = [], tags = [] } = req.body || {};

    assert(isNonEmpty(title, 100), 'Название обязательно (до 100 символов)');
    assert(['draft', 'pending'].includes(status), 'status: draft или pending');

    const themeId = await themesRepo.create({
      authorId: req.user.id,
      title: title.trim(),
      description,
      status,
    });

    for (const el of elements) {
      assert(ELEMENT_TYPES.includes(el.element_type), `Неизвестный element_type: ${el.element_type}`);
      assert(isNonEmpty(el.sprite_url, 255), 'У элемента нужен sprite_url');
      await elementsRepo.upsert(themeId, el);
    }

    await tagsRepo.setForTheme(themeId, tags);

    res.status(201).json({ id: themeId });
  } catch (err) {
    next(err);
  }
});

// PUT /api/themes/:id — название, описание, теги, превью
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const theme = await loadEditable(req);
    const { title, description, tags, preview_image } = req.body || {};

    if (title !== undefined) assert(isNonEmpty(title, 100), 'Название до 100 символов');
    await themesRepo.update(theme.id, { title, description });
    if (preview_image !== undefined) await themesRepo.setPreviewImage(theme.id, preview_image);
    if (Array.isArray(tags)) await tagsRepo.setForTheme(theme.id, tags);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/themes/:id — автор или админ
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const theme = await themesRepo.findById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Не найдена' });

    const isAdmin = req.user.roles?.includes('admin');
    if (theme.author_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await themesRepo.remove(theme.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/themes/:id/submit — отправить на модерацию
router.post('/:id/submit', authRequired, async (req, res, next) => {
  try {
    const theme = await themesRepo.findById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Не найдена' });
    if (theme.author_id !== req.user.id) return res.status(403).json({ error: 'Не ваша тема' });
    if (!['draft', 'rejected'].includes(theme.status)) {
      return res.status(400).json({ error: 'Нельзя отправить в этом статусе' });
    }
    await themesRepo.updateStatus(theme.id, 'pending', null);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- CRUD элементов темы (спрайты) ----------

// GET /api/themes/:id/elements
router.get('/:id/elements', authOptional, async (req, res, next) => {
  try {
    const theme = await themesRepo.findById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Тема не найдена' });
    if (!canView(theme, req.user)) return res.status(403).json({ error: 'Нет доступа' });
    res.json(await elementsRepo.listByTheme(theme.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/themes/:id/elements — добавить/обновить элемент по типу
router.post('/:id/elements', authRequired, async (req, res, next) => {
  try {
    const theme = await loadEditable(req);
    const el = req.body || {};

    assert(ELEMENT_TYPES.includes(el.element_type), `element_type: ${ELEMENT_TYPES.join(', ')}`);
    assert(isNonEmpty(el.sprite_url, 255), 'Нужен sprite_url (сначала загрузите спрайт)');

    await elementsRepo.upsert(theme.id, el);
    res.status(201).json(await elementsRepo.listByTheme(theme.id));
  } catch (err) {
    next(err);
  }
});

// PUT /api/themes/:id/elements/:elementId
router.put('/:id/elements/:elementId', authRequired, async (req, res, next) => {
  try {
    const theme = await loadEditable(req);
    const element = await elementsRepo.findById(req.params.elementId);
    if (!element || element.theme_id !== theme.id) {
      return res.status(404).json({ error: 'Элемент не найден в этой теме' });
    }
    await elementsRepo.update(element.id, req.body || {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/themes/:id/elements/:elementId
router.delete('/:id/elements/:elementId', authRequired, async (req, res, next) => {
  try {
    const theme = await loadEditable(req);
    const element = await elementsRepo.findById(req.params.elementId);
    if (!element || element.theme_id !== theme.id) {
      return res.status(404).json({ error: 'Элемент не найден в этой теме' });
    }
    await elementsRepo.remove(element.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

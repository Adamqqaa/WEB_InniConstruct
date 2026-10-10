import express from 'express';

import { transaction } from '../db/index.js';
import * as themesRepo from '../db/repositories/themes.repo.js';
import * as moderationRepo from '../db/repositories/moderation.repo.js';
import * as usersRepo from '../db/repositories/users.repo.js';
import * as rolesRepo from '../db/repositories/roles.repo.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { ROLE_NAMES } from '../utils/constants.js';

const router = express.Router();

// Всё, что ниже, доступно только admin/moderator.
router.use(authRequired, requireRole('admin', 'moderator'));

// GET /api/admin/pending — очередь на модерацию
router.get('/pending', async (req, res, next) => {
  try {
    res.json(await themesRepo.listPending());
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/themes/:id/approve
router.post('/themes/:id/approve', async (req, res, next) => {
  try {
    const { comment = '' } = req.body || {};
    const theme = await themesRepo.findById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Не найдена' });
    if (theme.status !== 'pending') {
      return res.status(400).json({ error: 'Тема не в статусе pending' });
    }

    await transaction(async () => {
      await themesRepo.updateStatus(theme.id, 'approved', null);
      await moderationRepo.add({
        themeId: theme.id,
        moderatorId: req.user.id,
        action: 'approved',
        comment,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/themes/:id/reject
router.post('/themes/:id/reject', async (req, res, next) => {
  try {
    const { comment = '' } = req.body || {};
    const theme = await themesRepo.findById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Не найдена' });
    if (theme.status !== 'pending') {
      return res.status(400).json({ error: 'Тема не в статусе pending' });
    }

    await transaction(async () => {
      await themesRepo.updateStatus(theme.id, 'rejected', comment);
      await moderationRepo.add({
        themeId: theme.id,
        moderatorId: req.user.id,
        action: 'rejected',
        comment,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/themes/:id/history — история модерации темы
router.get('/themes/:id/history', async (req, res, next) => {
  try {
    res.json(await moderationRepo.listByTheme(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/log — только admin
router.get('/log', requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await moderationRepo.listRecent(100));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/roles — справочник ролей
router.get('/roles', async (req, res, next) => {
  try {
    res.json(await rolesRepo.list());
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — только admin
router.get('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await usersRepo.listWithRoles({ limit, offset });
    res.json(
      rows.map((u) => ({ ...u, roles: u.roles ? u.roles.split(',') : [] }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/roles — выдать роль (только admin)
router.post('/users/:id/roles', requireRole('admin'), async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!ROLE_NAMES.includes(role)) {
      return res.status(400).json({ error: `role: ${ROLE_NAMES.join(', ')}` });
    }
    if (!(await usersRepo.findById(req.params.id))) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    await rolesRepo.assign(Number(req.params.id), role);
    res.json({ ok: true, roles: await rolesRepo.getForUser(Number(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id/roles/:role — забрать роль (только admin)
router.delete('/users/:id/roles/:role', requireRole('admin'), async (req, res, next) => {
  try {
    await rolesRepo.remove(Number(req.params.id), req.params.role);
    res.json({ ok: true, roles: await rolesRepo.getForUser(Number(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id — удалить пользователя (только admin)
router.delete('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const user = await usersRepo.findById(userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    await usersRepo.remove(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

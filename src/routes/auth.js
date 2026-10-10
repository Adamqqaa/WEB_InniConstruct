import express from 'express';
import jwt from 'jsonwebtoken';

import * as users from '../db/repositories/users.repo.js';
import * as roles from '../db/repositories/roles.repo.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { assert, isEmail, isUsername } from '../utils/validate.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

async function buildToken(user) {
  const userRoles = await roles.getForUser(user.id);
  return jwt.sign(
    { id: user.id, username: user.username, roles: userRoles },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register — регистрация
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};

    assert(isUsername(username), 'Логин: 3–30 символов, только буквы/цифры/_');
    assert(isEmail(email), 'Некорректный email');
    assert(typeof password === 'string' && password.length >= 6, 'Пароль минимум 6 символов');

    if (await users.findConflict(username, email)) {
      return res.status(409).json({ error: 'Логин или email занят' });
    }

    const passwordHash = await hashPassword(password);
    const userId = await users.create({ username, email, passwordHash });
    await roles.assign(userId, 'user');

    const user = { id: userId, username };
    res.status(201).json({ token: await buildToken(user), user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — вход по логину или email
router.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body || {};
    assert(login && password, 'Введите логин и пароль');

    const user = await users.findByLogin(login);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверные данные' });

    res.json({
      token: await buildToken(user),
      user: { id: user.id, username: user.username, roles: await roles.getForUser(user.id) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — текущий пользователь
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ ...user, roles: await roles.getForUser(user.id) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/me — сменить email и/или пароль
router.put('/me', authRequired, async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    const me = await users.findByIdWithSecret(req.user.id);
    if (!me) return res.status(404).json({ error: 'Пользователь не найден' });

    if (email && email !== me.email) {
      assert(isEmail(email), 'Некорректный email');
      const conflict = await users.findConflict(me.username, email);
      if (conflict) return res.status(409).json({ error: 'Email занят' });
      await users.updateEmail(me.id, email);
    }

    if (newPassword) {
      assert(newPassword.length >= 6, 'Новый пароль минимум 6 символов');
      const ok = await verifyPassword(currentPassword || '', me.password_hash);
      if (!ok) return res.status(403).json({ error: 'Неверный текущий пароль' });
      await users.updatePassword(me.id, await hashPassword(newPassword));
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

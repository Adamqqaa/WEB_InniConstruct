// JWT-аутентификация и проверка ролей.
import jwt from 'jsonwebtoken';
import * as rolesRepo from '../db/repositories/roles.repo.js';

const JWT_SECRET = process.env.JWT_SECRET;

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Обязательная авторизация: кладёт payload в req.user. */
export function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Нет токена' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Невалидный токен' });
  }
}

/** Необязательная авторизация: гость тоже проходит. */
export function authOptional(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // игнорируем — идём как гость
  }
  next();
}

/** Проверка: у пользователя есть хотя бы одна из ролей. */
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
    const has = req.user.roles?.some((r) => allowed.includes(r));
    if (!has) return res.status(403).json({ error: 'Недостаточно прав' });
    next();
  };
}

// Реэкспорт для удобства роутов.
export const getUserRoles = rolesRepo.getForUser;
export const assignRole = rolesRepo.assign;
export const removeRole = rolesRepo.remove;

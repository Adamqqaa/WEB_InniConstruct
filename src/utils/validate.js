export function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isUsername(s) {
  return typeof s === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(s);
}

export function isNonEmpty(s, max = 255) {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= max;
}

// бросает ошибку с кодом 400, если условие не выполнено
export function assert(condition, message) {
  if (!condition) {
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
}
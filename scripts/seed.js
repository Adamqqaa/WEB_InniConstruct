// Создаёт администратора (и, при желании, модератора).
// Запуск: npm run seed
import { initDb } from '../src/db/index.js';
import * as users from '../src/db/repositories/users.repo.js';
import * as roles from '../src/db/repositories/roles.repo.js';
import { hashPassword } from '../src/utils/passwords.js';

const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123456',
};

const MODERATOR = {
  username: process.env.MOD_USERNAME || 'moderator',
  email: process.env.MOD_EMAIL || 'moderator@example.com',
  password: process.env.MOD_PASSWORD || 'moder123456',
};

async function ensureUser({ username, email, password, roleNames }) {
  let user = await users.findByLogin(username);
  if (!user) {
    const id = await users.create({
      username,
      email,
      passwordHash: await hashPassword(password),
    });
    user = { id, username, email };
    console.log(`[seed] создан пользователь ${username} (id=${id})`);
  } else {
    console.log(`[seed] пользователь ${username} уже существует (id=${user.id})`);
  }
  for (const role of roleNames) {
    await roles.assign(user.id, role);
  }
  console.log(`[seed] роли ${roleNames.join(', ')} -> ${username}`);
}

async function main() {
  await initDb();
  await ensureUser({ ...ADMIN, roleNames: ['user', 'admin'] });
  await ensureUser({ ...MODERATOR, roleNames: ['user', 'moderator'] });
  console.log('[seed] готово. Логин админа:', ADMIN.username, '/', ADMIN.password);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] ошибка:', err);
  process.exit(1);
});

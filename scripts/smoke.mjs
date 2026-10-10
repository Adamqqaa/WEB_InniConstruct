// Сквозной smoke-тест API: регистрация, загрузка спрайта, создание темы,
// CRUD элементов, модерация, поиск и роли.
//
// Запуск: npm test   (сервер должен быть запущен: npm run dev)
// Можно указать другой адрес: BASE_URL=http://localhost:4000 npm test
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/IhWAAAAAElFTkSuQmCC',
    'base64'
  )
);

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('  ok  ', name);
  } else {
    fail++;
    console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function req(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

// дождаться сервера (или понятно сказать, что он не запущен)
let up = false;
for (let i = 0; i < 20; i++) {
  try {
    const r = await fetch(BASE + '/api/health');
    if (r.ok) {
      up = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 300));
}
if (!up) {
  console.error(`Сервер ${BASE} не доступен. Запустите сначала: npm run dev`);
  process.exit(1);
}
console.log(`Тест против ${BASE}\n`);

const stamp = Date.now();
const tester = 'tester' + stamp;

// 1. health
let r = await req('GET', '/api/health');
check('health', r.status === 200 && r.body.ok === true, r.body);

// 2. register
r = await req('POST', '/api/auth/register', {
  body: { username: tester, email: tester + '@mail.com', password: 'secret123' },
});
check('register', r.status === 201 && r.body.token, r.body);
const userToken = r.body.token;

// 3. login admin (после npm run seed)
r = await req('POST', '/api/auth/login', { body: { login: 'admin', password: 'admin123456' } });
check('login admin', r.status === 200 && r.body.token, r.body);
check('admin role present', r.body.user?.roles?.includes('admin'), r.body.user);
const adminToken = r.body.token;

// 4. me
r = await req('GET', '/api/auth/me', { token: userToken });
check('me', r.status === 200 && r.body.username === tester, r.body);

// 5. upload sprite
const fd = new FormData();
fd.append('file', new Blob([PNG], { type: 'image/png' }), 'play.png');
r = await req('POST', '/api/uploads/sprite', { token: userToken, form: fd });
check('upload sprite', r.status === 201 && r.body.url?.startsWith('/uploads/sprites/'), r.body);
const spriteUrl = r.body.url;

const bad = new FormData();
bad.append('file', new Blob(['hello'], { type: 'text/plain' }), 'x.txt');
r = await req('POST', '/api/uploads/sprite', { token: userToken, form: bad });
check('reject non-image', r.status === 400, r.body);

// 6. create theme with elements + tags
r = await req('POST', '/api/themes', {
  token: userToken,
  body: {
    title: 'Neon Player',
    description: 'Тёмная неоновая тема',
    status: 'draft',
    elements: [
      { element_type: 'background', sprite_url: '/uploads/sprites/bg.png', width: 240, height: 320 },
      { element_type: 'play_button', sprite_url: spriteUrl, pos_x: 100, pos_y: 200 },
    ],
    tags: ['neon', 'dark'],
  },
});
check('create theme', r.status === 201 && r.body.id, r.body);
const themeId = r.body.id;

// 7. my list
r = await req('GET', '/api/themes/my/list', { token: userToken });
check('my list', r.status === 200 && r.body.length === 1 && r.body[0].id === themeId, r.body);

// 8. detail with elements+tags
r = await req('GET', '/api/themes/' + themeId, { token: userToken });
check('detail elements', r.body.elements?.length === 2, r.body.elements);
check('detail tags', r.body.tags?.length === 2, r.body.tags);

// 9. element upsert (same type updates, not duplicates)
r = await req('POST', `/api/themes/${themeId}/elements`, {
  token: userToken,
  body: { element_type: 'play_button', sprite_url: spriteUrl, pos_x: 5, pos_y: 6, width: 32, height: 32, z_index: 3 },
});
check('element upsert', r.status === 201 && r.body.length === 2, r.body);
const playEl = r.body.find((e) => e.element_type === 'play_button');
check('element updated', playEl.pos_x === 5 && playEl.width === 32, playEl);

// 10. add new element + update it + delete it
r = await req('POST', `/api/themes/${themeId}/elements`, {
  token: userToken,
  body: { element_type: 'volume', sprite_url: '/uploads/sprites/vol.png' },
});
const volEl = r.body.find((e) => e.element_type === 'volume');
check('add volume', !!volEl, r.body);

r = await req('PUT', `/api/themes/${themeId}/elements/${volEl.id}`, {
  token: userToken,
  body: { pos_x: 42 },
});
check('update volume', r.status === 200, r.body);

r = await req('DELETE', `/api/themes/${themeId}/elements/${volEl.id}`, { token: userToken });
check('delete volume', r.status === 200, r.body);

// 11. invalid element type
r = await req('POST', `/api/themes/${themeId}/elements`, {
  token: userToken,
  body: { element_type: 'nope', sprite_url: '/x.png' },
});
check('reject bad element_type', r.status === 400, r.body);

// 12. cannot view others' draft as guest
r = await req('GET', '/api/themes/' + themeId);
check('guest cannot view draft', r.status === 403, r.body);

// 13. submit
r = await req('POST', `/api/themes/${themeId}/submit`, { token: userToken });
check('submit', r.status === 200 && r.body.ok, r.body);

// 14. admin pending
r = await req('GET', '/api/admin/pending', { token: adminToken });
check('admin pending', r.status === 200 && r.body.some((t) => t.id === themeId), r.body);

// 15. user cannot access admin
r = await req('GET', '/api/admin/pending', { token: userToken });
check('user blocked from admin', r.status === 403, r.body);

// 16. approve
r = await req('POST', `/api/admin/themes/${themeId}/approve`, {
  token: adminToken,
  body: { comment: 'Отлично!' },
});
check('approve', r.status === 200 && r.body.ok, r.body);

// 17. public list search + sort
r = await req('GET', '/api/themes?q=neon&sort=title&order=asc');
check('public search by title', r.status === 200 && r.body.total === 1, r.body);
r = await req('GET', `/api/themes?q=${tester}&sort=author`);
check('public search by author', r.status === 200 && r.body.total === 1, r.body);

// 18. guest can view approved
r = await req('GET', '/api/themes/' + themeId);
check('guest views approved', r.status === 200 && r.body.status === 'approved', r.body);

// 19. cannot edit approved
r = await req('PUT', '/api/themes/' + themeId, { token: userToken, body: { title: 'Hacked' } });
check('cannot edit approved', r.status === 400, r.body);

// 20. cannot submit approved again
r = await req('POST', `/api/themes/${themeId}/submit`, { token: userToken });
check('cannot resubmit approved', r.status === 400, r.body);

// 21. tags list
r = await req('GET', '/api/tags');
check('tags list', r.status === 200 && r.body.some((t) => t.name === 'neon'), r.body);

// 22. admin users + roles
r = await req('GET', '/api/admin/users', { token: adminToken });
check('admin users', r.status === 200 && r.body.length >= 3, r.body);
check('admin users roles parsed', Array.isArray(r.body[0].roles), r.body[0]);

const someId = r.body.find((u) => u.username.startsWith('tester')).id;
r = await req('POST', `/api/admin/users/${someId}/roles`, { token: adminToken, body: { role: 'moderator' } });
check('assign role', r.status === 200 && r.body.roles.includes('moderator'), r.body);
r = await req('DELETE', `/api/admin/users/${someId}/roles/moderator`, { token: adminToken });
check('remove role', r.status === 200 && !r.body.roles.includes('moderator'), r.body);

// 23. moderation log (admin only)
r = await req('GET', '/api/admin/log', { token: adminToken });
check('moderation log', r.status === 200 && r.body.some((l) => l.theme_id === themeId), r.body);

// 24. reject flow on a second theme
r = await req('POST', '/api/themes', {
  token: userToken,
  body: { title: 'Bad Theme', status: 'pending' },
});
const badId = r.body.id;
r = await req('POST', `/api/admin/themes/${badId}/reject`, { token: adminToken, body: { comment: 'Маловато элементов' } });
check('reject', r.status === 200 && r.body.ok, r.body);
r = await req('GET', '/api/themes/my/list', { token: userToken });
const rejected = r.body.find((t) => t.id === badId);
check('reject_reason saved', rejected.status === 'rejected' && rejected.reject_reason === 'Маловато элементов', rejected);

// 25. delete own theme
r = await req('DELETE', '/api/themes/' + badId, { token: userToken });
check('delete theme', r.status === 200 && r.body.ok, r.body);

// 26. 404 route
r = await req('GET', '/api/nope');
check('404', r.status === 404, r.body);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
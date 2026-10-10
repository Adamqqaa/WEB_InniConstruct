import express from 'express';
import cors from 'cors';
import path from 'path';

import { initDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import themeRoutes from './routes/themes.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';
import tagRoutes from './routes/tags.js';

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// --- middleware ---
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// --- health-check ---
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- роуты API ---
app.use('/api/auth', authRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/tags', tagRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// --- глобальный обработчик ошибок ---
app.use((err, req, res, next) => {
  // ошибки загрузки файлов (multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Файл слишком большой (максимум 5 МБ)' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  console.error('[err]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Ошибка сервера' });
});

// --- старт: сначала БД, потом сервер ---
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[db] ошибка инициализации:', err);
    process.exit(1);
  });

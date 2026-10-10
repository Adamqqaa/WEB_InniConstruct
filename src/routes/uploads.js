import express from 'express';

import { authRequired } from '../middleware/auth.js';
import { uploadSprite, uploadPreview, spriteUrl, previewUrl } from '../middleware/upload.js';

const router = express.Router();

// Загружать файлы может только авторизованный пользователь.
router.use(authRequired);

// POST /api/uploads/sprite  (multipart/form-data, поле "file")
router.post('/sprite', uploadSprite.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен (поле file)' });
  res.status(201).json({
    url: spriteUrl(req.file.filename),
    filename: req.file.filename,
    size: req.file.size,
  });
});

// POST /api/uploads/preview  (multipart/form-data, поле "file")
router.post('/preview', uploadPreview.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен (поле file)' });
  res.status(201).json({
    url: previewUrl(req.file.filename),
    filename: req.file.filename,
    size: req.file.size,
  });
});

export default router;

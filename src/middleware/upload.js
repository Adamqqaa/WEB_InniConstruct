// Настройка загрузки спрайтов и превью через multer.
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const SPRITE_DIR = path.join(UPLOAD_DIR, 'sprites');
const PREVIEW_DIR = path.join(UPLOAD_DIR, 'previews');

// Папки должны существовать до старта multer.
for (const dir of [SPRITE_DIR, PREVIEW_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 МБ

function makeUploader(dest) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dest),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
      if (!IMAGE_TYPES.has(file.mimetype)) {
        const err = new Error('Разрешены только изображения (png, jpeg, webp, gif)');
        err.status = 400;
        return cb(err);
      }
      cb(null, true);
    },
  });
}

export const uploadSprite = makeUploader(SPRITE_DIR);
export const uploadPreview = makeUploader(PREVIEW_DIR);

/** Публичный URL файла для отдачи через express.static('/uploads'). */
export const spriteUrl = (filename) => `/uploads/sprites/${filename}`;
export const previewUrl = (filename) => `/uploads/previews/${filename}`;

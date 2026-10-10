import express from 'express';

import * as tagsRepo from '../db/repositories/tags.repo.js';

const router = express.Router();

// GET /api/tags — справочник тегов для фильтров поиска
router.get('/', async (req, res, next) => {
  try {
    res.json(await tagsRepo.listAll());
  } catch (err) {
    next(err);
  }
});

export default router;

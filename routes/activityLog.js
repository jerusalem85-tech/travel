import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { page = 1, limit = 50, entity_type, entity_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (entity_type) {
    where += ' AND entity_type = ?';
    params.push(entity_type);
  }
  if (entity_id) {
    where += ' AND entity_id = ?';
    params.push(parseInt(entity_id));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM activity_log WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM activity_log WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

export default router;

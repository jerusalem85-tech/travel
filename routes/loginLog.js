import { Router } from 'express';
import { getDb } from '../config/database.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { user_id, action, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  let params = [];
  if (user_id) { where += ' AND user_id = ?'; params.push(user_id); }
  if (action) { where += ' AND action = ?'; params.push(action); }
  const rows = await db.all(`SELECT * FROM login_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, Number(limit), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM login_log ${where}`, params);
  res.json({ rows, total: total.count, page: Number(page) });
});

router.get('/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT user_id, full_name FROM login_log ORDER BY full_name');
  res.json(rows);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM login_log WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;

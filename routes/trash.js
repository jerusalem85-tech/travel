import { Router } from 'express';
import { getDb } from '../config/database.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = '';
  let params = [];
  if (entity_type) { where = 'WHERE entity_type = ?'; params.push(entity_type); }
  const rows = await db.all(`SELECT * FROM trash ${where} ORDER BY deleted_at DESC LIMIT ? OFFSET ?`, [...params, Number(limit), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM trash ${where}`, params);
  res.json({ rows, total: total.count, page: Number(page) });
});

router.post('/restore/:id', async (req, res) => {
  const db = await getDb();
  const item = await db.get('SELECT * FROM trash WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const data = JSON.parse(item.entity_data);
  const keys = Object.keys(data);
  const values = Object.values(data);
  const cols = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  await db.run(`INSERT INTO ${item.entity_type} (${cols}) VALUES (${placeholders})`, values);
  await db.run('DELETE FROM trash WHERE id = ?', [item.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM trash WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.delete('/', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM trash');
  res.json({ success: true });
});

export default router;

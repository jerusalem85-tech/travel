import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { from, to, category, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (from) { where += ' AND date >= ?'; params.push(from); }
  if (to) { where += ' AND date <= ?'; params.push(to); }
  if (category) { where += ' AND category = ?'; params.push(category); }
  const count = await db.get(`SELECT COUNT(*) as count FROM expenses WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM expenses WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  const total = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${where}`, params);
  const categories = await db.all('SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL ORDER BY category');
  res.json({ rows, total: count.count, page: parseInt(page), sum: total.total, categories: categories.map(c => c.category) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { description, amount, category, date } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'Description and amount are required' });
  const result = await db.run('INSERT INTO expenses (description, amount, category, date) VALUES (?,?,?,?)',
    [description, amount, category || null, date || new Date().toISOString().split('T')[0]]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

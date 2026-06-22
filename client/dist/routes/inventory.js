import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, category, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (name LIKE ? OR category LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM inventory_items WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM inventory_items WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category != \'\' ORDER BY category');
  res.json(rows.map(r => r.category));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, category, quantity, unit, unit_cost, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO inventory_items (name, category, quantity, unit, unit_cost, notes) VALUES (?,?,?,?,?,?)',
    [name, category || null, quantity || 0, unit || null, unit_cost || 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, category, quantity, unit, unit_cost, notes } = req.body;
  await db.run('UPDATE inventory_items SET name=?, category=?, quantity=?, unit=?, unit_cost=?, notes=? WHERE id=?',
    [name, category, quantity, unit, unit_cost, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'inventory_items', req.params.id, req.user?.id);
  await db.run('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

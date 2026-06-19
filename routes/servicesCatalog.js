import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, category, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }
  if (is_active !== undefined && is_active !== '') {
    where += ' AND is_active = ?';
    params.push(is_active);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM services_catalog WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM services_catalog WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT category FROM services_catalog WHERE category IS NOT NULL ORDER BY category');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, category, description, price, currency, supplier_id, is_active, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO services_catalog (name, category, description, price, currency, supplier_id, is_active, notes) VALUES (?,?,?,?,?,?,?,?)',
    [name, category || null, description || null, price || 0, currency || 'USD', supplier_id || null, is_active !== undefined ? is_active : 1, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, category, description, price, currency, supplier_id, is_active, notes } = req.body;
  await db.run('UPDATE services_catalog SET name=?, category=?, description=?, price=?, currency=?, supplier_id=?, is_active=?, notes=? WHERE id=?',
    [name, category, description, price, currency, supplier_id, is_active, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM services_catalog WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

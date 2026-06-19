import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, type, status, min_capacity, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (name LIKE ? OR location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (min_capacity) {
    where += ' AND capacity >= ?';
    params.push(parseInt(min_capacity, 10));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM properties WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM properties WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, type, location, bedrooms, capacity, price_per_night, currency, owner_name, owner_phone, status, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO properties (name, type, location, bedrooms, capacity, price_per_night, currency, owner_name, owner_phone, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [name, type || null, location || null, bedrooms || 1, capacity || 2, price_per_night || 0, currency || 'USD', owner_name || null, owner_phone || null, status || 'available', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, type, location, bedrooms, capacity, price_per_night, currency, owner_name, owner_phone, status, notes } = req.body;
  await db.run('UPDATE properties SET name=?, type=?, location=?, bedrooms=?, capacity=?, price_per_night=?, currency=?, owner_name=?, owner_phone=?, status=?, notes=? WHERE id=?',
    [name, type, location, bedrooms, capacity, price_per_night, currency, owner_name, owner_phone, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM properties WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

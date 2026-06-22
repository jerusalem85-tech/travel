import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, service_type, destination, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (name LIKE ? OR destination LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (service_type) {
    where += ' AND service_type = ?';
    params.push(service_type);
  }
  if (destination) {
    where += ' AND destination LIKE ?';
    params.push(`%${destination}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM price_lists WHERE ${where}`, params);
  const rows = await db.all(`SELECT p.*, s.name as supplier_name FROM price_lists p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, service_type, destination, season, price, currency, supplier_id, valid_from, valid_to, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO price_lists (name, service_type, destination, season, price, currency, supplier_id, valid_from, valid_to, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [name, service_type || null, destination || null, season || null, price || 0, currency || 'USD', supplier_id || null, valid_from || null, valid_to || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, service_type, destination, season, price, currency, supplier_id, valid_from, valid_to, notes } = req.body;
  await db.run('UPDATE price_lists SET name=?, service_type=?, destination=?, season=?, price=?, currency=?, supplier_id=?, valid_from=?, valid_to=?, notes=? WHERE id=?',
    [name, service_type, destination, season, price, currency, supplier_id, valid_from, valid_to, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'price_lists', req.params.id, req.user?.id);
  await db.run('DELETE FROM price_lists WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (is_active !== undefined && is_active !== '') {
    where += ' AND is_active = ?';
    params.push(is_active);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM discounts WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM discounts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, code, type, value, applies_to, min_amount, max_uses, valid_from, valid_to, is_active, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO discounts (name, code, type, value, applies_to, min_amount, max_uses, valid_from, valid_to, is_active, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [name, code || null, type || 'percentage', value || 0, applies_to || 'all', min_amount || 0, max_uses || 0, valid_from || null, valid_to || null, is_active !== undefined ? is_active : 1, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, code, type, value, applies_to, min_amount, max_uses, valid_from, valid_to, is_active, notes } = req.body;
  await db.run('UPDATE discounts SET name=?, code=?, type=?, value=?, applies_to=?, min_amount=?, max_uses=?, valid_from=?, valid_to=?, is_active=?, notes=? WHERE id=?',
    [name, code, type, value, applies_to, min_amount, max_uses, valid_from, valid_to, is_active, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'discounts', req.params.id, req.user?.id);
  await db.run('DELETE FROM discounts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

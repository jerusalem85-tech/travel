import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (code LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (is_active !== undefined && is_active !== '') {
    where += ' AND is_active = ?';
    params.push(is_active);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM airlines WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM airlines WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { code, name, country, website, phone, is_active, notes } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });
  const result = await db.run('INSERT INTO airlines (code, name, country, website, phone, is_active, notes) VALUES (?,?,?,?,?,?,?)',
    [code, name, country || null, website || null, phone || null, is_active !== undefined ? is_active : 1, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { code, name, country, website, phone, is_active, notes } = req.body;
  await db.run('UPDATE airlines SET code=?, name=?, country=?, website=?, phone=?, is_active=?, notes=? WHERE id=?',
    [code, name, country, website, phone, is_active, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'airlines', req.params.id, req.user?.id);
  await db.run('DELETE FROM airlines WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

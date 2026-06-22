import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, language, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND full_name LIKE ?';
    params.push(`%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (language) {
    where += ' AND languages LIKE ?';
    params.push(`%${language}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM guides WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM guides WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, languages, specializations, rating, daily_rate, status, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO guides (full_name, phone, email, languages, specializations, rating, daily_rate, status, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, languages || null, specializations || null, rating || 0, daily_rate || 0, status || 'available', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, languages, specializations, rating, daily_rate, status, notes } = req.body;
  await db.run('UPDATE guides SET full_name=?, phone=?, email=?, languages=?, specializations=?, rating=?, daily_rate=?, status=?, notes=? WHERE id=?',
    [full_name, phone, email, languages, specializations, rating, daily_rate, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'guides', req.params.id, req.user?.id);
  await db.run('DELETE FROM guides WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

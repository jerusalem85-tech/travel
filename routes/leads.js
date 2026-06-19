import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND l.status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM leads l WHERE ${where}`, params);
  const rows = await db.all(`SELECT l.*, u.full_name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM users ORDER BY full_name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, source, destination, travel_date, persons_count, budget, status, assigned_to, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO leads (full_name, phone, email, source, destination, travel_date, persons_count, budget, status, assigned_to, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, source || null, destination || null, travel_date || null, persons_count || 1, budget || 0, status || 'new', assigned_to || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, source, destination, travel_date, persons_count, budget, status, assigned_to, notes } = req.body;
  await db.run('UPDATE leads SET full_name=?, phone=?, email=?, source=?, destination=?, travel_date=?, persons_count=?, budget=?, status=?, assigned_to=?, notes=? WHERE id=?',
    [full_name, phone, email, source, destination, travel_date, persons_count, budget, status, assigned_to, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/status', async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  await db.run('UPDATE leads SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: 'Status updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'leads', req.params.id, req.user?.id);
  await db.run('DELETE FROM leads WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

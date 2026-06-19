import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, assigned_to, status, type, date_from, date_to, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (customer_id) { where += ' AND a.customer_id = ?'; params.push(parseInt(customer_id, 10)); }
  if (assigned_to) { where += ' AND a.assigned_to = ?'; params.push(parseInt(assigned_to, 10)); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  if (type) { where += ' AND a.type = ?'; params.push(type); }
  if (date_from) { where += ' AND a.appointment_date >= ?'; params.push(date_from); }
  if (date_to) { where += ' AND a.appointment_date <= ?'; params.push(date_to); }
  const count = await db.get(`SELECT COUNT(*) as count FROM appointments a WHERE ${where}`, params);
  const rows = await db.all(`SELECT a.*, c.full_name as customer_name FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id WHERE ${where} ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, title, description, appointment_date, appointment_time, duration, type, status, assigned_to, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await db.run('INSERT INTO appointments (customer_id, title, description, appointment_date, appointment_time, duration, type, status, assigned_to, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [customer_id || null, title, description || null, appointment_date || null, appointment_time || null, duration || 30, type || 'meeting', status || 'scheduled', assigned_to || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, title, description, appointment_date, appointment_time, duration, type, status, assigned_to, notes } = req.body;
  await db.run('UPDATE appointments SET customer_id=?, title=?, description=?, appointment_date=?, appointment_time=?, duration=?, type=?, status=?, assigned_to=?, notes=? WHERE id=?',
    [customer_id, title, description, appointment_date, appointment_time, duration, type, status, assigned_to, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/status', async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.run('UPDATE appointments SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: 'Status updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'appointments', req.params.id, req.user?.id);
  await db.run('DELETE FROM appointments WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name, phone FROM customers ORDER BY full_name');
  res.json(rows);
});

router.get('/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM users ORDER BY full_name');
  res.json(rows);
});

export default router;

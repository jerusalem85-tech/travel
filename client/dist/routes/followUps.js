import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, lead_id, status, assigned_to, type, priority, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (customer_id) {
    where += ' AND f.customer_id = ?';
    params.push(parseInt(customer_id));
  }
  if (lead_id) {
    where += ' AND f.lead_id = ?';
    params.push(parseInt(lead_id));
  }
  if (status) {
    where += ' AND f.status = ?';
    params.push(status);
  }
  if (assigned_to) {
    where += ' AND f.assigned_to = ?';
    params.push(parseInt(assigned_to));
  }
  if (type) {
    where += ' AND f.type = ?';
    params.push(type);
  }
  if (priority) {
    where += ' AND f.priority = ?';
    params.push(priority);
  }
  if (search) {
    where += ' AND f.title LIKE ?';
    params.push(`%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM follow_ups f WHERE ${where}`, params);
  const rows = await db.all(`SELECT f.*, c.full_name as customer_name, u.full_name as assigned_to_name FROM follow_ups f LEFT JOIN customers c ON f.customer_id = c.id LEFT JOIN users u ON f.assigned_to = u.id WHERE ${where} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM users ORDER BY full_name');
  res.json(rows);
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name, phone FROM customers ORDER BY full_name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, lead_id, booking_id, type, title, description, status, priority, assigned_to, due_date, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await db.run('INSERT INTO follow_ups (customer_id, lead_id, booking_id, type, title, description, status, priority, assigned_to, due_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [customer_id || null, lead_id || null, booking_id || null, type || 'call', title, description || null, status || 'pending', priority || 'medium', assigned_to || null, due_date || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, lead_id, booking_id, type, title, description, status, priority, assigned_to, due_date, notes } = req.body;
  await db.run('UPDATE follow_ups SET customer_id=?, lead_id=?, booking_id=?, type=?, title=?, description=?, status=?, priority=?, assigned_to=?, due_date=?, notes=? WHERE id=?',
    [customer_id, lead_id, booking_id, type, title, description, status, priority, assigned_to, due_date, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/complete', async (req, res) => {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run("UPDATE follow_ups SET status='completed', completed_at=? WHERE id=?", [now, req.params.id]);
  res.json({ message: 'Completed' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'follow_ups', req.params.id, req.user?.id);
  await db.run('DELETE FROM follow_ups WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

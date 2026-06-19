import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, priority, customer_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND c.subject LIKE ?';
    params.push(`%${search}%`);
  }
  if (status) {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (priority) {
    where += ' AND c.priority = ?';
    params.push(priority);
  }
  if (customer_id) {
    where += ' AND c.customer_id = ?';
    params.push(parseInt(customer_id));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM complaints c WHERE ${where}`, params);
  const rows = await db.all(`SELECT c.*, cu.full_name as customer_name FROM complaints c LEFT JOIN customers cu ON c.customer_id = cu.id WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, subject, description, priority, status, assigned_to } = req.body;
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  const result = await db.run('INSERT INTO complaints (customer_id, booking_id, subject, description, priority, status, assigned_to) VALUES (?,?,?,?,?,?,?)',
    [customer_id || null, booking_id || null, subject, description || null, priority || 'medium', status || 'open', assigned_to || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, subject, description, priority, status, assigned_to, resolution } = req.body;
  await db.run('UPDATE complaints SET customer_id=?, booking_id=?, subject=?, description=?, priority=?, status=?, assigned_to=?, resolution=? WHERE id=?',
    [customer_id, booking_id, subject, description, priority, status, assigned_to, resolution, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/resolve', async (req, res) => {
  const db = await getDb();
  const { resolution } = req.body;
  const now = new Date().toISOString();
  await db.run("UPDATE complaints SET status='resolved', resolved_at=?, resolution=? WHERE id=?", [now, resolution || null, req.params.id]);
  res.json({ message: 'Resolved' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'complaints', req.params.id, req.user?.id);
  await db.run('DELETE FROM complaints WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name, phone FROM customers ORDER BY full_name');
  res.json(rows);
});

export default router;

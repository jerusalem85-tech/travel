import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, assigned_to, status, priority, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  if (assigned_to) {
    where += ' AND assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    where += ' AND priority = ?';
    params.push(priority);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM tasks WHERE ${where}`, params);
  const rows = await db.all(`SELECT t.*, u.full_name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM users ORDER BY full_name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { title, description, assigned_to, related_to_type, related_to_id, priority, status, due_date, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await db.run('INSERT INTO tasks (title, description, assigned_to, related_to_type, related_to_id, priority, status, due_date, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [title, description || null, assigned_to || null, related_to_type || null, related_to_id || null, priority || 'medium', status || 'pending', due_date || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { title, description, assigned_to, related_to_type, related_to_id, priority, status, due_date, notes } = req.body;
  await db.run('UPDATE tasks SET title=?, description=?, assigned_to=?, related_to_type=?, related_to_id=?, priority=?, status=?, due_date=?, notes=? WHERE id=?',
    [title, description, assigned_to, related_to_type, related_to_id, priority, status, due_date, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'tasks', req.params.id, req.user?.id);
  await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

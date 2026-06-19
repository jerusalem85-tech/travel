import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, position, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (position) {
    where += ' AND position = ?';
    params.push(position);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM employees WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM employees WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, position, department, base_salary, hire_date, status, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO employees (full_name, phone, email, position, department, base_salary, hire_date, status, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, position || null, department || null, base_salary || 0, hire_date || null, status || 'active', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, position, department, base_salary, hire_date, status, notes } = req.body;
  await db.run('UPDATE employees SET full_name=?, phone=?, email=?, position=?, department=?, base_salary=?, hire_date=?, status=?, notes=? WHERE id=?',
    [full_name, phone, email, position, department, base_salary, hire_date, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM employees WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { employee_id, date_from, date_to, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (employee_id) {
    where += ' AND a.employee_id = ?';
    params.push(employee_id);
  }
  if (date_from) {
    where += ' AND a.date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    where += ' AND a.date <= ?';
    params.push(date_to);
  }
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM attendance a WHERE ${where}`, params);
  const rows = await db.all(`SELECT a.*, e.full_name as employee_name FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE ${where} ORDER BY a.date DESC, a.clock_in DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/today', async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const rows = await db.all(`SELECT a.*, e.full_name as employee_name FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE a.date = ? ORDER BY e.full_name`, [today]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { employee_id, date, clock_in, clock_out, status, notes } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'Employee ID is required' });
  const now = new Date();
  const recordDate = date || now.toISOString().split('T')[0];
  const recordClockIn = clock_in || now.toTimeString().split(' ')[0];
  const result = await db.run('INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, notes) VALUES (?,?,?,?,?,?)',
    [employee_id, recordDate, recordClockIn, clock_out || null, status || 'present', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { employee_id, date, clock_in, clock_out, status, notes } = req.body;
  await db.run('UPDATE attendance SET employee_id=?, date=?, clock_in=?, clock_out=?, status=?, notes=? WHERE id=?',
    [employee_id, date, clock_in, clock_out, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/clock-out', async (req, res) => {
  const db = await getDb();
  const now = new Date().toTimeString().split(' ')[0];
  await db.run('UPDATE attendance SET clock_out=? WHERE id=?', [now, req.params.id]);
  res.json({ message: 'Clock out recorded' });
});

export default router;

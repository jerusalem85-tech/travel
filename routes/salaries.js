import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { employee_id, month, paid, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (employee_id) {
    where += ' AND s.employee_id = ?';
    params.push(employee_id);
  }
  if (month) {
    where += ' AND s.month = ?';
    params.push(month);
  }
  if (paid !== undefined && paid !== '') {
    where += ' AND s.paid = ?';
    params.push(paid);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM salaries s WHERE ${where}`, params);
  const rows = await db.all(`SELECT s.*, e.full_name as employee_name FROM salaries s LEFT JOIN employees e ON s.employee_id = e.id WHERE ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/employees', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM employees ORDER BY full_name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { employee_id, month, amount, bonuses, deductions, notes } = req.body;
  if (!employee_id || !month) return res.status(400).json({ error: 'Employee ID and month are required' });
  const amt = parseFloat(amount) || 0;
  const bns = parseFloat(bonuses) || 0;
  const ded = parseFloat(deductions) || 0;
  const net = amt + bns - ded;
  const result = await db.run('INSERT INTO salaries (employee_id, month, amount, bonuses, deductions, net_amount, notes) VALUES (?,?,?,?,?,?,?)',
    [employee_id, month, amt, bns, ded, net, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { employee_id, month, amount, bonuses, deductions, paid, notes } = req.body;
  const amt = parseFloat(amount) || 0;
  const bns = parseFloat(bonuses) || 0;
  const ded = parseFloat(deductions) || 0;
  const net = amt + bns - ded;
  await db.run('UPDATE salaries SET employee_id=?, month=?, amount=?, bonuses=?, deductions=?, net_amount=?, paid=?, notes=? WHERE id=?',
    [employee_id, month, amt, bns, ded, net, paid || 0, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/pay', async (req, res) => {
  const db = await getDb();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.run('UPDATE salaries SET paid=1, paid_at=? WHERE id=?', [now, req.params.id]);
  res.json({ message: 'Marked as paid' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'salaries', req.params.id, req.user?.id);
  await db.run('DELETE FROM salaries WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

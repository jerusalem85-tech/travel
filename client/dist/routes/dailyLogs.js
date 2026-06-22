import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { log_date, category, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (log_date) { where += ' AND log_date = ?'; params.push(log_date); }
  if (category) { where += ' AND category = ?'; params.push(category); }
  const rows = await db.all(`SELECT l.*, u.full_name as created_by_name FROM daily_logs l LEFT JOIN users u ON l.created_by = u.id ${where} ORDER BY l.log_date DESC, l.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM daily_logs ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { log_date, title, content, category } = req.body;
  const result = await db.run(`INSERT INTO daily_logs (log_date, title, content, category, created_by) VALUES (?, ?, ?, ?, ?)`,
    [log_date || new Date().toISOString().split('T')[0], title, content, category, req.user?.id]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { title, content, category } = req.body;
  await db.run(`UPDATE daily_logs SET title=?, content=?, category=? WHERE id=?`,
    [title, content, category, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'daily_logs', req.params.id, req.user?.id);
  await db.run('DELETE FROM daily_logs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT category FROM daily_logs WHERE category IS NOT NULL ORDER BY category');
  res.json(rows.map(r => r.category));
});

router.get('/report', async (req, res) => {
  const db = await getDb();
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  const [newBookings, newCustomers, todayPayments, todayExpenses, todayAppointments, todayLogs] = await Promise.all([
    db.get('SELECT COUNT(*) as c FROM bookings WHERE date(created_at) = ?', [date]),
    db.get('SELECT COUNT(*) as c FROM customers WHERE date(created_at) = ?', [date]),
    db.get('SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE date(created_at) = ?', [date]),
    db.get('SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE date(created_at) = ?', [date]),
    db.get("SELECT COUNT(*) as c FROM appointments WHERE appointment_date = ? AND status = 'scheduled'", [date]),
    db.all('SELECT title, category FROM daily_logs WHERE log_date = ?', [date]),
  ]);

  res.json({
    date,
    newBookings: newBookings.c,
    newCustomers: newCustomers.c,
    todayRevenue: todayPayments.t,
    todayExpenses: todayExpenses.t,
    todayProfit: todayPayments.t - todayExpenses.t,
    todayAppointments: todayAppointments.c,
    logs: todayLogs,
  });
});

export default router;

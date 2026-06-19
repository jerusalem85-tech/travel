import { Router } from 'express';
import { getDb, isMySQL } from '../config/database.js';

const router = Router();

router.get('/plans', async (req, res) => {
  const db = await getDb();
  const { booking_id, customer_id, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (booking_id) { where += ' AND p.booking_id = ?'; params.push(booking_id); }
  if (customer_id) { where += ' AND p.customer_id = ?'; params.push(customer_id); }
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  const count = await db.get(`SELECT COUNT(*) as count FROM installment_plans p WHERE ${where}`, params);
  const rows = await db.all(`SELECT p.*, c.full_name as customer_name, b.booking_number FROM installment_plans p LEFT JOIN customers c ON p.customer_id = c.id LEFT JOIN bookings b ON p.booking_id = b.id WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/plans/:id', async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT p.*, c.full_name as customer_name, c.phone as customer_phone, b.booking_number FROM installment_plans p LEFT JOIN customers c ON p.customer_id = c.id LEFT JOIN bookings b ON p.booking_id = b.id WHERE p.id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const payments = await db.all('SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date ASC, id ASC', [req.params.id]);
  res.json({ ...plan, payments });
});

router.post('/plans', async (req, res) => {
  const db = await getDb();
  const { booking_id, customer_id, total_amount, down_payment, installments_count, status, notes } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  const remaining = (parseFloat(total_amount) || 0) - (parseFloat(down_payment) || 0);
  const result = await db.run('INSERT INTO installment_plans (booking_id, customer_id, total_amount, down_payment, installments_count, remaining_amount, status, notes) VALUES (?,?,?,?,?,?,?,?)',
    [booking_id || null, customer_id, total_amount || 0, down_payment || 0, installments_count || 1, remaining, status || 'active', notes || null]);
  const planId = result.insertId || result.lastInsertRowid;
  const count = parseInt(installments_count) || 1;
  const installmentAmount = count > 0 ? remaining / count : 0;
  const today = new Date();
  const dueDates = [];
  for (let i = 1; i <= count; i++) {
    const due = new Date(today);
    due.setMonth(due.getMonth() + i);
    const ds = due.toISOString().split('T')[0];
    await db.run('INSERT INTO installment_payments (plan_id, amount, due_date, status) VALUES (?,?,?,?)',
      [planId, installmentAmount, ds, 'pending']);
  }
  const payments = await db.all('SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date ASC, id ASC', [planId]);
  res.json({ id: planId, payments });
});

router.put('/plans/:id', async (req, res) => {
  const db = await getDb();
  const { booking_id, customer_id, total_amount, down_payment, installments_count, status, notes } = req.body;
  const remaining = (parseFloat(total_amount) || 0) - (parseFloat(down_payment) || 0);
  await db.run('UPDATE installment_plans SET booking_id=?, customer_id=?, total_amount=?, down_payment=?, installments_count=?, remaining_amount=?, status=?, notes=? WHERE id=?',
    [booking_id || null, customer_id, total_amount || 0, down_payment || 0, installments_count || 1, remaining, status || 'active', notes || null, req.params.id]);
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [req.params.id]);
  const payments = await db.all('SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date ASC, id ASC', [req.params.id]);
  res.json({ ...plan, payments });
});

router.delete('/plans/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM installment_payments WHERE plan_id = ?', [req.params.id]);
  await db.run('DELETE FROM installment_plans WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.put('/plans/:id/pay-down-payment', async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const paid = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as t FROM installment_payments WHERE plan_id = ? AND status = 'paid'", [req.params.id]);
  const remaining = (parseFloat(plan.total_amount) || 0) - (parseFloat(plan.down_payment) || 0) - (parseFloat(paid.t) || 0);
  await db.run('UPDATE installment_plans SET remaining_amount = ?, status = ? WHERE id = ?', [remaining, 'active', req.params.id]);
  res.json({ message: 'Down payment marked as paid', remaining_amount: remaining });
});

router.post('/plans/:id/payments', async (req, res) => {
  const db = await getDb();
  const { amount, due_date, paid_date, paid_amount, status, notes } = req.body;
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const result = await db.run('INSERT INTO installment_payments (plan_id, amount, due_date, paid_date, paid_amount, status, notes) VALUES (?,?,?,?,?,?,?)',
    [req.params.id, amount || 0, due_date || null, paid_date || null, paid_amount || 0, status || 'pending', notes || null]);
  const paymentId = result.insertId || result.lastInsertRowid;
  if ((paid_amount || 0) > 0 && status === 'paid') {
    const plan2 = await db.get('SELECT * FROM installment_plans WHERE id = ?', [req.params.id]);
    const paidSum = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as t FROM installment_payments WHERE plan_id = ? AND status = 'paid'", [req.params.id]);
    const remaining2 = (parseFloat(plan2.total_amount) || 0) - (parseFloat(plan2.down_payment) || 0) - (parseFloat(paidSum.t) || 0);
    await db.run('UPDATE installment_plans SET remaining_amount = ? WHERE id = ?', [remaining2 < 0 ? 0 : remaining2, req.params.id]);
  }
  res.json({ id: paymentId });
});

router.put('/payments/:id', async (req, res) => {
  const db = await getDb();
  const { amount, due_date, paid_date, paid_amount, status, notes } = req.body;
  const old = await db.get('SELECT plan_id, paid_amount, status FROM installment_payments WHERE id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Payment not found' });
  await db.run('UPDATE installment_payments SET amount=?, due_date=?, paid_date=?, paid_amount=?, status=?, notes=? WHERE id=?',
    [amount || 0, due_date || null, paid_date || null, paid_amount || 0, status || 'pending', notes || null, req.params.id]);
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [old.plan_id]);
  const paidSum = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as t FROM installment_payments WHERE plan_id = ? AND status = 'paid'", [old.plan_id]);
  const remaining = (parseFloat(plan.total_amount) || 0) - (parseFloat(plan.down_payment) || 0) - (parseFloat(paidSum.t) || 0);
  await db.run('UPDATE installment_plans SET remaining_amount = ? WHERE id = ?', [remaining < 0 ? 0 : remaining, old.plan_id]);
  res.json({ message: 'Updated' });
});

router.put('/payments/:id/pay', async (req, res) => {
  const db = await getDb();
  const payment = await db.get('SELECT * FROM installment_payments WHERE id = ?', [req.params.id]);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  const today = new Date().toISOString().split('T')[0];
  await db.run("UPDATE installment_payments SET paid_date = ?, paid_amount = ?, status = 'paid' WHERE id = ?",
    [today, payment.amount, req.params.id]);
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [payment.plan_id]);
  const paidSum = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as t FROM installment_payments WHERE plan_id = ? AND status = 'paid'", [payment.plan_id]);
  const remaining = (parseFloat(plan.total_amount) || 0) - (parseFloat(plan.down_payment) || 0) - (parseFloat(paidSum.t) || 0);
  await db.run('UPDATE installment_plans SET remaining_amount = ? WHERE id = ?', [remaining < 0 ? 0 : remaining, payment.plan_id]);
  if (remaining <= 0) {
    await db.run("UPDATE installment_plans SET status = 'completed' WHERE id = ?", [payment.plan_id]);
  }
  res.json({ message: 'Payment marked as paid', remaining_amount: remaining });
});

router.delete('/payments/:id', async (req, res) => {
  const db = await getDb();
  const payment = await db.get('SELECT plan_id FROM installment_payments WHERE id = ?', [req.params.id]);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  await db.run('DELETE FROM installment_payments WHERE id = ?', [req.params.id]);
  const plan = await db.get('SELECT * FROM installment_plans WHERE id = ?', [payment.plan_id]);
  const paidSum = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as t FROM installment_payments WHERE plan_id = ? AND status = 'paid'", [payment.plan_id]);
  const remaining = (parseFloat(plan.total_amount) || 0) - (parseFloat(plan.down_payment) || 0) - (parseFloat(paidSum.t) || 0);
  await db.run('UPDATE installment_plans SET remaining_amount = ? WHERE id = ?', [remaining < 0 ? 0 : remaining, payment.plan_id]);
  res.json({ message: 'Deleted' });
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name, phone FROM customers ORDER BY full_name ASC');
  res.json(rows);
});

router.get('/bookings', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, booking_number, customer_id FROM bookings ORDER BY created_at DESC');
  res.json(rows);
});

export default router;

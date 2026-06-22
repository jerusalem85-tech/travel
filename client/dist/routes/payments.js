import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { page = 1, limit = 20, customer_id } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1', params = [];
  if (customer_id) { where += ' AND c.id = ?'; params.push(customer_id); }
  const count = await db.get(`SELECT COUNT(*) as count FROM payments p LEFT JOIN bookings b ON p.booking_id = b.id LEFT JOIN customers c ON b.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT p.*, b.booking_number, c.full_name as customer_name FROM payments p LEFT JOIN bookings b ON p.booking_id = b.id LEFT JOIN customers c ON b.customer_id = c.id WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const payment = await db.get('SELECT p.*, b.booking_number, c.full_name as customer_name FROM payments p LEFT JOIN bookings b ON p.booking_id = b.id LEFT JOIN customers c ON b.customer_id = c.id WHERE p.id = ?', [req.params.id]);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  res.json(payment);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { booking_id, invoice_id, amount, payment_method, reference, notes } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
  const max = await db.get("SELECT MAX(CAST(SUBSTR(payment_number, 2) AS INTEGER)) as max_num FROM payments");
  const num = (max?.max_num || 0) + 1;
  const payment_number = `P${num}`;
  const result = await db.run('INSERT INTO payments (payment_number, booking_id, invoice_id, amount, payment_method, reference, notes) VALUES (?,?,?,?,?,?,?)',
    [payment_number, booking_id || null, invoice_id || null, amount, payment_method || null, reference || null, notes || null]);
  const paymentId = result.insertId || result.lastInsertRowid;
  if (booking_id) {
    const paid = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE booking_id = ?', [booking_id]);
    await db.run('UPDATE bookings SET paid_amount = ? WHERE id = ?', [paid.total, booking_id]);
  }
  if (invoice_id) {
    const paid = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?', [invoice_id]);
    const invoice = await db.get('SELECT total_amount FROM invoices WHERE id = ?', [invoice_id]);
    const status = paid.total >= invoice.total_amount ? 'paid' : paid.total > 0 ? 'partial' : 'unpaid';
    await db.run('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?', [paid.total, status, invoice_id]);
  }
  res.json({ id: paymentId, payment_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { booking_id, amount, payment_date, payment_method, reference, notes } = req.body;
  await db.run(`UPDATE payments SET booking_id=?, amount=?, payment_date=?, payment_method=?, reference=?, notes=? WHERE id=?`,
    [booking_id, amount, payment_date, payment_method, reference, notes, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  await moveToTrash(db, 'payments', req.params.id, req.user?.id);
  await db.run('DELETE FROM payments WHERE id = ?', [req.params.id]);
  if (payment.booking_id) {
    const paid = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE booking_id = ?', [payment.booking_id]);
    await db.run('UPDATE bookings SET paid_amount = ? WHERE id = ?', [paid.total, payment.booking_id]);
  }
  if (payment.invoice_id) {
    const paid = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?', [payment.invoice_id]);
    const invoice = await db.get('SELECT total_amount FROM invoices WHERE id = ?', [payment.invoice_id]);
    const status = paid.total >= invoice.total_amount ? 'paid' : paid.total > 0 ? 'partial' : 'unpaid';
    await db.run('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?', [paid.total, status, payment.invoice_id]);
  }
  res.json({ message: 'Deleted' });
});

export default router;

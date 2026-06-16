import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (i.invoice_number LIKE ? OR c.full_name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT i.*, c.full_name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const invoice = await db.get('SELECT i.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email, b.booking_number FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN bookings b ON i.booking_id = b.id WHERE i.id = ?', [req.params.id]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const payments = await db.all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...invoice, payments });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { booking_id, customer_id, total_amount, notes } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  const max = await db.get("SELECT MAX(CAST(SUBSTR(invoice_number, 2) AS INTEGER)) as max_num FROM invoices");
  const num = (max?.max_num || 0) + 1;
  const invoice_number = `I${num}`;
  const result = await db.run('INSERT INTO invoices (invoice_number, booking_id, customer_id, total_amount, notes) VALUES (?,?,?,?,?)',
    [invoice_number, booking_id || null, customer_id, total_amount || 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, invoice_number });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM payments WHERE invoice_id = ?', [req.params.id]);
  await db.run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

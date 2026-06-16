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
    where += " AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR passport_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM customers WHERE ${where}`, params);
  const rows = await db.all(`SELECT *, (SELECT COUNT(*) FROM bookings WHERE customer_id = customers.id) as booking_count FROM customers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const bookings = await db.all('SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC', [req.params.id]);
  const totalPaid = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as total FROM bookings WHERE customer_id = ?", [req.params.id]);
  res.json({ ...customer, bookings, totalPaid: totalPaid.total });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, id_number, passport_number, nationality, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO customers (full_name, phone, email, id_number, passport_number, nationality, notes) VALUES (?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, id_number || null, passport_number || null, nationality || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, id_number, passport_number, nationality, notes } = req.body;
  await db.run('UPDATE customers SET full_name=?, phone=?, email=?, id_number=?, passport_number=?, nationality=?, notes=? WHERE id=?',
    [full_name, phone, email, id_number, passport_number, nationality, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const bookings = await db.get('SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?', [req.params.id]);
  if (bookings.count > 0) return res.status(400).json({ error: 'Cannot delete customer with bookings' });
  await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

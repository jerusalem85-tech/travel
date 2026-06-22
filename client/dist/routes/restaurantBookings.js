import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, date, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND restaurant_name LIKE ?';
    params.push(`%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (date) {
    where += ' AND reservation_date = ?';
    params.push(date);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM restaurant_bookings WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM restaurant_bookings WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, restaurant_name, guest_count, reservation_date, reservation_time, table_type, special_requests, status, notes } = req.body;
  if (!restaurant_name) return res.status(400).json({ error: 'Restaurant name is required' });
  const result = await db.run('INSERT INTO restaurant_bookings (customer_id, booking_id, restaurant_name, guest_count, reservation_date, reservation_time, table_type, special_requests, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [customer_id || null, booking_id || null, restaurant_name, guest_count || 2, reservation_date || null, reservation_time || null, table_type || null, special_requests || null, status || 'pending', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, restaurant_name, guest_count, reservation_date, reservation_time, table_type, special_requests, status, notes } = req.body;
  await db.run('UPDATE restaurant_bookings SET customer_id=?, booking_id=?, restaurant_name=?, guest_count=?, reservation_date=?, reservation_time=?, table_type=?, special_requests=?, status=?, notes=? WHERE id=?',
    [customer_id, booking_id, restaurant_name, guest_count, reservation_date, reservation_time, table_type, special_requests, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/status', async (req, res) => {
  const db = await getDb();
  const { status, notes } = req.body;
  await db.run('UPDATE restaurant_bookings SET status=?, notes=? WHERE id=?', [status, notes || null, req.params.id]);
  res.json({ message: 'Status updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM restaurant_bookings WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

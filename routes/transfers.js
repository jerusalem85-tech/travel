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
    where += ' AND (t.pickup_location LIKE ? OR t.dropoff_location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND t.status = ?';
    params.push(status);
  }
  if (date) {
    where += ' AND t.transfer_date = ?';
    params.push(date);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM transfers t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN vehicles v ON t.vehicle_id = v.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT t.*, c.full_name as customer_name, v.plate_number FROM transfers t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN vehicles v ON t.vehicle_id = v.id WHERE ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM customers ORDER BY full_name');
  res.json(rows);
});

router.get('/vehicles', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, plate_number, brand, model FROM vehicles WHERE status = ? ORDER BY plate_number', ['available']);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, pickup_location, dropoff_location, transfer_date, transfer_time, vehicle_id, guide_id, passenger_count, price, status, notes } = req.body;
  const result = await db.run('INSERT INTO transfers (customer_id, booking_id, pickup_location, dropoff_location, transfer_date, transfer_time, vehicle_id, guide_id, passenger_count, price, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [customer_id || null, booking_id || null, pickup_location || null, dropoff_location || null, transfer_date || null, transfer_time || null, vehicle_id || null, guide_id || null, passenger_count || 1, price || 0, status || 'pending', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, pickup_location, dropoff_location, transfer_date, transfer_time, vehicle_id, guide_id, passenger_count, price, status, notes } = req.body;
  await db.run('UPDATE transfers SET customer_id=?, booking_id=?, pickup_location=?, dropoff_location=?, transfer_date=?, transfer_time=?, vehicle_id=?, guide_id=?, passenger_count=?, price=?, status=?, notes=? WHERE id=?',
    [customer_id, booking_id, pickup_location, dropoff_location, transfer_date, transfer_time, vehicle_id, guide_id, passenger_count, price, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM transfers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

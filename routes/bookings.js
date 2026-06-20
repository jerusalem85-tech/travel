import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (b.booking_number LIKE ? OR c.full_name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) { where += ' AND b.status = ?'; params.push(status); }
  if (dateFrom) { where += ' AND b.travel_date >= ?'; params.push(dateFrom); }
  if (dateTo) { where += ' AND b.travel_date <= ?'; params.push(dateTo); }
  const count = await db.get(`SELECT COUNT(*) as count FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT b.*, c.full_name as customer_name, (SELECT COUNT(*) FROM booking_services WHERE booking_id = b.id) as service_count FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id WHERE ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const booking = await db.get('SELECT b.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id WHERE b.id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const [passengers, services, payments] = await Promise.all([
    db.all('SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY id', [req.params.id]),
    db.all('SELECT s.*, sup.name as supplier_name FROM booking_services s LEFT JOIN suppliers sup ON s.supplier_id = sup.id WHERE s.booking_id = ? ORDER BY s.id', [req.params.id]),
    db.all('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC', [req.params.id]),
  ]);
  services.forEach(s => { if (s.details && typeof s.details === 'string') { try { s.details = JSON.parse(s.details); } catch {} } });
  res.json({ ...booking, passengers, services, payments });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, ticket_number, status, total_amount, cost_amount, notes, passengers, services } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  const max = await db.get("SELECT MAX(CAST(booking_number AS INTEGER)) as max_num FROM bookings");
  const booking_number = String((max?.max_num || 0) + 1);
  const result = await db.run(`INSERT INTO bookings (booking_number, customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, ticket_number, status, total_amount, cost_amount, profit_amount, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [booking_number, customer_id, travel_date || null, return_date || null, from_destination || null, to_destination || null, airline || null, flight_number || null, ticket_number || null, status || 'pending', total_amount || 0, cost_amount || 0, (total_amount || 0) - (cost_amount || 0), notes || null]);
  const bookingId = result.insertId || result.lastInsertRowid;
  if (passengers && passengers.length > 0) {
    for (const p of passengers) {
      await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number, id_number, seat_number) VALUES (?,?,?,?,?)',
        [bookingId, p.name || null, p.passport || null, p.idNumber || null, p.seat || null]);
    }
  }
  if (services && services.length > 0) {
    for (const s of services) {
      await db.run('INSERT INTO booking_services (booking_id, service_type, supplier_id, description, amount, details) VALUES (?,?,?,?,?,?)',
        [bookingId, s.service_category || s.service_type || null, s.supplier_id || null, s.description || null, s.price || 0, s.details ? JSON.stringify(s.details) : '{}']);
    }
  }
  res.json({ id: bookingId, booking_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, ticket_number, status, total_amount, cost_amount, notes, services, passengers } = req.body;
  const profit = (total_amount || 0) - (cost_amount || 0);
  await db.run(`UPDATE bookings SET customer_id=?, travel_date=?, return_date=?, from_destination=?, to_destination=?, airline=?, flight_number=?, ticket_number=?, status=?, total_amount=?, cost_amount=?, profit_amount=?, notes=? WHERE id=?`,
    [customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, ticket_number, status, total_amount || 0, cost_amount || 0, profit, notes, req.params.id]);
  if (passengers && passengers.length > 0) {
    await db.run('DELETE FROM booking_passengers WHERE booking_id = ?', [req.params.id]);
    for (const p of passengers) {
      await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number) VALUES (?,?,?)',
        [req.params.id, p.name || null, p.passport || null]);
    }
  }
  if (services && services.length > 0) {
    await db.run('DELETE FROM booking_services WHERE booking_id = ?', [req.params.id]);
    for (const s of services) {
      await db.run('INSERT INTO booking_services (booking_id, service_type, supplier_id, description, amount, details) VALUES (?,?,?,?,?,?)',
        [req.params.id, s.service_category || s.service_type || null, s.supplier_id || null, s.description || null, s.price || 0, s.details ? JSON.stringify(s.details) : '{}']);
    }
  }
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'bookings', req.params.id, req.user?.id);
  await db.run('DELETE FROM booking_passengers WHERE booking_id = ?', [req.params.id]);
  await db.run('DELETE FROM booking_services WHERE booking_id = ?', [req.params.id]);
  await db.run('DELETE FROM payments WHERE booking_id = ?', [req.params.id]);
  await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/:id/passengers', async (req, res) => {
  const db = await getDb();
  const { full_name, passport_number, id_number, seat_number } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Passenger name is required' });
  const result = await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number, id_number, seat_number) VALUES (?,?,?,?,?)',
    [req.params.id, full_name, passport_number || null, id_number || null, seat_number || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/passengers/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM booking_passengers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/:id/services', async (req, res) => {
  const db = await getDb();
  const { service_type, supplier_id, description, amount, details } = req.body;
  if (!service_type) return res.status(400).json({ error: 'Service type is required' });
  const result = await db.run('INSERT INTO booking_services (booking_id, service_type, supplier_id, description, amount, details) VALUES (?,?,?,?,?,?)',
    [req.params.id, service_type, supplier_id || null, description || null, amount || 0, details ? JSON.stringify(details) : '{}']);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/services/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM booking_services WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.delete('/all', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM booking_services');
  await db.run('DELETE FROM booking_passengers');
  await db.run('DELETE FROM payments');
  await db.run('DELETE FROM bookings');
  res.json({ message: 'All bookings and related data deleted' });
});

export default router;

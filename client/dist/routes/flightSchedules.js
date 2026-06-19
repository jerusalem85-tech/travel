import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, airline_id, origin, destination, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND fs.flight_number LIKE ?';
    params.push(`%${search}%`);
  }
  if (airline_id) {
    where += ' AND fs.airline_id = ?';
    params.push(airline_id);
  }
  if (origin) {
    where += ' AND fs.origin_airport_id = ?';
    params.push(origin);
  }
  if (destination) {
    where += ' AND fs.destination_airport_id = ?';
    params.push(destination);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM flight_schedules fs WHERE ${where}`, params);
  const rows = await db.all(`
    SELECT fs.*, al.name as airline_name, al.code as airline_code,
      ao.code as origin_code, ao.name as origin_name, ao.city as origin_city,
      ad.code as destination_code, ad.name as destination_name, ad.city as destination_city
    FROM flight_schedules fs
    LEFT JOIN airlines al ON fs.airline_id = al.id
    LEFT JOIN airports ao ON fs.origin_airport_id = ao.id
    LEFT JOIN airports ad ON fs.destination_airport_id = ad.id
    WHERE ${where}
    ORDER BY fs.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/airports', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, code, name, city FROM airports WHERE is_active = 1 ORDER BY name');
  res.json(rows);
});

router.get('/airlines', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, code, name FROM airlines WHERE is_active = 1 ORDER BY name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { airline_id, flight_number, origin_airport_id, destination_airport_id, departure_time, arrival_time, days_of_week, price, currency, is_active, notes } = req.body;
  if (!flight_number) return res.status(400).json({ error: 'Flight number is required' });
  const result = await db.run(`INSERT INTO flight_schedules (airline_id, flight_number, origin_airport_id, destination_airport_id, departure_time, arrival_time, days_of_week, price, currency, is_active, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [airline_id || null, flight_number, origin_airport_id || null, destination_airport_id || null, departure_time || null, arrival_time || null, days_of_week || null, price || 0, currency || 'USD', is_active !== undefined ? is_active : 1, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { airline_id, flight_number, origin_airport_id, destination_airport_id, departure_time, arrival_time, days_of_week, price, currency, is_active, notes } = req.body;
  await db.run(`UPDATE flight_schedules SET airline_id=?, flight_number=?, origin_airport_id=?, destination_airport_id=?, departure_time=?, arrival_time=?, days_of_week=?, price=?, currency=?, is_active=?, notes=? WHERE id=?`,
    [airline_id, flight_number, origin_airport_id, destination_airport_id, departure_time, arrival_time, days_of_week, price, currency, is_active, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'flight_schedules', req.params.id, req.user?.id);
  await db.run('DELETE FROM flight_schedules WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

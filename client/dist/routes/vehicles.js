import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, vehicle_type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (plate_number LIKE ? OR brand LIKE ? OR model LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (vehicle_type) {
    where += ' AND vehicle_type = ?';
    params.push(vehicle_type);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM vehicles WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM vehicles WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { plate_number, brand, model, year, capacity, vehicle_type, fuel_type, status, daily_rate, notes } = req.body;
  if (!plate_number) return res.status(400).json({ error: 'Plate number is required' });
  const result = await db.run('INSERT INTO vehicles (plate_number, brand, model, year, capacity, vehicle_type, fuel_type, status, daily_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [plate_number, brand || null, model || null, year || null, capacity || 4, vehicle_type || null, fuel_type || null, status || 'available', daily_rate || 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { plate_number, brand, model, year, capacity, vehicle_type, fuel_type, status, daily_rate, notes } = req.body;
  await db.run('UPDATE vehicles SET plate_number=?, brand=?, model=?, year=?, capacity=?, vehicle_type=?, fuel_type=?, status=?, daily_rate=?, notes=? WHERE id=?',
    [plate_number, brand, model, year, capacity, vehicle_type, fuel_type, status, daily_rate, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

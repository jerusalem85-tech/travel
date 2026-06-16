import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (name LIKE ? OR destination LIKE ? OR package_code LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM tour_packages WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM tour_packages WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const pkg = await db.get('SELECT * FROM tour_packages WHERE id = ?', [req.params.id]);
  if (!pkg) return res.status(404).json({ error: 'Tour package not found' });
  const bookings = await db.all('SELECT * FROM tour_package_bookings WHERE package_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...pkg, bookings });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, description, destination, duration_days, includes, excludes, price_per_person, currency, status, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Package name is required' });
  const max = await db.get("SELECT MAX(CAST(SUBSTR(package_code, 2) AS INTEGER)) as max_num FROM tour_packages");
  const num = (max?.max_num || 0) + 1;
  const package_code = `P${num}`;
  const result = await db.run('INSERT INTO tour_packages (package_code, name, description, destination, duration_days, includes, excludes, price_per_person, currency, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [package_code, name, description || null, destination || null, duration_days || 1, includes || null, excludes || null, price_per_person || 0, currency || 'USD', status || 'active', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, package_code });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, description, destination, duration_days, includes, excludes, price_per_person, currency, status, notes } = req.body;
  await db.run('UPDATE tour_packages SET name=?, description=?, destination=?, duration_days=?, includes=?, excludes=?, price_per_person=?, currency=?, status=?, notes=? WHERE id=?',
    [name, description, destination, duration_days, includes, excludes, price_per_person, currency, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM tour_package_bookings WHERE package_id = ?', [req.params.id]);
  await db.run('DELETE FROM tour_packages WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

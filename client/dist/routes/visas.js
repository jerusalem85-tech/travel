import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (v.visa_number LIKE ? OR v.country LIKE ? OR c.full_name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND v.status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM visas v LEFT JOIN customers c ON v.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT v.*, c.full_name as customer_name FROM visas v LEFT JOIN customers c ON v.customer_id = c.id WHERE ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM customers ORDER BY full_name');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const visa = await db.get('SELECT v.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email, c.passport_number FROM visas v LEFT JOIN customers c ON v.customer_id = c.id WHERE v.id = ?', [req.params.id]);
  if (!visa) return res.status(404).json({ error: 'Visa not found' });
  res.json(visa);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, country, visa_type, application_date, issue_date, expiry_date, status, notes } = req.body;
  const max = await db.get("SELECT MAX(CAST(SUBSTR(visa_number, 2) AS INTEGER)) as max_num FROM visas");
  const num = (max?.max_num || 0) + 1;
  const visa_number = `V${num}`;
  const result = await db.run('INSERT INTO visas (visa_number, customer_id, booking_id, country, visa_type, application_date, issue_date, expiry_date, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [visa_number, customer_id || null, booking_id || null, country || null, visa_type || null, application_date || null, issue_date || null, expiry_date || null, status || 'pending', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, visa_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, country, visa_type, application_date, issue_date, expiry_date, status, notes } = req.body;
  await db.run('UPDATE visas SET customer_id=?, booking_id=?, country=?, visa_type=?, application_date=?, issue_date=?, expiry_date=?, status=?, notes=? WHERE id=?',
    [customer_id, booking_id, country, visa_type, application_date, issue_date, expiry_date, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'visas', req.params.id, req.user?.id);
  await db.run('DELETE FROM visas WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (c.full_name LIKE ? OR i.policy_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM insurance_policies i LEFT JOIN customers c ON i.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT i.*, c.full_name as customer_name FROM insurance_policies i LEFT JOIN customers c ON i.customer_id = c.id WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const policy = await db.get('SELECT i.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email, b.booking_number FROM insurance_policies i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN bookings b ON i.booking_id = b.id WHERE i.id = ?', [req.params.id]);
  if (!policy) return res.status(404).json({ error: 'Insurance policy not found' });
  res.json(policy);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, provider_name, policy_type, coverage_amount, premium_amount, currency, start_date, end_date, status, notes } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  const max = await db.get("SELECT MAX(CAST(SUBSTR(policy_number, 4) AS INTEGER)) as max_num FROM insurance_policies");
  const num = (max?.max_num || 0) + 1;
  const policy_number = `INS${num}`;
  const result = await db.run('INSERT INTO insurance_policies (policy_number, customer_id, booking_id, provider_name, policy_type, coverage_amount, premium_amount, currency, start_date, end_date, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [policy_number, customer_id, booking_id || null, provider_name || null, policy_type || null, coverage_amount || 0, premium_amount || 0, currency || 'USD', start_date || null, end_date || null, status || 'active', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, policy_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, booking_id, provider_name, policy_type, coverage_amount, premium_amount, currency, start_date, end_date, status, notes } = req.body;
  await db.run('UPDATE insurance_policies SET customer_id=?, booking_id=?, provider_name=?, policy_type=?, coverage_amount=?, premium_amount=?, currency=?, start_date=?, end_date=?, status=?, notes=? WHERE id=?',
    [customer_id, booking_id, provider_name, policy_type, coverage_amount, premium_amount, currency, start_date, end_date, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'insurance_policies', req.params.id, req.user?.id);
  await db.run('DELETE FROM insurance_policies WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

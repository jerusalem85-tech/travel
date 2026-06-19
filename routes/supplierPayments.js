import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { page = 1, limit = 20, supplier_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1', params = [];
  if (supplier_id) { where += ' AND sp.supplier_id = ?'; params.push(supplier_id); }
  const count = await db.get(`SELECT COUNT(*) as count FROM supplier_payments sp WHERE ${where}`, params);
  const rows = await db.all(`SELECT sp.*, s.name as supplier_name FROM supplier_payments sp LEFT JOIN suppliers s ON sp.supplier_id = s.id WHERE ${where} ORDER BY sp.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { booking_id, supplier_id, amount, currency, exchange_rate, payment_date, notes } = req.body;
  const max = await db.get("SELECT MAX(CAST(REPLACE(payment_number,'SPAY-','') AS INTEGER)) as m FROM supplier_payments WHERE payment_number LIKE 'SPAY-%'");
  const num = (max?.m || 0) + 1;
  const payment_number = `SPAY-${String(num).padStart(6, '0')}`;
  const result = await db.run('INSERT INTO supplier_payments (payment_number, booking_id, supplier_id, amount, currency, exchange_rate, payment_date, notes) VALUES (?,?,?,?,?,?,?,?)',
    [payment_number, booking_id || null, supplier_id, amount, currency || 'USD', exchange_rate || 1, payment_date || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, payment_number });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM supplier_payments WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

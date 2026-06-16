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
    where += " AND (q.quote_number LIKE ? OR c.full_name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND q.status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT q.*, c.full_name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const quotation = await db.get('SELECT q.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?', [req.params.id]);
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  res.json(quotation);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, service_type, total_amount, cost_amount, notes, status } = req.body;
  const max = await db.get("SELECT MAX(CAST(SUBSTR(quote_number, 2) AS INTEGER)) as max_num FROM quotations");
  const quote_number = 'Q' + ((max?.max_num || 0) + 1);
  const result = await db.run(
    'INSERT INTO quotations (quote_number, customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, service_type, total_amount, cost_amount, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [quote_number, customer_id || null, travel_date || null, return_date || null, from_destination || null, to_destination || null, airline || null, flight_number || null, service_type || null, total_amount || 0, cost_amount || 0, notes || null, status || 'draft']
  );
  res.json({ id: result.insertId || result.lastInsertRowid, quote_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, service_type, total_amount, cost_amount, notes, status } = req.body;
  await db.run(
    'UPDATE quotations SET customer_id=?, travel_date=?, return_date=?, from_destination=?, to_destination=?, airline=?, flight_number=?, service_type=?, total_amount=?, cost_amount=?, notes=?, status=? WHERE id=?',
    [customer_id, travel_date, return_date, from_destination, to_destination, airline, flight_number, service_type, total_amount || 0, cost_amount || 0, notes, status, req.params.id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM quotations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.put('/:id/status', async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  if (!['draft', 'sent', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.run('UPDATE quotations SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Status updated' });
});

export default router;

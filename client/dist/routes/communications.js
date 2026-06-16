import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (customer_id) {
    where += ' AND customer_id = ?';
    params.push(parseInt(customer_id));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM customer_communications WHERE ${where}`, params);
  const rows = await db.all(`SELECT c.*, cust.full_name as customer_name FROM customer_communications c LEFT JOIN customers cust ON c.customer_id = cust.id WHERE ${where} ORDER BY c.sent_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, communication_type, subject, message, status } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  const result = await db.run('INSERT INTO customer_communications (customer_id, communication_type, subject, message, status) VALUES (?,?,?,?,?)',
    [customer_id, communication_type || null, subject, message || null, status || 'sent']);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM customer_communications WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

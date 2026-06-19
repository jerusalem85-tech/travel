import { Router } from 'express';
import { getDb } from '../config/database.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (customer_id) { where += ' AND p.customer_id = ?'; params.push(customer_id); }
  if (type) { where += ' AND p.type = ?'; params.push(type); }
  const rows = await db.all(`SELECT p.*, c.full_name as customer_name FROM loyalty_points p LEFT JOIN customers c ON p.customer_id = c.id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM loyalty_points ${where}`, params);
  
  const balances = await db.all('SELECT customer_id, SUM(CASE WHEN type="earned" THEN points ELSE -points END) as balance FROM loyalty_points GROUP BY customer_id');
  
  res.json({ rows, total: total.count, page: parseInt(page, 10), balances });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, points, type, reference_type, reference_id, notes } = req.body;
  const result = await db.run(`INSERT INTO loyalty_points (customer_id, points, type, reference_type, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [customer_id, points, type, reference_type, reference_id, notes]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM loyalty_points WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/balance/:customerId', async (req, res) => {
  const db = await getDb();
  const earned = await db.get("SELECT COALESCE(SUM(points), 0) as total FROM loyalty_points WHERE customer_id = ? AND type='earned'", [req.params.customerId]);
  const redeemed = await db.get("SELECT COALESCE(SUM(points), 0) as total FROM loyalty_points WHERE customer_id = ? AND type='redeemed'", [req.params.customerId]);
  res.json({ customer_id: parseInt(req.params.customerId, 10), balance: earned.total - redeemed.total, earned: earned.total, redeemed: redeemed.total });
});

export default router;

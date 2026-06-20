import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const rows = await db.all('SELECT cl.*, c.full_name as customer_name FROM call_logs cl LEFT JOIN customers c ON cl.customer_id = c.id ORDER BY cl.created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), offset]);
  const count = await db.get('SELECT COUNT(*) as c FROM call_logs');
  res.json({ rows, total: count.c });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { customer_id, notes, follow_up_date } = req.body;
  await db.run('INSERT INTO call_logs (customer_id, notes, follow_up_date) VALUES (?,?,?)', [customer_id, notes, follow_up_date || null]);
  res.json({ message: 'Created' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM call_logs WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { broker_id, paid, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (broker_id) {
    where += ' AND bc.broker_id = ?';
    params.push(broker_id);
  }
  if (paid !== undefined && paid !== '') {
    where += ' AND bc.paid = ?';
    params.push(paid);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM broker_commissions bc LEFT JOIN brokers b ON bc.broker_id = b.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT bc.*, b.full_name as broker_name FROM broker_commissions bc LEFT JOIN brokers b ON bc.broker_id = b.id WHERE ${where} ORDER BY bc.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/brokers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, full_name FROM brokers WHERE status = ? ORDER BY full_name', ['active']);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { broker_id, booking_id, commission, paid, notes } = req.body;
  if (!broker_id) return res.status(400).json({ error: 'Broker is required' });
  const result = await db.run('INSERT INTO broker_commissions (broker_id, booking_id, commission, paid, notes) VALUES (?,?,?,?,?)',
    [broker_id, booking_id || null, commission || 0, paid || 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { broker_id, booking_id, commission, paid, notes } = req.body;
  await db.run('UPDATE broker_commissions SET broker_id=?, booking_id=?, commission=?, paid=?, notes=? WHERE id=?',
    [broker_id, booking_id, commission, paid, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/pay', async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE broker_commissions SET paid=1, paid_at=CURRENT_TIMESTAMP WHERE id=?', [req.params.id]);
  res.json({ message: 'Marked as paid' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM broker_commissions WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

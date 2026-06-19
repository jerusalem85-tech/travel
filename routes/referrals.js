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
    where += ' AND (referrer_name LIKE ? OR referred_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM referrals WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM referrals WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { referrer_name, referrer_phone, referred_name, referred_phone, booking_id, reward_amount, reward_paid, status, notes } = req.body;
  if (!referrer_name) return res.status(400).json({ error: 'Referrer name is required' });
  const result = await db.run('INSERT INTO referrals (referrer_name, referrer_phone, referred_name, referred_phone, booking_id, reward_amount, reward_paid, status, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [referrer_name, referrer_phone || null, referred_name || null, referred_phone || null, booking_id || null, reward_amount || 0, reward_paid || 0, status || 'pending', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { referrer_name, referrer_phone, referred_name, referred_phone, booking_id, reward_amount, reward_paid, status, notes } = req.body;
  await db.run('UPDATE referrals SET referrer_name=?, referrer_phone=?, referred_name=?, referred_phone=?, booking_id=?, reward_amount=?, reward_paid=?, status=?, notes=? WHERE id=?',
    [referrer_name, referrer_phone, referred_name, referred_phone, booking_id, reward_amount, reward_paid, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/pay', async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE referrals SET reward_paid=1, status=? WHERE id=?', ['paid', req.params.id]);
  res.json({ message: 'Reward marked as paid' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM referrals WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

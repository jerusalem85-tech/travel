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
    where += " AND (u.full_name LIKE ? OR b.booking_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM commissions c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN bookings b ON c.booking_id = b.id WHERE ${where}`, params);
  const rows = await db.all(`SELECT c.*, u.full_name as user_name, b.booking_number FROM commissions c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN bookings b ON c.booking_id = b.id WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { user_id, booking_id, commission_type, amount, currency, percentage, notes } = req.body;
  if (!user_id) return res.status(400).json({ error: 'User is required' });
  const result = await db.run('INSERT INTO commissions (user_id, booking_id, commission_type, amount, currency, percentage, notes) VALUES (?,?,?,?,?,?,?)',
    [user_id, booking_id || null, commission_type || null, amount || 0, currency || 'USD', percentage || 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'commissions', req.params.id, req.user?.id);
  await db.run('DELETE FROM commissions WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

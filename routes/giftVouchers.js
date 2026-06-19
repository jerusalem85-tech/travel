import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (search) { where += ' AND (code LIKE ? OR notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (is_active !== undefined) { where += ' AND is_active = ?'; params.push(is_active); }
  const rows = await db.all(`SELECT v.*, c.full_name as customer_name FROM gift_vouchers v LEFT JOIN customers c ON v.customer_id = c.id ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM gift_vouchers ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { code, customer_id, amount, expiry_date, notes } = req.body;
  const result = await db.run(`INSERT INTO gift_vouchers (code, customer_id, amount, remaining, expiry_date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [code, customer_id, amount, amount, expiry_date, notes]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { customer_id, amount, remaining, expiry_date, is_active, notes } = req.body;
  await db.run(`UPDATE gift_vouchers SET customer_id=?, amount=?, remaining=?, expiry_date=?, is_active=?, notes=? WHERE id=?`,
    [customer_id, amount, remaining, expiry_date, is_active, notes, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'gift_vouchers', req.params.id, req.user?.id);
  await db.run('DELETE FROM gift_vouchers WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;

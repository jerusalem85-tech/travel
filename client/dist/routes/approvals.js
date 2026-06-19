import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { request_type, status, requested_by, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (request_type) { where += ' AND request_type = ?'; params.push(request_type); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (requested_by) { where += ' AND requested_by = ?'; params.push(parseInt(requested_by, 10)); }
  const count = await db.get(`SELECT COUNT(*) as count FROM approvals WHERE ${where}`, params);
  const rows = await db.all(`SELECT a.*, req.full_name as requested_by_name, apr.full_name as approved_by_name FROM approvals a LEFT JOIN users req ON a.requested_by = req.id LEFT JOIN users apr ON a.approved_by = apr.id WHERE ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { request_type, request_id, title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await db.run('INSERT INTO approvals (request_type, request_id, requested_by, title, description) VALUES (?,?,?,?,?)',
    [request_type || null, request_id || null, req.user?.id || null, title, description || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id/approve', async (req, res) => {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run('UPDATE approvals SET status=?, approved_by=?, approved_at=? WHERE id=?', ['approved', req.user?.id || null, now, req.params.id]);
  res.json({ message: 'Approved' });
});

router.put('/:id/reject', async (req, res) => {
  const db = await getDb();
  const { notes } = req.body;
  await db.run('UPDATE approvals SET status=?, notes=? WHERE id=?', ['rejected', notes || null, req.params.id]);
  res.json({ message: 'Rejected' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM approvals WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

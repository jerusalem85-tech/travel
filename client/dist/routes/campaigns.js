import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (type) { where += ' AND type = ?'; params.push(type); }
  const rows = await db.all(`SELECT * FROM campaigns ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM campaigns ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, type, audience, subject, content, scheduled_at } = req.body;
  const result = await db.run(`INSERT INTO campaigns (name, type, audience, subject, content, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, type, audience, subject, content, scheduled_at]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, type, audience, subject, content, status, scheduled_at } = req.body;
  await db.run(`UPDATE campaigns SET name=?, type=?, audience=?, subject=?, content=?, status=?, scheduled_at=? WHERE id=?`,
    [name, type, audience, subject, content, status, scheduled_at, req.params.id]);
  res.json({ success: true });
});

router.put('/:id/send', async (req, res) => {
  const db = await getDb();
  await db.run(`UPDATE campaigns SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE id=?`, [req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'campaigns', req.params.id, req.user?.id);
  await db.run('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { type, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  let params = [];
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
  const rows = await db.all(`SELECT * FROM templates ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, Number(limit), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM templates ${where}`, params);
  res.json({ rows, total: total.count, page: Number(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM templates WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Template not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, type, subject, body, variables, is_active } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'Name and body are required' });
  const result = await db.run('INSERT INTO templates (name, type, subject, body, variables, is_active) VALUES (?,?,?,?,?,?)',
    [name, type || 'whatsapp', subject || null, body, variables || null, is_active !== undefined ? is_active : 1]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, type, subject, body, variables, is_active } = req.body;
  await db.run('UPDATE templates SET name=?, type=?, subject=?, body=?, variables=?, is_active=? WHERE id=?',
    [name, type, subject, body, variables, is_active, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM templates WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

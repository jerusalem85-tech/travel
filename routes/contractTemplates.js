import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, type, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (is_active !== undefined) { where += ' AND is_active = ?'; params.push(is_active); }
  const rows = await db.all(`SELECT * FROM contract_templates ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM contract_templates ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, type, content, variables } = req.body;
  const result = await db.run(`INSERT INTO contract_templates (name, type, content, variables) VALUES (?, ?, ?, ?)`,
    [name, type, content, variables]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM contract_templates WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, type, content, variables, is_active } = req.body;
  await db.run(`UPDATE contract_templates SET name=?, type=?, content=?, variables=?, is_active=? WHERE id=?`,
    [name, type, content, variables, is_active, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'contract_templates', req.params.id, req.user?.id);
  await db.run('DELETE FROM contract_templates WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (entity_type) {
    where += ' AND entity_type = ?';
    params.push(entity_type);
  }
  if (entity_id) {
    where += ' AND entity_id = ?';
    params.push(parseInt(entity_id));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM documents WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM documents WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, document_type, file_name, notes } = req.body;
  const result = await db.run('INSERT INTO documents (entity_type, entity_id, document_type, file_name, notes) VALUES (?,?,?,?,?)',
    [entity_type || null, entity_id || null, document_type || null, file_name || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM documents WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

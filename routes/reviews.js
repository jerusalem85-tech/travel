import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, customer_id, min_rating, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (entity_type) {
    where += ' AND entity_type = ?';
    params.push(entity_type);
  }
  if (entity_id) {
    where += ' AND entity_id = ?';
    params.push(entity_id);
  }
  if (customer_id) {
    where += ' AND customer_id = ?';
    params.push(customer_id);
  }
  if (min_rating) {
    where += ' AND rating >= ?';
    params.push(min_rating);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM reviews WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM reviews WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, customer_id, booking_id, rating, review_text, reviewer_name } = req.body;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'Entity type and entity ID are required' });
  const result = await db.run('INSERT INTO reviews (entity_type, entity_id, customer_id, booking_id, rating, review_text, reviewer_name) VALUES (?,?,?,?,?,?,?)',
    [entity_type, entity_id, customer_id || null, booking_id || null, rating || 5, review_text || null, reviewer_name || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'reviews', req.params.id, req.user?.id);
  await db.run('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, category, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (entity_type) { where += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { where += ' AND entity_id = ?'; params.push(entity_id); }
  if (category) { where += ' AND category = ?'; params.push(category); }
  const rows = await db.all(`SELECT * FROM gallery_images ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM gallery_images ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, image_url, caption, category, sort_order } = req.body;
  const result = await db.run(`INSERT INTO gallery_images (entity_type, entity_id, image_url, caption, category, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [entity_type, entity_id || null, image_url, caption, category, sort_order || 0]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { caption, category, sort_order } = req.body;
  await db.run(`UPDATE gallery_images SET caption=?, category=?, sort_order=? WHERE id=?`,
    [caption, category, sort_order, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'gallery_images', req.params.id, req.user?.id);
  await db.run('DELETE FROM gallery_images WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT category FROM gallery_images WHERE category IS NOT NULL ORDER BY category');
  res.json(rows.map(r => r.category));
});

export default router;

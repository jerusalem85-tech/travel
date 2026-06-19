import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, category, is_published, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }
  if (is_published !== undefined) {
    where += ' AND is_published = ?';
    params.push(parseInt(is_published));
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM knowledge_articles WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM knowledge_articles WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { title, category, content, tags, is_published, created_by } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await db.run('INSERT INTO knowledge_articles (title, category, content, tags, is_published, created_by) VALUES (?,?,?,?,?,?)',
    [title, category || null, content || null, tags || null, is_published !== undefined ? is_published : 1, created_by || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { title, category, content, tags, is_published, created_by } = req.body;
  await db.run('UPDATE knowledge_articles SET title=?, category=?, content=?, tags=?, is_published=?, created_by=? WHERE id=?',
    [title, category, content, tags, is_published, created_by, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/views', async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE knowledge_articles SET views = views + 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Views updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'knowledge_articles', req.params.id, req.user?.id);
  await db.run('DELETE FROM knowledge_articles WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT category FROM knowledge_articles WHERE category IS NOT NULL ORDER BY category');
  res.json(rows.map(r => r.category));
});

export default router;

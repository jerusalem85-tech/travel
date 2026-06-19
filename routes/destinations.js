import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, is_active, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (name LIKE ? OR country LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (is_active !== undefined && is_active !== '') {
    where += ' AND is_active = ?';
    params.push(is_active);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM destinations WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM destinations WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, country, description, attractions, best_season, currency, language, timezone, visa_info, health_info, image_url, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run(`INSERT INTO destinations (name, country, description, attractions, best_season, currency, language, timezone, visa_info, health_info, image_url, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, country || null, description || null, attractions || null, best_season || null, currency || null, language || null, timezone || null, visa_info || null, health_info || null, image_url || null, is_active !== undefined ? is_active : 1]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, country, description, attractions, best_season, currency, language, timezone, visa_info, health_info, image_url, is_active } = req.body;
  await db.run(`UPDATE destinations SET name=?, country=?, description=?, attractions=?, best_season=?, currency=?, language=?, timezone=?, visa_info=?, health_info=?, image_url=?, is_active=? WHERE id=?`,
    [name, country, description, attractions, best_season, currency, language, timezone, visa_info, health_info, image_url, is_active, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'destinations', req.params.id, req.user?.id);
  await db.run('DELETE FROM destinations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

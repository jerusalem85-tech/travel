import { Router } from 'express';
import { getDb, isMySQL } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const userId = req.user.id;
  let prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  if (!prefs) {
    await db.run('INSERT INTO user_preferences (user_id) VALUES (?)', [userId]);
    prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  }
  res.json(prefs);
});

router.put('/', async (req, res) => {
  const db = await getDb();
  const userId = req.user.id;
  const { theme_color, sidebar_collapsed, date_format } = req.body;
  const existing = await db.get('SELECT id FROM user_preferences WHERE user_id = ?', [userId]);
  if (existing) {
    await db.run('UPDATE user_preferences SET theme_color=?, sidebar_collapsed=?, date_format=? WHERE user_id=?',
      [theme_color || 'indigo', sidebar_collapsed !== undefined ? (sidebar_collapsed ? 1 : 0) : 0, date_format || 'YYYY-MM-DD', userId]);
  } else {
    await db.run('INSERT INTO user_preferences (user_id, theme_color, sidebar_collapsed, date_format) VALUES (?,?,?,?)',
      [userId, theme_color || 'indigo', sidebar_collapsed ? 1 : 0, date_format || 'YYYY-MM-DD']);
  }
  const prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  res.json(prefs);
});

export default router;

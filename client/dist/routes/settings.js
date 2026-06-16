import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => settings[r.key || r.key_name] = r.value);
  res.json(settings);
});

router.put('/', async (req, res) => {
  const db = await getDb();
  for (const [key, value] of Object.entries(req.body)) {
    const existing = await db.get('SELECT * FROM settings WHERE key = ? OR key_name = ?', [key, key]);
    const keyCol = existing ? 'key' : 'key_name';
    if (existing) {
      await db.run(`UPDATE settings SET value = ? WHERE ${keyCol} = ?`, [value, key]);
    } else {
      await db.run('INSERT INTO settings (key, value) VALUES (?,?)', [key, value]);
    }
  }
  res.json({ message: 'Settings saved' });
});

export default router;

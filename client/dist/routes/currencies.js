import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM currencies ORDER BY is_default DESC, code ASC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { code, name, exchange_rate } = req.body;
  if (!code) return res.status(400).json({ error: 'Currency code is required' });
  const result = await db.run('INSERT INTO currencies (code, name, exchange_rate) VALUES (?,?,?)',
    [code.toUpperCase(), name || null, exchange_rate || 1.0000]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, exchange_rate } = req.body;
  await db.run('UPDATE currencies SET name=?, exchange_rate=? WHERE id=?',
    [name, exchange_rate, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const currency = await db.get('SELECT * FROM currencies WHERE id = ?', [req.params.id]);
  if (!currency) return res.status(404).json({ error: 'Currency not found' });
  if (currency.is_default) return res.status(400).json({ error: 'Cannot delete default currency' });
  await moveToTrash(db, 'currencies', req.params.id, req.user?.id);
  await db.run('DELETE FROM currencies WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/:id/set-default', async (req, res) => {
  const db = await getDb();
  const currency = await db.get('SELECT * FROM currencies WHERE id = ?', [req.params.id]);
  if (!currency) return res.status(404).json({ error: 'Currency not found' });
  await db.run('UPDATE currencies SET is_default = 0 WHERE is_default = 1');
  await db.run('UPDATE currencies SET is_default = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Set as default' });
});

export default router;

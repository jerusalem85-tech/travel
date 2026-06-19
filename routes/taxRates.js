import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { is_active } = req.query;
  let where = '1=1';
  let params = [];
  if (is_active !== undefined && is_active !== '') {
    where += ' AND is_active = ?';
    params.push(is_active);
  }
  const rows = await db.all(`SELECT * FROM tax_rates WHERE ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, rate, applies_to, is_active, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await db.run('INSERT INTO tax_rates (name, rate, applies_to, is_active, notes) VALUES (?,?,?,?,?)',
    [name, rate || 0, applies_to || 'all', is_active !== undefined ? is_active : 1, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, rate, applies_to, is_active, notes } = req.body;
  await db.run('UPDATE tax_rates SET name=?, rate=?, applies_to=?, is_active=?, notes=? WHERE id=?',
    [name, rate, applies_to, is_active, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (full_name LIKE ? OR phone LIKE ? OR company LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM brokers WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM brokers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM brokers WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, company, commission_rate, contract_start, contract_end, status, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO brokers (full_name, phone, email, company, commission_rate, contract_start, contract_end, status, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, company || null, commission_rate || 0, contract_start || null, contract_end || null, status || 'active', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, company, commission_rate, contract_start, contract_end, status, notes } = req.body;
  await db.run('UPDATE brokers SET full_name=?, phone=?, email=?, company=?, commission_rate=?, contract_start=?, contract_end=?, status=?, notes=? WHERE id=?',
    [full_name, phone, email, company, commission_rate, contract_start, contract_end, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM brokers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

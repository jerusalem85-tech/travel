import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, department, is_emergency, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR department LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (department) { where += ' AND department = ?'; params.push(department); }
  if (is_emergency !== undefined && is_emergency !== '') { where += ' AND is_emergency = ?'; params.push(parseInt(is_emergency, 10)); }
  const count = await db.get(`SELECT COUNT(*) as count FROM phone_directory WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM phone_directory WHERE ${where} ORDER BY full_name ASC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, department, position, is_emergency, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });
  const result = await db.run('INSERT INTO phone_directory (full_name, phone, email, department, position, is_emergency, notes) VALUES (?,?,?,?,?,?,?)',
    [full_name, phone || null, email || null, department || null, position || null, is_emergency ? 1 : 0, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, phone, email, department, position, is_emergency, notes } = req.body;
  await db.run('UPDATE phone_directory SET full_name=?, phone=?, email=?, department=?, position=?, is_emergency=?, notes=? WHERE id=?',
    [full_name, phone, email, department, position, is_emergency ? 1 : 0, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'phone_directory', req.params.id, req.user?.id);
  await db.run('DELETE FROM phone_directory WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/departments', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT DISTINCT department FROM phone_directory WHERE department IS NOT NULL AND department != \'\' ORDER BY department');
  res.json(rows.map(r => r.department));
});

export default router;

import { Router } from 'express';
import { getDb } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (full_name, email, password, role) VALUES (?,?,?,?)',
    [full_name, email, hash, role || 'user']
  );
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { full_name, email, role, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET full_name=?, email=?, role=?, password=? WHERE id=?', [full_name, email, role, hash, req.params.id]);
  } else {
    await db.run('UPDATE users SET full_name=?, email=?, role=? WHERE id=?', [full_name, email, role, req.params.id]);
  }
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  if (parseInt(req.params.id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  await moveToTrash(db, 'users', req.params.id, req.user?.id);
  await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

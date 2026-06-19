import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../config/database.js';

const router = Router();

router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ message: 'Password changed' });
});

export default router;

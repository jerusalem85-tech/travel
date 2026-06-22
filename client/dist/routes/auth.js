import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getDb } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'travel-jwt-secret-2024';

const router = Router();

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password format' });

    const { email, password } = req.body;
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '').toString().substring(0, 45);
      const ua = (req.headers['user-agent'] || '').toString().substring(0, 255);
      await db.run('INSERT INTO login_log (user_id, full_name, action, ip_address, user_agent) VALUES (?,?,?,?,?)',
        [user.id, user.full_name || '', 'login', ip, ua]);
    } catch (logErr) {
      console.error('Login log insert failed:', logErr.message);
    }

    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
  }
);

router.post('/logout', authMiddleware, async (req, res) => {
  const db = await getDb();
  await db.run('INSERT INTO login_log (user_id, full_name, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.full_name, 'logout', req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown', req.headers['user-agent'] || '']);
  res.json({ success: true });
});

router.get('/me', authMiddleware, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, full_name, email, role FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

router.post('/reset-admin', async (req, res) => {
  const { key, email } = req.body;
  if (key !== JWT_SECRET) return res.status(403).json({ error: 'Invalid reset key' });
  const db = await getDb();
  const target = email || 'jerusalem85@gmail.com';
  const hash = await bcrypt.hash('admin123', 10);
  const exists = await db.get('SELECT id FROM users WHERE email = ?', [target]);
  if (exists) {
    await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, target]);
    res.json({ message: `Password reset: ${target} / admin123` });
  } else {
    await db.run('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin', target, hash, 'admin']);
    res.json({ message: `User created: ${target} / admin123` });
  }
});

router.post('/change-password', authMiddleware,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const { currentPassword, newPassword } = req.body;
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password changed' });
  }
);

export default router;

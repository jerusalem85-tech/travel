import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { init, getDb, isMySQL } from './config/database.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'travel-jwt-secret-2024';

app.use(cors());
app.use(express.json());
const staticDir = fs.existsSync(path.join(__dirname, 'client', 'dist', 'index.html'))
  ? path.join(__dirname, 'client', 'dist') : __dirname;
app.use(express.static(staticDir));

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, full_name: user.full_name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, full_name, email, role FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  const monthFilter = isMySQL() ? "DATE_FORMAT(created_at, '%Y-%m') = ?" : "strftime('%Y-%m', created_at) = ?";
  const [bookingsCount, customersCount, suppliersCount, pendingBookings, todayBookings, monthPayments, monthExpenses, recentBookings] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM bookings'),
    db.get('SELECT COUNT(*) as count FROM customers'),
    db.get('SELECT COUNT(*) as count FROM suppliers'),
    db.get("SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending','confirmed')"),
    db.get('SELECT COUNT(*) as count FROM bookings WHERE date(travel_date) = ?', [today]),
    db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${monthFilter}`, [month]),
    db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${monthFilter}`, [month]),
    db.all('SELECT b.*, c.full_name as customer_name FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id ORDER BY b.created_at DESC LIMIT 10'),
  ]);
  res.json({
    bookingsCount: bookingsCount.count,
    customersCount: customersCount.count,
    suppliersCount: suppliersCount.count,
    pendingBookings: pendingBookings.count,
    todayBookings: todayBookings.count,
    monthPayments: monthPayments.total,
    monthExpenses: monthExpenses.total,
    monthProfit: monthPayments.total - monthExpenses.total,
    recentBookings,
  });
});

app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
  res.json({ count: result.count });
});

import authRoutes from './routes/auth.js';
import bookingsRoutes from './routes/bookings.js';
import customersRoutes from './routes/customers.js';
import suppliersRoutes from './routes/suppliers.js';
import invoicesRoutes from './routes/invoices.js';
import paymentsRoutes from './routes/payments.js';
import expensesRoutes from './routes/expenses.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import quotationsRoutes from './routes/quotations.js';
import usersRoutes from './routes/users.js';
import notificationsRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';

app.use('/api/auth', authMiddleware, authRoutes);
app.use('/api/bookings', authMiddleware, bookingsRoutes);
app.use('/api/customers', authMiddleware, customersRoutes);
app.use('/api/suppliers', authMiddleware, suppliersRoutes);
app.use('/api/invoices', authMiddleware, invoicesRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/expenses', authMiddleware, expensesRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/quotations', authMiddleware, quotationsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/backup', authMiddleware, backupRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  await init();
  const db = await getDb();
  const hash = await bcrypt.hash('password', 10);
  const existing = await db.get('SELECT id FROM users WHERE email = ?', ['jerusalem85@gmail.com']);
  if (existing) {
    await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, 'jerusalem85@gmail.com']);
    console.log('Admin password reset');
  } else {
    await db.run('INSERT INTO users (full_name, email, password, role) VALUES (?,?,?,?)', ['مدير النظام', 'jerusalem85@gmail.com', hash, 'admin']);
    console.log('Default admin user created');
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  if (process.env.USE_MYSQL !== 'true') {
    console.log('Using SQLite (local dev). Set USE_MYSQL=true for MySQL.');
  }
}
start();

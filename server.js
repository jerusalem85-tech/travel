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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';
  await db.run('INSERT INTO login_log (user_id, full_name, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [user.id, user.full_name, 'login', ip, ua]);
  res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
});

app.post('/api/auth/reset-admin', async (req, res) => {
  const { key, email } = req.body;
  if (key !== JWT_SECRET) return res.status(403).json({ error: 'Invalid reset key' });
  const targetEmail = email || 'admin@travel.com';
  const db = await getDb();
  const hash = await bcrypt.hash('admin123', 10);
  await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, targetEmail]);
  res.json({ message: `Password reset to admin123 for ${targetEmail}` });
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const db = await getDb();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';
  await db.run('INSERT INTO login_log (user_id, full_name, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.full_name, 'logout', ip, ua]);
  res.json({ success: true });
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
  const [bookingsCount, customersCount, suppliersCount, pendingBookings, todayBookings, monthPayments, monthExpenses, recentBookings, hotelsCount, contractsCount] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM bookings'),
    db.get('SELECT COUNT(*) as count FROM customers'),
    db.get('SELECT COUNT(*) as count FROM suppliers'),
    db.get("SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending','confirmed')"),
    db.get('SELECT COUNT(*) as count FROM bookings WHERE date(travel_date) = ?', [today]),
    db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${monthFilter}`, [month]),
    db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${monthFilter}`, [month]),
    db.all('SELECT b.*, c.full_name as customer_name FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id ORDER BY b.created_at DESC LIMIT 10'),
    db.get('SELECT COUNT(*) as count FROM hotels'),
    db.get('SELECT COUNT(*) as count FROM contracts'),
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
    hotelsCount: hotelsCount.count,
    contractsCount: contractsCount.count,
  });
});

app.get('/api/stats/overview', authMiddleware, async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  const monthFilter = isMySQL() ? "DATE_FORMAT(created_at, '%Y-%m') = ?" : "strftime('%Y-%m', created_at) = ?";
  const [totalBookings, totalCustomers, totalRevenue, totalExpenses, pendingTasks, activeInstallments, dueInstallments, recentActivity] = await Promise.all([
    db.get('SELECT COUNT(*) as c FROM bookings'),
    db.get('SELECT COUNT(*) as c FROM customers'),
    db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE ${monthFilter}`, [month]),
    db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE ${monthFilter}`, [month]),
    db.get("SELECT COUNT(*) as c FROM tasks WHERE status != 'completed'"),
    db.get("SELECT COUNT(*) as c FROM installment_plans WHERE status = 'active'"),
    db.get("SELECT COUNT(*) as c FROM installment_payments WHERE status = 'pending' AND due_date <= ?", [today]),
    db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5'),
  ]);
  res.json({
    totalBookings: totalBookings.c,
    totalCustomers: totalCustomers.c,
    totalRevenue: totalRevenue.t,
    totalExpenses: totalExpenses.t,
    netProfit: totalRevenue.t - totalExpenses.t,
    pendingTasks: pendingTasks.c,
    activeInstallments: activeInstallments.c,
    dueInstallments: dueInstallments.c,
    recentActivity,
  });
});

app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
  res.json({ count: result.count });
});

app.get('/api/stats/top-customers', authMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = await db.all(`SELECT c.id, c.full_name, c.phone, c.email, COUNT(b.id) as booking_count, COALESCE(SUM(p.amount), 0) as total_paid
    FROM customers c LEFT JOIN bookings b ON c.id = b.customer_id
    LEFT JOIN payments p ON b.id = p.booking_id
    GROUP BY c.id ORDER BY total_paid DESC LIMIT 5`);
  res.json(rows);
});

app.get('/api/trash/count', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.get('SELECT COUNT(*) as count FROM trash');
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
import hotelsRoutes from './routes/hotels.js';
import tourPackagesRoutes from './routes/tourPackages.js';
import insuranceRoutes from './routes/insurance.js';
import contractsRoutes from './routes/contracts.js';
import commissionsRoutes from './routes/commissions.js';
import activityLogRoutes from './routes/activityLog.js';
import currenciesRoutes from './routes/currencies.js';
import communicationsRoutes from './routes/communications.js';
import visasRoutes from './routes/visas.js';
import documentsRoutes from './routes/documents.js';
import tasksRoutes from './routes/tasks.js';
import priceListsRoutes from './routes/priceLists.js';
import checklistRoutes from './routes/checklist.js';
import inventoryRoutes from './routes/inventory.js';
import leadsRoutes from './routes/leads.js';
import employeesRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import salariesRoutes from './routes/salaries.js';
import vehiclesRoutes from './routes/vehicles.js';
import guidesRoutes from './routes/guides.js';
import discountsRoutes from './routes/discounts.js';
import taxRatesRoutes from './routes/taxRates.js';
import reviewsRoutes from './routes/reviews.js';
import trashRoutes from './routes/trash.js';
import loginLogRoutes from './routes/loginLog.js';
import templatesRoutes from './routes/templates.js';
import brokersRoutes from './routes/brokers.js';
import brokerCommissionsRoutes from './routes/brokerCommissions.js';
import transfersRoutes from './routes/transfers.js';
import servicesCatalogRoutes from './routes/servicesCatalog.js';
import restaurantBookingsRoutes from './routes/restaurantBookings.js';
import propertiesRoutes from './routes/properties.js';
import referralsRoutes from './routes/referrals.js';
import installmentsRoutes from './routes/installments.js';
import userPreferencesRoutes from './routes/userPreferences.js';
import airportsRoutes from './routes/airports.js';
import airlinesRoutes from './routes/airlines.js';
import destinationsRoutes from './routes/destinations.js';
import flightSchedulesRoutes from './routes/flightSchedules.js';
import followUpsRoutes from './routes/followUps.js';
import customerTimelineRoutes from './routes/customerTimeline.js';
import priceCalculatorRoutes from './routes/priceCalculator.js';
import surveysRoutes from './routes/surveys.js';
import knowledgeArticlesRoutes from './routes/knowledgeArticles.js';
import complaintsRoutes from './routes/complaints.js';
import giftVouchersRoutes from './routes/giftVouchers.js';
import campaignsRoutes from './routes/campaigns.js';
import loyaltyPointsRoutes from './routes/loyaltyPoints.js';
import galleryRoutes from './routes/gallery.js';
import contractTemplatesRoutes from './routes/contractTemplates.js';
import signedContractsRoutes from './routes/signedContracts.js';
import execDashboardRoutes from './routes/execDashboard.js';
import appointmentsRoutes from './routes/appointments.js';
import approvalsRoutes from './routes/approvals.js';
import phoneDirectoryRoutes from './routes/phoneDirectory.js';
import uploadsRoutes from './routes/uploads.js';
import dailyLogsRoutes from './routes/dailyLogs.js';

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
app.use('/api/hotels', authMiddleware, hotelsRoutes);
app.use('/api/tour-packages', authMiddleware, tourPackagesRoutes);
app.use('/api/insurance', authMiddleware, insuranceRoutes);
app.use('/api/contracts', authMiddleware, contractsRoutes);
app.use('/api/commissions', authMiddleware, commissionsRoutes);
app.use('/api/activity-log', authMiddleware, activityLogRoutes);
app.use('/api/currencies', authMiddleware, currenciesRoutes);
app.use('/api/communications', authMiddleware, communicationsRoutes);
app.use('/api/visas', authMiddleware, visasRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);
app.use('/api/price-lists', authMiddleware, priceListsRoutes);
app.use('/api/checklist', authMiddleware, checklistRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/employees', authMiddleware, employeesRoutes);
app.use('/api/attendance', authMiddleware, attendanceRoutes);
app.use('/api/salaries', authMiddleware, salariesRoutes);
app.use('/api/vehicles', authMiddleware, vehiclesRoutes);
app.use('/api/guides', authMiddleware, guidesRoutes);
app.use('/api/discounts', authMiddleware, discountsRoutes);
app.use('/api/tax-rates', authMiddleware, taxRatesRoutes);
app.use('/api/reviews', authMiddleware, reviewsRoutes);
app.use('/api/trash', authMiddleware, trashRoutes);
app.use('/api/login-log', authMiddleware, loginLogRoutes);
app.use('/api/templates', authMiddleware, templatesRoutes);
app.use('/api/brokers', authMiddleware, brokersRoutes);
app.use('/api/broker-commissions', authMiddleware, brokerCommissionsRoutes);
app.use('/api/transfers', authMiddleware, transfersRoutes);
app.use('/api/services-catalog', authMiddleware, servicesCatalogRoutes);
app.use('/api/restaurant-bookings', authMiddleware, restaurantBookingsRoutes);
app.use('/api/properties', authMiddleware, propertiesRoutes);
app.use('/api/referrals', authMiddleware, referralsRoutes);
app.use('/api/installments', authMiddleware, installmentsRoutes);
app.use('/api/user-preferences', authMiddleware, userPreferencesRoutes);
app.use('/api/airports', authMiddleware, airportsRoutes);
app.use('/api/airlines', authMiddleware, airlinesRoutes);
app.use('/api/destinations', authMiddleware, destinationsRoutes);
app.use('/api/flight-schedules', authMiddleware, flightSchedulesRoutes);
app.use('/api/follow-ups', authMiddleware, followUpsRoutes);
app.use('/api/customer-timeline', authMiddleware, customerTimelineRoutes);
app.use('/api/price-calculator', authMiddleware, priceCalculatorRoutes);
app.use('/api/surveys', authMiddleware, surveysRoutes);
app.use('/api/knowledge', authMiddleware, knowledgeArticlesRoutes);
app.use('/api/complaints', authMiddleware, complaintsRoutes);
app.use('/api/gift-vouchers', authMiddleware, giftVouchersRoutes);
app.use('/api/campaigns', authMiddleware, campaignsRoutes);
app.use('/api/loyalty-points', authMiddleware, loyaltyPointsRoutes);
app.use('/api/gallery', authMiddleware, galleryRoutes);
app.use('/api/contract-templates', authMiddleware, contractTemplatesRoutes);
app.use('/api/signed-contracts', authMiddleware, signedContractsRoutes);
app.use('/api/exec-dashboard', authMiddleware, execDashboardRoutes);
app.use('/api/appointments', authMiddleware, appointmentsRoutes);
app.use('/api/approvals', authMiddleware, approvalsRoutes);
app.use('/api/phone-directory', authMiddleware, phoneDirectoryRoutes);
app.use('/api/uploads', authMiddleware, uploadsRoutes);
app.use('/api/daily-logs', authMiddleware, dailyLogsRoutes);

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

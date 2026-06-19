import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { init, getDb, isMySQL as isMySQLConnected } from './config/database.js';

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
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, full_name: user.full_name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '').toString().substring(0,45);
      const ua = (req.headers['user-agent'] || '').toString().substring(0,255);
      const name = user.full_name || '';
      await db.run('INSERT INTO login_log (user_id, full_name, action, ip_address, user_agent) VALUES (?,?,?,?,?)',
        [user.id, name, 'login', ip, ua]);
    } catch (logErr) {
      console.error('Login log insert failed:', logErr.message);
    }
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack?.split('\n')[0] });
  }
});

app.get('/api/debug', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), node: process.version });
});
app.get('/api/debug/db', async (req, res) => {
  try {
    const db = await getDb();
    const count = await db.get('SELECT COUNT(*) as c FROM users');
    const rows = await db.all('SELECT id, email, role FROM users');
    const pw = await db.get('SELECT password FROM users WHERE email = ?', ['jerusalem85@gmail.com']);
    let hashOk = false;
    if (pw) {
      hashOk = await bcrypt.compare('password', pw.password);
    }
    res.json({ db: 'connected', count: count.c, mysql: isMySQLConnected(), users: rows, hashOk, pwPrefix: pw?.password?.substring(0, 20) });
  } catch (e) {
    res.json({ error: e.message, stack: e.stack?.split('\n')[0] });
  }
});

app.post('/api/auth/reset-admin', async (req, res) => {
  try {
    const { key, email } = req.body;
    const target = email || 'jerusalem85@gmail.com';
    if (key !== JWT_SECRET) return res.status(403).json({ error: 'Invalid reset key' });
    const db = await getDb();
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
  const monthFilter = isMySQLConnected() ? "DATE_FORMAT(created_at, '%Y-%m') = ?" : "strftime('%Y-%m', created_at) = ?";
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
  const monthFilter = isMySQLConnected() ? "DATE_FORMAT(created_at, '%Y-%m') = ?" : "strftime('%Y-%m', created_at) = ?";
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

app.post('/api/seed', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const db = await getDb();
    const existing = await db.get('SELECT COUNT(*) as c FROM bookings');
    if (existing.c >= 40) return res.json({ message: `Already have ${existing.c} bookings`, count: existing.c });
    const custCount = await db.get('SELECT COUNT(*) as c FROM customers');
    if (custCount.c < 15) {
      const customers = [
        ['Ahmad Hassan', '0599123456', 'ahmad@mail.com'],
        ['Sara Mahmoud', '0599234567', 'sara@mail.com'],
        ['Mohammad Ali', '0599345678', 'mohd@mail.com'],
        ['Noor Hasan', '0599456789', 'noor@mail.com'],
        ['Khaled Omar', '0599567890', 'khaled@mail.com'],
        ['Lina Ibrahim', '0599678901', 'lina@mail.com'],
        ['Abdullah Yousif', '0599789012', 'abd@mail.com'],
        ['Maryam Sami', '0599890123', 'maryam@mail.com'],
        ['Yousif Rami', '0599901234', 'yousif@mail.com'],
        ['Hind Adel', '0599012345', 'hind@mail.com'],
        ['Tariq Ziyad', '0599112233', 'tariq@mail.com'],
        ['Dina Waleed', '0599223344', 'dina@mail.com'],
        ['Sami Jamal', '0599334455', 'sami@mail.com'],
        ['Rana Fouad', '0599445566', 'rana@mail.com'],
        ['Basem Kamal', '0599556677', 'basem@mail.com'],
      ];
      for (const c of customers) {
        await db.run('INSERT INTO customers (full_name, phone, email) VALUES (?,?,?)', c);
      }
    }
    const services = ['flight', 'hotel', 'package', 'visa', 'transfer', 'umrah', 'hajj'];
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const fromDests = ['Jerusalem', 'Ramallah', 'Nablus', 'Hebron', 'Gaza'];
    const toDests = ['Dubai', 'Istanbul', 'Cairo', 'Amman', 'London', 'Paris', 'Kuala Lumpur', 'Riyadh', 'Doha', 'Casablanca'];
    const amounts = [1200, 2500, 4500, 800, 1800, 3000, 5500, 1500, 900, 4200];
    const today = new Date();
    for (let i = 0; i < 40; i++) {
      const customerId = (i % 15) + 1;
      const svc = services[i % services.length];
      const fromDest = fromDests[i % fromDests.length];
      const toDest = toDests[i % toDests.length];
      const status = statuses[i % statuses.length];
      const total = amounts[i % 10];
      const paid = status === 'completed' ? total : status === 'cancelled' ? 0 : Math.round(total * [0, 0.25, 0.5, 0.75][i % 4]);
      const bookingNum = `BK-${today.getFullYear()}-${String(1000 + i + 1).padStart(4, '0')}`;
      const daysAgo = Math.floor(Math.random() * 180);
      const bDate = new Date(today); bDate.setDate(bDate.getDate() - daysAgo);
      const tDate = new Date(bDate); tDate.setDate(tDate.getDate() + Math.floor(Math.random() * 60) + 1);
      const rDate = new Date(tDate); rDate.setDate(rDate.getDate() + 7);
      const fmt = (d) => d.toISOString().split('T')[0];
      const result = await db.run(
        `INSERT INTO bookings (booking_number, customer_id, service_type, from_destination, to_destination, travel_date, return_date, total_amount, paid_amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [bookingNum, customerId, svc, fromDest, toDest, fmt(tDate), fmt(rDate), total, paid, status, `Booking #${i+1} - ${svc}`, fmt(bDate)]
      );
      const bid = typeof result.insertId === 'number' ? result.insertId : 0;
      if (i % 3 !== 0) {
        const pax = [1, 2, 3, 4][i % 4];
        for (let p = 1; p <= pax; p++) {
          await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number) VALUES (?,?,?)',
            [bid, `Passenger ${p}`, `P${100000 + bid * 10 + p}`]);
        }
      }
      if (paid > 0) {
        const methods = ['cash', 'credit_card', 'bank_transfer', 'cheque'];
        await db.run('INSERT INTO payments (payment_number, booking_id, amount, payment_method) VALUES (?,?,?,?)',
          [`PAY-${bid}`, bid, paid, methods[i % 4]]);
      }
      await db.run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
        [1, 'create', 'booking', bid, `Create booking #${bid}`]);
    }
    await db.run("INSERT INTO notifications (title, message) VALUES (?,?)", ['Bookings Added', '40 bookings have been seeded']);
    const newCount = await db.get('SELECT COUNT(*) as c FROM bookings');
    res.json({ message: 'Seed complete!', bookingsCreated: 40, totalBookings: newCount.c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
  try {
    await init();
    const db = await getDb();
    const hash = await bcrypt.hash('password', 10);
    const existing = await db.get('SELECT id FROM users WHERE email = ?', ['jerusalem85@gmail.com']);
    if (existing) {
      await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, 'jerusalem85@gmail.com']);
      console.log('Admin password reset');
    } else {
      await db.run('INSERT INTO users (full_name, email, password, role) VALUES (?,?,?,?)', ['Admin', 'jerusalem85@gmail.com', hash, 'admin']);
      console.log('Default admin user created');
    }
  } catch (e) {
    console.error('Startup error (non-fatal):', e.message);
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  if (process.env.USE_MYSQL !== 'true') {
    console.log('Using SQLite (local dev). Set USE_MYSQL=true for MySQL.');
  }
}
start();

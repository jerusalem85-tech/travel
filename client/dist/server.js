import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { init, getDb, isMySQL, forceSqliteFallback } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { airports } from './seeds/airports.js';
import { airlines } from './seeds/airlines.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Static files
const distDir = path.join(__dirname, 'client', 'dist');
const staticDir = fs.existsSync(path.join(distDir, 'index.html'))
  ? distDir
  : path.join(__dirname, 'public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
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
import supplierPaymentsRoutes from './routes/supplierPayments.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';
import aiReaderRoutes from './routes/aiReader.js';
import bookingDocumentsRoutes from './routes/bookingDocuments.js';
import callLogsRoutes from './routes/callLogs.js';
import statsRoutes from './routes/stats.js';
import seedRoutes from './routes/seed.js';

// Auth routes (login/reset-admin public, others via authMiddleware internally)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/reset-admin', authLimiter);
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/seed', authMiddleware, seedRoutes);
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
app.use('/api/supplier-payments', authMiddleware, supplierPaymentsRoutes);
app.use('/api/exchange-rates', authMiddleware, exchangeRatesRoutes);
app.use('/api/ai-reader', authMiddleware, aiReaderRoutes);
app.use('/api/booking-documents', authMiddleware, bookingDocumentsRoutes);
app.use('/api/call-logs', authMiddleware, callLogsRoutes);

// Debug (only in dev)
if (!isProd) {
  app.get('/api/debug', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), node: process.version });
  });
}

// Notifications count
app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
  res.json({ count: result.count });
});

// Trash count
app.get('/api/trash/count', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.get('SELECT COUNT(*) as count FROM trash');
  res.json({ count: result.count });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isProd ? {} : { stack: err.stack?.split('\n')[0] }),
  });
});

async function start() {
  try {
    await init();
    const db = await getDb();

    // Ensure admin user
    const hash = await bcrypt.hash('password', 10);
    const existing = await db.get('SELECT id FROM users WHERE email = ?', ['jerusalem85@gmail.com']);
    if (existing) {
      await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, 'jerusalem85@gmail.com']);
    } else {
      await db.run('INSERT INTO users (full_name, email, password, role) VALUES (?,?,?,?)',
        ['Admin', 'jerusalem85@gmail.com', hash, 'admin']);
    }

    // Seed exchange rates
    if ((await db.get('SELECT COUNT(*) as c FROM exchange_rates')).c === 0) {
      const rates = [['ILS',1],['USD',3.75],['EUR',4.07],['JOD',5.29],['AED',1.02],['THB',0.105],['EGP',0.075],['GBP',4.76]];
      for (const [c,r] of rates) {
        await db.run("INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_date) VALUES (?,?,date('now'))", [c, r]);
      }
    }

    // Seed airports
    if ((await db.get('SELECT COUNT(*) as c FROM airports')).c === 0) {
      for (const a of airports) await db.run('INSERT OR IGNORE INTO airports (code, name, city, country) VALUES (?,?,?,?)', a);
      console.log(`${(await db.get('SELECT COUNT(*) as c FROM airports')).c} airports seeded`);
    }

    // Seed airlines
    if ((await db.get('SELECT COUNT(*) as c FROM airlines')).c === 0) {
      for (const a of airlines) await db.run('INSERT OR IGNORE INTO airlines (code, name, country) VALUES (?,?,?)', a);
      console.log(`${(await db.get('SELECT COUNT(*) as c FROM airlines')).c} airlines seeded`);
    }

  } catch (e) {
    console.error('Startup error (non-fatal):', e.message);
    forceSqliteFallback();
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!isProd) console.log('Development mode');
    if (process.env.USE_MYSQL !== 'true') console.log('Using SQLite. Set USE_MYSQL=true for MySQL.');
  });
}

start();

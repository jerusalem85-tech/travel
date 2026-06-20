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
    let custSample = [];
    try {
      custSample = await db.all("SELECT * FROM customers LIMIT 1");
    } catch (e) { custSample = [{error: e.message}]; }
    res.json({ db: 'connected', count: count.c, mysql: isMySQLConnected(), users: rows, hashOk, pwPrefix: pw?.password?.substring(0, 20), custSample });
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
  const isMysql = typeof isMySQLConnected === 'function' ? isMySQLConnected() : false;
  const monthFilter = isMysql ? "DATE_FORMAT(created_at, '%Y-%m') LIKE ?" : "strftime('%Y-%m', created_at) = ?";
  let pendingBookings, todayBookings, monthPayments, monthExpenses, recentBookings, hotelsCount, contractsCount;
  try { pendingBookings = await db.get("SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending','confirmed')"); } catch { pendingBookings = { count: 0 }; }
  try { todayBookings = await db.get('SELECT COUNT(*) as count FROM bookings WHERE date(travel_date) = ?', [today]); } catch { todayBookings = { count: 0 }; }
  try { monthPayments = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${monthFilter}`, [month]); } catch { monthPayments = { total: 0 }; }
  try { monthExpenses = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${monthFilter}`, [month]); } catch { monthExpenses = { total: 0 }; }
  try { recentBookings = await db.all('SELECT b.*, COALESCE(c.full_name,c.name) as customer_name FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id ORDER BY b.created_at DESC LIMIT 10'); } catch { recentBookings = []; }
  try { hotelsCount = await db.get('SELECT COUNT(*) as count FROM hotels'); } catch { hotelsCount = { count: 0 }; }
  try { contractsCount = await db.get('SELECT COUNT(*) as count FROM contracts'); } catch { contractsCount = { count: 0 }; }
  let customerBalance = 0, supplierBalance = 0;
  try {
    const totalSelling = await db.get('SELECT COALESCE(SUM(total_amount),0) as t FROM bookings WHERE status != \'cancelled\'');
    const totalPaid = await db.get('SELECT COALESCE(SUM(amount),0) as t FROM payments');
    customerBalance = (totalSelling.t || 0) - (totalPaid.t || 0);
  } catch {}
  try {
    const totalCost = await db.get('SELECT COALESCE(SUM(cost_amount),0) as t FROM bookings WHERE status != \'cancelled\'');
    const totalSupplierPaid = await db.get('SELECT COALESCE(SUM(amount),0) as t FROM supplier_payments');
    supplierBalance = (totalCost.t || 0) - (totalSupplierPaid.t || 0);
  } catch {}
  const [bookingsCount, customersCount, suppliersCount] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM bookings'),
    db.get('SELECT COUNT(*) as count FROM customers'),
    db.get('SELECT COUNT(*) as count FROM suppliers'),
  ]);
  res.json({
    bookingsCount: bookingsCount.count,
    customersCount: customersCount.count,
    suppliersCount: suppliersCount.count,
    pendingBookings: pendingBookings.count,
    todayBookings: todayBookings.count,
    monthPayments: monthPayments.total,
    monthExpenses: monthExpenses.total,
    monthProfit: (monthPayments.total || 0) - (monthExpenses.total || 0),
    customerBalance,
    supplierBalance,
    recentBookings,
    hotelsCount: hotelsCount.count,
    contractsCount: contractsCount.count,
  });
});

app.get('/api/stats/overview', authMiddleware, async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  const isMysql = typeof isMySQLConnected === 'function' ? isMySQLConnected() : false;
  const monthFilter = isMysql ? "DATE_FORMAT(created_at, '%Y-%m') LIKE ?" : "strftime('%Y-%m', created_at) = ?";
  let totalRevenue, totalExpenses, pendingTasks, activeInstallments, dueInstallments, recentActivity;
  try { totalRevenue = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE ${monthFilter}`, [month]); } catch { totalRevenue = { t: 0 }; }
  try { totalExpenses = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE ${monthFilter}`, [month]); } catch { totalExpenses = { t: 0 }; }
  try { pendingTasks = await db.get("SELECT COUNT(*) as c FROM tasks WHERE status != 'completed'"); } catch { pendingTasks = { c: 0 }; }
  try { activeInstallments = await db.get("SELECT COUNT(*) as c FROM installment_plans WHERE status = 'active'"); } catch { activeInstallments = { c: 0 }; }
  try { dueInstallments = await db.get("SELECT COUNT(*) as c FROM installment_payments WHERE status = 'pending' AND due_date <= ?", [today]); } catch { dueInstallments = { c: 0 }; }
  try { recentActivity = await db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5'); } catch { recentActivity = []; }
  const [totalBookings, totalCustomers] = await Promise.all([
    db.get('SELECT COUNT(*) as c FROM bookings'),
    db.get('SELECT COUNT(*) as c FROM customers'),
  ]);
  res.json({
    totalBookings: totalBookings.c,
    totalCustomers: totalCustomers.c,
    totalRevenue: totalRevenue.t,
    totalExpenses: totalExpenses.t,
    netProfit: (totalRevenue.t || 0) - (totalExpenses.t || 0),
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
  const rows = await db.all(`SELECT c.id, COALESCE(c.full_name,c.name) as full_name, c.phone, c.email, COUNT(b.id) as booking_count, COALESCE(SUM(p.amount), 0) as total_paid
    FROM customers c LEFT JOIN bookings b ON c.id = b.customer_id
    LEFT JOIN payments p ON b.id = p.booking_id
    GROUP BY c.id ORDER BY total_paid DESC LIMIT 5`);
  res.json(rows);
});

app.get('/api/stats/monthly-bookings', authMiddleware, async (req, res) => {
  const db = await getDb();
  const isMysql = typeof isMySQLConnected === 'function' ? isMySQLConnected() : false;
  const query = isMysql
    ? "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM bookings GROUP BY month ORDER BY month DESC LIMIT 12"
    : "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM bookings GROUP BY month ORDER BY month DESC LIMIT 12";
  const rows = await db.all(query);
  res.json(rows.reverse());
});

app.get('/api/stats/status-breakdown', authMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT status, COUNT(*) as count FROM bookings GROUP BY status");
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
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const fromDests = ['Jerusalem', 'Ramallah', 'Nablus', 'Hebron', 'Gaza'];
    const toDests = ['Dubai', 'Istanbul', 'Cairo', 'Amman', 'London', 'Paris', 'Kuala Lumpur', 'Riyadh', 'Doha', 'Casablanca'];
    const amounts = [1200, 2500, 4500, 800, 1800, 3000, 5500, 1500, 900, 4200];
    const today = new Date();
    for (let i = 0; i < 40; i++) {
      const customerId = (i % 15) + 1;
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
        `INSERT INTO bookings (booking_number, customer_id, from_destination, to_destination, travel_date, return_date, total_amount, paid_amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [bookingNum, customerId, fromDest, toDest, fmt(tDate), fmt(rDate), total, paid, status, `Booking #${i+1}`, fmt(bDate)]
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

app.post('/api/seed-flights', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const db = await getDb();

    const airportCount = await db.get('SELECT COUNT(*) as c FROM airports');
    if (airportCount.c === 0) {
      const airports = [
        ['TLV', 'Ben Gurion Airport', 'Tel Aviv', 'Israel'],
        ['DXB', 'Dubai International Airport', 'Dubai', 'UAE'],
        ['IST', 'Istanbul Airport', 'Istanbul', 'Turkey'],
        ['CAI', 'Cairo International Airport', 'Cairo', 'Egypt'],
        ['AMM', 'Queen Alia International Airport', 'Amman', 'Jordan'],
        ['LHR', 'Heathrow Airport', 'London', 'UK'],
        ['CDG', 'Charles de Gaulle Airport', 'Paris', 'France'],
        ['KUL', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia'],
        ['RUH', 'King Khalid International Airport', 'Riyadh', 'Saudi Arabia'],
        ['DOH', 'Hamad International Airport', 'Doha', 'Qatar'],
        ['CMN', 'Mohammed V International Airport', 'Casablanca', 'Morocco'],
        ['JED', 'King Abdulaziz International Airport', 'Jeddah', 'Saudi Arabia'],
        ['ETH', 'Eilat Ramon Airport', 'Eilat', 'Israel'],
        ['AYT', 'Antalya Airport', 'Antalya', 'Turkey'],
        ['FCO', 'Leonardo da Vinci–Fiumicino Airport', 'Rome', 'Italy'],
        ['BCN', 'Barcelona–El Prat Airport', 'Barcelona', 'Spain'],
        ['MUC', 'Munich Airport', 'Munich', 'Germany'],
        ['ATH', 'Athens International Airport', 'Athens', 'Greece'],
        ['BKK', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand'],
        ['NBO', 'Jomo Kenyatta International Airport', 'Nairobi', 'Kenya'],
      ];
      for (const a of airports) {
        await db.run('INSERT INTO airports (code, name, city, country) VALUES (?,?,?,?)', a);
      }
    }

    const airlineCount = await db.get('SELECT COUNT(*) as c FROM airlines');
    if (airlineCount.c === 0) {
      const airlines = [
        ['LY', 'El Al Israel Airlines', 'Israel'],
        ['EK', 'Emirates', 'UAE'],
        ['TK', 'Turkish Airlines', 'Turkey'],
        ['MS', 'EgyptAir', 'Egypt'],
        ['RJ', 'Royal Jordanian', 'Jordan'],
        ['BA', 'British Airways', 'UK'],
        ['AF', 'Air France', 'France'],
        ['MH', 'Malaysia Airlines', 'Malaysia'],
        ['SV', 'Saudia', 'Saudi Arabia'],
        ['QR', 'Qatar Airways', 'Qatar'],
        ['AT', 'Royal Air Maroc', 'Morocco'],
        ['W6', 'Wizz Air', 'Hungary'],
        ['FR', 'Ryanair', 'Ireland'],
        ['LH', 'Lufthansa', 'Germany'],
        ['AZ', 'ITA Airways', 'Italy'],
      ];
      for (const a of airlines) {
        await db.run('INSERT INTO airlines (code, name, country) VALUES (?,?,?)', a);
      }
    }

    const airports = await db.all('SELECT id, code, name FROM airports');
    const airlines = await db.all('SELECT id, code, name FROM airlines');
    const airportMap = {};
    airports.forEach(a => { airportMap[a.code] = a; });
    const airlineMap = {};
    airlines.forEach(a => { airlineMap[a.code] = a; });

    const existingFlights = await db.get('SELECT COUNT(*) as c FROM bookings WHERE service_type = ?', ['flight']);
    if (existingFlights.c >= 20) return res.json({ message: `Already have ${existingFlights.c} flight bookings`, count: existingFlights.c });

    const routes = [
      { from: 'TLV', to: 'DXB', airline: 'EK', flight: 'EK501', dep: '12:10', arr: '19:25', depNext: true, arrNext: false },
      { from: 'DXB', to: 'TLV', airline: 'EK', flight: 'EK500', dep: '08:00', arr: '10:45', depNext: false, arrNext: false },
      { from: 'TLV', to: 'IST', airline: 'TK', flight: 'TK789', dep: '06:30', arr: '09:15', depNext: false, arrNext: false },
      { from: 'IST', to: 'TLV', airline: 'TK', flight: 'TK790', dep: '22:00', arr: '00:45', depNext: false, arrNext: true },
      { from: 'TLV', to: 'LHR', airline: 'BA', flight: 'BA164', dep: '10:15', arr: '14:30', depNext: false, arrNext: false },
      { from: 'LHR', to: 'TLV', airline: 'BA', flight: 'BA165', dep: '16:00', arr: '22:45', depNext: false, arrNext: false },
      { from: 'TLV', to: 'CDG', airline: 'AF', flight: 'AF963', dep: '13:45', arr: '17:30', depNext: false, arrNext: false },
      { from: 'CDG', to: 'TLV', airline: 'AF', flight: 'AF962', dep: '20:00', arr: '01:30', depNext: false, arrNext: true },
      { from: 'TLV', to: 'CAI', airline: 'MS', flight: 'MS501', dep: '07:00', arr: '08:15', depNext: false, arrNext: false },
      { from: 'CAI', to: 'TLV', airline: 'MS', flight: 'MS502', dep: '18:00', arr: '19:15', depNext: false, arrNext: false },
      { from: 'TLV', to: 'AMM', airline: 'RJ', flight: 'RJ301', dep: '09:30', arr: '10:45', depNext: false, arrNext: false },
      { from: 'AMM', to: 'TLV', airline: 'RJ', flight: 'RJ302', dep: '15:00', arr: '16:15', depNext: false, arrNext: false },
      { from: 'TLV', to: 'JED', airline: 'SV', flight: 'SV101', dep: '05:00', arr: '09:30', depNext: false, arrNext: false },
      { from: 'JED', to: 'TLV', airline: 'SV', flight: 'SV102', dep: '21:00', arr: '23:30', depNext: false, arrNext: false },
      { from: 'TLV', to: 'RUH', airline: 'SV', flight: 'SV201', dep: '11:00', arr: '15:00', depNext: false, arrNext: false },
      { from: 'TLV', to: 'DOH', airline: 'QR', flight: 'QR601', dep: '14:00', arr: '18:30', depNext: false, arrNext: false },
      { from: 'DOH', to: 'TLV', airline: 'QR', flight: 'QR602', dep: '20:00', arr: '22:30', depNext: false, arrNext: false },
      { from: 'TLV', to: 'CMN', airline: 'AT', flight: 'AT201', dep: '23:00', arr: '03:30', depNext: false, arrNext: true },
      { from: 'TLV', to: 'KUL', airline: 'MH', flight: 'MH151', dep: '01:00', arr: '16:30', depNext: true, arrNext: false },
      { from: 'KUL', to: 'TLV', airline: 'MH', flight: 'MH152', dep: '22:00', arr: '03:30', depNext: false, arrNext: true },
      { from: 'TLV', to: 'ATH', airline: 'A3', flight: 'A3121', dep: '07:45', arr: '10:00', depNext: false, arrNext: false },
      { from: 'ATH', to: 'TLV', airline: 'A3', flight: 'A3122', dep: '12:00', arr: '14:15', depNext: false, arrNext: false },
      { from: 'TLV', to: 'AYT', airline: 'TK', flight: 'TK300', dep: '15:30', arr: '18:00', depNext: false, arrNext: false },
      { from: 'TLV', to: 'FCO', airline: 'AZ', flight: 'AZ801', dep: '10:30', arr: '13:15', depNext: false, arrNext: false },
      { from: 'FCO', to: 'TLV', airline: 'AZ', flight: 'AZ802', dep: '14:30', arr: '19:00', depNext: false, arrNext: false },
    ];

    const customers = await db.all('SELECT id FROM customers ORDER BY RANDOM() LIMIT 25');
    if (customers.length === 0) return res.status(400).json({ error: 'No customers found. Run regular seed first.' });
    const statuses = ['pending', 'confirmed', 'confirmed', 'completed', 'confirmed', 'cancelled'];
    const today = new Date();
    let created = 0;

    for (let i = 0; i < Math.min(routes.length, 25); i++) {
      const route = routes[i];
      const customerId = customers[i % customers.length].id;
      const cust = await db.get('SELECT full_name FROM customers WHERE id = ?', [customerId]);
      const status = statuses[i % statuses.length];
      const total = [1200, 1800, 2500, 3200, 4500, 800, 5500][i % 7];
      const paid = status === 'completed' ? total : status === 'cancelled' ? 0 : Math.round(total * [0.25, 0.5][i % 2]);
      const daysAgo = Math.floor(Math.random() * 90);
      const bDate = new Date(today); bDate.setDate(bDate.getDate() - daysAgo);
      const tDate = new Date(bDate); tDate.setDate(tDate.getDate() + Math.floor(Math.random() * 14) + 2);
      const fmt = (d) => d.toISOString().split('T')[0];
      const bookingNum = `FL-${today.getFullYear()}-${String(2000 + i + 1).padStart(4, '0')}`;
      const fromAirport = airportMap[route.from];
      const toAirport = airportMap[route.to];
      if (!fromAirport || !toAirport) continue;

      const result = await db.run(
        `INSERT INTO bookings (booking_number, customer_id, from_destination, to_destination, travel_date, total_amount, paid_amount, status, airline, flight_number, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [bookingNum, customerId, `${fromAirport.code} - ${fromAirport.name}`, `${toAirport.code} - ${toAirport.name}`, fmt(tDate), total, paid, status, route.airline, route.flight, `Flight booking: ${fromAirport.code} → ${toAirport.code}`, fmt(bDate)]
      );
      const bid = typeof result.insertId === 'number' ? result.insertId : 0;
      if (bid) {
        const details = {
          airline_id: airlineMap[route.airline]?.id || '',
          airline: airlineMap[route.airline]?.name || route.airline,
          flight_number: route.flight,
          origin_airport_id: fromAirport.id,
          destination_airport_id: toAirport.id,
          origin_airport: `${fromAirport.code} - ${fromAirport.name}`,
          destination_airport: `${toAirport.code} - ${toAirport.name}`,
          departure_date: fmt(tDate),
          departure_time: route.dep,
          departure_next_day: route.depNext,
          arrival_date: fmt(tDate),
          arrival_time: route.arr,
          arrival_next_day: route.arrNext,
          ticket_number: `TKT-${bid}-${String(i).padStart(3, '0')}`,
          checked_baggage: '23',
          cabin_baggage: '7',
        };
        await db.run('INSERT INTO booking_services (booking_id, service_type, supplier_id, description, amount, details) VALUES (?,?,?,?,?,?)',
          [bid, 'flight', null, `Flight ${route.airline} ${route.flight}: ${route.from} → ${route.to}`, total, JSON.stringify(details)]);
      }
      if (i % 2 === 0) {
        for (let p = 1; p <= 2; p++) {
          await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number) VALUES (?,?,?)',
            [bid, `Passenger ${p}`, `P${100000 + bid * 10 + p}`]);
        }
      }
      if (paid > 0) {
        await db.run('INSERT INTO payments (payment_number, booking_id, amount, payment_method) VALUES (?,?,?,?)',
          [`PAY-${bid}`, bid, paid, ['cash', 'bank_transfer', 'credit_card'][i % 3]]);
      }
      created++;
    }

    const newCount = await db.get('SELECT COUNT(*) as c FROM bookings');
    res.json({ message: 'Flight seed complete!', bookingsCreated: created, totalBookings: newCount.c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/seed-full', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const db = await getDb();

    // Delete all existing bookings first
    await db.run('DELETE FROM booking_services');
    await db.run('DELETE FROM booking_passengers');
    await db.run('DELETE FROM payments');
    await db.run('DELETE FROM bookings');

    // Seed airports
    if ((await db.get('SELECT COUNT(*) as c FROM airports')).c === 0) {
      const airports = [
        ['TLV', 'Ben Gurion Airport', 'Tel Aviv', 'Israel'],
        ['DXB', 'Dubai International Airport', 'Dubai', 'UAE'],
        ['IST', 'Istanbul Airport', 'Istanbul', 'Turkey'],
        ['CAI', 'Cairo International Airport', 'Cairo', 'Egypt'],
        ['AMM', 'Queen Alia International Airport', 'Amman', 'Jordan'],
        ['LHR', 'Heathrow Airport', 'London', 'UK'],
        ['CDG', 'Charles de Gaulle Airport', 'Paris', 'France'],
        ['JED', 'King Abdulaziz International Airport', 'Jeddah', 'Saudi Arabia'],
        ['DOH', 'Hamad International Airport', 'Doha', 'Qatar'],
        ['RUH', 'King Khalid International Airport', 'Riyadh', 'Saudi Arabia'],
        ['ATH', 'Athens International Airport', 'Athens', 'Greece'],
        ['FCO', 'Leonardo da Vinci Fiumicino Airport', 'Rome', 'Italy'],
        ['BCN', 'Barcelona-El Prat Airport', 'Barcelona', 'Spain'],
        ['BKK', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand'],
        ['KUL', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia'],
      ];
      for (const a of airports) await db.run('INSERT INTO airports (code, name, city, country) VALUES (?,?,?,?)', a);
    }

    // Seed airlines
    if ((await db.get('SELECT COUNT(*) as c FROM airlines')).c === 0) {
      const airlines = [
        ['EK', 'Emirates', 'UAE'],
        ['TK', 'Turkish Airlines', 'Turkey'],
        ['LY', 'El Al Israel Airlines', 'Israel'],
        ['MS', 'EgyptAir', 'Egypt'],
        ['RJ', 'Royal Jordanian', 'Jordan'],
        ['BA', 'British Airways', 'UK'],
        ['AF', 'Air France', 'France'],
        ['SV', 'Saudia', 'Saudi Arabia'],
        ['QR', 'Qatar Airways', 'Qatar'],
        ['W6', 'Wizz Air', 'Hungary'],
        ['FR', 'Ryanair', 'Ireland'],
        ['LH', 'Lufthansa', 'Germany'],
      ];
      for (const a of airlines) await db.run('INSERT INTO airlines (code, name, country) VALUES (?,?,?)', a);
    }

    // Seed customers if needed
    if ((await db.get('SELECT COUNT(*) as c FROM customers')).c < 10) {
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
      ];
      for (const c of customers) await db.run('INSERT OR IGNORE INTO customers (full_name, phone, email) VALUES (?,?,?)', c);
    }

    const airportMap = {}; (await db.all('SELECT id, code, name FROM airports')).forEach(a => { airportMap[a.code] = a; });
    const airlineMap = {}; (await db.all('SELECT id, code, name FROM airlines')).forEach(a => { airlineMap[a.code] = a; });
    const customerIds = (await db.all('SELECT id FROM customers')).map(c => c.id);
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    const bookingTemplates = [
      {
        note: 'Round trip Dubai',
        passengers: [{ name: 'Ahmad Hassan', passport: 'P12345678', nationality: 'Palestinian', type: 'adult' }, { name: 'Sara Hassan', passport: 'P12345679', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→DXB', price: 1800, cost: 1200, supplier: 'Emirates Office', details: { airline_id: airlineMap['EK']?.id, airline: 'Emirates', flight_number: 'EK501', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['DXB']?.id, destination_airport: 'DXB - Dubai International Airport', departure_date: '2026-07-15', departure_time: '12:10', departure_next_day: false, arrival_date: '2026-07-15', arrival_time: '19:25', arrival_next_day: false, ticket_number: 'TKT-001', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'flight', desc: 'Flight DXB→TLV return', price: 1600, cost: 1100, supplier: 'Emirates Office', details: { airline_id: airlineMap['EK']?.id, airline: 'Emirates', flight_number: 'EK500', origin_airport_id: airportMap['DXB']?.id, origin_airport: 'DXB - Dubai International Airport', destination_airport_id: airportMap['TLV']?.id, destination_airport: 'TLV - Ben Gurion Airport', departure_date: '2026-07-22', departure_time: '08:00', departure_next_day: false, arrival_date: '2026-07-22', arrival_time: '10:45', arrival_next_day: false, ticket_number: 'TKT-002', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 2500, cost: 1800, supplier: 'Hilton Dubai', details: { hotel_name: 'Hilton Dubai Jumeirah', room_type: 'Deluxe Sea View', board_basis: 'breakfast', check_in: '2026-07-15', check_out: '2026-07-22' } },
        ],
      },
      {
        note: 'Istanbul package - flight + hotel + visa',
        passengers: [{ name: 'Mohammad Ali', passport: 'P23456789', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→IST', price: 900, cost: 600, supplier: 'Turkish Airlines', details: { airline_id: airlineMap['TK']?.id, airline: 'Turkish Airlines', flight_number: 'TK789', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['IST']?.id, destination_airport: 'IST - Istanbul Airport', departure_date: '2026-08-01', departure_time: '06:30', departure_next_day: false, arrival_date: '2026-08-01', arrival_time: '09:15', arrival_next_day: false, ticket_number: 'TKT-003', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 1200, cost: 800, supplier: 'Hilton Istanbul', details: { hotel_name: 'Hilton Istanbul Bosphorus', room_type: 'Standard', board_basis: 'full_board', check_in: '2026-08-01', check_out: '2026-08-08' } },
          { cat: 'visa', desc: 'Visa processing', price: 200, cost: 120, supplier: 'Visa Express', details: { country: 'Turkey', visa_type: 'tourist', processing_time: '3 days' } },
        ],
      },
      {
        note: 'Umrah trip - flight + hotel + transport',
        passengers: [{ name: 'Khaled Omar', passport: 'P34567890', nationality: 'Palestinian', type: 'adult' }, { name: 'Fatima Omar', passport: 'P34567891', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→JED', price: 1500, cost: 1000, supplier: 'Saudia Airlines', details: { airline_id: airlineMap['SV']?.id, airline: 'Saudia', flight_number: 'SV101', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['JED']?.id, destination_airport: 'JED - King Abdulaziz Intl', departure_date: '2026-06-25', departure_time: '05:00', departure_next_day: false, arrival_date: '2026-06-25', arrival_time: '09:30', arrival_next_day: false, ticket_number: 'TKT-004', checked_baggage: '30', cabin_baggage: '7' } },
          { cat: 'flight', desc: 'Flight JED→TLV return', price: 1500, cost: 1000, supplier: 'Saudia Airlines', details: { airline_id: airlineMap['SV']?.id, airline: 'Saudia', flight_number: 'SV102', origin_airport_id: airportMap['JED']?.id, origin_airport: 'JED - King Abdulaziz Intl', destination_airport_id: airportMap['TLV']?.id, destination_airport: 'TLV - Ben Gurion Airport', departure_date: '2026-07-05', departure_time: '21:00', departure_next_day: false, arrival_date: '2026-07-05', arrival_time: '23:30', arrival_next_day: false, ticket_number: 'TKT-005', checked_baggage: '30', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel in Mecca', price: 3000, cost: 2200, supplier: 'Makkah Hotel', details: { hotel_name: 'Makkah Hilton Towers', room_type: 'Standard', board_basis: 'room_only', check_in: '2026-06-25', check_out: '2026-07-05' } },
          { cat: 'transport', desc: 'Airport transfer', price: 300, cost: 200, supplier: 'Umrah Transport Co', details: { transport_type: 'van', pickup_location: 'JED Airport', dropoff_location: 'Makkah Hilton', pickup_time: '2026-06-25T10:00' } },
        ],
      },
      {
        note: 'London business trip - flight + insurance',
        passengers: [{ name: 'Abdullah Yousif', passport: 'P45678901', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→LHR', price: 2200, cost: 1600, supplier: 'British Airways Office', details: { airline_id: airlineMap['BA']?.id, airline: 'British Airways', flight_number: 'BA164', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['LHR']?.id, destination_airport: 'LHR - Heathrow Airport', departure_date: '2026-07-10', departure_time: '10:15', departure_next_day: false, arrival_date: '2026-07-10', arrival_time: '14:30', arrival_next_day: false, ticket_number: 'TKT-006', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'insurance', desc: 'Travel insurance', price: 150, cost: 80, supplier: 'AXA Insurance', details: { policy_number: 'AXA-UK-12345', coverage_type: 'Full Medical + Trip Cancellation', start_date: '2026-07-10', end_date: '2026-07-20' } },
        ],
      },
      {
        note: 'Paris honeymoon - flight + hotel',
        passengers: [{ name: 'Yousif Rami', passport: 'P56789012', nationality: 'Palestinian', type: 'adult' }, { name: 'Hind Rami', passport: 'P56789013', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→CDG', price: 2500, cost: 1800, supplier: 'Air France Office', details: { airline_id: airlineMap['AF']?.id, airline: 'Air France', flight_number: 'AF963', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['CDG']?.id, destination_airport: 'CDG - Charles de Gaulle Airport', departure_date: '2026-08-14', departure_time: '13:45', departure_next_day: false, arrival_date: '2026-08-14', arrival_time: '17:30', arrival_next_day: false, ticket_number: 'TKT-007', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 3500, cost: 2600, supplier: 'Marriott Paris', details: { hotel_name: 'Marriott Champs-Elysees', room_type: 'Junior Suite', board_basis: 'breakfast', check_in: '2026-08-14', check_out: '2026-08-21' } },
          { cat: 'transport', desc: 'Airport transfer', price: 250, cost: 150, supplier: 'Paris Transfer', details: { transport_type: 'limo', pickup_location: 'CDG Airport', dropoff_location: 'Marriott Champs-Elysees', pickup_time: '2026-08-14T18:00' } },
        ],
      },
      {
        note: 'Cairo visa run',
        passengers: [{ name: 'Sara Mahmoud', passport: 'P67890123', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→CAI', price: 500, cost: 320, supplier: 'EgyptAir Office', details: { airline_id: airlineMap['MS']?.id, airline: 'EgyptAir', flight_number: 'MS501', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['CAI']?.id, destination_airport: 'CAI - Cairo International Airport', departure_date: '2026-06-28', departure_time: '07:00', departure_next_day: false, arrival_date: '2026-06-28', arrival_time: '08:15', arrival_next_day: false, ticket_number: 'TKT-008', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'visa', desc: 'Visa processing', price: 300, cost: 200, supplier: 'Cairo Visa Center', details: { country: 'Egypt', visa_type: 'tourist', processing_time: 'Same day' } },
        ],
      },
      {
        note: 'Amman weekend - flight + hotel',
        passengers: [{ name: 'Noor Hasan', passport: 'P78901234', nationality: 'Palestinian', type: 'adult' }, { name: 'Ali Hasan', passport: 'P78901235', nationality: 'Palestinian', type: 'child' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→AMM', price: 600, cost: 380, supplier: 'Royal Jordanian', details: { airline_id: airlineMap['RJ']?.id, airline: 'Royal Jordanian', flight_number: 'RJ301', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['AMM']?.id, destination_airport: 'AMM - Queen Alia Intl', departure_date: '2026-07-18', departure_time: '09:30', departure_next_day: false, arrival_date: '2026-07-18', arrival_time: '10:45', arrival_next_day: false, ticket_number: 'TKT-009', checked_baggage: '15', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 800, cost: 500, supplier: 'Amman Rotana', details: { hotel_name: 'Amman Rotana', room_type: 'Deluxe', board_basis: 'half_board', check_in: '2026-07-18', check_out: '2026-07-20' } },
        ],
      },
      {
        note: 'Riyadh business - flight only',
        passengers: [{ name: 'Lina Ibrahim', passport: 'P89012345', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→RUH', price: 1800, cost: 1300, supplier: 'Saudia Office', details: { airline_id: airlineMap['SV']?.id, airline: 'Saudia', flight_number: 'SV201', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['RUH']?.id, destination_airport: 'RUH - King Khalid Intl', departure_date: '2026-07-05', departure_time: '11:00', departure_next_day: false, arrival_date: '2026-07-05', arrival_time: '15:00', arrival_next_day: false, ticket_number: 'TKT-010', checked_baggage: '30', cabin_baggage: '7' } },
        ],
      },
      {
        note: 'Doha layover - flight + hotel',
        passengers: [{ name: 'Maryam Sami', passport: 'P90123456', nationality: 'Palestinian', type: 'adult' }, { name: 'Omar Sami', passport: 'P90123457', nationality: 'Palestinian', type: 'adult' }, { name: 'Layla Sami', passport: 'P90123458', nationality: 'Palestinian', type: 'child' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→DOH', price: 2000, cost: 1400, supplier: 'Qatar Airways', details: { airline_id: airlineMap['QR']?.id, airline: 'Qatar Airways', flight_number: 'QR601', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['DOH']?.id, destination_airport: 'DOH - Hamad International Airport', departure_date: '2026-08-20', departure_time: '14:00', departure_next_day: false, arrival_date: '2026-08-20', arrival_time: '18:30', arrival_next_day: false, ticket_number: 'TKT-011', checked_baggage: '23', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 1500, cost: 1100, supplier: 'Doha Marriott', details: { hotel_name: 'Marriott Marquis Doha', room_type: 'Family Suite', board_basis: 'breakfast', check_in: '2026-08-20', check_out: '2026-08-22' } },
        ],
      },
      {
        note: 'Athens summer vacation - flight + hotel + insurance',
        passengers: [{ name: 'Hind Adel', passport: 'P01234567', nationality: 'Palestinian', type: 'adult' }, { name: 'Rami Adel', passport: 'P01234568', nationality: 'Palestinian', type: 'adult' }],
        services: [
          { cat: 'flight', desc: 'Flight TLV→ATH', price: 1200, cost: 800, supplier: 'Wizz Air', details: { airline_id: airlineMap['W6']?.id, airline: 'Wizz Air', flight_number: 'W61234', origin_airport_id: airportMap['TLV']?.id, origin_airport: 'TLV - Ben Gurion Airport', destination_airport_id: airportMap['ATH']?.id, destination_airport: 'ATH - Athens International Airport', departure_date: '2026-07-25', departure_time: '16:00', departure_next_day: false, arrival_date: '2026-07-25', arrival_time: '18:15', arrival_next_day: false, ticket_number: 'TKT-012', checked_baggage: '20', cabin_baggage: '7' } },
          { cat: 'hotel', desc: 'Hotel accommodation', price: 2000, cost: 1400, supplier: 'Athens Grand Hotel', details: { hotel_name: 'Grand Hyatt Athens', room_type: 'Acropolis View', board_basis: 'breakfast', check_in: '2026-07-25', check_out: '2026-08-01' } },
          { cat: 'insurance', desc: 'Travel insurance', price: 120, cost: 60, supplier: 'Allianz Travel', details: { policy_number: 'ALL-GR-67890', coverage_type: 'Medical + Baggage', start_date: '2026-07-25', end_date: '2026-08-01' } },
        ],
      },
    ];

    const statuses = ['confirmed', 'confirmed', 'pending', 'confirmed', 'pending', 'completed', 'confirmed', 'pending', 'confirmed', 'pending'];
    let created = 0;

    for (let i = 0; i < bookingTemplates.length; i++) {
      const tmpl = bookingTemplates[i];
      const cid = customerIds[i % customerIds.length];
      const status = statuses[i];
      const services = tmpl.services;
      const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
      const costAmount = services.reduce((sum, s) => sum + s.cost, 0);
      const paidAmount = status === 'completed' ? totalAmount : status === 'cancelled' ? 0 : Math.round(totalAmount * (i % 2 === 0 ? 0.5 : 0.25));
      const bookingNum = `BK-${today.getFullYear()}-${String(3000 + i + 1).padStart(4, '0')}`;

      const result = await db.run(
        `INSERT INTO bookings (booking_number, customer_id, total_amount, paid_amount, cost_amount, profit_amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        [bookingNum, cid, totalAmount, paidAmount, costAmount, totalAmount - costAmount, status, tmpl.note, fmt(new Date())]
      );
      const bid = typeof result.insertId === 'number' ? result.insertId : 0;

      for (const s of services) {
        await db.run('INSERT INTO booking_services (booking_id, service_type, supplier_id, description, amount, details) VALUES (?,?,?,?,?,?)',
          [bid, s.cat, null, s.desc, s.price, JSON.stringify(s.details || {})]);
      }

      for (const p of tmpl.passengers) {
        await db.run('INSERT INTO booking_passengers (booking_id, full_name, passport_number) VALUES (?,?,?)',
          [bid, p.name, p.passport]);
      }

      if (paidAmount > 0) {
        await db.run('INSERT INTO payments (payment_number, booking_id, amount, payment_method) VALUES (?,?,?,?)',
          [`PAY-${bid}`, bid, paidAmount, ['bank_transfer', 'credit_card', 'cash'][i % 3]]);
      }

      created++;
    }

    res.json({ message: 'Full seed complete!', bookings: created, airports: (await db.get('SELECT COUNT(*) as c FROM airports')).c, airlines: (await db.get('SELECT COUNT(*) as c FROM airlines')).c });
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
import supplierPaymentsRoutes from './routes/supplierPayments.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';
import aiReaderRoutes from './routes/aiReader.js';

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
app.use('/api/supplier-payments', authMiddleware, supplierPaymentsRoutes);
app.use('/api/exchange-rates', authMiddleware, exchangeRatesRoutes);
app.use('/api/ai-reader', authMiddleware, aiReaderRoutes);

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
    const rateCount = await db.get('SELECT COUNT(*) as c FROM exchange_rates');
    if (rateCount.c === 0) {
      const rates = [['USD',1],['EUR',1.085],['ILS',0.267],['JOD',1.41],['AED',0.2723],['THB',0.028],['EGP',0.02],['GBP',1.27]];
      for (const [c,r] of rates) await db.run('INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_date) VALUES (?,?,date(\'now\'))', [c, r]);
      console.log('Exchange rates seeded');
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

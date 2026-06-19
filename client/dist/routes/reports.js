import { Router } from 'express';
import { getDb, isMySQL } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { from, to } = req.query;

  const dateAdd = isMySQL()
    ? "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    : "date('now', '-30 day')";
  const dateCol = isMySQL() ? 'DATE(created_at)' : 'date(created_at)';
  const bDateCol = isMySQL() ? 'DATE(b.created_at)' : 'date(b.created_at)';
  const dateFormat = isMySQL() ? "DATE_FORMAT(created_at, '%Y-%m')" : "strftime('%Y-%m', created_at)";

  const clauses = [];
  const dateParams = [];
  if (from) {
    clauses.push(`${dateCol} >= ?`);
    dateParams.push(from);
  } else {
    clauses.push(`${dateCol} >= ${dateAdd}`);
  }
  if (to) {
    clauses.push(`${dateCol} <= ?`);
    dateParams.push(to);
  }
  const dateFilter = clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '';

  const bClauses = [];
  const bDateParams = [];
  if (from) {
    bClauses.push(`${bDateCol} >= ?`);
    bDateParams.push(from);
  } else {
    bClauses.push(`${bDateCol} >= ${dateAdd}`);
  }
  if (to) {
    bClauses.push(`${bDateCol} <= ?`);
    bDateParams.push(to);
  }
  const bDateFilter = bClauses.length > 0 ? ' AND ' + bClauses.join(' AND ') : '';

  const totalBookings = await db.get(`SELECT COUNT(*) as count FROM bookings WHERE 1=1${dateFilter}`, dateParams);
  const totalRevenue = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE 1=1${dateFilter}`, dateParams);
  const totalExpenses = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1${dateFilter}`, dateParams);

  const bookingsByStatus = await db.all(`SELECT status, COUNT(*) as count FROM bookings WHERE 1=1${dateFilter} GROUP BY status`, dateParams);

  const monthly = await db.all(`
    SELECT ${dateFormat} as month,
      COUNT(*) as bookings,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE ${dateFormat.replace('created_at', 'p.created_at')} = b.${dateFormat.replace('created_at', 'created_at')}), 0) as revenue,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE ${dateFormat.replace('created_at', 'e.date')} = b.${dateFormat.replace('created_at', 'created_at')}), 0) as expenses
    FROM bookings b
    WHERE ${dateFormat} >= ${isMySQL() ? "DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH), '%Y-%m')" : "strftime('%Y-%m', date('now', '-12 month'))"}
    GROUP BY ${dateFormat}
    ORDER BY ${dateFormat} DESC
  `);

  monthly.forEach(m => {
    m.profit = m.revenue - m.expenses;
  });

  const topCustomers = await db.all(`
    SELECT c.id, c.full_name, COUNT(b.id) as booking_count
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    WHERE 1=1${bDateFilter}
    GROUP BY c.id
    ORDER BY booking_count DESC
    LIMIT 5
  `, bDateParams);

  const topDestinations = await db.all(`
    SELECT to_destination, COUNT(*) as count
    FROM bookings
    WHERE to_destination IS NOT NULL AND to_destination != ''${dateFilter}
    GROUP BY to_destination
    ORDER BY count DESC
    LIMIT 5
  `, dateParams);

  const paymentMethods = await db.all(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE 1=1${dateFilter}
    GROUP BY payment_method
  `, dateParams);

  const serviceTypes = await db.all(`
    SELECT service_type, COUNT(*) as count
    FROM bookings
    WHERE service_type IS NOT NULL AND service_type != ''${dateFilter}
    GROUP BY service_type
    ORDER BY count DESC
  `, dateParams);

  res.json({
    dateRange: {
      from: from || null,
      to: to || null,
    },
    totalBookings: totalBookings.count,
    totalRevenue: totalRevenue.total,
    totalExpenses: totalExpenses.total,
    profit: totalRevenue.total - totalExpenses.total,
    bookingsByStatus,
    monthly,
    topCustomers,
    topDestinations,
    paymentMethods,
    serviceTypes,
  });
});

router.get('/advanced', async (req, res) => {
  const db = await getDb();
  const { year = new Date().getFullYear() } = req.query;

  const monthFilter = isMySQL()
    ? "DATE_FORMAT(created_at, '%Y-%m') = ?"
    : "strftime('%Y-%m', created_at) = ?";

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const payments = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${monthFilter}`, [monthStr]);
    const expenses = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${monthFilter}`, [monthStr]);
    const bookingCount = await db.get(`SELECT COUNT(*) as count FROM bookings WHERE ${monthFilter}`, [monthStr]);
    monthlyData.push({
      month: monthStr,
      revenue: payments.total,
      expenses: expenses.total,
      profit: payments.total - expenses.total,
      bookings: bookingCount.count,
    });
  }

  let expenseCategories = [];
  try {
    expenseCategories = await db.all("SELECT COALESCE(category, 'عام') as name, COALESCE(SUM(amount), 0) as total FROM expenses GROUP BY category ORDER BY total DESC");
  } catch { expenseCategories = []; }

  let topCustomers = [];
  try {
    topCustomers = await db.all(`
      SELECT c.full_name, c.phone, COUNT(b.id) as booking_count, COALESCE(SUM(p.amount), 0) as total_paid
      FROM customers c LEFT JOIN bookings b ON c.id = b.customer_id
      LEFT JOIN payments p ON b.id = p.booking_id
      GROUP BY c.id ORDER BY total_paid DESC LIMIT 10
    `);
  } catch { topCustomers = []; }

  let topSuppliers = [];
  try {
    topSuppliers = await db.all('SELECT s.name, s.email, s.phone, COUNT(b.id) as booking_count FROM suppliers s LEFT JOIN bookings b ON 1=0 GROUP BY s.id ORDER BY booking_count DESC LIMIT 5');
  } catch { topSuppliers = []; }

  let bookingStatuses = [];
  try {
    bookingStatuses = await db.all('SELECT status, COUNT(*) as count FROM bookings GROUP BY status');
  } catch { bookingStatuses = []; }

  const yearFilter = isMySQL() ? "DATE_FORMAT(created_at, '%Y') = ?" : "strftime('%Y', created_at) = ?";
  const yearPayments = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${yearFilter}`, [String(year)]);
  const yearExpenses = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${yearFilter}`, [String(year)]);
  const yearBookings = await db.get(`SELECT COUNT(*) as count FROM bookings WHERE ${yearFilter}`, [String(year)]);

  res.json({
    year: Number(year),
    totalRevenue: yearPayments.total,
    totalExpenses: yearExpenses.total,
    netProfit: yearPayments.total - yearExpenses.total,
    totalBookings: yearBookings.count,
    monthlyData,
    expenseCategories,
    topCustomers,
    topSuppliers,
    bookingStatuses,
  });
});

export default router;

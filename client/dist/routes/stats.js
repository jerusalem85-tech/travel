import { Router } from 'express';
import { getDb, isMySQL } from '../config/database.js';

const router = Router();

async function safeGet(fn) {
  try { return await fn(); } catch { return null; }
}

router.get('/', async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  const mysql = isMySQL();
  const mf = mysql ? "DATE_FORMAT(created_at, '%Y-%m') LIKE ?" : "strftime('%Y-%m', created_at) = ?";

  const [bc, cc, sc, pb, tb, mp, me, rb, hc, cc2] = await Promise.all([
    safeGet(() => db.get('SELECT COUNT(*) as count FROM bookings')),
    safeGet(() => db.get('SELECT COUNT(*) as count FROM customers')),
    safeGet(() => db.get('SELECT COUNT(*) as count FROM suppliers')),
    safeGet(() => db.get("SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending','confirmed')")),
    safeGet(() => db.get("SELECT COUNT(*) as count FROM bookings WHERE date(travel_date) = ?", [today])),
    safeGet(() => db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ${mf}`, [month])),
    safeGet(() => db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${mf}`, [month])),
    safeGet(() => db.all('SELECT b.*, COALESCE(c.full_name,c.name) as customer_name FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id ORDER BY b.created_at DESC LIMIT 10')),
    safeGet(() => db.get('SELECT COUNT(*) as count FROM hotels')),
    safeGet(() => db.get('SELECT COUNT(*) as count FROM contracts')),
  ]);

  let cb = 0, sb = 0;
  const ts = await safeGet(() => db.get("SELECT COALESCE(SUM(total_amount),0) as t FROM bookings WHERE status != 'cancelled'"));
  const tp = await safeGet(() => db.get('SELECT COALESCE(SUM(amount),0) as t FROM payments'));
  if (ts && tp) cb = (ts.t || 0) - (tp.t || 0);
  const tc = await safeGet(() => db.get("SELECT COALESCE(SUM(cost_amount),0) as t FROM bookings WHERE status != 'cancelled'"));
  const tsp = await safeGet(() => db.get('SELECT COALESCE(SUM(amount),0) as t FROM supplier_payments'));
  if (tc && tsp) sb = (tc.t || 0) - (tsp.t || 0);

  res.json({
    bookingsCount: bc?.count || 0, customersCount: cc?.count || 0, suppliersCount: sc?.count || 0,
    pendingBookings: pb?.count || 0, todayBookings: tb?.count || 0,
    monthPayments: mp?.total || 0, monthExpenses: me?.total || 0,
    monthProfit: (mp?.total || 0) - (me?.total || 0),
    customerBalance: cb, supplierBalance: sb,
    recentBookings: rb || [], hotelsCount: hc?.count || 0, contractsCount: cc2?.count || 0,
  });
});

router.get('/overview', async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  const mysql = isMySQL();
  const mf = mysql ? "DATE_FORMAT(created_at, '%Y-%m') LIKE ?" : "strftime('%Y-%m', created_at) = ?";

  const [rev, exp, pt, ai, di, ra, tbk, tc] = await Promise.all([
    safeGet(() => db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE ${mf}`, [month])),
    safeGet(() => db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE ${mf}`, [month])),
    safeGet(() => db.get("SELECT COUNT(*) as c FROM tasks WHERE status != 'completed'")),
    safeGet(() => db.get("SELECT COUNT(*) as c FROM installment_plans WHERE status = 'active'")),
    safeGet(() => db.get("SELECT COUNT(*) as c FROM installment_payments WHERE status = 'pending' AND due_date <= ?", [today])),
    safeGet(() => db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5')),
    safeGet(() => db.get('SELECT COUNT(*) as c FROM bookings')),
    safeGet(() => db.get('SELECT COUNT(*) as c FROM customers')),
  ]);

  res.json({
    totalBookings: tbk?.c || 0, totalCustomers: tc?.c || 0,
    totalRevenue: rev?.t || 0, totalExpenses: exp?.t || 0,
    netProfit: (rev?.t || 0) - (exp?.t || 0),
    pendingTasks: pt?.c || 0, activeInstallments: ai?.c || 0,
    dueInstallments: di?.c || 0, recentActivity: ra || [],
  });
});

router.get('/top-customers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all(`SELECT c.id, COALESCE(c.full_name,c.name) as full_name, c.phone, c.email, COUNT(b.id) as booking_count, COALESCE(SUM(p.amount), 0) as total_paid FROM customers c LEFT JOIN bookings b ON c.id = b.customer_id LEFT JOIN payments p ON b.id = p.booking_id GROUP BY c.id ORDER BY total_paid DESC LIMIT 5`);
  res.json(rows);
});

router.get('/monthly-bookings', async (req, res) => {
  const db = await getDb();
  const mysql = isMySQL();
  const q = mysql
    ? "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM bookings GROUP BY month ORDER BY month DESC LIMIT 12"
    : "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM bookings GROUP BY month ORDER BY month DESC LIMIT 12";
  const rows = await db.all(q);
  res.json(rows.reverse());
});

router.get('/status-breakdown', async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT status, COUNT(*) as count FROM bookings GROUP BY status");
  res.json(rows);
});

export default router;

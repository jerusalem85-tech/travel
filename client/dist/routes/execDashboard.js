import { Router } from 'express';
import { getDb, isMySQL } from '../config/database.js';
const router = Router();

router.get('/summary', async (req, res) => {
  const db = await getDb();
  
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0].substring(0, 7);
  const monthFilter = (m) => isMySQL() ? `DATE_FORMAT(created_at, '%Y-%m') = '${m}'` : `strftime('%Y-%m', created_at) = '${m}'`;
  
  // This month vs last month
  const thisMonthRev = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE ${monthFilter(thisMonth)}`);
  const lastMonthRev = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE ${monthFilter(lastMonth)}`);
  const thisMonthExp = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE ${monthFilter(thisMonth)}`);
  const lastMonthExp = await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE ${monthFilter(lastMonth)}`);
  
  // Growth percentages
  const revGrowth = lastMonthRev.t > 0 ? ((thisMonthRev.t - lastMonthRev.t) / lastMonthRev.t * 100).toFixed(1) : 0;
  const expGrowth = lastMonthExp.t > 0 ? ((thisMonthExp.t - lastMonthExp.t) / lastMonthExp.t * 100).toFixed(1) : 0;
  
  // Total customers & bookings
  const totalCustomers = await db.get('SELECT COUNT(*) as c FROM customers');
  const totalBookings = await db.get('SELECT COUNT(*) as c FROM bookings');
  const activeBookings = await db.get("SELECT COUNT(*) as c FROM bookings WHERE status IN ('pending','confirmed')");
  
  // Top 3 services
  let topServices = [];
  try {
    topServices = await db.all('SELECT service_type, COUNT(*) as c FROM bookings GROUP BY service_type ORDER BY c DESC LIMIT 3');
  } catch {}
  
  // Average booking value
  const avgBooking = await db.get('SELECT COALESCE(AVG(total_amount), 0) as avg FROM bookings WHERE total_amount > 0');
  
  // Converted leads count
  let convertedLeads = 0;
  try {
    const cl = await db.get("SELECT COUNT(*) as c FROM leads WHERE status = 'converted'");
    convertedLeads = cl.c;
  } catch {}
  
  // Recent signups (last 30 days)
  const recentCustomers = await db.get("SELECT COUNT(*) as c FROM customers WHERE created_at >= date('now', '-30 days')");
  
  res.json({
    revenue: { current: thisMonthRev.t, previous: lastMonthRev.t, growth: parseFloat(revGrowth) },
    expenses: { current: thisMonthExp.t, previous: lastMonthExp.t, growth: parseFloat(expGrowth) },
    profit: thisMonthRev.t - thisMonthExp.t,
    totalCustomers: totalCustomers.c,
    totalBookings: totalBookings.c,
    activeBookings: activeBookings.c,
    topServices,
    avgBookingValue: avgBooking.avg,
    convertedLeads,
    recentCustomers: recentCustomers.c,
  });
});

export default router;

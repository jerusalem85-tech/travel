import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/export', async (req, res) => {
  const db = await getDb();
  const tables = [
    'users', 'customers', 'suppliers', 'bookings', 'booking_passengers',
    'booking_services', 'invoices', 'payments', 'expenses', 'settings', 
    'quotations', 'notifications', 'hotels', 'hotel_room_types', 
    'tour_packages', 'insurance_policies', 'contracts', 'commissions', 
    'activity_log', 'currencies', 'customer_communications',
    'visas', 'documents', 'tasks', 'price_lists', 'booking_checklist', 
    'inventory_items', 'leads', 'employees', 'attendance', 'salaries', 
    'vehicles', 'guides', 'discounts', 'tax_rates', 'reviews',
    'installment_plans', 'installment_payments', 'user_preferences',
    'airports', 'airlines', 'destinations', 'flight_schedules',
    'brokers', 'broker_commissions', 'transfers', 'services_catalog',
    'restaurant_bookings', 'properties', 'referrals', 'follow_ups',
    'surveys', 'knowledge_articles', 'complaints', 'templates',
    'login_log', 'trash'
  ];
  const backup = {};
  for (const table of tables) {
    try {
      backup[table] = await db.all(`SELECT * FROM ${table}`);
    } catch {
      backup[table] = [];
    }
  }
  res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
  res.json(backup);
});

router.post('/restore', async (req, res) => {
  const db = await getDb();
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Data is required' });
  const isMysql = db.run.toString().includes('mysql') || db.run.constructor.name.includes('mysql');
  const orClause = isMysql ? 'REPLACE' : 'OR REPLACE';
  for (const [table, rows] of Object.entries(data)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      try {
        await db.run(`INSERT ${orClause} INTO ${table} (${cols}) VALUES (${placeholders})`, values);
      } catch (err) {
        console.error(`Restore error for ${table}:`, err.message);
      }
    }
  }
  res.json({ success: true });
});

export default router;

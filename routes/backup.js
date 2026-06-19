import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/export', async (req, res) => {
  const db = await getDb();
  const tables = [
    'users', 'customers', 'suppliers', 'bookings',
    'booking_passengers', 'booking_services', 'invoices',
    'payments', 'expenses', 'settings', 'quotations', 'notifications'
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

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

export default router;

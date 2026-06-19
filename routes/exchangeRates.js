import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM exchange_rates ORDER BY currency_code');
  res.json({ rows });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { currency_code, rate_to_usd } = req.body;
  if (!currency_code) return res.status(400).json({ error: 'Currency code required' });
  await db.run('INSERT OR REPLACE INTO exchange_rates (currency_code, rate_to_usd, effective_date) VALUES (?,?,date(\'now\'))', [currency_code.toUpperCase(), rate_to_usd || 1]);
  res.json({ message: 'Rate updated' });
});

router.put('/:code', async (req, res) => {
  const db = await getDb();
  const { rate_to_usd } = req.body;
  await db.run('UPDATE exchange_rates SET rate_to_usd = ?, effective_date = date(\'now\') WHERE currency_code = ?', [rate_to_usd, req.params.code.toUpperCase()]);
  res.json({ message: 'Updated' });
});

router.post('/seed', async (req, res) => {
  const db = await getDb();
  const rates = [
    ['USD', 1.0], ['EUR', 1.085], ['ILS', 0.267], ['JOD', 1.41],
    ['AED', 0.2723], ['THB', 0.028], ['EGP', 0.02], ['GBP', 1.27]
  ];
  for (const [code, rate] of rates) {
    await db.run('INSERT OR REPLACE INTO exchange_rates (currency_code, rate_to_usd, effective_date) VALUES (?,?,date(\'now\'))', [code, rate]);
  }
  const count = await db.get('SELECT COUNT(*) as c FROM exchange_rates');
  res.json({ message: 'Exchange rates seeded', count: count.c });
});

export default router;

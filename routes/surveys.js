import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { rating, customer_id, date_from, date_to, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (rating) {
    where += ' AND s.rating = ?';
    params.push(parseInt(rating, 10));
  }
  if (customer_id) {
    where += ' AND s.customer_id = ?';
    params.push(parseInt(customer_id, 10));
  }
  if (date_from) {
    where += ' AND s.created_at >= ?';
    params.push(date_from);
  }
  if (date_to) {
    where += ' AND s.created_at <= ?';
    params.push(date_to);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM surveys s WHERE ${where}`, params);
  const rows = await db.all(`SELECT s.*, c.full_name as customer_name FROM surveys s LEFT JOIN customers c ON s.customer_id = c.id WHERE ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { booking_id, customer_id, rating, nps_score, service_quality, communication, value_for_money, feedback, recommend } = req.body;
  const now = new Date().toISOString();
  const result = await db.run('INSERT INTO surveys (booking_id, customer_id, rating, nps_score, service_quality, communication, value_for_money, feedback, recommend, responded_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [booking_id || null, customer_id || null, rating || 5, nps_score || 7, service_quality || 5, communication || 5, value_for_money || 5, feedback || null, recommend !== undefined ? recommend : 1, now]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.get('/stats', async (req, res) => {
  const db = await getDb();
  const stats = await db.get("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM surveys");
  const promoters = await db.get("SELECT COUNT(*) as count FROM surveys WHERE nps_score >= 9");
  const passives = await db.get("SELECT COUNT(*) as count FROM surveys WHERE nps_score >= 7 AND nps_score <= 8");
  const detractors = await db.get("SELECT COUNT(*) as count FROM surveys WHERE nps_score <= 6");
  const totalNps = promoters.count + passives.count + detractors.count;
  const nps = totalNps > 0 ? Math.round(((promoters.count - detractors.count) / totalNps) * 100) : 0;
  const totalBookings = await db.get("SELECT COUNT(*) as count FROM bookings");
  const responseRate = totalBookings.count > 0 ? Math.round((stats.total / totalBookings.count) * 100) : 0;
  res.json({
    avg_rating: Math.round((stats.avg_rating || 0) * 10) / 10,
    nps,
    promoters: promoters.count,
    passives: passives.count,
    detractors: detractors.count,
    total_responses: stats.total,
    response_rate: responseRate,
  });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { rating, nps_score, service_quality, communication, value_for_money, feedback, recommend } = req.body;
  await db.run(`UPDATE surveys SET rating=?, nps_score=?, service_quality=?, communication=?, value_for_money=?, feedback=?, recommend=? WHERE id=?`,
    [rating, nps_score, service_quality, communication, value_for_money, feedback, recommend, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM surveys WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

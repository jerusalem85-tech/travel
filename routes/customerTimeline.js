import { Router } from 'express';
import { getDb } from '../config/database.js';
const router = Router();

router.get('/:customerId', async (req, res) => {
  const db = await getDb();
  const { customerId } = req.params;

  const [bookings, payments, communications, documents, reviews, followUps] = await Promise.all([
    db.all('SELECT id, service_type, travel_date, status, total_amount, created_at FROM bookings WHERE customer_id = ? ORDER BY created_at DESC', [customerId]),
    db.all('SELECT p.*, b.service_type FROM payments p LEFT JOIN bookings b ON p.booking_id = b.id WHERE b.customer_id = ? ORDER BY p.created_at DESC', [customerId]),
    db.all("SELECT id, subject, type, created_at FROM customer_communications WHERE customer_id = ? ORDER BY created_at DESC", [customerId]),
    db.all("SELECT id, document_type, file_name, created_at FROM documents WHERE entity_type = 'customer' AND entity_id = ? ORDER BY created_at DESC", [customerId]),
    db.all('SELECT id, rating, review_text, created_at FROM reviews WHERE customer_id = ? ORDER BY created_at DESC', [customerId]),
    db.all('SELECT id, title, type, status, due_date, created_at FROM follow_ups WHERE customer_id = ? ORDER BY created_at DESC', [customerId]),
  ]);

  const timeline = [
    ...bookings.map(b => ({ ...b, _type: 'booking', _label: 'حجز', _date: b.created_at })),
    ...payments.map(p => ({ ...p, _type: 'payment', _label: 'دفعة', _date: p.created_at })),
    ...communications.map(c => ({ ...c, _type: 'communication', _label: 'اتصال', _date: c.created_at })),
    ...documents.map(d => ({ ...d, _type: 'document', _label: 'مستند', _date: d.created_at })),
    ...reviews.map(r => ({ ...r, _type: 'review', _label: 'تقييم', _date: r.created_at })),
    ...followUps.map(f => ({ ...f, _type: 'follow_up', _label: 'متابعة', _date: f.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date));

  res.json({ timeline, bookings, payments, communications, documents, reviews, followUps });
});

export default router;

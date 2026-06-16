import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (name LIKE ? OR phone LIKE ? OR service_type LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM suppliers WHERE ${where}`, params);
  const rows = await db.all(`SELECT *, (SELECT COUNT(*) FROM booking_services WHERE supplier_id = suppliers.id) as service_count FROM suppliers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  const services = await db.all('SELECT s.*, b.booking_number, b.customer_id FROM booking_services s LEFT JOIN bookings b ON s.booking_id = b.id WHERE s.supplier_id = ? ORDER BY s.id DESC', [req.params.id]);
  res.json({ ...supplier, services });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, contact_person, phone, email, service_type, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });
  const result = await db.run('INSERT INTO suppliers (name, contact_person, phone, email, service_type, notes) VALUES (?,?,?,?,?,?)',
    [name, contact_person || null, phone || null, email || null, service_type || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, contact_person, phone, email, service_type, notes } = req.body;
  await db.run('UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, service_type=?, notes=? WHERE id=?',
    [name, contact_person, phone, email, service_type, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const services = await db.get('SELECT COUNT(*) as count FROM booking_services WHERE supplier_id = ?', [req.params.id]);
  if (services.count > 0) return res.status(400).json({ error: 'Cannot delete supplier with linked services' });
  await db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

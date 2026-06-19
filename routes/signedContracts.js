import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';
const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, customer_id, booking_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (status) { where += ' AND c.status = ?'; params.push(status); }
  if (customer_id) { where += ' AND c.customer_id = ?'; params.push(customer_id); }
  if (booking_id) { where += ' AND c.booking_id = ?'; params.push(booking_id); }
  const rows = await db.all(`SELECT c.*, t.name as template_name, cu.full_name as customer_name FROM signed_contracts c LEFT JOIN contract_templates t ON c.template_id = t.id LEFT JOIN customers cu ON c.customer_id = cu.id ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM signed_contracts c ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { template_id, booking_id, customer_id, contract_data, signature_data } = req.body;
  const result = await db.run(`INSERT INTO signed_contracts (template_id, booking_id, customer_id, contract_data, signature_data, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [template_id, booking_id, customer_id, contract_data, signature_data, 'signed']);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true });
});

router.put('/:id/sign', async (req, res) => {
  const db = await getDb();
  const { signature_data, contract_data } = req.body;
  await db.run(`UPDATE signed_contracts SET signature_data=?, contract_data=?, status='signed', signed_at=CURRENT_TIMESTAMP WHERE id=?`,
    [signature_data, contract_data, req.params.id]);
  res.json({ success: true });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM signed_contracts WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'signed_contracts', req.params.id, req.user?.id);
  await db.run('DELETE FROM signed_contracts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/templates', async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT id, name, type FROM contract_templates WHERE is_active = 1 ORDER BY name");
  res.json(rows);
});

export default router;

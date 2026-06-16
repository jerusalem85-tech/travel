import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, contract_type, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (party_name LIKE ? OR contract_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (contract_type) {
    where += ' AND contract_type = ?';
    params.push(contract_type);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM contracts WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM contracts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  res.json({ rows, total: count.count, page: parseInt(page) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { contract_type, party_name, party_phone, party_email, start_date, end_date, terms, total_amount, currency, status, notes } = req.body;
  if (!party_name) return res.status(400).json({ error: 'Party name is required' });
  const max = await db.get("SELECT MAX(CAST(SUBSTR(contract_number, 2) AS INTEGER)) as max_num FROM contracts");
  const num = (max?.max_num || 0) + 1;
  const contract_number = `C${num}`;
  const result = await db.run('INSERT INTO contracts (contract_number, contract_type, party_name, party_phone, party_email, start_date, end_date, terms, total_amount, currency, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [contract_number, contract_type || null, party_name, party_phone || null, party_email || null, start_date || null, end_date || null, terms || null, total_amount || 0, currency || 'USD', status || 'active', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, contract_number });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { contract_type, party_name, party_phone, party_email, start_date, end_date, terms, total_amount, currency, status, notes } = req.body;
  await db.run('UPDATE contracts SET contract_type=?, party_name=?, party_phone=?, party_email=?, start_date=?, end_date=?, terms=?, total_amount=?, currency=?, status=?, notes=? WHERE id=?',
    [contract_type, party_name, party_phone, party_email, start_date, end_date, terms, total_amount, currency, status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM contracts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

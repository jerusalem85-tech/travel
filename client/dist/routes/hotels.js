import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = '1=1';
  let params = [];
  if (search) {
    where += " AND (name LIKE ? OR city LIKE ? OR country LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const count = await db.get(`SELECT COUNT(*) as count FROM hotels WHERE ${where}`, params);
  const rows = await db.all(`SELECT * FROM hotels WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  res.json({ rows, total: count.count, page: parseInt(page, 10) });
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const hotel = await db.get('SELECT * FROM hotels WHERE id = ?', [req.params.id]);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
  const roomTypes = await db.all('SELECT * FROM hotel_room_types WHERE hotel_id = ?', [req.params.id]);
  res.json({ ...hotel, roomTypes });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, address, city, country, phone, email, star_rating, contact_person, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Hotel name is required' });
  const result = await db.run('INSERT INTO hotels (name, address, city, country, phone, email, star_rating, contact_person, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [name, address || null, city || null, country || null, phone || null, email || null, star_rating || 3, contact_person || null, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { name, address, city, country, phone, email, star_rating, contact_person, notes } = req.body;
  await db.run('UPDATE hotels SET name=?, address=?, city=?, country=?, phone=?, email=?, star_rating=?, contact_person=?, notes=? WHERE id=?',
    [name, address, city, country, phone, email, star_rating, contact_person, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'hotels', req.params.id, req.user?.id);
  await db.run('DELETE FROM hotel_room_types WHERE hotel_id = ?', [req.params.id]);
  await db.run('DELETE FROM hotels WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/:id/room-types', async (req, res) => {
  const db = await getDb();
  const { room_type, board_basis, price_per_night, currency, notes } = req.body;
  const hotel = await db.get('SELECT id FROM hotels WHERE id = ?', [req.params.id]);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
  const result = await db.run('INSERT INTO hotel_room_types (hotel_id, room_type, board_basis, price_per_night, currency, notes) VALUES (?,?,?,?,?,?)',
    [req.params.id, room_type || null, board_basis || null, price_per_night || 0, currency || 'USD', notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.delete('/room-types/:rtId', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM hotel_room_types WHERE id = ?', [req.params.rtId]);
  res.json({ message: 'Deleted' });
});

export default router;

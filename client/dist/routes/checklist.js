import { Router } from 'express';
import { getDb } from '../config/database.js';
import { moveToTrash } from './trashHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { booking_id } = req.query;
  let where = '1=1';
  let params = [];
  if (booking_id) {
    where += ' AND booking_id = ?';
    params.push(parseInt(booking_id, 10));
  }
  const rows = await db.all(`SELECT bc.*, u.full_name as completed_by_name FROM booking_checklist bc LEFT JOIN users u ON bc.completed_by = u.id WHERE ${where} ORDER BY bc.created_at ASC`, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { booking_id, step_name, notes } = req.body;
  if (!booking_id || !step_name) return res.status(400).json({ error: 'Booking ID and step name are required' });
  const result = await db.run('INSERT INTO booking_checklist (booking_id, step_name, notes) VALUES (?,?,?)',
    [booking_id, step_name, notes || null]);
  res.json({ id: result.insertId || result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { step_name, is_completed, notes } = req.body;
  await db.run('UPDATE booking_checklist SET step_name=?, is_completed=?, notes=? WHERE id=?',
    [step_name, is_completed, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.put('/:id/toggle', async (req, res) => {
  const db = await getDb();
  const item = await db.get('SELECT is_completed FROM booking_checklist WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: 'Checklist item not found' });
  const newVal = item.is_completed ? 0 : 1;
  const now = newVal ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
  await db.run('UPDATE booking_checklist SET is_completed=?, completed_at=? WHERE id=?', [newVal, now, req.params.id]);
  res.json({ is_completed: newVal });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await moveToTrash(db, 'booking_checklist', req.params.id, req.user?.id);
  await db.run('DELETE FROM booking_checklist WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

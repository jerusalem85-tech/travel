import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const notifications = await db.all('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
  res.json(notifications);
});

router.put('/read-all', async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  res.json({ message: 'All notifications marked as read' });
});

router.put('/:id/read', async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Notification marked as read' });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

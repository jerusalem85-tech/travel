import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../config/database.js';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads', 'booking-docs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Get documents for a booking
router.get('/:bookingId', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM booking_documents WHERE booking_id = ? ORDER BY created_at DESC', [req.params.bookingId]);
  res.json({ rows });
});

// Upload document
router.post('/:bookingId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO booking_documents (booking_id, file_name, file_path, file_size, mime_type, category, notes) VALUES (?,?,?,?,?,?,?)',
      [req.params.bookingId, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, req.body.category || 'other', req.body.notes || null]
    );
    res.json({ id: result.insertId || result.lastInsertRowid, file_name: req.file.originalname });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const doc = await db.get('SELECT * FROM booking_documents WHERE id = ?', [req.params.id]);
  if (doc) {
    try { fs.unlinkSync(doc.file_path); } catch {}
  }
  await db.run('DELETE FROM booking_documents WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;

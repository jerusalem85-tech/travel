import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../config/database.js';
import { fileURLToPath } from 'url';
import { moveToTrash } from './trashHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { entity_type, entity_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let where = 'WHERE 1=1';
  let params = [];
  if (entity_type) { where += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { where += ' AND entity_id = ?'; params.push(entity_id); }
  const rows = await db.all(`SELECT * FROM uploaded_files ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), offset]);
  const total = await db.get(`SELECT COUNT(*) as count FROM uploaded_files ${where}`, params);
  res.json({ rows, total: total.count, page: parseInt(page, 10) });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = await getDb();
  const { entity_type, entity_id, notes } = req.body;
  const result = await db.run(`INSERT INTO uploaded_files (original_name, stored_name, file_path, file_size, mime_type, entity_type, entity_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.file.originalname, req.file.filename, req.file.path, req.file.size, req.file.mimetype, entity_type || null, entity_id || null, req.user?.id || null]);
  res.json({ id: result.insertId || result.lastInsertRowid, success: true, filename: req.file.filename });
});

router.get('/download/:id', async (req, res) => {
  const db = await getDb();
  const file = await db.get('SELECT * FROM uploaded_files WHERE id = ?', [req.params.id]);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (fs.existsSync(file.file_path)) {
    res.download(file.file_path, file.original_name);
  } else {
    res.status(404).json({ error: 'File not found on disk' });
  }
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const file = await db.get('SELECT * FROM uploaded_files WHERE id = ?', [req.params.id]);
  if (file && fs.existsSync(file.file_path)) {
    fs.unlinkSync(file.file_path);
  }
  await moveToTrash(db, 'uploaded_files', req.params.id, req.user?.id);
  await db.run('DELETE FROM uploaded_files WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;

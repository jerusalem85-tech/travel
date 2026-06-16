import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dist = path.join(__dirname, 'client', 'dist');

// Copy root files
['server.js', 'package.json', '.env'].forEach(f => {
  try { fs.copyFileSync(path.join(__dirname, f), path.join(dist, f)); } catch {}
});

// Copy directories
['routes', 'config'].forEach(d => {
  const src = path.join(__dirname, d);
  const dest = path.join(dist, d);
  try {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(f => {
      fs.copyFileSync(path.join(src, f), path.join(dest, f));
    });
  } catch (e) { console.error('Error copying', d, e.message); }
});

console.log('Build complete');

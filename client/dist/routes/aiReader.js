import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../config/database.js';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Extract text from PDF
async function getPdfText(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    // Fallback: basic extraction
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const texts = [];
      const tjRegex = /\(([^)]*(?:\\.[^)]*)*)\)\s*Tj/g;
      let m;
      while ((m = tjRegex.exec(content)) !== null) {
        let t = m[1].replace(/\\([0-3][0-7]{2})/g, (_, c) => String.fromCharCode(parseInt(c, 8)));
        t = t.replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' ');
        if (t.trim()) texts.push(t);
      }
      return texts.join(' ') || '';
    } catch { return ''; }
  }
}

function parseFlightTicket(text) {
  const d = { type: 'flight', confidence: 0 };
  if (!text) return d;

  const t = text;
  // Flight number
  const fn = t.match(/\b([A-Z]{2,3})\s*(\d{2,4})\b/);
  if (fn) { d.flightNumber = fn[1] + fn[2]; d.confidence += 10; }

  // PNR
  const pnr = t.match(/(?:PNR|BOOKING REF|RECORD LOCATOR)[:\s#]*([A-Z0-9]{5,8})/i);
  if (pnr) { d.pnr = pnr[1]; d.confidence += 10; }

  // Ticket
  const tkt = t.match(/(\d{3}[-]\d{10,})/) || t.match(/(?:ETKT|E-TICKET|TICKET NUMBER)[:\s#]*(\d{10,15})/i);
  if (tkt) { d.ticketNumber = tkt[1]; d.confidence += 10; }

  // Airline
  const airlines = ['Emirates','Turkish Airlines','British Airways','Air France','El Al','Saudia','Qatar Airways','EgyptAir','Royal Jordanian','Lufthansa','Wizz Air','Ryanair','Etihad','Flydubai','Pegasus','Arkia','Israir','Delta','United','American','KLM','SWISS','Austrian','Aegean'];
  for (const a of airlines) { if (t.toLowerCase().includes(a.toLowerCase())) { d.airline = a; d.confidence += 15; break; } }
  if (!d.airline && fn) {
    const codeMap = { EK:'Emirates',TK:'Turkish Airlines',BA:'British Airways',AF:'Air France',LY:'El Al',SV:'Saudia',QR:'Qatar Airways',MS:'EgyptAir',RJ:'Royal Jordanian',LH:'Lufthansa',W6:'Wizz Air',FR:'Ryanair',EY:'Etihad',FZ:'Flydubai',PC:'Pegasus',IZ:'Arkia','6H':'Israir',DL:'Delta',UA:'United',AA:'American',KL:'KLM',LX:'SWISS',OS:'Austrian',A3:'Aegean' };
    if (codeMap[fn[1]]) { d.airline = codeMap[fn[1]]; d.confidence += 8; }
  }

  // Airports
  const airports = t.match(/\b([A-Z]{3})\b/g) || [];
  const valid = airports.filter(a => !['PDF','PNR','ETK','TKT','PAX','REF','FOR','AND','THE','ALL','VIA','FLT','DATE','TIME','TER','GATE','SEAT','NAME'].includes(a)).slice(0, 6);
  if (valid.length >= 2) { d.origin = valid[0]; d.destination = valid[1]; d.confidence += 8; }
  const fromAirport = t.match(/(?:FROM|DEPART|ORIGIN)[:\s]+([A-Za-z\s\-]+)/i);
  const toAirport = t.match(/(?:TO|ARRIVE|DESTINATION)[:\s]+([A-Za-z\s\-]+)/i);
  if (fromAirport) { d.origin = fromAirport[1].trim(); d.confidence += 5; }
  if (toAirport) { d.destination = toAirport[1].trim(); d.confidence += 5; }

  // Dates
  const dates = t.match(/\b(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})\b|\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g) || [];
  if (dates[0]) { d.departureDate = dates[0]; d.confidence += 8; }
  if (dates[1]) d.arrivalDate = dates[1];

  // Times
  const times = t.match(/\b(\d{1,2}:\d{2})\b/g) || [];
  if (times[0]) { d.departureTime = times[0]; d.confidence += 5; }
  if (times[1]) d.arrivalTime = times[1];

  // Name
  const name = t.match(/(?:PASSENGER|PAX|NAME)[:\s]+([A-Z]{2,}\s+[A-Z]{2,})/i);
  if (name) { d.passengerName = name[1].trim(); d.confidence += 10; }

  d.confidence = Math.min(100, Math.max(0, d.confidence));
  return d;
}

function parseHotelVoucher(text) {
  const d = { type: 'hotel', confidence: 0 };
  if (!text) return d;
  const t = text;
  const hotel = t.match(/(?:HOTEL|PROPERTY|WELCOME TO)[:\s]+([A-Z][A-Za-z\s&]+(?:Hotel|Resort|Inn|Suites|Marriott|Hilton|Hyatt|Rotana|Crown|Plaza))/i);
  if (hotel) { d.hotelName = hotel[1].trim(); d.confidence += 15; }
  const guest = t.match(/(?:GUEST|GUEST NAME)[:\s]+([A-Z]{2,}\s+[A-Z]{2,})/i);
  if (guest) { d.guestName = guest[1].trim(); d.confidence += 10; }
  const ci = t.match(/(?:CHECK[-\s]IN|ARRIVAL)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  const co = t.match(/(?:CHECK[-\s]OUT|DEPARTURE)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  if (ci) { d.checkIn = ci[1]; d.confidence += 10; }
  if (co) { d.checkOut = co[1]; d.confidence += 10; }
  const conf = t.match(/(?:CONFIRMATION|BOOKING|RESERVATION)[:\s#]+([A-Z0-9]+)/i);
  if (conf) { d.confirmation = conf[1]; d.confidence += 8; }
  d.confidence = Math.min(100, Math.max(0, d.confidence));
  return d;
}

function parseVisaDoc(text) {
  const d = { type: 'visa', confidence: 0 };
  if (!text) return d;
  const t = text;
  const n = t.match(/(?:NAME|SURNAME)[:\s]+([A-Z]{2,}\s+[A-Z]{2,})/i);
  if (n) { d.passengerName = n[1].trim(); d.confidence += 12; }
  const vn = t.match(/(?:VISA|VISA NO)[:\s#]+([A-Z0-9]{5,20})/i);
  if (vn) { d.visaNumber = vn[1]; d.confidence += 12; }
  const c = t.match(/(?:COUNTRY|ISSUING COUNTRY)[:\s]+([A-Za-z\s]+)/i);
  if (c) { d.country = c[1].trim(); d.confidence += 10; }
  const iss = t.match(/(?:ISSUE DATE)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  const exp = t.match(/(?:EXPIRY|VALID UNTIL)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  if (iss) { d.issueDate = iss[1]; d.confidence += 10; }
  if (exp) { d.expiryDate = exp[1]; d.confidence += 10; }
  d.confidence = Math.min(100, Math.max(0, d.confidence));
  return d;
}

// Upload and parse
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ error: 'No file', extracted: null });

    const ext = path.extname(req.file.path).toLowerCase();
    let text = '';

    if (ext === '.pdf') text = await getPdfText(req.file.path);

    // Parse based on type or auto-detect
    const docType = req.body.type || '';
    let result = { type: 'flight', confidence: 0 };

    if (docType === 'flight' || (!docType && (text && /FLIGHT|PNR|ETKT|BOARDING|DEPARTURE|AIRLINE|TICKET/i.test(text)))) {
      result = parseFlightTicket(text);
    } else if (docType === 'hotel' || (!docType && (text && /HOTEL|CHECK.IN|ACCOMMODATION|ROOM|VOUCHER/i.test(text)))) {
      result = parseHotelVoucher(text);
    } else if (docType === 'visa' || (!docType && (text && /VISA|EMBASSY|CONSULATE/i.test(text)))) {
      result = parseVisaDoc(text);
    } else if (docType) {
      if (docType === 'flight') result = parseFlightTicket(text);
      else if (docType === 'hotel') result = parseHotelVoucher(text);
      else if (docType === 'visa') result = parseVisaDoc(text);
    }

    res.json({ 
      extracted: result, 
      rawText: text.substring(0, 3000), 
      fileName: req.file.filename,
      hasText: !!text.trim(),
    });
  } catch (e) {
    res.json({ error: e.message, extracted: null });
  }
});

// Create booking from extracted data
router.post('/create', async (req, res) => {
  try {
    const db = await getDb();
    const { extracted } = req.body;
    if (!extracted?.type) return res.status(400).json({ error: 'No data' });

    const created = [];
    const name = extracted.passengerName || extracted.guestName || 'Document Entry';
    const bookingNum = `DOC-${Date.now().toString(36).toUpperCase()}`;

    if (extracted.type === 'flight') {
      let cust = await db.get("SELECT id FROM customers WHERE full_name LIKE ?", [`%${name.split(' ')[0]}%`]);
      if (!cust) { const r = await db.run('INSERT INTO customers (full_name) VALUES (?)', [name]); cust = { id: r.insertId || r.lastInsertRowid }; }
      const r = await db.run('INSERT INTO bookings (booking_number, customer_id, travel_date, airline, flight_number, from_destination, to_destination, status) VALUES (?,?,?,?,?,?,?,?)',
        [bookingNum, cust.id, extracted.departureDate || null, extracted.airline || null, extracted.flightNumber || null, extracted.origin || null, extracted.destination || null, 'pending']);
      const bid = r.insertId || r.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)', [bid, 'flight', `Flight ${extracted.airline||''} ${extracted.flightNumber||''}`, 0, JSON.stringify(extracted)]);
      await db.run('INSERT INTO booking_passengers (booking_id, full_name) VALUES (?,?)', [bid, name]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    } else if (extracted.type === 'hotel') {
      let cust = await db.get("SELECT id FROM customers WHERE full_name LIKE ?", [`%${name.split(' ')[0]}%`]);
      if (!cust) { const r = await db.run('INSERT INTO customers (full_name) VALUES (?)', [name]); cust = { id: r.insertId || r.lastInsertRowid }; }
      const r = await db.run('INSERT INTO bookings (booking_number, customer_id, travel_date, status) VALUES (?,?,?,?)', [bookingNum, cust.id, extracted.checkIn || null, 'pending']);
      const bid = r.insertId || r.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)', [bid, 'hotel', `Hotel ${extracted.hotelName||''}`, 0, JSON.stringify(extracted)]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    } else if (extracted.type === 'visa') {
      let cust = await db.get("SELECT id FROM customers WHERE full_name LIKE ?", [`%${name.split(' ')[0]}%`]);
      if (!cust) { const r = await db.run('INSERT INTO customers (full_name) VALUES (?)', [name]); cust = { id: r.insertId || r.lastInsertRowid }; }
      const r = await db.run('INSERT INTO bookings (booking_number, customer_id, status) VALUES (?,?,?)', [bookingNum, cust.id, 'pending']);
      const bid = r.insertId || r.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)', [bid, 'visa', `Visa ${extracted.country||''}`, 0, JSON.stringify(extracted)]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    }

    res.json({ message: 'Created', created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;

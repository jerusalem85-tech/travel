import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../config/database.js';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function extractText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString('utf-8');
    const texts = [];

    // Method 1: Tj operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(content)) !== null) {
      let t = m[1].replace(/\\([0-3][0-7]{2})/g, (_, c) => String.fromCharCode(parseInt(c, 8)));
      t = t.replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n');
      if (t.trim()) texts.push(t);
    }

    // Method 2: BT/ET blocks
    const btBlocks = content.match(/BT[\s\S]*?ET/g) || [];
    btBlocks.forEach(block => {
      const tjs = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      tjs.forEach(t => {
        const txt = t.replace(/^\s*\(/, '').replace(/\)\s*Tj$/, '');
        if (txt.trim() && !texts.includes(txt)) texts.push(txt);
      });
    });

    // Method 3: Hex strings
    const hexMatches = content.match(/<([0-9A-Fa-f\s]+)>\s*Tj/g) || [];
    hexMatches.forEach(hex => {
      const h = hex.replace(/^<\s*/, '').replace(/\s*>?\s*Tj$/, '').replace(/\s+/g, '');
      try {
        const decoded = Buffer.from(h, 'hex').toString('utf-8');
        if (decoded.trim()) texts.push(decoded);
      } catch {}
    });

    const text = texts.join('\n');
    if (text.trim()) return text;

    // Fallback: strip non-printable chars
    return content.replace(/[^\x20-\x7E\n\r\t\u00C0-\u00FF]/g, ' ')
      .replace(/\s{2,}/g, '\n').substring(0, 5000);
  } catch (e) {
    console.error('Extraction error:', e.message);
    return '';
  }
}

function parseFlightTicket(text) {
  const data = { type: 'flight', confidence: 0 };
  if (!text || text.length < 10) return data;

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const full = text;

  // Airline - check known airlines
  const airlines = ['Emirates','Turkish Airlines','British Airways','Air France','El Al','Saudia','Qatar Airways','EgyptAir','Royal Jordanian','Lufthansa','Wizz Air','Ryanair','Etihad','Flydubai','Pegasus','Arkia','Israir'];
  for (const a of airlines) {
    if (full.toLowerCase().includes(a.toLowerCase())) { data.airline = a; data.confidence += 15; break; }
  }

  // Flight number - pattern XX 0000 or XX0000
  const fnMatch = full.match(/\b([A-Z]{2,3})\s*(\d{2,4})\b/);
  if (fnMatch) {
    data.flightNumber = fnMatch[1] + fnMatch[2];
    if (!data.airline) {
      const codeMap = { EK: 'Emirates', TK: 'Turkish Airlines', BA: 'British Airways', AF: 'Air France', LY: 'El Al', SV: 'Saudia', QR: 'Qatar Airways', MS: 'EgyptAir', RJ: 'Royal Jordanian', LH: 'Lufthansa', W6: 'Wizz Air', FR: 'Ryanair', EY: 'Etihad', FZ: 'Flydubai', PC: 'Pegasus', IZ: 'Arkia', 6H: 'Israir' };
      if (codeMap[fnMatch[1]]) data.airline = codeMap[fnMatch[1]];
    }
    data.confidence += 10;
  }

  // PNR - 5-6 alphanumeric uppercase
  const pnrPat = /(?:PNR|BOOKING REF|REFERENCE|RECORD LOCATOR)[:\s#]*([A-Z0-9]{5,8})/i;
  const pnrM = full.match(pnrPat);
  if (pnrM) { data.pnr = pnrM[1]; data.confidence += 10; }

  // Ticket Number - 10-15 digits, often after ETKT or starts with 000-
  const tktPat = /(?:ETKT|E-TICKET|TICKET NUMBER)[:\s#]*(\d{10,15})/i;
  const tktM = full.match(tktPat) || full.match(/(\d{3}[-]\d{10,})/);
  if (tktM) { data.ticketNumber = tktM[1]; data.confidence += 10; }

  // Passengers - look for NAME or passenger patterns
  const paxPat = /(?:PASSENGER|PAX|Passenger Name|NAME)[:\s]+([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/i;
  const paxM = full.match(paxPat);
  if (paxM) { data.passengerName = paxM[1].trim(); data.confidence += 10; }

  // Airports - look for 3-letter codes
  const airportPat = /\b([A-Z]{3})\b/g;
  const airports = [];
  let apM;
  while ((apM = airportPat.exec(full)) !== null) {
    if (!['PDF','PNR','ETK','TKT','PAX','REF','FOR','AND','THE','ALL','VIA'].includes(apM[1])) {
      airports.push(apM[1]);
    }
  }
  // Find FROM/TO patterns
  const fromPat = /(?:FROM|DEPART|ORIGIN)[:\s]+([A-Z]{3})/i;
  const toPat = /(?:TO|ARRIVE|DESTINATION)[:\s]+([A-Z]{3})/i;
  const fromM = full.match(fromPat);
  const toM = full.match(toPat);
  if (fromM) { data.origin = fromM[1]; data.confidence += 8; }
  if (toM) { data.destination = toM[1]; data.confidence += 8; }
  // Fallback: use first two valid airport codes
  if (!data.origin && airports.length >= 2) { data.origin = airports[0]; data.destination = airports[1]; data.confidence += 5; }

  // Dates
  const datePat = /\b(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})\b|\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g;
  const dates = [];
  let dM;
  while ((dM = datePat.exec(full)) !== null) {
    dates.push(dM[0]);
  }
  if (dates.length >= 1) { data.departureDate = dates[0]; data.confidence += 8; }
  if (dates.length >= 2) { data.returnDate = dates[1]; }

  // Times
  const timePat = /\b(\d{1,2}:\d{2})\b/g;
  const times = [];
  let tM;
  while ((tM = timePat.exec(full)) !== null) { times.push(tM[1]); }
  if (times.length >= 1) { data.departureTime = times[0]; data.confidence += 5; }
  if (times.length >= 2) { data.arrivalTime = times[1]; data.confidence += 5; }

  // Booking class
  const classPat = /(?:CLASS|CABIN)[:\s]+([A-Za-z]+)/i;
  const classM = full.match(classPat);
  if (classM) { data.bookingClass = classM[1]; data.confidence += 3; }

  data.confidence = Math.min(100, Math.max(0, data.confidence));
  return data;
}

function parseHotelVoucher(text) {
  const data = { type: 'hotel', confidence: 0 };
  if (!text || text.length < 10) return data;

  const full = text;

  // Hotel name
  const hotelPat = /(?:HOTEL|PROPERTY|ACCOMMODATION|WELCOME TO|CONFIRMED AT)[:\s]+([A-Z][A-Za-z\s&]+(?:Hotel|Resort|Inn|Suites|Marriott|Hilton|Hyatt|Rotana|Crown|Plaza))/i;
  const hotelM = full.match(hotelPat);
  if (hotelM) { data.hotelName = hotelM[1].trim(); data.confidence += 15; }

  // Guest name
  const guestPat = /(?:GUEST|GUEST NAME|BOOKED FOR|MR\.?|MRS\.?|MS\.?)[:\s]+([A-Z]{2,}\s+[A-Z]{2,})/i;
  const guestM = full.match(guestPat);
  if (guestM) { data.guestName = guestM[1].trim(); data.confidence += 10; }

  // Room type
  const roomPat = /(?:ROOM TYPE|ROOM|ACCOMMODATION TYPE)[:\s]+([A-Za-z\s]+)/i;
  const roomM = full.match(roomPat);
  if (roomM) { data.roomType = roomM[1].trim(); data.confidence += 10; }

  // Dates
  const datePat = /\b(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})\b|\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g;
  const dates = [];
  let dM;
  while ((dM = datePat.exec(full)) !== null) { dates.push(dM[0]); }
  const ciMatch = full.match(/(?:CHECK[-\s]IN|ARRIVAL)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  const coMatch = full.match(/(?:CHECK[-\s]OUT|DEPARTURE)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i);
  if (ciMatch) { data.checkIn = ciMatch[1]; data.confidence += 10; }
  else if (dates[0]) { data.checkIn = dates[0]; data.confidence += 5; }
  if (coMatch) { data.checkOut = coMatch[1]; data.confidence += 10; }
  else if (dates[1]) { data.checkOut = dates[1]; data.confidence += 5; }

  // Confirmation number
  const confPat = /(?:CONFIRMATION|BOOKING|RESERVATION|CONF)[:\s#]*([A-Z0-9]{6,12})/i;
  const confM = full.match(confPat);
  if (confM) { data.confirmation = confM[1]; data.confidence += 8; }

  // City
  const cityPat = /(?:CITY|LOCATION|DESTINATION)[:\s]+([A-Za-z\s]{3,30})/i;
  const cityM = full.match(cityPat);
  if (cityM) { data.city = cityM[1].trim(); data.confidence += 5; }

  data.confidence = Math.min(100, Math.max(0, data.confidence));
  return data;
}

function parseVisaDoc(text) {
  const data = { type: 'visa', confidence: 0 };
  if (!text || text.length < 10) return data;

  const full = text;

  const paxPat = /(?:NAME|SURNAME|GIVEN NAME|FULL NAME)[:\s]+([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/i;
  const paxM = full.match(paxPat);
  if (paxM) { data.passportName = paxM[1].trim(); data.confidence += 12; }

  const visaPat = /(?:VISA|VISA NO|VISA NUMBER|CONTROL NO)[:\s#]+([A-Z0-9]{5,20})/i;
  const visaM = full.match(visaPat);
  if (visaM) { data.visaNumber = visaM[1]; data.confidence += 12; }

  const countryPat = /(?:COUNTRY|ISSUING COUNTRY|FOR)[:\s]+([A-Za-z\s]{3,30})/i;
  const countryM = full.match(countryPat);
  if (countryM) { data.country = countryM[1].trim(); data.confidence += 10; }

  const typePat = /(?:TYPE|CATEGORY|VISA TYPE)[:\s]+([A-Za-z\s]{3,20})/i;
  const typeM = full.match(typePat);
  if (typeM) { data.visaType = typeM[1].trim(); data.confidence += 8; }

  const datePat = /\b(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})\b|\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g;
  const dates = [];
  let dM;
  while ((dM = datePat.exec(full)) !== null) { dates.push(dM[0]); }
  const issPat = /(?:ISSUE DATE|DATE OF ISSUE|ISSUED)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i;
  const expPat = /(?:EXPIRY|EXPIRATION|VALID UNTIL|VALID TILL)[:\s]+(\d{1,2}[\/\-\.][A-Za-z]{3,9}[\/\-\.]?\d{2,4})/i;
  const issM = full.match(issPat);
  const expM = full.match(expPat);
  if (issM) { data.issueDate = issM[1]; data.confidence += 10; }
  else if (dates[0]) { data.issueDate = dates[0]; data.confidence += 5; }
  if (expM) { data.expiryDate = expM[1]; data.confidence += 10; }
  else if (dates[1]) { data.expiryDate = dates[1]; data.confidence += 5; }

  data.confidence = Math.min(100, Math.max(0, data.confidence));
  return data;
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = await extractText(req.file.path);

    if (!text || text.trim().length < 5) {
      return res.json({
        extracted: { type: req.body.type || 'flight', confidence: 0 },
        rawText: '(Could not extract text from this file. The PDF may be scanned/image-based. Try a digital PDF or use Manual mode.)',
        fileName: req.file.filename,
        error: 'No readable text found',
      });
    }

    let result;
    const docType = req.body.type || '';
    if (docType === 'flight' || (!docType && (/FLIGHT|PNR|ETKT|BOARDING|DEPARTURE|AIRLINE|TICKET/i.test(text)))) {
      result = parseFlightTicket(text);
    } else if (docType === 'hotel' || (!docType && (/HOTEL|CHECK.IN|ACCOMMODATION|ROOM|VOUCHER/i.test(text)))) {
      result = parseHotelVoucher(text);
    } else if (docType === 'visa' || (!docType && (/VISA|EMBASSY|CONSULATE|VALID UNTIL/i.test(text)))) {
      result = parseVisaDoc(text);
    } else {
      result = parseFlightTicket(text);
    }

    res.json({ extracted: result, rawText: text.substring(0, 2000), fileName: req.file.filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/create', async (req, res) => {
  try {
    const db = await getDb();
    const { extracted } = req.body;
    if (!extracted || !extracted.type) return res.status(400).json({ error: 'No extracted data' });

    const created = [];

    if (extracted.type === 'flight') {
      const custName = extracted.passengerName || 'Auto-Extracted Passenger';
      const names = custName.split(/[\s\/]+/).filter(Boolean);
      const fullName = names.join(' ') || 'Passenger';

      let cust = await db.get('SELECT id FROM customers WHERE full_name LIKE ?', [`%${names[0] || ''}%`]);
      if (!cust) {
        const result = await db.run('INSERT INTO customers (full_name) VALUES (?)', [fullName]);
        cust = { id: result.insertId || result.lastInsertRowid };
      }

      const bookingNum = `AI-${Date.now().toString(36).toUpperCase()}`;
      const result = await db.run(
        'INSERT INTO bookings (booking_number, customer_id, travel_date, airline, flight_number, from_destination, to_destination, total_amount, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [bookingNum, cust.id, extracted.departureDate || null, extracted.airline || null, extracted.flightNumber || null, extracted.origin || null, extracted.destination || null, 0, 'pending']
      );
      const bid = result.insertId || result.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)',
        [bid, 'flight', `Flight ${extracted.airline || ''} ${extracted.flightNumber || ''}`, 0, JSON.stringify(extracted)]);
      await db.run('INSERT INTO booking_passengers (booking_id, full_name) VALUES (?,?)', [bid, fullName]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    }

    if (extracted.type === 'hotel') {
      const custName = extracted.guestName || 'Auto-Extracted Guest';
      let cust = await db.get('SELECT id FROM customers WHERE full_name LIKE ?', [`%${custName.split(' ')[0]}%`]);
      if (!cust) {
        const result = await db.run('INSERT INTO customers (full_name) VALUES (?)', [custName]);
        cust = { id: result.insertId || result.lastInsertRowid };
      }
      const bookingNum = `AI-${Date.now().toString(36).toUpperCase()}`;
      const result = await db.run('INSERT INTO bookings (booking_number, customer_id, travel_date, status) VALUES (?,?,?,?)', [bookingNum, cust.id, extracted.checkIn || null, 'pending']);
      const bid = result.insertId || result.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)', [bid, 'hotel', `Hotel ${extracted.hotelName || ''}`, 0, JSON.stringify(extracted)]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    }

    if (extracted.type === 'visa') {
      const custName = extracted.passportName || 'Auto-Extracted';
      let cust = await db.get('SELECT id FROM customers WHERE full_name LIKE ?', [`%${custName.split(' ')[0]}%`]);
      if (!cust) {
        const result = await db.run('INSERT INTO customers (full_name) VALUES (?)', [custName]);
        cust = { id: result.insertId || result.lastInsertRowid };
      }
      const bookingNum = `AI-${Date.now().toString(36).toUpperCase()}`;
      const result = await db.run('INSERT INTO bookings (booking_number, customer_id, status) VALUES (?,?,?)', [bookingNum, cust.id, 'pending']);
      const bid = result.insertId || result.lastInsertRowid;
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)', [bid, 'visa', `Visa ${extracted.country || ''}`, 0, JSON.stringify(extracted)]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    }

    res.json({ message: 'Records created', created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

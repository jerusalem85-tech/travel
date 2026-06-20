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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

function extractText(buffer) {
  return new Promise((resolve) => {
    let text = '';
    try {
      let content = buffer.toString('utf-8');
      // Remove PDF binary headers and stream objects
      content = content.replace(/stream[\s\S]*?endstream/g, (match) => {
        const inner = match.replace(/^stream\r?\n/, '').replace(/\r?\nendstream$/, '');
        // Try to decode FlateDecode (basic approach)
        return inner;
      });
      // Extract text between parentheses in Tj/TJ operators
      const textMatches = content.match(/\(([^)]*)\)\s*Tj/g) || [];
      text = textMatches.map(m => m.replace(/^\s*\(/, '').replace(/\)\s*Tj$/, '')).join(' ');
      // Decode basic PDF escapes
      text = text.replace(/\\([0-9]{3})/g, (_, code) => String.fromCharCode(parseInt(code, 8)));
      text = text.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
    } catch (e) { text = ''; }
    resolve(text || '');
  });
}

function parseFlightTicket(text) {
  const data = { type: 'flight', confidence: 0 };
  const patterns = {
    passengerName: [/(?:PASSENGER|PAX|NAME)[:\s]+([A-Z\s\/]+)(?=\s+(?:FROM|FLIGHT|DATE|ETKT|E-))/i, /([A-Z]{2,}[\/\s][A-Z]{2,}(?:\/[A-Z]{2,})?)/],
    airline: [/(?:AIRLINE|CARRIER|OPERATED\s+BY)[:\s]+([A-Z][A-Za-z\s]+)/i, /\b(Emirates|Turkish\s+Airlines|British\s+Airways|Air\s+France|El\s+Al|Saudia|Qatar\s+Airways|EgyptAir|Royal\s+Jordanian|Lufthansa|Wizz\s+Air|Ryanair)\b/i],
    ticketNumber: [/(?:ETKT|E-TICKET|TICKET)[:\s#]*([0-9]{10,15})/i, /([0-9]{3}-[0-9]{10,})/],
    pnr: [/(?:PNR|BOOKING\s+REF|REFERENCE)[:\s#]*([A-Z0-9]{5,8})/i],
    flightNumber: [/(?:FLIGHT|FLT)[:\s#]*([A-Z]{2,3}\s*[0-9]{1,4})/i],
    origin: [/(?:FROM|ORIGIN|DEPARTING)[:\s]+([A-Z]{3}(?:\s*-\s*[A-Za-z\s]+)?)/i],
    destination: [/(?:TO|DESTINATION|ARRIVING)[:\s]+([A-Z]{3}(?:\s*-\s*[A-Za-z\s]+)?)/i],
  };
  for (const [key, pats] of Object.entries(patterns)) {
    for (const p of pats) {
      const m = text.match(p);
      if (m) { data[key] = m[1].trim(); data.confidence += 12; break; }
    }
  }
  // Dates
  const dates = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g) || [];
  if (dates[0]) data.departureDate = dates[0].replace(/\./g, '/');
  if (dates[1]) data.returnDate = dates[1].replace(/\./g, '/');
  if (dates[0]) { data.confidence += 10; data.departureDate = dates[0].replace(/\./g, '/'); }

  // Times
  const times = text.match(/(\d{1,2}:\d{2})/g) || [];
  if (times[0]) data.departureTime = times[0];
  if (times[1]) data.arrivalTime = times[1];

  data.confidence = Math.min(100, data.confidence);
  return data;
}

function parseHotelVoucher(text) {
  const data = { type: 'hotel', confidence: 0 };
  const patterns = {
    hotelName: [/(?:HOTEL|PROPERTY|ACCOMMODATION)[:\s]+([A-Z][A-Za-z\s&]+(?:Hotel|Resort|Inn|Suites|Marriott|Hilton|Hyatt|Rotana))/i, /(?:WELCOME\s+TO|CONFIRMED\s+AT)\s+([A-Z][A-Za-z\s&]+)/i],
    guestName: [/(?:GUEST|GUEST\s+NAME)[:\s]+([A-Z\s]+)/i],
    roomType: [/(?:ROOM\s+TYPE|ACCOMMODATION)[:\s]+([A-Za-z\s]+)/i],
    checkIn: [/(?:CHECK[-\s]IN|ARRIVAL)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i],
    checkOut: [/(?:CHECK[-\s]OUT|DEPARTURE)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i],
    city: [/(?:CITY|LOCATION)[:\s]+([A-Za-z\s]+)/i],
    confirmation: [/(?:CONFIRMATION|BOOKING|RESERVATION)[:\s#]+([A-Z0-9]+)/i],
  };
  for (const [key, pats] of Object.entries(patterns)) {
    for (const p of pats) {
      const m = text.match(p);
      if (m) { data[key] = m[1].trim(); data.confidence += 14; break; }
    }
  }
  data.confidence = Math.min(100, data.confidence);
  return data;
}

function parseVisaDoc(text) {
  const data = { type: 'visa', confidence: 0 };
  const patterns = {
    passportName: [/(?:NAME|SURNAME|FULL\s+NAME)[:\s]+([A-Z\s]+)/i],
    visaNumber: [/(?:VISA|VISA\s+NO|VISA\s+NUMBER)[:\s#]+([A-Z0-9]{5,20})/i],
    country: [/(?:COUNTRY|ISSUING\s+COUNTRY)[:\s]+([A-Za-z\s]+)/i],
    visaType: [/(?:TYPE|CATEGORY)[:\s]+([A-Za-z\s]+)/i],
    issueDate: [/(?:ISSUE\s+DATE|DATE\s+OF\s+ISSUE)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i],
    expiryDate: [/(?:EXPIRY|EXPIRATION|VALID\s+UNTIL)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i],
  };
  for (const [key, pats] of Object.entries(patterns)) {
    for (const p of pats) {
      const m = text.match(p);
      if (m) { data[key] = m[1].trim(); data.confidence += 14; break; }
    }
  }
  data.confidence = Math.min(100, data.confidence);
  return data;
}

// Upload and parse
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const buffer = fs.readFileSync(req.file.path);
    const text = await extractText(buffer);

    // Auto-detect document type
    let result;
    const docType = req.body.type || '';
    if (docType === 'flight' || (!docType && (text.match(/FLIGHT|PNR|ETKT|BOARDING|DEPARTURE/i)))) {
      result = parseFlightTicket(text);
    } else if (docType === 'hotel' || (!docType && (text.match(/HOTEL|CHECK.IN|ACCOMMODATION|VOUCHER/i)))) {
      result = parseHotelVoucher(text);
    } else if (docType === 'visa' || (!docType && (text.match(/VISA|EMBASSY|CONSULATE|VALID\s+UNTIL/i)))) {
      result = parseVisaDoc(text);
    } else {
      result = parseFlightTicket(text);
    }

    res.json({ extracted: result, rawText: text.substring(0, 1000), fileName: req.file.filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create records from extracted data
router.post('/create', async (req, res) => {
  try {
    const db = await getDb();
    const { extracted } = req.body;
    if (!extracted || !extracted.type) return res.status(400).json({ error: 'No extracted data' });

    const created = [];

    if (extracted.type === 'flight') {
      // Create a basic booking with flight service
      const custName = extracted.passengerName || 'Auto-Extracted Passenger';
      const names = custName.split(/[\s\/]+/).filter(Boolean);
      const firstName = names[0] || 'Passenger';
      const lastName = names.slice(1).join(' ') || 'Auto';

      // Find or create customer
      let cust = await db.get('SELECT id FROM customers WHERE full_name LIKE ?', [`%${firstName}%`]);
      if (!cust) {
        const result = await db.run('INSERT INTO customers (full_name) VALUES (?)', [`${firstName} ${lastName}`]);
        cust = { id: result.insertId || result.lastInsertRowid };
      }

      const bookingNum = `AI-${Date.now().toString(36).toUpperCase()}`;
      const result = await db.run(
        'INSERT INTO bookings (booking_number, customer_id, travel_date, airline, flight_number, from_destination, to_destination, total_amount, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [bookingNum, cust.id, extracted.departureDate || null, extracted.airline || null, extracted.flightNumber || null, extracted.origin || null, extracted.destination || null, 0, 'pending']
      );
      const bid = result.insertId || result.lastInsertRowid;

      const details = {
        airline: extracted.airline || '', flight_number: extracted.flightNumber || '',
        pnr: extracted.pnr || '', ticket_number: extracted.ticketNumber || '',
        origin_airport: extracted.origin || '', destination_airport: extracted.destination || '',
        departure_date: extracted.departureDate || '', departure_time: extracted.departureTime || '',
        arrival_time: extracted.arrivalTime || '',
      };
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)',
        [bid, 'flight', `Flight ${extracted.airline || ''} ${extracted.flightNumber || ''}`, 0, JSON.stringify(details)]);
      await db.run('INSERT INTO booking_passengers (booking_id, full_name) VALUES (?,?)', [bid, custName]);
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
      const result = await db.run(
        'INSERT INTO bookings (booking_number, customer_id, travel_date, status) VALUES (?,?,?,?)',
        [bookingNum, cust.id, extracted.checkIn || null, 'pending']
      );
      const bid = result.insertId || result.lastInsertRowid;
      const details = {
        hotel_name: extracted.hotelName || '', room_type: extracted.roomType || '',
        check_in: extracted.checkIn || '', check_out: extracted.checkOut || '',
        city: extracted.city || '', confirmation: extracted.confirmation || '',
      };
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)',
        [bid, 'hotel', `Hotel ${extracted.hotelName || ''}`, 0, JSON.stringify(details)]);
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
      const result = await db.run(
        'INSERT INTO bookings (booking_number, customer_id, status) VALUES (?,?,?)',
        [bookingNum, cust.id, 'pending']
      );
      const bid = result.insertId || result.lastInsertRowid;
      const details = {
        country: extracted.country || '', visa_type: extracted.visaType || '',
        visa_number: extracted.visaNumber || '', issue_date: extracted.issueDate || '',
        expiry_date: extracted.expiryDate || '',
      };
      await db.run('INSERT INTO booking_services (booking_id, service_type, description, amount, details) VALUES (?,?,?,?,?)',
        [bid, 'visa', `Visa ${extracted.country || ''}`, 0, JSON.stringify(details)]);
      created.push({ type: 'booking', id: bid, booking_number: bookingNum });
    }

    res.json({ message: 'Records created', created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

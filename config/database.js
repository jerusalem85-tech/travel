import fs from 'fs';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const useMySQL = process.env.USE_MYSQL === 'true';

let db;

function sqliteDb() {
  const dataDir = path.join(__dirname, '..', 'data');
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  const d = new Database(path.join(dataDir, 'travel.db'));
  d.pragma('journal_mode = WAL');
  d.pragma('foreign_keys = ON');
  return {
    run: (sql, params = []) => d.prepare(sql).run(params),
    get: (sql, params = []) => d.prepare(sql).get(params),
    all: (sql, params = []) => d.prepare(sql).all(params),
    exec: (sql) => d.exec(sql),
  };
}

let mysqlPool;
async function mysqlDb() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });
    try {
      const conn = await mysqlPool.getConnection();
      conn.release();
    } catch (e) {
      mysqlPool = null;
      throw e;
    }
  }
  return {
    run: async (sql, params = []) => {
      const [result] = await mysqlPool.execute(sql, params);
      return { changes: result.affectedRows, insertId: result.insertId };
    },
    get: async (sql, params = []) => {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows[0] || null;
    },
    all: async (sql, params = []) => {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows;
    },
  };
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  id_number TEXT,
  passport_number TEXT,
  nationality TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  service_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  service_type TEXT,
  travel_date TEXT,
  return_date TEXT,
  from_destination TEXT,
  to_destination TEXT,
  airline TEXT,
  flight_number TEXT,
  ticket_number TEXT,
  status TEXT DEFAULT 'pending',
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  cost_amount REAL DEFAULT 0,
  profit_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  passport_number TEXT,
  id_number TEXT,
  seat_number TEXT
);

CREATE TABLE IF NOT EXISTS booking_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  service_type TEXT,
  supplier_id INTEGER,
  description TEXT,
  amount REAL DEFAULT 0,
  details TEXT DEFAULT '{}'
);



CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL,
  booking_id INTEGER,
  customer_id INTEGER NOT NULL,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT NOT NULL,
  booking_id INTEGER,
  invoice_id INTEGER,
  amount REAL NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT NOT NULL,
  booking_id INTEGER,
  supplier_id INTEGER,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  exchange_rate REAL DEFAULT 1,
  payment_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  currency_code TEXT NOT NULL,
  rate_to_usd REAL NOT NULL DEFAULT 1,
  effective_date TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS booking_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  category TEXT DEFAULT 'other',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  notes TEXT,
  follow_up_date TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  date TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key_name TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT NOT NULL,
  customer_id INTEGER,
  travel_date TEXT,
  return_date TEXT,
  from_destination TEXT,
  to_destination TEXT,
  airline TEXT,
  flight_number TEXT,
  service_type TEXT,
  total_amount REAL DEFAULT 0,
  cost_amount REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  star_rating INTEGER DEFAULT 3,
  contact_person TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS hotel_room_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  room_type TEXT,
  board_basis TEXT,
  price_per_night REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  hotel_id INTEGER NOT NULL,
  room_type_id INTEGER,
  check_in TEXT,
  check_out TEXT,
  rooms_count INTEGER DEFAULT 1,
  guests_count INTEGER DEFAULT 1,
  total_cost REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tour_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  duration_days INTEGER DEFAULT 1,
  includes TEXT,
  excludes TEXT,
  price_per_person REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tour_package_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  package_id INTEGER NOT NULL,
  persons_count INTEGER DEFAULT 1,
  travel_date TEXT,
  total_price REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_number TEXT NOT NULL,
  customer_id INTEGER,
  booking_id INTEGER,
  provider_name TEXT,
  policy_type TEXT,
  coverage_amount REAL DEFAULT 0,
  premium_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_number TEXT NOT NULL,
  contract_type TEXT,
  party_name TEXT NOT NULL,
  party_phone TEXT,
  party_email TEXT,
  start_date TEXT,
  end_date TEXT,
  terms TEXT,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  booking_id INTEGER,
  commission_type TEXT,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  percentage REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  exchange_rate REAL DEFAULT 1.0000,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS customer_communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  communication_type TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS visas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visa_number TEXT NOT NULL,
  customer_id INTEGER,
  booking_id INTEGER,
  country TEXT,
  visa_type TEXT,
  application_date TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  entity_id INTEGER,
  document_type TEXT,
  file_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER,
  related_to_type TEXT,
  related_to_id INTEGER,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS price_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service_type TEXT,
  destination TEXT,
  season TEXT,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  supplier_id INTEGER,
  valid_from TEXT,
  valid_to TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS booking_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_by INTEGER,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT,
  unit_cost REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  destination TEXT,
  travel_date TEXT,
  persons_count INTEGER DEFAULT 1,
  budget REAL DEFAULT 0,
  status TEXT DEFAULT 'new',
  assigned_to INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  position TEXT,
  department TEXT,
  base_salary REAL DEFAULT 0,
  hire_date TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT DEFAULT 'present',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS salaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  amount REAL DEFAULT 0,
  bonuses REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  paid INTEGER DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  capacity INTEGER DEFAULT 4,
  vehicle_type TEXT,
  fuel_type TEXT,
  status TEXT DEFAULT 'available',
  daily_rate REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  languages TEXT,
  specializations TEXT,
  rating REAL DEFAULT 0,
  daily_rate REAL DEFAULT 0,
  status TEXT DEFAULT 'available',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type TEXT DEFAULT 'percentage',
  value REAL DEFAULT 0,
  applies_to TEXT DEFAULT 'all',
  min_amount REAL DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  valid_from TEXT,
  valid_to TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rate REAL DEFAULT 0,
  applies_to TEXT DEFAULT 'all',
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  customer_id INTEGER,
  booking_id INTEGER,
  rating INTEGER DEFAULT 5,
  review_text TEXT,
  reviewer_name TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS trash (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_data TEXT,
  deleted_by INTEGER,
  deleted_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS login_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  full_name TEXT,
  action TEXT DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'whatsapp',
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS installment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INT,
  customer_id INT,
  total_amount REAL DEFAULT 0,
  down_payment REAL DEFAULT 0,
  installments_count INTEGER DEFAULT 1,
  remaining_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS installment_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INT NOT NULL,
  amount REAL DEFAULT 0,
  due_date TEXT,
  paid_date TEXT,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INT NOT NULL UNIQUE,
  theme_color TEXT DEFAULT 'indigo',
  sidebar_collapsed INTEGER DEFAULT 0,
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS airports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  terminal_info TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS airlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  website TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT,
  description TEXT,
  attractions TEXT,
  best_season TEXT,
  currency TEXT,
  language TEXT,
  timezone TEXT,
  visa_info TEXT,
  health_info TEXT,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS flight_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_id INT,
  flight_number TEXT NOT NULL,
  origin_airport_id INT,
  destination_airport_id INT,
  departure_time TEXT,
  arrival_time TEXT,
  days_of_week TEXT,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INT,
  lead_id INT,
  booking_id INT,
  type TEXT DEFAULT 'call',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to INT,
  due_date TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS brokers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  commission_rate REAL DEFAULT 0,
  contract_start TEXT,
  contract_end TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS broker_commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broker_id INTEGER NOT NULL,
  booking_id INTEGER,
  commission REAL DEFAULT 0,
  paid INTEGER DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  booking_id INTEGER,
  pickup_location TEXT,
  dropoff_location TEXT,
  transfer_date TEXT,
  transfer_time TEXT,
  vehicle_id INTEGER,
  guide_id INTEGER,
  passenger_count INTEGER DEFAULT 1,
  price REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS services_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  supplier_id INTEGER,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS restaurant_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  booking_id INTEGER,
  restaurant_name TEXT NOT NULL,
  guest_count INTEGER DEFAULT 2,
  reservation_date TEXT,
  reservation_time TEXT,
  table_type TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  location TEXT,
  bedrooms INTEGER DEFAULT 1,
  capacity INTEGER DEFAULT 2,
  price_per_night REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  owner_name TEXT,
  owner_phone TEXT,
  status TEXT DEFAULT 'available',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_name TEXT NOT NULL,
  referrer_phone TEXT,
  referred_name TEXT,
  referred_phone TEXT,
  booking_id INTEGER,
  reward_amount REAL DEFAULT 0,
  reward_paid INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INT,
  customer_id INT,
  rating INT DEFAULT 5,
  nps_score INT DEFAULT 7,
  service_quality INT DEFAULT 5,
  communication INT DEFAULT 5,
  value_for_money INT DEFAULT 5,
  feedback TEXT,
  recommend INTEGER DEFAULT 1,
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT,
  tags TEXT,
  is_published INTEGER DEFAULT 1,
  views INTEGER DEFAULT 0,
  created_by INT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INT,
  booking_id INT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to INT,
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS gift_vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_id INT,
  amount REAL DEFAULT 0,
  remaining REAL DEFAULT 0,
  expiry_date TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'email',
  audience TEXT,
  subject TEXT,
  content TEXT,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INT NOT NULL,
  points INTEGER DEFAULT 0,
  type TEXT DEFAULT 'earned',
  reference_type TEXT,
  reference_id INT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INT,
  image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'booking',
  content TEXT NOT NULL,
  variables TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS signed_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INT,
  booking_id INT,
  customer_id INT,
  contract_data TEXT,
  signature_data TEXT,
  signed_at TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INT,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TEXT,
  appointment_time TEXT,
  duration INTEGER DEFAULT 30,
  type TEXT DEFAULT 'meeting',
  status TEXT DEFAULT 'scheduled',
  assigned_to INT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_type TEXT,
  request_id INT,
  requested_by INT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  approved_by INT,
  approved_at TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS phone_directory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  department TEXT,
  position TEXT,
  is_emergency INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  entity_type TEXT,
  entity_id INT,
  uploaded_by INT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  created_by INT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
`;

export function isMySQL() { return useMySQL; }

let mysqlFailed = false;
async function init() {
  if (useMySQL) {
    let d;
    try {
      d = await mysqlDb();
    } catch (e) {
      console.error('MySQL connection failed, falling back to SQLite:', e.message);
      mysqlFailed = true;
    }
    if (mysqlFailed) {
      db = sqliteDb();
      db.exec(schema);
      return;
    }
    await d.run(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      id_number VARCHAR(100),
      passport_number VARCHAR(100),
      nationality VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      service_type VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_number VARCHAR(50) NOT NULL,
      customer_id INT NOT NULL,
      service_type VARCHAR(100),
      travel_date DATE,
      return_date DATE,
      from_destination VARCHAR(255),
      to_destination VARCHAR(255),
      airline VARCHAR(255),
      flight_number VARCHAR(100),
      ticket_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      total_amount DECIMAL(10,2) DEFAULT 0,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      cost_amount DECIMAL(10,2) DEFAULT 0,
      profit_amount DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS booking_passengers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      passport_number VARCHAR(100),
      id_number VARCHAR(100),
      seat_number VARCHAR(50)
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS booking_services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      service_type VARCHAR(100),
      supplier_id INT,
      description VARCHAR(255),
      amount DECIMAL(10,2) DEFAULT 0
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL,
      booking_id INT,
      customer_id INT NOT NULL,
      total_amount DECIMAL(10,2) DEFAULT 0,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'unpaid',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payment_number VARCHAR(50) NOT NULL,
      booking_id INT,
      invoice_id INT,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(100),
      reference VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS supplier_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payment_number VARCHAR(50) NOT NULL,
      booking_id INT,
      supplier_id INT,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      exchange_rate DECIMAL(10,4) DEFAULT 1,
      payment_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      currency_code VARCHAR(3) NOT NULL,
      rate_to_usd DECIMAL(10,6) NOT NULL DEFAULT 1,
      effective_date DATE DEFAULT (CURRENT_DATE)
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS booking_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      file_size BIGINT DEFAULT 0,
      mime_type VARCHAR(100),
      category VARCHAR(50) DEFAULT 'other',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS call_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      notes TEXT,
      follow_up_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(100),
      date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      \`value\` TEXT
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS quotations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quote_number VARCHAR(50) NOT NULL,
      customer_id INT,
      travel_date DATE,
      return_date DATE,
      from_destination VARCHAR(255),
      to_destination VARCHAR(255),
      airline VARCHAR(255),
      flight_number VARCHAR(100),
      service_type VARCHAR(100),
      total_amount DECIMAL(10,2) DEFAULT 0,
      cost_amount DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      is_read TINYINT DEFAULT 0,
      link VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS hotels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(255),
      star_rating INT DEFAULT 3,
      contact_person VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS hotel_room_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hotel_id INT NOT NULL,
      room_type VARCHAR(100),
      board_basis VARCHAR(100),
      price_per_night DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      notes TEXT
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS hotel_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      hotel_id INT NOT NULL,
      room_type_id INT,
      check_in DATE,
      check_out DATE,
      rooms_count INT DEFAULT 1,
      guests_count INT DEFAULT 1,
      total_cost DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS tour_packages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      destination VARCHAR(255),
      duration_days INT DEFAULT 1,
      includes TEXT,
      excludes TEXT,
      price_per_person DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS tour_package_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      package_id INT NOT NULL,
      persons_count INT DEFAULT 1,
      travel_date DATE,
      total_price DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS insurance_policies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      policy_number VARCHAR(50) NOT NULL,
      customer_id INT,
      booking_id INT,
      provider_name VARCHAR(255),
      policy_type VARCHAR(100),
      coverage_amount DECIMAL(10,2) DEFAULT 0,
      premium_amount DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      start_date DATE,
      end_date DATE,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS contracts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contract_number VARCHAR(50) NOT NULL,
      contract_type VARCHAR(50),
      party_name VARCHAR(255) NOT NULL,
      party_phone VARCHAR(50),
      party_email VARCHAR(255),
      start_date DATE,
      end_date DATE,
      terms TEXT,
      total_amount DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS commissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      booking_id INT,
      commission_type VARCHAR(50),
      amount DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      percentage DECIMAL(5,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      user_name VARCHAR(255),
      action VARCHAR(50),
      entity_type VARCHAR(50),
      entity_id INT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS currencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(100),
      exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
      is_default TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS customer_communications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      communication_type VARCHAR(50),
      subject VARCHAR(255),
      message TEXT,
      status VARCHAR(50) DEFAULT 'sent',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS visas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visa_number VARCHAR(50) NOT NULL,
      customer_id INT,
      booking_id INT,
      country VARCHAR(255),
      visa_type VARCHAR(100),
      application_date DATE,
      issue_date DATE,
      expiry_date DATE,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50),
      entity_id INT,
      document_type VARCHAR(100),
      file_name VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_to INT,
      related_to_type VARCHAR(50),
      related_to_id INT,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      due_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS price_lists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      service_type VARCHAR(100),
      destination VARCHAR(255),
      season VARCHAR(50),
      price DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      supplier_id INT,
      valid_from DATE,
      valid_to DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS booking_checklist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      step_name VARCHAR(255) NOT NULL,
      is_completed TINYINT DEFAULT 0,
      completed_by INT,
      completed_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS inventory_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      quantity INT DEFAULT 0,
      unit VARCHAR(50),
      unit_cost DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      source VARCHAR(100),
      destination VARCHAR(255),
      travel_date DATE,
      persons_count INT DEFAULT 1,
      budget DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'new',
      assigned_to INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      position VARCHAR(255),
      department VARCHAR(255),
      base_salary DECIMAL(10,2) DEFAULT 0,
      hire_date DATE,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      date DATE NOT NULL,
      clock_in TIME,
      clock_out TIME,
      status VARCHAR(50) DEFAULT 'present',
      notes TEXT
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS salaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      month VARCHAR(7) NOT NULL,
      amount DECIMAL(10,2) DEFAULT 0,
      bonuses DECIMAL(10,2) DEFAULT 0,
      deductions DECIMAL(10,2) DEFAULT 0,
      net_amount DECIMAL(10,2) DEFAULT 0,
      paid TINYINT DEFAULT 0,
      paid_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plate_number VARCHAR(50) NOT NULL,
      brand VARCHAR(255),
      model VARCHAR(255),
      year INT,
      capacity INT DEFAULT 4,
      vehicle_type VARCHAR(100),
      fuel_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'available',
      daily_rate DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS guides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      languages TEXT,
      specializations TEXT,
      rating DECIMAL(2,1) DEFAULT 0,
      daily_rate DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'available',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS discounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      type VARCHAR(50) DEFAULT 'percentage',
      value DECIMAL(10,2) DEFAULT 0,
      applies_to VARCHAR(50) DEFAULT 'all',
      min_amount DECIMAL(10,2) DEFAULT 0,
      max_uses INT DEFAULT 0,
      use_count INT DEFAULT 0,
      valid_from DATE,
      valid_to DATE,
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS tax_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      rate DECIMAL(5,2) DEFAULT 0,
      applies_to VARCHAR(50) DEFAULT 'all',
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT NOT NULL,
      customer_id INT,
      booking_id INT,
      rating INT DEFAULT 5,
      review_text TEXT,
      reviewer_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS trash (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INT NOT NULL,
      entity_data JSON,
      deleted_by INT,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS login_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      full_name VARCHAR(255),
      action VARCHAR(50) DEFAULT 'login',
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'whatsapp',
      subject TEXT,
      body TEXT NOT NULL,
      variables TEXT,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS installment_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      customer_id INT,
      total_amount DECIMAL(10,2) DEFAULT 0,
      down_payment DECIMAL(10,2) DEFAULT 0,
      installments_count INT DEFAULT 1,
      remaining_amount DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS installment_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      amount DECIMAL(10,2) DEFAULT 0,
      due_date DATE,
      paid_date DATE,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS user_preferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      theme_color VARCHAR(50) DEFAULT 'indigo',
      sidebar_collapsed TINYINT DEFAULT 0,
      date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS airports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      city VARCHAR(255),
      country VARCHAR(255),
      terminal_info TEXT,
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS airlines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      country VARCHAR(255),
      website VARCHAR(255),
      phone VARCHAR(50),
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS destinations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      country VARCHAR(255),
      description TEXT,
      attractions TEXT,
      best_season VARCHAR(255),
      currency VARCHAR(10),
      language VARCHAR(100),
      timezone VARCHAR(100),
      visa_info TEXT,
      health_info TEXT,
      image_url VARCHAR(500),
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS flight_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      airline_id INT,
      flight_number VARCHAR(50) NOT NULL,
      origin_airport_id INT,
      destination_airport_id INT,
      departure_time TIME,
      arrival_time TIME,
      days_of_week VARCHAR(50),
      price DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS follow_ups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      lead_id INT,
      booking_id INT,
      type VARCHAR(50) DEFAULT 'call',
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(50) DEFAULT 'medium',
      assigned_to INT,
      due_date DATE,
      completed_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS brokers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      company VARCHAR(255),
      commission_rate DECIMAL(5,2) DEFAULT 0,
      contract_start DATE,
      contract_end DATE,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS broker_commissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      broker_id INT NOT NULL,
      booking_id INT,
      commission DECIMAL(10,2) DEFAULT 0,
      paid TINYINT DEFAULT 0,
      paid_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      booking_id INT,
      pickup_location VARCHAR(255),
      dropoff_location VARCHAR(255),
      transfer_date DATE,
      transfer_time TIME,
      vehicle_id INT,
      guide_id INT,
      passenger_count INT DEFAULT 1,
      price DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS services_catalog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      price DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      supplier_id INT,
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS restaurant_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      booking_id INT,
      restaurant_name VARCHAR(255) NOT NULL,
      guest_count INT DEFAULT 2,
      reservation_date DATE,
      reservation_time TIME,
      table_type VARCHAR(100),
      special_requests TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS properties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      location VARCHAR(255),
      bedrooms INT DEFAULT 1,
      capacity INT DEFAULT 2,
      price_per_night DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      owner_name VARCHAR(255),
      owner_phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'available',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_name VARCHAR(255) NOT NULL,
      referrer_phone VARCHAR(50),
      referred_name VARCHAR(255),
      referred_phone VARCHAR(50),
      booking_id INT,
      reward_amount DECIMAL(10,2) DEFAULT 0,
      reward_paid TINYINT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS surveys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      customer_id INT,
      rating INT DEFAULT 5,
      nps_score INT DEFAULT 7,
      service_quality INT DEFAULT 5,
      communication INT DEFAULT 5,
      value_for_money INT DEFAULT 5,
      feedback TEXT,
      recommend TINYINT DEFAULT 1,
      responded_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS knowledge_articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      content TEXT,
      tags VARCHAR(500),
      is_published TINYINT DEFAULT 1,
      views INT DEFAULT 0,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS complaints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      booking_id INT,
      subject VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'open',
      assigned_to INT,
      resolution TEXT,
      resolved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS gift_vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      customer_id INT,
      amount DECIMAL(10,2) DEFAULT 0,
      remaining DECIMAL(10,2) DEFAULT 0,
      expiry_date DATE,
      is_active TINYINT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'email',
      audience VARCHAR(100),
      subject VARCHAR(255),
      content TEXT,
      sent_count INT DEFAULT 0,
      opened_count INT DEFAULT 0,
      clicked_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      scheduled_at TIMESTAMP NULL,
      sent_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS loyalty_points (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      points INT DEFAULT 0,
      type VARCHAR(50) DEFAULT 'earned',
      reference_type VARCHAR(50),
      reference_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS gallery_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT,
      image_url VARCHAR(500) NOT NULL,
      caption VARCHAR(255),
      category VARCHAR(100),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS contract_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'booking',
      content TEXT NOT NULL,
      variables TEXT,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS signed_contracts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT,
      booking_id INT,
      customer_id INT,
      contract_data TEXT,
      signature_data TEXT,
      signed_at TIMESTAMP NULL,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      appointment_date DATE,
      appointment_time TIME,
      duration INT DEFAULT 30,
      type VARCHAR(50) DEFAULT 'meeting',
      status VARCHAR(50) DEFAULT 'scheduled',
      assigned_to INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_type VARCHAR(50),
      request_id INT,
      requested_by INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      approved_by INT,
      approved_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS phone_directory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      department VARCHAR(100),
      position VARCHAR(100),
      is_emergency TINYINT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS uploaded_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INT DEFAULT 0,
      mime_type VARCHAR(100),
      entity_type VARCHAR(50),
      entity_id INT,
      uploaded_by INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await d.run(`CREATE TABLE IF NOT EXISTS daily_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      log_date DATE NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      category VARCHAR(100),
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    try { await d.run('ALTER TABLE customers ADD COLUMN full_name VARCHAR(255)'); } catch {}
    try { await d.run("UPDATE customers SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL"); } catch {}
    try { await d.run('ALTER TABLE tasks ADD COLUMN status VARCHAR(50) DEFAULT \'pending\''); } catch {}
    try { await d.run('ALTER TABLE installment_plans ADD COLUMN status VARCHAR(50) DEFAULT \'active\''); } catch {}
    try { await d.run('ALTER TABLE installment_payments ADD COLUMN status VARCHAR(50) DEFAULT \'pending\''); } catch {}
    try { await d.run("ALTER TABLE booking_services ADD COLUMN details TEXT DEFAULT '{}'"); } catch {}

    const userCount = await d.get('SELECT COUNT(*) as c FROM users');
    if (userCount.c === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await d.run('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', 'admin@travel.com', hash, 'admin']);
      await d.run('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Manager', 'manager@travel.com', hash, 'manager']);
      await d.run('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        ['User', 'user@travel.com', hash, 'user']);
      console.log('Default users created: admin@travel.com / admin123');
    }
  } else {
    db = sqliteDb();
    db.exec(schema);
  }
}

async function getDb() {
  if (useMySQL && !mysqlFailed) {
    return mysqlDb();
  }
  if (!db) {
    const dataDir = path.join(__dirname, '..', 'data');
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    db = sqliteDb();
    db.exec(schema);
  }
  return db;
}

export function forceSqliteFallback() { mysqlFailed = true; }

export { init, getDb };

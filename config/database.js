import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const useMySQL = process.env.USE_MYSQL === 'true';

let db;

function sqliteDb() {
  const d = new Database(path.join(__dirname, '..', 'data', 'travel.db'));
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
  amount REAL DEFAULT 0
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
`;

export function isMySQL() { return useMySQL; }

async function init() {
  if (useMySQL) {
    const d = await mysqlDb();
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
  } else {
    db = sqliteDb();
    db.exec(schema);
  }
}

async function getDb() {
  if (useMySQL) {
    return mysqlDb();
  }
  if (!db) {
    db = sqliteDb();
    db.run(schema);
  }
  return db;
}

export { init, getDb };

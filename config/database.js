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

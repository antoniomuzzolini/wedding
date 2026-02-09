import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'wedding.db');

// better-sqlite3 will create the database file automatically if it doesn't exist
const db = new Database(dbPath);

// Check if table exists and get its structure
let tableExists = false;
let hasSurname = false;
let hasFamilyId = false;
let hasMenuType = false;

try {
  const tableInfo = db.prepare("PRAGMA table_info(guests)").all() as Array<{ name: string }>;
  tableExists = tableInfo.length > 0;
  if (tableExists) {
    hasSurname = tableInfo.some((col) => col.name === 'surname');
    hasFamilyId = tableInfo.some((col) => col.name === 'family_id');
    hasMenuType = tableInfo.some((col) => col.name === 'menu_type');
  }
} catch (error) {
  // Table doesn't exist yet
  tableExists = false;
}

// Create table if it doesn't exist
if (!tableExists) {
  db.exec(`
    CREATE TABLE guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      email TEXT,
      family_id INTEGER,
      invitation_type TEXT NOT NULL CHECK(invitation_type IN ('full', 'evening')),
      response_status TEXT DEFAULT 'pending' CHECK(response_status IN ('pending', 'confirmed', 'declined')),
      response_date TEXT,
      menu_type TEXT CHECK(menu_type IN ('adulto', 'bambino', 'neonato')),
      dietary_requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES guests(id) ON DELETE SET NULL
    );
  `);
} else {
  // Migrate existing table
  if (!hasSurname) {
    db.exec(`ALTER TABLE guests ADD COLUMN surname TEXT;`);
    // Try to extract surname from name for existing records
    const guests = db.prepare('SELECT id, name FROM guests WHERE surname IS NULL OR surname = ?').all('');
    guests.forEach((guest: any) => {
      const parts = guest.name.trim().split(/\s+/);
      if (parts.length > 1) {
        const surname = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(' ');
        db.prepare('UPDATE guests SET name = ?, surname = ? WHERE id = ?').run(name, surname, guest.id);
      } else {
        db.prepare('UPDATE guests SET surname = ? WHERE id = ?').run('', guest.id);
      }
    });
  }
  
  if (!hasFamilyId) {
    db.exec(`ALTER TABLE guests ADD COLUMN family_id INTEGER;`);
  }
  
  if (!hasMenuType) {
    db.exec(`ALTER TABLE guests ADD COLUMN menu_type TEXT CHECK(menu_type IN ('adulto', 'bambino', 'neonato'));`);
  }
}

// Create admin_users table
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create indexes (only if columns exist)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_guests_surname ON guests(surname);
    CREATE INDEX IF NOT EXISTS idx_guests_response ON guests(response_status);
    CREATE INDEX IF NOT EXISTS idx_guests_family ON guests(family_id);
  `);
} catch (error) {
  // Indexes might already exist or columns might not exist yet
  console.log('Index creation:', error);
}

// Create default admin user (password: process.env.ADMIN_PASSWORD - should be changed!)
// In production, use proper password hashing (bcrypt)
const defaultAdmin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
if (!defaultAdmin) {
  // Simple hash for demo - REPLACE WITH PROPER HASHING IN PRODUCTION
  const passwordHash = process.env.ADMIN_PASSWORD; // This should be bcrypt hash in production
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
}

export default db;

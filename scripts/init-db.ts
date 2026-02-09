// Database initialization script
// Run with: npx tsx scripts/init-db.ts

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'wedding.db');

console.log('Initializing database...');

// Remove existing database if it exists (for fresh start)
if (fs.existsSync(dbPath)) {
  console.log('Removing existing database...');
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    invitation_type TEXT NOT NULL CHECK(invitation_type IN ('full', 'evening')),
    response_status TEXT DEFAULT 'pending' CHECK(response_status IN ('pending', 'confirmed', 'declined')),
    response_date TEXT,
    dietary_requirements TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
  CREATE INDEX IF NOT EXISTS idx_guests_response ON guests(response_status);
`);

// Create default admin user
const defaultAdmin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
if (!defaultAdmin) {
  // Simple hash for demo - REPLACE WITH PROPER HASHING IN PRODUCTION
  const passwordHash = process.env.ADMIN_PASSWORD; // This should be bcrypt hash in production
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
  console.log('Default admin user created (username: admin, password: process.env.ADMIN_PASSWORD)');
}

console.log('Database initialized successfully!');
db.close();

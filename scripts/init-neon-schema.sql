-- Script SQL per inizializzare lo schema del database su Neon
-- Esegui questo script dal Neon SQL Editor se preferisci inizializzare manualmente il database

-- Crea la tabella guests
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  family_id INTEGER,
  invitation_type VARCHAR(20) NOT NULL CHECK(invitation_type IN ('full', 'evening')),
  response_status VARCHAR(20) DEFAULT 'pending' CHECK(response_status IN ('pending', 'confirmed', 'declined')),
  response_date TIMESTAMP,
  menu_type VARCHAR(20) CHECK(menu_type IN ('adulto', 'bambino', 'neonato')),
  dietary_requirements TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES guests(id) ON DELETE SET NULL
);

-- Crea la tabella admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crea gli indici
CREATE INDEX IF NOT EXISTS idx_guests_surname ON guests(surname);
CREATE INDEX IF NOT EXISTS idx_guests_response ON guests(response_status);
CREATE INDEX IF NOT EXISTS idx_guests_family ON guests(family_id);

-- Nota: L'utente admin verrà creato automaticamente dall'applicazione
-- usando la variabile d'ambiente ADMIN_PASSWORD (se configurata)

import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for edge runtime compatibility
neonConfig.fetchConnectionCache = true;

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(databaseUrl);

// Helper to convert SQLite-style queries (? placeholders) to PostgreSQL ($1, $2, etc.)
function convertQuery(sqliteQuery: string, params: any[]): { query: string; params: any[] } {
  let paramIndex = 1;
  const convertedParams: any[] = [];
  const convertedQuery = sqliteQuery.replace(/\?/g, () => {
    convertedParams.push(params[paramIndex - 1]);
    return `$${paramIndex++}`;
  });
  return { query: convertedQuery, params: convertedParams };
}

// Wrapper class to mimic better-sqlite3 API
class DatabaseWrapper {
  // Prepare a statement (returns a Statement-like object)
  prepare(query: string) {
    return {
      // Execute query and return all rows
      all: async (...params: any[]) => {
        const { query: pgQuery, params: pgParams } = convertQuery(query, params);
        const result = await sql(pgQuery, pgParams);
        return result as any[];
      },
      // Execute query and return first row
      get: async (...params: any[]) => {
        const { query: pgQuery, params: pgParams } = convertQuery(query, params);
        const result = await sql(pgQuery, pgParams);
        return (result as any[])[0] || null;
      },
      // Execute query and return result with lastInsertRowid
      run: async (...params: any[]) => {
        const { query: pgQuery, params: pgParams } = convertQuery(query, params);
        
        // Check if this is an INSERT query
        const isInsert = /^\s*INSERT\s+/i.test(query.trim());
        
        if (isInsert) {
          // For INSERT, append RETURNING id to get the inserted ID
          let insertQuery = pgQuery.trim();
          if (!insertQuery.endsWith(';')) {
            insertQuery += ';';
          }
          // Remove trailing semicolon and add RETURNING
          insertQuery = insertQuery.replace(/;\s*$/, '') + ' RETURNING id';
          const result = await sql(insertQuery, pgParams);
          const insertedId = (result as any[])[0]?.id;
          return {
            lastInsertRowid: insertedId || null,
            changes: 1,
          };
        } else {
          // For UPDATE/DELETE, execute normally
          const result = await sql(pgQuery, pgParams);
          return {
            lastInsertRowid: null,
            changes: Array.isArray(result) ? result.length : 0,
          };
        }
      },
    };
  }

  // Execute multiple statements (for schema creation)
  async exec(statements: string) {
    const statementList = statements
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statementList) {
      await sql(statement);
    }
  }
}

const db = new DatabaseWrapper();

// Initialize database schema
async function initializeSchema() {
  try {
    // Check if guests table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guests'
      );
    `;
    
    const tableExists = (tableCheck[0] as any)?.exists || false;

    if (!tableExists) {
      // Create guests table
      await sql`
        CREATE TABLE guests (
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
      `;

      // Create indexes
      await sql`CREATE INDEX idx_guests_surname ON guests(surname);`;
      await sql`CREATE INDEX idx_guests_response ON guests(response_status);`;
      await sql`CREATE INDEX idx_guests_family ON guests(family_id);`;
    } else {
      // Check and add missing columns
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'guests' AND table_schema = 'public';
      `;
      
      const columnNames = (columns as any[]).map(c => c.column_name);
      
      if (!columnNames.includes('surname')) {
        await sql`ALTER TABLE guests ADD COLUMN surname VARCHAR(255);`;
      }
      
      if (!columnNames.includes('family_id')) {
        await sql`ALTER TABLE guests ADD COLUMN family_id INTEGER;`;
      }
      
      if (!columnNames.includes('menu_type')) {
        await sql`ALTER TABLE guests ADD COLUMN menu_type VARCHAR(20) CHECK(menu_type IN ('adulto', 'bambino', 'neonato'));`;
      }
    }

    // Create admin_users table
    const adminTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `;
    
    const adminTableExists = (adminTableCheck[0] as any)?.exists || false;

    if (!adminTableExists) {
      await sql`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
    }

    // Create default admin user if it doesn't exist
    const defaultAdmin = await db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
    if (!defaultAdmin && process.env.ADMIN_PASSWORD) {
      await db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', process.env.ADMIN_PASSWORD);
    }
  } catch (error) {
    console.error('Error initializing database schema:', error);
    // Don't throw - allow the app to start even if schema initialization fails
    // (it might already be initialized)
  }
}

// Initialize schema on module load (but don't block)
initializeSchema().catch(console.error);

export default db;

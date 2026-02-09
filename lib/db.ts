import { neon } from '@neondatabase/serverless';

// Note: fetchConnectionCache is deprecated and always true in newer versions

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(databaseUrl);

// Helper to execute query using tagged template literal
// Neon's sql function expects a tagged template literal, so we need to construct it dynamically
async function executeQuery(query: string, params: any[]): Promise<any[]> {
  // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
  let pgQuery = query;
  const pgParams: any[] = [];
  let paramIndex = 1;
  
  pgQuery = pgQuery.replace(/\?/g, () => {
    if (paramIndex - 1 < params.length) {
      pgParams.push(params[paramIndex - 1]);
    }
    return `$${paramIndex++}`;
  });
  
  // Split query by $1, $2, etc. to create template parts
  const parts: string[] = [];
  const values: any[] = [];
  const regex = /\$(\d+)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(pgQuery)) !== null) {
    // Add text before placeholder
    parts.push(pgQuery.substring(lastIndex, match.index));
    // Get parameter index (1-based)
    const paramIdx = parseInt(match[1]) - 1;
    if (paramIdx < pgParams.length) {
      values.push(pgParams[paramIdx]);
    }
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text
  parts.push(pgQuery.substring(lastIndex));
  
  // Create template strings array object that mimics TemplateStringsArray
  const templateStrings = Object.assign(parts, {
    raw: [...parts]
  }) as unknown as TemplateStringsArray;
  
  // Call sql as tagged template literal
  // TypeScript doesn't allow dynamic tagged template literals, so we use type assertion
  return await (sql as any)(templateStrings, ...values);
}

// Wrapper class to mimic better-sqlite3 API
class DatabaseWrapper {
  // Prepare a statement (returns a Statement-like object)
  prepare(query: string) {
    return {
      // Execute query and return all rows
      all: async (...params: any[]) => {
        const result = await executeQuery(query, params);
        return result as any[];
      },
      // Execute query and return first row
      get: async (...params: any[]) => {
        const result = await executeQuery(query, params);
        return (result as any[])[0] || null;
      },
      // Execute query and return result with lastInsertRowid
      run: async (...params: any[]) => {
        // Check if this is an INSERT query
        const isInsert = /^\s*INSERT\s+/i.test(query.trim());
        
        if (isInsert) {
          // For INSERT, append RETURNING id to get the inserted ID
          let insertQuery = query.trim();
          // Remove trailing semicolon if present
          insertQuery = insertQuery.replace(/;\s*$/, '');
          // Add RETURNING id
          insertQuery = insertQuery + ' RETURNING id';
          
          const result = await executeQuery(insertQuery, params);
          const insertedId = Array.isArray(result) && result.length > 0 ? (result[0] as any)?.id : null;
          
          return {
            lastInsertRowid: insertedId || null,
            changes: insertedId ? 1 : 0,
          };
        } else {
          // For UPDATE/DELETE, execute normally
          const result = await executeQuery(query, params);
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
      // For exec, we can use sql directly as tagged template since statements don't have params
      const templateStrings = Object.assign([statement], {
        raw: [statement]
      }) as unknown as TemplateStringsArray;
      await (sql as any)(templateStrings);
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
    // Use sql directly to avoid recursion
    const defaultAdminCheck = await sql`
      SELECT * FROM admin_users WHERE username = 'admin'
    `;
    const defaultAdmin = Array.isArray(defaultAdminCheck) && defaultAdminCheck.length > 0 ? defaultAdminCheck[0] : null;
    
    if (!defaultAdmin && process.env.ADMIN_PASSWORD) {
      await sql`
        INSERT INTO admin_users (username, password_hash) 
        VALUES ('admin', ${process.env.ADMIN_PASSWORD})
      `;
    }
  } catch (error) {
    console.error('Error initializing database schema:', error);
    // Don't throw - allow the app to start even if schema initialization fails
    // (it might already be initialized)
  }
}

// Initialize schema synchronously - we'll use a promise to ensure it's done
let schemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;

function ensureSchemaInitialized(): Promise<void> {
  if (schemaInitialized) {
    return Promise.resolve();
  }
  
  if (!schemaInitPromise) {
    schemaInitPromise = Promise.race([
      initializeSchema(),
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Schema initialization timeout after 15 seconds')), 15000)
      )
    ]).then(() => {
      schemaInitialized = true;
    }).catch((error) => {
      console.error('Error initializing database schema:', error);
      schemaInitialized = false;
      schemaInitPromise = null;
      throw error;
    });
  }
  
  return schemaInitPromise;
}

// Initialize schema on module load
ensureSchemaInitialized().catch(console.error);

// Wrap db methods to ensure schema is initialized before executing queries
const originalPrepare = db.prepare.bind(db);
(db as any).prepare = function(query: string) {
  const statement = originalPrepare(query);
  const originalAll = statement.all.bind(statement);
  const originalGet = statement.get.bind(statement);
  const originalRun = statement.run.bind(statement);
  
  return {
    all: async (...params: any[]) => {
      try {
        await ensureSchemaInitialized();
        return await originalAll(...params);
      } catch (error) {
        console.error('Error in db.prepare().all():', error);
        throw error;
      }
    },
    get: async (...params: any[]) => {
      try {
        await ensureSchemaInitialized();
        return await originalGet(...params);
      } catch (error) {
        console.error('Error in db.prepare().get():', error);
        throw error;
      }
    },
    run: async (...params: any[]) => {
      try {
        await ensureSchemaInitialized();
        return await originalRun(...params);
      } catch (error) {
        console.error('Error in db.prepare().run():', error);
        throw error;
      }
    },
  };
};

export default db;

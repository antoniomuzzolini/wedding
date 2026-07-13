import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/tables - Get all tables (admin only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const tables = await db.prepare('SELECT * FROM tables ORDER BY sort_order, id').all();
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST /api/tables - Create a new table (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, capacity, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome del tavolo è obbligatorio' }, { status: 400 });
    }

    const parsedCapacity = parseInt(capacity);
    if (!parsedCapacity || parsedCapacity < 1 || parsedCapacity > 50) {
      return NextResponse.json({ error: 'La capienza deve essere tra 1 e 50' }, { status: 400 });
    }

    const maxOrder = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM tables').get();

    const result = await db
      .prepare('INSERT INTO tables (name, capacity, sort_order) VALUES (?, ?, ?)')
      .run(name.trim(), parsedCapacity, ((maxOrder as any)?.max_order || 0) + 1);

    const table = await db.prepare('SELECT * FROM tables WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

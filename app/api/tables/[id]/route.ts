import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT /api/tables/[id] - Update a table (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { name, capacity, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const existing = await db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Tavolo non trovato' }, { status: 404 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome del tavolo è obbligatorio' }, { status: 400 });
    }

    const parsedCapacity = parseInt(capacity);
    if (!parsedCapacity || parsedCapacity < 1 || parsedCapacity > 50) {
      return NextResponse.json({ error: 'La capienza deve essere tra 1 e 50' }, { status: 400 });
    }

    await db.prepare(
      `UPDATE tables
       SET name = ?,
           capacity = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(name.trim(), parsedCapacity, id);

    const table = await db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// DELETE /api/tables/[id] - Delete a table, freeing its guests (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const existing = await db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Tavolo non trovato' }, { status: 404 });
    }

    // Libera esplicitamente gli ospiti assegnati (oltre al vincolo ON DELETE SET NULL)
    await db.prepare('UPDATE guests SET table_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE table_id = ?').run(id);
    await db.prepare('DELETE FROM tables WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

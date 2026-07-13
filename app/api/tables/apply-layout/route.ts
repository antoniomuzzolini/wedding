import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST /api/tables/apply-layout - Create suggested tables and seat guests (admin only)
// Body: { tables: [{ name, capacity, guest_ids: number[] }], replace_existing?: boolean, adminKey }
// Se replace_existing è true, i tavoli esistenti vengono eliminati e le
// assegnazioni azzerate prima di creare il nuovo layout. Gli ospiti e le
// loro risposte non vengono mai toccati.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tables, replace_existing, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json({ error: 'Array di tavoli richiesto' }, { status: 400 });
    }

    for (const table of tables) {
      const capacity = parseInt(table.capacity);
      if (!table.name || typeof table.name !== 'string' || !table.name.trim()) {
        return NextResponse.json({ error: 'Ogni tavolo deve avere un nome' }, { status: 400 });
      }
      if (!capacity || capacity < 1 || capacity > 50) {
        return NextResponse.json({ error: 'La capienza deve essere tra 1 e 50' }, { status: 400 });
      }
      if (!Array.isArray(table.guest_ids) || table.guest_ids.length > capacity) {
        return NextResponse.json(
          { error: `Il tavolo "${table.name}" ha più ospiti della capienza` },
          { status: 400 }
        );
      }
    }

    if (replace_existing) {
      await db.prepare('UPDATE guests SET table_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE table_id IS NOT NULL').run();
      await db.prepare('DELETE FROM tables').run();
    }

    let sortOrder = 0;
    const maxOrder = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM tables').get();
    sortOrder = (maxOrder as any)?.max_order || 0;

    for (const table of tables) {
      sortOrder += 1;
      const result = await db
        .prepare('INSERT INTO tables (name, capacity, sort_order) VALUES (?, ?, ?)')
        .run(table.name.trim(), parseInt(table.capacity), sortOrder);

      const tableId = result.lastInsertRowid;
      if (!tableId) {
        return NextResponse.json({ error: 'Errore nella creazione dei tavoli' }, { status: 500 });
      }

      for (const guestId of table.guest_ids) {
        await db
          .prepare('UPDATE guests SET table_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(tableId, guestId);
      }
    }

    return NextResponse.json({ success: true, created: tables.length });
  } catch (error) {
    console.error('Error applying table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT /api/tables/assign - Bulk assign/unassign guests to tables (admin only)
// Body: { assignments: [{ guest_id: number, table_id: number | null }], adminKey }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignments, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'Array di assegnazioni richiesto' }, { status: 400 });
    }

    // Verifica che i tavoli richiesti esistano e che la capienza non venga superata
    const tables = await db.prepare('SELECT id, capacity FROM tables').all();
    const capacityById = new Map<number, number>((tables as any[]).map((t) => [t.id, t.capacity]));

    const guests = await db.prepare('SELECT id, table_id FROM guests').all();
    const currentTableByGuest = new Map<number, number | null>(
      (guests as any[]).map((g) => [g.id, g.table_id])
    );

    // Stato futuro: applica le assegnazioni richieste a quelle correnti
    const futureTableByGuest = new Map(currentTableByGuest);
    for (const assignment of assignments) {
      const { guest_id, table_id } = assignment;
      if (!currentTableByGuest.has(guest_id)) {
        return NextResponse.json({ error: `Ospite ${guest_id} non trovato` }, { status: 400 });
      }
      if (table_id != null && !capacityById.has(table_id)) {
        return NextResponse.json({ error: `Tavolo ${table_id} non trovato` }, { status: 400 });
      }
      futureTableByGuest.set(guest_id, table_id ?? null);
    }

    const occupancy = new Map<number, number>();
    futureTableByGuest.forEach((tableId) => {
      if (tableId != null) {
        occupancy.set(tableId, (occupancy.get(tableId) || 0) + 1);
      }
    });
    const overCapacityEntry = Array.from(occupancy.entries()).find(
      ([tableId, count]) => count > (capacityById.get(tableId) || 0)
    );
    if (overCapacityEntry) {
      return NextResponse.json(
        { error: 'Assegnazione rifiutata: la capienza di un tavolo verrebbe superata' },
        { status: 400 }
      );
    }

    for (const assignment of assignments) {
      await db
        .prepare('UPDATE guests SET table_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(assignment.table_id ?? null, assignment.guest_id);
    }

    return NextResponse.json({ success: true, updated: assignments.length });
  } catch (error) {
    console.error('Error assigning tables:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

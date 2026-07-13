import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { computeSeatingProposal } from '@/lib/seating';

// POST /api/tables/auto-assign - Compute a seating proposal (admin only)
// Body: { mode: 'fill' | 'reset', include_pending?: boolean, adminKey }
//  - 'fill': rispetta le assegnazioni esistenti e piazza solo gli ospiti liberi
//  - 'reset': ricalcola tutto da zero (le assegnazioni esistenti vengono ignorate)
//  - include_pending: considera anche gli ospiti in attesa, non solo i confermati
// NON scrive nulla sul database: restituisce solo la proposta.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, include_pending, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!['fill', 'reset'].includes(mode)) {
      return NextResponse.json({ error: "mode deve essere 'fill' o 'reset'" }, { status: 400 });
    }

    const tables = await db.prepare('SELECT id, capacity FROM tables ORDER BY sort_order, id').all();
    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json({ error: 'Crea almeno un tavolo prima di usare l\'auto-assegnazione' }, { status: 400 });
    }

    // Solo ospiti a cerimonia completa; i pending entrano solo se richiesto
    const statuses = include_pending ? ['confirmed', 'pending'] : ['confirmed'];
    const eligible = await db
      .prepare(
        `SELECT id, family_id, table_id FROM guests
         WHERE invitation_type = 'full' AND response_status = ANY(?)`
      )
      .all(statuses);

    const guestTags = await db.prepare('SELECT guest_id, tag_id FROM guest_tags').all();
    const tagsByGuest = new Map<number, number[]>();
    for (const row of guestTags as any[]) {
      const list = tagsByGuest.get(row.guest_id) || [];
      list.push(row.tag_id);
      tagsByGuest.set(row.guest_id, list);
    }

    const lockedGuests =
      mode === 'fill' ? (eligible as any[]).filter((g) => g.table_id != null) : [];
    const freeGuests =
      mode === 'fill' ? (eligible as any[]).filter((g) => g.table_id == null) : (eligible as any[]);

    const proposal = computeSeatingProposal(
      freeGuests,
      tagsByGuest,
      tables as any[],
      lockedGuests
    );

    return NextResponse.json({ proposal, mode });
  } catch (error) {
    console.error('Error computing seating proposal:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

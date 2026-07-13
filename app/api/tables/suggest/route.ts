import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { suggestTableLayout } from '@/lib/seating';

// POST /api/tables/suggest - Suggest a complete table layout (admin only)
// Body: { min_seats: number, max_seats: number, include_pending?: boolean, adminKey }
// Propone numero di tavoli, capienze e raggruppamenti partendo da zero,
// ignorando tavoli e assegnazioni esistenti. NON scrive nulla sul database.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { min_seats, max_seats, include_pending, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const minSeats = parseInt(min_seats);
    const maxSeats = parseInt(max_seats);
    if (!minSeats || !maxSeats || minSeats < 1 || maxSeats > 50 || minSeats > maxSeats) {
      return NextResponse.json(
        { error: 'Posti minimi e massimi non validi (1-50, minimo ≤ massimo)' },
        { status: 400 }
      );
    }

    const statuses = include_pending ? ['confirmed', 'pending'] : ['confirmed'];
    const eligible = await db
      .prepare(
        `SELECT id, family_id, table_id FROM guests
         WHERE invitation_type = 'full' AND response_status = ANY(?)`
      )
      .all(statuses);

    if (!Array.isArray(eligible) || eligible.length === 0) {
      return NextResponse.json({ error: 'Nessun ospite da disporre' }, { status: 400 });
    }

    const guestTags = await db.prepare('SELECT guest_id, tag_id FROM guest_tags').all();
    const tagsByGuest = new Map<number, number[]>();
    for (const row of guestTags as any[]) {
      const list = tagsByGuest.get(row.guest_id) || [];
      list.push(row.tag_id);
      tagsByGuest.set(row.guest_id, list);
    }

    const layout = suggestTableLayout(eligible as any[], tagsByGuest, minSeats, maxSeats);
    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Error suggesting table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

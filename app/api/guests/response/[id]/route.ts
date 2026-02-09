import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ResponseStatus } from '@/lib/types';

// PUT /api/guests/response/[id] - Update guest response (public)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { response_status, menu_type, dietary_requirements } = body;

    if (!['confirmed', 'declined'].includes(response_status)) {
      return NextResponse.json(
        { error: 'response_status deve essere "confirmed" o "declined"' },
        { status: 400 }
      );
    }

    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    if (!guest) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 });
    }

    const responseDate = new Date().toISOString();
    // Set menu_type to 'adulto' by default if confirmed, otherwise keep existing or set to null
    const finalMenuType = response_status === 'confirmed' 
      ? (menu_type || 'adulto')
      : null;

    db.prepare(
      `UPDATE guests 
       SET response_status = ?, 
           response_date = ?,
           menu_type = ?,
           dietary_requirements = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(response_status, responseDate, finalMenuType, dietary_requirements || null, id);

    const updatedGuest = db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    const { id: guestId, ...guestData } = updatedGuest as any;
    return NextResponse.json({ guest: guestData });
  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { FamilyMemberResponse } from '@/lib/types';

// PUT /api/guests/family/response - Update multiple family members' responses (public)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { responses } = body as { responses: FamilyMemberResponse[] };

    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: 'Array di risposte richiesto' },
        { status: 400 }
      );
    }

    const responseDate = new Date().toISOString();
    const updatedGuests = [];

    for (const response of responses) {
      const { guest_id, response_status, menu_type, dietary_requirements } = response;

      if (!['confirmed', 'declined'].includes(response_status)) {
        continue; // Skip invalid responses
      }

      const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guest_id);
      if (!guest) {
        continue; // Skip if guest not found
      }

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
      ).run(
        response_status,
        responseDate,
        finalMenuType,
        dietary_requirements || null,
        guest_id
      );

      const updatedGuest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guest_id);
      updatedGuests.push(updatedGuest);
    }

    return NextResponse.json({ guests: updatedGuests });
  } catch (error) {
    console.error('Error updating family responses:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

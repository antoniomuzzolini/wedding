import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT /api/guests/[id] - Update a guest (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { name, surname, invitation_type, family_id, menu_type, adminKey } = body;

    // Simple admin check - REPLACE WITH PROPER AUTH IN PRODUCTION
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || !surname) {
      return NextResponse.json(
        { error: 'Nome e cognome sono obbligatori' },
        { status: 400 }
      );
    }

    // Check if guest exists
    const existingGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    if (!existingGuest) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 });
    }

    // Handle family_id update
    let finalFamilyId = null;
    if (family_id !== null && family_id !== undefined && family_id !== '') {
      const linkedGuest = await db.prepare('SELECT id, family_id FROM guests WHERE id = ?').get(family_id);
      if (!linkedGuest) {
        return NextResponse.json({ error: 'Ospite collegato non trovato' }, { status: 400 });
      }
      // Use the family_id of the linked guest, or use the linked guest's id
      finalFamilyId = (linkedGuest as any).family_id || family_id;
    }

    // Update guest
    await db.prepare(
      `UPDATE guests 
       SET name = ?, 
           surname = ?, 
           invitation_type = ?,
           family_id = ?,
           menu_type = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      name,
      surname,
      invitation_type || (existingGuest as any).invitation_type,
      finalFamilyId,
      menu_type || (existingGuest as any).menu_type || 'adulto',
      id
    );

    const updatedGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    return NextResponse.json({ guest: updatedGuest });
  } catch (error: any) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

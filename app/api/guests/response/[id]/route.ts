import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ResponseStatus } from '@/lib/types';
import { sendConfirmationRecapEmail } from '@/lib/utils/email';

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

    const guest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    if (!guest) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 });
    }

    const responseDate = new Date().toISOString();
    // menu_type non viene modificato dagli utenti - gestito solo dall'admin
    // Se declined, impostiamo menu_type a null, altrimenti manteniamo quello esistente
    const currentMenuType = (guest as any).menu_type;
    const finalMenuType = response_status === 'declined' ? null : currentMenuType;

    await db.prepare(
      `UPDATE guests 
       SET response_status = ?, 
           response_date = ?,
           menu_type = ?,
           dietary_requirements = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(response_status, responseDate, finalMenuType, dietary_requirements || null, id);

    const updatedGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
    const { id: guestId, ...guestData } = updatedGuest as any;

    // Send recap email to admin
    try {
      await sendConfirmationRecapEmail([{
        id: updatedGuest.id,
        name: updatedGuest.name,
        surname: updatedGuest.surname || '',
        response_status: updatedGuest.response_status,
        menu_type: updatedGuest.menu_type,
        dietary_requirements: updatedGuest.dietary_requirements,
        invitation_type: updatedGuest.invitation_type,
      }]);
    } catch (emailError) {
      // Log error but don't fail the request if email fails
      console.error('Error sending confirmation recap email:', emailError);
    }

    return NextResponse.json({ guest: guestData });
  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

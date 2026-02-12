import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { FamilyMemberResponse } from '@/lib/types';
import { sendConfirmationRecapEmail } from '@/lib/utils/email';

// PUT /api/guests/family/response - Update multiple family members' responses (public)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { responses, notification_email } = body as { 
      responses: FamilyMemberResponse[];
      notification_email?: string;
    };

    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: 'Array di risposte richiesto' },
        { status: 400 }
      );
    }

    const responseDate = new Date().toISOString();
    const updatedGuests = [];

    // Identify the group leader
    // The group leader is:
    // 1. The guest without family_id (if they are the main guest or single guest)
    // 2. The guest whose id matches someone else's family_id
    let groupLeaderId: number | null = null;
    
    // First, get all guests to check their family_id relationships
    const guestIds = responses.map(r => r.guest_id);
    const guestsData = await Promise.all(
      guestIds.map(id => db.prepare('SELECT id, family_id FROM guests WHERE id = ?').get(id))
    );
    
    // Find guests with family_id to identify the main guest
    const guestsWithFamilyId = guestsData.filter((g: any) => g && g.family_id);
    
    if (guestsWithFamilyId.length > 0) {
      // There are linked guests - the group leader is the one with id === family_id
      const mainGuestId = (guestsWithFamilyId[0] as any).family_id;
      if (guestIds.includes(mainGuestId)) {
        groupLeaderId = mainGuestId;
      }
    } else {
      // No linked guests - find the guest without family_id (single guest or main guest)
      const guestWithoutFamilyId = guestsData.find((g: any) => g && !g.family_id);
      if (guestWithoutFamilyId) {
        groupLeaderId = (guestWithoutFamilyId as any).id;
      }
    }
    
    // Fallback: if no group leader found, use the first guest (lowest id)
    if (!groupLeaderId && guestIds.length > 0) {
      groupLeaderId = Math.min(...guestIds);
    }

    for (const response of responses) {
      const { guest_id, response_status, menu_type, dietary_requirements } = response;

      if (!['confirmed', 'declined'].includes(response_status)) {
        continue; // Skip invalid responses
      }

      const guest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(guest_id);
      if (!guest) {
        continue; // Skip if guest not found
      }

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
      ).run(
        response_status,
        responseDate,
        finalMenuType,
        dietary_requirements || null,
        guest_id
      );

      const updatedGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(guest_id);
      updatedGuests.push(updatedGuest);
    }

    // Save notification email on the group leader if provided
    if (notification_email && notification_email.trim() && groupLeaderId) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(notification_email.trim())) {
        await db.prepare(
          `UPDATE guests 
           SET email = ?, 
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).run(notification_email.trim(), groupLeaderId);
      }
    }

    // Send recap email to admin
    try {
      await sendConfirmationRecapEmail(updatedGuests.map((g: any) => ({
        id: g.id,
        name: g.name,
        surname: g.surname || '',
        response_status: g.response_status,
        menu_type: g.menu_type,
        dietary_requirements: g.dietary_requirements,
        invitation_type: g.invitation_type,
      })));
    } catch (emailError) {
      // Log error but don't fail the request if email fails
      console.error('Error sending confirmation recap email:', emailError);
    }

    return NextResponse.json({ guests: updatedGuests });
  } catch (error) {
    console.error('Error updating family responses:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

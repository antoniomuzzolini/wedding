import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/guests/surname/[surname] - Get guest by surname (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surname: string }> }
) {
  try {
    const { surname: surnameParam } = await params;
    const surname = decodeURIComponent(surnameParam).trim();
    
    if (!surname) {
      return NextResponse.json({ error: 'Cognome richiesto' }, { status: 400 });
    }

    // Search for surname in the surname field (case-insensitive)
    const foundGuests = db
      .prepare(
        `SELECT * FROM guests 
         WHERE LOWER(surname) LIKE ? OR LOWER(surname) = ?
         ORDER BY surname, name LIMIT 10`
      )
      .all(`%${surname.toLowerCase()}%`, surname.toLowerCase());

    if (foundGuests.length === 0) {
      return NextResponse.json({ error: 'Ospite non trovato. Controlla il tuo cognome.' }, { status: 404 });
    }

    // Get the first guest found
    const guest = foundGuests[0] as any;
    
    // Find all family members (the main guest + all linked guests)
    let familyMembers: any[] = [];
    
    if (guest.family_id) {
      // This guest is linked to another guest - get all members of that family
      const mainGuestId = guest.family_id;
      const mainGuest = db.prepare('SELECT * FROM guests WHERE id = ?').get(mainGuestId);
      if (mainGuest) {
        familyMembers.push(mainGuest);
      }
      // Get all guests linked to the main guest
      const linkedGuests = db.prepare('SELECT * FROM guests WHERE family_id = ?').all(mainGuestId);
      familyMembers.push(...linkedGuests);
      // Remove duplicates
      familyMembers = familyMembers.filter((g, index, self) => 
        index === self.findIndex((m) => m.id === g.id)
      );
    } else {
      // This guest might be the main guest - check if others are linked to them
      const linkedGuests = db.prepare('SELECT * FROM guests WHERE family_id = ?').all(guest.id);
      if (linkedGuests.length > 0) {
        familyMembers.push(guest);
        familyMembers.push(...linkedGuests);
      } else {
        // Single guest
        familyMembers = [guest];
      }
    }
    
    return NextResponse.json({ 
      guest: guest,
      familyMembers: familyMembers.sort((a, b) => a.id - b.id)
    });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

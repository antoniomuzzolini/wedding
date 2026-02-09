import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/guests/search - Search guest by name and/or surname (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name')?.trim() || '';
    const surname = searchParams.get('surname')?.trim() || '';
    
    if (!name && !surname) {
      return NextResponse.json({ error: 'Nome o cognome richiesto' }, { status: 400 });
    }

    let query = 'SELECT * FROM guests WHERE 1=1';
    const params: any[] = [];

    if (name) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(name) = ?)';
      params.push(`%${name.toLowerCase()}%`, name.toLowerCase());
    }

    if (surname) {
      query += ' AND (LOWER(surname) LIKE ? OR LOWER(surname) = ?)';
      params.push(`%${surname.toLowerCase()}%`, surname.toLowerCase());
    }

    query += ' ORDER BY surname, name LIMIT 10';

    const foundGuests = await db.prepare(query).all(...params);

    if (foundGuests.length === 0) {
      return NextResponse.json({ error: 'Ospite non trovato. Controlla nome e cognome.' }, { status: 404 });
    }

    // Get the first guest found
    const guest = foundGuests[0] as any;
    
    // Find all family members (the main guest + all linked guests)
    let familyMembers: any[] = [];
    
    if (guest.family_id) {
      // This guest is linked to another guest - get all members of that family
      const mainGuestId = guest.family_id;
      const mainGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(mainGuestId);
      if (mainGuest) {
        familyMembers.push(mainGuest);
      }
      // Get all guests linked to the main guest
      const linkedGuests = await db.prepare('SELECT * FROM guests WHERE family_id = ?').all(mainGuestId);
      familyMembers.push(...linkedGuests);
      // Remove duplicates
      familyMembers = familyMembers.filter((g, index, self) => 
        index === self.findIndex((m) => m.id === g.id)
      );
    } else {
      // This guest might be the main guest - check if others are linked to them
      const linkedGuests = await db.prepare('SELECT * FROM guests WHERE family_id = ?').all(guest.id);
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

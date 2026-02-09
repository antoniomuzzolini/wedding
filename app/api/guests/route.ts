import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { GuestInput } from '@/lib/types';

// GET /api/guests - Get all guests (admin only)
export async function GET(request: NextRequest) {
  try {
    // In production, add proper authentication here
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');
    
    // Simple admin check - REPLACE WITH PROPER AUTH IN PRODUCTION
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const guests = db.prepare('SELECT * FROM guests ORDER BY surname, name, created_at DESC').all();
    return NextResponse.json({ guests });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST /api/guests - Add a new guest (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, surname, invitation_type, family_id, menu_type, adminKey } = body;

    // Simple admin check - REPLACE WITH PROPER AUTH IN PRODUCTION
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || !surname || !invitation_type || !['full', 'evening'].includes(invitation_type)) {
      return NextResponse.json(
        { error: 'Nome, cognome e tipo di invito (full o evening) sono obbligatori' },
        { status: 400 }
      );
    }

    // If linking to a family, verify the linked guest exists
    let finalFamilyId = null;
    if (family_id) {
      const linkedGuest = db.prepare('SELECT id, family_id FROM guests WHERE id = ?').get(family_id);
      if (!linkedGuest) {
        return NextResponse.json({ error: 'Ospite collegato non trovato' }, { status: 400 });
      }
      // Use the family_id of the linked guest, or create a new family group
      finalFamilyId = (linkedGuest as any).family_id || family_id;
    }

    const result = db
      .prepare('INSERT INTO guests (name, surname, invitation_type, family_id, menu_type) VALUES (?, ?, ?, ?, ?)')
      .run(name, surname, invitation_type, finalFamilyId, menu_type || 'adulto');

    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ guest }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

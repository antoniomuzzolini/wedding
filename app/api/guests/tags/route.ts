import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT /api/guests/tags - Add or remove a tag for a set of guests (admin only)
// Body: { guest_ids: number[], tag_id: number, action: 'add' | 'remove', adminKey }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { guest_ids, tag_id, action, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!Array.isArray(guest_ids) || guest_ids.length === 0 || !tag_id || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'guest_ids, tag_id e action (add/remove) sono obbligatori' },
        { status: 400 }
      );
    }

    const tag = await db.prepare('SELECT id FROM tags WHERE id = ?').get(tag_id);
    if (!tag) {
      return NextResponse.json({ error: 'Tag non trovato' }, { status: 404 });
    }

    for (const guestId of guest_ids) {
      if (action === 'add') {
        // .all() e non .run(): il wrapper aggiunge "RETURNING id" agli INSERT
        // eseguiti con .run(), ma guest_tags non ha una colonna id
        await db
          .prepare('INSERT INTO guest_tags (guest_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
          .all(guestId, tag_id);
      } else {
        await db.prepare('DELETE FROM guest_tags WHERE guest_id = ? AND tag_id = ?').run(guestId, tag_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating guest tags:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

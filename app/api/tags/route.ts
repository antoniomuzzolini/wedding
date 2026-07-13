import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/tags - Get all tags and guest-tag associations (admin only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const tags = await db.prepare('SELECT * FROM tags ORDER BY name').all();
    const guestTags = await db.prepare('SELECT guest_id, tag_id FROM guest_tags').all();
    return NextResponse.json({ tags, guest_tags: guestTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome del tag è obbligatorio' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id FROM tags WHERE name = ?').get(name.trim());
    if (existing) {
      return NextResponse.json({ error: 'Esiste già un tag con questo nome' }, { status: 400 });
    }

    const result = await db
      .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name.trim(), color || '#7c9070');

    const tag = await db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

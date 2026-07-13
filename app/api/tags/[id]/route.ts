import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// DELETE /api/tags/[id] - Delete a tag (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const tag = await db.prepare('SELECT id FROM tags WHERE id = ?').get(id);
    if (!tag) {
      return NextResponse.json({ error: 'Tag non trovato' }, { status: 404 });
    }

    // Le associazioni in guest_tags vengono rimosse dal vincolo ON DELETE CASCADE
    await db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

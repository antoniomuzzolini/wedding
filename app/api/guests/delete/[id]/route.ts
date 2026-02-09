import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// DELETE /api/guests/delete/[id] - Delete a guest (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');
    
    // Simple admin check - REPLACE WITH PROPER AUTH IN PRODUCTION
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const result = await db.prepare('DELETE FROM guests WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Ospite eliminato con successo' });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

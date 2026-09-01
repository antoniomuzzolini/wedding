import { NextRequest, NextResponse } from 'next/server';
import { listLayouts, saveCurrentLayoutAs } from '@/lib/table-layouts';

// GET /api/table-layouts - Elenca le configurazioni salvate (admin only)
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.nextUrl.searchParams.get('adminKey');
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const layouts = await listLayouts();
    return NextResponse.json({ layouts });
  } catch (error) {
    console.error('Error listing table layouts:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST /api/table-layouts - Salva la disposizione attuale (admin only)
// Body: { name, note?, adminKey }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, note, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome della configurazione è obbligatorio' }, { status: 400 });
    }

    const layout = await saveCurrentLayoutAs(
      name,
      typeof note === 'string' && note.trim() ? note.trim() : null
    );
    if (!layout) {
      return NextResponse.json(
        { error: 'Non c’è nessun tavolo da salvare' },
        { status: 400 }
      );
    }

    return NextResponse.json({ layout }, { status: 201 });
  } catch (error) {
    console.error('Error saving table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

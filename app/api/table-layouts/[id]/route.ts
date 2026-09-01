import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import {
  autoLayoutName,
  getLayoutSnapshot,
  restoreLayout,
  saveCurrentLayoutAs,
} from '@/lib/table-layouts';

// POST /api/table-layouts/[id] - Ripristina una configurazione salvata (admin only)
// Body: { adminKey, snapshot_current?: boolean }
// I tavoli attuali vengono sostituiti da quelli della configurazione.
// Ospiti, risposte e tag non vengono mai toccati.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { adminKey, snapshot_current } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const snapshot = await getLayoutSnapshot(id);
    if (!snapshot) {
      return NextResponse.json({ error: 'Configurazione non trovata' }, { status: 404 });
    }

    // Rete di sicurezza: la disposizione attuale viene salvata prima di essere sostituita
    if (snapshot_current !== false) {
      await saveCurrentLayoutAs(autoLayoutName(), 'Salvataggio automatico prima di un ripristino');
    }

    const warnings = await restoreLayout(snapshot);

    return NextResponse.json({ success: true, tables: snapshot.length, warnings });
  } catch (error) {
    console.error('Error restoring table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// PUT /api/table-layouts/[id] - Rinomina una configurazione (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { name, note, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome della configurazione è obbligatorio' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id FROM table_layouts WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Configurazione non trovata' }, { status: 404 });
    }

    await db
      .prepare('UPDATE table_layouts SET name = ?, note = ? WHERE id = ?')
      .run(name.trim(), typeof note === 'string' && note.trim() ? note.trim() : null, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// DELETE /api/table-layouts/[id] - Elimina una configurazione salvata (admin only)
// Cancella solo lo snapshot: i tavoli attuali restano come sono.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const adminKey = request.nextUrl.searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const existing = await db.prepare('SELECT id FROM table_layouts WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Configurazione non trovata' }, { status: 404 });
    }

    await db.prepare('DELETE FROM table_layouts WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

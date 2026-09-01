import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Guest } from '@/lib/types';
import { buildLayoutPdf, ExportData, ExportTable } from '@/lib/table-layout-pdf';
import { getLayoutSnapshot, LayoutSnapshotTable } from '@/lib/table-layouts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tables/export?adminKey=...&layout_id=<id>
// Scarica la disposizione come PDF. Senza layout_id esporta quella attuale,
// con layout_id esporta una configurazione salvata. Sola lettura: non
// modifica né tavoli né ospiti.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const guests = (await db
      .prepare('SELECT * FROM guests ORDER BY surname, name')
      .all()) as Guest[];
    const guestById = new Map(guests.map((g) => [g.id, g]));

    const layoutIdParam = searchParams.get('layout_id');
    let snapshot: LayoutSnapshotTable[];
    let title: string;
    let subtitle: string;

    if (layoutIdParam) {
      const layoutId = parseInt(layoutIdParam);
      const saved = await db
        .prepare('SELECT name, created_at FROM table_layouts WHERE id = ?')
        .get(layoutId);
      if (!saved) {
        return NextResponse.json({ error: 'Configurazione non trovata' }, { status: 404 });
      }
      const data = await getLayoutSnapshot(layoutId);
      if (!data) {
        return NextResponse.json({ error: 'Configurazione non trovata' }, { status: 404 });
      }
      snapshot = data;
      title = (saved as any).name;
      subtitle = `Configurazione salvata il ${formatDate((saved as any).created_at)}`;
    } else {
      const tables = await db
        .prepare('SELECT id, name, capacity FROM tables ORDER BY sort_order, id')
        .all();
      const seatedByTable = new Map<number, number[]>();
      for (const guest of guests) {
        if (guest.table_id == null) continue;
        const list = seatedByTable.get(guest.table_id) || [];
        list.push(guest.id);
        seatedByTable.set(guest.table_id, list);
      }
      snapshot = (tables as any[]).map((t) => ({
        name: t.name,
        capacity: t.capacity,
        guest_ids: seatedByTable.get(t.id) || [],
      }));
      title = 'Disposizione tavoli';
      subtitle = `Situazione attuale al ${formatDate(new Date())}`;
    }

    if (snapshot.length === 0) {
      return NextResponse.json({ error: 'Non c’è nessun tavolo da esportare' }, { status: 400 });
    }

    const seatedIds = new Set<number>();
    const exportTables: ExportTable[] = snapshot.map((table) => {
      const found: Guest[] = [];
      let missing = 0;
      for (const id of table.guest_ids) {
        const guest = guestById.get(id);
        if (guest) {
          found.push(guest);
          seatedIds.add(id);
        } else {
          missing += 1;
        }
      }
      return { name: table.name, capacity: table.capacity, guests: found, missing };
    });

    // Da assegnare: confermati a cerimonia completa che in questa disposizione non siedono
    const unassigned = guests.filter(
      (g) =>
        g.invitation_type === 'full' && g.response_status === 'confirmed' && !seatedIds.has(g.id)
    );
    const pendingCount = guests.filter(
      (g) => g.invitation_type === 'full' && g.response_status === 'pending' && !seatedIds.has(g.id)
    ).length;

    const data: ExportData = { title, subtitle, tables: exportTables, unassigned, pendingCount };
    const pdf = await buildLayoutPdf(data);

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName(title)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting table layout:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
}

function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // toglie i segni diacritici
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const day = new Date().toISOString().split('T')[0];
  return `${slug || 'disposizione-tavoli'}-${day}.pdf`;
}

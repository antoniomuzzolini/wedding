// Salvataggio e ripristino di configurazioni dei tavoli.
//
// Uno snapshot contiene solo ciò che definisce una disposizione:
// i tavoli (nome, capienza, ordine) e chi siede a ciascuno.
// Ospiti, risposte, menu e tag NON fanno parte dello snapshot e non
// vengono mai toccati: sono dati indipendenti dalla disposizione.
//
// Il ripristino è volutamente tollerante: uno snapshot vecchio può
// riferirsi a invitati nel frattempo cancellati, o a bambini diventati
// adulti (che ora occupano un posto). In quei casi non si blocca, si
// ripristina il possibile e si restituiscono degli avvisi.

import db from './db';
import { seatsForGuest } from './seating';

export interface LayoutSnapshotTable {
  name: string;
  capacity: number;
  guest_ids: number[];
}

export interface SavedLayoutSummary {
  id: number;
  name: string;
  note: string | null;
  created_at: string;
  tables_count: number;
  guests_count: number;
}

export interface RestoreWarnings {
  missingGuests: number;
  overCapacityTables: string[];
}

/** Neon restituisce jsonb già deserializzato, ma non in tutte le versioni. */
function parseSnapshot(data: unknown): LayoutSnapshotTable[] {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  return Array.isArray(parsed) ? (parsed as LayoutSnapshotTable[]) : [];
}

export function isValidSnapshot(tables: unknown): tables is LayoutSnapshotTable[] {
  return (
    Array.isArray(tables) &&
    tables.every(
      (t: any) =>
        t &&
        typeof t.name === 'string' &&
        Number.isFinite(t.capacity) &&
        Array.isArray(t.guest_ids) &&
        t.guest_ids.every((id: any) => Number.isInteger(id))
    )
  );
}

/** Fotografa la disposizione attuale: tavoli in ordine e ospiti seduti. */
export async function captureCurrentLayout(): Promise<LayoutSnapshotTable[]> {
  const tables = await db.prepare('SELECT id, name, capacity FROM tables ORDER BY sort_order, id').all();
  const seated = await db.prepare('SELECT id, table_id FROM guests WHERE table_id IS NOT NULL').all();

  const guestsByTable = new Map<number, number[]>();
  for (const guest of seated as any[]) {
    const list = guestsByTable.get(guest.table_id) || [];
    list.push(guest.id);
    guestsByTable.set(guest.table_id, list);
  }

  return (tables as any[]).map((t) => ({
    name: t.name,
    capacity: t.capacity,
    guest_ids: guestsByTable.get(t.id) || [],
  }));
}

/** Salva la disposizione attuale come configurazione. Restituisce null se non ci sono tavoli. */
export async function saveCurrentLayoutAs(
  name: string,
  note: string | null = null
): Promise<SavedLayoutSummary | null> {
  const snapshot = await captureCurrentLayout();
  if (snapshot.length === 0) return null;

  const result = await db
    .prepare('INSERT INTO table_layouts (name, note, data) VALUES (?, ?, ?::jsonb)')
    .run(name.trim(), note, JSON.stringify(snapshot));

  // created_at arriva dal database: l'orologio del server applicativo può differire
  const row = await db
    .prepare('SELECT id, name, note, created_at FROM table_layouts WHERE id = ?')
    .get(result.lastInsertRowid);

  return {
    id: (row as any).id,
    name: (row as any).name,
    note: (row as any).note,
    created_at: (row as any).created_at,
    tables_count: snapshot.length,
    guests_count: snapshot.reduce((sum, t) => sum + t.guest_ids.length, 0),
  };
}

/** Nome per gli snapshot automatici presi prima di una sostituzione dei tavoli. */
export function autoLayoutName(date = new Date()): string {
  const stamp = date.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
  return `Auto — ${stamp}`;
}

export async function listLayouts(): Promise<SavedLayoutSummary[]> {
  const rows = await db
    .prepare('SELECT id, name, note, data, created_at FROM table_layouts ORDER BY created_at DESC, id DESC')
    .all();

  return (rows as any[]).map((row) => {
    const snapshot = parseSnapshot(row.data);
    return {
      id: row.id,
      name: row.name,
      note: row.note,
      created_at: row.created_at,
      tables_count: snapshot.length,
      guests_count: snapshot.reduce((sum, t) => sum + (t.guest_ids?.length || 0), 0),
    };
  });
}

export async function getLayoutSnapshot(id: number): Promise<LayoutSnapshotTable[] | null> {
  const row = await db.prepare('SELECT data FROM table_layouts WHERE id = ?').get(id);
  if (!row) return null;
  return parseSnapshot((row as any).data);
}

/**
 * Sostituisce i tavoli attuali con quelli dello snapshot e riassegna gli ospiti.
 *
 * Gli ospiti che non esistono più vengono ignorati; quelli aggiunti dopo lo
 * snapshot restano senza tavolo. Se un tavolo risulta ora in sovrannumero
 * (es. un bambino diventato adulto) viene ripristinato comunque e segnalato.
 */
export async function restoreLayout(snapshot: LayoutSnapshotTable[]): Promise<RestoreWarnings> {
  const allGuests = await db.prepare('SELECT id, menu_type FROM guests').all();
  const seatsByGuest = new Map<number, number>(
    (allGuests as any[]).map((g) => [g.id, seatsForGuest(g)])
  );

  const warnings: RestoreWarnings = { missingGuests: 0, overCapacityTables: [] };

  await db.prepare('UPDATE guests SET table_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE table_id IS NOT NULL').run();
  await db.prepare('DELETE FROM tables').run();

  let sortOrder = 0;
  for (const table of snapshot) {
    sortOrder += 1;
    const existingIds = table.guest_ids.filter((id) => seatsByGuest.has(id));
    warnings.missingGuests += table.guest_ids.length - existingIds.length;

    const seats = existingIds.reduce((sum, id) => sum + (seatsByGuest.get(id) ?? 1), 0);
    if (seats > table.capacity) {
      warnings.overCapacityTables.push(`${table.name} (${seats}/${table.capacity})`);
    }

    const result = await db
      .prepare('INSERT INTO tables (name, capacity, sort_order) VALUES (?, ?, ?)')
      .run(table.name, table.capacity, sortOrder);

    const tableId = result.lastInsertRowid;
    if (!tableId) throw new Error('Errore nella creazione dei tavoli durante il ripristino');

    for (const guestId of existingIds) {
      await db
        .prepare('UPDATE guests SET table_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(tableId, guestId);
    }
  }

  return warnings;
}

// Generazione del PDF con la disposizione dei tavoli.
//
// A differenza dell'export delle partecipazioni (che è un documento grafico e
// va reso con un browser headless), qui il contenuto è testo: lo scriviamo
// direttamente con pdf-lib, senza puppeteer né chromium.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Guest } from './types';
import { countSeats } from './seating';

export interface ExportTable {
  name: string;
  capacity: number;
  guests: Guest[];
  missing: number; // ospiti dello snapshot che non esistono più
}

export interface ExportData {
  title: string;
  subtitle: string;
  tables: ExportTable[];
  unassigned: Guest[];
  pendingCount: number;
}

const PAGE_WIDTH = 595.28; // A4 verticale in punti
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SAGE = rgb(0.27, 0.55, 0.44);
const INK = rgb(0.15, 0.15, 0.15);
const MUTED = rgb(0.45, 0.45, 0.45);

/**
 * I font standard di pdf-lib accettano solo WinAnsi: le lettere accentate
 * italiane ci sono, ma un carattere fuori tabella (emoji, ideogrammi) farebbe
 * fallire l'intera generazione. Meglio sostituirlo.
 */
function winAnsi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function guestName(guest: Guest): string {
  return `${guest.name} ${guest.surname || ''}`.trim();
}

/** Spezza il testo in righe che stanno dentro maxWidth. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = winAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/** Raggruppa gli ospiti di un tavolo per famiglia, così restano vicini nell'elenco. */
function groupByFamily(guests: Guest[]): Guest[][] {
  const groups = new Map<number, Guest[]>();
  for (const guest of guests) {
    const key = guest.family_id ?? guest.id;
    const list = groups.get(key) || [];
    list.push(guest);
    groups.set(key, list);
  }
  return Array.from(groups.values()).sort((a, b) =>
    (a[0].surname || '').localeCompare(b[0].surname || '') || a[0].name.localeCompare(b[0].name)
  );
}

export async function buildLayoutPdf(data: ExportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  /** Riserva spazio verticale, andando a capo pagina se non basta. */
  const need = (space: number) => {
    if (y - space < MARGIN) newPage();
  };

  const writeLine = (
    text: string,
    { font = regular, size = 10, color = INK, indent = 0, gap = 4 } = {}
  ) => {
    for (const line of wrap(text, font, size, CONTENT_WIDTH - indent)) {
      need(size + gap);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color });
      y -= size + gap;
    }
  };

  // ---- Intestazione ----
  writeLine(data.title, { font: bold, size: 20, color: SAGE, gap: 6 });
  writeLine(data.subtitle, { font: italic, size: 10, color: MUTED, gap: 10 });

  const seated = data.tables.reduce((sum, t) => sum + t.guests.length, 0);
  const seats = data.tables.reduce((sum, t) => sum + countSeats(t.guests), 0);
  const capacity = data.tables.reduce((sum, t) => sum + t.capacity, 0);
  writeLine(
    `${data.tables.length} ${data.tables.length === 1 ? 'tavolo' : 'tavoli'} - ` +
      `${seated} ${seated === 1 ? 'persona seduta' : 'persone sedute'} - ` +
      `${seats}/${capacity} posti occupati`,
    { size: 10, color: MUTED, gap: 16 }
  );

  // ---- Tavoli ----
  for (const table of data.tables) {
    const occupied = countSeats(table.guests);
    const kids = table.guests.length - occupied;

    // titolo del tavolo e prima riga di contenuto non si separano tra due pagine
    need(46);

    page.drawLine({
      start: { x: MARGIN, y: y - 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 2 },
      thickness: 0.75,
      color: SAGE,
    });
    y -= 12;

    const kidsLabel = kids > 0 ? `, +${kids} ${kids === 1 ? 'bimbo' : 'bimbi'}` : '';
    writeLine(`${table.name}   ${occupied}/${table.capacity}${kidsLabel}`, {
      font: bold,
      size: 12,
      color: SAGE,
      gap: 6,
    });

    if (table.guests.length === 0) {
      writeLine('Tavolo vuoto', { font: italic, size: 10, color: MUTED, gap: 12 });
    } else {
      for (const family of groupByFamily(table.guests)) {
        const names = family
          .map((g) => {
            const suffix =
              g.menu_type === 'bambino' ? ' (bimbo)' : g.menu_type === 'neonato' ? ' (neonato)' : '';
            const pending = g.response_status === 'pending' ? ' (?)' : '';
            return `${guestName(g)}${suffix}${pending}`;
          })
          .join(', ');
        writeLine(`- ${names}`, { size: 10, indent: 8, gap: 3 });
      }
      y -= 6;
    }

    if (table.missing > 0) {
      writeLine(
        `${table.missing} ${table.missing === 1 ? 'ospite non esiste' : 'ospiti non esistono'} più nella lista`,
        { font: italic, size: 9, color: MUTED, indent: 8, gap: 10 }
      );
    }
  }

  // ---- Da assegnare ----
  if (data.unassigned.length > 0 || data.pendingCount > 0) {
    need(50);
    y -= 8;
    writeLine(`Da assegnare (${data.unassigned.length})`, {
      font: bold,
      size: 12,
      color: INK,
      gap: 6,
    });
    if (data.unassigned.length > 0) {
      for (const family of groupByFamily(data.unassigned)) {
        writeLine(`- ${family.map(guestName).join(', ')}`, { size: 10, indent: 8, gap: 3 });
      }
    } else {
      writeLine('Nessuno', { font: italic, size: 10, color: MUTED, gap: 3 });
    }
    if (data.pendingCount > 0) {
      y -= 6;
      writeLine(
        `Più ${data.pendingCount} ${data.pendingCount === 1 ? 'invitato in attesa' : 'invitati in attesa'} di risposta, non conteggiati qui.`,
        { font: italic, size: 9, color: MUTED, gap: 4 }
      );
    }
  }

  // ---- Numerazione pagine ----
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    const label = `${index + 1} / ${pages.length}`;
    const size = 8;
    p.drawText(label, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, size),
      y: MARGIN / 2,
      size,
      font: regular,
      color: MUTED,
    });
  });

  return pdf.save();
}

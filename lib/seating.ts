// Algoritmo di proposta disposizione tavoli.
// Funzione pura: non tocca il database, restituisce solo una proposta
// che l'admin può rivedere e salvare (o scartare).
//
// Vincoli rigidi:
//  - una famiglia non viene mai divisa tra tavoli
//  - la capienza di un tavolo non viene mai superata
// Obiettivi (soft):
//  - massimizzare i tag condivisi tra le famiglie sedute allo stesso tavolo
//  - bilanciare il riempimento dei tavoli

export interface SeatingGuestInput {
  id: number;
  family_id: number | null;
  table_id: number | null;
}

export interface SeatingTableInput {
  id: number;
  capacity: number;
}

export interface SeatingProposal {
  // guest_id -> table_id proposto (solo per gli ospiti che l'algoritmo assegna)
  assignments: { guest_id: number; table_id: number }[];
  // famiglie che non è stato possibile piazzare (nessun tavolo con posti sufficienti)
  unplacedFamilies: { memberIds: number[]; size: number }[];
}

interface Family {
  key: number;
  memberIds: number[];
  size: number;
  tags: Set<number>;
}

interface TableState {
  id: number;
  capacity: number;
  occupied: number;
  // conteggio tag presenti al tavolo (dai membri già seduti o assegnati)
  tagCounts: Map<number, number>;
  families: Family[];
}

const AFFINITY_WEIGHT = 3;
const BALANCE_WEIGHT = 1;

function familyKey(guest: SeatingGuestInput): number {
  return guest.family_id ?? guest.id;
}

function buildFamilies(
  guests: SeatingGuestInput[],
  tagsByGuest: Map<number, number[]>
): Map<number, Family> {
  const families = new Map<number, Family>();
  for (const guest of guests) {
    const key = familyKey(guest);
    let family = families.get(key);
    if (!family) {
      family = { key, memberIds: [], size: 0, tags: new Set() };
      families.set(key, family);
    }
    family.memberIds.push(guest.id);
    family.size += 1;
    for (const tagId of tagsByGuest.get(guest.id) || []) {
      family.tags.add(tagId);
    }
  }
  return families;
}

function affinityScore(table: TableState, family: Family): number {
  if (table.occupied === 0) return 0;
  let shared = 0;
  family.tags.forEach((tagId) => {
    shared += table.tagCounts.get(tagId) || 0;
  });
  // normalizzato sui posti occupati, così un tavolo grande non vince solo perché ha più gente
  return shared / table.occupied;
}

function balanceScore(table: TableState, familySize: number): number {
  // preferisce i tavoli meno pieni (dopo l'inserimento della famiglia)
  return -((table.occupied + familySize) / table.capacity);
}

function scoreFor(table: TableState, family: Family): number {
  return AFFINITY_WEIGHT * affinityScore(table, family) + BALANCE_WEIGHT * balanceScore(table, family.size);
}

function placeFamily(table: TableState, family: Family) {
  table.occupied += family.size;
  table.families.push(family);
  family.tags.forEach((tagId) => {
    table.tagCounts.set(tagId, (table.tagCounts.get(tagId) || 0) + family.size);
  });
}

function removeFamily(table: TableState, family: Family) {
  table.occupied -= family.size;
  table.families = table.families.filter((f) => f.key !== family.key);
  family.tags.forEach((tagId) => {
    const next = (table.tagCounts.get(tagId) || 0) - family.size;
    if (next > 0) {
      table.tagCounts.set(tagId, next);
    } else {
      table.tagCounts.delete(tagId);
    }
  });
}

function totalScore(tables: TableState[]): number {
  let score = 0;
  for (const table of tables) {
    for (const family of table.families) {
      // affinità della famiglia con il resto del tavolo (escludendo se stessa)
      let shared = 0;
      family.tags.forEach((tagId) => {
        shared += (table.tagCounts.get(tagId) || 0) - family.size;
      });
      const others = table.occupied - family.size;
      if (others > 0) {
        score += AFFINITY_WEIGHT * (shared / others);
      }
    }
    // penalità per squilibrio di riempimento
    score -= BALANCE_WEIGHT * Math.abs(table.occupied / table.capacity - 0.85);
  }
  return score;
}

/**
 * Calcola una proposta di disposizione.
 *
 * @param eligibleGuests ospiti da considerare (già filtrati: es. full + confermati)
 * @param tagsByGuest    mappa guest_id -> tag ids
 * @param tablesInput    tavoli disponibili con capienza
 * @param lockedGuests   ospiti già assegnati da NON spostare (il loro tavolo resta;
 *                       contribuiscono a capienza e affinità). Vuoto in modalità "ricalcola tutto".
 */
export function computeSeatingProposal(
  eligibleGuests: SeatingGuestInput[],
  tagsByGuest: Map<number, number[]>,
  tablesInput: SeatingTableInput[],
  lockedGuests: SeatingGuestInput[]
): SeatingProposal {
  const tables: TableState[] = tablesInput.map((t) => ({
    id: t.id,
    capacity: t.capacity,
    occupied: 0,
    tagCounts: new Map(),
    families: [],
  }));
  const tableById = new Map(tables.map((t) => [t.id, t]));

  // Le famiglie bloccate occupano i loro posti e contribuiscono ai tag del tavolo
  const lockedFamilies = buildFamilies(lockedGuests, tagsByGuest);
  const lockedTableByFamilyKey = new Map<number, number>();
  lockedFamilies.forEach((family) => {
    // i membri bloccati di una famiglia stanno per costruzione sullo stesso tavolo
    const firstGuest = lockedGuests.find((g) => familyKey(g) === family.key);
    const table = firstGuest?.table_id != null ? tableById.get(firstGuest.table_id) : undefined;
    if (table) {
      placeFamily(table, family);
      lockedTableByFamilyKey.set(family.key, table.id);
    }
  });

  // Famiglie da piazzare: le più grandi prima (hanno meno tavoli candidati)
  const toPlace = Array.from(buildFamilies(eligibleGuests, tagsByGuest).values()).sort(
    (a, b) => b.size - a.size || b.tags.size - a.tags.size
  );

  const placed: Family[] = [];
  const unplaced: Family[] = [];
  const stuckWithFamily: Family[] = [];

  for (const family of toPlace) {
    // Se parte della famiglia è già seduta (bloccata), i membri liberi vanno
    // obbligatoriamente allo stesso tavolo: una famiglia non si divide mai.
    const lockedTableId = lockedTableByFamilyKey.get(family.key);
    if (lockedTableId != null) {
      const table = tableById.get(lockedTableId);
      if (table && table.capacity - table.occupied >= family.size) {
        placeFamily(table, family);
        // membri vincolati al tavolo della famiglia: esclusi dalla passata di scambi
        stuckWithFamily.push(family);
      } else {
        unplaced.push(family);
      }
      continue;
    }

    let best: TableState | null = null;
    let bestScore = -Infinity;
    for (const table of tables) {
      if (table.capacity - table.occupied < family.size) continue;
      const score = scoreFor(table, family);
      if (score > bestScore) {
        bestScore = score;
        best = table;
      }
    }
    if (best) {
      placeFamily(best, family);
      placed.push(family);
    } else {
      unplaced.push(family);
    }
  }

  // Passata migliorativa: prova a spostare o scambiare famiglie (solo quelle non bloccate)
  const movable = new Set(placed.map((f) => f.key));
  for (let iteration = 0; iteration < 30; iteration++) {
    let improved = false;
    const current = totalScore(tables);

    for (const table of tables) {
      for (const family of [...table.families]) {
        if (!movable.has(family.key)) continue;

        // prova lo spostamento su un altro tavolo con spazio
        for (const other of tables) {
          if (other === table) continue;
          if (other.capacity - other.occupied < family.size) continue;
          removeFamily(table, family);
          placeFamily(other, family);
          if (totalScore(tables) > current + 1e-9) {
            improved = true;
            break;
          }
          removeFamily(other, family);
          placeFamily(table, family);
        }
        if (improved) break;

        // prova lo scambio con una famiglia di un altro tavolo
        for (const other of tables) {
          if (other === table) continue;
          for (const otherFamily of [...other.families]) {
            if (!movable.has(otherFamily.key)) continue;
            const fitsHere = table.capacity - table.occupied + family.size >= otherFamily.size;
            const fitsThere = other.capacity - other.occupied + otherFamily.size >= family.size;
            if (!fitsHere || !fitsThere) continue;
            removeFamily(table, family);
            removeFamily(other, otherFamily);
            placeFamily(table, otherFamily);
            placeFamily(other, family);
            if (totalScore(tables) > current + 1e-9) {
              improved = true;
              break;
            }
            removeFamily(table, otherFamily);
            removeFamily(other, family);
            placeFamily(table, family);
            placeFamily(other, otherFamily);
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }

    if (!improved) break;
  }

  const proposedFamilyKeys = new Set([
    ...placed.map((f) => f.key),
    ...stuckWithFamily.map((f) => f.key),
  ]);
  const lockedGuestIds = new Set(lockedGuests.map((g) => g.id));

  const assignments: SeatingProposal['assignments'] = [];
  for (const table of tables) {
    for (const family of table.families) {
      if (!proposedFamilyKeys.has(family.key)) continue;
      for (const guestId of family.memberIds) {
        if (lockedGuestIds.has(guestId)) continue;
        assignments.push({ guest_id: guestId, table_id: table.id });
      }
    }
  }

  return {
    assignments,
    unplacedFamilies: unplaced.map((f) => ({ memberIds: f.memberIds, size: f.size })),
  };
}

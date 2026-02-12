/**
 * Constants used across the wedding website
 */

export const WEDDING_CONSTANTS = {
  COUPLE_NAMES: 'Francesca e Antonio',
  WEDDING_DATE: 'domenica 13 settembre 2026',
  VENUE_NAME: 'Villa Caiselli',
  VENUE_ADDRESS: 'via della ferrovia 8, Pavia di Udine',
  FULL_CEREMONY_TIME: '12',
  EVENING_TIME: '20',
} as const

export const INVITATION_MESSAGES = {
  FULL_CEREMONY: {
    SINGLE: 'Siamo felici di averti con noi in questo giorno speciale! Ti aspettiamo alle ore 12 per celebrare e festeggiare assieme questo grande giorno. Seguirà in villa il ricevimento con il pranzo.',
    MULTIPLE: 'Siamo felici di avervi con noi in questo giorno speciale! Vi aspettiamo alle ore 12 per celebrare e festeggiare assieme questo grande giorno. Seguirà in villa il ricevimento con il pranzo.',
    FAMILY_CONFIRMATION: 'Vi chiediamo di confermare la presenza per tutti i membri della famiglia.',
  },
  EVENING: {
    SINGLE: 'Siamo felici di averti con noi in questo giorno speciale! Ti aspettiamo per festeggiare con te dalle ore 20.00 per il brindisi con taglio della torta.',
    MULTIPLE: 'Siamo felici di avervi con noi in questo giorno speciale! Vi aspettiamo per festeggiare con voi dalle ore 20.00 per il brindisi con taglio della torta.',
    FAMILY_CONFIRMATION: 'Vi chiediamo di confermare la presenza per tutti i membri della famiglia.',
  },
} as const

export const PARTICIPATION_MESSAGES = {
  FULL_CEREMONY: {
    SINGLE: 'Ti aspettano alle ore 12 per celebrare e festeggiare assieme questo grande giorno.',
    MULTIPLE: 'Vi aspettano alle ore 12 per celebrare e festeggiare assieme questo grande giorno.',
    FOLLOW_UP: 'Seguirà sempre in villa il ricevimento con il pranzo.',
  },
  EVENING: {
    SINGLE: 'Ti aspettano per festeggiare con te dalle ore 20.00 per il brindisi con taglio della torta.',
    MULTIPLE: 'Vi aspettano per festeggiare con voi dalle ore 20.00 per il brindisi con taglio della torta.',
  },
  QR_CODE: {
    SINGLE: 'Scansiona il qr code oppure contattaci per confermare la tua presenza',
    MULTIPLE: 'Scansionate il qr code oppure contattateci per confermare la vostra presenza',
  },
} as const

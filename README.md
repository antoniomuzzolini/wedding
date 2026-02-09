# Wedding Website

Un bellissimo sito web per matrimonio con sistema di gestione degli ospiti, costruito con Next.js, React e PostgreSQL (Neon DB).

## Caratteristiche

### Frontend
- **Pagina Benvenuto**: Pagina principale con save the date
- **Pagina Noi**: Storia della coppia con galleria fotografica organizzata per sezioni
- **Conferma Presenza**: Pagina per gli ospiti per confermare la loro presenza (RSVP)
- **Contatti**: Informazioni di contatto e mappa della location

### Backend/Admin
- **Sistema di gestione ospiti**: Pannello admin completo per gestire gli ospiti
- **Tipi di invito**: Supporto per cerimonia completa o solo serata
- **Gestione famiglie**: Possibilità di collegare ospiti in gruppi familiari
- **Tracciamento risposte**: Monitora le risposte degli ospiti (confermato/rifiutato/in attesa)
- **Gestione menù**: Assegna tipo di menù (adulto, bambino, neonato) per ogni ospite
- **QR Code**: Genera QR code per ogni gruppo familiare per accesso diretto alla conferma
- **Stampa partecipazioni**: Genera partecipazioni eleganti pronte per la stampa con QR code

## Tecnologie Utilizzate

- **Next.js 16**: Framework React con App Router
- **React 18**: Libreria UI
- **TypeScript**: Tipizzazione statica
- **Tailwind CSS**: Styling utility-first
- **PostgreSQL (Neon DB)**: Database serverless
- **@neondatabase/serverless**: Driver PostgreSQL per edge runtime
- **react-qr-code**: Generazione QR code

## Requisiti

- Node.js >= 20.9.0
- npm o yarn
- Account Vercel (per deployment)
- Account Neon (creato automaticamente tramite integrazione Vercel)

## Installazione Locale

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd wedding
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   - Copia `.env.example` in `.env.local`
   - Configura le seguenti variabili:
     ```env
     ADMIN_KEY=la-tua-password-sicura-qui
     DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
     ```

4. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```

5. **Apri il browser**
   - Visita http://localhost:3000
   - Accedi al pannello admin su http://localhost:3000/admin

## Database

Il progetto utilizza **PostgreSQL** tramite **Neon DB** (database serverless).

### Schema Database

- **Tabella `guests`**: Contiene tutti gli ospiti con informazioni su nome, cognome, tipo di invito, stato risposta, menù, ecc.
- **Tabella `admin_users`**: Gestisce gli utenti admin (creata automaticamente)

### Inizializzazione Automatica

Il database viene inizializzato automaticamente al primo avvio dell'applicazione. Se preferisci inizializzarlo manualmente, puoi eseguire lo script SQL in `scripts/init-neon-schema.sql` dal Neon SQL Editor.

## Deployment su Vercel + Neon

Il progetto è configurato per essere deployato su Vercel con Neon DB come database.

### Guida Completa

Consulta `DEPLOYMENT.md` per una guida dettagliata passo-passo sul deployment.

### Processo Rapido

1. **Prepara il repository Git**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Crea progetto su Vercel**
   - Vai su https://vercel.com
   - Importa il repository

3. **Aggiungi integrazione Neon**
   - Nel progetto Vercel, vai su "Integrations" o "Storage"
   - Aggiungi l'integrazione "Neon Postgres"
   - Crea il database direttamente da lì

4. **Configura variabili d'ambiente**
   - Aggiungi `ADMIN_KEY` nelle Environment Variables
   - `DATABASE_URL` viene aggiunta automaticamente dall'integrazione Neon

5. **Deploy**
   - Clicca "Deploy" e attendi il completamento

## Struttura del Progetto

```
wedding/
├── app/                    # Next.js App Router
│   ├── admin/             # Pannello admin
│   ├── api/               # API routes
│   ├── confirm/           # Pagina conferma presenza
│   ├── contacts/          # Pagina contatti
│   ├── us/                # Pagina "Noi"
│   └── page.tsx           # Pagina principale
├── components/            # Componenti React riutilizzabili
├── lib/                   # Utilities e configurazione
│   ├── db.ts             # Configurazione database PostgreSQL
│   └── types.ts          # TypeScript types
├── public/               # File statici
│   └── images/           # Immagini (background, gallery, foto)
├── scripts/              # Script di utilità
└── DEPLOYMENT.md         # Guida al deployment
```

## Personalizzazione

### Modificare Contenuti

- **Pagina Benvenuto**: `app/page.tsx`
- **Storia della coppia**: `app/us/page.tsx`
- **Informazioni contatti**: `app/contacts/page.tsx`

### Modificare Stili

- **Colori**: `tailwind.config.ts` (sezione `wedding`)
- **Font**: Configurato in `app/layout.tsx` (Playfair Display)
- **Background**: Immagine in `public/images/background.jpg`

### Aggiungere Immagini

- **Galleria**: Aggiungi immagini in `public/images/gallery/[sezione]/`
- **Foto coppia**: `public/images/francy.jpg` e `public/images/ando.jpg`
- **Background**: `public/images/background.jpg`

## Configurazione Admin

### Accesso Admin Panel

- URL: `/admin`
- Password: Configurata nella variabile d'ambiente `ADMIN_KEY`

### Funzionalità Admin

- **Aggiungi ospiti**: Nome, cognome, tipo invito, collegamento famiglia
- **Modifica ospiti**: Modifica informazioni e collegamenti familiari
- **Elimina ospiti**: Rimuovi ospiti dal database
- **Visualizza statistiche**: Conta confermati, rifiutati, in attesa
- **Genera QR code**: Per ogni gruppo familiare
- **Stampa partecipazioni**: Genera partecipazioni eleganti con QR code

## Sicurezza

⚠️ **IMPORTANTE**: Prima di deployare in produzione:

1. Cambia `ADMIN_KEY` con una password forte e sicura
2. Considera l'implementazione di un sistema di autenticazione più robusto (JWT, sessioni)
3. Aggiungi rate limiting per le API endpoints
4. Configura HTTPS (gestito automaticamente da Vercel)

## Script Disponibili

```bash
# Sviluppo
npm run dev          # Avvia server di sviluppo

# Build
npm run build        # Crea build di produzione
npm run start        # Avvia server di produzione

# Linting
npm run lint         # Esegue ESLint
```

## Note Importanti

- Il database viene inizializzato automaticamente al primo avvio
- Le immagini vengono servite da `public/images/`
- Il background è configurato in `app/layout.tsx`
- I QR code vengono generati dinamicamente per ogni gruppo familiare
- Le partecipazioni stampabili sono ottimizzate per stampa orizzontale

## Supporto

Per problemi o domande:
- Consulta `DEPLOYMENT.md` per problemi di deployment
- Verifica i log di Vercel per errori di runtime
- Controlla i log del database su Neon Console

## Licenza

Progetto privato

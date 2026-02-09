# Wedding Website

A beautiful wedding website with guest management system.

## Features

- **Frontend Pages:**
  - Welcome page with save the date
  - Us page with couple's story
  - Confirm Attendance page for guests to RSVP
  - Contacts page with contact information

- **Backend/Admin:**
  - Guest management system
  - Add guests with different invitation types (full ceremony or evening only)
  - Track guest responses (confirmed/declined/pending)
  - View statistics and guest list

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Admin Panel

Access the admin panel at `/admin` to manage guests.

**Default admin credentials:**
- Admin Key: `admin123`

⚠️ **IMPORTANT:** Change the admin authentication in production! The current implementation uses a simple key check and should be replaced with proper authentication (JWT tokens, session management, etc.).

## Database

The application uses SQLite database (`wedding.db`) which is automatically created on first run.

## Customization

1. Update the placeholder text in:
   - `app/page.tsx` - Welcome page content
   - `app/us/page.tsx` - Couple's story
   - `app/contacts/page.tsx` - Contact information

2. Modify colors in `tailwind.config.ts` if needed

3. Update the admin authentication system for production use

## Production Deployment

Before deploying to production:

1. Replace the simple admin authentication with proper authentication (JWT, sessions, etc.)
2. Use environment variables for sensitive data
3. Consider using PostgreSQL instead of SQLite for better scalability
4. Add proper password hashing (bcrypt) for admin users
5. Set up proper error handling and logging
6. Add rate limiting for API endpoints

## License

Private project

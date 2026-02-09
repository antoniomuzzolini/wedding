import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/auth - Authenticate admin (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password richiesta' }, { status: 400 });
    }

    // Check against environment variable
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey) {
      console.error('ADMIN_KEY not set in environment variables');
      return NextResponse.json({ error: 'Configurazione server errata' }, { status: 500 });
    }

    if (password === adminKey) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Chiave admin non valida' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

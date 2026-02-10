import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/admin/notifications/recipients - Get all guests with email addresses (admin only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get('adminKey');
    
    // Admin check
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Get all guests with email addresses
    const guestsWithEmail = await db.prepare(
      'SELECT * FROM guests WHERE email IS NOT NULL AND email != \'\' ORDER BY surname, name'
    ).all() as any[];

    if (!guestsWithEmail || guestsWithEmail.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    // Get all guests to build family groups
    const allGuests = await db.prepare('SELECT * FROM guests ORDER BY id').all() as any[];

    // Build a map of guests by id
    const guestsMap = new Map(allGuests.map(g => [g.id, g]));

    // Process recipients - only include group leaders (guests with email)
    const recipientsMap = new Map<number, {
      id: number;
      name: string;
      surname: string;
      email: string;
      familyMembersCount: number;
      familyMemberNames: string[];
    }>();

    for (const guest of guestsWithEmail) {
      let groupLeaderId: number;
      let groupLeader: any;

      if (guest.family_id) {
        // This guest is linked to another guest - the group leader is the main guest
        groupLeaderId = guest.family_id;
        groupLeader = guestsMap.get(groupLeaderId);
        
        // Only process if the main guest has an email
        if (!groupLeader || !groupLeader.email) {
          continue;
        }
      } else {
        // This guest is the group leader
        groupLeaderId = guest.id;
        groupLeader = guest;
      }

      // Skip if we already processed this group leader
      if (recipientsMap.has(groupLeaderId)) {
        continue;
      }

      // Get all family members for this group
      const linkedGuests = allGuests.filter(g => g.family_id === groupLeaderId);
      const familyMemberNames = [groupLeader.name, ...linkedGuests.map(g => g.name)];

      recipientsMap.set(groupLeaderId, {
        id: groupLeader.id,
        name: groupLeader.name,
        surname: groupLeader.surname || '',
        email: groupLeader.email,
        familyMembersCount: familyMemberNames.length,
        familyMemberNames,
      });
    }

    const uniqueRecipients = Array.from(recipientsMap.values());

    return NextResponse.json({ recipients: uniqueRecipients });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

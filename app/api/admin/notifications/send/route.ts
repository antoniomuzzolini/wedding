import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST /api/admin/notifications/send - Send emails to all recipients (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey, messageBody } = body;

    // Admin check
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { error: 'Il messaggio centrale è obbligatorio' },
        { status: 400 }
      );
    }

    // Get all guests with email addresses
    const guestsWithEmail = await db.prepare(
      'SELECT * FROM guests WHERE email IS NOT NULL AND email != \'\' ORDER BY surname, name'
    ).all() as any[];

    if (!guestsWithEmail || guestsWithEmail.length === 0) {
      return NextResponse.json({ error: 'Nessun destinatario con email configurata' }, { status: 400 });
    }

    // Get all guests to build family groups
    const allGuests = await db.prepare('SELECT * FROM guests ORDER BY id').all() as any[];
    const guestsMap = new Map(allGuests.map(g => [g.id, g]));

    // Process recipients - only include group leaders
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

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({ error: 'Nessun destinatario valido trovato' }, { status: 400 });
    }

    // Send emails
    const emailResults = await Promise.allSettled(
      uniqueRecipients.map(recipient => sendEmail(recipient, messageBody, allGuests))
    );

    const sentCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failedCount = emailResults.filter(r => r.status === 'rejected').length;

    if (failedCount > 0) {
      console.error(`Failed to send ${failedCount} emails`);
    }

    return NextResponse.json({
      sentCount,
      failedCount,
      totalRecipients: uniqueRecipients.length,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

/**
 * Send email to a recipient
 * This function can be easily replaced with a real email service (Resend, SendGrid, etc.)
 */
async function sendEmail(
  recipient: {
    name: string;
    surname: string;
    email: string;
    familyMembersCount: number;
    familyMemberNames: string[];
  },
  messageBody: string,
  allGuests: any[]
): Promise<void> {
  // Generate personalized email content with all family member names
  let greeting: string;
  if (recipient.familyMembersCount > 1) {
    // Format names: "Ciao Marco, Anna e Matteo"
    const names = recipient.familyMemberNames;
    if (names.length === 2) {
      greeting = `Ciao ${names[0]} e ${names[1]},`;
    } else {
      const lastName = names[names.length - 1];
      const otherNames = names.slice(0, -1).join(', ');
      greeting = `Ciao ${otherNames} e ${lastName},`;
    }
  } else {
    greeting = `Ciao ${recipient.name},`;
  }

  const closing = `Un abbraccio,\nFrancesca e Antonio`;

  const emailContent = `${greeting}\n\n${messageBody}\n\n${closing}`;

  // TODO: Replace this with actual email service integration
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: recipient.email,
  //   subject: 'Aggiornamento Matrimonio',
  //   text: emailContent,
  // });

  // For now, log the email (in production, use a real email service)
  console.log(`[EMAIL] To: ${recipient.email}`);
  console.log(`[EMAIL] Subject: Aggiornamento Matrimonio`);
  console.log(`[EMAIL] Content:\n${emailContent}\n`);

  // Simulate async email sending
  await new Promise(resolve => setTimeout(resolve, 100));
}

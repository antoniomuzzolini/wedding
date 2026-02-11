import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import nodemailer from 'nodemailer';

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
 * Create nodemailer transporter for SMTP
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'ssl0.ovh.net';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE !== 'false'; // Default to true (SSL)
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env.local');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

/**
 * Send email to a recipient via SMTP
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

  // Get site URL from env or use default
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
  const siteLink = `\n\nVisita il nostro sito: ${siteUrl}`;

  const emailContent = `${greeting}\n\n${messageBody}\n\n${closing}${siteLink}`;

  // Create HTML version with elegant styling matching the invitation
  const greetingHtml = greeting.replace(/\n/g, '<br>');
  const messageBodyHtml = messageBody.replace(/\n/g, '<br>');
  const closingHtml = closing.replace(/\n/g, '<br>');
  
  const emailContentHtml = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Dancing+Script:wght@400;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background-color: #FAF8F3; font-family: 'Cormorant Garamond', 'Georgia', serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FAF8F3;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 2px solid #7A9C96;">
                  <h1 style="margin: 0; font-family: 'Dancing Script', cursive; font-size: 36px; font-weight: 600; color: #7A9C96; line-height: 1.2;">
                    Francesca e Antonio
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.8; color: #333333; font-weight: 400;">
                    ${greetingHtml}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid #E8E8E8; border-bottom: 1px solid #E8E8E8;">
                    <p style="margin: 0; font-size: 17px; line-height: 1.9; color: #444444; font-weight: 400; text-align: justify;">
                      ${messageBodyHtml}
                    </p>
                  </div>
                  
                  <p style="margin: 30px 0 0 0; font-size: 18px; line-height: 1.8; color: #333333; font-weight: 400;">
                    ${closingHtml}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E8E8E8; background-color: #FAF8F3;">
                  <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #666666;">
                    Visita il nostro sito:
                  </p>
                  <a href="${siteUrl}" style="display: inline-block; color: #7A9C96; text-decoration: none; font-size: 16px; font-weight: 600; border-bottom: 2px solid #7A9C96; padding-bottom: 2px;">
                    ${siteUrl}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Get sender name from env or use default
  const senderName = process.env.SMTP_FROM_NAME || 'Francesca e Antonio';
  const senderEmail = process.env.SMTP_USER;

  if (!senderEmail) {
    throw new Error('SMTP_USER not configured');
  }

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipient.email,
      subject: 'Aggiornamento Matrimonio',
      text: emailContent,
      html: emailContentHtml,
    });

    console.log(`[EMAIL] Sent successfully to: ${recipient.email}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${recipient.email}:`, error);
    throw error;
  }
}

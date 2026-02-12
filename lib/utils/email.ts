import nodemailer from 'nodemailer';

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
 * Send confirmation recap email to admin
 */
export async function sendConfirmationRecapEmail(
  guests: Array<{
    id: number;
    name: string;
    surname: string;
    response_status: 'confirmed' | 'declined';
    menu_type: string | null;
    dietary_requirements: string | null;
    invitation_type: 'full' | 'evening';
  }>
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  // Se l'email admin non è configurata, non inviare l'email
  if (!adminEmail || !adminEmail.trim()) {
    console.log('[EMAIL] ADMIN_EMAIL not configured, skipping confirmation recap email');
    return;
  }
  
  // Build recap content
  const recapItems = guests.map(guest => {
    const status = guest.response_status === 'confirmed' ? '✅ Confermato' : '❌ Declinato';
    const menuInfo = guest.menu_type ? `\n   Menu: ${guest.menu_type}` : '';
    const dietaryInfo = guest.dietary_requirements ? `\n   Requisiti dietetici: ${guest.dietary_requirements}` : '';
    const invitationInfo = guest.invitation_type === 'full' ? 'Cerimonia completa' : 'Solo serata';
    
    return `• ${guest.name} ${guest.surname} - ${status} (${invitationInfo})${menuInfo}${dietaryInfo}`;
  });

  const recapText = `Recap conferma/modifica presenza:\n\n${recapItems.join('\n\n')}`;

  const recapHtml = `
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
                    Recap Conferma Presenza
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.8; color: #333333; font-weight: 400;">
                    Un ospite ha confermato o modificato la sua presenza.
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #FAF8F3; border-radius: 8px; border-left: 4px solid #7A9C96;">
                    ${recapItems.map(item => {
                      const htmlItem = item
                        .replace(/✅/g, '<span style="color: #22c55e;">✅</span>')
                        .replace(/❌/g, '<span style="color: #ef4444;">❌</span>')
                        .replace(/\n/g, '<br>');
                      return `<p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.8; color: #444444; font-weight: 400;">${htmlItem}</p>`;
                    }).join('')}
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E8E8E8; background-color: #FAF8F3;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
                    Sistema di gestione inviti matrimonio
                  </p>
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
  const senderName = process.env.SMTP_FROM_NAME || 'Sistema Inviti Matrimonio';
  const senderEmail = process.env.SMTP_USER;

  if (!senderEmail) {
    throw new Error('SMTP_USER not configured');
  }

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: adminEmail,
      subject: 'Recap Conferma/Modifica Presenza',
      text: recapText,
      html: recapHtml,
    });

    console.log(`[EMAIL] Confirmation recap sent successfully to: ${adminEmail}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send confirmation recap to ${adminEmail}:`, error);
    throw error;
  }
}

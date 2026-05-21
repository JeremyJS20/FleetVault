export class EmailService {
  async sendTemporaryPassword(toEmail: string, tempPassword: string): Promise<boolean> {
    // Read lazily so dotenv has time to load before we grab the values
    const apiKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM || 'onboarding@resend.dev';

    // In dev/test mode, redirect all emails to the Resend account owner email
    // (Resend free tier only allows sending to the account owner without a verified domain)
    const testTo = process.env.RESEND_TEST_TO;
    const actualTo = testTo || toEmail;
    if (testTo && testTo !== toEmail) {
      console.log(`[EMAIL SERVICE] DEV OVERRIDE: Redirecting email from ${toEmail} → ${testTo}`);
    }
    const subject = 'Welcome to FleetVault - Your Temporary Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Welcome to FleetVault!</h2>
        <p>Thank you for registering. We have created a temporary account for you to complete your booking.</p>
        <p>Here are your temporary login credentials:</p>
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 16px;">
          <strong>Email:</strong> ${toEmail}<br/>
          <strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #2d3748;">${tempPassword}</code>
        </div>
        <p style="color: #4a5568; font-size: 14px;">We highly recommend changing your password once you log in.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 12px;">This is an automated message, please do not reply directly to this email.</p>
      </div>
    `;

    // Debug log in terminal
    console.log('--------------------------------------------------');
    console.log(`[EMAIL SERVICE] Sending Temporary Password Email`);
    console.log(`To (intended): ${toEmail}`);
    console.log(`To (actual):   ${actualTo}`);
    console.log(`From: ${mailFrom}`);
    console.log(`Subject: ${subject}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log('--------------------------------------------------');

    if (!apiKey || apiKey.includes('placeholder') || apiKey.startsWith('re_dummy')) {
      console.log(`[EMAIL SERVICE] Resend API Key is missing or using placeholder. Email not sent via Resend API (Mock mode active).`);
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: mailFrom,
          to: actualTo,
          subject: subject,
          html: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[EMAIL SERVICE] Resend API rejected email (${response.status}): ${errorText}`);
        console.warn(`[EMAIL SERVICE] Soft-fail: registration proceeds. Check terminal above for the temporary password.`);
        // Treat as soft-fail — don't block registration if email delivery fails
        return true;
      }

      const result = await response.json();
      console.log(`[EMAIL SERVICE] Email successfully sent via Resend. ID:`, (result as any).id);
      return true;
    } catch (error) {
      console.error(`[EMAIL SERVICE] Error calling Resend API:`, error);
      return false;
    }
  }
}

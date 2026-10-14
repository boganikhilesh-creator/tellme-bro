import nodemailer from 'nodemailer';
import fs from 'fs';

// Simple .env reader
const envContent = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

async function testBrevo() {
  const host = env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(env.SMTP_PORT || '587', 10);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.EMAIL_FROM || 'boganikhilesh@gmail.com';

  console.log('Testing Brevo SMTP with configuration:');
  console.log('Host:', host);
  console.log('Port:', port);
  console.log('User:', user);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  try {
    console.log('1. Verifying SMTP connection to Brevo...');
    await transporter.verify();
    console.log('✅ Brevo SMTP Connection authenticated successfully!');

    console.log('2. Sending test OTP email to boganikhilesh@gmail.com...');
    const info = await transporter.sendMail({
      from: `"TellmeBro" <${env.EMAIL_FROM || 'boganikhilesh@gmail.com'}>`,
      to: 'boganikhilesh@gmail.com',
      subject: 'Tellme Bro - Your Email Verification is Ready! 🚀',
      text: 'Congratulations! Your Brevo SMTP email configuration is active. Future login and signup OTPs will be delivered here automatically.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">Tellme Bro Email Setup Verified! 🛡️</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your Brevo SMTP credentials are now connected to <strong>Tellme Bro</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #16a34a; font-weight: bold; font-size: 15px;">✅ Real Email Delivery Active</p>
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">Every user who signs up or logs into Tellme Bro will receive their 6-digit OTP in their inbox.</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Tellme Bro Security System</p>
        </div>
      `,
    });

    console.log('✅ Real email dispatched to Gmail inbox! Message ID:', info.messageId);
  } catch (err: any) {
    console.error('❌ Failed to send via Brevo:', err.message || err);
    if (err.response) {
      console.error('Brevo SMTP response:', err.response);
    }
  }
}

testBrevo();

import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transporter = getMailTransporter();
  const rawFrom = process.env.EMAIL_FROM || 'codeplayer687@gmail.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'TellmeBro';
  const from = rawFrom.includes('<') ? rawFrom : `"${fromName}" <${rawFrom}>`;

  if (!transporter) {
    // In local development without configured SMTP, log email to console
    console.log('\n=========================================');
    console.log(`[EMAIL DISPATCH] From: ${from}`);
    console.log(`[EMAIL DISPATCH] To: ${to}`);
    console.log(`[SUBJECT] ${subject}`);
    console.log(`[CONTENT] ${text || html.replace(/<[^>]+>/g, '')}`);
    console.log('=========================================\n');
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    return { success: false, error };
  }
}

export async function sendVerificationOtpEmail(to: string, code: string) {
  const subject = 'Verify your email - Tellme Bro';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Welcome to Tellme Bro! 🚀</h2>
      <p style="color: #475569; font-size: 15px;">Use the verification code below to activate your account:</p>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code will expire in 15 minutes. If you did not create an account, please ignore this email.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject,
    html,
    text: `Your Tellme Bro verification code is: ${code}. It expires in 15 minutes.`,
  });
}

export async function sendLoginOtpEmail(to: string, code: string) {
  const subject = 'Your Tellme Bro Login Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Login Verification Code 🛡️</h2>
      <p style="color: #475569; font-size: 15px;">We received a login request for your account. Use the one-time code below to verify your identity:</p>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not attempt to log in, please secure your account immediately.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject,
    html,
    text: `Your Tellme Bro login verification code is: ${code}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const subject = 'Reset your password - Tellme Bro';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 15px;">We received a request to reset your password. Use the code below:</p>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #dc2626;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code will expire in 15 minutes. If you didn't request a password reset, your account is safe.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject,
    html,
    text: `Your Tellme Bro password reset code is: ${code}. It expires in 15 minutes.`,
  });
}

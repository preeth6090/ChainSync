import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.EMAIL_SERVER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);
  }
  return transporter;
}

// Best-effort send: never throws. Every caller of this runs inside code paths that matter
// more than the email does (raising a dispute, approving a PO) — a flaky SMTP connection
// should never roll back or block a real business transaction. Logs and moves on.
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[email] EMAIL_SERVER not configured — skipped sending "${subject}" to ${to}`);
    return;
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? 'ChainSync <no-reply@chainsync.local>',
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
  }
}

import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) throw new Error('SMTP_HOST is not set');

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }
  return transporter;
}

export interface ProviderSendInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  inReplyTo?: string | null;
  references?: string[] | null;
}

export interface ProviderSendResult {
  providerId: string;
  messageId: string;
}

export async function sendEmail(input: ProviderSendInput): Promise<ProviderSendResult> {
  const from = process.env.EMAIL_FROM_NAME
    ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`
    : process.env.EMAIL_FROM ?? '';

  const to = input.toName ? `${input.toName} <${input.to}>` : input.to;

  const headers: Record<string, string> = {};
  if (input.inReplyTo) {
    headers['In-Reply-To'] = input.inReplyTo;
    if (input.references && input.references.length) {
      headers['References'] = input.references.join(' ');
    }
  }

  const info = await getTransporter().sendMail({
    from,
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers,
  });

  const messageId = info.messageId ?? `<${Date.now()}@outreach>`;

  return {
    providerId: messageId,
    messageId,
  };
}

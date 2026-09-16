import { Resend } from 'resend';

let client: Resend | null = null;

function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    client = new Resend(key);
  }
  return client;
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

  const headers: Record<string, string> = {};
  if (input.inReplyTo) {
    headers['In-Reply-To'] = input.inReplyTo;
    if (input.references && input.references.length) {
      headers['References'] = input.references.join(' ');
    }
  }

  const toArr = input.toName
    ? [{ email: input.to, name: input.toName }]
    : [input.to];

  const { data, error } = await getResend().emails.send({
    from,
    to: toArr as string[],
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers,
  });

  if (error) throw new Error(`Email provider error: ${error.message}`);

  const providerId = (data as { id?: string })?.id;
  if (!providerId) throw new Error('Email provider did not return an id');

  return { providerId, messageId: `<${providerId}@resend.com>` };
}

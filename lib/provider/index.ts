import crypto from 'crypto';
import { sendEmail, type ProviderSendInput, type ProviderSendResult } from './resend';

export type { ProviderSendInput, ProviderSendResult };

export async function send(input: ProviderSendInput): Promise<ProviderSendResult> {
  const provider = process.env.EMAIL_PROVIDER ?? 'resend';
  if (provider !== 'resend') {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
  return sendEmail(input);
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const provider = process.env.EMAIL_PROVIDER ?? 'resend';
  if (provider !== 'resend') return false;

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

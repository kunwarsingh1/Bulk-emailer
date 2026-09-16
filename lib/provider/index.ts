import { sendEmail, type ProviderSendInput, type ProviderSendResult } from './smtp';

export type { ProviderSendInput, ProviderSendResult };

export async function send(input: ProviderSendInput): Promise<ProviderSendResult> {
  return sendEmail(input);
}

import crypto from 'crypto';

export function generateTrackingToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function encodeTargetUrl(url: string): string {
  return Buffer.from(url, 'utf8').toString('base64url');
}

export function decodeTargetUrl(encoded: string): string | null {
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    const url = new URL(decoded);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

const LINK_RE = /href="(https?:\/\/[^"]+)"/gi;

export function injectTracking(
  html: string,
  token: string,
  appUrl: string
): string {
  let out = html.replace(LINK_RE, (_m, url: string) => {
    const tracked = `${appUrl}/api/track/click/${token}?u=${encodeTargetUrl(url)}`;
    return `href="${tracked}"`;
  });

  const pixel = `<img src="${appUrl}/api/track/open/${token}" width="1" height="1" style="display:none" alt="" />`;

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${pixel}</body>`);
  } else {
    out += pixel;
  }

  return out;
}

export const ONE_BY_ONE_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

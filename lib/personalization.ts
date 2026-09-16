export interface PersonalizedResult {
  text: string;
  flagged: boolean;
  reason?: string;
}

export function personalizeText(
  input: string,
  name: string | null | undefined
): PersonalizedResult {
  if (!input.includes('[[Name]]')) {
    return { text: input, flagged: false };
  }

  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return {
      text: input,
      flagged: true,
      reason: 'Contact has no name — cannot personalize [[Name]]',
    };
  }

  return { text: input.split('[[Name]]').join(trimmed), flagged: false };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkify(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const escaped = escapeHtml(para);
      const withBreaks = escaped.replace(/\n/g, '<br/>');
      const withLinks = linkify(withBreaks);
      return `<p>${withLinks}</p>`;
    })
    .join('');
}

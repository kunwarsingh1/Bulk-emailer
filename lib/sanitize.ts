const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'a', 'ul', 'ol', 'li',
  'div', 'span', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'table', 'tr',
  'td', 'th', 'thead', 'tbody', 'pre', 'code', 'hr', 'img',
]);

export function sanitizeHtml(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?\/?>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  out = out.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  out = out.replace(
    /(href|src)\s*=\s*(["']?)\s*(?:javascript|vbscript|data):[^"'>\s]*\2/gi,
    '$1=$2#$2'
  );

  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag: string) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      if (lower === 'a') {
        const href = match.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
        const url = href ? (href[2] ?? href[3]) : null;
        if (url && /^https?:\/\//i.test(url)) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
        }
        return '<a>';
      }
      if (lower === 'img') return ''; // strip images
      return match.startsWith('</') ? `</${lower}>` : `<${lower}>`;
    }
    return '';
  });

  return out;
}

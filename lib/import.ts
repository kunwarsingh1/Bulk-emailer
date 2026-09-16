import { normalizeEmail, isValidEmail } from './utils';

export interface ParsedEntry {
  name: string;
  email: string;
}

export interface ParseResult {
  valid: ParsedEntry[];
  invalidLines: string[];
  duplicateEmails: string[];
}

export function parseImportText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const valid: ParsedEntry[] = [];
  const invalidLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let name = '';
    let email = '';

    const angle = line.match(/^(.*?)\s*<([^<>()\s]+@[^<>()\s]+)>$/);
    const comma = line.match(/^(.*?),\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);

    if (angle) {
      name = angle[1].trim();
      email = angle[2].trim();
    } else if (comma) {
      name = comma[1].trim();
      email = comma[2].trim();
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) {
      email = line;
    } else {
      invalidLines.push(line);
      continue;
    }

    const norm = normalizeEmail(email);
    if (!isValidEmail(norm)) {
      invalidLines.push(line);
      continue;
    }

    if (seen.has(norm)) continue;
    seen.add(norm);
    valid.push({ name, email: norm });
  }

  return { valid, invalidLines, duplicateEmails: [] };
}

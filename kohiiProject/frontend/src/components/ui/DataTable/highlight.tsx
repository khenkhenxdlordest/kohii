import type { ReactNode } from 'react';

/**
 * Hinahanap ang mga letra ng query nang sunod-sunod kahit may pagitan
 * (hal. "icl" ay tatama sa "ICed Latte"). null kapag hindi tumama.
 */
function subsequenceIndices(value: string, query: string): number[] | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return null;
  const indices: number[] = [];
  let qi = 0;
  for (let i = 0; i < value.length && qi < q.length; i += 1) {
    if (value[i].toLowerCase() === q[qi]) {
      indices.push(i);
      qi += 1;
    }
  }
  return qi === q.length ? indices : null;
}

/** true kung tumatama ang value sa query (buo o hindi buo ang pagkakasunod) */
export function matchesSearch(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return value.toLowerCase().includes(q) || subsequenceIndices(value, q) !== null;
}

/**
 * Ibinabalik ang text na naka-highlight ang tumamang bahagi.
 * `exactClass` para sa buong tugma, `partialClass` para sa hiwa-hiwalay na letra.
 */
export function highlightText(
  value: string | null | undefined,
  query: string,
  exactClass: string,
  partialClass: string,
): ReactNode {
  if (!value) return '';
  const q = query.trim().toLowerCase();
  if (!q) return value;

  const lower = value.toLowerCase();
  if (lower.includes(q)) {
    const parts: ReactNode[] = [];
    let start = 0;
    let match = lower.indexOf(q);
    while (match !== -1) {
      if (match > start) parts.push(value.slice(start, match));
      parts.push(
        <mark key={match} className={exactClass}>
          {value.slice(match, match + q.length)}
        </mark>,
      );
      start = match + q.length;
      match = lower.indexOf(q, start);
    }
    if (start < value.length) parts.push(value.slice(start));
    return parts;
  }

  const indices = subsequenceIndices(value, q);
  if (!indices) return value;
  const set = new Set(indices);
  return value.split('').map((char, i) =>
    set.has(i) ? (
      <mark key={i} className={partialClass}>
        {char}
      </mark>
    ) : (
      char
    ),
  );
}

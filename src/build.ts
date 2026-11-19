import { BY_ID, EXCLUSIVE_PAIRS } from './data/buffs';

const STORAGE_KEY = 'tarkov-buffs:selection';

/** Возвращает бафф, с которым конфликтует id в текущем выборе, или undefined. */
export function conflictOf(id: string, selected: Set<string>): string | undefined {
  for (const [a, b] of EXCLUSIVE_PAIRS) {
    if (a === id && selected.has(b)) return b;
    if (b === id && selected.has(a)) return a;
  }
  return undefined;
}

export function summarize(selected: Set<string>) {
  let earned = 0;
  let spent = 0;
  for (const id of selected) {
    const buff = BY_ID.get(id);
    if (!buff) continue;
    if (buff.kind === 'negative') earned += buff.points;
    else spent += buff.points;
  }
  return { earned, spent, balance: earned - spent, count: selected.size };
}

/** Чистит список от неизвестных id и от второго баффа в конфликтующей паре. */
function sanitize(ids: string[]): Set<string> {
  const result = new Set<string>();
  for (const id of ids) {
    if (BY_ID.has(id) && !conflictOf(id, result)) result.add(id);
  }
  return result;
}

export function readFromHash(): Set<string> | null {
  const match = window.location.hash.match(/[#&]b=([^&]*)/);
  if (!match) return null;
  return sanitize(decodeURIComponent(match[1]).split(',').filter(Boolean));
}

export function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveToStorage(selected: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  } catch {
    // Приватный режим или запрет хранилища: просто не сохраняем.
  }
}

export function shareUrl(selected: Set<string>): string {
  const url = new URL(window.location.href);
  url.hash = selected.size ? `b=${[...selected].join(',')}` : '';
  return url.toString();
}

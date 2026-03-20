// /api prefix = Next.js App Router API routes (works in dev and Vercel production)
const API_URL = "/api";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function truncate(str: string, len = 16): string {
  if (!str) return "";
  if (str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}...${str.slice(-len)}`;
}

export function saveState(key: string, data: unknown) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(`reputrans_${key}`, JSON.stringify(data));
  }
}

export function loadState<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`reputrans_${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Clears all REPUTRANS session state from sessionStorage.
 * Used by the demo reset flow.
 */
export function clearAllState(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('reputrans_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k));
}

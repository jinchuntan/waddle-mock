import type { Cookie } from 'playwright';

interface StoredSession {
  cookies: Cookie[];
  expiresAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * In-memory store for authenticated browser sessions.
 * Keyed by the credential key (e.g. "SUPPLIER_A") so the same session
 * is reused across tool calls without re-logging in.
 */
export class SessionStore {
  private static instance: SessionStore;
  private readonly sessions = new Map<string, StoredSession>();

  private constructor() {}

  static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  save(key: string, cookies: Cookie[]): void {
    this.sessions.set(key, {
      cookies,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
  }

  load(key: string): Cookie[] | null {
    const session = this.sessions.get(key);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(key);
      return null;
    }
    return session.cookies;
  }

  invalidate(key: string): void {
    this.sessions.delete(key);
  }

  has(key: string): boolean {
    return this.load(key) !== null;
  }
}

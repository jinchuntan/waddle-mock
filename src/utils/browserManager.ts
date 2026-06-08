import type { Browser, BrowserContext } from 'playwright';

interface BrowserOptions {
  headless?: boolean;
  userAgent?: string;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Singleton that manages a shared Playwright browser instance.
 * Lazy-initialises on first use and keeps it alive for session reuse.
 */
export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async getBrowser(options: BrowserOptions = {}): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      // new Function prevents esbuild from statically bundling playwright
      const { chromium } = await (new Function('return import("playwright")')() as Promise<typeof import('playwright')>);
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  async newContext(options: BrowserOptions = {}): Promise<BrowserContext> {
    const browser = await this.getBrowser(options);
    return browser.newContext({
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
      viewport: { width: 1280, height: 800 },
      // Mask headless signals
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

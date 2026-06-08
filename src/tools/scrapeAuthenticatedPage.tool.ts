import { LuaTool, env } from 'lua-cli';
import { z } from 'zod';
import type { Page } from 'playwright';
import { BrowserManager } from '../utils/browserManager.js';
import { SessionStore } from '../utils/sessionStore.js';

const inputSchema = z.object({
  loginUrl: z.string().url().describe('URL of the supplier login page'),
  targetUrl: z.string().url().describe('URL to scrape after successful authentication'),
  credentialsKey: z
    .string()
    .describe(
      'Environment variable prefix for this supplier (e.g. "SUPPLIER_RS" maps to ' +
        'SUPPLIER_RS_EMAIL and SUPPLIER_RS_PASSWORD). Set these in your .env file.',
    ),
  postLoginSelector: z
    .string()
    .optional()
    .describe('CSS selector that only appears when logged in — used to confirm successful login'),
  waitForSelector: z
    .string()
    .optional()
    .describe('CSS selector to wait for on the target page before extracting content'),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .default(30_000)
    .describe('Maximum time in ms per navigation step'),
});

type Input = z.infer<typeof inputSchema>;

interface ScrapeResult {
  success: true;
  url: string;
  title: string;
  text: string;
  html: string;
}

interface ScrapeError {
  success: false;
  url: string;
  error: string;
}

// Selectors tried in order when locating the email/username field
const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[name="user"]',
  'input[id*="email" i]',
  'input[id*="user" i]',
  'input[placeholder*="email" i]',
];

// Selectors tried in order when locating the submit button
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Log in")',
  'button:has-text("Login")',
  'button:has-text("Sign in")',
  'button:has-text("Continue")',
];

async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const el = await page.$(selector);
    if (el) {
      await el.fill(value);
      return true;
    }
  }
  return false;
}

async function performLogin(
  page: Page,
  email: string,
  password: string,
  timeoutMs: number,
): Promise<void> {
  const emailFilled = await fillFirst(page, EMAIL_SELECTORS, email);
  if (!emailFilled) throw new Error('Could not locate the email/username input field on login page');

  const passwordEl = await page.$('input[type="password"]');
  if (!passwordEl) throw new Error('Could not locate the password input field on login page');
  await passwordEl.fill(password);

  for (const selector of SUBMIT_SELECTORS) {
    const btn = await page.$(selector);
    if (btn) {
      await Promise.all([page.waitForNavigation({ timeout: timeoutMs }), btn.click()]);
      return;
    }
  }

  throw new Error('Could not locate a submit button on the login page');
}

async function isLoggedOut(page: Page): Promise<boolean> {
  // Presence of a password field is a reliable sign the user is not authenticated
  const passwordField = await page.$('input[type="password"]');
  return passwordField !== null;
}

async function extractContent(page: Page): Promise<{ title: string; text: string; html: string }> {
  return page.evaluate(() => {
    document.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
    return {
      title: document.title,
      text: (document.body as HTMLElement).innerText.trim(),
      html: document.body.innerHTML,
    };
  });
}

/**
 * Scrapes a supplier page that requires authentication.
 *
 * Credentials are read from environment variables — never passed directly
 * through the tool input. Set {KEY}_EMAIL and {KEY}_PASSWORD in your .env file.
 *
 * Sessions are cached in-memory for 30 minutes to avoid unnecessary re-logins.
 */
export const scrapeAuthenticatedPageTool: LuaTool = {
  name: 'scrape_authenticated_page',
  description:
    'Logs into a supplier portal using stored credentials and scrapes the target page. ' +
    'Credentials are retrieved securely from environment variables via the credentialsKey. ' +
    'Sessions are reused for 30 minutes to avoid repeated logins. ' +
    'Use this only when the target page is behind a login wall.',
  inputSchema,

  async execute(input: Input): Promise<ScrapeResult | ScrapeError> {
    const { loginUrl, targetUrl, credentialsKey, postLoginSelector, waitForSelector, timeoutMs } =
      input;

    // Resolve credentials from environment — never from tool input
    const email = env(`${credentialsKey}_EMAIL`);
    const password = env(`${credentialsKey}_PASSWORD`);

    if (!email || !password) {
      return {
        success: false,
        url: targetUrl,
        error:
          `Credentials not configured. ` +
          `Set ${credentialsKey}_EMAIL and ${credentialsKey}_PASSWORD in your .env file.`,
      };
    }

    const manager = BrowserManager.getInstance();
    const sessions = SessionStore.getInstance();
    const context = await manager.newContext();
    const page = await context.newPage();

    try {
      // Restore session cookies if we have a valid cached session
      const cachedCookies = sessions.load(credentialsKey);
      if (cachedCookies) {
        await context.addCookies(cachedCookies);
      }

      // Navigate to the target page and check if we are still logged in
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: timeoutMs });

      const needsLogin = await isLoggedOut(page);

      if (needsLogin) {
        // Navigate to the login page and authenticate
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
        await performLogin(page, email, password, timeoutMs);

        // Confirm login succeeded
        if (postLoginSelector) {
          await page.waitForSelector(postLoginSelector, { timeout: timeoutMs });
        }

        // Persist the new session
        const freshCookies = await context.cookies();
        sessions.save(credentialsKey, freshCookies);

        // Navigate to the intended target if login redirected elsewhere
        if (!page.url().startsWith(targetUrl)) {
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
        }
      }

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
      }

      const content = await extractContent(page);
      return { success: true, url: page.url(), ...content };
    } catch (err) {
      // Invalidate the session on error so the next call starts fresh
      sessions.invalidate(credentialsKey);
      return {
        success: false,
        url: targetUrl,
        error: (err as Error).message,
      };
    } finally {
      await context.close();
    }
  },
};

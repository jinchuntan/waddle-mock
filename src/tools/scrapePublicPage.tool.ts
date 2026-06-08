import { LuaTool } from 'lua-cli';
import { z } from 'zod';
import { BrowserManager } from '../utils/browserManager.js';

const inputSchema = z.object({
  url: z.string().url().describe('The public supplier URL to scrape'),
  waitForSelector: z
    .string()
    .optional()
    .describe('CSS selector to wait for before extracting — use when the page is JS-rendered'),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .default(30_000)
    .describe('Maximum time in ms to wait for the page to load'),
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

/**
 * Scrapes any publicly accessible supplier URL.
 * Returns the visible page text plus raw HTML for the agent to analyse.
 */
export const scrapePublicPageTool: LuaTool = {
  name: 'scrape_public_page',
  description:
    'Navigates to a public supplier webpage and returns its full text and HTML content. ' +
    'Use this when the target page does not require a login. ' +
    'Prefer this over the authenticated tool when possible.',
  inputSchema,

  async execute(input: Input): Promise<ScrapeResult | ScrapeError> {
    const manager = BrowserManager.getInstance();
    const context = await manager.newContext();
    const page = await context.newPage();

    try {
      await page.goto(input.url, {
        waitUntil: 'networkidle',
        timeout: input.timeoutMs,
      });

      if (input.waitForSelector) {
        await page.waitForSelector(input.waitForSelector, {
          timeout: input.timeoutMs,
        });
      }

      const extracted = await page.evaluate(() => {
        // Strip noise from extracted text
        document.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
        return {
          title: document.title,
          text: (document.body as HTMLElement).innerText.trim(),
          html: document.body.innerHTML,
        };
      });

      return { success: true, url: input.url, ...extracted };
    } catch (err) {
      return {
        success: false,
        url: input.url,
        error: (err as Error).message,
      };
    } finally {
      await context.close();
    }
  },
};

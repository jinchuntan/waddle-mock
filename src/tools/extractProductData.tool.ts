import { LuaTool, AI } from 'lua-cli';
import { z } from 'zod';

const inputSchema = z.object({
  pageText: z
    .string()
    .describe('The raw visible text of the scraped page (innerText, not HTML)'),
  productQuery: z
    .string()
    .describe('What the user is looking for — used to focus extraction on relevant items'),
  sourceUrl: z.string().url().describe('The URL this content was scraped from'),
});

type Input = z.infer<typeof inputSchema>;

export interface ProductListing {
  name: string;
  sku: string | null;
  price: string | null;
  currency: string | null;
  availability: string | null;
  minimumOrderQuantity: string | null;
  unit: string | null;
  supplierName: string | null;
  sourceUrl: string;
}

interface ExtractionResult {
  success: true;
  sourceUrl: string;
  products: ProductListing[];
  rawSummary: string;
}

interface ExtractionError {
  success: false;
  sourceUrl: string;
  error: string;
}

const SYSTEM_PROMPT = `You are a procurement data extraction specialist for Waddle, an AI procurement platform for SMEs.
Your job is to extract structured product information from raw supplier webpage text.

Rules:
- Extract ONLY products that are relevant to the user's search query.
- If a field is not present on the page, set it to null — do not guess.
- Prices must include the currency symbol or code exactly as shown.
- Return valid JSON only. No markdown fences, no commentary.

Output format (JSON array):
[
  {
    "name": "Full product name as listed",
    "sku": "SKU or part number or null",
    "price": "Price as shown on page or null",
    "currency": "Currency code/symbol or null",
    "availability": "In stock / Out of stock / Lead time text or null",
    "minimumOrderQuantity": "MOQ as shown or null",
    "unit": "per piece / per kg / per box etc or null",
    "supplierName": "Name of supplier if identifiable or null"
  }
]`;

/**
 * Uses the Lua AI platform's built-in AI.generate to parse raw page text
 * and return structured product listings relevant to the user's query.
 *
 * Keeping extraction in a dedicated tool means the scraping tools stay
 * focused on fetching only, and this tool handles intelligence.
 */
export const extractProductDataTool: LuaTool = {
  name: 'extract_product_data',
  description:
    'Parses raw supplier page text and extracts structured product listings ' +
    '(name, SKU, price, availability, MOQ) relevant to the user query. ' +
    'Always call this after scraping to turn raw text into usable procurement data.',
  inputSchema,

  async execute(input: Input): Promise<ExtractionResult | ExtractionError> {
    const { pageText, productQuery, sourceUrl } = input;

    // Trim to avoid hitting token limits — keep the most relevant portion
    const truncated = pageText.slice(0, 12_000);

    const userPrompt =
      `User is searching for: "${productQuery}"\n\n` +
      `Supplier page URL: ${sourceUrl}\n\n` +
      `Page content:\n${truncated}`;

    try {
      const rawJson = await AI.generate(SYSTEM_PROMPT, userPrompt);

      let products: ProductListing[];
      try {
        const parsed = JSON.parse(rawJson);
        products = Array.isArray(parsed) ? parsed : [];
      } catch {
        // AI returned something that isn't valid JSON — surface it as a summary
        return {
          success: true,
          sourceUrl,
          products: [],
          rawSummary: rawJson,
        };
      }

      // Stamp every listing with the source URL
      products = products.map((p) => ({ ...p, sourceUrl }));

      return { success: true, sourceUrl, products, rawSummary: '' };
    } catch (err) {
      return {
        success: false,
        sourceUrl,
        error: (err as Error).message,
      };
    }
  },
};

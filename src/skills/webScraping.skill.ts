import { LuaSkill } from 'lua-cli';
import { scrapePublicPageTool } from '../tools/scrapePublicPage.tool.js';
import { scrapeAuthenticatedPageTool } from '../tools/scrapeAuthenticatedPage.tool.js';
import { extractProductDataTool } from '../tools/extractProductData.tool.js';
import { sourceRouterTool } from '../tools/sourceRouter.tool.js';
import { supplierScorerTool } from '../tools/supplierScorer.tool.js';

export const webScrapingSkill = new LuaSkill({
  name: 'web-scraping',
  description:
    'Finds, scrapes, and ranks suppliers for a given procurement query in Malaysia or Singapore.',
  context:
    'Systematic search flow — follow these steps in order:\n' +
    '1. Call find_supplier_sources with the user query and location to get curated directory URLs.\n' +
    '2. Call scrape_public_page on each URL to retrieve live supplier listings.\n' +
    '3. Call extract_product_data on each scraped page to produce structured supplier data.\n' +
    '4. Call score_suppliers with all extracted candidates plus the user\'s location, budget, and quantity hints.\n' +
    '5. Pick the top 4 scored suppliers for the recommendation block.\n\n' +
    'Use scrape_authenticated_page only if a page returns a login wall. ' +
    'Never expose credentials in responses.',
  tools: [
    sourceRouterTool,
    scrapePublicPageTool,
    scrapeAuthenticatedPageTool,
    extractProductDataTool,
    supplierScorerTool,
  ],
});

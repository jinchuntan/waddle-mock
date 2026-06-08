import { LuaTool } from 'lua-cli';
import { z } from 'zod';

type Location = 'MY' | 'SG';

// Curated supplier directories by product category and country.
// These are stable, high-quality B2B sources for Malaysian and Singaporean markets.
const SOURCES: Record<string, Record<Location, string[]>> = {
  corporate_gifts: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=corporate+gifts+malaysia&country=MY',
      'https://www.carousell.com.my/search/corporate-gifts/?sort_by=3',
      'https://www.yellowpages.com.my/search/corporate-gifts',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=corporate+gifts+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/corporate-gifts',
      'https://www.carousell.com.sg/search/corporate-gifts/?sort_by=3',
    ],
  },
  electronics: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=electronics+supplier+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/electronics-wholesale',
      'https://www.matrade.gov.my/en/find-malaysian-suppliers?category=electronics',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=electronics+supplier+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/electronics-wholesale',
    ],
  },
  office_supplies: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=office+supplies+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/office-supplies',
      'https://www.carousell.com.my/search/office-furniture/?sort_by=3',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=office+supplies+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/office-supplies',
    ],
  },
  packaging: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=packaging+supplier+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/packaging-materials',
      'https://www.matrade.gov.my/en/find-malaysian-suppliers?category=packaging',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=packaging+supplier+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/packaging',
    ],
  },
  food_beverage: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=food+beverage+supplier+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/food-suppliers',
      'https://www.matrade.gov.my/en/find-malaysian-suppliers?category=food',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=food+beverage+supplier+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/food-suppliers',
    ],
  },
  clothing_apparel: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=clothing+manufacturer+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/garment-manufacturers',
      'https://www.matrade.gov.my/en/find-malaysian-suppliers?category=textiles',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=clothing+supplier+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/clothing-wholesale',
    ],
  },
  construction: {
    MY: [
      'https://www.alibaba.com/trade/search?SearchText=construction+materials+malaysia&country=MY',
      'https://www.yellowpages.com.my/search/building-materials',
      'https://www.matrade.gov.my/en/find-malaysian-suppliers?category=construction',
    ],
    SG: [
      'https://www.alibaba.com/trade/search?SearchText=construction+materials+singapore&country=SG',
      'https://www.yellowpages.com.sg/search/building-materials',
    ],
  },
  default: {
    MY: [
      'https://www.matrade.gov.my/en/find-malaysian-suppliers',
      'https://www.yellowpages.com.my',
      'https://www.alibaba.com/countrysearch/MY/suppliers.html',
    ],
    SG: [
      'https://www.yellowpages.com.sg',
      'https://www.alibaba.com/countrysearch/SG/suppliers.html',
      'https://www.sgtradesources.com',
    ],
  },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  corporate_gifts:  ['gift', 'corporate', 'merchandise', 'award', 'souvenir', 'promotional', 'trophy'],
  electronics:      ['electronic', 'circuit', 'component', 'device', 'tech', 'hardware', 'semiconductor'],
  office_supplies:  ['office', 'stationery', 'furniture', 'desk', 'chair', 'printer', 'paper'],
  packaging:        ['packaging', 'box', 'bag', 'wrapper', 'carton', 'container', 'label'],
  food_beverage:    ['food', 'beverage', 'drink', 'snack', 'ingredient', 'catering', 'grocery'],
  clothing_apparel: ['clothing', 'apparel', 'garment', 'uniform', 'shirt', 'fabric', 'textile', 'fashion'],
  construction:     ['construction', 'building', 'cement', 'steel', 'timber', 'tile', 'pipe', 'hardware'],
};

function detectCategory(query: string): string {
  const lower = query.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'default';
}

const inputSchema = z.object({
  query:    z.string().describe('The procurement search query from the user'),
  location: z.enum(['MY', 'SG']).describe('Target country — MY for Malaysia, SG for Singapore'),
});

type Input = z.infer<typeof inputSchema>;

interface RouterResult {
  category: string;
  sources: string[];
}

export const sourceRouterTool: LuaTool = {
  name: 'find_supplier_sources',
  description:
    'Maps a procurement query to a curated list of supplier directory URLs for Malaysia or Singapore. ' +
    'Always call this first before scraping — it tells you exactly where to look for the best results.',
  inputSchema,

  execute(input: Input): RouterResult {
    const category = detectCategory(input.query);
    const sources  = SOURCES[category]?.[input.location] ?? SOURCES.default[input.location];
    return { category, sources };
  },
};

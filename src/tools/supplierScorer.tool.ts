import { LuaTool } from 'lua-cli';
import { z } from 'zod';

const supplierSchema = z.object({
  company:   z.string(),
  price:     z.string().nullable(),
  moq:       z.string().nullable(),
  leadTime:  z.string().nullable(),
  location:  z.string().nullable(),
  phone:     z.string().nullable(),
  email:     z.string().nullable(),
  website:   z.string().nullable(),
});

const inputSchema = z.object({
  suppliers: z.array(supplierSchema).describe('Raw list of extracted supplier candidates'),
  userLocation: z.string().describe('User\'s city or region (e.g. "Kuala Lumpur", "Singapore")'),
  budgetHint:   z.string().nullable().describe('User\'s budget hint (e.g. "RM 5000", "Under 1000")'),
  quantityHint: z.string().nullable().describe('User\'s quantity hint (e.g. "500 units", "50+ units")'),
});

type Input = z.infer<typeof inputSchema>;
type Supplier = z.infer<typeof supplierSchema>;

interface ScoredSupplier extends Supplier {
  score: number;
}

function scoreSupplier(s: Supplier, userLocation: string, budgetHint: string | null, quantityHint: string | null): number {
  let score = 0;

  // Location relevance (+30)
  if (s.location) {
    const loc = s.location.toLowerCase();
    const user = userLocation.toLowerCase();
    if (loc.includes(user) || user.includes(loc)) score += 30;
    else if (loc.includes('malaysia') || loc.includes('singapore')) score += 15;
  }

  // Has price in budget (+25) — rough heuristic: if no price listed, neutral
  if (s.price && budgetHint) {
    const priceNum  = parseFloat(s.price.replace(/[^0-9.]/g, ''));
    const budgetNum = parseFloat(budgetHint.replace(/[^0-9.]/g, ''));
    if (!isNaN(priceNum) && !isNaN(budgetNum)) {
      score += priceNum <= budgetNum ? 25 : 0;
    } else {
      score += 10; // price exists but can't compare — small bonus
    }
  } else if (s.price) {
    score += 10;
  }

  // MOQ fits quantity (+20)
  if (s.moq && quantityHint) {
    const moqNum = parseFloat(s.moq.replace(/[^0-9.]/g, ''));
    const qtyNum = parseFloat(quantityHint.replace(/[^0-9.]/g, ''));
    if (!isNaN(moqNum) && !isNaN(qtyNum)) {
      score += moqNum <= qtyNum ? 20 : 0;
    } else {
      score += 8;
    }
  }

  // Contact completeness (+25 max)
  if (s.phone)   score += 10;
  if (s.email)   score += 8;
  if (s.website) score += 7;

  return score;
}

export const supplierScorerTool: LuaTool = {
  name: 'score_suppliers',
  description:
    'Scores and ranks a list of supplier candidates by relevance to the user\'s location, budget, and quantity. ' +
    'Call this after scraping and extracting supplier data to determine which 4 to recommend.',
  inputSchema,

  execute(input: Input): ScoredSupplier[] {
    return input.suppliers
      .map(s => ({ ...s, score: scoreSupplier(s, input.userLocation, input.budgetHint, input.quantityHint) }))
      .sort((a, b) => b.score - a.score);
  },
};

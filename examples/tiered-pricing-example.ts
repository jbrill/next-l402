// examples/tiered-pricing-example.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  withL402,
  createLightningClient,
  createExpirationCaveat,
} from '../src';

/**
 * Example of tiered pricing based on content value
 * Save as app/api/premium/[tier]/route.ts
 */

const lightning = createLightningClient();

// Define pricing tiers
const PRICING_TIERS = {
  basic: {
    price: 10,
    duration: 60 * 60, // 1 hour
  },
  standard: {
    price: 100,
    duration: 24 * 60 * 60, // 1 day
  },
  premium: {
    price: 1000,
    duration: 7 * 24 * 60 * 60, // 1 week
  },
};

export const GET = async (
  req: NextRequest,
  { params }: { params: { tier: string } }
) => {
  const tier = params.tier;

  // Check if tier exists
  if (!PRICING_TIERS[tier as keyof typeof PRICING_TIERS]) {
    return NextResponse.json(
      { error: 'Invalid tier', available: Object.keys(PRICING_TIERS) },
      { status: 400 }
    );
  }

  // Get tier pricing details
  const { price, duration } = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];

  // Create protected handler with appropriate pricing
  const protectedHandler = withL402(
    async () => {
      return NextResponse.json({
        message: `Successfully accessed ${tier} content`,
        tier,
        price,
        validFor: `${duration / 3600} hours`,
        content: getTierContent(tier as keyof typeof PRICING_TIERS),
      });
    },
    {
      lightning,
      priceSats: price,
      caveats: [createExpirationCaveat(duration)],
    }
  );

  return protectedHandler(req);
};

// Return different content based on tier
function getTierContent(tier: keyof typeof PRICING_TIERS) {
  switch (tier) {
    case 'basic':
      return {
        type: 'text',
        value: 'This is basic content with limited information.',
      };
    case 'standard':
      return {
        type: 'article',
        title: 'Standard Content',
        summary: 'Detailed information with insights and analysis.',
        wordCount: 1500,
      };
    case 'premium':
      return {
        type: 'exclusive',
        title: 'Premium Content',
        summary: 'Comprehensive analysis with proprietary data.',
        features: [
          'Market insights',
          'Predictive analysis',
          'Investment recommendations',
        ],
        downloads: ['report.pdf', 'data.csv'],
        wordCount: 5000,
      };
  }
}

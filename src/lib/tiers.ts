export type Tier = "Member" | "Silver" | "Gold" | "VIP";

interface TierConfig {
  label: Tier;
  minSpent: number;
  maxSpent: number | null;
  multiplier: number;
}

export const TIER_CONFIG: TierConfig[] = [
  { label: "Member", minSpent: 0,    maxSpent: 999,    multiplier: 1.0 },
  { label: "Silver", minSpent: 1000, maxSpent: 2999,   multiplier: 1.2 },
  { label: "Gold",   minSpent: 3000, maxSpent: 4999,   multiplier: 1.5 },
  { label: "VIP",    minSpent: 5000, maxSpent: null,    multiplier: 2.0 },
];

/** Resolve the correct tier based on total accumulated spending. */
export function getTierForSpent(totalSpent: number): TierConfig {
  // Iterate in reverse so the highest matching tier wins
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (totalSpent >= TIER_CONFIG[i].minSpent) {
      return TIER_CONFIG[i];
    }
  }
  return TIER_CONFIG[0]; // fallback: Member
}

/**
 * Calculate points earned for a purchase.
 * Base rate: 100 THB = 1 point (floor), then apply tier multiplier.
 */
export function calculatePoints(amount: number, tier: TierConfig): number {
  const basePoints = Math.floor(amount / 100);
  return Math.floor(basePoints * tier.multiplier);
}

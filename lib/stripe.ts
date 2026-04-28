import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export const getStripe = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }
  return stripeInstance;
};

export const PLAN_CONFIG = {
  free: { maxScans: 5 },
  pro: { maxScans: 50 },
  agency: { maxScans: 500 }
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

// Also export a getter for the instance itself if needed, or just use getStripe()
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia' as any,
}) : null as unknown as Stripe;

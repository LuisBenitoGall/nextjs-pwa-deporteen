import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error('[Stripe] STRIPE_SECRET_KEY is not defined.');
    }
    stripeSingleton = new Stripe(secret, {
      appInfo: {
        name: 'DeporTeen Admin',
      },
    });
  }
  return stripeSingleton;
}

export type { Stripe };

import { loadStripe, type Stripe } from "@stripe/stripe-js";

// NEXT_PUBLIC_* values are inlined at build time, so this key must be present
// when `next build` runs (same caveat as BACKEND_URL).
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

export const stripeConfigured = Boolean(publishableKey);

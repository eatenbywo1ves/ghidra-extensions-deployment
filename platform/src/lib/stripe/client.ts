import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2024-11-20.acacia",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;

/**
 * Create a Stripe Checkout session for upgrading to Pro.
 */
export async function createCheckoutSession(
  customerId: string,
  userId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID_PRO,
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?upgraded=true`,
    cancel_url: `${returnUrl}?cancelled=true`,
    metadata: { userId },
  });

  if (!session.url) throw new Error("No checkout URL from Stripe");
  return session.url;
}

/**
 * Create a Stripe Billing Portal session for managing an existing subscription.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/**
 * Get or create a Stripe customer for an author.
 */
export async function getOrCreateCustomer(
  email: string,
  name: string | null
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0]!.id;
  }

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
  });
  return customer.id;
}

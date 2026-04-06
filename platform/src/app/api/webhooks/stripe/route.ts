import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/db/client";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancelled(subscription);
      break;
    }
    case "invoice.payment_succeeded": {
      // Subscription renewed — already handled by subscription.updated
      break;
    }
    case "invoice.payment_failed": {
      // Optionally notify the author
      break;
    }
    default:
      // Unhandled event type — safe to ignore
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  const periodEnd = new Date(subscription.current_period_end * 1000);

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      planTier: isActive ? "PRO" : "FREE",
      planExpiresAt: isActive ? periodEnd : null,
    },
  });
}

async function handleSubscriptionCancelled(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { planTier: "FREE", planExpiresAt: null },
  });
}

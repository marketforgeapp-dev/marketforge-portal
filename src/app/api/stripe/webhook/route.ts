import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

function getCurrentPeriodEndFromSubscription(subscription: Stripe.Subscription) {
  const timestamp = subscription.items.data[0]?.current_period_end;

  return typeof timestamp === "number" ? new Date(timestamp * 1000) : null;
}

async function updateWorkspaceFromSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { stripeCustomerId: customerId },
      ],
    },
  });

  if (!workspace) {
    return;
  }

  let status: "ACTIVE" | "PAST_DUE" | "CANCELED" = "ACTIVE";

  if (
    subscription.status === "past_due" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete" ||
    subscription.status === "incomplete_expired"
  ) {
    status = "PAST_DUE";
  } else if (subscription.status === "canceled") {
    status = "CANCELED";
  } else {
    status = "ACTIVE";
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
      activatedAt:
        status === "ACTIVE" && !workspace.activatedAt
          ? new Date()
          : workspace.activatedAt,
    },
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing Stripe-Signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateWorkspaceFromSubscription(subscription);
        break;
      }

                  case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSubscription =
          invoice.parent?.subscription_details?.subscription ?? null;

        const subscriptionId =
          typeof rawSubscription === "string"
            ? rawSubscription
            : rawSubscription?.id ?? null;

        if (subscriptionId) {
          const workspace = await prisma.workspace.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (workspace) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: {
                status: "PAST_DUE",
              },
            });
          }
        }

        break;
      }

                  case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSubscription =
          invoice.parent?.subscription_details?.subscription ?? null;

        const subscriptionId =
          typeof rawSubscription === "string"
            ? rawSubscription
            : rawSubscription?.id ?? null;

        if (subscriptionId) {
          const workspace = await prisma.workspace.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (workspace) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: {
                status: "ACTIVE",
              },
            });
          }
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
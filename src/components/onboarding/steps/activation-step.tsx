"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

export type PlanValue = "STANDARD_MONTHLY" | "STANDARD_YEARLY";

type ActivationStepProps = {
  onActivate: (
    input: { plan: PlanValue; paymentMethodId: string }
  ) => Promise<void> | void;
  isPending: boolean;
  submitError: string | null;
  isDemoMode: boolean;
};

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function ActivationForm({
  onActivate,
  isPending,
  submitError,
  isDemoMode,
}: ActivationStepProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [selectedPlan, setSelectedPlan] =
    useState<PlanValue>("STANDARD_MONTHLY");
  const [cardError, setCardError] = useState<string | null>(null);

    const buttonDisabled = useMemo(() => {
    if (isDemoMode) {
      return isPending;
    }

    return isPending || !stripe || !elements;
  }, [elements, isDemoMode, isPending, stripe]);

    async function handleSubmit() {
    setCardError(null);

    if (isDemoMode) {
      await onActivate({
        plan: selectedPlan,
        paymentMethodId: "pm_demo_bypass",
      });
      return;
    }

    if (!stripe || !elements) {
      setCardError("Payment form is still loading. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setCardError("Payment form could not be loaded.");
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (error) {
      setCardError(error.message ?? "Unable to validate card details.");
      return;
    }

    if (!paymentMethod?.id) {
      setCardError("Unable to create a payment method.");
      return;
    }

    await onActivate({
      plan: selectedPlan,
      paymentMethodId: paymentMethod.id,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          Activation
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Activate Your System
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Your workspace is ready. Activate your system to unlock actions,
          execution, and tracking.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-medium text-white">Choose your plan</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedPlan("STANDARD_MONTHLY")}
            className={`rounded-xl border px-4 py-4 text-left ${
              selectedPlan === "STANDARD_MONTHLY"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-950"
            }`}
          >
            <p className="text-sm font-semibold text-white">Standard Monthly</p>
            <p className="mt-1 text-sm text-slate-400">$1,500 / month</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("STANDARD_YEARLY")}
            className={`rounded-xl border px-4 py-4 text-left ${
              selectedPlan === "STANDARD_YEARLY"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-950"
            }`}
          >
            <p className="text-sm font-semibold text-white">Standard Annual</p>
            <p className="mt-1 text-sm text-slate-400">$15,000 / year</p>
          </button>
        </div>
      </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-medium text-white">
          {isDemoMode ? "Demo activation" : "Payment details"}
        </p>

        {isDemoMode ? (
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Demo mode is enabled for this account. Stripe payment is being
            bypassed for this activation flow.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter your payment information below. When you click Activate Your
              System, MarketForge will validate your payment details and start
              your subscription.
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 px-4 py-4">
              <CardElement
                options={{
                  style: {
                    base: {
                      color: "#ffffff",
                      fontSize: "16px",
                      "::placeholder": {
                        color: "#94a3b8",
                      },
                    },
                    invalid: {
                      color: "#fca5a5",
                    },
                  },
                }}
              />
            </div>
          </>
        )}

        {cardError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {cardError}
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={buttonDisabled}
          className={`mt-6 rounded-lg px-6 py-3 font-medium text-white ${
            buttonDisabled
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPending ? "Activating..." : "Activate Your System"}
        </button>
      </div>
    </div>
  );
}

export function ActivationStep(props: ActivationStepProps) {
  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Missing Stripe publishable key.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <ActivationForm {...props} />
    </Elements>
  );
}
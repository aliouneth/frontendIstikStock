"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import { stripePromise } from "@/lib/stripe";

interface PayFormProps {
  amountLabel: string;
  returnUrl: string;
  onPaid: () => Promise<void> | void;
  onError: (message: string) => void;
}

function PayForm({ amountLabel, returnUrl, onPaid, onError }: PayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      // Cards that do not need 3-D Secure resolve here; others redirect to
      // return_url and the page finalises the order on the way back.
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment could not be completed.");
      setBusy(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      await onPaid();
    }

    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}

interface StripePaymentFormProps {
  clientSecret: string;
  checkoutId: number;
  amountLabel: string;
  onPaid: () => Promise<void> | void;
  onError: (message: string) => void;
}

export default function StripePaymentForm({
  clientSecret,
  checkoutId,
  amountLabel,
  onPaid,
  onError,
}: StripePaymentFormProps) {
  if (!stripePromise) {
    return (
      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and
        rebuild the front end.
      </div>
    );
  }

  // Carry the checkout id through the 3-D Secure redirect so the return trip
  // knows which order to settle.
  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?checkout_id=${checkoutId}`
      : `?checkout_id=${checkoutId}`;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm
        amountLabel={amountLabel}
        returnUrl={returnUrl}
        onPaid={onPaid}
        onError={onError}
      />
    </Elements>
  );
}

export const BILLING_PRICE_IDS = {
  STANDARD_MONTHLY: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID ?? "",
  STANDARD_YEARLY: process.env.STRIPE_STANDARD_YEARLY_PRICE_ID ?? "",
} as const;

export const BILLING_COUPON_IDS = {
  CUSTOMER_ONE_50_OFF: process.env.STRIPE_CUSTOMER_ONE_COUPON_ID ?? "",
  CUSTOMER_TWO_THREE_500_OFF:
    process.env.STRIPE_CUSTOMER_TWO_THREE_COUPON_ID ?? "",
} as const;

export function getDemoEmails(): string[] {
  const raw = process.env.STRIPE_DEMO_EMAILS ?? "";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getDemoEmails().includes(email.trim().toLowerCase());
}
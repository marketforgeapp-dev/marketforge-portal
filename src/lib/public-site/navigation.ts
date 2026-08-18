export type PublicNavigationItem = {
  label: string;
  href: string;
};

export const PUBLIC_NAVIGATION: PublicNavigationItem[] = [
  {
    label: "How Growth Works",
    href: "/how-growth-works",
  },
  {
    label: "Revenue Operating System",
    href: "/revenue-operating-system",
  },
  {
    label: "How MarketForge Works",
    href: "/how-marketforge-works",
  },
  {
    label: "Knowledge",
    href: "/knowledge",
  },
  {
    label: "Why MarketForge",
    href: "/why-marketforge",
  },
];

export const PUBLIC_HEADER_ACTIONS = {
  strategySession: {
    label: "Strategy Session",
    href: "/growth-strategy-session",
  },
  signUp: {
    label: "Sign Up",
    href: "/sign-up",
  },
  signIn: {
    label: "Sign In",
    href: "/sign-in",
  },
} as const;

export const PUBLIC_PRIMARY_CTA = {
  label: "See MarketForge on My Business",
  href: "/growth-strategy-session",
} as const;
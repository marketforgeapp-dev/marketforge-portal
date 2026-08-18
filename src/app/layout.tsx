import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Geist_Mono } from "next/font/google";

import { PUBLIC_SITE_CONFIG } from "@/lib/public-site/site-config";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_CONFIG.url),

  title: {
    default: PUBLIC_SITE_CONFIG.defaultTitle,
    template: `%s | ${PUBLIC_SITE_CONFIG.name}`,
  },

  description: PUBLIC_SITE_CONFIG.defaultDescription,

  openGraph: {
    type: "website",
    siteName: PUBLIC_SITE_CONFIG.name,
    title: PUBLIC_SITE_CONFIG.defaultTitle,
    description: PUBLIC_SITE_CONFIG.defaultDescription,
    url: PUBLIC_SITE_CONFIG.url,
  },

  twitter: {
    card: "summary_large_image",
    title: PUBLIC_SITE_CONFIG.defaultTitle,
    description: PUBLIC_SITE_CONFIG.defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body
          className={`${inter.variable} ${geistMono.variable} min-h-screen antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
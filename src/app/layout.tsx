import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";

import { TabBar } from "@/components/tab-bar";
import { TimezoneSync } from "@/components/timezone-sync";
import { getTimezone } from "@/lib/dates";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vision Board",
  description: "A functional vision board — outcomes, evidence, and the next action.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vision Board",
    statusBarStyle: "black-translucent",
  },
  // Stops iOS from turning numbers in goal text into tappable phone links.
  formatDetection: { telephone: false },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

// Every screen reads the live board, so nothing here is prerenderable.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Locking scale is what keeps the board from drifting when a field takes focus.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const timeZone = await getTimezone();

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      {/* h-dvh, not h-screen: Safari's toolbars change the visible height. */}
      <body className="flex h-dvh flex-col overflow-hidden">
        {children}
        <TabBar />
        <TimezoneSync current={timeZone} />
      </body>
    </html>
  );
}

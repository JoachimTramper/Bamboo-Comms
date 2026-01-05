import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bondi = localFont({
  src: "./fonts/Bondi.ttf",
  variable: "--font-bondi",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const inkFree = localFont({
  src: "./fonts/InkFree.ttf",
  variable: "--font-ink-free",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"
  ),

  title: {
    default: "Bamboo Comms",
    template: "%s · Bamboo Comms",
  },
  description:
    "A channel-based chat app with direct messages and BambooBob, your AI assistant.",
  applicationName: "Bamboo Comms",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Bamboo Comms",
    description:
      "A channel-based chat app with direct messages and BambooBob, your AI assistant.",
    siteName: "Bamboo Comms",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bamboo Comms – Chat with BambooBob",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bamboo Comms",
    description:
      "A channel-based chat app with direct messages and BambooBob, your AI assistant.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} ${inkFree.variable} ${bondi.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}

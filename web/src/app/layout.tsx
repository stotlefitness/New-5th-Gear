import type { Metadata } from "next";
import { Inter, Roboto_Mono, Space_Grotesk } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "5th Gear Pitching | Elite Pitching Coaching Platform",
    template: "%s | 5th Gear Pitching",
  },
  description:
    "Transform your pitching game with elite coaching from Coach Alaina. Book sessions, download free pitching guides, and unlock your potential.",
  keywords: [
    "softball pitching coach",
    "pitching lessons",
    "5th Gear Pitching",
    "Coach Alaina",
    "softball pitching drills",
  ],
  authors: [{ name: "5th Gear Pitching" }],
  creator: "5th Gear Pitching",
  publisher: "5th Gear Pitching",
  category: "sports",
  openGraph: {
    siteName: "5th Gear Pitching",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/softball-hero.jpg",
        width: 1200,
        height: 630,
        alt: "5th Gear Pitching softball coaching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "5th Gear Pitching | Elite Softball Pitching Coaching",
    description:
      "Personalized pitching coaching and free downloadable guides for athletes and parents.",
    images: ["/softball-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interSans.variable} ${mono.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

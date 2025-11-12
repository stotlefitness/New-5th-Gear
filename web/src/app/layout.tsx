import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const mono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elevate - Master Your Pitching Skills",
  description: "Transform your pitching game with world-class coaching. Book personalized lessons and elevate your performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interSans.variable} ${mono.variable} antialiased`}>
        <Navigation />
        <main className="pt-20 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

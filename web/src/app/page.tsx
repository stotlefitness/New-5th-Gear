import type { Metadata } from "next";
import Link from "next/link";
import HomeAuthGate from "@/components/HomeAuthGate";
import JsonLd from "@/components/JsonLd";
import MarketingNav from "@/components/MarketingNav";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "5th Gear Pitching | Elite Softball Pitching Coaching",
  },
  description:
    "5th Gear Pitching delivers elite softball pitching coaching with Coach Alaina—personalized lessons, mechanics training, and free downloadable guides for athletes and parents.",
  keywords: [
    "softball pitching coach",
    "pitching lessons",
    "softball pitching mechanics",
    "youth pitching coach",
    "5th Gear Pitching",
    "Coach Alaina",
    "free pitching guides",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "5th Gear Pitching | Elite Softball Pitching Coaching",
    description:
      "Elite softball pitching coaching and free resources to improve mechanics, velocity, control, and the mental game.",
    url: "/",
    type: "website",
  },
};

export default function Home() {
  const siteUrl = getSiteUrl();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "5th Gear Pitching",
      url: siteUrl,
      description:
        "Elite softball pitching coaching platform with personalized lessons and free training resources.",
      publisher: {
        "@type": "Organization",
        name: "5th Gear Pitching",
        url: siteUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      name: "5th Gear Pitching",
      url: siteUrl,
      description:
        "Softball pitching coaching for athletes who want better mechanics, velocity, control, and confidence.",
      sport: "Softball",
      coach: {
        "@type": "Person",
        name: "Coach Alaina",
        jobTitle: "Pitching Coach",
      },
      offers: {
        "@type": "Offer",
        name: "Private pitching coaching",
        url: `${siteUrl}/signup`,
        availability: "https://schema.org/InStock",
      },
    },
  ];

  return (
    <HomeAuthGate>
      <JsonLd data={jsonLd} />
      <div className="page">
        <MarketingNav active="home" />

        <main className="hero">
          <div className="hero-overlay" />
          <div className="hero-content">
            <h1 className="hero-title">
              The coaching proven
              <br />
              to build better pitchers
            </h1>
            <p className="hero-subtitle">
              5th Gear combines elite coaching with personalized training to help
              you improve your mechanics, velocity, and control — starting day
              one.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary hero-cta">
                Get Started
              </Link>
              <Link href="/resources" className="btn btn-ghost hero-cta">
                Free Resources
              </Link>
            </div>
          </div>
        </main>

        <footer className="marketing-footer">
          <p>
            5th Gear Pitching offers personalized softball pitching lessons and
            free guides on drills, warm-ups, recruiting, mental toughness, and
            parent support.
          </p>
          <nav aria-label="Footer">
            <Link href="/resources">Resources</Link>
            <Link href="/login">Sign In</Link>
            <Link href="/signup">Join Now</Link>
          </nav>
        </footer>
      </div>
    </HomeAuthGate>
  );
}

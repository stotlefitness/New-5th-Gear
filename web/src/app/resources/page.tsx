import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import MarketingNav from "@/components/MarketingNav";
import {
  formatResourceDate,
  getResourcePdfPath,
  resources,
} from "@/lib/resources";
import { getSiteUrl } from "@/lib/site";

const faqs = [
  {
    question: "Are these pitching guides really free?",
    answer:
      "Yes. Every guide on the Resources page is a free PDF download from 5th Gear Pitching—no account required to download.",
  },
  {
    question: "Who are these resources for?",
    answer:
      "Athletes, parents, and families looking for practical softball pitching help—drills, warm-ups, recruiting, mental game, and parent support tips.",
  },
  {
    question: "Can I get coaching beyond the free guides?",
    answer:
      "Yes. Create an account to book personalized pitching lessons with Coach Alaina through 5th Gear Pitching.",
  },
];

export const metadata: Metadata = {
  title: "Free Pitching Resources & Guides",
  description:
    "Download free softball pitching guides from 5th Gear Pitching—drills, warm-up checklists, mental game tips, recruiting advice, and parent support resources.",
  keywords: [
    "free pitching guides",
    "softball pitching resources",
    "pitching drills PDF",
    "college softball recruiting guide",
    "pitching mental game",
    "5th Gear Pitching",
  ],
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Free Pitching Resources & Guides | 5th Gear Pitching",
    description:
      "Expert pitching guides and downloadable PDFs for athletes and parents—drills, warm-ups, recruiting, mental game, and more.",
    url: "/resources",
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
    title: "Free Pitching Resources & Guides | 5th Gear Pitching",
    description:
      "Download free softball pitching guides—drills, warm-ups, recruiting, mental game, and parent tips.",
    images: ["/softball-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ResourcesPage() {
  const siteUrl = getSiteUrl();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "5th Gear Pitching Resources",
      description:
        "Free downloadable pitching guides and resources for softball athletes and parents.",
      url: `${siteUrl}/resources`,
      isPartOf: {
        "@type": "WebSite",
        name: "5th Gear Pitching",
        url: siteUrl,
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: resources.map((resource, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteUrl}/resources/${resource.slug}`,
          name: resource.title,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resources",
          item: `${siteUrl}/resources`,
        },
      ],
    },
  ];

  return (
    <div className="resources-page">
      <JsonLd data={jsonLd} />
      <MarketingNav active="resources" />

      <main className="resources-main">
        <header className="resources-header">
          <p className="resources-label">Free downloads</p>
          <h1 className="resources-title">Pitching Resources</h1>
          <p className="resources-subtitle">
            Expert guides and drills from 5th Gear Pitching—built for athletes
            and parents who want clear, actionable training between lessons.
          </p>
        </header>

        <section className="resources-list" aria-label="Resource guides">
          {resources.map((resource) => (
            <article key={resource.slug} className="resource-row">
              <div className="resource-row-body">
                <div className="resource-meta">
                  <span>{resource.category}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={resource.publishedAt}>
                    {formatResourceDate(resource.publishedAt)}
                  </time>
                </div>
                <h2 className="resource-row-title">
                  <Link href={`/resources/${resource.slug}`}>
                    {resource.title}
                  </Link>
                </h2>
                <p className="resource-row-desc">{resource.description}</p>
              </div>
              <div className="resource-row-actions">
                <Link
                  href={`/resources/${resource.slug}`}
                  className="btn btn-ghost resource-btn"
                >
                  View
                </Link>
                <a
                  href={getResourcePdfPath(resource)}
                  download={resource.fileName}
                  className="btn btn-outline resource-btn"
                >
                  Download
                </a>
              </div>
            </article>
          ))}
        </section>

        <section className="resources-faq" aria-labelledby="resources-faq-heading">
          <h2 id="resources-faq-heading" className="resources-faq-title">
            Frequently asked questions
          </h2>
          <div className="resources-faq-list">
            {faqs.map((faq) => (
              <div key={faq.question} className="resources-faq-item">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="resources-cta">
          <p className="resources-cta-copy">
            Want personalized coaching with Coach Alaina?
          </p>
          <Link href="/signup" className="btn btn-primary resource-cta-btn">
            Get Started
          </Link>
        </section>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import MarketingNav from "@/components/MarketingNav";
import {
  formatResourceDate,
  getResourceBySlug,
  getResourcePdfPath,
  resources,
} from "@/lib/resources";
import { getSiteUrl } from "@/lib/site";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return resources.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resource = getResourceBySlug(params.slug);
  if (!resource) {
    return { title: "Resource Not Found" };
  }

  const url = `/resources/${resource.slug}`;

  return {
    title: resource.title,
    description: resource.longDescription,
    keywords: resource.keywords,
    alternates: {
      canonical: url,
    },
    authors: [{ name: "Coach Alaina" }, { name: "5th Gear Pitching" }],
    openGraph: {
      title: `${resource.title} | 5th Gear Pitching`,
      description: resource.description,
      url,
      type: "article",
      publishedTime: resource.publishedAt,
      modifiedTime: resource.updatedAt,
      images: [
        {
          url: "/softball-hero.jpg",
          width: 1200,
          height: 630,
          alt: resource.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${resource.title} | 5th Gear Pitching`,
      description: resource.description,
      images: ["/softball-hero.jpg"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function ResourceDetailPage({ params }: PageProps) {
  const resource = getResourceBySlug(params.slug);
  if (!resource) notFound();

  const siteUrl = getSiteUrl();
  const pdfPath = getResourcePdfPath(resource);
  const pageUrl = `${siteUrl}/resources/${resource.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      name: resource.title,
      description: resource.longDescription,
      url: pageUrl,
      encodingFormat: "application/pdf",
      datePublished: resource.publishedAt,
      dateModified: resource.updatedAt,
      keywords: resource.keywords.join(", "),
      author: {
        "@type": "Person",
        name: "Coach Alaina",
        jobTitle: "Pitching Coach",
        worksFor: {
          "@type": "Organization",
          name: "5th Gear Pitching",
          url: siteUrl,
        },
      },
      publisher: {
        "@type": "Organization",
        name: "5th Gear Pitching",
        url: siteUrl,
      },
      about: resource.category,
      encoding: {
        "@type": "MediaObject",
        contentUrl: `${siteUrl}${pdfPath}`,
        encodingFormat: "application/pdf",
      },
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
        {
          "@type": "ListItem",
          position: 3,
          name: resource.title,
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <div className="resources-page">
      <JsonLd data={jsonLd} />
      <MarketingNav active="resources" />

      <main className="resources-main resources-detail">
        <nav className="resources-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/resources">Resources</Link>
          <span aria-hidden="true">/</span>
          <span>{resource.title}</span>
        </nav>

        <header className="resources-header">
          <p className="resources-label">{resource.category}</p>
          <h1 className="resources-title">{resource.title}</h1>
          <p className="resource-detail-meta">
            <span>By Coach Alaina</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={resource.publishedAt}>
              Published {formatResourceDate(resource.publishedAt)}
            </time>
            {resource.updatedAt !== resource.publishedAt && (
              <>
                <span aria-hidden="true"> · </span>
                <time dateTime={resource.updatedAt}>
                  Updated {formatResourceDate(resource.updatedAt)}
                </time>
              </>
            )}
            <span aria-hidden="true"> · </span>
            <span>PDF download</span>
          </p>
          <p className="resources-subtitle">{resource.longDescription}</p>
        </header>

        <div className="resource-detail-actions">
          <a
            href={pdfPath}
            download={resource.fileName}
            className="btn btn-primary resource-cta-btn"
          >
            Download PDF
          </a>
          <a
            href={pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline resource-btn"
          >
            Open in browser
          </a>
        </div>

        <section className="resource-detail-panel">
          <h2 className="resource-detail-panel-title">What&apos;s inside</h2>
          <ul className="resource-detail-list">
            <li>Clear, coach-backed guidance you can use right away</li>
            <li>Practical steps for athletes, parents, or both</li>
            <li>A free PDF you can save, print, and share</li>
          </ul>
        </section>

        <section className="resources-cta">
          <p className="resources-cta-copy">
            Ready for 1-on-1 coaching built around your game?
          </p>
          <Link href="/signup" className="btn btn-primary resource-cta-btn">
            Get Started
          </Link>
        </section>
      </main>
    </div>
  );
}

import { resources, getResourcePdfPath } from "@/lib/resources";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const siteUrl = getSiteUrl();

  const resourceLines = resources
    .map(
      (r) =>
        `- [${r.title}](${siteUrl}/resources/${r.slug}): ${r.description}`
    )
    .join("\n");

  const pdfLines = resources
    .map((r) => `- ${siteUrl}${getResourcePdfPath(r)}`)
    .join("\n");

  const body = `# 5th Gear Pitching

> Elite softball pitching coaching with Coach Alaina. Personalized lessons plus free downloadable guides for athletes and parents.

5th Gear Pitching helps softball pitchers improve mechanics, velocity, control, and the mental game through private coaching and free training resources.

## Primary pages

- [Home](${siteUrl}/): Overview of 5th Gear Pitching coaching
- [Resources](${siteUrl}/resources): Free downloadable pitching guides (PDF)
- [Sign up](${siteUrl}/signup): Create an account to book coaching
- [Sign in](${siteUrl}/login): Existing athlete / parent login

## Free resources (PDF downloads)

${resourceLines}

## Direct PDF files

${pdfLines}

## About

5th Gear Pitching is a softball pitching coaching platform. Coach Alaina provides personalized training for athletes and families. Public content emphasizes practical pitching development, game prep, recruiting, mental performance, and parent support.

## Optional

- [Sitemap](${siteUrl}/sitemap.xml)
- [Robots](${siteUrl}/robots.txt)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

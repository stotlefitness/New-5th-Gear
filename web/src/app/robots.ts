import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = [
    "/dashboard",
    "/client/",
    "/availability",
    "/book",
    "/messages",
    "/requests",
    "/lessons",
    "/settings",
    "/complete-account",
    "/auth/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      // Explicitly welcome major AI / LLM crawlers to public content
      {
        userAgent: "GPTBot",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/resources", "/llms.txt"],
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

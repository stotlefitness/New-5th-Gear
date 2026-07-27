import type { MetadataRoute } from "next";
import { resources } from "@/lib/resources";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const resourceEntries: MetadataRoute.Sitemap = resources.map((resource) => ({
    url: `${siteUrl}/resources/${resource.slug}`,
    lastModified: resource.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...resourceEntries,
  ];
}

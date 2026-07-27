export type Resource = {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  fileName: string;
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  category: string;
  keywords: string[];
};

export const resources: Resource[] = [
  {
    slug: "5-key-pitching-drills",
    title: "5 Key Pitching Drills Guide",
    description:
      "Essential drills that form the foundation of great pitching mechanics.",
    longDescription:
      "Master the fundamentals with five high-impact pitching drills designed to improve mechanics, consistency, and control. This free downloadable guide from 5th Gear Pitching breaks down each drill so athletes and parents can train with purpose between lessons.",
    fileName: "5-key-pitching-drills-guide.pdf",
    publishedAt: "2025-08-19",
    updatedAt: "2025-08-19",
    category: "Drills",
    keywords: [
      "pitching drills",
      "softball pitching mechanics",
      "pitching training guide",
      "youth pitching drills",
    ],
  },
  {
    slug: "pre-game-warm-up-checklist",
    title: "Pre-Game Warm-up Checklist",
    description:
      "A comprehensive warm-up routine designed specifically for pitchers.",
    longDescription:
      "Get game-ready with a pitcher-specific warm-up checklist covering mobility, activation, and throw progression. Use this free PDF before practices and games to reduce injury risk and lock in a repeatable pre-game routine.",
    fileName: "pre-game-warm-up-checklist-guide.pdf",
    publishedAt: "2025-08-19",
    updatedAt: "2025-08-19",
    category: "Game Prep",
    keywords: [
      "pitcher warm up",
      "pre game pitching routine",
      "softball warm up checklist",
      "pitching injury prevention",
    ],
  },
  {
    slug: "college-recruiting-guide",
    title: "College Recruiting Guide Journey",
    description:
      "A practical walkthrough for navigating the college recruiting process step-by-step.",
    longDescription:
      "Navigate college softball recruiting with a clear, step-by-step journey guide. Learn how to approach outreach, showcase readiness, and stay organized through each stage of the recruiting process.",
    fileName: "college-recruiting-guide-journey.pdf",
    publishedAt: "2025-08-19",
    updatedAt: "2025-08-19",
    category: "Recruiting",
    keywords: [
      "college softball recruiting",
      "softball recruiting guide",
      "college pitching recruiting",
      "D1 softball recruiting",
    ],
  },
  {
    slug: "mental-game-guide",
    title: "Mental Game Guide",
    description:
      "Develop the mental toughness and focus to perform under pressure.",
    longDescription:
      "Build the mental side of pitching with practical tools for focus, confidence, and composure under pressure. This free mental game guide helps pitchers stay locked in between innings and in high-leverage moments.",
    fileName: "mental-game-guide.pdf",
    publishedAt: "2025-08-19",
    updatedAt: "2025-08-19",
    category: "Mental Game",
    keywords: [
      "pitching mental game",
      "softball mental toughness",
      "sports psychology pitching",
      "pitcher confidence",
    ],
  },
  {
    slug: "parent-guide-supporting-your-pitcher",
    title: "Parent Guide: Supporting Your Pitcher",
    description:
      "How to support your pitcher on and off the field—practical tips for parents.",
    longDescription:
      "Parents play a critical role in a pitcher's development. This free guide shares practical ways to support training, communication, and mindset so athletes can grow with confidence on and off the field.",
    fileName: "parent-guide-supporting-your-pitcher.pdf",
    publishedAt: "2025-08-19",
    updatedAt: "2025-08-19",
    category: "Parents",
    keywords: [
      "softball parent guide",
      "supporting youth pitchers",
      "parent tips pitching",
      "youth softball parents",
    ],
  },
];

export function getResourceBySlug(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}

export function getResourcePdfPath(resource: Resource): string {
  return `/resources/${resource.fileName}`;
}

export function formatResourceDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

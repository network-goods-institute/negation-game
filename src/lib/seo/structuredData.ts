interface BaseStructuredData {
  "@context": string;
  "@type": string;
}

interface ArticleStructuredData extends BaseStructuredData {
  "@type": "Article";
  headline: string;
  description: string;
  author: {
    "@type": "Person";
    name: string;
  };
  datePublished: string;
  dateModified?: string;
  url: string;
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: {
      "@type": "ImageObject";
      url: string;
    };
  };
}

interface DiscussionForumPostingStructuredData extends BaseStructuredData {
  "@type": "DiscussionForumPosting";
  headline: string;
  text: string;
  author: {
    "@type": "Person";
    name: string;
  };
  dateCreated: string;
  url: string;
  isPartOf: {
    "@type": "DiscussionForumPosting";
    name: string;
  };
}

export function generatePointStructuredData({
  content,
  author,
  createdAt,
  pointId,
  space,
  favor,
  domain,
}: {
  content: string;
  author: string;
  createdAt: Date;
  pointId: string;
  space: string;
  favor: number;
  domain: string;
}): DiscussionForumPostingStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline:
      content.length > 100 ? `${content.substring(0, 100)}...` : content,
    text: content,
    author: {
      "@type": "Person",
      name: author,
    },
    dateCreated: createdAt.toISOString(),
    url: `${domain}/s/${space}/${pointId}`,
    isPartOf: {
      "@type": "DiscussionForumPosting",
      name: `${space.charAt(0).toUpperCase() + space.slice(1)} Space - Negation Game`,
    },
  };
}

export function generateRationaleStructuredData({
  title,
  description,
  author,
  createdAt,
  lastUpdatedAt,
  rationaleId,
  space,
  domain,
}: {
  title: string;
  description: string;
  author: string;
  createdAt: Date;
  lastUpdatedAt?: Date;
  rationaleId: string;
  space: string;
  domain: string;
}): ArticleStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    author: {
      "@type": "Person",
      name: author,
    },
    datePublished: createdAt.toISOString(),
    dateModified: lastUpdatedAt?.toISOString(),
    url: `${domain}/s/${space}/rationale/${rationaleId}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${domain}/s/${space}/rationale/${rationaleId}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Negation Game",
      logo: {
        "@type": "ImageObject",
        url: `${domain}/img/negation-game.png`,
      },
    },
  };
}

export function generateBreadcrumbStructuredData({
  breadcrumbs,
  domain,
}: {
  breadcrumbs: Array<{ name: string; url: string }>;
  domain: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${domain}${crumb.url}`,
    })),
  };
}

export function generateFAQStructuredData({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) {
  return {
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
  };
}

export function generateHowToStructuredData({
  name,
  description,
  steps,
  domain,
  url,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; url?: string }>;
  domain: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: `${domain}${url}`,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url ? `${domain}${step.url}` : undefined,
    })),
  };
}

export function generateWebPageStructuredData({
  name,
  description,
  url,
  domain,
  breadcrumbs,
  datePublished,
  dateModified,
}: {
  name: string;
  description: string;
  url: string;
  domain: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  datePublished?: Date;
  dateModified?: Date;
}) {
  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${domain}${url}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${domain}${url}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Negation Game",
      logo: {
        "@type": "ImageObject",
        url: `${domain}/img/negation-game.png`,
      },
    },
  };

  if (datePublished) {
    structuredData.datePublished = datePublished.toISOString();
  }

  if (dateModified) {
    structuredData.dateModified = dateModified.toISOString();
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredData.breadcrumb = generateBreadcrumbStructuredData({
      breadcrumbs,
      domain,
    });
  }

  return structuredData;
}

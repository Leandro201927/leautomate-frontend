export type Component = {
  name: string;
  atomic_hierarchy: "atom" | "molecule" | "organism" | "template" | "page";
  custom_attrs?: Record<string, unknown>;
  seo?: {
    // JSON-LD basic structure
    "@context"?: "https://schema.org";
    "@type"?: string;
    name?: string;
    description?: string;
    url?: string;
    image?: string | { url: string; width?: number; height?: number };
    author?: { name: string; url?: string };
    datePublished?: string;
    dateModified?: string;
    [key: string]: unknown;
  };
  // subcomponents can be nested arbitrarily; keys that include `_component` denote child slots
  [key: string]: unknown;
};

export type FeaturedImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  formats: Array<"webp" | "avif" | "jpeg">;
  srcset: Array<{ w: number; url: string }>;
};

export type Page = {
  id: string;
  type: "landing-page" | "ecommerce" | "articles";
  slug: string;
  hreflang_alternates: Array<{ lang: string; url: string }>;
  language: string;
  title: string;
  meta_title: string;
  meta_description: string;
  canonical: string | null;
  noindex: boolean;
  nofollow: boolean;
  robots_extra: string;
  published_at: string;
  modified_at: string;
  author: { name: string; url: string; id: string };
  reading_time: number;
  featured_image: FeaturedImage;
  open_graph: {
    og_title: string;
    og_description: string;
    og_image: FeaturedImage;
    og_type: "article" | "website" | "product";
    twitter_card: "summary" | "summary_large_image";
  };
  schema_org: Record<string, unknown>;
  breadcrumbs: Array<{ name: string; url: string }>;
  sitemap: { priority: number; changefreq: string };
  redirect_from: string[];
  components: Component[];
  content_text_summary: string;
  word_count: number;
  keyword_focus: string[];
  Components: Component[];
};

export type ClientWebsite = {
  id: string;
  name?: string;
  can_change_fields_on_bd: boolean;
  global_header?: {
    custom_header_elements?: string;
  } | null;
  pages: Page[];
};
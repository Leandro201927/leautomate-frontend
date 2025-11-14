import type { TypographyToken } from "@/types/clientWebsite";

type GoogleFont = {
  family: string;
  variants?: string[];
  category?: string;
};

const FALLBACK_FONTS: GoogleFont[] = [
  { family: "Inter" },
  { family: "Roboto" },
  { family: "Open Sans" },
  { family: "Montserrat" },
  { family: "Lato" },
  { family: "Poppins" },
];

export async function listGoogleFonts(): Promise<GoogleFont[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_FONTS_API_KEY as string | undefined;
  if (!apiKey) {
    return FALLBACK_FONTS;
  }
  try {
    const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Fonts API error: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.items)) {
      return data.items.map((it: any) => ({ family: it.family, variants: it.variants, category: it.category }));
    }
  } catch (_e) {
    // swallow and return fallback
  }
  return FALLBACK_FONTS;
}

export async function ensureFontLoaded(family: string, weights: number[] = [400]): Promise<void> {
  const id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (typeof document !== "undefined") {
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    const base = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@`;
    const suffix = `&display=swap`;
    const desiredSet = new Set(weights.map((w) => String(w)));

    if (!existing) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      const wParam = Array.from(desiredSet).sort().join(";");
      link.href = `${base}${wParam}${suffix}`;
      document.head.appendChild(link);
      await new Promise((r) => setTimeout(r, 150));
    } else {
      try {
        const href = existing.href || "";
        const match = href.match(/:wght@([^&]+)/);
        const current = match ? match[1].split(";").filter(Boolean) : [];
        const union = new Set([...current, ...Array.from(desiredSet)]);
        const wParam = Array.from(union).sort().join(";");
        const newHref = `${base}${wParam}${suffix}`;
        if (existing.href !== newHref) {
          existing.href = newHref;
          await new Promise((r) => setTimeout(r, 150));
        }
      } catch (_e) {
        // In case of parsing error, fallback to adding a new link element
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        const wParam = Array.from(desiredSet).sort().join(";");
        link.href = `${base}${wParam}${suffix}`;
        document.head.appendChild(link);
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }
}

export function tokenToStyle(token: TypographyToken): React.CSSProperties {
  return {
    fontFamily: token.font_family,
    fontWeight: token.weight ?? 400,
    fontSize: `${token.size_px}px`,
    letterSpacing: token.letter_spacing_px ? `${token.letter_spacing_px}px` : undefined,
    lineHeight: token.line_height_percent ? `${token.line_height_percent}%` : undefined,
  } as React.CSSProperties;
}
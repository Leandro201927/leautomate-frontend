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
    if (!document.getElementById(id)) {
      const wParam = weights.sort().join(";");
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${wParam}&display=swap`;
      document.head.appendChild(link);
      // wait a tick to allow CSS to load
      await new Promise((r) => setTimeout(r, 150));
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
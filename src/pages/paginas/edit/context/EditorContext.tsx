import React, { createContext, useContext, useMemo, useState } from "react";
import type { ClientWebsite, Page, Component, TypographyScale, TypographyToken } from "@/types/clientWebsite";
import { ensureFontLoaded } from "@/services/fontsService";
import { getClientWebsite } from "@/services/clientWebsites";

type EditorState = {
  site: ClientWebsite | null;
  selectedPageId: string | null;
  selectedComponentPath: string[]; // path of keys to nested component
  loading: boolean;
  error?: string;
};

type EditorActions = {
  loadSite: (id: string) => Promise<void>;
  selectPage: (pageId: string | null) => void;
  selectComponentPath: (path: string[]) => void;
  updatePage: (pageId: string, patch: Partial<Page>) => void;
  updateComponentAttrs: (pageId: string, path: string[], patch: Record<string, unknown>) => void;
  addPage: (type: Page["type"]) => void;
  addComponentToPage: (pageId: string) => void;
  addComponentToPageFromLibrary: (pageId: string, component: Component) => void;
  // Typography actions
  updateGlobalTypographyToken: (tag: keyof TypographyScale, patch: Partial<TypographyToken>) => void;
  updatePageTypographyToken: (pageId: string, tag: keyof TypographyScale, patch: Partial<TypographyToken>) => void;
  updateComponentTypographyToken: (
    pageId: string,
    path: string[],
    tag: keyof TypographyScale,
    patch: Partial<TypographyToken>
  ) => void;
  loadGoogleFontFamily: (family: string) => Promise<void>;
};

const EditorContext = createContext<{ state: EditorState; actions: EditorActions } | undefined>(
  undefined
);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EditorState>({
    site: null,
    selectedPageId: null,
    selectedComponentPath: [],
    loading: false,
  });

  console.log('EditorProvider', state);

  const actions: EditorActions = useMemo(
    () => ({
      async loadSite(id: string) {
        setState((s) => ({ ...s, loading: true, error: undefined }));
        const site = await getClientWebsite(id);
        if (!site) {
          setState((s) => ({ ...s, loading: false, error: "No se pudo cargar el sitio" }));
          return;
        }
        // Initialize default typography if missing
        const defaultScale: TypographyScale = {
          h1: { font_family: "Inter", weight: 700, size_px: 36, line_height_percent: 120 },
          h2: { font_family: "Inter", weight: 600, size_px: 30, line_height_percent: 120 },
          h3: { font_family: "Inter", weight: 600, size_px: 24, line_height_percent: 120 },
          h4: { font_family: "Inter", weight: 500, size_px: 20, line_height_percent: 120 },
          h5: { font_family: "Inter", weight: 500, size_px: 18, line_height_percent: 120 },
          h6: { font_family: "Inter", weight: 500, size_px: 16, line_height_percent: 120 },
          p: { font_family: "Inter", weight: 400, size_px: 16, line_height_percent: 140 },
          span: { font_family: "Inter", weight: 400, size_px: 14, line_height_percent: 120 },
        };
        const siteWithTypography: ClientWebsite = {
          ...site,
          typography: site.typography ?? { global: defaultScale, loaded_fonts: ["Inter"] },
        };
        setState({ site: siteWithTypography, selectedPageId: site.pages?.[0]?.id ?? null, selectedComponentPath: [], loading: false });
      },
      selectPage(pageId) {
        setState((s) => ({ ...s, selectedPageId: pageId, selectedComponentPath: [] }));
      },
      selectComponentPath(path) {
        setState((s) => ({ ...s, selectedComponentPath: path }));
      },
      updatePage(pageId, patch) {
        setState((s) => {
          if (!s.site) return s;
          const pages = s.site.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
          return { ...s, site: { ...s.site, pages } };
        });
      },
      updateComponentAttrs(pageId, path, patch) {
        setState((s) => {
          if (!s.site) return s;
          const pageIndex = s.site.pages.findIndex((p) => p.id === pageId);
          if (pageIndex === -1) return s;
          const page = s.site.pages[pageIndex];
          const newPage = { ...page };

          // Navigate path through nested `_component` keys
          let target: any = newPage;
          for (const key of path) {
            if (target && key in target) target = (target as any)[key];
          }
          if (target && typeof target === "object") {
            const current = (target as Component).custom_attrs ?? {};
            (target as Component).custom_attrs = { ...current, ...patch };
          }

          const pages = s.site.pages.slice();
          pages[pageIndex] = newPage;
          return { ...s, site: { ...s.site, pages } };
        });
      },
      addPage(type) {
        setState((s) => {
          if (!s.site) return s;
          const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Date.now()}`;
          const newPage: Page = {
            id: newId,
            type,
            slug: `nueva-pagina-${s.site.pages.length + 1}`,
            hreflang_alternates: [],
            language: "es",
            title: "Nueva página",
            meta_title: "",
            meta_description: "",
            canonical: null,
            noindex: false,
            nofollow: false,
            robots_extra: "",
            published_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            author: { name: "", url: "", id: "" },
            reading_time: 0,
            featured_image: { src: "", alt: "", width: 0, height: 0, formats: ["webp"], srcset: [] },
            open_graph: { og_title: "", og_description: "", og_image: { src: "", alt: "", width: 0, height: 0, formats: ["webp"], srcset: [] }, og_type: "website", twitter_card: "summary" },
            schema_org: {},
            breadcrumbs: [],
            sitemap: { priority: 0.5, changefreq: "monthly" },
            redirect_from: [],
            components: [],
            content_text_summary: "",
            word_count: 0,
            keyword_focus: [],
            Components: [],
          };
          const pages = [...s.site.pages, newPage];
          return { ...s, site: { ...s.site, pages }, selectedPageId: newId };
        });
      },
      addComponentToPage(pageId) {
        setState((s) => {
          if (!s.site) return s;
          const pageIndex = s.site.pages.findIndex((p) => p.id === pageId);
          if (pageIndex === -1) return s;
          const page = s.site.pages[pageIndex];
          const newComp: Component = {
            name: "Nuevo componente",
            atomic_hierarchy: "organism",
            custom_attrs: {},
          };
          const updatedPage: Page = { ...page, components: [...(page.components || []), newComp] };
          const pages = s.site.pages.slice();
          pages[pageIndex] = updatedPage;
          return { ...s, site: { ...s.site, pages } };
        });
      },
      addComponentToPageFromLibrary(pageId, component) {
        setState((s) => {
          if (!s.site) return s;
          const pageIndex = s.site.pages.findIndex((p) => p.id === pageId);
          if (pageIndex === -1) return s;
          const page = s.site.pages[pageIndex];
          const updatedPage: Page = { ...page, components: [...(page.components || []), component] };
          const pages = s.site.pages.slice();
          pages[pageIndex] = updatedPage;
          return { ...s, site: { ...s.site, pages } };
        });
      },
      updateGlobalTypographyToken(tag, patch) {
        setState((s) => {
          if (!s.site?.typography) return s;
          const current = s.site.typography.global[tag];
          const updated: TypographyToken = { ...current, ...patch };
          return {
            ...s,
            site: {
              ...s.site,
              typography: {
                ...s.site.typography,
                global: { ...s.site.typography.global, [tag]: updated },
              },
            },
          };
        });
      },
      updatePageTypographyToken(pageId, tag, patch) {
        setState((s) => {
          if (!s.site) return s;
          const pages = s.site.pages.map((p) => {
            if (p.id !== pageId) return p;
            const override = p.typography_override ?? {};
            const current = override[tag] ?? s.site!.typography!.global[tag];
            const updated: TypographyToken = { ...current, ...patch };
            return { ...p, typography_override: { ...override, [tag]: updated } };
          });
        
          return { ...s, site: { ...s.site, pages } };
        });
      },
      updateComponentTypographyToken(pageId, path, tag, patch) {
        setState((s) => {
          if (!s.site) return s;
          const pageIndex = s.site.pages.findIndex((p) => p.id === pageId);
          if (pageIndex === -1) return s;
          const page = s.site.pages[pageIndex];
          const newPage = { ...page };

          // Navigate path through nested keys to find target component
          let target: any = newPage;
          for (const key of path) {
            if (target && key in target) target = (target as any)[key];
          }
          if (target && typeof target === "object") {
            const comp = target as Component;
            const override = comp.typography_override ?? {};
            const current = (override as any)[tag] ?? s.site!.typography!.global[tag];
            const updated: TypographyToken = { ...current, ...patch };
            comp.typography_override = { ...override, [tag]: updated } as Partial<TypographyScale>;
          }

          const pages = s.site.pages.slice();
          pages[pageIndex] = newPage;
          return { ...s, site: { ...s.site, pages } };
        });
      },
      async loadGoogleFontFamily(family) {
        // Load common weights to avoid flashes when switching
        await ensureFontLoaded(family, [400, 500, 600, 700]);
        setState((s) => {
          if (!s.site) return s;
          const loaded = new Set([...(s.site.typography?.loaded_fonts ?? [])]);
          loaded.add(family);
          return {
            ...s,
            site: {
              ...s.site,
              typography: {
                global: s.site.typography?.global ?? {
                  h1: { font_family: family, weight: 700, size_px: 36 },
                  h2: { font_family: family, weight: 600, size_px: 30 },
                  h3: { font_family: family, weight: 600, size_px: 24 },
                  h4: { font_family: family, weight: 500, size_px: 20 },
                  h5: { font_family: family, weight: 500, size_px: 18 },
                  h6: { font_family: family, weight: 500, size_px: 16 },
                  p: { font_family: family, weight: 400, size_px: 16 },
                  span: { font_family: family, weight: 400, size_px: 14 },
                },
                loaded_fonts: Array.from(loaded),
              },
            },
          };
        });
      },
    }),
    []
  );

  return <EditorContext.Provider value={{ state, actions }}>{children}</EditorContext.Provider>;
};

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
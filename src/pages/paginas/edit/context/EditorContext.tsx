import React, { createContext, useContext, useMemo, useState } from "react";
import type { ClientWebsite, Page, Component } from "@/types/clientWebsite";
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

  const actions: EditorActions = useMemo(
    () => ({
      async loadSite(id: string) {
        setState((s) => ({ ...s, loading: true, error: undefined }));
        const site = await getClientWebsite(id);
        if (!site) {
          setState((s) => ({ ...s, loading: false, error: "No se pudo cargar el sitio" }));
          return;
        }
        setState({ site, selectedPageId: site.pages?.[0]?.id ?? null, selectedComponentPath: [], loading: false });
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
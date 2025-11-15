import React, { useEffect, useMemo, useState } from "react";
import type { Page, Component as ClientComponent, TypographyScale, TypographyToken } from "@/types/clientWebsite";
import { useEditor } from "../context/EditorContext";

type LibraryManifest = {
  name: string;
  nameComponent?: string;
  atomicHierarchy: ClientComponent["atomic_hierarchy"];
  custom_attrs?: Record<string, { type: string; value: unknown }>
};

type LibrarySample = {
  name: string;
  nameComponent?: string;
  atomicHierarchy: ClientComponent["atomic_hierarchy"];
  custom_attrs?: Record<string, { type: string; value: unknown }>
};

type LibraryItem = {
  name: string;
  basePath: string;
  load: (() => Promise<any>) | null;
};

function flattenCustomAttrs(attrs?: Record<string, { type: string; value: unknown }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(attrs || {}).forEach(([k, v]) => {
    out[k] = v?.value;
  });
  return out;
}

function mergeTokens(base: TypographyScale, override?: Partial<TypographyScale>): TypographyScale {
  return {
    h1: { ...base.h1, ...(override?.h1 ?? {}) },
    h2: { ...base.h2, ...(override?.h2 ?? {}) },
    h3: { ...base.h3, ...(override?.h3 ?? {}) },
    h4: { ...base.h4, ...(override?.h4 ?? {}) },
    h5: { ...base.h5, ...(override?.h5 ?? {}) },
    h6: { ...base.h6, ...(override?.h6 ?? {}) },
    p: { ...base.p, ...(override?.p ?? {}) },
    span: { ...base.span, ...(override?.span ?? {}) },
  };
}

function tokensToCss(tokens: TypographyScale): string {
  const cssFor = (tag: keyof TypographyScale, t: TypographyToken) => {
    const fam = t.font_family || "Inter";
    const w = t.weight || 400;
    const size = t.size_px || 14;
    const lh = t.line_height_percent ?? 120;
    return `.${"preview-engine"} ${tag} { font-family: '${fam}', sans-serif; font-weight: ${w}; font-size: ${size}px; line-height: ${lh}%; }`;
  };
  return [
    cssFor("h1", tokens.h1),
    cssFor("h2", tokens.h2),
    cssFor("h3", tokens.h3),
    cssFor("h4", tokens.h4),
    cssFor("h5", tokens.h5),
    cssFor("h6", tokens.h6),
    cssFor("p", tokens.p),
    cssFor("span", tokens.span),
  ].join("\n");
}

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

function ComponentRenderer({ name, attrs, libraryByName }: { name: string; attrs: Record<string, unknown>; libraryByName: Record<string, LibraryItem> }) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const item = libraryByName[name];
    if (!item || !item.load) {
      setComp(null);
      return;
    }
    let mounted = true;
    item.load().then((mod: any) => {
      if (!mounted) return;
      setComp(() => mod?.default ?? null);
    });
    return () => { mounted = false; };
  }, [name, libraryByName]);

  if (!libraryByName[name]) {
    return <div className="opacity-70 text-sm">Componente "{name}" no encontrado en la librería.</div>;
  }
  if (!Comp) {
    return <div className="opacity-70 text-sm">Cargando componente "{name}"…</div>;
  }
  return <Comp {...attrs} />;
}

export default function PreviewWebpageEngine({ page }: { page?: Page | null }) {
  const { state, actions } = useEditor();

  const dataModules = import.meta.glob("/src/library/**/data.ts", { eager: true });
  const componentModules = useMemo(() => ({
    ...import.meta.glob("/src/library/**/index.tsx"),
    ...import.meta.glob("/src/library/**/index.ts"),
  }), []);

  // Índice por nombre -> item
  const libraryByName = useMemo(() => {
    const out: Record<string, LibraryItem> = {};
    Object.entries(dataModules).forEach(([path, mod]) => {
      const m = mod as unknown as { manifest?: LibraryManifest; sample?: LibrarySample };
      const manifest = m.manifest;
      const sample = m.sample;
      const name = manifest?.name ?? sample?.name ?? path.split("/").slice(-2, -1)[0];
      const basePath = path.replace(/\/data\.ts$/, "");
      const indexPathTsx = `${basePath}/index.tsx`;
      const indexPathTs = `${basePath}/index.ts`;
      const load = (componentModules as Record<string, () => Promise<any>>)[indexPathTsx] || (componentModules as Record<string, () => Promise<any>>)[indexPathTs] || null;
      out[name] = { name, basePath, load };
    });
    return out;
  }, [dataModules, componentModules]);

  // Tokens y fuentes
  const globalTokens = state.site?.typography?.global ?? defaultScale;
  const pageTokens = mergeTokens(globalTokens, page?.typography_override);

  const fontsUsed = useMemo(() => {
    const fams = new Set<string>();
    Object.values(pageTokens).forEach((t) => {
      if (t.font_family) fams.add(t.font_family);
    });
    return Array.from(fams);
  }, [pageTokens]);

  useEffect(() => {
    const already = new Set(state.site?.typography?.loaded_fonts ?? []);
    fontsUsed.forEach((family) => {
      if (!already.has(family)) actions.loadGoogleFontFamily(family);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsUsed.join("|"), state.site?.typography?.loaded_fonts]);

  const css = useMemo(() => tokensToCss(pageTokens), [pageTokens]);

  if (!page) {
    return <div className="p-4 opacity-70 text-sm">Selecciona o crea una página para previsualizar.</div>;
  }

  const components = page.components || [];

  return (
    <div className="preview-engine w-full h-full">
      <style>{css}</style>
      <div className="space-y-4">
        {components.length === 0 && (
          <div className="opacity-70 text-sm text-center">Esta página no tiene componentes aún.</div>
        )}
        {components.map((c: ClientComponent, idx: number) => (
          <div key={idx} className="">
            <ComponentRenderer
              name={c.name}
              attrs={c.custom_attrs ?? {}}
              libraryByName={libraryByName}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
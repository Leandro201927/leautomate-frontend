import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { EditorProvider, useEditor } from "./context/EditorContext";
import type { Component } from "@/types/clientWebsite";
import { Card, CardBody, Button, Divider, Input, Textarea, Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, CardHeader, Tab, Tabs } from "@heroui/react";
import type { LayoutOutletContext } from "@/layouts/default";
import { DesktopIcon, DeviceMobileIcon, DeviceTabletIcon, PhoneIcon, SquareHalfIcon, SquareIcon } from "@phosphor-icons/react";

function pathsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function ComponentsRecursive({ obj, path = [] }: { obj: any; path?: string[] }) {
  const { actions } = useEditor();
  const { state } = useEditor();

  const keys = Object.keys(obj || {});
  const childKeys = keys.filter((k) => k.includes("_component"));

  return (
    <div className="space-y-2">
      {childKeys.map((key, idx) => {
        const child = obj[key];
        const comp = child as Component;
        const currentPath = [...path, key];
        const isSelected = pathsEqual(state.selectedComponentPath, currentPath);
        return (
          <div key={key}>
            <div
              onClick={() => actions.selectComponentPath(currentPath)}
              className={(isSelected ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-2 rounded-md cursor-pointer"}
            >
              <div className="text-sm font-semibold">{comp?.name ?? key}</div>
            </div>
            <div className="mt-2">
              <ComponentsRecursive obj={child} path={currentPath} />
            </div>
            {idx < childKeys.length - 1 && <Divider className="my-2" />}
          </div>
        );
      })}
    </div>
  );
}

function getByPath(root: any, path: string[]) {
  let cur = root;
  for (const key of path) {
    if (cur == null) return undefined;
    const k = isNaN(Number(key)) ? key : Number(key);
    cur = (cur as any)[k];
  }
  return cur;
}

function PreviewControls({ mode, setMode }: { mode: "mobile" | "tablet" | "desktop"; setMode: (m: "mobile" | "tablet" | "desktop") => void }) {
  return (
    <Tabs aria-label="Options" color="primary" variant="bordered" defaultSelectedKey={mode}>
      <Tab
        className="px-2"
        key="mobile"
        onClick={() => setMode("mobile")}
        title={
          <DeviceMobileIcon />
        }
      />
      <Tab
        className="px-2"
        key="tablet"
        onClick={() => setMode("tablet")}
        title={
          <DeviceTabletIcon />
        }
      />
      <Tab
        className="px-2"
        key="desktop"
        onClick={() => setMode("desktop")}
        title={
          <DesktopIcon />
        }
      />
    </Tabs>
  );
}

function PanelsControls({ panelsMode, setPanelsMode }: { panelsMode: "none" | "left" | "right" | "both"; setPanelsMode: (m: "none" | "left" | "right" | "both") => void }) {
  return (
    <Tabs aria-label="Paneles" color="primary" variant="bordered" defaultSelectedKey={panelsMode}>
      <Tab className="px-2" key="none" title={<span className="text-xs"><SquareIcon /></span>} onClick={() => setPanelsMode("none")} />
      <Tab className="px-2" key="left" title={<span className="text-xs"><SquareHalfIcon weight="duotone" style={{ transform: "rotate(180deg)" }} /></span>} onClick={() => setPanelsMode("left")} />
      <Tab className="px-2" key="right" title={<span className="text-xs"><SquareHalfIcon weight="duotone" /></span>} onClick={() => setPanelsMode("right")} />
      <Tab className="px-2" key="both" title={<span className="text-xs"><SquareIcon weight="fill" /></span>} onClick={() => setPanelsMode("both")} />
    </Tabs>
  );
}

function EditorLayoutInner() {
  const { id } = useParams();
  const { state, actions } = useEditor();
  const { setHeaderRightSlot, setWidthToFullViewport } = useOutletContext<LayoutOutletContext>();
  const site = state.site;
  const page = site?.pages.find((p) => p.id === state.selectedPageId) ?? site?.pages[0];
  const selectedComponent = page && state.selectedComponentPath.length > 0
    ? (getByPath(page, state.selectedComponentPath) as Component | undefined)
    : undefined;

  const isPreviewFullscreen = true;
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageType, setNewPageType] = useState<"landing-page" | "articles" | "ecommerce">("landing-page");
  const [panelsMode, setPanelsMode] = useState<"none" | "left" | "right" | "both">("both");

  useEffect(() => {
    if (id) actions.loadSite(id);
  }, [id]);

  useEffect(() => {
    // Inject header controls on mount and update
    setHeaderRightSlot(
      <div className="flex items-center gap-2">
        <PreviewControls mode={previewMode} setMode={setPreviewMode} />
        <PanelsControls panelsMode={panelsMode} setPanelsMode={setPanelsMode} />
      </div>
    );
    return () => setHeaderRightSlot(undefined);
  }, [previewMode, panelsMode, setHeaderRightSlot]);

  // For editor, expand layout to full viewport width
  useEffect(() => {
    setWidthToFullViewport(true);
    return () => setWidthToFullViewport(false);
  }, [setWidthToFullViewport]);

  if (state.loading) return <div className="p-4">Cargando…</div>;
  if (state.error) return <div className="p-4 text-danger">{state.error}</div>;
  if (!site) return <div className="p-4">Sin datos del sitio</div>;

  // Compute preview container width by mode
  const previewWidthClass = previewMode === "mobile"
    ? "w-full max-w-[390px] mx-auto"
    : previewMode === "tablet"
      ? "w-full max-w-[768px] mx-auto"
      : "max-w-none";
  const leftVisible = panelsMode === "both" || panelsMode === "left";
  const rightVisible = panelsMode === "both" || panelsMode === "right";

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Columna izquierda (pages + components) */}
      <div
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] w-[320px] ${leftVisible ? "translate-x-0 bg-content1/70 border-r border-r-foreground/10" : "-translate-x-[80%] bg-gradient-to-r from-neutral-200 to-transparent dark:from-neutral-800 dark:to-transparent"} transition-transform duration-300 p-3 space-y-0 z-40 overflow-hidden`}
      >
        <div className={(leftVisible ? "opacity-100 flex flex-col" : "opacity-0") + " transition-opacity duration-300"}>
          {/* Pages list */}
          <Card className="bg-transparent shadow-none h-[calc((100vh-64px)/2)] flex flex-col overflow-hidden">
            <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
              <div className="font-semibold text-sm">Páginas</div>
              <Button size="sm" color="primary" onPress={() => setShowAddPageModal(true)}>Añadir página</Button>
            </CardHeader>
            <CardBody className="space-y-2 overflow-y-auto">
              {site.pages.length === 0 && (
                <div className="opacity-70 text-sm">No hay páginas aún. Crea la primera para comenzar.</div>
              )}
              {site.pages.map((pg, idx) => {
                const isSelected = pg.id === state.selectedPageId;
                return (
                  <div key={pg.id}>
                    <div
                      onClick={() => actions.selectPage(pg.id)}
                      className={(isSelected ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-3 rounded-md cursor-pointer"}
                    >
                      <div>
                        <div className="font-semibold text-sm">{pg.title || pg.slug}</div>
                        <div className="text-xs opacity-70">/{pg.slug} · {pg.type}</div>
                      </div>
                    </div>
                    {idx < site.pages.length - 1 && <Divider />}
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Divider />

          {/* Components tree (recursive) */}
          <Card className="bg-transparent shadow-none mt-4 h-full max-h-[calc((100vh-64px)/2)] flex flex-col">
            <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
              <div className="font-semibold text-sm">Componentes</div>
              <Button size="sm" color="primary" isDisabled={!page} onPress={() => page && actions.addComponentToPage(page.id)}>Añadir componente</Button>
            </CardHeader>
            <CardBody>
              {!page && (
                <div className="opacity-70 text-sm">Selecciona o crea una página para añadir componentes.</div>
              )}
              {page && (page.components || []).length === 0 && (
                <div className="opacity-70 text-sm mb-2">Esta página no tiene componentes.</div>
              )}
              {page && (page.components || []).map((c, idx) => {
                const currentPath = ["components", String(idx)];
                const isSelected = pathsEqual(state.selectedComponentPath, currentPath);
                return (
                  <div key={idx} className="mb-2">
                    <div
                      onClick={() => actions.selectComponentPath(currentPath)}
                      className={(isSelected ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-3 rounded-md cursor-pointer"}
                    >
                      <div className="font-semibold text-sm">{c.name}</div>
                    </div>
                    <div className="mt-2">
                      <ComponentsRecursive obj={c} path={currentPath} />
                    </div>
                    {idx < (page.components || []).length - 1 && <Divider className="my-2" />}
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Preview center */}
      <div className={"fixed inset-x-0 top-16 bottom-0 z-20"}>
        <Card className={(isPreviewFullscreen ? "h-full" : "h-[600px]") + " bg-foreground/10 shadow-none relative"}>
          {/* <CardHeader className="text-center">Preview</CardHeader> */}
          <CardBody>
            <div className={previewWidthClass + " h-full border border-dashed border-foreground/10 bg-background"}>
              {/* Aquí irá el iframe o el render del template en el modo elegido */}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Right panels */}
      <div
        className={`fixed right-0 top-16 h-[calc(100vh-64px)] w-[360px] ${rightVisible ? "border-l border-l-foreground/10 translate-x-0 bg-content1/70" : "translate-x-[80%] bg-gradient-to-l from-neutral-200 to-transparent dark:from-neutral-800 dark:to-transparent"} transition-transform duration-300 p-3 space-y-0 z-40 overflow-hidden`}
      >
        <div className={(rightVisible ? "opacity-100" : "opacity-0") + " transition-opacity duration-300"}>
          {/* Page properties (SEO) */}
          <Card className={"shadow-none bg-transparent h-[calc((100vh-64px)/2)] flex flex-col overflow-hidden"}> 
            <CardBody className={"space-y-2 text-sm " + (isPreviewFullscreen ? "overflow-y-auto" : "")}> 
              {!page ? (
                <div className="opacity-70">Crea una página para ver y editar sus propiedades SEO.</div>
              ) : (
                <>
                  <Input
                    label="title"
                    value={page.title}
                    onValueChange={(v) => actions.updatePage(page.id, { title: v })}
                  />
                  <Input
                    label="meta_title"
                    value={page.meta_title}
                    onValueChange={(v) => actions.updatePage(page.id, { meta_title: v })}
                  />
                  <Textarea
                    label="meta_description"
                    value={page.meta_description}
                    onValueChange={(v) => actions.updatePage(page.id, { meta_description: v })}
                  />
                  <Input
                    label="canonical"
                    value={page.canonical ?? ""}
                    onValueChange={(v) => actions.updatePage(page.id, { canonical: v })}
                  />
                  <Input
                    label="language"
                    value={page.language}
                    onValueChange={(v) => actions.updatePage(page.id, { language: v })}
                  />
                  <Input
                    label="keywords (coma-separadas)"
                    value={(page.keyword_focus || []).join(", ")}
                    onValueChange={(v) => actions.updatePage(page.id, { keyword_focus: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />

                  <Divider />
                  <div className="font-semibold">Robots</div>
                  <div className="flex gap-4 items-center">
                    <Switch isSelected={!!page.noindex} onValueChange={(val) => actions.updatePage(page.id, { noindex: !!val })}>noindex</Switch>
                    <Switch isSelected={!!page.nofollow} onValueChange={(val) => actions.updatePage(page.id, { nofollow: !!val })}>nofollow</Switch>
                  </div>
                  <Textarea
                    label="robots_extra"
                    value={page.robots_extra}
                    onValueChange={(v) => actions.updatePage(page.id, { robots_extra: v })}
                  />

                  <Divider />
                  <div className="font-semibold">Fechas</div>
                  <Input label="published_at" value={page.published_at} onValueChange={(v) => actions.updatePage(page.id, { published_at: v })} />
                  <Input label="modified_at" value={page.modified_at} onValueChange={(v) => actions.updatePage(page.id, { modified_at: v })} />

                  <Divider />
                  <div className="font-semibold">Autor</div>
                  <Input label="author.name" value={page.author?.name ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, name: v } })} />
                  <Input label="author.url" value={page.author?.url ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, url: v } })} />
                  <Input label="author.id" value={page.author?.id ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, id: v } })} />
                  <Input type="number" label="reading_time (min)" value={String(page.reading_time ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { reading_time: Number(v) || 0 })} />

                  <Divider />
                  <div className="font-semibold">Featured Image</div>
                  <Input label="featured_image.src" value={page.featured_image?.src ?? ""} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, src: v } })} />
                  <Input label="featured_image.alt" value={page.featured_image?.alt ?? ""} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, alt: v } })} />
                  <Input type="number" label="featured_image.width" value={String(page.featured_image?.width ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, width: Number(v) || 0 } })} />
                  <Input type="number" label="featured_image.height" value={String(page.featured_image?.height ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, height: Number(v) || 0 } })} />

                  <Divider />
                  <div className="font-semibold">Open Graph</div>
                  <Input label="open_graph.og_title" value={page.open_graph?.og_title ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_title: v } })} />
                  <Textarea label="open_graph.og_description" value={page.open_graph?.og_description ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_description: v } })} />
                  <Input label="open_graph.og_type" value={page.open_graph?.og_type ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_type: v as any } })} />
                  <Input label="open_graph.twitter_card" value={page.open_graph?.twitter_card ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, twitter_card: v as any } })} />
                  <Input label="open_graph.og_image.src" value={page.open_graph?.og_image?.src ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_image: { ...page.open_graph?.og_image, src: v } } })} />
                  <Input label="open_graph.og_image.alt" value={page.open_graph?.og_image?.alt ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_image: { ...page.open_graph?.og_image, alt: v } } })} />

                  <Divider />
                  <div className="font-semibold">Hreflang alternates</div>
                  <Textarea
                    label="lang|url; lang|url"
                    value={(page.hreflang_alternates || []).map(a => `${a.lang}|${a.url}`).join("; ")}
                    onValueChange={(v) => {
                      const items = v.split(";").map(s => s.trim()).filter(Boolean).map(pair => {
                        const [lang, url] = pair.split("|").map(x => x.trim());
                        return { lang: lang || "", url: url || "" };
                      });
                      actions.updatePage(page.id, { hreflang_alternates: items });
                    }}
                  />

                  <Divider />
                  <div className="font-semibold">Breadcrumbs</div>
                  <Textarea
                    label="name|url; name|url"
                    value={(page.breadcrumbs || []).map(b => `${b.name}|${b.url}`).join("; ")}
                    onValueChange={(v) => {
                      const items = v.split(";").map(s => s.trim()).filter(Boolean).map(pair => {
                        const [name, url] = pair.split("|").map((x) => x.trim());
                        return { name: name || "", url: url || "" };
                      });
                      actions.updatePage(page.id, { breadcrumbs: items });
                    }}
                  />

                  <Divider />
                  <div className="font-semibold">Sitemap</div>
                  <Input type="number" label="sitemap.priority" value={String(page.sitemap?.priority ?? 0.5)} onValueChange={(v) => actions.updatePage(page.id, { sitemap: { ...page.sitemap, priority: Number(v) || 0 } })} />
                  <Input label="sitemap.changefreq" value={page.sitemap?.changefreq ?? ""} onValueChange={(v) => actions.updatePage(page.id, { sitemap: { ...page.sitemap, changefreq: v } })} />

                  <Divider />
                  <div className="font-semibold">Redirects</div>
                  <Textarea label="redirect_from (coma-separadas)" value={(page.redirect_from || []).join(", ")}
                    onValueChange={(v) => actions.updatePage(page.id, { redirect_from: v.split(",").map(s => s.trim()).filter(Boolean) })}
                  />

                  <Divider />
                  <div className="font-semibold">Schema.org (JSON)</div>
                  <Textarea
                    label="schema_org"
                    value={JSON.stringify(page.schema_org ?? {}, null, 2)}
                    onBlur={(e) => {
                      try {
                        const json = JSON.parse(e.target.value);
                        actions.updatePage(page.id, { schema_org: json });
                      } catch {}
                    }}
                    onValueChange={() => { /* evitamos actualizar hasta blur para no romper while typing */ }}
                  />

                  <Divider />
                  <Input label="content_text_summary" value={page.content_text_summary ?? ""} onValueChange={(v) => actions.updatePage(page.id, { content_text_summary: v })} />
                  <Input type="number" label="word_count" value={String(page.word_count ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { word_count: Number(v) || 0 })} />
                </>
              )}
            </CardBody>
          </Card>

          <Divider className="my-1" />

          {/* Component properties (focused) */}
          <Card className={"bg-transparent shadow-none h-[calc((100vh-64px)/2)] flex flex-col overflow-hidden"}> 
            <CardBody className={"space-y-2 text-sm " + (isPreviewFullscreen ? "overflow-y-auto" : "")}> 
              <div className="opacity-70">JSON-LD (seo) del componente seleccionado:</div>
              <pre className="text-xs bg-content1/50 p-2 rounded">
{JSON.stringify({ "@context": "https://schema.org", "@type": "Thing" }, null, 2)}
              </pre>
              <Divider />
              {selectedComponent ? (
                <div>
                  <div className="font-semibold mb-1">custom_attrs</div>
                  <div className="space-y-1">
                    {Object.entries(selectedComponent.custom_attrs ?? {}).length === 0 ? (
                      <div className="opacity-70">Sin atributos personalizados.</div>
                    ) : (
                      Object.entries(selectedComponent.custom_attrs as Record<string, unknown>).map(([k, v]) => (
                        <Input
                          key={k}
                          label={k}
                          value={String(v ?? "")}
                          onValueChange={(val) => actions.updateComponentAttrs(page!.id, state.selectedComponentPath, { [k]: val })}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="opacity-70">Selecciona un componente para ver sus atributos.</div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Overlay eliminado: se reutiliza layout con columnas condicionadas por fullscreen */}

      {/* Modal para añadir página con tipo */}
      <Modal isOpen={showAddPageModal} onOpenChange={setShowAddPageModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Nueva página</ModalHeader>
              <ModalBody>
                <div className="flex gap-2">
                  <Button variant={newPageType === "landing-page" ? "solid" : "bordered"} onPress={() => setNewPageType("landing-page")}>landing-page</Button>
                  <Button variant={newPageType === "articles" ? "solid" : "bordered"} onPress={() => setNewPageType("articles")}>articles</Button>
                  <Button variant={newPageType === "ecommerce" ? "solid" : "bordered"} onPress={() => setNewPageType("ecommerce")}>ecommerce</Button>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={() => { actions.addPage(newPageType); onClose(); }}>Crear</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function PaginaEditPage() {
  return (
    <EditorProvider>
      <EditorLayoutInner />
    </EditorProvider>
  );
}
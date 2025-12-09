import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { EditorProvider, useEditor } from "./context/EditorContext";
import type { Component } from "@/types/clientWebsite";
import { Card, CardBody, Button, Input, Textarea, Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tab, Tabs, Accordion, AccordionItem, Chip } from "@heroui/react";
import type { LayoutOutletContext } from "@/layouts/default";
import { DesktopIcon, DeviceMobileIcon, DeviceTabletIcon, SquareHalfIcon, SquareIcon, FilesIcon, PuzzlePieceIcon, TextTIcon, PlusIcon, Trash as TrashIcon, KeyIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";
import AddComponentDialog from "./components/AddComponentDialog";
import TypographyPanel from "./components/TypographyPanel";
import type { TypographyScale } from "@/types/clientWebsite";
import PreviewWebpageEngine from "./components/PreviewWebpageEngine";
import { updateClientWebsite, saveCloudflareCredentials, exportClientWebsite, getCloudflareCredentials } from "@/services/paginas/paginasService";
import { listMedia, presignUpload, finalizeUpload, uploadDirect } from "@/services/mediaService";

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
            {/* Espaciado entre elementos del árbol */}
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
  useEffect(() => {
    console.log("DEBUG: EditorLayoutInner site changed", site?.global_components);
  }, [site]);
  const page = site?.pages.find((p) => p.id === state.selectedPageId) ?? site?.pages[0];
  const selectedComponent =
    state.selectedComponentPath.length > 0
      ? state.selectedComponentPath[0] === "global_components"
        ? (getByPath(site, state.selectedComponentPath) as Component | undefined)
        : page
          ? (getByPath(page, state.selectedComponentPath) as Component | undefined)
          : undefined
      : undefined;

  const isPreviewFullscreen = true;
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageType, setNewPageType] = useState<"landing-page" | "articles" | "ecommerce">("landing-page");
  const [panelsMode, setPanelsMode] = useState<"none" | "left" | "right" | "both">("both");
  const [showAddComponentDialog, setShowAddComponentDialog] = useState(false);
  const [addComponentTarget, setAddComponentTarget] = useState<{ type: 'page' } | { type: 'global'; slot: 'header' | 'footer' }>({ type: 'page' });
  const [selectSubComponentSlotKey, setSelectSubComponentSlotKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorValue, setNewColorValue] = useState("#000000");
  const [showExportModal, setShowExportModal] = useState(false);
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfApiToken, setCfApiToken] = useState("");
  const [pagesProject, setPagesProject] = useState("");
  const [pagesBuildHook, setPagesBuildHook] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showCredsSettingsModal, setShowCredsSettingsModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaItems, setMediaItems] = useState<{ key: string; url?: string; size?: number }[]>([]);
  const [activeAttrKey, setActiveAttrKey] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  
  const [r2Bucket, setR2Bucket] = useState("");
  const [r2AccessKey, setR2AccessKey] = useState("");
  const [r2SecretKey, setR2SecretKey] = useState("");
  const [r2PublicUrl, setR2PublicUrl] = useState("");
  const [hasCredsRecord, setHasCredsRecord] = useState(true);

  async function handleSave() {
    if (!site) return;
    try {
      setSaving(true);
      const gh = site.global_header ? {
        ...site.global_header,
        custom_header_elements: Array.isArray(site.global_header.custom_header_elements)
          ? site.global_header.custom_header_elements
          : (site.global_header.custom_header_elements ? [site.global_header.custom_header_elements] : undefined),
      } : null;
      const updated = await updateClientWebsite(site.id, {
        name: site.name,
        can_change_fields_on_bd: !!site.can_change_fields_on_bd,
        global_header: gh,
        pages: site.pages,
        // incluir design_tokens para persistir paleta de colores
        // el servicio acepta campos arbitrarios; añadimos este JSON
        // en el backend lo guardamos como JSON
        design_tokens: site.design_tokens ?? null,
        global_components: site.global_components ?? null,
      });
      setSaveMessage("Guardado");
      // refrescar el sitio desde backend para reflejar updated_at y normalizaciones
      actions.loadSite(site.id);
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      console.error("Error guardando sitio:", e);
      setSaveMessage("Error al guardar");
      setTimeout(() => setSaveMessage(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (id) actions.loadSite(id);
  }, [id]);

  useEffect(() => {
    // Inject header controls on mount and update
    setHeaderRightSlot(
      <div className="flex items-center gap-2">
        <PreviewControls mode={previewMode} setMode={setPreviewMode} />
        <PanelsControls panelsMode={panelsMode} setPanelsMode={setPanelsMode} />
        <Button color="primary" isLoading={saving} onPress={handleSave}>
          Guardar
        </Button>
        <Button variant="bordered" isLoading={exporting} onPress={() => setShowExportModal(true)}>Exportar</Button>
        {saveMessage && (
          <span className={saveMessage.includes("Error") ? "text-danger text-xs" : "text-success text-xs"}>{saveMessage}</span>
        )}
        {exportMessage && (
          <span className={exportMessage.includes("Error") ? "text-danger text-xs" : "text-success text-xs"}>{exportMessage}</span>
        )}
        <Button isIconOnly variant="light" aria-label="Credenciales" onPress={() => setShowCredsSettingsModal(true)}>
          <KeyIcon />
        </Button>
      </div>
    );
    return () => setHeaderRightSlot(undefined);
  }, [previewMode, panelsMode, saving, saveMessage, site, setHeaderRightSlot]);

  useEffect(() => {
    if (showExportModal && site) {
      setLoadingCreds(true);
      getCloudflareCredentials(site.id)
        .then((c) => {
          setCfAccountId(String(c.account_id || ""));
          setCfApiToken(String(c.api_token || ""));
          setPagesProject(String(c.pages_project || ""));
          setPagesBuildHook(String(c.pages_build_hook || ""));
          setSupabaseUrl(String(c.supabase_url || ""));
          setSupabaseAnonKey(String(c.supabase_anon_key || ""));
          setR2Bucket(String(c.r2_bucket || ""));
          setR2AccessKey(String(c.r2_access_key_id || ""));
          setR2SecretKey(String(c.r2_secret_access_key || ""));
          setR2PublicUrl(String(c.r2_public_url || ""));
        })
        .catch(() => {})
        .finally(() => setLoadingCreds(false));
    }
  }, [showExportModal, site]);

  useEffect(() => {
    if (showCredsSettingsModal && site) {
      setLoadingCreds(true);
      getCloudflareCredentials(site.id)
        .then((c) => {
          setCfAccountId(String(c.account_id || ""));
          setCfApiToken(String(c.api_token || ""));
          setPagesProject(String(c.pages_project || ""));
          setPagesBuildHook(String(c.pages_build_hook || ""));
          setSupabaseUrl(String(c.supabase_url || ""));
          setSupabaseAnonKey(String(c.supabase_anon_key || ""));
          setR2Bucket(String(c.r2_bucket || ""));
          setR2AccessKey(String(c.r2_access_key_id || ""));
          setR2SecretKey(String(c.r2_secret_access_key || ""));
          setR2PublicUrl(String(c.r2_public_url || ""));
          setHasCredsRecord(true);
        })
        .catch(() => { setHasCredsRecord(false); })
        .finally(() => setLoadingCreds(false));
    }
  }, [showCredsSettingsModal, site]);

  useEffect(() => {
    const fetchLib = async () => {
      if (!site || !libraryOpen) return;
      try {
        const items = await listMedia(site.id);
        setMediaItems(items as any);
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("Missing R2 credentials")) {
          try {
            const c = await getCloudflareCredentials(site.id);
            setHasCredsRecord(true);
            setR2Bucket(String(c.r2_bucket || ""));
            setR2AccessKey(String(c.r2_access_key_id || ""));
            setR2SecretKey(String(c.r2_secret_access_key || ""));
            setCfAccountId(String(c.account_id || ""));
            setCfApiToken(String(c.api_token || ""));
          } catch {
            setHasCredsRecord(false);
            setR2Bucket("");
            setR2AccessKey("");
            setR2SecretKey("");
          }
          setShowCredsSettingsModal(true);
        } else {
          setMediaItems([]);
        }
      }
    };
    fetchLib();
  }, [libraryOpen, site]);

  const onPickUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setUploadFile(f);
    setUploadPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onUploadFile = async () => {
    if (!site || !uploadFile) return;
    const key = `${Date.now()}_${uploadFile.name}`;
    try {
      const presigned = await presignUpload(site.id, key, uploadFile.type || undefined);
      await fetch(presigned.upload_url, { method: "PUT", headers: { "Content-Type": uploadFile.type || "application/octet-stream" }, body: uploadFile });
      await finalizeUpload(site.id, { key, size: uploadFile.size, content_type: uploadFile.type || undefined });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Missing R2 credentials")) {
        try {
          const c = await getCloudflareCredentials(site.id);
          setHasCredsRecord(true);
          setR2Bucket(String(c.r2_bucket || ""));
          setR2AccessKey(String(c.r2_access_key_id || ""));
          setR2SecretKey(String(c.r2_secret_access_key || ""));
          setCfAccountId(String(c.account_id || ""));
          setCfApiToken(String(c.api_token || ""));
        } catch {
          setHasCredsRecord(false);
        }
        setShowCredsSettingsModal(true);
        return;
      }
      try {
        await uploadDirect(site.id, key, uploadFile);
      } catch (e2) {
        return;
      }
    }
    setShowUpload(false);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    try { const items = await listMedia(site.id); setMediaItems(items as any); } catch { }
  };

  const onSaveCreds = async () => {
    if (!site || !r2Bucket || !r2AccessKey || !r2SecretKey) return;
    const payload: any = {
      client_website_id: site.id,
      r2_bucket: r2Bucket.trim(),
      r2_access_key_id: r2AccessKey.trim(),
      r2_secret_access_key: r2SecretKey.trim(),
    };
    if (!hasCredsRecord) {
      if (!cfAccountId || !cfApiToken) return;
      payload.account_id = cfAccountId.trim();
      payload.api_token = cfApiToken.trim();
    } else {
      payload.account_id = cfAccountId ? cfAccountId.trim() : undefined;
      payload.api_token = cfApiToken ? cfApiToken.trim() : undefined;
    }
    await saveCloudflareCredentials(payload);
    setShowCredsSettingsModal(false);
    try { const items = await listMedia(site.id); setMediaItems(items as any); } catch {}
  };

  const onSaveAllCreds = async () => {
    if (!site) return;
    const payload: any = {
      client_website_id: site.id,
      account_id: cfAccountId ? cfAccountId.trim() : undefined,
      api_token: cfApiToken ? cfApiToken.trim() : undefined,
      r2_bucket: r2Bucket ? r2Bucket.trim() : undefined,
      r2_access_key_id: r2AccessKey ? r2AccessKey.trim() : undefined,
      r2_secret_access_key: r2SecretKey ? r2SecretKey.trim() : undefined,
      r2_public_url: r2PublicUrl ? r2PublicUrl.trim() : undefined,
      supabase_url: supabaseUrl ? supabaseUrl.trim() : undefined,
      supabase_anon_key: supabaseAnonKey ? supabaseAnonKey.trim() : undefined,
      pages_project: pagesProject ? pagesProject.trim() : undefined,
      pages_build_hook: pagesBuildHook ? pagesBuildHook.trim() : undefined,
    };
    if (!hasCredsRecord) {
      if (!payload.account_id || !payload.api_token) return;
    }
    await saveCloudflareCredentials(payload);
    setShowCredsSettingsModal(false);
  };

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



  // Normaliza tokens globales asegurando que existan p y span
  const globalTokensForPanel: TypographyScale | undefined = site?.typography
    ? {
        ...site.typography.global,
        p: site.typography.global.p ?? {
          font_family: site.typography.global.h6.font_family,
          weight: 400,
          size_px: 16,
          line_height_percent: 140,
        },
        span: site.typography.global.span ?? {
          font_family: site.typography.global.h6.font_family,
          weight: 400,
          size_px: 14,
          line_height_percent: 120,
        },
      }
    : undefined;

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Columna izquierda (pages + components) */}
      <div
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] w-[320px] ${leftVisible ? "translate-x-0 bg-content1/70 border-r border-r-foreground/10" : "-translate-x-[80%] bg-gradient-to-r from-neutral-200 to-transparent dark:from-neutral-800 dark:to-transparent"} transition-transform duration-300 p-3 space-y-0 z-40 overflow-hidden`}
      >
        <div className={(leftVisible ? "opacity-100 flex flex-col" : "opacity-0") + " transition-opacity duration-300"}>
          <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={[]} className="shadow-none">
            <AccordionItem
              key="pages"
              aria-label="Páginas"
              indicator={<FilesIcon />}
              className="shadow-none"
              title={
                <div className="flex items-center justify-between w-full">
                  <span>Páginas</span>
                  <Button isIconOnly size="sm" variant="light" onPress={() => setShowAddPageModal(true)} aria-label="Añadir página">
                    <PlusIcon />
                  </Button>
                </div>
              }
            >
              <div className="space-y-2 overflow-y-auto">
                {site.pages.length === 0 && (
                  <div className="opacity-70 text-sm">No hay páginas aún. Crea la primera para comenzar.</div>
                )}
                {site.pages.map((pg) => {
                  const isSelected = pg.id === state.selectedPageId;
                  return (
                    <div key={pg.id}
                      onClick={() => actions.selectPage(pg.id)}
                      className={(isSelected ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-3 rounded-md cursor-pointer"}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm">{pg.title || pg.slug}</div>
                          <div className="text-xs opacity-70">/{pg.slug} · {pg.type}</div>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          aria-label="Eliminar página"
                          onPress={(e) => { (e as any).stopPropagation?.(); actions.deletePage(pg.id); }}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionItem>

            <AccordionItem key="colors" aria-label="Colores del sitio" indicator={<SquareHalfIcon />} title="Colores del sitio" className="shadow-none">
              <div className="space-y-3 text-sm" style={{ maxHeight: "calc((100vh - 64px)/3)", overflowY: "auto" }}>
                <div className="opacity-70">Gestiona variables de color globales.</div>
                <div className="space-y-2">
                  {Object.entries(site.design_tokens?.colors ?? {}).map(([name, value]) => (
                    <div key={name} className="flex items-center gap-3 p-2 rounded bg-content1/50">
                      <div className="w-[160px] text-xs font-semibold truncate">{name}</div>
                      <input
                        aria-label={`Color ${name}`}
                        type="color"
                        value={typeof value === "string" ? value : "#000000"}
                        onChange={(e) => actions.updateDesignColorToken(name, e.target.value)}
                      />
                      <Button size="sm" variant="light" color="danger" onPress={() => actions.removeDesignColorToken(name)}>
                        <TrashIcon />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(site.design_tokens?.colors ?? {}).length === 0 && (
                    <div className="opacity-70">No hay colores definidos aún.</div>
                  )}
                </div>
                <div className="border-t border-foreground/10 pt-3 space-y-2">
                  <div className="font-semibold">Añadir color</div>
                  <div className="flex items-center gap-3">
                    <Input size="sm" label="Nombre" placeholder="ej: primary" value={newColorName} onValueChange={setNewColorName} />
                    <input aria-label="Nuevo color" type="color" value={newColorValue} onChange={(e) => setNewColorValue(e.target.value)} />
                    <Button size="sm" color="primary" onPress={() => { if (newColorName.trim()) { actions.addDesignColorToken(newColorName.trim(), newColorValue); setNewColorName(""); } }}>
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              key="global_components"
              aria-label="Componentes Globales"
              indicator={<PuzzlePieceIcon />} // Reusing existing icon or new if import available
              title="Globales (Header/Footer)"
              className="shadow-none"
            >
              <div className="space-y-4 text-sm">
                <div className="opacity-70">Componentes que aparecen en todas las páginas.</div>
                
                {/* Header Slot */}
                <div className="space-y-2">
                  <div className="font-semibold flex items-center justify-between">
                    <span>Header</span>
                    {!site.global_components?.header && (
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary" 
                        onPress={() => {
                          setAddComponentTarget({ type: 'global', slot: 'header' });
                          setShowAddComponentDialog(true);
                        }}
                      >
                        Seleccionar
                      </Button>
                    )}
                  </div>
                  {site.global_components?.header ? (
                    <div className="mb-2">
                      <div
                        onClick={() => actions.selectComponentPath(['global_components', 'header'])}
                        className={(pathsEqual(state.selectedComponentPath, ['global_components', 'header']) ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-3 rounded-md cursor-pointer"}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm">{site.global_components.header.name}</div>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            aria-label="Eliminar Header"
                            onPress={(e) => { (e as any).stopPropagation?.(); actions.setGlobalComponent('header', null); }}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 ml-2 border-l border-foreground/10 pl-2">
                        <ComponentsRecursive obj={site.global_components.header} path={['global_components', 'header']} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs opacity-50 italic">Sin header global</div>
                  )}
                </div>

                {/* Footer Slot */}
                <div className="space-y-2 border-t border-foreground/10 pt-2">
                   <div className="font-semibold flex items-center justify-between">
                    <span>Footer</span>
                    {!site.global_components?.footer && (
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary" 
                        onPress={() => {
                          setAddComponentTarget({ type: 'global', slot: 'footer' });
                          setShowAddComponentDialog(true);
                        }}
                      >
                        Seleccionar
                      </Button>
                    )}
                  </div>
                  {site.global_components?.footer ? (
                    <div className="mb-2">
                      <div
                        onClick={() => actions.selectComponentPath(['global_components', 'footer'])}
                        className={(pathsEqual(state.selectedComponentPath, ['global_components', 'footer']) ? "selected bg-foreground/10" : "bg-content1/50") + " shadow-none p-3 rounded-md cursor-pointer"}
                      >
                         <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm">{site.global_components.footer.name}</div>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            aria-label="Eliminar Footer"
                            onPress={(e) => { (e as any).stopPropagation?.(); actions.setGlobalComponent('footer', null); }}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 ml-2 border-l border-foreground/10 pl-2">
                        <ComponentsRecursive obj={site.global_components.footer} path={['global_components', 'footer']} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs opacity-50 italic">Sin footer global</div>
                  )}
                </div>
              </div>
            </AccordionItem>
            <AccordionItem
              key="components"
              aria-label="Componentes"
              indicator={<PuzzlePieceIcon />}
              className="shadow-none"
              title={
                <div className="flex items-center justify-between w-full">
                  <span>Componentes</span>
                  <Button isIconOnly size="sm" variant="light" isDisabled={!page} onPress={() => setShowAddComponentDialog(true)} aria-label="Añadir componente">
                    <PlusIcon />
                  </Button>
                </div>
              }
            >
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm">{c.name}</div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          aria-label="Eliminar componente"
                          onPress={(e) => { (e as any).stopPropagation?.(); actions.deleteComponentFromPage(page.id, idx); }}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <ComponentsRecursive obj={c} path={currentPath} />
                    </div>
                  </div>
                );
              })}
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Preview center */}
      <div className={"fixed inset-x-0 top-16 bottom-0 z-20"}>
        <Card className={(isPreviewFullscreen ? "h-full" : "h-[600px]") + " bg-foreground/10 shadow-none relative"}>
          {/* <CardHeader className="text-center">Preview</CardHeader> */}
          <CardBody>
            <div className={previewWidthClass + " h-full border border-dashed border-foreground/10 bg-background"}>
              <PreviewWebpageEngine page={page ?? null} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Right panels */}
      <div
        className={`fixed right-0 top-16 h-[calc(100vh-64px)] w-[360px] ${rightVisible ? "border-l border-l-foreground/10 translate-x-0 bg-content1/70" : "translate-x-[80%] bg-gradient-to-l from-neutral-200 to-transparent dark:from-neutral-800 dark:to-transparent"} transition-transform duration-300 p-3 space-y-0 z-40 overflow-hidden`}
      >
        <div className={(rightVisible ? "opacity-100" : "opacity-0") + " transition-opacity duration-300"}>
          <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={[]} className="shadow-none">
            {site.typography && (
              <AccordionItem key="typo" aria-label="Tipografía Global" indicator={<TextTIcon />} title="Tipografía Global" className="shadow-none">
                <div style={{ maxHeight: "calc((100vh - 64px)/3)", overflowY: "auto" }}>
                  <TypographyPanel
                    scope="global"
                    tokens={globalTokensForPanel!}
                    onChange={(tag, patch) => actions.updateGlobalTypographyToken(tag, patch)}
                    onLoadFont={(family) => actions.loadGoogleFontFamily(family)}
                  />
                </div>
              </AccordionItem>
            )}

            <AccordionItem key="page" aria-label="Propiedades de Página" indicator={<FilesIcon />} title="Propiedades de Página" className="shadow-none">
              {!page ? (
                <div className="opacity-70">Crea una página para ver y editar sus propiedades SEO.</div>
              ) : (
                <div className={"space-y-2 text-sm"} style={{ maxHeight: "calc((100vh - 64px)/3)", overflowY: "auto" }}> 
                  <Input
                    label="title"
                    value={page.title}
                    onValueChange={(v) => actions.updatePage(page.id, { title: v })}
                  />
                  <Input
                    label="slug"
                    value={page.slug}
                    onValueChange={(v) => actions.updatePage(page.id, { slug: v })}
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

                  <div className="font-semibold">Fechas</div>
                  <Input label="published_at" value={page.published_at} onValueChange={(v) => actions.updatePage(page.id, { published_at: v })} />
                  <Input label="modified_at" value={page.modified_at} onValueChange={(v) => actions.updatePage(page.id, { modified_at: v })} />

                  <div className="font-semibold">Autor</div>
                  <Input label="author.name" value={page.author?.name ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, name: v } })} />
                  <Input label="author.url" value={page.author?.url ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, url: v } })} />
                  <Input label="author.id" value={page.author?.id ?? ""} onValueChange={(v) => actions.updatePage(page.id, { author: { ...page.author, id: v } })} />
                  <Input type="number" label="reading_time (min)" value={String(page.reading_time ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { reading_time: Number(v) || 0 })} />

                  <div className="font-semibold">Featured Image</div>
                  <Input label="featured_image.src" value={page.featured_image?.src ?? ""} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, src: v } })} />
                  <Input label="featured_image.alt" value={page.featured_image?.alt ?? ""} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, alt: v } })} />
                  <Input type="number" label="featured_image.width" value={String(page.featured_image?.width ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, width: Number(v) || 0 } })} />
                  <Input type="number" label="featured_image.height" value={String(page.featured_image?.height ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { featured_image: { ...page.featured_image, height: Number(v) || 0 } })} />

                  <div className="font-semibold">Open Graph</div>
                  <Input label="open_graph.og_title" value={page.open_graph?.og_title ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_title: v } })} />
                  <Textarea label="open_graph.og_description" value={page.open_graph?.og_description ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_description: v } })} />
                  <Input label="open_graph.og_type" value={page.open_graph?.og_type ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_type: v as any } })} />
                  <Input label="open_graph.twitter_card" value={page.open_graph?.twitter_card ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, twitter_card: v as any } })} />
                  <Input label="open_graph.og_site_name" value={page.open_graph?.og_site_name ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_site_name: v } })} />
                  <Input label="open_graph.og_url" value={page.open_graph?.og_url ?? page.canonical ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_url: v } })} />
                  <Input label="open_graph.og_locale" value={page.open_graph?.og_locale ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_locale: v } })} />
                  <Input label="open_graph.twitter_title" value={page.open_graph?.twitter_title ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, twitter_title: v } })} />
                  <Textarea label="open_graph.twitter_description" value={page.open_graph?.twitter_description ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, twitter_description: v } })} />
                  <Input label="open_graph.twitter_image" value={page.open_graph?.twitter_image ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, twitter_image: v } })} />
                  <Input label="open_graph.og_image.src" value={page.open_graph?.og_image?.src ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_image: { ...page.open_graph?.og_image, src: v } } })} />
                  <Input label="open_graph.og_image.alt" value={page.open_graph?.og_image?.alt ?? ""} onValueChange={(v) => actions.updatePage(page.id, { open_graph: { ...page.open_graph, og_image: { ...page.open_graph?.og_image, alt: v } } })} />

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

                  <div className="font-semibold">Sitemap</div>
                  <Input type="number" label="sitemap.priority" value={String(page.sitemap?.priority ?? 0.5)} onValueChange={(v) => actions.updatePage(page.id, { sitemap: { ...page.sitemap, priority: Number(v) || 0 } })} />
                  <Input label="sitemap.changefreq" value={page.sitemap?.changefreq ?? ""} onValueChange={(v) => actions.updatePage(page.id, { sitemap: { ...page.sitemap, changefreq: v } })} />

                  <div className="font-semibold">Redirects</div>
                  <Textarea label="redirect_from (coma-separadas)" value={(page.redirect_from || []).join(", ")}
                    onValueChange={(v) => actions.updatePage(page.id, { redirect_from: v.split(",").map(s => s.trim()).filter(Boolean) })}
                  />

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

                  <Input label="content_text_summary" value={page.content_text_summary ?? ""} onValueChange={(v) => actions.updatePage(page.id, { content_text_summary: v })} />
                  <Input type="number" label="word_count" value={String(page.word_count ?? 0)} onValueChange={(v) => actions.updatePage(page.id, { word_count: Number(v) || 0 })} />
                </div>
              )}
            </AccordionItem>

            <AccordionItem key="component" aria-label="Propiedades de Componente" indicator={<PuzzlePieceIcon />} title="Propiedades de Componente" className="shadow-none">
              <div className="space-y-4 text-sm" style={{ maxHeight: "calc((100vh - 64px)/3)", overflowY: "auto" }}>
                {!selectedComponent ? (
                  <div className="opacity-70">Selecciona un componente de la lista para editar sus propiedades.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="font-semibold text-xs uppercase tracking-wider opacity-50 border-b border-foreground/10 pb-1">
                      {selectedComponent.name}
                    </div>
                    {(!selectedComponent.custom_attrs || Object.keys(selectedComponent.custom_attrs).length === 0) ? (
                      <div className="opacity-70 text-xs">Este componente no tiene propiedades editables.</div>
                    ) : (
                      Object.entries(selectedComponent.custom_attrs).map(([k, v]) => {
                        const valType = v?.type || "text";
                        const valValue = v?.value;
                        const isGlobal = state.selectedComponentPath[0] === 'global_components';

                        const updateAttr = (newVal: any) => {
                          const patch = { [k]: { type: valType, value: newVal } as any };
                          if (isGlobal) actions.updateGlobalComponentAttrs(state.selectedComponentPath, patch);
                          else if (page) actions.updateComponentAttrs(page.id, state.selectedComponentPath, patch);
                        };

                        if (valType === "img" || valType === "file") {
                          return (
                            <div key={k} className="flex gap-2 items-end">
                              <Input label={k} value={String(valValue || "")} onValueChange={updateAttr} className="flex-1" />
                              <Button isIconOnly onPress={() => { setActiveAttrKey(k); setShowMediaModal(true); }}>
                                <FilesIcon />
                              </Button>
                            </div>
                          );
                        }
                        
                        if (valType === "color") {
                          return (
                            <div key={k} className="flex items-center gap-2">
                               <Input label={k} value={String(valValue ?? "#000000")} onValueChange={updateAttr} className="flex-1" />
                               <input type="color" value={String(valValue ?? "#000000")} onChange={(e) => updateAttr(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                            </div>
                          );
                        }

                        if (valType === "array" && Array.isArray(valValue)) {
                           // Simplified Array Editor
                           return (
                             <div key={k} className="p-2 border border-foreground/10 rounded space-y-2">
                               <div className="font-semibold text-xs opacity-70">{k} (Array)</div>
                               <div className="max-h-40 overflow-y-auto space-y-2">
                                 {valValue.map((item, idx) => (
                                   <div key={idx} className="pl-2 border-l-2 border-primary/20">
                                      {typeof item === 'object' ? (
                                        <div className="text-xs opacity-50">Item {idx + 1} (Complex Object) - Edit via JSON below</div>
                                      ) : (
                                        <div className="text-sm">{String(item)}</div>
                                      )}
                                   </div>
                                 ))}
                               </div>
                               <Textarea 
                                 label="Edit JSON" 
                                 minRows={1} 
                                 value={JSON.stringify(valValue)} 
                                 onValueChange={(txt) => { try { updateAttr(JSON.parse(txt)); } catch {} }} 
                               />
                             </div>
                           );
                        }

                        if (valType === "object" && valValue && typeof valValue === 'object') {
                           return (
                             <div key={k} className="p-2 border border-foreground/10 rounded space-y-2">
                               <div className="font-semibold text-xs opacity-70">{k} (Object)</div>
                               {/* Allow nested slot editing if it has 'slot' property? No, keeping it simple for now */}
                               <Textarea 
                                 minRows={3} 
                                 value={JSON.stringify(valValue, null, 2)} 
                                 onValueChange={(txt) => { try { updateAttr(JSON.parse(txt)); } catch {} }} 
                               />
                             </div>
                           );
                        }

                        // Default Text/Number
                        return <Input key={k} label={k} value={String(valValue ?? "")} onValueChange={updateAttr} />;
                      })
                    )}
                  </div>
                )}
              </div>
            </AccordionItem>

            <AccordionItem
              key="library"
              aria-label="Biblioteca"
              indicator={<FilesIcon />}
              className="shadow-none"
              title="Biblioteca"
            >
              <div className={"space-y-2 text-sm"} style={{ maxHeight: "calc((100vh - 64px)/3)", overflowY: "auto" }}>
                 <div className="flex items-center justify-between mb-2 pb-2 border-b border-foreground/10">
                    <span className="opacity-70 text-xs font-semibold uppercase tracking-wider">Archivos</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="flat" isIconOnly onPress={async () => {
                        if (!site) return;
                        try {
                          const items = await listMedia(site.id);
                          setMediaItems(items as any);
                        } catch (e: any) {
                          const msg = String(e?.message || "");
                          if (msg.includes("Missing R2 credentials")) {
                            try {
                              const c = await getCloudflareCredentials(site.id);
                              setHasCredsRecord(true);
                              setR2Bucket(String(c.r2_bucket || ""));
                            } catch {}
                          }
                        }
                      }}>
                        <ArrowsClockwiseIcon className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="solid" color="primary" isIconOnly onPress={() => setShowMediaModal(true)}>
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {libraryOpen && (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaItems.map((it) => {
                        const name = (it.key || "").split('/').pop() || it.key;
                        const isImage = (it.url || it.key) && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(String(it.url || it.key));
                        const ext = String(name).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
                        return (
                          <Button key={it.key} variant="light" className="p-0" style={{ height: 'auto' }}>
                          <div className="w-full">
                            {isImage ? (
                              <img src={`${(import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000"}/api/cloudflare/r2/file/${encodeURIComponent(site.id)}?key=${encodeURIComponent(it.key)}`} alt={name} className="w-full h-32 min-h-[128px] object-cover rounded" />
                            ) : (
                              <div className="w-full h-32 min-h-[128px] bg-gray-100 text-gray-700 flex items-center justify-center rounded px-2">
                                <div className="flex items-center gap-2 truncate w-full justify-center">
                                  <FilesIcon />
                                  <span className="text-xs font-medium truncate" title={name}>{name}</span>
                                  {ext && (<Chip size="sm" variant="flat">{ext}</Chip>)}
                                </div>
                              </div>
                            )}
                            <div className="text-[10px] break-all mt-1 px-1">{name}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </AccordionItem>
          </Accordion>
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

      <Modal isOpen={showExportModal} onOpenChange={setShowExportModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Exportar</ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <div className="font-semibold text-sm">Cloudflare</div>
                  <Input isDisabled={loadingCreds} label="account_id" value={cfAccountId} onValueChange={setCfAccountId} />
                  <Input isDisabled={loadingCreds} label="api_token" type="text" value={cfApiToken} onValueChange={setCfApiToken} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input isDisabled={loadingCreds} label="r2_bucket" value={r2Bucket} onValueChange={setR2Bucket} autoComplete="off" name="r2-bucket" placeholder="test" />
                    <Input isDisabled={loadingCreds} label="r2_access_key_id" value={r2AccessKey} onValueChange={setR2AccessKey} autoComplete="off" name="r2-access-key-id" placeholder="e12fe8b..." />
                    <Input isDisabled={loadingCreds} label="r2_secret_access_key" value={r2SecretKey} onValueChange={setR2SecretKey} autoComplete="off" name="r2-secret-access-key" placeholder="4d0a31..." />
                  </div>
                  <Input isDisabled={loadingCreds} label="r2_public_url" value={r2PublicUrl} onValueChange={setR2PublicUrl} autoComplete="off" name="r2-public-url" placeholder="https://pub-xxx.r2.dev" description="URL pública de R2 para descargas gratuitas" />
                  <Input isDisabled={loadingCreds} label="pages_project" value={pagesProject} onValueChange={setPagesProject} />
                  <Input isDisabled={loadingCreds} label="pages_build_hook" value={pagesBuildHook} onValueChange={setPagesBuildHook} />
                  <div className="font-semibold text-sm">Supabase</div>
                  <Input isDisabled={loadingCreds} label="supabase_url" value={supabaseUrl} onValueChange={setSupabaseUrl} />
                  <Input isDisabled={loadingCreds} label="supabase_anon_key" type="text" value={supabaseAnonKey} onValueChange={setSupabaseAnonKey} />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" isLoading={exporting} onPress={async () => {
                  if (!site) return;
                  try {
                    setExporting(true);
                    await saveCloudflareCredentials({ client_website_id: site.id, account_id: cfAccountId.trim(), api_token: cfApiToken.trim(), r2_bucket: r2Bucket.trim() || undefined, r2_access_key_id: r2AccessKey.trim() || undefined, r2_secret_access_key: r2SecretKey.trim() || undefined, r2_public_url: r2PublicUrl.trim() || undefined, supabase_url: supabaseUrl.trim() || undefined, supabase_anon_key: supabaseAnonKey.trim() || undefined, pages_project: pagesProject.trim() || undefined, pages_build_hook: pagesBuildHook.trim() || undefined });
                    const res = await exportClientWebsite(site.id);
                    setExportMessage(`OK (${res.pages_exported} páginas, ${res.components_copied} componentes)`);
                    onClose();
                    setTimeout(() => setExportMessage(null), 3000);
                  } catch (e: any) {
                    setExportMessage(String(e?.message || e || 'Error'));
                    setTimeout(() => setExportMessage(null), 4000);
                  } finally {
                    setExporting(false);
                  }
                }}>Exportar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={showMediaModal} onOpenChange={setShowMediaModal} size="3xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Biblioteca de medios</ModalHeader>
              <ModalBody>
                {mediaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 mb-4 text-gray-400">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No hay archivos en la biblioteca</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Sube tu primer archivo para comenzar</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mediaItems.map((it) => {
                      const name = (it.key || "").split('/').pop() || it.key;
                      const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(it.key || '');
                      const ext = String(name).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
                      const fileSize = it.size ? `${(it.size / 1024).toFixed(1)} KB` : null;
                      
                      // Construct the URL - use r2_public_url if configured, otherwise backend proxy
                      const imageUrl = r2PublicUrl 
                        ? `${r2PublicUrl}/${it.key}`
                        : `${(import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000"}/api/cloudflare/r2/file/${encodeURIComponent(site.id)}?key=${encodeURIComponent(it.key)}`;
                      
                      return (
                        <button
                          key={it.key}
                          onClick={() => {
                            if (!activeAttrKey) return;
                            const path = state.selectedComponentPath;
                            const patch = { 
                              [activeAttrKey]: { 
                                type: selectedComponent?.custom_attrs?.[activeAttrKey]?.type, 
                                value: imageUrl 
                              } as any 
                            };
                            
                            if (path[0] === 'global_components') {
                               actions.updateGlobalComponentAttrs(path, patch);
                            } else if (page) {
                               actions.updateComponentAttrs(page.id, path, patch);
                            }
                            
                            setShowMediaModal(false);
                            setActiveAttrKey(null);
                          }}
                          className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-blue-500 dark:hover:border-blue-400 overflow-hidden"
                        >
                          {/* Thumbnail */}
                          <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                            {isImage ? (
                              <img 
                                src={imageUrl}
                                alt={name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-gray-400">
                                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                  <polyline points="13 2 13 9 20 9"/>
                                </svg>
                                {ext && (
                                  <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded uppercase">
                                    {ext}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* File Info */}
                          <div className="p-3 text-left bg-white dark:bg-gray-800">
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-1" title={name}>
                              {name.length > 18 ? name.substring(0, 18) + '...' : name}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {ext && (
                                <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded uppercase">
                                  {ext}
                                </span>
                              )}
                              {fileSize && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">
                                  {fileSize}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={showUpload} onOpenChange={setShowUpload}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Subir archivo</ModalHeader>
              <ModalBody>
                <input type="file" onChange={onPickUploadFile} />
                {uploadPreviewUrl && (
                  <img src={uploadPreviewUrl} alt="preview" className="max-h-40 rounded" />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={onUploadFile} isDisabled={!uploadFile}>Subir</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={showCredsSettingsModal} onOpenChange={setShowCredsSettingsModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Configurar credenciales</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Cloudflare Account ID" value={cfAccountId} onValueChange={setCfAccountId} autoComplete="off" name="cloudflare-account-id" placeholder="ec768f13..." />
                  <Input label="Cloudflare API Token" value={cfApiToken} onValueChange={setCfApiToken} autoComplete="off" name="cloudflare-api-token" placeholder="jv6FSv..." />
                  <Input label="R2 Bucket" value={r2Bucket} onValueChange={setR2Bucket} autoComplete="off" name="r2-bucket" placeholder="test" />
                  <Input label="R2 Access Key ID" value={r2AccessKey} onValueChange={setR2AccessKey} autoComplete="off" name="r2-access-key-id" placeholder="e12fe8b..." />
                  <Input label="R2 Secret Access Key" value={r2SecretKey} onValueChange={setR2SecretKey} autoComplete="off" name="r2-secret-access-key" placeholder="4d0a31..." />
                  <Input label="R2 Public URL" value={r2PublicUrl} onValueChange={setR2PublicUrl} autoComplete="off" name="r2-public-url" placeholder="https://pub-xxx.r2.dev" />
                  <Input label="Supabase URL" value={supabaseUrl} onValueChange={setSupabaseUrl} autoComplete="off" name="supabase-url" placeholder="https://...supabase.co" />
                  <Input label="Supabase anon key" value={supabaseAnonKey} onValueChange={setSupabaseAnonKey} autoComplete="off" name="supabase-anon-key" placeholder="eyJhbGciOi..." />
                  <Input label="Pages Project" value={pagesProject} onValueChange={setPagesProject} autoComplete="off" name="pages-project" placeholder="astro-test" />
                  <Input label="Pages Build Hook URL" value={pagesBuildHook} onValueChange={setPagesBuildHook} autoComplete="off" name="pages-build-hook" placeholder="https://..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={onSaveAllCreds} isDisabled={!hasCredsRecord && (!cfAccountId || !cfApiToken)}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      

      {/* Diálogo para añadir componente desde biblioteca */}
      {/* Diálogo para añadir componente desde biblioteca */}
      <AddComponentDialog
        isOpen={showAddComponentDialog}
        onOpenChange={(v) => {
          setShowAddComponentDialog(v);
          if (!v) setAddComponentTarget({ type: 'page' }); // reset to default
        }}
        onSelect={(comp) => {
          if (addComponentTarget.type === 'global') {
            actions.setGlobalComponent(addComponentTarget.slot, comp);
            setShowAddComponentDialog(false);
          } else {
             if (page) actions.addComponentToPageFromLibrary(page.id, comp);
             setShowAddComponentDialog(false);
          }
        }}
      />
      {/* Diálogo para seleccionar/reemplazar subcomponente dentro de custom_attrs */}
      <AddComponentDialog
        isOpen={!!selectSubComponentSlotKey}
        onOpenChange={(open) => { if (!open) setSelectSubComponentSlotKey(null); }}
        onSelect={(comp) => {
          if (!page || !selectSubComponentSlotKey) return;
          actions.setNestedComponentSlot(page.id, state.selectedComponentPath, selectSubComponentSlotKey, comp);
          setSelectSubComponentSlotKey(null);
        }}
      />
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

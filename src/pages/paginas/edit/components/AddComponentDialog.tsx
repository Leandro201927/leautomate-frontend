import { useEffect, useMemo, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, CardBody, Tabs, Tab } from "@heroui/react";
import type { Component } from "@/types/clientWebsite";

type LibraryManifest = {
  name: string;
  nameComponent?: string;
  atomicHierarchy: Component["atomic_hierarchy"];
  custom_attrs?: Record<string, { type: string; value: unknown }>;
};

type LibrarySample = {
  name: string;
  nameComponent?: string;
  atomicHierarchy: Component["atomic_hierarchy"];
  custom_attrs?: Record<string, { type: string; value: unknown }>;
};

type Item = {
  id: string;
  name: string;
  atomicHierarchy: Component["atomic_hierarchy"];
  basePath: string; // path without trailing file
  manifest?: LibraryManifest;
  sample?: LibrarySample;
};

function flattenCustomAttrs(attrs?: Record<string, { type: string; value: unknown }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(attrs || {}).forEach(([k, v]) => {
    out[k] = v?.value;
  });
  return out;
}

export default function AddComponentDialog({ isOpen, onOpenChange, onSelect }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onSelect: (component: Component) => void; }) {
  const dataModules = import.meta.glob("/src/library/**/data.ts", { eager: true });
  const componentModules = {
    ...import.meta.glob("/src/library/**/index.tsx"),
    ...import.meta.glob("/src/library/**/index.ts"),
  };

  const items: Item[] = useMemo(() => {
    return Object.entries(dataModules).map(([path, mod]) => {
      const m = mod as unknown as { manifest?: LibraryManifest; sample?: LibrarySample };
      const manifest = m.manifest;
      const sample = m.sample;
      const name = manifest?.name ?? sample?.name ?? path.split("/").slice(-2, -1)[0];
      const atomicHierarchy = manifest?.atomicHierarchy ?? sample?.atomicHierarchy ?? "organism";
      const basePath = path.replace(/\/data\.ts$/, "");
      return { id: path, name, atomicHierarchy, basePath, manifest, sample };
    });
  }, [dataModules]);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Component["atomic_hierarchy"] | "all">("all");
  const [selected, setSelected] = useState<Item | null>(null);
  const [PreviewComp, setPreviewComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (selected) {
      const indexPathTsx = `${selected.basePath}/index.tsx`;
      const indexPathTs = `${selected.basePath}/index.ts`;
      const loader = componentModules[indexPathTsx] || componentModules[indexPathTs];
      if (loader) {
        loader().then((mod: any) => {
          setPreviewComp(() => mod.default ?? null);
        });
      } else {
        setPreviewComp(null);
      }
    } else {
      setPreviewComp(null);
    }
  }, [selected, componentModules]);

  const filtered = useMemo(() => {
    return items
      .filter((it) => (typeFilter === "all" ? true : it.atomicHierarchy === typeFilter))
      .filter((it) => it.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.atomicHierarchy.localeCompare(b.atomicHierarchy) || a.name.localeCompare(b.name));
  }, [items, query, typeFilter]);

  function handleSelect(item: Item) {
    const custom_attrs = flattenCustomAttrs(item.sample?.custom_attrs ?? item.manifest?.custom_attrs);
    const component: Component = {
      name: item.name,
      atomic_hierarchy: item.atomicHierarchy,
      custom_attrs,
    };
    onSelect(component);
    onOpenChange(false);
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl">
      <ModalContent>
        {(close) => (
          <>
            {/* Header: sólo título y botón Añadir al extremo derecho */}
            <ModalHeader className="flex flex-row items-center justify-between gap-2">
              <div>Seleccionar componente</div>
            </ModalHeader>

            {/* Body: sidebar con filtros a la izquierda, grilla al centro y preview abajo */}
            <ModalBody>
              <div className="grid grid-cols-12 gap-4">
                {/* Sidebar filtros */}
                <div className="col-span-3">
                  <div className="space-y-3">
                    <Input size="sm" placeholder="Buscar por nombre" value={query} onValueChange={setQuery} />
                    <Tabs aria-label="Tipo" selectedKey={typeFilter} onSelectionChange={(k) => setTypeFilter(k as any)} variant="bordered" isVertical>
                      <Tab className="shadow-none min-w-[188px]" key="all" title="Todos" />
                      <Tab className="shadow-none min-w-[188px]" key="atom" title="Atom" />
                      <Tab className="shadow-none min-w-[188px]" key="molecule" title="Molecule" />
                      <Tab className="shadow-none min-w-[188px]" key="organism" title="Organism" />
                      <Tab className="shadow-none min-w-[188px]" key="template" title="Template" />
                      <Tab className="shadow-none min-w-[188px]" key="page" title="Page" />
                    </Tabs>
                  </div>
                </div>

                {/* Grilla de componentes */}
                <div className="col-span-9">
                  <div className="grid grid-cols-2 gap-3">
                    {filtered.map((it) => (
                      <Card key={it.id} isPressable onPress={() => setSelected(it)} className={(selected?.id === it.id ? "bg-foreground/10" : "bg-content1/50") + " shadow-none"}>
                        <CardBody>
                          <div className="font-semibold">{it.name}</div>
                          <div className="text-xs opacity-70">{it.atomicHierarchy}</div>
                        </CardBody>
                      </Card>
                    ))}
                    {filtered.length === 0 && (
                      <div className="opacity-70 text-sm">No hay componentes que coincidan con el filtro.</div>
                    )}
                  </div>
                </div>

                {/* Preview abajo */}
                <div className="col-span-12">
                  <div className="border border-foreground/10 rounded-md p-3">
                    <div className="font-semibold mb-2">Preview</div>
                    {!selected ? (
                      <div className="opacity-70 text-sm">Selecciona un componente para previsualizarlo.</div>
                    ) : (
                      <Card className="shadow-none bg-content1/50">
                        <CardBody>
                          {PreviewComp ? (
                            <PreviewComp {...flattenCustomAttrs(selected.sample?.custom_attrs ?? selected.manifest?.custom_attrs)} />
                          ) : (
                            <div className="opacity-70 text-sm">No se encontró el componente visual para esta entrada.</div>
                          )}
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>

            {/* Footer: botón cancelar */}
            <ModalFooter>
              <Button variant="light" onPress={close}>Cancelar</Button>
              <Button color="primary" onPress={() => selected && handleSelect(selected)}>Añadir</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
import { useEffect, useState } from "react";
import { Button, Card, CardBody, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Chip } from "@heroui/react";
import { PlusIcon, FilesIcon } from "@phosphor-icons/react";
import { listMedia, presignUpload, finalizeUpload, uploadDirect, type MediaItem } from "@/services/mediaService";
import { getCloudflareCredentials, saveCloudflareCredentials } from "@/services/paginas/paginasService";

export default function BibliotecaPage() {
  const [clientWebsiteId, setClientWebsiteId] = useState<string>("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [showUpload, setShowUpload] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCreds, setShowCreds] = useState<boolean>(false);
  const [r2Bucket, setR2Bucket] = useState<string>("");
  const [r2AccessKey, setR2AccessKey] = useState<string>("");
  const [r2SecretKey, setR2SecretKey] = useState<string>("");
  const [cfAccountId, setCfAccountId] = useState<string>("");
  const [cfApiToken, setCfApiToken] = useState<string>("");
  const [hasCredsRecord, setHasCredsRecord] = useState<boolean>(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("site") || "";
    setClientWebsiteId(id);
  }, []);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000"}/api/client-websites`);
        if (res.ok) {
          const arr = await res.json();
          setSites(arr.map((x: any) => ({ id: x.id, name: x.name })));
        }
      } catch {}
    };
    if (!clientWebsiteId) loadSites();
  }, [clientWebsiteId]);

  useEffect(() => {
    if (!clientWebsiteId) return;
    setLoading(true);
    listMedia(clientWebsiteId)
      .then(setItems)
      .catch(async (e) => {
        const msg = String(e?.message || "");
        if (msg.includes("Missing R2 credentials")) {
          try {
            const c = await getCloudflareCredentials(clientWebsiteId);
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
            setCfAccountId("");
            setCfApiToken("");
          }
          setShowCreds(true);
        }
      })
      .finally(() => setLoading(false));
  }, [clientWebsiteId]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onUpload = async () => {
    if (!file || !clientWebsiteId) return;
    const key = `${Date.now()}_${file.name}`;
    try {
      const presigned = await presignUpload(clientWebsiteId, key, file.type || undefined);
      await fetch(presigned.upload_url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      await finalizeUpload(clientWebsiteId, { key, size: file.size, content_type: file.type || undefined });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Missing R2 credentials")) {
        try {
          const c = await getCloudflareCredentials(clientWebsiteId);
          setR2Bucket(String(c.r2_bucket || ""));
          setR2AccessKey(String(c.r2_access_key_id || ""));
          setR2SecretKey(String(c.r2_secret_access_key || ""));
        } catch {}
        setShowCreds(true);
        return;
      }
      try {
        await uploadDirect(clientWebsiteId, key, file);
      } catch (e2) {
        return;
      }
    }
    setShowUpload(false);
    setFile(null);
    setPreviewUrl(null);
    const updated = await listMedia(clientWebsiteId);
    setItems(updated);
  };

  const fmtBytes = (n?: number) => {
    const b = typeof n === "number" ? n : 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const extOf = (k: string) => {
    const m = k.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "";
  };

  const baseName = (k: string) => {
    const p = k.split("/");
    return p[p.length - 1] || k;
  };

  const onSaveCreds = async () => {
    if (!clientWebsiteId || !r2Bucket || !r2AccessKey || !r2SecretKey) return;
    const payload: any = {
      client_website_id: clientWebsiteId,
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
    setShowCreds(false);
    setLoading(true);
    try { const data = await listMedia(clientWebsiteId); setItems(data); } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Biblioteca de medios</h2>
        <div className="flex items-center gap-2">
          {!clientWebsiteId && (
            <Select className="w-[280px]" label="Sitio" selectedKeys={[]} onChange={(e) => setClientWebsiteId(e.target.value)}>
              {sites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </Select>
          )}
          <Button variant="flat" onPress={async () => {
            if (!clientWebsiteId) return;
            setLoading(true);
            try {
              const data = await listMedia(clientWebsiteId);
              setItems(data);
            } catch (e: any) {
              const msg = String(e?.message || "");
              if (msg.includes("Missing R2 credentials")) {
                try {
                  const c = await getCloudflareCredentials(clientWebsiteId);
                  setR2Bucket(String(c.r2_bucket || ""));
                  setR2AccessKey(String(c.r2_access_key_id || ""));
                  setR2SecretKey(String(c.r2_secret_access_key || ""));
                } catch {}
                setShowCreds(true);
              }
            } finally {
              setLoading(false);
            }
          }}>Refrescar</Button>
          <Button color="primary" startContent={<PlusIcon size={18} />} onPress={() => setShowUpload(true)}>Subir archivo</Button>
        </div>
      </div>

      {loading ? (
        <div>Cargando…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => {
            const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(it.key || it.url || "");
            const name = baseName(it.key);
            const ext = extOf(name);
            return (
              <Card key={it.key} className="overflow-hidden">
                <CardBody className="p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium truncate max-w-[70%]" title={name}>{name}</div>
                    {ext && (<Chip size="sm" variant="flat" color={isImage ? "success" : "default"}>{ext}</Chip>)}
                  </div>
                  {isImage ? (
                    <img src={`${(import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000"}/api/cloudflare/r2/file/${encodeURIComponent(clientWebsiteId)}?key=${encodeURIComponent(it.key)}`} alt={name} className="w-full h-32 object-cover rounded" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 text-gray-500 flex items-center justify-center rounded">
                      <FilesIcon size={24} />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] opacity-70">
                    <span>{fmtBytes(it.size)}</span>
                    {it.last_modified && (<span>{new Date(it.last_modified).toLocaleString()}</span>)}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showUpload} onOpenChange={setShowUpload}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Subir archivo</ModalHeader>
              <ModalBody className="space-y-3">
                <input type="file" onChange={onPickFile} />
                {previewUrl && (
                  <div className="mt-2">
                    <img src={previewUrl} alt="preview" className="max-h-40 rounded" />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={onUpload} isDisabled={!file}>Subir archivo</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={showCreds} onOpenChange={setShowCreds}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Configurar credenciales</ModalHeader>
              <ModalBody className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Cloudflare Account ID" value={cfAccountId} onChange={(e) => setCfAccountId(e.target.value)} autoComplete="off" name="cloudflare-account-id" placeholder="ec768f13..." />
                  <Input label="Cloudflare API Token" value={cfApiToken} onChange={(e) => setCfApiToken(e.target.value)} autoComplete="off" name="cloudflare-api-token" placeholder="jv6FSv..." />
                  <Input label="R2 Bucket" value={r2Bucket} onChange={(e) => setR2Bucket(e.target.value)} autoComplete="off" name="r2-bucket" placeholder="test" />
                  <Input label="R2 Access Key ID" value={r2AccessKey} onChange={(e) => setR2AccessKey(e.target.value)} autoComplete="off" name="r2-access-key-id" placeholder="e12fe8b..." />
                  <Input label="R2 Secret Access Key" value={r2SecretKey} onChange={(e) => setR2SecretKey(e.target.value)} autoComplete="off" name="r2-secret-access-key" placeholder="4d0a31..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={onSaveCreds} isDisabled={!r2Bucket || !r2AccessKey || !r2SecretKey || (!hasCredsRecord && (!cfAccountId || !cfApiToken))}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// Servicio para interactuar con R2 vía backend
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `HTTP ${res.status}`;
    if (text) {
      try { const data = JSON.parse(text); msg = data?.error ? String(data.error) : text; } catch { msg = text || msg; }
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export type MediaItem = { key: string; size?: number; last_modified?: string | null; url?: string };

export async function listMedia(clientWebsiteId: string): Promise<MediaItem[]> {
  const data = await request<{ ok: boolean; items: MediaItem[] }>(`/api/cloudflare/r2/files/${encodeURIComponent(clientWebsiteId)}`);
  return data.items;
}

export async function presignUpload(clientWebsiteId: string, key: string, contentType?: string): Promise<{ upload_url: string; key: string; bucket: string }> {
  return request<{ ok: boolean; upload_url: string; key: string; bucket: string }>(`/api/cloudflare/r2/presign/${encodeURIComponent(clientWebsiteId)}`, {
    method: "POST",
    body: JSON.stringify({ key, content_type: contentType }),
  });
}

export async function finalizeUpload(clientWebsiteId: string, payload: { key: string; size?: number; content_type?: string }): Promise<{ ok: boolean; record: any }> {
  return request<{ ok: boolean; record: any }>(`/api/cloudflare/r2/finalize/${encodeURIComponent(clientWebsiteId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadDirect(clientWebsiteId: string, key: string, file: File): Promise<{ ok: boolean; record: any }> {
  const fd = new FormData();
  fd.append("key", key);
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/cloudflare/r2/upload/${encodeURIComponent(clientWebsiteId)}`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export default { listMedia, presignUpload, finalizeUpload };

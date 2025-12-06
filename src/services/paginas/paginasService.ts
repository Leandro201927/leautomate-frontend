// Servicio para consumir los endpoints del backend (client websites)
// Usa VITE_API_URL si está definido, de lo contrario http://localhost:4000
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000";

export interface GlobalHeader {
  general_global_title?: string;
  custom_header_elements?: string[];
}

export interface ClientWebsiteListItem {
  id: string;
  name: string;
  can_change_fields_on_bd: 0 | 1 | boolean; // el backend puede devolver 0/1, normalizamos a boolean donde convenga
  created_at: string; // ISO string
  updated_at?: string | null; // ISO string or null
}

export interface ClientWebsite extends ClientWebsiteListItem {
  global_header?: GlobalHeader | null;
  pages?: unknown; // JSON complejo
}

export interface CreateClientWebsitePayload {
  name: string;
  can_change_fields_on_bd?: boolean;
  global_header?: GlobalHeader | null;
  pages?: unknown; // JSON complejo opcional
}

export interface UpdateClientWebsitePayload {
  name?: string;
  can_change_fields_on_bd?: boolean;
  global_header?: GlobalHeader | null;
  pages?: unknown; // JSON complejo opcional
  design_tokens?: unknown; // JSON opcional (paletas, etc.)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errorMessage = `HTTP ${res.status}`;
    if (text) {
      try {
        const data = JSON.parse(text);
        errorMessage = data?.error ? String(data.error) : text;
      } catch {
        errorMessage = text || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

// GET /api/health
export async function getHealth(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/health");
}

// GET /api/client-websites
export async function listClientWebsites(): Promise<ClientWebsiteListItem[]> {
  return request<ClientWebsiteListItem[]>("/api/client-websites");
}

// POST /api/client-websites
export async function createClientWebsite(payload: CreateClientWebsitePayload): Promise<ClientWebsite> {
  return request<ClientWebsite>("/api/client-websites", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// GET /api/client-websites/:id
export async function getClientWebsiteById(id: string): Promise<ClientWebsite> {
  return request<ClientWebsite>(`/api/client-websites/${encodeURIComponent(id)}`);
}

// PUT /api/client-websites/:id
export async function updateClientWebsite(id: string, payload: UpdateClientWebsitePayload): Promise<ClientWebsite> {
  return request<ClientWebsite>(`/api/client-websites/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export default {
  getHealth,
  listClientWebsites,
  createClientWebsite,
  getClientWebsiteById,
  updateClientWebsite,
};

export interface CloudflareCredentialsPayload {
  client_website_id: string;
  account_id?: string;
  api_token?: string;
  r2_bucket?: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
  r2_public_url?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  pages_project?: string;
  pages_build_hook?: string;
}

export async function saveCloudflareCredentials(payload: CloudflareCredentialsPayload): Promise<{ ok: boolean; id?: string }> {
  return request<{ ok: boolean; id?: string }>(`/api/cloudflare/credentials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCloudflareCredentials(clientWebsiteId: string): Promise<any> {
  return request<any>(`/api/cloudflare/credentials/${encodeURIComponent(clientWebsiteId)}`);
}

export async function exportClientWebsite(id: string, creds?: Partial<CloudflareCredentialsPayload>): Promise<{ ok: boolean; output_dir: string; pages_exported: number; components_copied: number }> {
  return request<{ ok: boolean; output_dir: string; pages_exported: number; components_copied: number }>(`/api/client-websites/${encodeURIComponent(id)}/export`, {
    method: "POST",
    body: JSON.stringify(creds ?? {}),
  });
}

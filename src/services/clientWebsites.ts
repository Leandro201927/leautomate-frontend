import type { ClientWebsite } from "@/types/clientWebsite";

const API_BASE = "http://localhost:4000";

export async function getClientWebsite(id: string): Promise<ClientWebsite | null> {
  try {
    const res = await fetch(`${API_BASE}/api/client-websites/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Normalize keys to match frontend expectations
    return {
      id: data.id,
      name: data.name,
      can_change_fields_on_bd: !!data.can_change_fields_on_bd,
      global_header: data.global_header ?? null,
      pages: data.pages ?? [],
    } as ClientWebsite;
  } catch (e) {
    console.error("fetch client website error", e);
    return null;
  }
}
export interface VinylData {
  id: string;
  title: string;
  artist: string;
  vinylColor: "black" | "red" | "blue" | "clear";
  audioUrl: string;
  photos: string[];
  noteData: string | null;
  createdAt: number;
}

// In-memory store (server-side) + sessionStorage (client-side)
// so data survives client navigation in local dev mode.
// In production, Supabase is the source of truth.
const vinylStore = new Map<string, VinylData>();

export function saveVinyl(data: VinylData): void {
  vinylStore.set(data.id, data);

  // Also persist to sessionStorage for client-side navigation
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`vinyl_${data.id}`, JSON.stringify(data));
    } catch {
      // sessionStorage full or unavailable
    }
  }
}

export function getVinyl(id: string): VinylData | undefined {
  // Try in-memory first
  const mem = vinylStore.get(id);
  if (mem) return mem;

  // Fall back to sessionStorage
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`vinyl_${id}`);
      if (stored) {
        const data = JSON.parse(stored) as VinylData;
        vinylStore.set(id, data); // hydrate back into memory
        return data;
      }
    } catch {
      // parse error
    }
  }

  return undefined;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

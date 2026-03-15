export interface Model {
  id: string;
  name: string;
  provider: string;
}

export async function fetchModels(): Promise<Model[]> {
  const res = await fetch("/api/models");
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }
  return res.json();
}

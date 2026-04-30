import { apiClient } from "@/shared/api/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

export async function uploadTrainingMedia(file, options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options.folder || "training/ALL/GENERAL");

  return apiClient.upload("/media/upload", formData);
}

export async function createTrainingMaterial(input) {
  return apiClient.post("/training/materials", input);
}

export async function fetchTrainingMaterials(filters = {}) {
  const params = new URLSearchParams();

  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);

  const query = params.toString();
  const materials = await apiClient.get(
    query ? `/training/materials?${query}` : "/training/materials",
  );

  return Array.isArray(materials) ? materials : [];
}

export async function fetchTrainingMaterial(id) {
  return apiClient.get(`/training/materials/${encodeURIComponent(id)}`);
}

export async function updateTrainingMaterial(id, input) {
  return apiClient.patch(`/training/materials/${encodeURIComponent(id)}`, input);
}

export async function deleteTrainingMaterial(id) {
  return apiClient.delete(`/training/materials/${encodeURIComponent(id)}`);
}

export async function fetchTrainingPositions() {
  const positions = await apiClient.get("/training/positions");

  return Array.isArray(positions) ? positions : [];
}

export async function fetchManagedTrainingPositions() {
  const positions = await apiClient.get("/training/positions/manage");

  return Array.isArray(positions) ? positions : [];
}

export async function createTrainingPosition(input) {
  return apiClient.post("/training/positions", input);
}

export async function updateTrainingPosition(code, input) {
  return apiClient.patch(
    `/training/positions/${encodeURIComponent(code)}`,
    input,
  );
}

export function getTrainingMediaUrl(objectKey) {
  return `${API_URL}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
}

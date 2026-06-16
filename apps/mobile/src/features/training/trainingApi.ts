import { Directory, File, Paths } from "expo-file-system";
import { getAccessToken } from "@zhao/api";
import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";
import { secureTokenStorage } from "@/lib/tokenStorage";
import type {
  TrainingMaterialProgress,
  TrainingMyRecords,
  TrainingMyTitles,
  TrainingPlanMaterial,
  TrainingPlan,
  TrainingQuiz,
  TrainingQuizAnswer,
  TrainingQuizAttemptResult,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

export async function fetchTrainingMyPlan(): Promise<TrainingPlan> {
  return mobileApiClient.get<TrainingPlan>("/training/my-plan");
}

export async function fetchTrainingQuiz(
  materialId: number | string,
): Promise<TrainingQuiz> {
  return mobileApiClient.get<TrainingQuiz>(
    `/training/materials/${encodeURIComponent(String(materialId))}/quiz`,
  );
}

export async function submitTrainingQuiz(
  materialId: number | string,
  answers: TrainingQuizAnswer[],
): Promise<TrainingQuizAttemptResult> {
  return mobileApiClient.post<TrainingQuizAttemptResult>(
    `/training/materials/${encodeURIComponent(String(materialId))}/quiz/attempts`,
    { answers },
  );
}

export async function fetchTrainingMyTitles(): Promise<TrainingMyTitles> {
  return mobileApiClient.get<TrainingMyTitles>("/training/my-titles");
}

export async function fetchTrainingMyRecords(): Promise<TrainingMyRecords> {
  return mobileApiClient.get<TrainingMyRecords>("/training/my-records");
}

function getApiBaseUrl(): string {
  return MOBILE_API_URL.replace(/\/+$/, "");
}

export function getTrainingMaterialFileUrl(objectKey: string): string {
  return `${getApiBaseUrl()}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
}

export async function updateTrainingMaterialProgress(
  materialId: number | string,
  input: UpdateTrainingProgressInput,
): Promise<TrainingMaterialProgress> {
  return mobileApiClient.patch<TrainingMaterialProgress>(
    `/training/materials/${encodeURIComponent(String(materialId))}/progress`,
    input,
  );
}

export async function downloadTrainingMaterialToCache(
  material: TrainingPlanMaterial,
): Promise<string> {
  const accessToken = getAccessToken() || (await secureTokenStorage.getAccessToken());

  if (!accessToken) {
    throw new Error("ACCESS_TOKEN_REQUIRED");
  }

  const cacheDirectory = new Directory(
    Paths.cache,
    buildTrainingCacheDirectoryName(),
  );
  cacheDirectory.create({ idempotent: true, intermediates: true });

  const file = new File(cacheDirectory, buildTrainingFileName(material));
  const downloadedFile = await File.downloadFileAsync(
    getTrainingMaterialFileUrl(material.objectKey),
    file,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      idempotent: true,
    },
  );

  return downloadedFile.uri;
}

function buildTrainingCacheDirectoryName(): string {
  return `training-material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTrainingFileName(material: TrainingPlanMaterial): string {
  const sourceName = material.originalName || material.title || "training-material";
  const safeName = sourceName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[/\\?%*:|"<>]+/g, "-")
    .replace(/[^a-zA-Z0-9\u3400-\u9FFF._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return ensureFileExtension(safeName || "training-material", material.mimeType);
}

function ensureFileExtension(fileName: string, mimeType: string): string {
  if (/\.[a-z0-9]{2,8}$/i.test(fileName)) {
    return fileName;
  }

  const extension = getFileExtensionFromMimeType(mimeType);

  return extension ? `${fileName}.${extension}` : fileName;
}

function getFileExtensionFromMimeType(mimeType: string): string {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.includes("pdf")) return "pdf";
  if (normalizedMimeType.includes("png")) return "png";
  if (normalizedMimeType.includes("jpeg") || normalizedMimeType.includes("jpg")) {
    return "jpg";
  }
  if (normalizedMimeType.includes("mp4")) return "mp4";
  if (normalizedMimeType.includes("quicktime")) return "mov";

  return "";
}

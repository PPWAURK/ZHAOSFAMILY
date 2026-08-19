import { File } from "expo-file-system";
import { getAccessToken } from "@zhao/api";
import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";
import { secureTokenStorage } from "@/lib/tokenStorage";
import { createUserMediaCacheDirectory } from "@/lib/mediaCache";
import type {
  TrainingMaterialProgress,
  TrainingMyBadges,
  TrainingMyRecords,
  TrainingMyTitles,
  TrainingPlanMaterial,
  TrainingPlan,
  TrainingPositionOption,
  TrainingQuiz,
  TrainingQuizAnswer,
  TrainingQuizAttemptResult,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

type TrainingPositionResponse = {
  code?: string;
  name?: Record<string, string>;
  isActive?: boolean;
  children?: TrainingPositionResponse[];
};

function mapTrainingPosition(
  position: TrainingPositionResponse,
): TrainingPositionOption | null {
  if (!position.code || !position.name) return null;

  return {
    code: position.code,
    name: position.name,
    isActive: position.isActive ?? false,
    children: (position.children || [])
      .map(mapTrainingPosition)
      .filter((child): child is TrainingPositionOption => child !== null),
  };
}

export async function fetchTrainingPositions(): Promise<TrainingPositionOption[]> {
  const positions = await mobileApiClient.get<TrainingPositionResponse[]>(
    "/training/positions",
  );

  return Array.isArray(positions)
    ? positions
        .map(mapTrainingPosition)
        .filter((position): position is TrainingPositionOption => position !== null)
    : [];
}

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

export async function reportScreenSecurityEvent(
  eventType: "screenshot" | "recording",
  screenName?: string,
  deviceInfo?: Record<string, unknown>,
): Promise<void> {
  await mobileApiClient.post("/training/screen-security-events", {
    eventType,
    screenName: screenName ?? null,
    deviceInfo: deviceInfo ?? null,
  });
}

export async function fetchTrainingMyTitles(): Promise<TrainingMyTitles> {
  return mobileApiClient.get<TrainingMyTitles>("/training/my-titles");
}

export async function equipTrainingTitle(
  code: string | null,
): Promise<TrainingMyTitles> {
  return mobileApiClient.put<TrainingMyTitles>("/training/my-titles/equipped", {
    code,
  });
}

export async function fetchTrainingMyBadges(): Promise<TrainingMyBadges> {
  return mobileApiClient.get<TrainingMyBadges>("/training/badges/my");
}

export async function fetchTrainingMyRecords(): Promise<TrainingMyRecords> {
  return mobileApiClient.get<TrainingMyRecords>("/training/my-records");
}

function getApiBaseUrl(): string {
  return MOBILE_API_URL.replace(/\/+$/, "");
}

export function getTrainingMaterialFileUrl(objectKey: string): string {
  const url = `${getApiBaseUrl()}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
  const token = getAccessToken();
  return token ? `${url}&token=${encodeURIComponent(token)}` : url;
}

type SignedMediaUrl = {
  url: string;
};

export async function getTrainingMaterialStreamingUrl(
  material: TrainingPlanMaterial,
): Promise<string> {
  const response = await mobileApiClient.get<SignedMediaUrl>(
    `/media/sign?objectKey=${encodeURIComponent(material.objectKey)}`,
  );

  return response.url;
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
  userId: number | string,
): Promise<{ fileUri: string; directoryUri: string }> {
  const cacheDirectory = createUserMediaCacheDirectory(
    userId,
    "training",
    buildTrainingCacheDirectoryName(material),
  );
  cacheDirectory.create({ idempotent: true, intermediates: true });

  const file = new File(cacheDirectory, buildTrainingFileName(material));

  if (file.exists && file.size > 0) {
    return {
      fileUri: file.uri,
      directoryUri: cacheDirectory.uri,
    };
  }

  const accessToken = getAccessToken() || (await secureTokenStorage.getAccessToken());

  if (!accessToken) {
    throw new Error("ACCESS_TOKEN_REQUIRED");
  }

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

  return {
    fileUri: downloadedFile.uri,
    directoryUri: cacheDirectory.uri,
  };
}

function buildTrainingCacheDirectoryName(material: TrainingPlanMaterial): string {
  const updatedAt = Date.parse(material.updatedAt);
  const version = Number.isNaN(updatedAt) ? "unknown" : String(updatedAt);

  return `training-material-${material.id}-${version}`;
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

import {
  abcGradeQueryKeys,
  ordersQueryKeys,
  storeManagementQueryKeys,
  trainingQueryKeys,
} from "@zhao/api";
import type { QueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { fetchOrderSuppliers } from "@/features/orders/orderApi";
import {
  fetchPublishedGradeBoard,
  fetchPublishedGradeCycles,
} from "@/features/dashboard/abcGradeBoardApi";
import {
  fetchManageableStores,
} from "@/features/stores/storeApi";
import { fetchLocalizedTrainingPlan } from "@/features/training/trainingQueries";

const MAX_CRITICAL_IMAGE_COUNT = 3;

type HomePreloadOptions = {
  language: AuthLanguage;
  queryClient: QueryClient;
  userId: number | string;
};

export function selectCriticalImageUrls(urls: ReadonlyArray<string | null | undefined>): string[] {
  const uniqueUrls = new Set<string>();

  for (const url of urls) {
    if (!url || !/^https?:\/\//i.test(url)) continue;

    uniqueUrls.add(url);
    if (uniqueUrls.size === MAX_CRITICAL_IMAGE_COUNT) break;
  }

  return [...uniqueUrls];
}

export async function preloadCriticalImages(
  urls: ReadonlyArray<string | null | undefined>,
): Promise<boolean> {
  const criticalImageUrls = selectCriticalImageUrls(urls);

  if (criticalImageUrls.length === 0) return true;

  try {
    return await Image.prefetch(criticalImageUrls, "memory-disk");
  } catch (error) {
    console.warn("Unable to prewarm critical mobile images.", error);
    return false;
  }
}

export async function prepareOrdersPage(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData({
    meta: { persist: true },
    queryFn: fetchOrderSuppliers,
    queryKey: ordersQueryKeys.suppliers(),
  });
}

export async function prepareStoresPage(
  queryClient: QueryClient,
  userId: number | string,
): Promise<void> {
  const stores = await queryClient.ensureQueryData({
    meta: { persist: true },
    queryFn: fetchManageableStores,
    queryKey: storeManagementQueryKeys.stores(userId),
  });

  await preloadCriticalImages(stores.map((store) => store.photoUri));
}

export async function prepareStoreGradeRankingPage(queryClient: QueryClient): Promise<void> {
  const [board] = await Promise.all([
    queryClient.ensureQueryData({
      meta: { persist: true },
      queryFn: () => fetchPublishedGradeBoard(),
      queryKey: abcGradeQueryKeys.latest(),
    }),
    queryClient.ensureQueryData({
      meta: { persist: true },
      queryFn: fetchPublishedGradeCycles,
      queryKey: abcGradeQueryKeys.cycles(),
    }),
  ]);

  if (!board) return;

  const rankedPhotoUris = [...board.entries]
    .sort(
      (left, right) =>
        (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER),
    )
    .map((entry) => entry.photoUri);

  await preloadCriticalImages(rankedPhotoUris);
}

export async function prepareTrainingPage(
  queryClient: QueryClient,
  userId: number | string,
  language: AuthLanguage,
): Promise<void> {
  await queryClient.ensureQueryData({
    meta: { persist: true },
    queryFn: () => fetchLocalizedTrainingPlan(language),
    queryKey: trainingQueryKeys.myPlan(userId, language),
  });
}

async function runPreloadTask(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.warn("Unable to prewarm a high-frequency mobile page.", error);
  }
}

export async function prepareHighFrequencyPages({
  language,
  queryClient,
  userId,
}: HomePreloadOptions): Promise<void> {
  await Promise.all([
    runPreloadTask(() => prepareOrdersPage(queryClient)),
    runPreloadTask(() => prepareStoresPage(queryClient, userId)),
  ]);

  await Promise.all([
    runPreloadTask(() => prepareTrainingPage(queryClient, userId, language)),
    runPreloadTask(() => prepareStoreGradeRankingPage(queryClient)),
  ]);
}

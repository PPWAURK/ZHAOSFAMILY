export type VideoFeedWindow = {
  currentIndex: number;
  nextIndex: number | null;
  previousIndex: number | null;
};

export function getVideoFeedWindow(
  activeIndex: number,
  videoCount: number,
): VideoFeedWindow {
  const currentIndex = Math.max(0, Math.min(activeIndex, videoCount - 1));

  return {
    currentIndex,
    nextIndex: currentIndex + 1 < videoCount ? currentIndex + 1 : null,
    previousIndex: currentIndex > 0 ? currentIndex - 1 : null,
  };
}

export function getVideoFeedRetainedIndexes(
  activeIndex: number,
  videoCount: number,
): number[] {
  if (videoCount === 0) return [];

  const { currentIndex, nextIndex, previousIndex } = getVideoFeedWindow(
    activeIndex,
    videoCount,
  );

  return [previousIndex, currentIndex, nextIndex].filter(
    (index): index is number => index !== null,
  );
}

export function shouldAcceptPreparedVideoSource(
  materialId: number,
  requestVersion: number,
  preparingVersions: ReadonlyMap<number, number>,
  preloadMaterialIds: ReadonlySet<number>,
): boolean {
  return (
    preparingVersions.get(materialId) === requestVersion &&
    preloadMaterialIds.has(materialId)
  );
}

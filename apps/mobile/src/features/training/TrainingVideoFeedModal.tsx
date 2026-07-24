import {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useEventListener } from "expo";
import { createVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import {
  AppState,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { getTrainingMaterialStreamingUrl } from "@/features/training/trainingApi";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import {
  assessViewerStats,
  VIDEO_COMPLETION_WATCHED_PCT,
} from "@/features/training/trainingProgressRules";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type { VideoViewerMessage } from "@/features/training/trainingViewer";
import {
  getVideoFeedRetainedIndexes,
  getVideoFeedWindow,
  shouldAcceptPreparedVideoSource,
} from "@/features/training/trainingVideoFeed";
import type {
  TrainingMaterialProgress,
  TrainingPlanMaterial,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type VideoSource = {
  canSeek: boolean;
  player: VideoPlayer;
  resumePct: number;
};

type TrainingVideoFeedModalProps = {
  bottomInset: number;
  copy: TrainingCopySet;
  initialMaterialId: number | null;
  materials: TrainingPlanMaterial[];
  onClose: () => void;
  onStartQuiz: (material: TrainingPlanMaterial) => void;
  syncProgress: (
    materialId: number,
    input: UpdateTrainingProgressInput,
  ) => Promise<TrainingMaterialProgress | null>;
  topInset: number;
};

function retainMaterialRecords<T>(
  records: Record<number, T>,
  retainedMaterialIds: Set<number>,
): Record<number, T> {
  const nextRecords: Record<number, T> = {};
  let removedRecord = false;

  Object.entries(records).forEach(([materialId, value]) => {
    const numericMaterialId = Number(materialId);
    if (retainedMaterialIds.has(numericMaterialId)) {
      nextRecords[numericMaterialId] = value;
    } else {
      removedRecord = true;
    }
  });

  return removedRecord ? nextRecords : records;
}

function moveInitialMaterialToFeedStart(
  materials: TrainingPlanMaterial[],
  initialMaterialId: number | null,
): TrainingPlanMaterial[] {
  const initialIndex = materials.findIndex(
    (material) => material.id === initialMaterialId,
  );

  if (initialIndex <= 0) return materials;

  return [...materials.slice(initialIndex), ...materials.slice(0, initialIndex)];
}

function getVideoProgressLabel(
  copy: TrainingCopySet,
  watchedPct: number,
): string {
  return copy.trackingVideo
    .replace("{watched}", String(Math.round(watchedPct)))
    .replace("{required}", String(VIDEO_COMPLETION_WATCHED_PCT));
}

async function createVideoSource(
  material: TrainingPlanMaterial,
  canSeek: boolean,
): Promise<VideoSource> {
  const streamUrl = await getTrainingMaterialStreamingUrl(material);
  const resumePct =
    material.progress.status === "in_progress"
      ? material.progress.progressPct
      : 0;
  const player = createVideoPlayer({ uri: streamUrl });
  player.audioMixingMode = "doNotMix";
  player.muted = true;
  player.staysActiveInBackground = false;
  player.timeUpdateEventInterval = 0.4;
  player.pause();

  return {
    canSeek,
    player,
    resumePct,
  };
}

type NativeVideoSeekBarProps = {
  canSeek: boolean;
  currentTime: number;
  duration: number;
  onSeekComplete: (time: number) => void;
  onSeekPreview: (time: number) => void;
  onSeekStart: () => void;
};

function formatVideoTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function NativeVideoSeekBar({
  canSeek,
  currentTime,
  duration,
  onSeekComplete,
  onSeekPreview,
  onSeekStart,
}: NativeVideoSeekBarProps): ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const latestSeekTimeRef = useRef(currentTime);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleTrackLayout = useCallback((event: LayoutChangeEvent): void => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const previewLocationX = useCallback(
    (locationX: number): void => {
      if (!canSeek || !duration || !trackWidth) return;

      const pct = Math.max(0, Math.min(1, locationX / trackWidth));
      const nextTime = duration * pct;
      latestSeekTimeRef.current = nextTime;
      onSeekPreview(nextTime);
    },
    [canSeek, duration, onSeekPreview, trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canSeek,
        onStartShouldSetPanResponderCapture: () => canSeek,
        onMoveShouldSetPanResponder: () => canSeek,
        onMoveShouldSetPanResponderCapture: () => canSeek,
        onPanResponderGrant: (event) => {
          setIsDragging(true);
          onSeekStart();
          previewLocationX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          previewLocationX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event) => {
          previewLocationX(event.nativeEvent.locationX);
          setIsDragging(false);
          onSeekComplete(latestSeekTimeRef.current);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          onSeekComplete(latestSeekTimeRef.current);
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [canSeek, onSeekComplete, onSeekStart, previewLocationX],
  );

  return (
    <View
      accessible={canSeek}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: !canSeek }}
      accessibilityValue={{
        max: Math.max(0, Math.round(duration)),
        min: 0,
        now: Math.max(0, Math.round(currentTime)),
      }}
      onLayout={handleTrackLayout}
      style={styles.videoFeedPlaybackTrack}
      {...panResponder.panHandlers}
    >
      {isDragging ? (
        <View pointerEvents="none" style={styles.videoFeedPlaybackTimeBubble}>
          <Text style={styles.videoFeedPlaybackTimeText}>
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.videoFeedPlaybackRail}>
        <View style={[styles.videoFeedPlaybackFill, { width: `${progressPct}%` }]} />
      </View>
      {canSeek ? (
        <View
          pointerEvents="none"
          style={[styles.videoFeedPlaybackThumb, { left: `${progressPct}%` }]}
        />
      ) : null}
    </View>
  );
}

type NativeVideoPlayerProps = {
  canSeek: boolean;
  isActive: boolean;
  onError: () => void;
  onProgress: (currentTime: number, duration: number, ended: boolean) => void;
  onReady: () => void;
  player: VideoPlayer;
  resumePct: number;
};

const NativeVideoPlayer = memo(function NativeVideoPlayer({
  canSeek,
  isActive,
  onError,
  onProgress,
  onReady,
  player,
  resumePct,
}: NativeVideoPlayerProps): ReactElement {
  const [currentTime, setCurrentTime] = useState(player.currentTime || 0);
  const [duration, setDuration] = useState(player.duration || 0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const longPressRef = useRef(false);
  const resumeAppliedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const wasPlayingBeforeSeekRef = useRef(false);
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  const onReadyRef = useRef(onReady);
  onErrorRef.current = onError;
  onProgressRef.current = onProgress;
  onReadyRef.current = onReady;

  const applyResumePosition = useCallback(
    (nextDuration: number): void => {
      if (resumeAppliedRef.current || !nextDuration || resumePct <= 0 || resumePct >= 95) {
        return;
      }

      player.currentTime = nextDuration * (resumePct / 100);
      resumeAppliedRef.current = true;
    },
    [player, resumePct],
  );

  useEventListener(player, "sourceLoad", ({ duration: nextDuration }) => {
    setDuration(nextDuration);
    applyResumePosition(nextDuration);
    onReadyRef.current();
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") {
      onErrorRef.current();
      return;
    }

    if (status === "readyToPlay") onReadyRef.current();
  });

  useEventListener(player, "timeUpdate", ({ currentTime: nextTime }) => {
    const nextDuration = player.duration || duration;
    if (!isSeekingRef.current) setCurrentTime(nextTime);
    setDuration(nextDuration);
    onProgressRef.current(nextTime, nextDuration, false);
  });

  useEventListener(player, "playToEnd", () => {
    const nextDuration = player.duration || duration;
    setCurrentTime(nextDuration);
    onProgressRef.current(nextDuration, nextDuration, true);
  });

  useEffect(() => {
    if (player.status === "readyToPlay") onReadyRef.current();
    if (player.status === "error") onErrorRef.current();
  }, [player]);

  const handleLongPress = useCallback((): void => {
    longPressRef.current = true;
    if (player.status !== "readyToPlay") return;

    player.playbackRate = 2;
    player.play();
    setIsFastForwarding(true);
  }, [player]);

  const handlePress = useCallback((): void => {
    if (longPressRef.current || !isActive) return;

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [isActive, player]);

  const handlePressOut = useCallback((): void => {
    if (!longPressRef.current) return;

    longPressRef.current = false;
    player.playbackRate = 1;
    setIsFastForwarding(false);
  }, [player]);

  const handleSeekStart = useCallback((): void => {
    if (!canSeek) return;

    isSeekingRef.current = true;
    wasPlayingBeforeSeekRef.current = player.playing;
    player.pause();
  }, [canSeek, player]);

  const handleSeekPreview = useCallback(
    (time: number): void => {
      if (!canSeek) return;

      setCurrentTime(time);
    },
    [canSeek],
  );

  const handleSeekComplete = useCallback(
    (time: number): void => {
      if (!canSeek) return;

      player.currentTime = time;
      setCurrentTime(time);
      isSeekingRef.current = false;
      if (wasPlayingBeforeSeekRef.current) player.play();
    },
    [canSeek, player],
  );

  return (
    <>
      <VideoView
        contentFit="contain"
        fullscreenOptions={{ enable: false }}
        nativeControls={false}
        onFirstFrameRender={() => onReadyRef.current()}
        player={player}
        requiresLinearPlayback={!canSeek}
        style={styles.videoFeedPlayer}
        surfaceType="textureView"
      />
      {isActive ? (
        <Pressable
          delayLongPress={420}
          onLongPress={handleLongPress}
          onPress={handlePress}
          onPressOut={handlePressOut}
          style={styles.videoFeedGestureLayer}
        />
      ) : null}
      {isActive ? (
        <NativeVideoSeekBar
          canSeek={canSeek}
          currentTime={currentTime}
          duration={duration}
          onSeekComplete={handleSeekComplete}
          onSeekPreview={handleSeekPreview}
          onSeekStart={handleSeekStart}
        />
      ) : null}
      {isFastForwarding ? (
        <View pointerEvents="none" style={styles.videoFeedSpeedFeedback}>
          <Text style={styles.videoFeedSpeedFeedbackText}>2×</Text>
        </View>
      ) : null}
    </>
  );
});

type TrainingVideoFeedSlideProps = {
  copy: TrainingCopySet;
  displayProgress: number;
  feedLength: number;
  isActive: boolean;
  isCompleted: boolean;
  isInfoCollapsed: boolean;
  isLoading: boolean;
  loadError: boolean;
  material: TrainingPlanMaterial;
  onClose: () => void;
  onPlayerError: () => void;
  onPlayerProgress: (currentTime: number, duration: number, ended: boolean) => void;
  onPlayerReady: () => void;
  onRetry: () => void;
  onStartQuiz: () => void;
  onToggleInfo: () => void;
  progressSyncFailed: boolean;
  slideHeight: number;
  source: VideoSource | undefined;
  watchedEnough: boolean;
  watchedPct: number;
  index: number;
};

function areTrainingVideoFeedSlidePropsEqual(
  previous: TrainingVideoFeedSlideProps,
  next: TrainingVideoFeedSlideProps,
): boolean {
  return (
    previous.copy === next.copy &&
    previous.displayProgress === next.displayProgress &&
    previous.feedLength === next.feedLength &&
    previous.index === next.index &&
    previous.isActive === next.isActive &&
    previous.isCompleted === next.isCompleted &&
    previous.isInfoCollapsed === next.isInfoCollapsed &&
    previous.isLoading === next.isLoading &&
    previous.loadError === next.loadError &&
    previous.material === next.material &&
    previous.progressSyncFailed === next.progressSyncFailed &&
    previous.slideHeight === next.slideHeight &&
    previous.source === next.source &&
    previous.watchedEnough === next.watchedEnough &&
    previous.watchedPct === next.watchedPct
  );
}

const TrainingVideoFeedSlide = memo(function TrainingVideoFeedSlide({
  copy,
  displayProgress,
  feedLength,
  index,
  isActive,
  isCompleted,
  isInfoCollapsed,
  isLoading,
  loadError,
  material,
  onClose,
  onPlayerError,
  onPlayerProgress,
  onPlayerReady,
  onRetry,
  onStartQuiz,
  onToggleInfo,
  progressSyncFailed,
  slideHeight,
  source,
  watchedEnough,
  watchedPct,
}: TrainingVideoFeedSlideProps): ReactElement {
  return (
    <View style={[styles.videoFeedSlide, { height: slideHeight }]}> 
      {source ? (
        <NativeVideoPlayer
          canSeek={isCompleted}
          isActive={isActive}
          onError={onPlayerError}
          onProgress={onPlayerProgress}
          onReady={onPlayerReady}
          player={source.player}
          resumePct={source.resumePct}
        />
      ) : (
        <View style={styles.videoFeedPlaceholder}>
          <Text style={styles.videoFeedPlaceholderKicker}>ZHAO · VIDEO</Text>
        </View>
      )}

      {isActive && isLoading ? (
        <View style={styles.videoFeedLoadingOverlay}>
          <ZhaoLoadingIndicator label={copy.previewLoading} variant="overlay" />
        </View>
      ) : null}

      {isActive && loadError ? (
        <View style={styles.videoFeedLoadingOverlay}>
          <Text style={styles.videoFeedErrorText}>{copy.previewError}</Text>
          <Pressable style={styles.videoFeedRetryButton} onPress={onRetry}>
            <Text style={styles.videoFeedRetryText}>{copy.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.videoFeedOverlay} pointerEvents="box-none">
        <View style={styles.videoFeedTopBar}>
          <Text style={styles.videoFeedCounter}>
            {index + 1} / {feedLength}
          </Text>
          <View style={styles.videoFeedTopActions}>
            <Pressable style={styles.videoFeedInfoToggle} onPress={onToggleInfo}>
              <Text style={styles.videoFeedInfoToggleText}>
                {isInfoCollapsed
                  ? copy.videoFeedShowDetails
                  : copy.videoFeedHideDetails}
              </Text>
            </Pressable>
            <Pressable style={styles.videoFeedCloseButton} onPress={onClose}>
              <Text style={styles.videoFeedCloseText}>{copy.close}</Text>
            </Pressable>
          </View>
        </View>

        {!isInfoCollapsed ? (
          <View style={styles.videoFeedInfo}>
            <View style={styles.videoFeedTagRow}>
              <Text style={styles.videoFeedTag}>{material.positionId}</Text>
              {material.isRequired ? (
                <Text style={styles.videoFeedRequiredTag}>{copy.required}</Text>
              ) : null}
              {material.hasQuiz ? (
                <Text style={styles.videoFeedTag}>{copy.quizTag}</Text>
              ) : null}
            </View>
            <Text style={styles.videoFeedTitle} numberOfLines={2}>
              {material.title}
            </Text>
            <Text style={styles.videoFeedDescription} numberOfLines={2}>
              {material.description || material.originalName}
            </Text>
            <View style={styles.videoFeedProgressTrack}>
              <View
                style={[styles.videoFeedProgressFill, { width: `${displayProgress}%` }]}
              />
            </View>
            <Text style={styles.videoFeedProgressText}>
              {isCompleted
                ? copy.completed
                : getVideoProgressLabel(copy, watchedPct)}
            </Text>
            {progressSyncFailed ? (
              <Text style={styles.videoFeedSyncErrorText}>
                {copy.progressSyncFailed}
              </Text>
            ) : null}
            {material.hasQuiz && watchedEnough && !isCompleted ? (
              <Pressable style={styles.videoFeedQuizButton} onPress={onStartQuiz}>
                <Text style={styles.videoFeedQuizButtonText}>{copy.startQuiz}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}, areTrainingVideoFeedSlidePropsEqual);

export function TrainingVideoFeedModal({
  bottomInset,
  copy,
  initialMaterialId,
  materials,
  onClose,
  onStartQuiz,
  syncProgress,
  topInset,
}: TrainingVideoFeedModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);
  const [resourceCleanupVersion, setResourceCleanupVersion] = useState(0);
  const [sourcesByMaterialId, setSourcesByMaterialId] = useState<
    Record<number, VideoSource>
  >({});
  const [loadingMaterialIds, setLoadingMaterialIds] = useState<Record<number, true>>({});
  const [readyMaterialIds, setReadyMaterialIds] = useState<Record<number, true>>({});
  const [loadErrorMaterialIds, setLoadErrorMaterialIds] = useState<Record<number, true>>({});
  const [progressByMaterialId, setProgressByMaterialId] = useState<Record<number, number>>({});
  const [watchedPctByMaterialId, setWatchedPctByMaterialId] = useState<
    Record<number, number>
  >({});
  const [progressSyncFailedMaterialId, setProgressSyncFailedMaterialId] = useState<
    number | null
  >(null);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(true);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");
  const [sourceReloadVersion, setSourceReloadVersion] = useState(0);
  const completedMaterialIdsRef = useRef(new Set<number>());
  const lastSyncedPctByMaterialIdRef = useRef(new Map<number, number>());
  const syncInFlightMaterialIdsRef = useRef(new Set<number>());
  const sourceRequestVersionRef = useRef(0);
  const preparingMaterialVersionsRef = useRef(new Map<number, number>());
  const preloadMaterialIdsRef = useRef(new Set<number>());
  const sourcesByMaterialIdRef = useRef<Record<number, VideoSource>>({});
  const playerRefs = useRef(new Map<number, VideoPlayer>());
  const nativeProgressRef = useRef(
    new Map<
      number,
      { duration: number; lastTime: number | null; maxPosition: number; watchedSeconds: number }
    >(),
  );

  const visible = initialMaterialId !== null;
  const feedMaterials = useMemo(
    () => moveInitialMaterialToFeedStart(materials, initialMaterialId),
    [initialMaterialId, materials],
  );
  const activeMaterial = feedMaterials[activeIndex] ?? null;
  const feedWindow = useMemo(
    () => getVideoFeedWindow(activeIndex, feedMaterials.length),
    [activeIndex, feedMaterials.length],
  );
  const preloadIndexes = useMemo(
    () => getVideoFeedRetainedIndexes(activeIndex, feedMaterials.length),
    [activeIndex, feedMaterials.length],
  );
  const retainedIndexes = useMemo(
    () => getVideoFeedRetainedIndexes(settledIndex, feedMaterials.length),
    [feedMaterials.length, settledIndex],
  );
  const slideHeight = Math.max(1, windowHeight - topInset - bottomInset);
  const feedExtraData = useMemo(
    () => ({
      activeIndex,
      loadErrorMaterialIds,
      loadingMaterialIds,
      readyMaterialIds,
      isInfoCollapsed,
      progressByMaterialId,
      progressSyncFailedMaterialId,
      sourcesByMaterialId,
      watchedPctByMaterialId,
    }),
    [
      activeIndex,
      loadErrorMaterialIds,
      loadingMaterialIds,
      readyMaterialIds,
      isInfoCollapsed,
      progressByMaterialId,
      progressSyncFailedMaterialId,
      sourcesByMaterialId,
      watchedPctByMaterialId,
    ],
  );

  useEffect(() => {
    if (!visible) return;

    setActiveIndex(0);
    setSettledIndex(0);
    setLoadErrorMaterialIds({});
    setIsInfoCollapsed(true);
  }, [initialMaterialId, visible]);

  useEffect(() => {
    setIsInfoCollapsed(true);
  }, [activeMaterial?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        setIsAppActive(nextAppState === "active");
      },
    );

    return () => subscription.remove();
  }, []);

  const releasePlayer = useCallback((materialId: number): void => {
    const player = playerRefs.current.get(materialId);
    if (player) {
      player.pause();
      player.release();
      playerRefs.current.delete(materialId);
    }
    nativeProgressRef.current.delete(materialId);
  }, []);

  const releaseAllPlayers = useCallback((): void => {
    playerRefs.current.forEach((player) => {
      player.pause();
      player.release();
    });
    playerRefs.current.clear();
    nativeProgressRef.current.clear();
  }, []);

  useEffect(() => {
    const requestVersion = sourceRequestVersionRef.current + 1;
    sourceRequestVersionRef.current = requestVersion;
    const preloadMaterialIds = new Set(
      preloadIndexes.map((index) => feedMaterials[index]?.id).filter(Boolean),
    );
    preloadMaterialIdsRef.current = preloadMaterialIds;

    if (!visible) {
      releaseAllPlayers();
      sourcesByMaterialIdRef.current = {};
      preloadMaterialIdsRef.current.clear();
      preparingMaterialVersionsRef.current.clear();
      setSourcesByMaterialId({});
      setLoadingMaterialIds({});
      setReadyMaterialIds({});
      setLoadErrorMaterialIds({});
      return;
    }

    async function prepareSource(index: number): Promise<void> {
      const material = feedMaterials[index];
      if (!material) return;

      const canSeek = material.progress.status === "completed";
      const existingSource = sourcesByMaterialIdRef.current[material.id];
      if (existingSource?.canSeek === canSeek) return;
      if (preparingMaterialVersionsRef.current.has(material.id)) return;
      preparingMaterialVersionsRef.current.set(material.id, requestVersion);

      setLoadingMaterialIds((currentIds) => ({
        ...currentIds,
        [material.id]: true,
      }));
      setReadyMaterialIds((currentIds) => {
        const nextIds = { ...currentIds };
        delete nextIds[material.id];
        return nextIds;
      });
      setLoadErrorMaterialIds((currentIds) => {
        const nextIds = { ...currentIds };
        delete nextIds[material.id];
        return nextIds;
      });

      try {
        const source = await createVideoSource(material, canSeek);
        const shouldAcceptSource = shouldAcceptPreparedVideoSource(
          material.id,
          requestVersion,
          preparingMaterialVersionsRef.current,
          preloadMaterialIdsRef.current,
        );
        if (!shouldAcceptSource) {
          source.player.release();
          return;
        }

        playerRefs.current.set(material.id, source.player);
        nativeProgressRef.current.set(material.id, {
          duration: 0,
          lastTime: null,
          maxPosition: 0,
          watchedSeconds: 0,
        });
        setSourcesByMaterialId((currentSources) => {
          const nextSources = { ...currentSources, [material.id]: source };
          sourcesByMaterialIdRef.current = nextSources;
          return nextSources;
        });
      } catch {
        const shouldHandleError = shouldAcceptPreparedVideoSource(
          material.id,
          requestVersion,
          preparingMaterialVersionsRef.current,
          preloadMaterialIdsRef.current,
        );
        if (!shouldHandleError) {
          return;
        }
        setLoadErrorMaterialIds((currentIds) => ({
          ...currentIds,
          [material.id]: true,
        }));
      } finally {
        const isCurrentRequest =
          preparingMaterialVersionsRef.current.get(material.id) === requestVersion;
        if (isCurrentRequest) {
          preparingMaterialVersionsRef.current.delete(material.id);

          setLoadingMaterialIds((currentIds) => {
            const nextIds = { ...currentIds };
            delete nextIds[material.id];
            return nextIds;
          });
        }
      }
    }

    async function prepareWindow(): Promise<void> {
      const currentTask = prepareSource(feedWindow.currentIndex);
      const nextTask =
        feedWindow.nextIndex === null
          ? Promise.resolve()
          : prepareSource(feedWindow.nextIndex);

      await Promise.all([currentTask, nextTask]);
      if (sourceRequestVersionRef.current !== requestVersion) return;

      if (feedWindow.previousIndex !== null) {
        void prepareSource(feedWindow.previousIndex);
      }
    }

    if (visible) {
      void prepareWindow();
    }

  }, [
    feedMaterials,
    feedWindow,
    releaseAllPlayers,
    preloadIndexes,
    sourceReloadVersion,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;

    const retainedMaterialIds = new Set(
      retainedIndexes.map((index) => feedMaterials[index]?.id).filter(Boolean),
    );

    playerRefs.current.forEach((_player, materialId) => {
      if (!retainedMaterialIds.has(materialId)) {
        releasePlayer(materialId);
      }
    });

    setSourcesByMaterialId((currentSources) => {
      const retainedSources = retainMaterialRecords(
        currentSources,
        retainedMaterialIds,
      );
      sourcesByMaterialIdRef.current = retainedSources;
      return retainedSources;
    });
    setLoadingMaterialIds((currentIds) =>
      retainMaterialRecords(currentIds, retainedMaterialIds),
    );
    setReadyMaterialIds((currentIds) =>
      retainMaterialRecords(currentIds, retainedMaterialIds),
    );
    setLoadErrorMaterialIds((currentIds) =>
      retainMaterialRecords(currentIds, retainedMaterialIds),
    );
  }, [
    feedMaterials,
    releasePlayer,
    resourceCleanupVersion,
    retainedIndexes,
    visible,
  ]);

  useEffect(() => {
    const activeMaterialId = visible && isAppActive ? activeMaterial?.id : null;
    playerRefs.current.forEach((player, materialId) => {
      const shouldPlay = materialId === activeMaterialId;
      player.muted = !shouldPlay;
      if (shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    });
  }, [activeMaterial?.id, isAppActive, sourcesByMaterialId, visible]);

  useEffect(() => () => {
    releaseAllPlayers();
  }, [releaseAllPlayers]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<TrainingPlanMaterial>> }) => {
      const activeItem = viewableItems.find(
        (item) => item.isViewable && item.index !== null,
      );
      const nextIndex = activeItem?.index;
      if (nextIndex === null || nextIndex === undefined) return;

      setActiveIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      );
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      if (feedMaterials.length === 0) return;

      const nextIndex = Math.max(
        0,
        Math.min(
          feedMaterials.length - 1,
          Math.round(event.nativeEvent.contentOffset.y / slideHeight),
        ),
      );
      setActiveIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      );
      setSettledIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      );
      setResourceCleanupVersion((currentVersion) => currentVersion + 1);
    },
    [feedMaterials.length, slideHeight],
  );

  function retryVideo(materialId: number): void {
    releasePlayer(materialId);
    preparingMaterialVersionsRef.current.delete(materialId);
    setSourcesByMaterialId((currentSources) => {
      const nextSources = { ...currentSources };
      delete nextSources[materialId];
      sourcesByMaterialIdRef.current = nextSources;
      return nextSources;
    });
    setLoadErrorMaterialIds((currentIds) => {
      const nextIds = { ...currentIds };
      delete nextIds[materialId];
      return nextIds;
    });
    setReadyMaterialIds((currentIds) => {
      const nextIds = { ...currentIds };
      delete nextIds[materialId];
      return nextIds;
    });
    setLoadingMaterialIds((currentIds) => {
      const nextIds = { ...currentIds };
      delete nextIds[materialId];
      return nextIds;
    });
    setSourceReloadVersion((currentVersion) => currentVersion + 1);
  }

  function updateDisplayedProgress(materialId: number, progressPct: number): void {
    setProgressByMaterialId((currentProgress) => {
      const currentPct = currentProgress[materialId] ?? 0;
      const nextPct = Math.max(currentPct, progressPct);
      if (Math.round(currentPct) === Math.round(nextPct)) return currentProgress;

      return { ...currentProgress, [materialId]: nextPct };
    });
  }

  function updateWatchedProgress(materialId: number, watchedPct: number): void {
    setWatchedPctByMaterialId((currentProgress) => {
      const currentPct = currentProgress[materialId] ?? 0;
      const nextPct = Math.max(currentPct, watchedPct);
      if (Math.round(currentPct) === Math.round(nextPct)) return currentProgress;

      return { ...currentProgress, [materialId]: nextPct };
    });
  }

  function syncVideoProgress(
    material: TrainingPlanMaterial,
    message: VideoViewerMessage,
  ): void {
    const assessment = assessViewerStats(message);
    updateWatchedProgress(material.id, message.watchedPct);
    const currentProgress = Math.max(
      material.progress.progressPct,
      progressByMaterialId[material.id] ?? 0,
      message.positionPct,
    );
    updateDisplayedProgress(material.id, currentProgress);

    const lastSyncedPct =
      lastSyncedPctByMaterialIdRef.current.get(material.id) ??
      material.progress.progressPct;

    if (
      assessment.shouldAutoComplete &&
      !material.hasQuiz &&
      material.progress.status !== "completed" &&
      !completedMaterialIdsRef.current.has(material.id)
    ) {
      completedMaterialIdsRef.current.add(material.id);
      void syncProgress(material.id, { status: "completed" }).then((progress) => {
        if (!progress) {
          completedMaterialIdsRef.current.delete(material.id);
          setProgressSyncFailedMaterialId(material.id);
          return;
        }

        updateDisplayedProgress(material.id, progress.progressPct);
        setProgressSyncFailedMaterialId((currentMaterialId) =>
          currentMaterialId === material.id ? null : currentMaterialId,
        );
      });
      return;
    }

    if (
      assessment.progressPct < lastSyncedPct + 10 ||
      syncInFlightMaterialIdsRef.current.has(material.id)
    ) {
      return;
    }

    syncInFlightMaterialIdsRef.current.add(material.id);
    void syncProgress(material.id, {
      status: "in_progress",
      progressPct: assessment.progressPct,
    }).then((progress) => {
      syncInFlightMaterialIdsRef.current.delete(material.id);
      if (!progress) {
        setProgressSyncFailedMaterialId(material.id);
        return;
      }

      lastSyncedPctByMaterialIdRef.current.set(material.id, progress.progressPct);
      updateDisplayedProgress(material.id, progress.progressPct);
      setProgressSyncFailedMaterialId((currentMaterialId) =>
        currentMaterialId === material.id ? null : currentMaterialId,
      );
    });
  }

  function syncNativeVideoProgress(
    material: TrainingPlanMaterial,
    currentTime: number,
    duration: number,
    ended: boolean,
  ): void {
    if (!duration) return;

    const progressState = nativeProgressRef.current.get(material.id) ?? {
      duration,
      lastTime: null,
      maxPosition: 0,
      watchedSeconds: 0,
    };
    const delta =
      progressState.lastTime === null ? 0 : currentTime - progressState.lastTime;

    if (delta > 0 && delta < 2) {
      progressState.watchedSeconds += delta;
    }
    progressState.duration = duration;
    progressState.lastTime = currentTime;
    progressState.maxPosition = Math.max(progressState.maxPosition, currentTime);
    nativeProgressRef.current.set(material.id, progressState);

    const message: VideoViewerMessage = {
      kind: "video",
      positionPct: Math.min(100, (progressState.maxPosition / duration) * 100),
      watchedPct: Math.min(100, (progressState.watchedSeconds / duration) * 100),
      ended,
    };
    syncVideoProgress(material, message);
  }

  function renderVideoSlide({
    item: material,
    index,
  }: {
    item: TrainingPlanMaterial;
    index: number;
  }): ReactElement {
    const isActive = index === activeIndex;
    const source = sourcesByMaterialId[material.id];
    const displayProgress = Math.max(
      material.progress.progressPct,
      progressByMaterialId[material.id] ?? 0,
    );
    const isCompleted =
      material.progress.status === "completed" ||
      completedMaterialIdsRef.current.has(material.id);
    const watchedPct = watchedPctByMaterialId[material.id] ?? 0;
    const watchedEnough = watchedPct >= VIDEO_COMPLETION_WATCHED_PCT;

    return (
      <TrainingVideoFeedSlide
        copy={copy}
        displayProgress={displayProgress}
        feedLength={feedMaterials.length}
        isActive={isActive}
        isCompleted={isCompleted}
        isInfoCollapsed={isInfoCollapsed}
        isLoading={
          Boolean(loadingMaterialIds[material.id]) ||
          Boolean(source && !readyMaterialIds[material.id])
        }
        loadError={Boolean(loadErrorMaterialIds[material.id])}
        material={material}
        onClose={onClose}
        onPlayerError={() => {
          setReadyMaterialIds((currentIds) => {
            if (!currentIds[material.id]) return currentIds;

            const nextIds = { ...currentIds };
            delete nextIds[material.id];
            return nextIds;
          });
          setLoadingMaterialIds((currentIds) => {
            if (!currentIds[material.id]) return currentIds;

            const nextIds = { ...currentIds };
            delete nextIds[material.id];
            return nextIds;
          });
          setLoadErrorMaterialIds((currentIds) =>
            currentIds[material.id]
              ? currentIds
              : { ...currentIds, [material.id]: true },
          );
        }}
        onPlayerProgress={(currentTime, duration, ended) => {
          syncNativeVideoProgress(material, currentTime, duration, ended);
        }}
        onPlayerReady={() => {
          setReadyMaterialIds((currentIds) =>
            currentIds[material.id]
              ? currentIds
              : { ...currentIds, [material.id]: true },
          );
          setLoadingMaterialIds((currentIds) => {
            if (!currentIds[material.id]) return currentIds;

            const nextIds = { ...currentIds };
            delete nextIds[material.id];
            return nextIds;
          });
        }}
        onRetry={() => retryVideo(material.id)}
        onStartQuiz={() => onStartQuiz(material)}
        onToggleInfo={() => setIsInfoCollapsed((collapsed) => !collapsed)}
        progressSyncFailed={progressSyncFailedMaterialId === material.id}
        slideHeight={slideHeight}
        source={source}
        watchedEnough={watchedEnough}
        watchedPct={watchedPct}
        index={index}
      />
    );
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["left", "right"]}
        style={[
          styles.videoFeedRoot,
          { paddingBottom: bottomInset, paddingTop: topInset },
        ]}
      >
        <FlatList
          data={feedMaterials}
          extraData={feedExtraData}
          decelerationRate="fast"
          getItemLayout={(_data, index) => ({
            index,
            length: slideHeight,
            offset: slideHeight * index,
          })}
          initialNumToRender={3}
          keyExtractor={(material) => String(material.id)}
          maxToRenderPerBatch={3}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled
          renderItem={renderVideoSlide}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          onViewableItemsChanged={onViewableItemsChanged}
        />
      </SafeAreaView>
    </Modal>
  );
}

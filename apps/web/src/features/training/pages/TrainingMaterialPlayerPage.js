"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchTrainingMaterial,
  getTrainingMediaUrl,
  updateTrainingProgress,
} from "@/features/training/services/trainingMediaApi";

const PLAYER_PAGE_COPY = {
  zh: {
    shared: TRAINING_COPY.zh.shared,
    page: {
      topStage: "Training material · PLAYER",
      kicker: "ZHAO's · Training · Player",
      title: "学习",
      titleEm: "资料",
      titleSuffix: "",
      lede: "播放或查看已上传到 MinIO 的培训资料。",
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "Training material · PLAYER",
      kicker: "ZHAO's · Training · Player",
      title: "Learning",
      titleEm: " material",
      titleSuffix: "",
      lede: "Play or view uploaded training media from MinIO.",
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Training material · PLAYER",
      kicker: "ZHAO's · Training · Player",
      title: "Support",
      titleEm: " de",
      titleSuffix: " formation",
      lede: "Lire ou consulter les supports importés dans MinIO.",
    },
  },
};

function resolveWatermarkLabel(user) {
  const name =
      user?.name?.trim() ||
      [user?.givenName, user?.familyName].filter(Boolean).join(" ").trim();

  const email = user?.email?.trim();

  return [name, email].filter(Boolean).join(" · ");
}

export default function TrainingMaterialPlayerPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const materialId = searchParams.get("id");
  const [material, setMaterial] = useState(null);
  const [progress, setProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progressErrorMessage, setProgressErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadMaterial() {
      setIsLoading(true);
      setErrorMessage("");
      setProgressErrorMessage("");

      try {
        if (!materialId) {
          throw new Error("缺少资料 ID");
        }

        const nextMaterial = await fetchTrainingMaterial(materialId);
        if (isActive) {
          setMaterial(nextMaterial);
        }

        try {
          const nextProgress = await updateTrainingProgress(materialId, {
            status: "in_progress",
            progressPct: 10,
          });
          if (isActive) {
            setProgress(nextProgress);
          }
        } catch (progressError) {
          if (isActive) {
            setProgressErrorMessage(
              progressError.message || "学习进度保存失败",
            );
          }
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || "资料加载失败");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      isActive = false;
    };
  }, [materialId]);

  async function markCompleted() {
    if (!materialId) {
      return;
    }

    setIsSavingProgress(true);
    setProgressErrorMessage("");

    try {
      const nextProgress = await updateTrainingProgress(materialId, {
        status: "completed",
        progressPct: 100,
      });
      setProgress(nextProgress);
    } catch (error) {
      setProgressErrorMessage(error.message || "学习进度保存失败");
    } finally {
      setIsSavingProgress(false);
    }
  }

  return (
    <TrainingLayout pageCopy={PLAYER_PAGE_COPY}>
      {({ styles }) => {
        if (isLoading) {
          return (
            <section className={styles.materialEmpty}>正在加载资料...</section>
          );
        }

        if (errorMessage || !material) {
          return (
            <section className={styles.uploadMessageError}>
              {errorMessage || "资料不存在"}
            </section>
          );
        }

        const mediaUrl = getTrainingMediaUrl(material.objectKey);
        const isVideo = material.mimeType?.startsWith("video/");
        const isPdf = material.mimeType === "application/pdf";
        const isImage = material.mimeType?.startsWith("image/");
        const pdfPreviewUrl = `${mediaUrl}#toolbar=0&navpanes=0&download=0`;
        const watermarkLabel = resolveWatermarkLabel(user);

        return (
          <section className={styles.playerWorkspace}>
            <div className={styles.playerHeader}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>{material.type}</span>
                  <span>{material.positionId}</span>
                </p>
                <h2 className={styles.uploadTitle}>{material.title}</h2>
                <p className={styles.uploadHint}>{material.originalName}</p>
                <p className={styles.progressStatus}>
                  当前进度：
                  {progress?.status === "completed"
                    ? "已完成"
                    : progress?.status === "in_progress"
                      ? "学习中"
                      : "未开始"}
                  {" · "}
                  {progress?.progressPct ?? 0}%
                </p>
                {progressErrorMessage ? (
                  <p className={styles.progressError}>{progressErrorMessage}</p>
                ) : null}
              </div>
              <div className={styles.playerActions}>
                <button
                  type="button"
                  className={styles.completeButton}
                  onClick={markCompleted}
                  disabled={
                    isSavingProgress || progress?.status === "completed"
                  }
                >
                  {progress?.status === "completed" ? "已完成" : "标记完成"}
                </button>
                <Link
                  href="/dashboard/training/materials"
                  className={styles.backLink}
                >
                  返回资料库
                </Link>
              </div>
            </div>

            <div className={styles.watermarkedViewer}>
              {isVideo ? (
                <video
                  className={styles.videoPlayer}
                  src={mediaUrl}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  onEnded={markCompleted}
                  onContextMenu={(event) => event.preventDefault()}
                />
              ) : isPdf ? (
                <iframe
                  className={styles.pdfViewer}
                  src={pdfPreviewUrl}
                  title={material.title}
                />
              ) : isImage ? (
                <img
                  className={styles.imageViewer}
                  src={mediaUrl}
                  alt={material.title}
                  draggable="false"
                  onContextMenu={(event) => event.preventDefault()}
                />
              ) : (
                <div className={styles.previewUnavailable}>
                  当前文件类型暂不支持在线预览。
                </div>
              )}

              <div className={styles.viewerWatermark} aria-hidden="true">
                <span>{watermarkLabel}</span>
              </div>
            </div>
          </section>
        );
      }}
    </TrainingLayout>
  );
}

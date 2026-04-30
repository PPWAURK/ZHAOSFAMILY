"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchTrainingMaterial,
  getTrainingMediaUrl,
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

export default function TrainingMaterialPlayerPage() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get("id");
  const [material, setMaterial] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadMaterial() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!materialId) {
          throw new Error("缺少资料 ID");
        }

        const nextMaterial = await fetchTrainingMaterial(materialId);
        if (isActive) {
          setMaterial(nextMaterial);
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

  return (
    <TrainingLayout pageCopy={PLAYER_PAGE_COPY}>
      {({ styles }) => {
        if (isLoading) {
          return <section className={styles.materialEmpty}>正在加载资料...</section>;
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
        const pdfPreviewUrl = `${mediaUrl}#toolbar=0&navpanes=0&download=0`;

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
              </div>
              <Link href="/dashboard/training/materials" className={styles.backLink}>
                返回资料库
              </Link>
            </div>

            {isVideo ? (
              <video
                className={styles.videoPlayer}
                src={mediaUrl}
                controls
                controlsList="nodownload"
                preload="metadata"
                onContextMenu={(event) => event.preventDefault()}
              />
            ) : isPdf ? (
              <iframe
                className={styles.pdfViewer}
                src={pdfPreviewUrl}
                title={material.title}
              />
            ) : (
              <div className={styles.previewUnavailable}>
                当前文件类型暂不支持在线预览。
              </div>
            )}
          </section>
        );
      }}
    </TrainingLayout>
  );
}

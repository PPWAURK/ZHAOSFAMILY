"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  createTrainingMaterial,
  fetchTrainingPositions,
  uploadTrainingMedia,
} from "@/features/training/services/trainingMediaApi";
import {
  DEFAULT_TRAINING_POSITION_TREE,
  flattenTrainingPositions,
  getTrainingPositionLabel,
  getTrainingPositionSecondaryLabel,
} from "@/features/training/utils/trainingPositions";

const UPLOAD_PAGE_COPY = {
  zh: {
    shared: TRAINING_COPY.zh.shared,
    page: {
      topStage: "Training upload · MEDIA",
      kicker: "ZHAO's · Training · Media",
      title: "上传",
      titleEm: "培训",
      titleSuffix: "资料",
      lede: "上传视频、PDF 或图片到本地 MinIO，拿到 objectKey 后再绑定到课程资料。",
      stepLabel: "UPLOAD",
      stepDetail: "本地开发文件上传",
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "Training upload · MEDIA",
      kicker: "ZHAO's · Training · Media",
      title: "Upload",
      titleEm: " training",
      titleSuffix: " media",
      lede: "Upload videos, PDFs, or images to local MinIO, then bind the objectKey to a course material.",
      stepLabel: "UPLOAD",
      stepDetail: "Local development media upload",
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Training upload · MEDIA",
      kicker: "ZHAO's · Training · Media",
      title: "Importer",
      titleEm: " un",
      titleSuffix: " support",
      lede: "Importez vidéos, PDF ou images vers MinIO local, puis reliez l'objectKey au support de formation.",
      stepLabel: "UPLOAD",
      stepDetail: "Import média en développement local",
    },
  },
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const MEDIA_TYPES = ["VIDEO", "PDF", "QUIZ", "ARTICLE", "IMAGE", "OTHER"];

function formatFileSize(size) {
  if (!Number.isFinite(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrainingUploadPage() {
  const { user, isLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [positionId, setPositionId] = useState("FOH");
  const [positions, setPositions] = useState(DEFAULT_TRAINING_POSITION_TREE);
  const [positionsError, setPositionsError] = useState("");
  const [mediaType, setMediaType] = useState("VIDEO");
  const [materialTitle, setMaterialTitle] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const uploadFolder = `training/${positionId}/${mediaType}`;
  const canCreateMaterial = user?.permissions?.includes("training.material.create");
  const positionOptions = flattenTrainingPositions(positions).filter(
    (position) => position.isActive,
  );

  useEffect(() => {
    let isActive = true;

    async function loadPositions() {
      try {
        const nextPositions = await fetchTrainingPositions();

        if (!isActive || nextPositions.length === 0) {
          return;
        }

        const nextOptions = flattenTrainingPositions(nextPositions).filter(
          (position) => position.isActive,
        );
        setPositions(nextPositions);
        setPositionsError("");

        setPositionId((currentPositionId) =>
          nextOptions.some((position) => position.code === currentPositionId)
            ? currentPositionId
            : nextOptions[0]?.code || "FOH",
        );
      } catch (error) {
        if (isActive) {
          setPositionsError(error.message || "岗位列表加载失败，已使用默认岗位。");
        }
      }
    }

    loadPositions();

    return () => {
      isActive = false;
    };
  }, []);

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setMaterialTitle(nextFile?.name ? nextFile.name.replace(/\.[^.]+$/, "") : "");
    setUploadResult(null);
    setErrorMessage("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("请选择一个文件。");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setErrorMessage("文件超过 5GB。请先压缩视频，或拆成更小的培训资料。");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadResult(null);

    try {
      const uploaded = await uploadTrainingMedia(selectedFile, {
        folder: uploadFolder,
      });
      const material = await createTrainingMaterial({
        positionId,
        type: mediaType,
        isRequired,
        title: materialTitle || selectedFile.name,
        description: "",
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.size,
        bucket: uploaded.bucket,
        objectKey: uploaded.objectKey,
      });
      setUploadResult({ ...uploaded, material });
    } catch (error) {
      setErrorMessage(error.message || "上传失败，请检查后端和 MinIO 是否运行。");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <TrainingLayout pageCopy={UPLOAD_PAGE_COPY}>
      {({ t, styles }) => (
        <>
          {isLoading ? (
            <section className={styles.materialEmpty}>正在确认权限...</section>
          ) : !canCreateMaterial ? (
            <section className={styles.uploadMessageError}>
              无权限上传培训资料。请联系管理员分配 training-admin 角色。
            </section>
          ) : (
          <section className={styles.uploadWorkspace}>
            <div className={styles.uploadIntro}>
              <p className={styles.pageStep}>
                <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                <span>{t.page.stepDetail}</span>
              </p>
              <h2 className={styles.uploadTitle}>选择一个培训文件</h2>
              <p className={styles.uploadHint}>
                当前上传到 bucket：company-private-files。文件会按岗位和资料类型进入 MinIO 目录。
              </p>
              {positionsError ? (
                <p className={styles.materialLoadError}>{positionsError}</p>
              ) : null}
              <div className={styles.uploadClassifiers}>
                <label>
                  岗位
                  <select
                    value={positionId}
                    onChange={(event) => setPositionId(event.target.value)}
                  >
                    {positionOptions.map((position) => (
                      <option key={position.code} value={position.code}>
                        {getTrainingPositionLabel(position, "zh")} /{" "}
                        {getTrainingPositionSecondaryLabel(position, "zh")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  类型
                  <select
                    value={mediaType}
                    onChange={(event) => setMediaType(event.target.value)}
                  >
                    {MEDIA_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  标题
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(event) => setMaterialTitle(event.target.value)}
                    placeholder="资料标题"
                  />
                </label>
                <label className={styles.uploadRequiredToggle}>
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(event) => setIsRequired(event.target.checked)}
                  />
                  必修资料
                </label>
              </div>
              <div className={styles.uploadActions}>
                <button
                  type="button"
                  className={styles.uploadPickButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  选择文件
                </button>
                <button
                  type="button"
                  className={styles.uploadSubmitButton}
                  disabled={!selectedFile || isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? "上传中..." : "上传到 MinIO"}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.uploadInput}
                onChange={handleFileChange}
              />
            </div>

            <div className={styles.uploadInspector}>
              <div className={styles.uploadInspectorHeader}>
                <span>FILE</span>
                <Link href="/dashboard/training/materials">返回资料库</Link>
              </div>

              {selectedFile ? (
                <dl className={styles.uploadFileMeta}>
                  <div>
                    <dt>文件名</dt>
                    <dd>{selectedFile.name}</dd>
                  </div>
                  <div>
                    <dt>类型</dt>
                    <dd>{selectedFile.type || "未知"}</dd>
                  </div>
                  <div>
                    <dt>大小</dt>
                    <dd>{formatFileSize(selectedFile.size)}</dd>
                  </div>
                  <div>
                    <dt>目录</dt>
                    <dd>{uploadFolder}</dd>
                  </div>
                </dl>
              ) : (
                <p className={styles.uploadEmpty}>还没有选择文件。</p>
              )}
            </div>
          </section>
          )}

          {canCreateMaterial && errorMessage ? (
            <section className={styles.uploadMessageError}>{errorMessage}</section>
          ) : null}

          {canCreateMaterial && uploadResult ? (
            <section className={styles.uploadResult}>
              <div>
                <span className={styles.uploadResultLabel}>OBJECT KEY</span>
                <code>{uploadResult.objectKey}</code>
              </div>
              <div>
                <span className={styles.uploadResultLabel}>FOLDER</span>
                <code>{uploadResult.folder}</code>
              </div>
              <div>
                <span className={styles.uploadResultLabel}>BUCKET</span>
                <code>{uploadResult.bucket}</code>
              </div>
              <div>
                <span className={styles.uploadResultLabel}>MIME</span>
                <code>{uploadResult.mimeType}</code>
              </div>
              {uploadResult.material ? (
                <div>
                  <span className={styles.uploadResultLabel}>MATERIAL ID</span>
                  <code>{uploadResult.material.id}</code>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </TrainingLayout>
  );
}

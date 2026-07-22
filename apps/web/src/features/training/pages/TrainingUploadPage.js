"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import TrainingUploadWorkspace, {
  getFileBaseName,
  getMediaTypeForFile,
} from "@/features/training/components/TrainingUploadWorkspace";
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
  mergeDefaultTrainingPositions,
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
      lede: "将视频、PDF 或图片批量上传到本地 MinIO，并自动创建对应的课程资料。",
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
      lede: "Batch upload videos, PDFs, or images to local MinIO and automatically create their course materials.",
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
      lede: "Importez en lot des vidéos, PDF ou images vers MinIO local et créez automatiquement les supports de formation.",
      stepLabel: "UPLOAD",
      stepDetail: "Import média en développement local",
    },
  },
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const MEDIA_TYPE_OPTIONS = [
  { value: "AUTO", label: "自动识别" },
  { value: "VIDEO", label: "视频" },
  { value: "PDF", label: "PDF" },
  { value: "IMAGE", label: "图片" },
  { value: "ARTICLE", label: "文章" },
  { value: "QUIZ", label: "测验" },
  { value: "OTHER", label: "其他" },
];

function getPositionSearchText(position) {
  return [
    position.code,
    getTrainingPositionLabel(position, "zh"),
    getTrainingPositionSecondaryLabel(position, "zh"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function TrainingUploadPage() {
  const { user, isLoading } = useAuth();
  const nextFileIdRef = useRef(0);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [positionId, setPositionId] = useState("FOH");
  const [positionQuery, setPositionQuery] = useState("");
  const [positions, setPositions] = useState(DEFAULT_TRAINING_POSITION_TREE);
  const [positionsError, setPositionsError] = useState("");
  const [mediaType, setMediaType] = useState("AUTO");
  const [materialTitle, setMaterialTitle] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const canCreateMaterial = user?.permissions?.includes("training.material.create");
  const positionOptions = useMemo(
    () =>
      flattenTrainingPositions(positions).filter((position) => position.isActive),
    [positions],
  );
  const filteredPositionOptions = useMemo(() => {
    const normalizedQuery = positionQuery.trim().toLowerCase();

    if (!normalizedQuery) return positionOptions;

    return positionOptions.filter((position) =>
      getPositionSearchText(position).includes(normalizedQuery),
    );
  }, [positionOptions, positionQuery]);
  const selectedPosition = positionOptions.find(
    (position) => position.code === positionId,
  );
  const pendingFiles = queuedFiles.filter(
    (item) => item.status !== "uploaded",
  );
  const hasSingleFile = queuedFiles.length === 1;

  useEffect(() => {
    let isActive = true;

    async function loadPositions() {
      try {
        const nextPositions = await fetchTrainingPositions();

        if (!isActive || nextPositions.length === 0) {
          return;
        }

        const mergedPositions = mergeDefaultTrainingPositions(nextPositions);
        const nextOptions = flattenTrainingPositions(mergedPositions).filter(
          (position) => position.isActive,
        );
        setPositions(mergedPositions);
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

  function addFiles(files) {
    if (isUploading) return;

    const oversizedFiles = files.filter((file) => file.size > MAX_UPLOAD_BYTES);
    const validFiles = files.filter((file) => file.size <= MAX_UPLOAD_BYTES);

    if (validFiles.length > 0) {
      setQueuedFiles((currentFiles) => [
        ...currentFiles,
        ...validFiles.map((file) => ({
          id: `${file.name}-${file.lastModified}-${nextFileIdRef.current++}`,
          file,
          status: "ready",
          error: "",
          objectKey: "",
        })),
      ]);
    }

    if (validFiles.length === 1 && queuedFiles.length === 0) {
      setMaterialTitle(getFileBaseName(validFiles[0].name));
    } else if (validFiles.length > 1) {
      setMaterialTitle("");
    }

    setUploadSummary(null);
    setErrorMessage(
      oversizedFiles.length > 0
        ? `${oversizedFiles.length} 个文件超过 5GB，未加入上传队列。`
        : "",
    );
  }

  function removeFile(fileId) {
    if (isUploading) return;

    setQueuedFiles((currentFiles) =>
      currentFiles.filter((item) => item.id !== fileId),
    );
    setUploadSummary(null);
  }

  function clearUploadedFiles() {
    if (isUploading) return;

    setQueuedFiles((currentFiles) =>
      currentFiles.filter((item) => item.status !== "uploaded"),
    );
    setUploadSummary(null);
  }

  function updateQueuedFile(fileId, changes) {
    setQueuedFiles((currentFiles) =>
      currentFiles.map((item) =>
        item.id === fileId ? { ...item, ...changes } : item,
      ),
    );
  }

  function getMaterialTitle(file) {
    return hasSingleFile && materialTitle.trim()
      ? materialTitle.trim()
      : getFileBaseName(file.name);
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) {
      setErrorMessage("请先选择至少一个文件。");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadSummary(null);

    let uploadedCount = 0;
    let failedCount = 0;

    for (const item of pendingFiles) {
      const materialType = mediaType === "AUTO" ? getMediaTypeForFile(item.file) : mediaType;
      const uploadFolder = `training/${positionId}/${materialType}`;

      updateQueuedFile(item.id, { status: "uploading", error: "" });

      try {
        const uploaded = await uploadTrainingMedia(item.file, {
          folder: uploadFolder,
        });
        const material = await createTrainingMaterial({
          positionId,
          type: materialType,
          isRequired,
          title: getMaterialTitle(item.file),
          description: "",
          originalName: uploaded.originalName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.size,
          bucket: uploaded.bucket,
          objectKey: uploaded.objectKey,
        });

        uploadedCount += 1;
        updateQueuedFile(item.id, {
          status: "uploaded",
          materialId: material.id,
          objectKey: uploaded.objectKey || "",
        });
      } catch (error) {
        failedCount += 1;
        updateQueuedFile(item.id, {
          status: "failed",
          error: error.message || "上传失败，请检查后端和 MinIO 是否运行。",
        });
      }
    }

    setIsUploading(false);

    setUploadSummary({ uploadedCount, failedCount });
    if (failedCount > 0) {
      setErrorMessage(`${failedCount} 个文件上传失败，可在右侧队列中查看并重试。`);
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
            <TrainingUploadWorkspace
              hasSingleFile={hasSingleFile}
              isRequired={isRequired}
              isUploading={isUploading}
              materialTitle={materialTitle}
              mediaType={mediaType}
              mediaTypeOptions={MEDIA_TYPE_OPTIONS}
              pendingFileCount={pendingFiles.length}
              positionId={positionId}
              positionOptions={filteredPositionOptions}
              positionQuery={positionQuery}
              positionsError={positionsError}
              queuedFiles={queuedFiles}
              selectedPosition={selectedPosition}
              onAddFiles={addFiles}
              onClearUploadedFiles={clearUploadedFiles}
              onMaterialTitleChange={setMaterialTitle}
              onMediaTypeChange={setMediaType}
              onPositionChange={setPositionId}
              onPositionQueryChange={setPositionQuery}
              onRemoveFile={removeFile}
              onRequiredChange={setIsRequired}
              onUpload={handleUpload}
              styles={styles}
              t={t}
            />
          )}

          {canCreateMaterial && errorMessage ? (
            <section className={styles.uploadMessageError}>{errorMessage}</section>
          ) : null}

          {canCreateMaterial && uploadSummary ? (
            <section className={styles.uploadResult}>
              <div>
                <span className={styles.uploadResultLabel}>已创建</span>
                <strong>{uploadSummary.uploadedCount} 份培训资料</strong>
              </div>
              <div>
                <span className={styles.uploadResultLabel}>状态</span>
                <strong>
                  {uploadSummary.failedCount > 0
                    ? `${uploadSummary.failedCount} 份需要重试`
                    : "全部已加入资料库"}
                </strong>
              </div>
            </section>
          ) : null}
        </>
      )}
    </TrainingLayout>
  );
}

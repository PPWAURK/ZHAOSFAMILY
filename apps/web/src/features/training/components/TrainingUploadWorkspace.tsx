"use client";

import Link from "next/link";

import {
  getTrainingPositionLabel,
  getTrainingPositionSecondaryLabel,
} from "@/features/training/utils/trainingPositions";

export type TrainingUploadPosition = {
  code: string;
  isActive: boolean;
  name?: Record<string, string>;
};

export type QueuedTrainingFile = {
  id: string;
  file: File;
  status: "ready" | "uploading" | "uploaded" | "failed";
  error: string;
  objectKey: string;
  materialId?: number | string;
};

type MediaTypeOption = {
  value: string;
  label: string;
};

type TrainingUploadWorkspaceProps = {
  errorMessage: string;
  hasSingleFile: boolean;
  isRequired: boolean;
  isUploading: boolean;
  materialTitle: string;
  mediaType: string;
  mediaTypeOptions: MediaTypeOption[];
  pendingFileCount: number;
  positionId: string;
  positionQuery: string;
  positionOptions: TrainingUploadPosition[];
  positionsError: string;
  queuedFiles: QueuedTrainingFile[];
  selectedPosition?: TrainingUploadPosition;
  onAddFiles: (files: File[]) => void;
  onClearUploadedFiles: () => void;
  onMaterialTitleChange: (title: string) => void;
  onMediaTypeChange: (mediaType: string) => void;
  onPositionChange: (positionId: string) => void;
  onPositionQueryChange: (query: string) => void;
  onRemoveFile: (fileId: string) => void;
  onRequiredChange: (isRequired: boolean) => void;
  onUpload: () => void;
  styles: Record<string, string>;
  t: {
    page: {
      stepLabel: string;
      stepDetail: string;
    };
  };
};

export function getFileBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || fileName;
}

export function getMediaTypeForFile(file: File): string {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("image/")) return "IMAGE";
  return "OTHER";
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getUploadStatusLabel(status: QueuedTrainingFile["status"]): string {
  if (status === "ready") return "待上传";
  if (status === "uploading") return "上传中";
  if (status === "uploaded") return "已创建";
  return "失败";
}

export default function TrainingUploadWorkspace({
  hasSingleFile,
  isRequired,
  isUploading,
  materialTitle,
  mediaType,
  mediaTypeOptions,
  pendingFileCount,
  positionId,
  positionOptions,
  positionQuery,
  positionsError,
  queuedFiles,
  selectedPosition,
  onAddFiles,
  onClearUploadedFiles,
  onMaterialTitleChange,
  onMediaTypeChange,
  onPositionChange,
  onPositionQueryChange,
  onRemoveFile,
  onRequiredChange,
  onUpload,
  styles,
  t,
}: TrainingUploadWorkspaceProps) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    onAddFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    onAddFiles(Array.from(event.dataTransfer.files || []));
  }

  return (
    <section className={styles.uploadWorkspace}>
      <div className={styles.uploadIntro}>
        <p className={styles.pageStep}>
          <span className={styles.stepBadge}>{t.page.stepLabel}</span>
          <span>{t.page.stepDetail}</span>
        </p>
        <h2 className={styles.uploadTitle}>一次上传一批培训资料</h2>
        <p className={styles.uploadHint}>
          选择岗位后，可一次加入多份视频、PDF 或图片。系统会按文件名自动创建资料，无需逐个填写标题。
        </p>
        {positionsError ? (
          <p className={styles.materialLoadError}>{positionsError}</p>
        ) : null}
        <div className={styles.uploadClassifiers}>
          <div className={styles.uploadPositionPicker}>
            <div className={styles.uploadFieldHeader}>
              <span>适用岗位</span>
              {selectedPosition ? (
                <strong>{getTrainingPositionLabel(selectedPosition, "zh")}</strong>
              ) : null}
            </div>
            <input
              type="search"
              value={positionQuery}
              onChange={(event) => onPositionQueryChange(event.target.value)}
              placeholder="搜索岗位，例如：前厅、后厨、店长"
              aria-label="搜索适用岗位"
            />
            <div className={styles.uploadPositionOptions}>
              {positionOptions.map((position) => (
                <button
                  key={position.code}
                  type="button"
                  className={
                    position.code === positionId
                      ? styles.uploadPositionOptionActive
                      : styles.uploadPositionOption
                  }
                  aria-pressed={position.code === positionId}
                  onClick={() => onPositionChange(position.code)}
                >
                  <span>{getTrainingPositionLabel(position, "zh")}</span>
                  <small>{getTrainingPositionSecondaryLabel(position, "zh")}</small>
                </button>
              ))}
              {positionOptions.length === 0 ? (
                <p className={styles.uploadPositionEmpty}>没有匹配的岗位。</p>
              ) : null}
            </div>
          </div>
          <div className={styles.uploadTypePicker}>
            <span className={styles.uploadFieldLabel}>资料类型</span>
            <div className={styles.uploadTypeOptions}>
              {mediaTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    option.value === mediaType
                      ? styles.uploadTypeOptionActive
                      : styles.uploadTypeOption
                  }
                  aria-pressed={option.value === mediaType}
                  onClick={() => onMediaTypeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className={styles.uploadFieldHelp}>
              {mediaType === "AUTO"
                ? "按每个文件的格式自动归类。"
                : "本批文件会统一使用此资料类型。"}
            </p>
          </div>
          <label className={styles.uploadRequiredToggle}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(event) => onRequiredChange(event.target.checked)}
            />
            必修资料
          </label>
          {hasSingleFile ? (
            <label className={styles.uploadTitleField}>
              资料标题
              <input
                type="text"
                value={materialTitle}
                onChange={(event) => onMaterialTitleChange(event.target.value)}
                placeholder="默认使用文件名"
              />
            </label>
          ) : null}
        </div>
        <div className={styles.uploadActions}>
          <label
            className={styles.uploadDropzone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span className={styles.uploadDropzoneAction}>选择或拖入文件</span>
            <span>支持一次加入多个文件 · 单个文件最大 5GB</span>
            <input
              type="file"
              className={styles.uploadInput}
              accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/mpeg,audio/mp4"
              multiple
              disabled={isUploading}
              onChange={handleFileChange}
            />
          </label>
          <button
            type="button"
            className={styles.uploadSubmitButton}
            disabled={pendingFileCount === 0 || isUploading}
            onClick={onUpload}
          >
            {isUploading
              ? "正在上传..."
              : pendingFileCount > 0
                ? `上传 ${pendingFileCount} 个文件`
                : "已全部上传"}
          </button>
        </div>
      </div>

      <div className={styles.uploadInspector}>
        <div className={styles.uploadInspectorHeader}>
          <span>上传队列 · {queuedFiles.length}</span>
          <Link href="/dashboard/training/materials">返回资料库</Link>
        </div>

        {queuedFiles.length > 0 ? (
          <>
            <div className={styles.uploadQueue}>
              {queuedFiles.map((item) => (
                <article key={item.id} className={styles.uploadQueueItem}>
                  <div className={styles.uploadQueueFile}>
                    <strong>{item.file.name}</strong>
                    <span>
                      {formatFileSize(item.file.size)} · {getMediaTypeForFile(item.file)}
                    </span>
                    {item.error ? (
                      <small className={styles.uploadQueueError}>{item.error}</small>
                    ) : null}
                    {item.objectKey ? (
                      <small className={styles.uploadQueueObjectKey}>{item.objectKey}</small>
                    ) : null}
                  </div>
                  <div className={styles.uploadQueueActions}>
                    <span
                      className={`${styles.uploadQueueStatus} ${
                        item.status === "uploaded"
                          ? styles.uploadQueueStatusUploaded
                          : item.status === "failed"
                            ? styles.uploadQueueStatusFailed
                            : ""
                      }`}
                    >
                      {getUploadStatusLabel(item.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(item.id)}
                      disabled={isUploading}
                      aria-label={`移除 ${item.file.name}`}
                    >
                      移除
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {queuedFiles.some((item) => item.status === "uploaded") ? (
              <button
                type="button"
                className={styles.uploadClearButton}
                onClick={onClearUploadedFiles}
                disabled={isUploading}
              >
                清除已完成项
              </button>
            ) : null}
          </>
        ) : (
          <p className={styles.uploadEmpty}>从左侧选择或拖入文件，它们会按顺序显示在这里。</p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";
import { useMediaUrl } from "@/shared/hooks/useMediaUrl";
import DashboardNewsMarkdownEditor, {
  DashboardNewsInlineEditor,
} from "@/features/dashboard/components/DashboardNewsMarkdownEditor";
import {
  DashboardNewsAttachmentDropzone,
  DashboardNewsTagInput,
} from "@/features/dashboard/components/DashboardNewsFormControls";
import {
  createDashboardNewsPost,
  deleteDashboardNewsPost,
  fetchDashboardNewsPost,
  fetchDashboardNewsPosts,
  getDashboardNewsAttachmentUrl,
  uploadDashboardNewsAttachment,
} from "@/features/dashboard/services/dashboardNewsApi";
import { fetchSignedMediaUrl } from "@/shared/api/api-client";
import styles from "@/features/dashboard/dashboard-page.module.css";

const HOLDING_JOB_ROLE = "holding";
const SEEN_AT_STORAGE_PREFIX = "zhao_dashboard_news_seen_at";
const DRAFT_STORAGE_PREFIX = "zhao_dashboard_news_draft";
const BOARD_CATEGORY_TO_BACKEND_CATEGORY = {
  news: "operations",
  congrats: "people",
  issues: "quality",
};
const INITIAL_FORM = {
  title: "",
  summary: "",
  body: "",
  category: "news",
  visibility: "public",
  tags: "",
};

function resolveColumn(category) {
  if (category === "people") return "congrats";
  if (category === "quality") return "issues";
  return "news";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function parseTags(tagsInput) {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function sortPosts(posts, lang, sortKey) {
  return [...posts].sort((left, right) => {
    if (sortKey === "oldest") {
      return String(left.createdAt).localeCompare(String(right.createdAt));
    }

    if (sortKey === "title") {
      return left.title.localeCompare(right.title, lang);
    }

    return String(right.createdAt).localeCompare(String(left.createdAt));
  });
}

function groupPostsByColumn(posts) {
  return posts.reduce(
    (groups, post) => {
      groups[resolveColumn(post.category)].push(post);
      return groups;
    },
    { news: [], congrats: [], issues: [] },
  );
}

function getLatestPostCreatedAt(posts) {
  return posts.reduce((latest, post) => {
    const createdAt = Date.parse(post.createdAt);

    if (Number.isNaN(createdAt)) {
      return latest;
    }

    return Math.max(latest, createdAt);
  }, 0);
}

function getSeenAtStorageKey(userId) {
  return `${SEEN_AT_STORAGE_PREFIX}_${userId}`;
}

function getDraftStorageKey(userId) {
  return `${DRAFT_STORAGE_PREFIX}_${userId}`;
}

function getBoardCategory(category) {
  return resolveColumn(category);
}

function getBackendCategory(boardCategory) {
  return BOARD_CATEGORY_TO_BACKEND_CATEGORY[boardCategory] || "operations";
}

function getPostCategoryLabel(copy, category) {
  return copy.categories[getBoardCategory(category)] || category;
}

function parseMarkdownImageLine(line) {
  const match = line.match(/^!\[([^\]]*)]\((https?:\/\/[^)\s]+)\)$/);

  if (!match) {
    return null;
  }

  return {
    alt: match[1] || "image",
    src: match[2],
  };
}

function findFirstBodyImage(body) {
  return body
    .split("\n")
    .map((line) => parseMarkdownImageLine(line.trim()))
    .find(Boolean);
}

function isImageAttachment(attachment) {
  if (!attachment) {
    return false;
  }

  if (attachment.mimeType?.toLowerCase().startsWith("image/")) {
    return true;
  }

  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(attachment.name || "");
}

function getAttachmentMediaKind(attachment) {
  const mimeType = attachment?.mimeType?.toLowerCase() || "";
  const fileName = attachment?.name || "";

  if (isImageAttachment(attachment)) {
    return "image";
  }

  if (mimeType.startsWith("video/") || /\.(m4v|mov|mp4|webm)$/i.test(fileName)) {
    return "video";
  }

  if (mimeType === "application/pdf" || /\.pdf$/i.test(fileName)) {
    return "pdf";
  }

  return null;
}

function getFeaturedMedia(post) {
  const attachmentKind = getAttachmentMediaKind(post.attachment);

  if (attachmentKind && post.attachment.objectKey) {
    return {
      kind: "attachment",
      alt: post.attachment.name || post.title,
      href: post.attachment.href,
      mediaKind: attachmentKind,
      objectKey: post.attachment.objectKey,
    };
  }

  const bodyImage = findFirstBodyImage(post.body);

  if (bodyImage) {
    return {
      kind: "body",
      alt: bodyImage.alt || post.title,
      src: resolveDashboardMediaUrl(bodyImage.src),
    };
  }

  return null;
}

function resolveDashboardMediaUrl(src) {
  try {
    const url = new URL(src);
    const objectKey = url.searchParams.get("objectKey");

    return objectKey ? getDashboardNewsAttachmentUrl(objectKey) : src;
  } catch {
    return src;
  }
}

function parseStyleAttributes(attributes) {
  const matchedSize = attributes.match(/(?:^|;)size=(\d+)(?:;|$)/);
  const matchedWeight = attributes.match(/(?:^|;)weight=(\d+)(?:;|$)/);
  const size = Number(matchedSize?.[1]);
  const weight = Number(matchedWeight?.[1]);

  if (
    !Number.isInteger(size) ||
    size < 12 ||
    size > 32 ||
    size % 2 !== 0 ||
    ![400, 500, 600, 700].includes(weight)
  ) {
    return null;
  }

  return { fontSize: `${size}px`, fontWeight: weight };
}

function renderBasicInlineMarkdown(text, keyPrefix = "") {
  const tokens = [];
  const remaining = text;

  // Only the controlled inline syntax emitted by the editor is rendered.
  const pattern =
    /(\[\[zhao-underline\]\]([\s\S]*?)\[\[\/zhao-underline\]\]|\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|(?:\\.|[^*[\]()])+)/g;
  let match;

  while ((match = pattern.exec(remaining)) !== null) {
    const full = match[1];
    const key = `${keyPrefix}-${tokens.length}`;

    if (full.startsWith("[[zhao-underline]]")) {
      tokens.push(<u key={key}>{renderBasicInlineMarkdown(match[2], key)}</u>);
    } else if (full.startsWith("**") && full.endsWith("**")) {
      tokens.push(<strong key={key}>{match[3]}</strong>);
    } else if (full.startsWith("*") && full.endsWith("*")) {
      tokens.push(<em key={key}>{match[4]}</em>);
    } else if (full.startsWith("[")) {
      tokens.push(
        <a key={key} href={match[6]} target="_blank" rel="noreferrer">
          {match[5]}
        </a>,
      );
    } else {
      tokens.push(full);
    }
  }

  return tokens.length > 0 ? tokens : text;
}

function renderInlineMarkdown(text) {
  const stylePattern = /\[\[zhao-style:([^\]]+)\]\]([\s\S]*?)\[\[\/zhao-style\]\]/g;
  const elements = [];
  let cursor = 0;
  let match;

  while ((match = stylePattern.exec(text)) !== null) {
    const leadingText = text.slice(cursor, match.index);

    if (leadingText) {
      elements.push(...renderBasicInlineMarkdown(leadingText, `text-${elements.length}`));
    }

    const style = parseStyleAttributes(match[1]);

    if (style) {
      elements.push(
        <span key={`style-${elements.length}`} style={style}>
          {renderBasicInlineMarkdown(match[2], `style-${elements.length}`)}
        </span>,
      );
    } else {
      elements.push(match[0]);
    }

    cursor = stylePattern.lastIndex;
  }

  const trailingText = text.slice(cursor);

  if (trailingText) {
    elements.push(...renderBasicInlineMarkdown(trailingText, `text-${elements.length}`));
  }

  return elements.length > 0 ? elements : text;
}

function NewsMediaFallback() {
  return (
    <div className={styles.newsMediaFallback} aria-hidden="true">
      <img src="/images/title-frames/zhao-seal.png" alt="" />
      <span>ZHAO&apos;S FAMILY</span>
    </div>
  );
}

function SignedAttachmentMedia({ media }) {
  const { url } = useMediaUrl(media.objectKey);
  const [signedUrlFailed, setSignedUrlFailed] = useState(false);
  const [legacyImageFailed, setLegacyImageFailed] = useState(false);
  const source = !signedUrlFailed && url ? url : media.href;

  if (!source || legacyImageFailed) {
    return <NewsMediaFallback />;
  }

  function handleMediaError() {
    if (!signedUrlFailed && url) {
      setSignedUrlFailed(true);
      return;
    }

    setLegacyImageFailed(true);
  }

  if (media.mediaKind === "video") {
    return (
      <video
        className={styles.newsFeatureVideo}
        controls
        preload="metadata"
        onError={handleMediaError}
      >
        <source src={source} />
      </video>
    );
  }

  if (media.mediaKind === "pdf") {
    return (
      <iframe
        className={styles.newsFeaturePdf}
        src={source}
        title={media.alt}
      />
    );
  }

  return (
    <img
      src={source}
      alt={media.alt}
      className={styles.newsFeatureImage}
      onError={handleMediaError}
    />
  );
}

function FeaturedNewsMedia({ post }) {
  const media = getFeaturedMedia(post);
  const [bodyImageFailed, setBodyImageFailed] = useState(false);

  if (!media || bodyImageFailed) {
    return <NewsMediaFallback />;
  }

  if (media.kind === "attachment") {
    return <SignedAttachmentMedia media={media} />;
  }

  return (
    <img
      src={media.src}
      alt={media.alt}
      className={styles.newsFeatureImage}
      loading="lazy"
      onError={() => setBodyImageFailed(true)}
    />
  );
}

function renderRichBody(body, styles) {
  const normalizedBody = body
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")
    .trim();
  const lines = normalizedBody ? normalizedBody.split("\n") : [];
  const elements = [];
  let listItems = null;
  let listType = null;

  function flushList(listIndex) {
    if (!listItems) {
      return;
    }

    const ListTag = listType === "ol" ? "ol" : "ul";
    const key = `list-${listIndex}`;

    elements.push(
      <ListTag key={key} className={styles.readerList}>
        {listItems}
      </ListTag>,
    );
    listItems = null;
    listType = null;
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const key = `${index}-${line.slice(0, 16)}`;

    if (!trimmed) {
      flushList(index);
      continue;
    }

    if (trimmed === "---") {
      flushList(index);
      elements.push(<hr key={key} className={styles.readerDivider} />);
      continue;
    }

    const imageMatch = parseMarkdownImageLine(trimmed);

    if (imageMatch) {
      flushList(index);
      elements.push(
        <figure key={key} className={styles.readerBodyImage}>
          <img
            src={resolveDashboardMediaUrl(imageMatch.src)}
            alt={imageMatch.alt}
            loading="lazy"
          />
        </figure>,
      );
      continue;
    }

    const titleMatch = trimmed.match(/^#\s+(.+)$/);

    if (titleMatch) {
      flushList(index);
      elements.push(
        <h2 key={key} className={styles.readerBodyTitle}>
          {renderInlineMarkdown(titleMatch[1])}
        </h2>,
      );
      continue;
    }

    const headingMatch = trimmed.match(/^##\s+(.+)$/);

    if (headingMatch) {
      flushList(index);
      elements.push(
        <h3 key={key} className={styles.readerBodyHeading}>
          {renderInlineMarkdown(headingMatch[1])}
        </h3>,
      );
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s+(.+)$/);

    if (quoteMatch) {
      flushList(index);
      elements.push(
        <blockquote key={key} className={styles.readerQuote}>
          {renderInlineMarkdown(quoteMatch[1])}
        </blockquote>,
      );
      continue;
    }

    const calloutMatch = trimmed.match(/^:::callout\s+(.+)$/);

    if (calloutMatch) {
      flushList(index);
      elements.push(
        <aside
          key={key}
          className={styles.readerCallout}
          data-zhao-block="callout"
        >
          {renderInlineMarkdown(calloutMatch[1])}
        </aside>,
      );
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (olMatch) {
      if (listType !== "ol") {
        flushList(index);
        listType = "ol";
        listItems = [];
      }

      listItems.push(
        <li key={listItems.length}>{renderInlineMarkdown(olMatch[1])}</li>,
      );
      continue;
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (ulMatch) {
      if (listType !== "ul") {
        flushList(index);
        listType = "ul";
        listItems = [];
      }

      listItems.push(
        <li key={listItems.length}>{renderInlineMarkdown(ulMatch[1])}</li>,
      );
      continue;
    }

    flushList(index);
    elements.push(
      <p key={key} className={styles.readerBodyText}>
        {renderInlineMarkdown(line)}
      </p>
    );
  }

  flushList(lines.length);

  return elements;
}

export default function DashboardNewsModule({ lang, copy }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const draftLoadedRef = useRef(false);
  const previewPanelRef = useRef(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [isUploadingBodyImage, setIsUploadingBodyImage] = useState(false);
  const [submitState, setSubmitState] = useState({ isSubmitting: false, message: "" });
  const [draftStatus, setDraftStatus] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedTag, setSelectedTag] = useState("all");
  const [activeColumnKey, setActiveColumnKey] = useState("news");
  const [selectedPost, setSelectedPost] = useState(null);
  const [readerError, setReaderError] = useState("");
  const [deleteState, setDeleteState] = useState({ postId: "", message: "" });
  const [notificationPosts, setNotificationPosts] = useState([]);
  const [hasCheckedNotifications, setHasCheckedNotifications] = useState(false);
  const [activePostIndexByColumn, setActivePostIndexByColumn] = useState({
    news: 0,
    congrats: 0,
    issues: 0,
  });
  const canPublish = `${user?.jobRole || ""}`.toLowerCase() === HOLDING_JOB_ROLE;

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    previewPanelRef.current?.focus();

    function handlePreviewKeyDown(event) {
      if (event.key === "Escape" && !submitState.isSubmitting) {
        setIsPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handlePreviewKeyDown);
    return () => window.removeEventListener("keydown", handlePreviewKeyDown);
  }, [isPreviewOpen, submitState.isSubmitting]);

  useEffect(() => {
    if (!canPublish || !user?.id || draftLoadedRef.current) return;

    draftLoadedRef.current = true;

    try {
      const storedDraft = localStorage.getItem(getDraftStorageKey(user.id));
      if (!storedDraft) return;

      const parsedDraft = JSON.parse(storedDraft);
      if (!parsedDraft?.form) return;

      setForm({ ...INITIAL_FORM, ...parsedDraft.form });
      setDraftStatus(copy.publish.draftRestored);
    } catch {
      localStorage.removeItem(getDraftStorageKey(user.id));
    }
  }, [canPublish, copy.publish.draftRestored, user?.id]);

  async function loadPosts() {
    try {
      setIsLoading(true);
      setLoadError("");
      const nextPosts = await fetchDashboardNewsPosts({
        q: searchTerm.trim(),
        visibility: selectedVisibility,
      });
      setPosts(nextPosts);
    } catch (error) {
      setPosts([]);
      setLoadError(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadVisiblePosts() {
      try {
        setIsLoading(true);
        setLoadError("");
        const nextPosts = await fetchDashboardNewsPosts({
          q: searchTerm.trim(),
          visibility: selectedVisibility,
        });

        if (!isCancelled) {
          setPosts(nextPosts);
        }
      } catch (error) {
        if (!isCancelled) {
          setPosts([]);
          setLoadError(error instanceof Error ? error.message : copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadVisiblePosts();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError, searchTerm, selectedVisibility]);

  useEffect(() => {
    if (hasCheckedNotifications || isLoading || !user?.id || posts.length === 0) {
      return;
    }

    const storageKey = getSeenAtStorageKey(user.id);
    const lastSeenAt = Number(localStorage.getItem(storageKey) || 0);
    const unseenPosts = sortPosts(
      posts.filter((post) => {
        const createdAt = Date.parse(post.createdAt);

        return !Number.isNaN(createdAt) && createdAt > lastSeenAt;
      }),
      lang,
      "newest",
    ).slice(0, 5);

    setHasCheckedNotifications(true);

    if (unseenPosts.length > 0) {
      setNotificationPosts(unseenPosts);
    }
  }, [hasCheckedNotifications, isLoading, lang, posts, user?.id]);

  const availableTags = useMemo(
    () => [
      "all",
      ...new Set(
        posts
          .flatMap((post) => post.tags)
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right, "en")),
      ),
    ],
    [posts],
  );

  const visiblePosts = useMemo(() => {
    const tagFiltered =
      selectedTag === "all"
        ? posts
        : posts.filter((post) => post.tags.includes(selectedTag));
    return sortPosts(tagFiltered, lang, selectedSort);
  }, [lang, posts, selectedSort, selectedTag]);

  const postsByColumn = useMemo(
    () => groupPostsByColumn(visiblePosts),
    [visiblePosts],
  );

  useEffect(() => {
    setActivePostIndexByColumn((prev) =>
      Object.fromEntries(
        Object.entries(postsByColumn).map(([columnKey, columnPosts]) => {
          const maxIndex = Math.max(columnPosts.length - 1, 0);
          return [columnKey, Math.min(prev[columnKey] || 0, maxIndex)];
        }),
      ),
    );
  }, [postsByColumn]);

  function moveColumnPost(columnKey, direction) {
    const columnPosts = postsByColumn[columnKey] || [];

    if (columnPosts.length <= 1) {
      return;
    }

    setActivePostIndexByColumn((prev) => {
      const currentIndex = prev[columnKey] || 0;
      const nextIndex =
        (currentIndex + direction + columnPosts.length) % columnPosts.length;

      return {
        ...prev,
        [columnKey]: nextIndex,
      };
    });
  }

  function resolveAttachmentHref(attachment) {
    // objectKey attachments are opened via a freshly-signed presigned URL in
    // the click handler; only external links keep a real href.
    return attachment?.objectKey ? "#" : attachment?.href || "#";
  }

  function handleAttachmentClick(event, attachment) {
    if (!attachment?.objectKey) {
      return; // external href — let the browser follow it
    }

    event.preventDefault();
    void fetchSignedMediaUrl(attachment.objectKey).then(({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitState((prev) => ({ ...prev, message: "" }));
    setDraftStatus(copy.publish.unsaved);
  }

  function updateAttachmentFile(file) {
    setAttachmentFile(file);
    setSubmitState((prev) => ({ ...prev, message: "" }));
    setDraftStatus(copy.publish.unsaved);
  }

  const handleEditorImageUpload = useCallback(
    async (file) => {
      if (!file.type.startsWith("image/")) {
        setSubmitState({
          isSubmitting: false,
          message: copy.publish.bodyImageError,
        });
        return null;
      }

      try {
        setIsUploadingBodyImage(true);
        setSubmitState({
          isSubmitting: false,
          message: copy.publish.bodyImageUploading,
        });
        const attachment = await uploadDashboardNewsAttachment(file);

        if (!attachment.objectKey) {
          throw new Error(copy.publish.bodyImageError);
        }

        const alt = attachment.name.replace(/[[\]()]/g, "").trim() || "image";
        const href = getDashboardNewsAttachmentUrl(attachment.objectKey);
        const markdown = `![${alt}](${href})`;

        setSubmitState({ isSubmitting: false, message: "" });

        return markdown;
      } catch (error) {
        setSubmitState({
          isSubmitting: false,
          message:
            error instanceof Error
              ? error.message
              : copy.publish.bodyImageError,
        });

        return null;
      } finally {
        setIsUploadingBodyImage(false);
      }
    },
    [copy.publish.bodyImageError, copy.publish.bodyImageUploading],
  );

  function validatePublishForm() {
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      setSubmitState({ isSubmitting: false, message: copy.publish.required });
      return false;
    }

    return true;
  }

  function handlePreview(event) {
    event?.preventDefault();
    if (!validatePublishForm()) return;
    setIsPreviewOpen(true);
  }

  function handleSaveDraft() {
    if (!user?.id) return;

    localStorage.setItem(
      getDraftStorageKey(user.id),
      JSON.stringify({ form, savedAt: new Date().toISOString() }),
    );
    setDraftStatus(
      attachmentFile
        ? copy.publish.draftSavedWithoutAttachment
        : copy.publish.draftSaved,
    );
  }

  async function handleCancelPublish() {
    const shouldReset = await confirm({
      title: copy.publish.cancelTitle,
      message: copy.publish.cancelConfirm,
      confirmLabel: copy.publish.cancelConfirmAction,
      cancelLabel: copy.publish.continueEditing,
      tone: "danger",
    });

    if (!shouldReset) return;

    setForm(INITIAL_FORM);
    setAttachmentFile(null);
    setAttachmentInputKey((prev) => prev + 1);
    setSubmitState({ isSubmitting: false, message: "" });
    setDraftStatus("");
    if (user?.id) localStorage.removeItem(getDraftStorageKey(user.id));
  }

  async function handlePublish() {
    if (!validatePublishForm()) {
      setIsPreviewOpen(false);
      return;
    }

    try {
      setSubmitState({ isSubmitting: true, message: "" });
      const attachment = attachmentFile
        ? await uploadDashboardNewsAttachment(attachmentFile)
        : null;
      const createdPost = await createDashboardNewsPost({
        title: form.title.trim(),
        summary: form.summary.trim(),
        body: form.body.trim(),
        category: getBackendCategory(form.category),
        visibility: form.visibility,
        tags: parseTags(form.tags),
        attachment,
      });
      setForm(INITIAL_FORM);
      setAttachmentFile(null);
      setAttachmentInputKey((prev) => prev + 1);
      setSelectedTag("all");
      setSubmitState({ isSubmitting: false, message: copy.publish.success });
      setDraftStatus("");
      setIsPreviewOpen(false);
      if (user?.id) localStorage.removeItem(getDraftStorageKey(user.id));
      await loadPosts();

      if (createdPost) {
        setSelectedPost(createdPost);
      }
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        message: error instanceof Error ? error.message : copy.publish.error,
      });
    }
  }

  async function handleOpenPost(postId) {
    try {
      setReaderError("");
      setSelectedPost(await fetchDashboardNewsPost(postId));
    } catch (error) {
      setReaderError(error instanceof Error ? error.message : copy.loadError);
    }
  }

  async function handleDeletePost(postId) {
    if (!(await confirm({ message: copy.reader.deleteConfirm, tone: "danger" }))) {
      return;
    }

    try {
      setDeleteState({ postId, message: "" });
      await deleteDashboardNewsPost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== String(postId)));
      setSelectedPost((prev) =>
        prev?.id === String(postId) ? null : prev,
      );
      setDeleteState({ postId: "", message: copy.reader.deleteSuccess });
    } catch (error) {
      setDeleteState({
        postId: "",
        message: error instanceof Error ? error.message : copy.reader.deleteError,
      });
    }
  }

  function closeNotification() {
    if (user?.id) {
      const latestCreatedAt = getLatestPostCreatedAt(posts);

      if (latestCreatedAt > 0) {
        localStorage.setItem(getSeenAtStorageKey(user.id), String(latestCreatedAt));
      }
    }

    setNotificationPosts([]);
  }

  async function handleOpenNotificationPost(postId) {
    closeNotification();
    await handleOpenPost(postId);
  }

  function resetFilters() {
    setSearchTerm("");
    setSelectedVisibility("all");
    setSelectedSort("newest");
    setSelectedTag("all");
  }

  function renderNewsBoard() {
    const activeColumnMeta = copy.columns[activeColumnKey];
    const columnPosts = postsByColumn[activeColumnKey] || [];
    const activeIndex = activePostIndexByColumn[activeColumnKey] || 0;
    const activePost = columnPosts[activeIndex] || null;

    return (
      <section className={styles.newsBoard} aria-label={copy.boardLabel}>
        <div className={styles.newsCategoryTabs} role="tablist" aria-label={copy.boardLabel}>
          {Object.keys(copy.columns).map((columnKey) => {
            const isActive = activeColumnKey === columnKey;

            return (
              <button
                key={columnKey}
                id={`news-tab-${columnKey}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="news-feature-panel"
                className={`${styles.newsCategoryTab} ${
                  isActive ? styles.newsCategoryTabActive : ""
                }`}
                onClick={() => setActiveColumnKey(columnKey)}
              >
                <span>{copy.tabs[columnKey]}</span>
                <small>{postsByColumn[columnKey].length}</small>
              </button>
            );
          })}
        </div>

        <section
          id="news-feature-panel"
          role="tabpanel"
          aria-labelledby={`news-tab-${activeColumnKey}`}
          className={styles.newsFeaturePanel}
        >
          {isLoading ? <div className={styles.newsEmpty}>{copy.loading}</div> : null}

          {!isLoading && !activePost ? (
            <div className={styles.newsEmpty}>{copy.empty}</div>
          ) : null}

          {!isLoading && activePost ? (
            <article key={activePost.id} className={styles.newsFeatureArticle}>
              <div className={styles.newsFeatureHeader}>
                <div>
                  <p className={styles.newsFeatureKicker}>{copy.tabs[activeColumnKey]}</p>
                  <h2 className={styles.newsFeatureTitle}>
                    {renderInlineMarkdown(activePost.title)}
                  </h2>
                  <p className={styles.newsFeatureMeta}>
                    {copy.dateLabel} · {formatDate(activePost.createdAt)} · {copy.byLabel} · {" "}
                    {activePost.author.name}
                  </p>
                </div>

                <span
                  className={`${styles.visibilityBadge} ${
                    styles[`visibility${activePost.visibility}`]
                  }`}
                >
                  {copy.visibility[activePost.visibility]}
                </span>
              </div>

              <div className={styles.newsFeatureControls}>
                <button
                  type="button"
                  className={styles.newsCarouselArrow}
                  onClick={() => moveColumnPost(activeColumnKey, -1)}
                  disabled={columnPosts.length <= 1}
                  aria-label={`${activeColumnMeta.title} previous`}
                >
                  ←
                </button>
                <span className={styles.newsCarouselProgress}>
                  {activeIndex + 1} / {columnPosts.length}
                </span>
                <button
                  type="button"
                  className={styles.newsCarouselArrow}
                  onClick={() => moveColumnPost(activeColumnKey, 1)}
                  disabled={columnPosts.length <= 1}
                  aria-label={`${activeColumnMeta.title} next`}
                >
                  →
                </button>
              </div>

              <div className={styles.newsFeatureLayout}>
                <figure className={styles.newsFeatureMedia}>
                  <FeaturedNewsMedia post={activePost} />
                </figure>

                <div className={styles.newsFeatureContent}>
                  <div className={styles.newsFeatureBody}>
                    {renderRichBody(activePost.body, styles)}
                  </div>

                  <div className={styles.newsMetaGrid}>
                    <span>
                      {copy.reader.storeLabel} · {activePost.restaurantName || "-"}
                    </span>
                    <span>
                      {copy.filters.category} · {getPostCategoryLabel(copy, activePost.category)}
                    </span>
                  </div>

                  {activePost.tags.length > 0 ? (
                    <div className={styles.newsTags}>
                      {activePost.tags.map((tag) => (
                        <span key={tag} className={styles.newsTag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {activePost.canDelete ? (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      disabled={deleteState.postId === activePost.id}
                      onClick={() => handleDeletePost(activePost.id)}
                    >
                      {copy.reader.delete}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ) : null}
        </section>
      </section>
    );
  }

  return (
    <section className={styles.newsModule}>
      {notificationPosts.length > 0 ? (
        <div
          className={styles.notificationOverlay}
          role="dialog"
          aria-label={copy.notification.title}
        >
          <button
            type="button"
            className={styles.readerBackdrop}
            aria-label={copy.notification.close}
            onClick={closeNotification}
          />
          <section className={styles.notificationPanel}>
            <p className={styles.newsMiniMeta}>{copy.notification.latestLabel}</p>
            <h3>{copy.notification.title}</h3>
            <p>{copy.notification.subtitle}</p>

            <div className={styles.notificationList}>
              {notificationPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={styles.notificationItem}
                  onClick={() => handleOpenNotificationPost(post.id)}
                >
                  <span>{formatDate(post.createdAt)}</span>
                  <strong>{renderInlineMarkdown(post.title)}</strong>
                  <small>{renderInlineMarkdown(post.summary)}</small>
                </button>
              ))}
            </div>

            <div className={styles.notificationActions}>
              <button type="button" onClick={closeNotification}>
                {copy.notification.close}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {renderNewsBoard()}

      {canPublish ? (
        <form className={styles.publishPanel} onSubmit={handlePreview}>
          <div className={styles.publishIntro}>
            <p className={styles.newsSectionLine}>{copy.publish.title}</p>
            <p>{copy.publish.subtitle}</p>
          </div>

          <div className={styles.publishGrid}>
            <div
              className={`${styles.publishField} ${styles.publishFieldWide} ${styles.publishTitleField}`}
            >
              <span>
                {copy.publish.titleLabel}
                <b aria-hidden="true">*</b>
              </span>
              <DashboardNewsInlineEditor
                value={form.title}
                onChange={(nextTitle) => updateForm("title", nextTitle)}
                placeholder={copy.publish.titlePlaceholder}
                maxLength={120}
                warningThreshold={100}
                ariaLabel={copy.publish.titleLabel}
                previewRenderer={(value) => (
                  <p>{renderInlineMarkdown(value)}</p>
                )}
              />
            </div>

            <label className={styles.publishField}>
              <span>
                {copy.filters.category}
                <b aria-hidden="true">*</b>
              </span>
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
              >
                {Object.entries(copy.categories)
                  .filter(([value]) => value !== "all")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>

            <label className={`${styles.publishField} ${styles.visibilityField}`}>
              <span>
                {copy.filters.visibility}
                <b aria-hidden="true">*</b>
              </span>
              <span className={styles.visibilityControl}>
                <span className={styles.visibilityControlIcon} aria-hidden="true">
                  ◉
                </span>
                <span className={styles.visibilityControlBody}>
                  <select
                    value={form.visibility}
                    onChange={(event) =>
                      updateForm("visibility", event.target.value)
                    }
                  >
                    {Object.entries(copy.visibility)
                      .filter(([value]) => value !== "all")
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </select>
                  <small>
                    {copy.publish.visibilityDescriptions[form.visibility]}
                  </small>
                </span>
              </span>
            </label>

            <div className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>
                {copy.publish.summaryLabel}
                <b aria-hidden="true">*</b>
              </span>
              <DashboardNewsInlineEditor
                value={form.summary}
                onChange={(nextSummary) => updateForm("summary", nextSummary)}
                placeholder={copy.publish.summaryPlaceholder}
                maxLength={240}
                ariaLabel={copy.publish.summaryLabel}
                previewRenderer={(value) => (
                  <p>{renderInlineMarkdown(value)}</p>
                )}
              />
            </div>

            <div className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>
                {copy.publish.bodyLabel}
                <b aria-hidden="true">*</b>
              </span>
              <DashboardNewsMarkdownEditor
                value={form.body}
                onChange={(nextBody) => updateForm("body", nextBody)}
                placeholder={copy.publish.bodyPlaceholder}
                maxLength={5000}
                onImageUpload={handleEditorImageUpload}
                isUploadingImage={isUploadingBodyImage}
                imageLabels={{
                  hint: copy.publish.bodyImageHint,
                  uploading: copy.publish.bodyImageUploading,
                }}
                previewRenderer={(value) => renderRichBody(value, styles)}
                labels={copy.publish.editor}
                ariaLabel={copy.publish.bodyLabel}
                footerStatus={draftStatus}
              />
            </div>

            <div className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>
                {copy.publish.tagsLabel}
                <small>{copy.publish.optional}</small>
              </span>
              <DashboardNewsTagInput
                value={form.tags}
                onChange={(nextTags) => updateForm("tags", nextTags)}
                suggestions={availableTags}
                labels={{
                  placeholder: copy.publish.tagsPlaceholder,
                  add: copy.publish.tagsAdd,
                  limit: copy.publish.tagsLimit,
                  removeTag: copy.publish.tagsRemove,
                }}
                disabled={submitState.isSubmitting}
              />
            </div>

            <div className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>
                {copy.publish.attachmentLabel}
                <small>{copy.publish.optional}</small>
              </span>
              <DashboardNewsAttachmentDropzone
                file={attachmentFile}
                onChange={updateAttachmentFile}
                inputKey={attachmentInputKey}
                disabled={submitState.isSubmitting}
                onError={(message) =>
                  setSubmitState({ isSubmitting: false, message })
                }
                labels={{
                  title: copy.publish.attachmentDropTitle,
                  hint: copy.publish.attachmentHint,
                  remove: copy.publish.attachmentRemove,
                  sizeError: copy.publish.attachmentSizeError,
                }}
              />
            </div>
          </div>

          <div className={styles.publishActions}>
            <div className={styles.publishActionStatus}>
              <strong>{copy.visibility[form.visibility]}</strong>
              <span>{copy.publish.visibilityDescriptions[form.visibility]}</span>
              <p role="status">{submitState.message || draftStatus}</p>
            </div>
            <div className={styles.publishActionButtons}>
              <button
                type="button"
                className={styles.publishButtonText}
                onClick={handleCancelPublish}
                disabled={submitState.isSubmitting}
              >
                {copy.publish.cancel}
              </button>
              <button
                type="button"
                className={styles.publishButtonSecondary}
                onClick={handleSaveDraft}
                disabled={submitState.isSubmitting}
              >
                {copy.publish.saveDraft}
              </button>
              <button
                type="button"
                className={styles.publishButtonOutline}
                onClick={handlePreview}
                disabled={submitState.isSubmitting || isUploadingBodyImage}
              >
                {copy.publish.preview}
              </button>
              <button
                type="submit"
                disabled={submitState.isSubmitting || isUploadingBodyImage}
              >
                {copy.publish.submit}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {isPreviewOpen ? (
        <div className={styles.readerOverlay} role="presentation">
          <button
            type="button"
            className={styles.readerBackdrop}
            onClick={() => setIsPreviewOpen(false)}
            aria-label={copy.publish.closePreview}
          />
          <article
            ref={previewPanelRef}
            className={`${styles.readerPanel} ${styles.publishPreviewPanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-news-preview-title"
            tabIndex={-1}
          >
            <div className={styles.readerTop}>
              <div>
                <p className={styles.newsMiniMeta}>{copy.publish.previewLabel}</p>
                <p className={styles.publishPreviewAudience}>
                  {copy.publish.previewVisibility} ·{" "}
                  {copy.visibility[form.visibility]}
                </p>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)}>
                {copy.publish.returnToEdit}
              </button>
            </div>
            <h3 id="dashboard-news-preview-title" className={styles.readerTitle}>
              {renderInlineMarkdown(form.title)}
            </h3>
            <p className={styles.readerSummary}>
              {renderInlineMarkdown(form.summary)}
            </p>
            <div className={styles.readerMeta}>
              <span>{getPostCategoryLabel(copy, getBackendCategory(form.category))}</span>
              <span>{copy.visibility[form.visibility]}</span>
              {parseTags(form.tags).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <div className={styles.readerBody}>
              {renderRichBody(form.body, styles)}
            </div>
            {attachmentFile ? (
              <div className={styles.publishPreviewAttachment}>
                <strong>{attachmentFile.name}</strong>
                <span>{Math.ceil(attachmentFile.size / 1024)} KB</span>
              </div>
            ) : null}
            <div className={styles.publishPreviewActions}>
              <button
                type="button"
                className={styles.publishButtonOutline}
                onClick={() => setIsPreviewOpen(false)}
                disabled={submitState.isSubmitting}
              >
                {copy.publish.returnToEdit}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitState.isSubmitting}
              >
                {submitState.isSubmitting
                  ? copy.publish.submitting
                  : copy.publish.confirmPublish}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      <div className={styles.newsSectionLine}>{copy.overviewLabel}</div>

      <section className={styles.newsStats} aria-label={copy.overviewLabel}>
        <article className={styles.newsStat}>
          <p className={styles.newsStatLabel}>{copy.stats.total}</p>
          <p className={styles.newsStatValue}>{visiblePosts.length}</p>
        </article>
        <article className={styles.newsStat}>
          <p className={styles.newsStatLabel}>{copy.stats.news}</p>
          <p className={styles.newsStatValue}>{postsByColumn.news.length}</p>
        </article>
        <article className={styles.newsStat}>
          <p className={styles.newsStatLabel}>{copy.stats.congrats}</p>
          <p className={styles.newsStatValue}>{postsByColumn.congrats.length}</p>
        </article>
        <article className={styles.newsStat}>
          <p className={styles.newsStatLabel}>{copy.stats.issues}</p>
          <p className={styles.newsStatValue}>{postsByColumn.issues.length}</p>
        </article>
      </section>

      <section className={styles.newsFilters} aria-label={copy.filters.reset}>
        <label className={styles.newsField}>
          <span className={styles.newsFieldLabel}>{copy.filters.search}</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.filters.searchPlaceholder}
          />
        </label>

        <label className={styles.newsField}>
          <span className={styles.newsFieldLabel}>{copy.filters.visibility}</span>
          <select
            value={selectedVisibility}
            onChange={(event) => setSelectedVisibility(event.target.value)}
          >
            {Object.entries(copy.visibility).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.newsField}>
          <span className={styles.newsFieldLabel}>{copy.filters.sort}</span>
          <select
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value)}
          >
            {Object.entries(copy.sort).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className={styles.resetFilters} onClick={resetFilters}>
          {copy.filters.reset}
        </button>
      </section>

      <div className={styles.tagRow}>
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`${styles.tagChip} ${
              selectedTag === tag ? styles.tagChipActive : ""
            }`}
            onClick={() => setSelectedTag(tag)}
          >
            {tag === "all" ? copy.categories.all : `#${tag}`}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className={styles.newsEmpty} role="alert">
          {loadError}
        </div>
      ) : null}

      {readerError ? (
        <div className={styles.newsEmpty} role="alert">
          {readerError}
        </div>
      ) : null}

      {deleteState.message ? (
        <div className={styles.newsEmpty} role="status">
          {deleteState.message}
        </div>
      ) : null}

      {selectedPost ? (
        <div className={styles.readerOverlay} role="dialog" aria-label={copy.reader.title}>
          <button
            type="button"
            className={styles.readerBackdrop}
            aria-label={copy.reader.close}
            onClick={() => setSelectedPost(null)}
          />
          <article className={styles.readerPanel}>
            <div className={styles.readerTop}>
              <p className={styles.newsMiniMeta}>
                {copy.dateLabel} · {formatDate(selectedPost.createdAt)}
              </p>
              <div className={styles.readerActions}>
                {selectedPost.canDelete ? (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={deleteState.postId === selectedPost.id}
                    onClick={() => handleDeletePost(selectedPost.id)}
                  >
                    {copy.reader.delete}
                  </button>
                ) : null}
                <button type="button" onClick={() => setSelectedPost(null)}>
                  {copy.reader.close}
                </button>
              </div>
            </div>
            <h3 className={styles.readerTitle}>
              {renderInlineMarkdown(selectedPost.title)}
            </h3>
            <p className={styles.readerSummary}>
              {renderInlineMarkdown(selectedPost.summary)}
            </p>
            <div className={styles.readerMeta}>
              <span>
                {copy.byLabel} · {selectedPost.author.name}
              </span>
              <span>
                {copy.reader.storeLabel} · {selectedPost.restaurantName || "-"}
              </span>
              <span>{copy.visibility[selectedPost.visibility]}</span>
            </div>
            <div className={styles.readerBody}>
              {renderRichBody(selectedPost.body, styles)}
            </div>
            {selectedPost.attachment ? (
              <a
                href={resolveAttachmentHref(selectedPost.attachment)}
                className={styles.attachmentCard}
                target="_blank"
                rel="noreferrer"
                onClick={(event) =>
                  handleAttachmentClick(event, selectedPost.attachment)
                }
              >
                <div>
                  <strong>{selectedPost.attachment.name}</strong>
                  <small>
                    {Math.ceil(selectedPost.attachment.sizeBytes / 1024)} KB
                  </small>
                </div>
                <span aria-hidden="true">→</span>
              </a>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}

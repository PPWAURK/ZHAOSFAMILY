"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";
import DashboardNewsMarkdownEditor from "@/features/dashboard/components/DashboardNewsMarkdownEditor";
import {
  createDashboardNewsPost,
  deleteDashboardNewsPost,
  fetchDashboardNewsPost,
  fetchDashboardNewsPosts,
  getDashboardNewsAttachmentUrl,
  uploadDashboardNewsAttachment,
} from "@/features/dashboard/services/dashboardNewsApi";
import styles from "@/features/dashboard/dashboard-page.module.css";

const HOLDING_JOB_ROLE = "holding";
const SEEN_AT_STORAGE_PREFIX = "zhao_dashboard_news_seen_at";
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

function resolveDashboardMediaUrl(src) {
  try {
    const url = new URL(src);
    const objectKey = url.searchParams.get("objectKey");

    return objectKey ? getDashboardNewsAttachmentUrl(objectKey) : src;
  } catch {
    return src;
  }
}

function renderInlineMarkdown(text) {
  const tokens = [];
  const remaining = text;

  // Match **bold**, *italic*, [link](url), and plain text segments
  const pattern =
    /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|(?:\\.|[^*[\]()])+)/g;
  let match;

  while ((match = pattern.exec(remaining)) !== null) {
    const full = match[1];

    if (full.startsWith("**") && full.endsWith("**")) {
      tokens.push(<strong key={tokens.length}>{match[2]}</strong>);
    } else if (full.startsWith("*") && full.endsWith("*")) {
      tokens.push(<em key={tokens.length}>{match[3]}</em>);
    } else if (full.startsWith("[")) {
      tokens.push(
        <a key={tokens.length} href={match[5]} target="_blank" rel="noreferrer">
          {match[4]}
        </a>,
      );
    } else {
      tokens.push(full);
    }
  }

  return tokens.length > 0 ? tokens : text;
}

function renderRichBody(body, styles) {
  const lines = body.split("\n");
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
        {line
          ? renderInlineMarkdown(line)
          : "\u00a0"}
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
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [isUploadingBodyImage, setIsUploadingBodyImage] = useState(false);
  const [submitState, setSubmitState] = useState({ isSubmitting: false, message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedTag, setSelectedTag] = useState("all");
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
    const categoryFiltered =
      selectedCategory === "all"
        ? tagFiltered
        : tagFiltered.filter(
            (post) => getBoardCategory(post.category) === selectedCategory,
          );

    return sortPosts(categoryFiltered, lang, selectedSort);
  }, [lang, posts, selectedCategory, selectedSort, selectedTag]);

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
    return attachment?.objectKey
      ? getDashboardNewsAttachmentUrl(attachment.objectKey)
      : attachment?.href || "#";
  }

  function handleAttachmentClick(event, attachment) {
    if (!attachment?.objectKey) {
      return;
    }

    event.currentTarget.href = getDashboardNewsAttachmentUrl(attachment.objectKey);
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitState((prev) => ({ ...prev, message: "" }));
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      setSubmitState({ isSubmitting: false, message: copy.publish.required });
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
    setSelectedCategory("all");
    setSelectedVisibility("all");
    setSelectedSort("newest");
    setSelectedTag("all");
  }

  return (
    <motion.section
      className={styles.newsModule}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.newsHero}>
        <p className={styles.newsEyebrow}>{copy.kicker}</p>
        <h2 className={styles.newsTitle}>
          {copy.title}
          <span className={styles.newsTitleAccent}>{copy.titleAccent}</span>
        </h2>
        <p className={styles.newsSubtitle}>{copy.subtitle}</p>
      </div>

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
                  <strong>{post.title}</strong>
                  <small>{post.summary}</small>
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

      {canPublish ? (
        <form className={styles.publishPanel} onSubmit={handleSubmit}>
          <div className={styles.publishIntro}>
            <p className={styles.newsSectionLine}>{copy.publish.title}</p>
            <p>{copy.publish.subtitle}</p>
          </div>

          <div className={styles.publishGrid}>
            <label className={styles.publishField}>
              <span>{copy.publish.titleLabel}</span>
              <textarea
                className={styles.publishTitleInput}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder={copy.publish.titlePlaceholder}
                maxLength={120}
                rows={2}
              />
            </label>

            <label className={styles.publishField}>
              <span>{copy.filters.category}</span>
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

            <label className={styles.publishField}>
              <span>{copy.filters.visibility}</span>
              <select
                value={form.visibility}
                onChange={(event) => updateForm("visibility", event.target.value)}
              >
                {Object.entries(copy.visibility)
                  .filter(([value]) => value !== "all")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>

            <label className={styles.publishField}>
              <span>{copy.publish.tagsLabel}</span>
              <input
                value={form.tags}
                onChange={(event) => updateForm("tags", event.target.value)}
                placeholder={copy.publish.tagsPlaceholder}
                maxLength={180}
              />
            </label>

            <label className={styles.publishField}>
              <span>{copy.publish.attachmentLabel}</span>
              <span className={styles.uploadControl}>
                <input
                  key={attachmentInputKey}
                  type="file"
                  onChange={(event) =>
                    setAttachmentFile(event.target.files?.[0] || null)
                  }
                />
                <span className={styles.uploadButton}>
                  {copy.publish.attachmentLabel}
                </span>
                <small className={styles.uploadHint}>
                  {attachmentFile?.name || copy.publish.attachmentHint}
                </small>
              </span>
            </label>

            <label className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>{copy.publish.summaryLabel}</span>
              <input
                value={form.summary}
                onChange={(event) => updateForm("summary", event.target.value)}
                placeholder={copy.publish.summaryPlaceholder}
                maxLength={240}
              />
            </label>

            <label className={`${styles.publishField} ${styles.publishFieldWide}`}>
              <span>{copy.publish.bodyLabel}</span>
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
              />
            </label>
          </div>

          <div className={styles.publishActions}>
            <p role="status">{submitState.message}</p>
            <button
              type="submit"
              disabled={submitState.isSubmitting || isUploadingBodyImage}
            >
              {submitState.isSubmitting ? copy.publish.submitting : copy.publish.submit}
            </button>
          </div>
        </form>
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
          <span className={styles.newsFieldLabel}>{copy.filters.category}</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            {Object.entries(copy.categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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

      <div className={styles.newsBoard}>
        {Object.entries(copy.columns).map(([columnKey, columnMeta], columnIndex) => {
          const columnPosts = postsByColumn[columnKey];
          const activeIndex = activePostIndexByColumn[columnKey] || 0;
          const activePost = columnPosts[activeIndex] || null;

          return (
            <section key={columnKey} className={styles.newsColumn}>
              <div className={styles.newsColumnHead}>
                <div>
                  <p className={styles.newsColumnIndex}>
                    {columnMeta.index} · {columnMeta.title}
                  </p>
                  <h3 className={styles.newsColumnTitle}>{columnMeta.title}</h3>
                  <p className={styles.newsColumnSubtitle}>{columnMeta.subtitle}</p>
                </div>
                <p className={styles.newsColumnCount}>
                  {columnPosts.length} {copy.cardsLabel}
                </p>
              </div>

              <div className={styles.newsCarouselControls}>
                <button
                  type="button"
                  className={styles.newsCarouselArrow}
                  onClick={() => moveColumnPost(columnKey, -1)}
                  disabled={columnPosts.length <= 1}
                  aria-label={`${columnMeta.title} previous`}
                >
                  ←
                </button>
                <span className={styles.newsCarouselProgress}>
                  {columnPosts.length > 0 ? activeIndex + 1 : 0} /{" "}
                  {columnPosts.length}
                </span>
                <button
                  type="button"
                  className={styles.newsCarouselArrow}
                  onClick={() => moveColumnPost(columnKey, 1)}
                  disabled={columnPosts.length <= 1}
                  aria-label={`${columnMeta.title} next`}
                >
                  →
                </button>
              </div>

              <div className={styles.newsCardList}>
                {isLoading ? <div className={styles.newsEmpty}>{copy.loading}</div> : null}

                {!isLoading && columnPosts.length === 0 ? (
                  <div className={styles.newsEmpty}>{copy.empty}</div>
                ) : null}

                {!isLoading && activePost ? (
                      <motion.article
                        key={activePost.id}
                        className={styles.newsCard}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.05 * columnIndex,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <div className={styles.newsCardMetaTop}>
                          <div className={styles.newsCardMetaBlock}>
                            <p className={styles.newsMiniMeta}>
                              {copy.dateLabel} · {formatDate(activePost.createdAt)}
                            </p>
                            <h4 className={styles.newsCardTitle}>{activePost.title}</h4>
                            <p className={styles.newsAuthorLine}>
                              {copy.byLabel} · {activePost.author.name}
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

                        <p className={styles.newsCardContent}>{activePost.summary}</p>

                        <div className={styles.newsMetaGrid}>
                          <span>
                            {copy.filters.category} ·{" "}
                            {getPostCategoryLabel(copy, activePost.category)}
                          </span>
                          <span>
                            {copy.reader.storeLabel} · {activePost.restaurantName || "-"}
                          </span>
                          <span>
                            {copy.attachmentLabel} ·{" "}
                            {activePost.attachment ? activePost.attachment.name : "-"}
                          </span>
                        </div>

                        <div className={styles.newsTags}>
                          {activePost.tags.map((tag) => (
                            <span key={tag} className={styles.newsTag}>
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          className={styles.readButton}
                          onClick={() => handleOpenPost(activePost.id)}
                        >
                          {copy.reader.open}
                          <span aria-hidden="true">→</span>
                        </button>

                        {activePost.attachment ? (
                          <a
                            href={resolveAttachmentHref(activePost.attachment)}
                            className={styles.attachmentCard}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) =>
                              handleAttachmentClick(event, activePost.attachment)
                            }
                          >
                            <div>
                              <strong>{activePost.attachment.name}</strong>
                              <small>
                                {Math.ceil(activePost.attachment.sizeBytes / 1024)} KB
                              </small>
                            </div>
                            <span aria-hidden="true">→</span>
                          </a>
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
                      </motion.article>
                    ) : null}
              </div>
            </section>
          );
        })}
      </div>

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
            <h3 className={styles.readerTitle}>{selectedPost.title}</h3>
            <p className={styles.readerSummary}>{selectedPost.summary}</p>
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
    </motion.section>
  );
}

export const FONT_SIZE_OPTIONS = Array.from(
  { length: 11 },
  (_, index) => 12 + index * 2,
);
export const FONT_WEIGHT_OPTIONS = [400, 500, 600, 700];

const ALLOWED_FONT_SIZES = new Set(FONT_SIZE_OPTIONS);
const ALLOWED_FONT_WEIGHTS = new Set(FONT_WEIGHT_OPTIONS);

export function restoreEditorSelection(
  editor: HTMLElement,
  savedRange: Range | null,
): void {
  const selection = window.getSelection();

  if (
    !selection ||
    !savedRange ||
    !editor.contains(savedRange.commonAncestorContainer)
  ) {
    editor.focus();
    return;
  }

  selection.removeAllRanges();
  selection.addRange(savedRange);
}

export function placeEditorCaretAtEnd(element: HTMLElement): void {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function applyEditorRangeStyle(
  range: Range,
  size: number,
  weight: number,
): void {
  if (range.collapsed) {
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.style.fontWeight = `${weight}`;
    span.appendChild(document.createTextNode("\u200b"));
    range.insertNode(span);
    placeEditorCaretAtEnd(span);
    return;
  }

  const commonElement =
    range.commonAncestorContainer.nodeType === window.Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  const existingStyle = commonElement?.closest("span[style]");

  if (existingStyle && existingStyle.contains(range.commonAncestorContainer)) {
    const styledElement = existingStyle as HTMLElement;
    styledElement.style.fontSize = `${size}px`;
    styledElement.style.fontWeight = `${weight}`;
    return;
  }

  const root =
    range.commonAncestorContainer.nodeType === window.Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;

  if (!(root instanceof window.HTMLElement)) return;

  const walker = document.createTreeWalker(
    root,
    window.NodeFilter.SHOW_TEXT,
  );
  const selectedTextNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.textContent && range.intersectsNode(currentNode)) {
      selectedTextNodes.push(currentNode as Text);
    }
    currentNode = walker.nextNode();
  }

  selectedTextNodes.reverse().forEach((textNode) => {
    const start = textNode === range.startContainer ? range.startOffset : 0;
    const end =
      textNode === range.endContainer
        ? range.endOffset
        : textNode.textContent?.length || 0;

    if (start >= end) return;

    const textRange = document.createRange();
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.style.fontWeight = `${weight}`;
    textRange.setStart(textNode, start);
    textRange.setEnd(textNode, end);
    textRange.surroundContents(span);
  });
}

export type EditorBlockStyle = "p" | "h2" | "h3" | "blockquote" | "callout";

export function applyEditorBlockStyle(
  editor: HTMLElement,
  range: Range,
  blockStyle: EditorBlockStyle,
): void {
  const anchorElement =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  const currentBlock = anchorElement?.closest(
    "p,h2,h3,blockquote,aside[data-zhao-block='callout']",
  );

  if ((!currentBlock || !editor.contains(currentBlock)) && blockStyle !== "callout") {
    document.execCommand("formatBlock", false, blockStyle);
    return;
  }

  let blockToReplace = currentBlock;

  if (!blockToReplace || !editor.contains(blockToReplace)) {
    document.execCommand("formatBlock", false, "p");
    const nextSelection = window.getSelection();
    const nextAnchor =
      nextSelection?.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (nextSelection.anchorNode as Element)
        : nextSelection?.anchorNode?.parentElement;
    blockToReplace = nextAnchor?.closest("p") || null;
  }

  if (!blockToReplace || !editor.contains(blockToReplace)) return;

  const tagName = blockStyle === "callout" ? "aside" : blockStyle;
  const replacement = document.createElement(tagName);

  if (blockStyle === "callout") {
    replacement.dataset.zhaoBlock = "callout";
  }

  while (blockToReplace.firstChild) {
    replacement.appendChild(blockToReplace.firstChild);
  }

  blockToReplace.replaceWith(replacement);
  placeEditorCaretAtEnd(replacement);
}

export function normalizeEditorLinkUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function serializeChildren(element: Element): string {
  return Array.from(element.childNodes).map(serializeInlineNode).join("");
}

function serializeStyledSpan(element: HTMLElement, content: string): string {
  const size = Number.parseInt(element.style.fontSize, 10);
  const weight = Number.parseInt(element.style.fontWeight, 10);

  if (
    !content ||
    !ALLOWED_FONT_SIZES.has(size) ||
    !ALLOWED_FONT_WEIGHTS.has(weight)
  ) {
    return content;
  }

  const flattenedContent = content.replace(
    /\[\[zhao-style:[^\]]+\]\]([\s\S]*?)\[\[\/zhao-style\]\]/g,
    "$1",
  );

  return `[[zhao-style:size=${size};weight=${weight}]]${flattenedContent}[[/zhao-style]]`;
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "")
      .replaceAll("\u00a0", " ")
      .replaceAll("\u200b", "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();
  const content = serializeChildren(node);

  if (tagName === "br") return "\n";
  if (tagName === "strong" || tagName === "b") {
    return content ? `**${content}**` : "";
  }
  if (tagName === "em" || tagName === "i") {
    return content ? `*${content}*` : "";
  }
  if (tagName === "u") {
    return content ? `[[zhao-underline]]${content}[[/zhao-underline]]` : "";
  }
  if (tagName === "a") {
    const href = node.getAttribute("href") || "";
    return href && content ? `[${content}](${href})` : content;
  }
  if (tagName === "img") {
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "image";
    return src ? `![${alt}](${src})` : "";
  }
  if (tagName === "span") {
    return serializeStyledSpan(node, content);
  }

  return content;
}

function serializeList(element: HTMLElement, ordered: boolean): string {
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === "li")
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}.` : "-";
      return `${prefix} ${serializeChildren(item).trim()}`;
    })
    .join("\n");
}

function serializeBlockNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return serializeInlineNode(node).trim();
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();

  if (tagName === "ul") return serializeList(node, false);
  if (tagName === "ol") return serializeList(node, true);
  if (tagName === "hr") return "---";
  if (tagName === "h2") {
    const content = serializeChildren(node).trim();
    return content ? `# ${content}` : "";
  }
  if (tagName === "h3") {
    const content = serializeChildren(node).trim();
    return content ? `## ${content}` : "";
  }
  if (tagName === "blockquote") {
    const content = serializeChildren(node).trim();
    return content ? `> ${content}` : "";
  }
  if (tagName === "aside" && node.dataset.zhaoBlock === "callout") {
    const content = serializeChildren(node).trim();
    return content ? `:::callout ${content}` : "";
  }
  if (tagName === "figure") {
    return serializeChildren(node).trim();
  }

  return serializeChildren(node).trim();
}

export function serializeEditorContent(
  editor: HTMLElement,
  inlineOnly = false,
): string {
  if (inlineOnly) {
    return Array.from(editor.childNodes)
      .map((node, index) => {
        if (
          node instanceof HTMLElement &&
          ["div", "p"].includes(node.tagName.toLowerCase())
        ) {
          const content = serializeChildren(node);
          return `${index > 0 ? "\n" : ""}${content}`;
        }

        return serializeInlineNode(node);
      })
      .join("")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return Array.from(editor.childNodes)
    .map(serializeBlockNode)
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseMarkdownImage(markdown: string): {
  alt: string;
  src: string;
} | null {
  const match = markdown.match(/^!\[([^\]]*)\]\((.+)\)$/);

  if (!match) return null;

  return {
    alt: match[1] || "image",
    src: match[2],
  };
}

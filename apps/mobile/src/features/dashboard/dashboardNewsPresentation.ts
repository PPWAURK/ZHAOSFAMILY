export type NewsDeskCategory = "news" | "congrats" | "issues";

export const NEWS_CATEGORY_FILTERS: NewsDeskCategory[] = [
  "news",
  "congrats",
  "issues",
];

export function resolveNewsDeskCategory(category: string): NewsDeskCategory {
  if (category === "people") return "congrats";
  if (category === "quality") return "issues";

  return "news";
}

export function formatDashboardNewsDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export function parseDashboardNewsImage(
  line: string,
): { alt: string; src: string } | null {
  const match = line.match(/^!\[([^\]]*)]\((https?:\/\/[^)\s]+)\)$/);

  if (!match) return null;

  return {
    alt: match[1] || "image",
    src: match[2],
  };
}

export function findDashboardNewsBodyImage(
  body: string,
): { alt: string; src: string } | null {
  for (const line of body.split("\n")) {
    const image = parseDashboardNewsImage(line.trim());
    if (image) return image;
  }

  return null;
}

export function buildDashboardNewsImageViewerHtml(source: string): string {
  const serializedSource = JSON.stringify(source).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=5,user-scalable=yes">
<style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;background:#fff;overflow:auto}
body{display:flex;align-items:center;justify-content:center}
img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;-webkit-user-select:none;user-select:none}
</style>
</head>
<body>
<img id="media" alt="">
<script>
(function(){
  var image=document.getElementById('media');
  image.addEventListener('error',function(){
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage('image-error');
    }
  });
  image.src=${serializedSource};
})();
</script>
</body>
</html>`;
}

export function stripDashboardNewsFormatting(value: string): string {
  return value
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\[\[zhao-style:[^\]]+\]\]/g, "")
    .replace(/\[\[\/zhao-style\]\]/g, "")
    .replace(/\[\[zhao-underline\]\]/g, "")
    .replace(/\[\[\/zhao-underline\]\]/g, "")
    .replace(/^:::callout\s+/gm, "")
    .replace(/^#{1,2}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")
    .trim();
}

function normalizeDashboardNewsComparison(value: string): string {
  return stripDashboardNewsFormatting(value).replace(/\s+/g, "").toLocaleLowerCase();
}

export function isDashboardNewsSummaryDistinct(summary: string, body: string): boolean {
  const normalizedSummary = normalizeDashboardNewsComparison(summary);
  const normalizedBody = normalizeDashboardNewsComparison(body);

  if (!normalizedSummary || !normalizedBody) return false;

  return (
    normalizedSummary !== normalizedBody &&
    !normalizedBody.startsWith(normalizedSummary)
  );
}

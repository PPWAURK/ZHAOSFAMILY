import {
  buildDashboardNewsImageViewerHtml,
  findDashboardNewsBodyImage,
  isDashboardNewsSummaryDistinct,
  resolveNewsDeskCategory,
  stripDashboardNewsFormatting,
} from "@/features/dashboard/dashboardNewsPresentation";

describe("dashboard news presentation", () => {
  it("maps backend categories to the three dashboard sections", () => {
    expect(resolveNewsDeskCategory("operations")).toBe("news");
    expect(resolveNewsDeskCategory("people")).toBe("congrats");
    expect(resolveNewsDeskCategory("quality")).toBe("issues");
  });

  it("removes controlled editor markers without losing line breaks", () => {
    expect(
      stripDashboardNewsFormatting(
        "[[zhao-style:size=18;weight=700]]标题[[/zhao-style]]\n\n> **正文**",
      ),
    ).toBe("标题\n\n正文");
  });

  it("restores historical escaped line breaks", () => {
    expect(stripDashboardNewsFormatting("第一段\\n\\n第二段")).toBe(
      "第一段\n\n第二段",
    );
  });

  it("does not repeat a summary that duplicates the body", () => {
    expect(
      isDashboardNewsSummaryDistinct(
        "第一段\n\n第二段",
        "第一段\\n\\n第二段",
      ),
    ).toBe(false);
    expect(isDashboardNewsSummaryDistinct("一句摘要", "完整正文")).toBe(true);
  });

  it("finds the first body image used by the mobile hero", () => {
    expect(
      findDashboardNewsBodyImage(
        "正文\n![封面](https://example.com/cover.png)\n![第二张](https://example.com/2.png)",
      ),
    ).toEqual({
      alt: "封面",
      src: "https://example.com/cover.png",
    });
  });

  it("builds a zoomable image viewer without injecting raw markup", () => {
    const html = buildDashboardNewsImageViewerHtml(
      'https://example.com/image.png?name=</script><script>alert("x")</script>',
    );

    expect(html).toContain("maximum-scale=5");
    expect(html).not.toContain("</script><script>alert");
    expect(html).toContain("\\u003c/script>");
  });
});

import { buildPdfViewerHtml } from "@/features/training/trainingViewer";

describe("PDF training viewer", () => {
  it("renders a non-interactive watermark above every PDF page", () => {
    const html = buildPdfViewerHtml("dGVzdA==", {
      name: "张三",
      email: "zhangsan@example.com",
    });

    expect(html).toContain("张三");
    expect(html).toContain("zhangsan@example.com");
    expect(html).toContain("['top','middle','bottom']");
    expect(html).toContain("watermark--top");
    expect(html).toContain("watermark--middle");
    expect(html).toContain("watermark--bottom");
    expect(html).toContain("pointer-events:none");
    expect(html).toContain("pageElement.appendChild(watermark)");
  });

  it("escapes watermark text before placing it in the viewer script", () => {
    const html = buildPdfViewerHtml("dGVzdA==", {
      name: "</script><script>alert(1)</script>",
      email: "zhangsan@example.com",
    });

    expect(html).toContain("\\u003c/script>");
    expect(html).not.toContain("</script><script>alert(1)</script>");
  });
});

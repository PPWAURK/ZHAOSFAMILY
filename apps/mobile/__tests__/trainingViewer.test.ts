import {
  buildPdfViewerHtml,
  buildVideoPlayerHtml,
} from "@/features/training/trainingViewer";

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

describe("video training viewer", () => {
  it("uses custom tap and long-press controls instead of native controls", () => {
    const html = buildVideoPlayerHtml("file:///training.mp4", 0);

    expect(html).not.toContain("<video controls");
    expect(html).toContain("video.playbackRate=2");
    expect(html).toContain("if(video.paused){video.play()");
    expect(html).toContain("document.addEventListener('touchstart'");
    expect(html).toContain("document.addEventListener('touchend'");
    expect(html).toContain("Date.now()-lastReportedAt>=400");
  });

  it("only exposes the seek control for completed materials", () => {
    const incompleteHtml = buildVideoPlayerHtml("file:///training.mp4", 0);
    const completedHtml = buildVideoPlayerHtml("file:///training.mp4", 0, true);

    expect(incompleteHtml).toContain("var seekingEnabled=false;");
    expect(completedHtml).toContain("var seekingEnabled=true;");
  });
});

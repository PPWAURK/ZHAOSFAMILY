import { buildUserMediaCacheKey } from "@/lib/mediaCache";

describe("user media cache keys", () => {
  it("keeps the same key when an access token changes", () => {
    const objectKey = "training/2026/welcome-guide.pdf";

    const firstKey = buildUserMediaCacheKey(42, objectKey);
    const refreshedTokenKey = buildUserMediaCacheKey(42, objectKey);

    expect(firstKey).toBe(refreshedTokenKey);
  });

  it("separates media cached for different users", () => {
    expect(buildUserMediaCacheKey(42, "avatar/profile.jpg")).not.toBe(
      buildUserMediaCacheKey(84, "avatar/profile.jpg"),
    );
  });
});

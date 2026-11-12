import { clampVisibleCount, nextVisibleCount } from "@/lib/useProgressiveList";

describe("clampVisibleCount", () => {
  it("returns the initial count when the list is longer", () => {
    expect(clampVisibleCount(10, 4)).toBe(4);
  });

  it("never exceeds the total", () => {
    expect(clampVisibleCount(2, 8)).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(clampVisibleCount(0, 8)).toBe(0);
  });
});

describe("nextVisibleCount", () => {
  it("grows by one batch", () => {
    expect(nextVisibleCount(6, 20, 6)).toBe(12);
  });

  it("stops at the total", () => {
    expect(nextVisibleCount(18, 20, 6)).toBe(20);
  });

  it("is a no-op when everything is visible", () => {
    expect(nextVisibleCount(20, 20, 6)).toBe(20);
  });

  it("does not shrink if total dropped below current", () => {
    expect(nextVisibleCount(12, 5, 6)).toBe(5);
  });
});

import {
  getVideoFeedRetainedIndexes,
  getVideoFeedWindow,
  shouldAcceptPreparedVideoSource,
} from "@/features/training/trainingVideoFeed";

describe("training video feed window", () => {
  it("retains only the previous, current and next videos", () => {
    expect(getVideoFeedRetainedIndexes(3, 8)).toEqual([2, 3, 4]);
  });

  it("clamps the active index at feed boundaries", () => {
    expect(getVideoFeedWindow(-1, 3)).toEqual({
      currentIndex: 0,
      previousIndex: null,
      nextIndex: 1,
    });
    expect(getVideoFeedWindow(8, 3)).toEqual({
      currentIndex: 2,
      previousIndex: 1,
      nextIndex: null,
    });
  });

  it("does not retain a player when the feed is empty", () => {
    expect(getVideoFeedRetainedIndexes(0, 0)).toEqual([]);
  });

  it("keeps an in-flight preload when that video becomes active", () => {
    expect(
      shouldAcceptPreparedVideoSource(
        2,
        4,
        new Map([[2, 4]]),
        new Set([1, 2, 3]),
      ),
    ).toBe(true);
  });

  it("rejects superseded or out-of-window preload results", () => {
    expect(
      shouldAcceptPreparedVideoSource(
        2,
        4,
        new Map([[2, 5]]),
        new Set([1, 2, 3]),
      ),
    ).toBe(false);
    expect(
      shouldAcceptPreparedVideoSource(
        2,
        4,
        new Map([[2, 4]]),
        new Set([3, 4, 5]),
      ),
    ).toBe(false);
  });
});

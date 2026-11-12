import { AccessibilityInfo, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import {
  REVEAL_MAX_STAGGER_STEPS,
  REVEAL_STEP_MS,
  RevealList,
  getRevealDelay,
} from "@/features/training/TrainingFolderReveal";

describe("getRevealDelay", () => {
  test("delays each item by one step in order", () => {
    expect(getRevealDelay(0)).toBe(0);
    expect(getRevealDelay(1)).toBe(REVEAL_STEP_MS);
    expect(getRevealDelay(3)).toBe(3 * REVEAL_STEP_MS);
  });

  test("caps the delay so long lists do not wait forever", () => {
    expect(getRevealDelay(500)).toBe(REVEAL_MAX_STAGGER_STEPS * REVEAL_STEP_MS);
  });
});

describe("RevealList", () => {
  beforeEach(() => {
    // Reduce-motion skips the native-driven animation, which jest cannot run.
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders every child, including nested arrays", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <RevealList>
          <Text>a</Text>
          {["b", "c"].map((label) => (
            <Text key={label}>{label}</Text>
          ))}
          {null}
        </RevealList>,
      );
    });

    const texts = renderer.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toEqual(["a", "b", "c"]);
  });
});

import { Dimensions } from "react-native";

// ---------------------------------------------------------------------------
// Tablet up-scaling
//
// The layouts are already responsive (flex-based), but every size is authored
// for phones, so on an iPad text / spacing / cards look small in the wider
// screen. This helper multiplies the size-related properties of a StyleSheet
// definition by a fixed factor on tablets, leaving phones untouched.
//
// Usage — one line per stylesheet:
//   const styles = StyleSheet.create(scaleStyles({ ... }));
//
// Only size/spacing/typography keys are scaled. Layout primitives (flex,
// borderWidth, absolute offsets) and percentage strings are left as-is so the
// composition stays intact and lines stay crisp.
// ---------------------------------------------------------------------------

const { width, height } = Dimensions.get("window");

/** True on iPad-class devices (shortest side ≥ 600pt). */
export const isTablet = Math.min(width, height) >= 600;

/** How much bigger everything gets on tablets. */
export const TABLET_SCALE = 1.25;

const SCALABLE_KEYS = new Set<string>([
  "fontSize",
  "lineHeight",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingHorizontal",
  "paddingVertical",
  "paddingStart",
  "paddingEnd",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "gap",
  "rowGap",
  "columnGap",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
]);

function scaleValue(value: number): number {
  return Math.round(value * TABLET_SCALE * 100) / 100;
}

function scaleStyleObject(style: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    next[key] =
      typeof value === "number" && SCALABLE_KEYS.has(key) ? scaleValue(value) : value;
  }

  return next;
}

/**
 * Returns a scaled copy of a raw style map on tablets; the original object on
 * phones. Wrap the object passed to `StyleSheet.create`.
 */
export function scaleStyles<T>(styles: T): T {
  if (!isTablet) {
    return styles;
  }

  const next: Record<string, unknown> = {};

  for (const [name, style] of Object.entries(styles as Record<string, unknown>)) {
    next[name] =
      style && typeof style === "object" && !Array.isArray(style)
        ? scaleStyleObject(style as Record<string, unknown>)
        : style;
  }

  return next as T;
}

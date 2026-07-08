import { describe, expect, it } from "vitest";

import {
  canSeeNavEntry,
  resolveJobRoles,
  type NavViewer,
  type NavVisibilityRule,
} from "./nav-visibility";

describe("resolveJobRoles", () => {
  it("returns a single trimmed job role", () => {
    expect(resolveJobRoles({ jobRole: "store-manager" })).toEqual(["store-manager"]);
  });

  it("splits a comma-separated multi-role string and trims each entry", () => {
    expect(resolveJobRoles({ jobRole: "front-host, front-cashier ,front-server" })).toEqual([
      "front-host",
      "front-cashier",
      "front-server",
    ]);
  });

  it("falls back to position, then role, when jobRole is absent", () => {
    expect(resolveJobRoles({ position: "back-noodle" })).toEqual(["back-noodle"]);
    expect(resolveJobRoles({ role: "holding" })).toEqual(["holding"]);
  });

  it("prefers jobRole over position and role", () => {
    const viewer: NavViewer = {
      jobRole: "regional-manager",
      position: "back-noodle",
      role: "holding",
    };

    expect(resolveJobRoles(viewer)).toEqual(["regional-manager"]);
  });

  it("returns an empty array when nothing is set or only blanks are present", () => {
    expect(resolveJobRoles({})).toEqual([]);
    expect(resolveJobRoles({ jobRole: "" })).toEqual([]);
    expect(resolveJobRoles({ jobRole: " , , " })).toEqual([]);
    expect(resolveJobRoles({ jobRole: null, position: null, role: null })).toEqual([]);
  });
});

describe("canSeeNavEntry", () => {
  it("is visible when no rule is provided", () => {
    expect(canSeeNavEntry({ jobRole: "back-noodle" }, undefined)).toBe(true);
  });

  it("is visible when the rule declares neither job-role nor permission limits", () => {
    expect(canSeeNavEntry({ jobRole: "back-noodle" }, {})).toBe(true);
    // An unknown viewer still sees an unrestricted entry.
    expect(canSeeNavEntry(null, {})).toBe(true);
  });

  it("grants access when a viewer job role matches the rule", () => {
    const rule: NavVisibilityRule = {
      visibleForJobRoles: ["holding", "regional-manager"],
    };

    expect(canSeeNavEntry({ jobRole: "regional-manager" }, rule)).toBe(true);
  });

  it("denies access when the viewer job role is not in a job-role-only rule", () => {
    const rule: NavVisibilityRule = { visibleForJobRoles: ["holding"] };

    expect(canSeeNavEntry({ jobRole: "front-server" }, rule)).toBe(false);
  });

  it("grants access when the viewer holds a required permission", () => {
    const rule: NavVisibilityRule = { requiredPermission: "inventory.manage" };

    expect(canSeeNavEntry({ permissions: ["inventory.manage"] }, rule)).toBe(true);
  });

  it("treats requiredPermission and visibleForPermissions as one OR set", () => {
    const rule: NavVisibilityRule = {
      requiredPermission: "inventory.manage",
      visibleForPermissions: ["inventory.view"],
    };

    expect(canSeeNavEntry({ permissions: ["inventory.view"] }, rule)).toBe(true);
  });

  it("denies access when neither job role nor permission matches", () => {
    const rule: NavVisibilityRule = {
      visibleForJobRoles: ["holding"],
      visibleForPermissions: ["inventory.manage"],
    };

    expect(canSeeNavEntry({ jobRole: "front-server", permissions: ["orders.create"] }, rule)).toBe(
      false,
    );
  });

  it("is OR logic: a permission match wins even when the job role misses", () => {
    const rule: NavVisibilityRule = {
      visibleForJobRoles: ["holding"],
      visibleForPermissions: ["inventory.manage"],
    };

    expect(
      canSeeNavEntry({ jobRole: "front-server", permissions: ["inventory.manage"] }, rule),
    ).toBe(true);
  });

  it("grants access when any of a multi-role account's roles match", () => {
    const rule: NavVisibilityRule = { visibleForJobRoles: ["front-cashier"] };

    expect(canSeeNavEntry({ jobRole: "front-host,front-cashier" }, rule)).toBe(true);
  });

  it("denies a restricted entry to an unknown (null) viewer", () => {
    expect(canSeeNavEntry(null, { visibleForJobRoles: ["holding"] })).toBe(false);
    expect(canSeeNavEntry(null, { requiredPermission: "inventory.manage" })).toBe(false);
  });
});

import { resolveNotificationEntry } from "./useNotificationNavigation";

describe("resolveNotificationEntry", () => {
  it("opens the stores module for employee registration notifications", () => {
    expect(resolveNotificationEntry("employee-registration")).toBe("stores");
  });

  it("opens recruitment requests for recruitment notifications", () => {
    expect(resolveNotificationEntry("recruitment-request")).toBe("recruitment-requests");
  });
});

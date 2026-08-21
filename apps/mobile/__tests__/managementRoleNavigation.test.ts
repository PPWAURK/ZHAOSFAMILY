import { canSeeNavEntry } from "@zhao/utils";
import { DASHBOARD_PRIMARY_NAV } from "@/features/dashboard/dashboardCopy";

describe("management role navigation", () => {
  it("shows ordering for the kitchen manager training position", () => {
    const ordersEntry = DASHBOARD_PRIMARY_NAV.find(
      entry => entry.id === "orders",
    );

    expect(ordersEntry).toBeDefined();
    expect(
      canSeeNavEntry({ jobRole: "KITCHEN_MANAGER" }, ordersEntry),
    ).toBe(true);
  });
});

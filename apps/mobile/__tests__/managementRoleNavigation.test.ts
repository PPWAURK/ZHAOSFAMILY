import { canSeeNavEntry } from "@zhao/utils";
import { DASHBOARD_PRIMARY_NAV } from "@/features/dashboard/dashboardCopy";

describe("management role navigation", () => {
  it.each(["FRONT_MANAGER", "KITCHEN_MANAGER"])(
    "shows ordering for the %s training position",
    jobRole => {
    const ordersEntry = DASHBOARD_PRIMARY_NAV.find(
      entry => entry.id === "orders",
    );

    expect(ordersEntry).toBeDefined();
      expect(canSeeNavEntry({ jobRole }, ordersEntry)).toBe(true);
    },
  );
});

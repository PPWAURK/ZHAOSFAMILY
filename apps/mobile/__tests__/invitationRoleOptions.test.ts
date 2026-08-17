import { DASHBOARD_MORE_NAV_GROUPS } from "@/features/dashboard/dashboardCopy";
import { getStoreManagerInvitationRoleOptions } from "@/features/stores/invitationRoleOptions";

describe("store manager invitation roles", () => {
  it("includes permitted built-in and operational custom positions only", () => {
    const options = getStoreManagerInvitationRoleOptions("zh", [
      {
        code: "BOH",
        name: { zh: "后厨", en: "Kitchen", fr: "Cuisine" },
        isActive: true,
        children: [
          {
            code: "PREP",
            name: { zh: "备菜", en: "Prep", fr: "Préparation" },
            isActive: true,
            children: [],
          },
        ],
      },
      {
        code: "SM",
        name: { zh: "店长", en: "Store manager", fr: "Gérant" },
        isActive: true,
        children: [
          {
            code: "SHIFT_LEAD",
            name: { zh: "值班主管", en: "Shift lead", fr: "Chef de quart" },
            isActive: true,
            children: [],
          },
        ],
      },
    ]);

    expect(options.map((option) => option.value)).toEqual(
      expect.arrayContaining(["front-server", "PREP"]),
    );
    expect(options.map((option) => option.value)).not.toEqual(
      expect.arrayContaining(["store-manager", "SHIFT_LEAD"]),
    );
  });

  it("declares the invitation menu entry for store managers only", () => {
    const invitationItem = DASHBOARD_MORE_NAV_GROUPS.flatMap(
      (group) => group.items,
    ).find((item) => item.id === "invite-partner");

    expect(invitationItem?.visibleForJobRoles).toEqual(["store-manager"]);
  });
});

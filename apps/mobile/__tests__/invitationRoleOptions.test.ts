import { DASHBOARD_MORE_NAV_GROUPS } from "@/features/dashboard/dashboardCopy";
import { getStoreManagerInvitationRoleOptions } from "@/features/stores/invitationRoleOptions";

describe("store manager invitation roles", () => {
  it("includes every active operational position below the store roots", () => {
    const options = getStoreManagerInvitationRoleOptions("zh", [
      {
        code: "FRONT_OF_HOUSE",
        name: { zh: "前厅", en: "Front of House", fr: "Salle" },
        isActive: true,
        children: [
          {
            code: "FRONT_MANAGER",
            name: { zh: "前厅经理", en: "Front Manager", fr: "Salle Manager" },
            isActive: true,
            children: [
              {
                code: "FRONT_HOST",
                name: { zh: "接待", en: "Host", fr: "Accueil" },
                isActive: true,
                children: [],
              },
            ],
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
      expect.arrayContaining(["FRONT_MANAGER", "FRONT_HOST"]),
    );
    expect(options.map((option) => option.value)).not.toEqual(
      expect.arrayContaining(["FRONT_OF_HOUSE", "SHIFT_LEAD"]),
    );
  });

  it("declares the invitation menu entry for store managers only", () => {
    const invitationItem = DASHBOARD_MORE_NAV_GROUPS.flatMap(
      (group) => group.items,
    ).find((item) => item.id === "invite-partner");

    expect(invitationItem?.visibleForJobRoles).toEqual(["store-manager"]);
  });
});

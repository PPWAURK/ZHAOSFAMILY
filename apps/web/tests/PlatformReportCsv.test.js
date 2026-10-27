import { buildStoreUsageCsv } from "@/features/dashboard/utils/platformReportCsv";

test("sorts module columns by name in the store usage report", () => {
  const csv = buildStoreUsageCsv("2026-10", [
    {
      restaurantId: 1,
      storeCode: 1,
      restaurantName: "Paris",
      approvedUsers: 1,
      activeUsers: 1,
      activityRate: 100,
      moduleOpens: 3,
      expectedReads: 0,
      confirmedReads: 0,
      readRate: null,
      moduleUsage: [
        { moduleName: "Training", opens: 2, uniqueUsers: 1 },
        { moduleName: "Dashboard", opens: 1, uniqueUsers: 1 },
      ],
      employeeUsage: [],
    },
  ]);

  expect(csv.indexOf("module_opens:Dashboard")).toBeLessThan(
    csv.indexOf("module_opens:Training"),
  );
});

import { USAGE_MODULES } from './analytics.types';
import type {
  ModuleUsage,
  EmployeeMonthlyUsage,
  NewsStoreReadRow,
  PlatformMonthlyReport,
  PlatformUsageSummary,
  StoreMonthlyUsage,
  UsageModule,
} from './analytics.types';
import type { PlatformMonthRange } from './platform-month-range';

type RestaurantRow = { id: number; storeCode: number; name: string };
type ApprovedUserRow = { id: number; name: string; restaurantId: number };
type UsageEventRow = {
  userId: number;
  restaurantId: number;
  moduleName: string;
};
type PostRow = { id: number; title: string; category: string; createdAt: Date };
type ReceiptRow = {
  postId: number;
  userId: number;
  restaurantId: number;
  readAt: Date | null;
};

export type PlatformReportRows = {
  restaurants: RestaurantRow[];
  approvedUsers: ApprovedUserRow[];
  events: UsageEventRow[];
  posts: PostRow[];
  receipts: ReceiptRow[];
};

type UsageTotals = {
  users: Set<number>;
  moduleOpens: number;
  modules: Map<UsageModule, { opens: number; users: Set<number> }>;
};
type ReadTotals = { expectedReads: number; confirmedReads: number };

function createUsageTotals(): UsageTotals {
  return { users: new Set(), moduleOpens: 0, modules: new Map() };
}

function createReadTotals(): ReadTotals {
  return { expectedReads: 0, confirmedReads: 0 };
}

function calculateRate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100);
}

function isUsageModule(value: string): value is UsageModule {
  return (USAGE_MODULES as readonly string[]).includes(value);
}

function countApprovedUsers(users: ApprovedUserRow[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const user of users) {
    counts.set(user.restaurantId, (counts.get(user.restaurantId) ?? 0) + 1);
  }
  return counts;
}

function buildEmployeeRows(
  employees: ApprovedUserRow[],
  restaurantId: number,
  events: UsageEventRow[],
  receipts: ReceiptRow[],
): EmployeeMonthlyUsage[] {
  return employees
    .filter((employee) => employee.restaurantId === restaurantId)
    .map((employee) => {
      const employeeEvents = events.filter(
        (event) =>
          event.userId === employee.id && event.restaurantId === restaurantId,
      );
      const employeeReceipts = receipts.filter(
        (receipt) =>
          receipt.userId === employee.id &&
          receipt.restaurantId === restaurantId,
      );
      const moduleTotals = new Map<UsageModule, number>();
      for (const event of employeeEvents) {
        if (isUsageModule(event.moduleName)) {
          moduleTotals.set(
            event.moduleName,
            (moduleTotals.get(event.moduleName) ?? 0) + 1,
          );
        }
      }
      const confirmedReads = employeeReceipts.filter(
        (receipt) => receipt.readAt,
      ).length;
      const moduleUsage = [...moduleTotals.entries()]
        .map(([moduleName, opens]) => ({ moduleName, opens, uniqueUsers: 1 }))
        .sort(
          (left, right) =>
            right.opens - left.opens ||
            left.moduleName.localeCompare(right.moduleName),
        );

      return {
        userId: employee.id,
        employeeName: employee.name,
        active: employeeEvents.length > 0,
        moduleOpens: employeeEvents.length,
        moduleUsage,
        expectedReads: employeeReceipts.length,
        confirmedReads,
        readRate: calculateRate(confirmedReads, employeeReceipts.length),
      };
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

function collectUsage(events: UsageEventRow[]): Map<number, UsageTotals> {
  const byStore = new Map<number, UsageTotals>();
  for (const event of events) {
    const totals = byStore.get(event.restaurantId) ?? createUsageTotals();
    totals.users.add(event.userId);
    totals.moduleOpens += 1;

    if (isUsageModule(event.moduleName)) {
      const module = totals.modules.get(event.moduleName) ?? {
        opens: 0,
        users: new Set<number>(),
      };
      module.opens += 1;
      module.users.add(event.userId);
      totals.modules.set(event.moduleName, module);
    }

    byStore.set(event.restaurantId, totals);
  }
  return byStore;
}

function collectReads(receipts: ReceiptRow[]): {
  byStore: Map<number, ReadTotals>;
  byPostAndStore: Map<string, ReadTotals>;
} {
  const byStore = new Map<number, ReadTotals>();
  const byPostAndStore = new Map<string, ReadTotals>();

  for (const receipt of receipts) {
    const key = `${receipt.postId}:${receipt.restaurantId}`;
    const store = byStore.get(receipt.restaurantId) ?? createReadTotals();
    const post = byPostAndStore.get(key) ?? createReadTotals();
    store.expectedReads += 1;
    post.expectedReads += 1;
    if (receipt.readAt) {
      store.confirmedReads += 1;
      post.confirmedReads += 1;
    }
    byStore.set(receipt.restaurantId, store);
    byPostAndStore.set(key, post);
  }

  return { byStore, byPostAndStore };
}

function formatModuleUsage(totals: UsageTotals): ModuleUsage[] {
  return [...totals.modules.entries()]
    .map(([moduleName, usage]) => ({
      moduleName,
      opens: usage.opens,
      uniqueUsers: usage.users.size,
    }))
    .sort(
      (left, right) =>
        right.opens - left.opens ||
        left.moduleName.localeCompare(right.moduleName),
    );
}

function buildStoreRows(
  restaurants: RestaurantRow[],
  approvedCounts: Map<number, number>,
  usageByStore: Map<number, UsageTotals>,
  readsByStore: Map<number, ReadTotals>,
  employees: ApprovedUserRow[],
  events: UsageEventRow[],
  receipts: ReceiptRow[],
): StoreMonthlyUsage[] {
  return restaurants.map((restaurant) => {
    const usage = usageByStore.get(restaurant.id) ?? createUsageTotals();
    const reads = readsByStore.get(restaurant.id) ?? createReadTotals();
    const approvedUsers = approvedCounts.get(restaurant.id) ?? 0;
    return {
      restaurantId: restaurant.id,
      storeCode: restaurant.storeCode,
      restaurantName: restaurant.name,
      approvedUsers,
      activeUsers: usage.users.size,
      activityRate: calculateRate(usage.users.size, approvedUsers),
      moduleOpens: usage.moduleOpens,
      moduleUsage: formatModuleUsage(usage),
      employeeUsage: buildEmployeeRows(
        employees,
        restaurant.id,
        events,
        receipts,
      ),
      ...reads,
      readRate: calculateRate(reads.confirmedReads, reads.expectedReads),
    };
  });
}

function buildNewsRows(
  posts: PostRow[],
  restaurants: RestaurantRow[],
  readsByPostAndStore: Map<string, ReadTotals>,
): NewsStoreReadRow[] {
  return posts.flatMap((post) =>
    restaurants.map((restaurant) => {
      const reads =
        readsByPostAndStore.get(`${post.id}:${restaurant.id}`) ??
        createReadTotals();
      return {
        postId: post.id,
        title: post.title,
        category: post.category,
        publishedAt: post.createdAt.toISOString(),
        restaurantId: restaurant.id,
        storeCode: restaurant.storeCode,
        restaurantName: restaurant.name,
        ...reads,
        readRate: calculateRate(reads.confirmedReads, reads.expectedReads),
      };
    }),
  );
}

function buildSummary(
  rows: PlatformReportRows,
  stores: StoreMonthlyUsage[],
): PlatformUsageSummary {
  const activeUsers = new Set(rows.events.map((event) => event.userId)).size;
  const approvedUsers = rows.approvedUsers.length;
  const reads = stores.reduce(
    (totals, store) => ({
      expectedReads: totals.expectedReads + store.expectedReads,
      confirmedReads: totals.confirmedReads + store.confirmedReads,
    }),
    createReadTotals(),
  );

  return {
    approvedUsers,
    activeUsers,
    activityRate: calculateRate(activeUsers, approvedUsers),
    moduleOpens: rows.events.length,
    ...reads,
    readRate: calculateRate(reads.confirmedReads, reads.expectedReads),
  };
}

export function buildPlatformMonthlyReport(
  range: PlatformMonthRange,
  rows: PlatformReportRows,
): PlatformMonthlyReport {
  const usageByStore = collectUsage(rows.events);
  const reads = collectReads(rows.receipts);
  const stores = buildStoreRows(
    rows.restaurants,
    countApprovedUsers(rows.approvedUsers),
    usageByStore,
    reads.byStore,
    rows.approvedUsers,
    rows.events,
    rows.receipts,
  );

  return {
    month: range.month,
    startsAt: range.startsAt.toISOString(),
    endsAt: range.endsAt.toISOString(),
    summary: buildSummary(rows, stores),
    stores,
    newsByStore: buildNewsRows(
      rows.posts,
      rows.restaurants,
      reads.byPostAndStore,
    ),
  };
}

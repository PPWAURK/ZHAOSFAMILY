import {
  PLATFORM_MODULE_LABELS,
  PLATFORM_REPORT_COPY,
  type ReportLanguage,
} from "@/features/dashboard/constants/platform-report-copy";
import type { EmployeeUsage, NewsStoreRead, StoreUsage } from "@/features/dashboard/services/platformReportApi";
import { formatReportDate, formatReportRate } from "@/features/dashboard/utils/platformReportFormat";
import styles from "@/features/dashboard/platform-report-page.module.css";

type ReportCopy = (typeof PLATFORM_REPORT_COPY)[ReportLanguage];

export function StoreUsageTable({
  stores,
  lang,
  copy,
  onSelectStore,
}: {
  stores: StoreUsage[];
  lang: ReportLanguage;
  copy: ReportCopy;
  onSelectStore: (restaurantId: number) => void;
}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead><tr>
          <th scope="col">{copy.establishment}</th>
          <th scope="col">{copy.currentStaff}</th>
          <th scope="col">{copy.activeUsers}</th>
          <th scope="col">{copy.activityRate}</th>
          <th scope="col">{copy.moduleOpens}</th>
          <th scope="col">{copy.confirmed} / {copy.recipients}</th>
          <th scope="col">{copy.readRate}</th>
        </tr></thead>
        <tbody>{stores.map((store) => (
          <tr key={store.restaurantId}>
            <th scope="row">
              <button
                type="button"
                className={styles.storeDetailsButton}
                onClick={() => onSelectStore(store.restaurantId)}
                aria-label={`${copy.viewDetails}: ${store.restaurantName}`}
              >
                {store.restaurantName}
                <span aria-hidden="true">{copy.viewDetails} →</span>
              </button>
            </th>
            <td>{store.approvedUsers}</td>
            <td>{store.activeUsers}</td>
            <td>{formatReportRate(store.activityRate)}</td>
            <td>
              {store.moduleOpens}
              {store.moduleUsage.length > 0 ? (
                <details className={styles.moduleDetails}>
                  <summary>{copy.moduleDetails}</summary>
                  <ul>{store.moduleUsage.map((item) => (
                    <li key={item.moduleName}>
                      {PLATFORM_MODULE_LABELS[lang][item.moduleName] ?? item.moduleName}: {item.opens}
                    </li>
                  ))}</ul>
                </details>
              ) : null}
            </td>
            <td>{store.confirmedReads} / {store.expectedReads}</td>
            <td>{formatReportRate(store.readRate)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function NewsReadsTable({
  rows,
  lang,
  copy,
}: {
  rows: NewsStoreRead[];
  lang: ReportLanguage;
  copy: ReportCopy;
}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead><tr>
          <th scope="col">{copy.establishment}</th>
          <th scope="col">{copy.news}</th>
          <th scope="col">{copy.published}</th>
          <th scope="col">{copy.confirmed} / {copy.recipients}</th>
          <th scope="col">{copy.readRate}</th>
        </tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={`${row.postId}:${row.restaurantId}`}>
            <th scope="row">{row.restaurantName}</th>
            <td>{row.title}</td>
            <td>{formatReportDate(row.publishedAt, lang)}</td>
            <td>{row.confirmedReads} / {row.expectedReads}</td>
            <td>{formatReportRate(row.readRate)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function EmployeeUsageTable({
  employees,
  lang,
  copy,
}: {
  employees: EmployeeUsage[];
  lang: ReportLanguage;
  copy: ReportCopy;
}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead><tr>
          <th scope="col">{copy.employee}</th>
          <th scope="col">{copy.activityStatus}</th>
          <th scope="col">{copy.moduleOpens}</th>
          <th scope="col">{copy.modulesUsed}</th>
          <th scope="col">{copy.confirmed} / {copy.recipients}</th>
          <th scope="col">{copy.readRate}</th>
        </tr></thead>
        <tbody>{employees.map((employee) => (
          <tr key={employee.userId}>
            <th scope="row">{employee.employeeName}</th>
            <td>{employee.active ? copy.active : copy.inactive}</td>
            <td>{employee.moduleOpens}</td>
            <td className={styles.employeeModules}>
              {employee.moduleUsage.length === 0
                ? "—"
                : employee.moduleUsage.map((module) =>
                  `${PLATFORM_MODULE_LABELS[lang][module.moduleName] ?? module.moduleName}: ${module.opens}`,
                ).join(", ")}
            </td>
            <td>{employee.confirmedReads} / {employee.expectedReads}</td>
            <td>{formatReportRate(employee.readRate)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

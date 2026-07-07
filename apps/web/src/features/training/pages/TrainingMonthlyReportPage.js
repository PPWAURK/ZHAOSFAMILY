"use client";

import { useEffect, useMemo, useState } from "react";

import TrainingLayout from "@/features/training/components/TrainingLayout";
import { fetchTrainingMonthlyReport } from "@/features/training/services/trainingMediaApi";

const REPORT_COPY = {
  zh: {
    shared: {
      topFamily: "FAMILY",
      topCycle: "2026",
      backHome: "返回首页",
      footer: "ZHAO · Training report",
    },
    page: {
      topStage: "培训月报 · MONTHLY",
      kicker: "ZHAO's · 培训 · 月报 · 管理",
      title: "培训",
      titleEm: "月报",
      titleSuffix: "。",
      lede: "按月份查看门店培训完成、测验通过和徽章发放情况。",
    },
  },
  en: {
    shared: {
      topFamily: "FAMILY",
      topCycle: "2026",
      backHome: "Back home",
      footer: "ZHAO · Training report",
    },
    page: {
      topStage: "Training report · MONTHLY",
      kicker: "ZHAO's · Training · Monthly · Management",
      title: "Training",
      titleEm: " report",
      titleSuffix: ".",
      lede: "Monthly view of training completion, quiz results, and badge awards.",
    },
  },
  fr: {
    shared: {
      topFamily: "FAMILY",
      topCycle: "2026",
      backHome: "Retour",
      footer: "ZHAO · Rapport formation",
    },
    page: {
      topStage: "Rapport formation · MONTHLY",
      kicker: "ZHAO's · Formation · Mensuel · Management",
      title: "Rapport",
      titleEm: " formation",
      titleSuffix: ".",
      lede: "Vue mensuelle des formations, quiz et badges.",
    },
  },
};

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("zh-CN");
}

function formatScore(value) {
  return typeof value === "number" ? `${value}` : "-";
}

function buildStoreOptions(report) {
  if (!report) return [];

  return report.stores.map((store) => ({
    id: store.restaurantId,
    name: store.restaurantName,
  }));
}

export default function TrainingMonthlyReportPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [restaurantId, setRestaurantId] = useState("all");
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextReport = await fetchTrainingMonthlyReport({
          month,
          restaurantId: restaurantId === "all" ? undefined : restaurantId,
        });
        if (isActive) setReport(nextReport);
      } catch (error) {
        if (isActive) {
          setReport(null);
          setErrorMessage(error.message || "培训月报加载失败");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      isActive = false;
    };
  }, [month, restaurantId]);

  const storeOptions = useMemo(() => buildStoreOptions(report), [report]);

  return (
    <TrainingLayout pageCopy={REPORT_COPY}>
      {({ styles }) => (
        <>
          <section className={styles.pageHeaderCard}>
            <div>
              <p className={styles.pageStep}>
                <span className={styles.stepBadge}>MONTHLY</span>
                <span>{report?.scope?.restaurantName ?? "培训月报"}</span>
              </p>
            </div>
            <div className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>
                  {report?.summary?.averageCompletionPercent ?? 0}%
                </p>
                <p className={styles.metricLabel}>AVERAGE</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>
                  {report?.summary?.quizPassRate ?? 0}%
                </p>
                <p className={styles.metricLabel}>QUIZ PASS</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>
                  {report?.summary?.newBadgeCount ?? 0}
                </p>
                <p className={styles.metricLabel}>BADGES</p>
              </article>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionBar}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionCounter}>01</span>
                <span>筛选</span>
                <span className={styles.sectionTitleEn}>REPORT FILTERS</span>
              </h2>
              <div className={styles.filterButtons}>
                <input
                  className={styles.positionSearch}
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                />
                <select
                  className={styles.positionSearch}
                  value={restaurantId}
                  onChange={(event) => setRestaurantId(event.target.value)}
                >
                  <option value="all">全部门店</option>
                  {storeOptions.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMessage ? (
              <div className={styles.materialEmpty}>
                培训月报暂时不可用：{errorMessage}
              </div>
            ) : isLoading ? (
              <div className={styles.materialEmpty}>正在加载培训月报...</div>
            ) : report ? (
              <>
                <div className={styles.storeProgressSummary}>
                  <span>
                    {formatDate(report.range.from)} - {formatDate(report.range.to)}
                  </span>
                  <strong>{report.summary.employeeCount} 人</strong>
                  <span>
                    {report.summary.completedEmployeeCount} 人完成全部必修 ·
                    本月发放 {report.summary.newBadgeCount} 枚徽章
                  </span>
                </div>

                <div className={styles.storeProgressTableWrap}>
                  <table className={styles.storeProgressTable}>
                    <thead>
                      <tr>
                        <th>门店</th>
                        <th>员工</th>
                        <th>平均完成率</th>
                        <th>本月完成资料</th>
                        <th>测验通过率</th>
                        <th>平均最高分</th>
                        <th>新徽章</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.stores.map((store) => (
                        <tr key={store.restaurantId}>
                          <td>
                            <strong>{store.restaurantName}</strong>
                          </td>
                          <td>{store.employeeCount}</td>
                          <td>{store.averageCompletionPercent}%</td>
                          <td>{store.completedThisMonth}</td>
                          <td>{store.quizPassRate}%</td>
                          <td>{formatScore(store.averageBestScore)}</td>
                          <td>{store.newBadgeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </section>

          {report ? (
            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>02</span>
                  <span>员工明细</span>
                  <span className={styles.sectionTitleEn}>EMPLOYEES</span>
                </h2>
              </div>
              <div className={styles.storeProgressTableWrap}>
                <table className={styles.storeProgressTable}>
                  <thead>
                    <tr>
                      <th>员工</th>
                      <th>门店</th>
                      <th>必修完成</th>
                      <th>本月完成</th>
                      <th>测验</th>
                      <th>最高分</th>
                      <th>徽章</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.users.map((employee) => (
                      <tr key={employee.userId}>
                        <td>
                          <strong>{employee.name}</strong>
                          <span>{employee.email}</span>
                        </td>
                        <td>{employee.restaurant.name}</td>
                        <td>
                          {employee.requiredCompleted}/{employee.requiredTotal} ·
                          {employee.completionPercent}%
                        </td>
                        <td>{employee.completedThisMonth}</td>
                        <td>
                          {employee.quizPassedCount}/{employee.quizAttemptCount} ·
                          {employee.quizPassRate}%
                        </td>
                        <td>{formatScore(employee.averageBestScore)}</td>
                        <td>
                          {employee.newBadgeCount > 0
                            ? employee.badges.map((badge) => badge.name.zh).join("、")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </TrainingLayout>
  );
}

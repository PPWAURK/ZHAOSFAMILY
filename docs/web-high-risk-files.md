# Web App — 高风险文件清单

> 基于 `apps/web/` 的全量静态分析生成。高保真修改前请先读此清单。

---

## 超限文件（AGENTS.md 硬限制 500 行/文件）

### 样式文件

| 文件 | 行数 | 超限倍数 | 风险等级 | 说明 |
|------|------|---------|---------|------|
| `src/features/training/training-page.module.css` | **2,647** | **5.3×** | 🟠 中 | 培训全部子页面共用单一样式文件，无拆分 |
| `src/features/dashboard/dashboard-page.module.css` | **2,046** | **4.1×** | 🟠 中 | 仪表盘 + 新闻台 + 侧边栏 + 积分榜共用 |
| `src/features/orders/new-order-page.module.css` | **1,572** | **3.1×** | 🟠 中 | 下单向导全流程样式 |
| `src/features/order-history/order-history-page.module.css` | **887** | **1.8×** | 🟢 低 | 历史订单 + 退货弹窗 + PDF 预览 |
| `src/features/inventory/inventory-page.module.css` | **665** | **1.3×** | 🟢 低 | 库存表格 + 出入库表单 |
| `src/features/dashboard/components/store-score-leaderboard.module.css` | **601** | **1.2×** | 🟢 低 | 积分榜 podium + 排名列表 |
| `src/features/order-history/order-stats-page.module.css` | **525** | **1.1×** | 🟢 低 | 统计页筛选 + 表格 |
| `src/features/auth/auth-page.module.css` | **1,466** | **2.9×** | 🟠 中 | 包含未定义 CSS 变量 + 废弃 typewriter 类 |

### JS/TSX 文件

| 文件 | 行数 | 超限倍数 | 风险等级 | 主要原因 |
|------|------|---------|---------|---------|
| `src/features/dashboard/components/DashboardNewsModule.js` | **1,113** | **2.2×** | 🔴 极高 | 新闻台分类、发布编辑器（Markdown 自解析）、读者弹窗、通知覆盖、删除全揉在一个组件 |
| `src/features/training/components/QuizManagerModal.js` | **791** | **1.6×** | 🟠 高 | Quiz 管理弹窗 + SSE 流式 AI 出题 + `QuestionEditor` 子组件未独立 |
| `src/features/training/pages/TrainingTitleAssignmentPage.js` | **766** | **1.5×** | 🟠 高 | 头衔 CRUD + 授予/撤销 + 接受者搜索 + 150+ 行 inline copy |
| `src/features/orders/pages/NewOrderPage.js` | **693** | **1.4×** | 🟠 高 | 四步下单向导 + 编辑模式 + PDF 分享全 inline |
| `src/features/order-history/pages/OrderHistoryPage.js` | **655** | **1.3×** | 🟠 中 | 订单列表 + 退货创建 + PDF 预览 |
| `src/features/order-history/pages/OrderStatsPage.js` | **650** | **1.3×** | 🟠 中 | 统计页 + CSV 导出 + 自定义 StoreSelect |
| `src/features/training/pages/TrainingMaterialsPage.js` | **632** | **1.3×** | 🟠 中 | 材料库 + 行内编辑 + Quiz 管理弹窗 |
| `src/features/training/pages/TrainingPositionsPage.js` | **584** | **1.2×** | 🟡 中 | 职位 CRUD + JobRolePositionPanel 内嵌 |
| `src/features/auth/components/GlassAuthPanel.js` | **547** | **1.1×** | 🟡 中 | 多步注册面板 + 7 个内联工具函数 + Base64 头像转换 |
| `src/features/training/components/JobRolePositionPanel.js` | **545** | **1.1×** | 🟡 中 | 角色-职位映射面板 + 110 行 inline copy |
| `src/features/training/pages/TrainingCertificationsPage.js` | **531** | **1.1×** | 🟡 中 | 徽章展示 + 管理绑定双职责 |

---

## 功能逻辑风险

| 文件 | 位置 | 风险 | 说明 |
|------|------|------|------|
| `src/features/training/pages/TrainingSpacePage.js` | **~L180** | 🔴 按钮无响应 | "立即继续" button 无 `onClick` 也无 `href`，点击无任何反应 |
| `src/features/training/pages/TrainingCoursePage.js` | **~L173** | 🔴 链接错误 | "Start course" 按钮跳到 `/dashboard/training` 而非 `/dashboard/training/materials/player?id=...` |
| `src/features/training/utils/trainingPositions.js` | **L182-189** | 🟠 匹配过于宽泛 | `role.includes("manager")` 可误匹配未来 "assistant-manager" 等角色 |
| `src/features/auth/auth-page.module.css` | **L1234, 1238** | 🟠 CSS 动画无效 | `--asset-opacity` 在 `@keyframes floatAssetDown` 中引用但从未在 `.floatingAsset` 上定义 |
| `src/features/training/pages/TrainingSpacePage.js` | **~L173** | 🟡 引导静态 | onboarding banner 内容静态非动态，建议始终相同 |

---

## 死代码 / 疑似死代码

| 文件 | 内容 | 行数 | 风险 |
|------|------|------|------|
| `src/features/auth/services/authApi.ts` | 整个文件 — 定义 `registerUser` 但 AuthContext 直接调 `apiClient.post`，无任何文件引用 | 10 | 🔴 确认可删 |
| `src/features/orders/components/StepStore.js` | 完整实现的门店选择组件，但 `NewOrderPage.js` 从未渲染它 | 71 | 🟠 确认可删 |
| `src/features/orders/constants/orders-copy.js` | `MOCK_SUPPLIERS` + `MOCK_PRODUCTS` 119 行，无任何组件引用 | 119 | 🟠 确认可删 |
| `src/features/order-history/constants/order-history-copy.js` | `MOCK_ORDER_HISTORY` 119 行，无任何组件引用 | 119 | 🟠 确认可删 |
| `src/features/auth/constants/auth-ui.js` | `PHRASES`/`EMAIL_REGEX`/`INITIAL_LOGIN_DATA`/`INITIAL_REGISTER_DATA`/`PASSWORD_STRENGTH_TONES` — 5 个导出从未被任何文件 import | 30 (中 5 项) | 🟠 确认可删 |
| `src/features/auth/auth-page.module.css` | `.typeHead`/`.typeText`/`.typeCursor` 类和 `.blink` keyframes — 无对应 JSX 组件 | ~30 行 CSS | 🟡 废弃样式 |
| `src/shared/api/api-client.ts` | 第二个 API client 实现，与 `apiClient.ts` 并存，多数 feature 引用 `apiClient.ts` | ~60 | 🟡 需确认是迁移目标还是残留 |
| `src/features/abc-scores/pages/AbcScoresPage.js` | import `ExpansionPanel` 但从未在 JSX 中使用 | 1 import | 🟢 无影响 |
| `src/types/trainingBadge.ts` | `BadgeStatus` 含 `"completed"` 但 `calculateTrainingBadgeStatus` 永远产出 `"certified"` | 1 type value | 🟢 类型死值 |
| `src/features/titles/pages/TitleSystemDemoPage.tsx` | Demo 展示页，硬编码 61 头衔，与 training 头衔系统互不关联 | 112 | 🟡 独立体系，易混淆 |

---

## 架构耦合风险

| 问题 | 涉及文件 | 风险 |
|------|---------|------|
| `shared/api/` 下两个 API client | `apiClient.ts` (80 行) + `api-client.ts` (60 行) | 🟠 需决策哪个是标准 |
| `screen-security` 不用 `@zhao/api` 工厂 | `ScreenSecurityPage.js` 裸用 `apiClient` | 🟡 模式不一致 |
| `PermissionsPage.js` 依赖 Training | import `TrainingLayout` from `@/features/training/components/TrainingLayout` | 🟡 反依赖（permissions 依赖 training） |
| `auth/storesApi.ts` 依赖 stores | re-exports from `@/features/stores/services/restaurantsApi` | 🟢 低风险 |
| 各 feature page 均依赖 dashboard 侧边栏 | 全部 import `Sidebar` from `@/features/dashboard/components/Sidebar` | 🟢 可接受 |
| 部分 feature page 依赖 dashboard 常量 | import `DASHBOARD_LANGUAGES`/`DASHBOARD_MENU_LABELS` | 🟢 可接受 |

---

## 弱类型区域

| 文件 | 类型 | 风险 |
|------|------|------|
| `src/features/orders/types/order.ts` | `PurchaseOrder = Record<string, unknown> & { ... }` — 字段访问无类型检查 | 🟠 字段变更不报错 |
| `src/features/orders/types/order.ts` | `PurchaseReturn = Record<string, unknown>` — 完全无类型 | 🟠 |
| `src/features/orders/types/order.ts` | `CreatePurchaseReturnInput = Record<string, unknown>` — 完全无类型 | 🟠 |
| `src/features/training/types/training.ts` | `TrainingCourse`/`TrainingMaterial`/`TrainingProgress`/`TrainingPlan` 等核心类型含 `[key: string]: unknown` | 🟡 index signature 削弱类型安全 |
| `src/features/screen-security/services/screenSecurityApi.ts` | 不返回明确类型 | 🟢 |

---

## 无 barrel/index 导出的 feature

| 目录 | 影响 |
|------|------|
| `abc-scores/` | ❌ 无 index.ts |
| `auth/` | ❌ 无 index.ts |
| `case-shares/` | ❌ 无 index.ts |
| `dashboard/` | ❌ 无 index.ts |
| `inventory/` | ❌ 无 index.ts |
| `order-history/` | ❌ 无 index.ts |
| `orders/` | ❌ 无 index.ts |
| `permissions/` | ❌ 无 index.ts |
| `profile/` | ❌ 无 index.ts |
| `recruitment-requests/` | ❌ 无 index.ts |
| `screen-security/` | ❌ 无 index.ts |
| `stores/` | ❌ 无 index.ts |
| `training/` | ❌ 无 index.ts |
| ✅ `suppliers/` | ✅ **唯一有 barrel export 的 feature** |
| ✅ `components/titles/` | ✅ 有 barrel export |
| ✅ `components/training-badges/` | ✅ 有 barrel export |

---

## 零测试的功能（全 web app）

| 功能 | 测试文件 |
|------|---------|
| 全部 15 个 feature | ❌ 无 |
| 全部 shared 组件 | ❌ 无 |
| 全部 titles/badges 组件 | ❌ 无 |
| `trainingBadgeRules.ts`（纯逻辑函数） | ❌ 无 |

**web app 零测试。**

---

## 样式超限汇总

| 文件 | 行数 | 超限倍数 |
|------|------|---------|
| `training-page.module.css` | 2,647 | 5.3× |
| `dashboard-page.module.css` | 2,046 | 4.1× |
| `new-order-page.module.css` | 1,572 | 3.1× |
| `auth-page.module.css` | 1,466 | 2.9× |
| `order-history-page.module.css` | 887 | 1.8× |
| `inventory-page.module.css` | 665 | 1.3× |
| `store-score-leaderboard.module.css` | 601 | 1.2× |
| `order-stats-page.module.css` | 525 | 1.1× |

---

> 生成日期：2026-07-07
> 生成方式：全量静态代码分析

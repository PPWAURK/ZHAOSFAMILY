# Mobile App — 高风险文件清单

> 基于 `apps/mobile/` 的全量静态分析生成。高保真修改前请先读此清单。

---

## 超限文件（AGENTS.md 硬限制 500 行/文件）

| 文件 | 行数 | 超限倍数 | 风险等级 | 主要原因 |
|------|------|---------|---------|---------|
| `src/features/dashboard/DashboardHomeScreen.tsx` | **1,936** | **3.9×** | 🔴 极高 | God Screen：新闻台 + 抽屉 + 导航 + 积分榜 + 订单栏 + 语言切换全部揉在一个组件；18 个 useState，5 个 useRef/useMemo，570 行 style 内联 |
| `src/features/orders/OrderModuleScreen.tsx` | **918** | **1.8×** | 🔴 极高 | 四步状态机（编辑/确认/完成/分享）+ 双模式（新建/历史）+ 搜索/筛选/PDF 分享全 inline；17 个 useState，11+ handler inline |
| `src/features/profile/ProfileScreen.tsx` | **833** | **1.7×** | 🟠 高 | 资料编辑 + 头像上传 + 密码修改 + 语言 + 删号 + style 全在同一文件 |
| `src/features/case-shares/CaseSharesModuleScreen.tsx` | **797** | **1.6×** | 🟠 高 | Feed/我的双 Tab + 撰写弹窗 + 评论弹窗 + 点赞 + 图片上传 + 120 行 inline style |
| `src/features/training/TrainingModuleScreen.tsx` | **758** | **1.5×** | 🟠 高 | 三层地图 + 材料预览 + 测验 + 成就切换全部交织；内含 `MapLayerSection`/`MapNodeCard` 两个子组件未独立 |
| `src/features/stores/StoresModuleScreen.tsx` | **621** | **1.2×** | 🟠 中 | 列表/详情/审批/团队/统计 5 个视图揉在一个 return 里 |
| `src/features/dashboard/StoreScoreLeaderboard.tsx` | **572** | **1.1×** | 🟡 中 | 积分榜 podium + 排名列表 + 评分柱状图 + 内联 i18n；从 auth 模块 import color tokens |
| `src/features/training/TrainingGuidedPlan.tsx` | **553** | **1.1×** | 🟡 中 | 引导式旅程 + 位置分组手风琴 + 额外导出 `OptionalLibraryCard` 造成跨文件耦合 |

---

## 功能逻辑风险

| 文件 | 行号 | 风险 | 说明 |
|------|------|------|------|
| `src/features/training/trainingFlowState.ts` | **79** | 🔴 功能不完整 | `isLocked: false` 硬编码，锁机制定义了但从未触发。培训材料在引导视图永远不会被锁住 |
| `src/features/training/trainingViewer.ts` | **142-143** | 🟠 离线脆弱 | PDF 查看器从 `cdnjs.cloudflare.com` 加载 pdf.js，无网络/CDN 被墙时完全不可用 |
| `src/features/recruitment/RecruitmentModuleScreen.tsx` | **403** | 🟡 未国际化 | 删除按钮文字硬编码 `{"删除"}`，未使用 `recruitmentCopy` 的 key |
| `src/features/waiting-queue/waitingQueueApi.ts` | **export** | 🟡 未使用导出 | `cancelWaitingQueueEntry` 导出但 UI 中无"取消排队"按钮 |

---

## 架构耦合风险

| 问题 | 涉及文件 | 风险 |
|------|---------|------|
| `authControlStyles.colors` 跨模块引用 | `storeStyles`、`orderStyles`、`trainingStyles`、`StoreScoreLeaderboard`、`OrderModuleParts` 等 | 🟠 高。auth 模块的 color tokens 变更会影响 5+ 个 feature 的样式 |
| `storeStyles` 被其他模块当共享样式库引用 | `RecruitmentModuleScreen`、`CaseSharesModuleScreen`、`WaitingQueueModuleScreen` 均 `import storeStyles as styles` | 🟡 中。stores 的样式文件成了隐式公共样式库，职责泄漏 |
| `OptionalLibraryCard` 从 `TrainingGuidedPlan` 导出给 `TrainingOptionalLibrary` 用 | 两个同属 training 模块 | 🟢 低。跨文件但不跨模块 |
| `AuthLanguage` 类型跨 feature import | trainingCopy、orderCategories 等从 auth 导入类型 | 🟢 低。类型引用比 runtime 耦合安全 |

---

## 死代码 / 疑似死代码

| 文件 | 内容 | 建议 |
|------|------|------|
| `App.tsx` (根目录) | 渲染 `LoginScreen`，已被 Expo Router (`app/`) 取代 | 🟠 确认后可删除 |
| `src/styles/global.css` | `@tailwind base/components/utilities` — RN 环境无 Tailwind 处理 | 🟠 确认后可删除 |
| `src/features/dashboard/DashboardHomeScreen.tsx` | `quickSection`/`quickGrid`/`quickAction` 等 style 定义 + `DASHBOARD_COPY.quickActions` 从未渲染 | 🟡 无用代码，清理可降低文件大小 |
| `src/features/auth/authCopy.ts` | `agree` 字段 (type L38, data L201/280/359) 三语都翻译了但无组件消费 | 🟢 多余 copy 定义 |
| `src/types/title.ts` + `src/data/titleCatalog.ts` | 167 行的头衔系统类型和目录已定义但无任何 UI 消费 | 🟡 预定义但未启用，维护成本 |

---

## 无 barrel/index 导出

| 目录 | 影响 |
|------|------|
| `dashboard/` | 无 index.ts |
| `orders/` | 无 index.ts |
| `stores/` | 无 index.ts |
| `training/` | 无 index.ts |
| `profile/` | 无 index.ts |
| `case-shares/` | 无 index.ts |
| `recruitment/` | 无 index.ts |
| `waiting-queue/` | 无 index.ts |

> 各 feature 无统一导出入口，DashboardHomeScreen 直接 import 具体文件路径。不影响功能但不利于 refactor 和 tree-shaking。

---

## 零测试的功能（高风险变更区域）

| 功能 | 测试文件 | 上次测试覆盖 |
|------|---------|-------------|
| Dashboard | ❌ 无 | — |
| Orders | ❌ 无 | — |
| Stores | ❌ 无 | — |
| Profile | ❌ 无 | — |
| Case Shares | ❌ 无 | — |
| Recruitment | ❌ 无 | — |
| Waiting Queue | ❌ 无 | — |
| Auth | ❌ 无 | — |
| **Training** | ✅ `trainingFlowState.test.ts` + `trainingProgressRules.test.ts` | 14 个测试 |
| **Splash** | ✅ `SplashScreen.test.tsx` | 1 个测试 |
| **App root** | ✅ `App.test.tsx` | 1 个冒烟测试 |

---

## 超限样式文件（纯 StyleSheet，风险较低但值得关注）

| 文件 | 行数 | 备注 |
|------|------|------|
| `src/features/training/trainingStyles.ts` | **2,014** | 纯样式但超限 4×；建议按域拆分 |
| `src/features/orders/orderStyles.ts` | **468** | 接近警戒线 |
| `src/features/stores/storeStyles.ts` | **415** | 接近警戒线 |
| `src/features/auth/AuthFormControls.tsx` | **500** | 组件 + 样式合一，到极限 |
| `src/features/register/RegisterForm.tsx` | **779** | 含 4 个内部子组件（AvatarPicker/BirthdayPicker/StorePicker/RolePicker） |

---

> 生成日期：2026-07-07
> 生成方式：全量静态代码分析

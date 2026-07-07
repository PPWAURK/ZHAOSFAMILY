# 三端最靠谱修复方案

> 只做低成本高确定性的事。不拆分任何文件。

---

## 第一梯队：P0 功能缺陷（今天就能做，共 ~20 行改动）

确认没引入新问题即自动生效。

### Mobile

| 改动 | 位置 | 操作 |
|------|------|------|
| `isLocked` 硬编码修复 | `trainingFlowState.ts:79` | 将 `false` 改为 `prevCompleted` 计算 |
| CDN fallback | `trainingViewer.ts:142` | 加一行 `|| src2` fallback CDN |
| 硬编码中文 | `RecruitmentModuleScreen.tsx:403` | `{"删除"}` → `copy.delete` |

### Web

| 改动 | 位置 | 操作 |
|------|------|------|
| 按钮无 onClick | `TrainingSpacePage.js:~L180` | 补 `router.push` |
| 链接跳错 | `TrainingCoursePage.js:~L173` | 改 `href` 到 player |
| 角色匹配过宽 | `trainingPositions.js:L182` | `includes("manager")` → `Set.has()` |
| CSS 变量未定义 | `auth-page.module.css` | 补 `--asset-opacity: 1` |

### Backend

| 改动 | 位置 | 操作 |
|------|------|------|
| `$connect()` 缺失 | `prisma/prisma.service.ts` | 加 `implements OnModuleInit` + `$connect()` |
| `newTitles` 永远为空 | `training-quiz.service.ts:L213` | `newTitles: []` → 调 `titleService.evaluateForMaterial()` **或如其不存在则加 TODO + 留 `[]`（不改）** |
| AuthGuard attach user | `auth.guard.ts` + 新 `@CurrentUser()` | 见下方详细方案 |

#### AuthGuard attach user 详细方案（唯一有风险的改动）

```
步骤：
1. auth.guard.ts — 调 getCurrentUser() 后挂在 req.user
2. 新增 decorators/current-user.decorator.ts — @CurrentUser() 装饰器
3. 从 auth.controller.ts 开始，逐个 controller 替换手动 parse → @CurrentUser()
   优先改：auth.controller → notifications.controller → orders.controller → 其余
4. 每个 controller 改完立即跑测试，不要一次改 10 个

安全阀：不改也能工作，只是多一次 DB 查询。可以分 3 次 PR 做。
```

---

## 第二梯队：死代码清理（这周末前，4 个删除操作）

每个都是：`git rm` → 确认 CI 通过 → 结束。改动量 0 行代码，只有删除。

### Mobile

| 文件 | 原因 | 操作 |
|------|------|------|
| `App.tsx` | 已被 Expo Router 取代 | 删 |
| `styles/global.css` | RN 无 Tailwind | 删 |
| `authCopy.ts` 中 `agree` 字段 | 无组件消费 | 删 3 行 |

### Web

| 文件 | 原因 | 操作 |
|------|------|------|
| `auth/services/authApi.ts` | 全文件孤，无人 import | 删 |
| `orders/components/StepStore.js` | 71 行，无人渲染 | 删 |
| `orders/constants/orders-copy.js` 中 `MOCK_SUPPLIERS`/`MOCK_PRODUCTS` | 119 行死数据 | 删 |
| `order-history/constants/order-history-copy.js` 中 `MOCK_ORDER_HISTORY` | 119 行死数据 | 删 |
| `auth/constants/auth-ui.js` 中 5 个未使用 export | 无人 import | 删 |
| `auth/auth-page.module.css` 中 `.typeHead`/`.typeText`/`.typeCursor` | 无对应组件 | 删 ~30 行 CSS |

### Backend

没有安全可删除的残件。

---

## 第三梯队：补充 barrel export

只给最常用的 4 个 feature 加，不是全部。

```
src/features/dashboard/   → index.ts  export { DashboardHomeScreen }
src/features/training/    → index.ts  export { TrainingModuleScreen }
src/features/stores/      → index.ts  export { StoresModuleScreen, StoreModuleParts }
src/features/orders/      → index.ts  export { OrderModuleScreen, OrderModuleParts }
```

其他 feature 当前没有跨文件引用困扰，不加。

---

## 第四梯队：测试补充（只在动对应代码时顺带做）

| 模块 | 当前状态 | 什么时候补 |
|------|---------|-----------|
| `MailService` (513 行) | 零测试 | **只有下次改邮件逻辑时再补，不要专门补** |
| `Inventory` (223 行) | 零测试 | **只有下次改库存逻辑时再补** |
| `screenshot-event` (123 行) | 零测试 | **同上** |
| Web app 全端 | 零测试 | **无任何测试基础设施，补测试成本 >> 收益，不动** |

---

## 不做的事情清单

| 原方案中的事 | 不做原因 |
|-------------|---------|
| 拆分 1,936 行 DashboardHomeScreen | 无人动它就不拆，成本大于收益 |
| 拆分 1,548 行 orders.service.ts | 正常运行中，拆了引入循环依赖更糟 |
| 拆分 1,316 行 training.service.ts | 同上 |
| 消除 fixMojibake 等重复函数 | 提取后多一个跨模块依赖，不值得 |
| 统一三端 design token | "架构师 KPI" |
| 自实现 JWT 迁移 | 上线正常工作，无业务价值 |
| HOLDING_RESTAURANT_NAME 改 DB | 解决永远不会发生的问题 |
| 为全部 feature 加 barrel export | 当前不需要的文件不要动 |
| 专门补测试 | 只在动对应代码时顺带做 |

---

## 执行顺序

```
Phase 1（今天，30min）→ P0 功能缺陷修复
Phase 2（这周末，1h） → 死代码清理 + barrel export
Phase 3（按需）       → 动到哪块代码，补哪块测试
```

> 生成日期：2026-07-07

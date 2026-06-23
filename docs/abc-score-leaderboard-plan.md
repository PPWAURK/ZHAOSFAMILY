# ABC 评分排行榜管理后台 — 实施计划 (Phased Plan)

> 网页端新增一个「ABC 评分排行榜」管理后台入口。两个部门分别填分：
> **营销部**（依据 Google 评论 + 伙伴分享的优秀案例打分）、**营运/运营部**（填写稽核评分，并可上传评分报告媒体）。
> 页面顶部需有状态栏显示各部门填写进度（如 `营销部 2/12`）。发布排行榜前需有「模拟预览」入口。

本计划按 **Phase** 划分，每个 Phase 可在独立的新对话上下文中执行。每个任务都直接引用本仓库已存在的「样板代码」位置，要求 **复制改造**，而非凭空发明 API。

---

## 关键决策 / 假设（执行前确认；未确认则按默认值）

1. **周期 (cycle) 概念**：ABC 评分是周期性的（如每月）。采用 `cycle`（评分周期）作为聚合根，每个周期对每家门店产生「营销分 + 稽核分」。状态机：`draft`（填写中）→ `published`（已发布）。**默认**：同一时间仅一个 `draft` 周期处于「填写中」。
2. **门店全集 = `restaurants` 表中的门店**。进度分母 N = 当前周期纳入的门店数（默认取全部 `restaurants`，可后续加 `active` 过滤）。
3. **总分与 A/B/C 评级**：`total = marketingScore + operationsScore`。排名后按分位/阈值分桶为 A/B/C。**默认阈值**：按排名分位（前 1/3 = A，中 1/3 = B，后 1/3 = C），阈值集中在一处常量，便于调整。
4. **部门权限**：新增 RBAC 权限键与角色（详见 Phase 1）。营销/运营是否复用现有 job role 还是新建角色 → **默认新建角色** `marketing-admin` / `operations-admin`，并把全部权限授予 `super-admin`。
5. **媒体上传**：复用现有 `/media/upload`（返回 `objectKey`），再把 `objectKey` 关联到该周期+门店的稽核报告记录。**仅运营部**有上传入口。

> ⚠️ 这些是默认值。若用户对「周期 vs 单快照」「A/B/C 阈值」「角色复用」有不同意见，先调整 Phase 1 的 schema/权限再继续。

---

## Phase 0 — Documentation Discovery（已完成，下列为「Allowed Patterns」清单）

执行后续 Phase 时**必须**遵循以下已验证的真实模式（均来自本仓库，附 `file:line`）：

### 后端 (NestJS + Prisma)

- **模块结构样板**：`apps/backend/src/recruitment-requests/`
  - module: [recruitment-requests.module.ts](apps/backend/src/recruitment-requests/recruitment-requests.module.ts) — `imports: [AuthModule, PrismaModule]`
  - controller（瘦控制器，用 `@Headers('authorization')` + `AuthService.getCurrentUser` 取 actor）: [recruitment-requests.controller.ts](apps/backend/src/recruitment-requests/recruitment-requests.controller.ts:24-89)
  - 简单 CRUD 控制器样板（用 `ParseIntPipe`）: [restaurants.controller.ts](apps/backend/src/restaurants/restaurants.controller.ts)
- **RBAC 守卫**：`@RequirePermissions(KEY)` + `@UseGuards(PermissionGuard)`，权限键定义于 [permissions.ts](apps/backend/src/auth/permissions.ts:5-31)。`RequirePermissions` 工厂在同文件第 33 行。
- **权限/角色种子**：[seed.js](apps/backend/prisma/seed.js) — `PERMISSIONS` 数组（第 11 行起）、`ROLES` 数组（第 311 行起，`super-admin` 自动获得全部权限：`PERMISSIONS.map(p => p.key)`）、`upsertPermissions()`/`replaceRolePermissions()`（第 348/371 行）。
- **Prisma 模型**：`Restaurant` 模型 = 表 `restaurants`，字段 `id Int`、`name`、`address`、`photoUrl @map("photo_url")`，见 [schema.prisma](apps/backend/prisma/schema.prisma:136-149)。新表要 `@@map("snake_case")`，列名 `@map("snake_case")`。
- **迁移 SQL 样板**（手写 MySQL DDL + 外键）：[20260605150000_add_recruitment_requests/migration.sql](apps/backend/prisma/migrations/20260605150000_add_recruitment_requests/migration.sql) — `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`，外键 `ON DELETE RESTRICT ON UPDATE CASCADE`。
  - 新迁移命令：`pnpm --filter backend exec prisma migrate dev --name add_abc_scores`（**勿**用根 `pnpm db:migrate`，其硬编码 `--name init`）。
- **媒体上传**：`POST /media/upload`（`FileInterceptor('file')`，磁盘暂存）返回含 `objectKey` 的 `UploadedMedia`，见 [media.controller.ts](apps/backend/src/media/media.controller.ts:62-80)。文件读取 `GET /media/file?objectKey=...`。
- **DTO 约定**：`class-validator`，全局 `ValidationPipe` 开启 `whitelist + forbidNonWhitelisted` —— 未知字段会被拒绝。分开 Create/Update/Query DTO。
- **模块注册**：新模块需加入 [app.module.ts](apps/backend/src/app.module.ts) 的 `imports`。

### 共享包

- **`@zhao/api` endpoint 工厂**样板：[recruitment.ts](packages/api/src/endpoints/recruitment.ts) — `createXxxApi(apiClient)` 返回 `{ list, create, update, ... }`，用 `apiClient.get/post/patch/delete`。新文件需在 [endpoints/index.ts](packages/api/src/endpoints/index.ts) 加 `export *`。
- **`@zhao/types`**：DTO/契约类型放这里（recruitment 的 `RecruitmentRequestItem` 等即来自此包）。前端**不得**直接引用 Prisma 类型。

### 前端 (Next.js 静态导出)

- **路由入口**（静态导出，薄包装）：[app/dashboard/stores/page.js](apps/web/app/dashboard/stores/page.js) — 仅 `import` 并渲染 feature page。
  - ⚠️ **静态导出**：动态路由 `[id]` 必须 `export generateStaticParams`。本功能用**静态路由** `app/dashboard/abc-scores/page.js`，无需 `generateStaticParams`。
- **菜单/导航**：在 [dashboard-copy.js](apps/web/src/features/dashboard/constants/dashboard-copy.js:6-139) 的 `DASHBOARD_NAV` 的 `menu` 分组里加一项，含 `id/href/zh/en/fr`，并按需加 `requiredPermission` 和/或 `visibleForJobRoles`。可见性逻辑见 [nav-visibility.ts](packages/utils/src/access/nav-visibility.ts:63-87)（命中 job role **或** 持有 `requiredPermission` 即可见）。`Sidebar` 自动按 `canSeeNavEntry` 过滤（[Sidebar.js](apps/web/src/features/dashboard/components/Sidebar.js:58-63)）。
- **Feature 结构**样板：`apps/web/src/features/stores/`（`pages/`、`components/`、`services/*.ts`、`constants/*-copy.js`、`types/`、`*.module.css`）。三语 copy 对象 `STORES_COPY[lang]`，语言来自 `usePreferredLanguage`。
- **Feature service**样板：
  - 用 `@zhao/api` 工厂：[recruitmentRequestsApi.ts](apps/web/src/features/recruitment-requests/services/recruitmentRequestsApi.ts)（`createRecruitmentRequestsApi(apiClient)`）。
  - 媒体上传 + 路径解析：[restaurantsApi.ts](apps/web/src/features/stores/services/restaurantsApi.ts:123-140)（`apiClient.upload<{objectKey}>("/media/upload", formData)`，再拼 `GET /media/file?objectKey=`）。
- **API 客户端**：一律走 `apiClient`（[api-client.ts](apps/web/src/shared/api/api-client.ts)），**禁止**裸 `fetch/axios`。
- **页面顶部状态栏 / 模态框 / 文件上传 UI** 完整样板：[StoresPage.js](apps/web/src/features/stores/pages/StoresPage.js)（header 第 292 行、modal 第 419 行、photo upload 第 481-523 行）。

### Anti-patterns（禁止）

- ❌ 不要发明 `@RequirePermissions` 之外的守卫，或不存在的 `apiClient` 方法（只有 `get/post/patch/delete/upload`）。
- ❌ 控制器里**不要**直接访问 Prisma；业务逻辑放 service。
- ❌ 不要把 Prisma 实体直接当响应返回 —— 映射成 view shape（见 `RestaurantListItem`）。
- ❌ 不要用根 `pnpm db:migrate`（硬编码 `--name init`）。
- ❌ 动态路由忘记 `generateStaticParams` 会让 `next build` 失败（本功能用静态路由可规避）。
- ❌ DTO 出现未声明字段 → 被 `forbidNonWhitelisted` 拒绝。

---

## Phase 1 — 数据层与权限 (Backend: Prisma + RBAC seed)

**目标**：建表、生成迁移、加权限键与角色种子。

### 要做的

1. **`schema.prisma`** 新增三个模型（复制 `Restaurant` 模型的 `@@map`/`@map` 风格，schema.prisma:136-149）：
   - `AbcScoreCycle` → `@@map("abc_score_cycles")`：`id Int @id`、`label String`、`status String @default("draft")`（`draft`/`published`）、`publishedAt DateTime?`、`createdAt`、`updatedAt`、关系 `scores AbcStoreScore[]`。
   - `AbcStoreScore` → `@@map("abc_store_scores")`：`id Int @id`、`cycleId Int`、`restaurantId Int`、`marketingScore Int?`、`marketingNotes String?`、`marketingFilledByUserId Int?`、`marketingFilledAt DateTime?`、`operationsScore Int?`、`operationsNotes String?`、`operationsFilledByUserId Int?`、`operationsFilledAt DateTime?`、`createdAt`、`updatedAt`。`@@unique([cycleId, restaurantId])`。关系到 `AbcScoreCycle`、`Restaurant`（在 `Restaurant` 模型补 `abcScores AbcStoreScore[]`）、`media AbcScoreMedia[]`。
   - `AbcScoreMedia` → `@@map("abc_score_media")`：`id Int @id`、`storeScoreId Int`、`objectKey String`、`fileName String?`、`department String @default("operations")`、`uploadedByUserId Int?`、`createdAt`。关系到 `AbcStoreScore`。
2. **生成迁移**：`pnpm --filter backend exec prisma migrate dev --name add_abc_scores`，确认生成的 SQL 与 [recruitment migration.sql](apps/backend/prisma/migrations/20260605150000_add_recruitment_requests/migration.sql) 风格一致（utf8mb4、外键 RESTRICT/CASCADE）。
3. **权限键**：在 [permissions.ts](apps/backend/src/auth/permissions.ts) 加（仿 `RECRUITMENT_REQUEST_PERMISSIONS`）：
   ```ts
   export const ABC_SCORE_PERMISSIONS = {
     read: 'abc.score.read',
     fillMarketing: 'abc.score.fill_marketing',
     fillOperations: 'abc.score.fill_operations',
     publish: 'abc.score.publish',
   } as const;
   ```
4. **种子**（[seed.js](apps/backend/prisma/seed.js)）：把 4 个键加入 `PERMISSIONS` 数组（第 11 行起，带 `description`）；在 `ROLES`（第 311 行起）新增 `marketing-admin`（`abc.score.read`,`abc.score.fill_marketing`）与 `operations-admin`（`abc.score.read`,`abc.score.fill_operations`），`publish` 给 `super-admin`（自动含全部，无需手动）与可选 `holding`。

### 验证清单

- [ ] `pnpm db:generate` 通过，Prisma Client 含新模型。
- [ ] `pnpm --filter backend exec prisma migrate dev --name add_abc_scores` 成功，迁移目录新增。
- [ ] `pnpm db:seed` 成功，DB `permissions` 表含 4 个 `abc.score.*` 键。
- [ ] `grep -rn "abc.score" apps/backend/prisma/seed.js apps/backend/src/auth/permissions.ts` 命中。

### Anti-pattern guards

- 不要手写迁移 SQL 后再改 schema（顺序：先改 schema → 再 `migrate dev`）。
- 列名用 `@map` 转 snake_case，否则与既有 legacy 库风格不一致。

---

## Phase 2 — 后端 abc-scores 模块 (Module / Controller / Service / DTO)

**目标**：实现填分、进度、媒体关联、预览、发布的接口。

### 要做的（新建目录 `apps/backend/src/abc-scores/`，复制 recruitment-requests 结构）

1. **module** `abc-scores.module.ts`：复制 [recruitment-requests.module.ts](apps/backend/src/recruitment-requests/recruitment-requests.module.ts)，`imports: [AuthModule, PrismaModule]`。注册到 [app.module.ts](apps/backend/src/app.module.ts)。
2. **controller** `abc-scores.controller.ts`（瘦；用 `@RequirePermissions(...) @UseGuards(PermissionGuard)` 守卫，取 actor 用 `AuthService.getCurrentUser` 仿 [recruitment controller getActor](apps/backend/src/recruitment-requests/recruitment-requests.controller.ts:77-89)）。建议端点：
   - `GET /abc-scores/cycles?status=` → 列周期（`abc.score.read`）
   - `POST /abc-scores/cycles` → 创建 draft 周期（`abc.score.publish` 或专门管理权限）
   - `GET /abc-scores/cycles/:id` → 周期详情：含每家门店 + 两部门分数 + 媒体（`abc.score.read`）
   - `GET /abc-scores/cycles/:id/progress` → `{ marketing: {filled, total}, operations: {filled, total} }`（`abc.score.read`）
   - `PATCH /abc-scores/cycles/:id/stores/:restaurantId/marketing` → 填营销分（`abc.score.fill_marketing`）
   - `PATCH /abc-scores/cycles/:id/stores/:restaurantId/operations` → 填稽核分（`abc.score.fill_operations`）
   - `POST /abc-scores/cycles/:id/stores/:restaurantId/media` → 关联已上传报告 objectKey（`abc.score.fill_operations`）
   - `GET /abc-scores/cycles/:id/preview` → 计算排行榜（含 A/B/C 评级），不改状态（`abc.score.read`）
   - `POST /abc-scores/cycles/:id/publish` → draft→published（`abc.score.publish`）
3. **service** `abc-scores.service.ts`（全部业务逻辑；Prisma 访问只在此）：
   - 详情/进度：以 `restaurants` 全集为 N，`leftJoin` `abc_store_scores`；`filled = score 非 null 的门店数`。
   - 填分：`upsert` `AbcStoreScore`（`@@unique([cycleId, restaurantId])`），写入对应部门字段 + `filledByUserId` + `filledAt`。
   - 媒体：插入 `AbcScoreMedia` 关联 storeScore（objectKey 来自前端先调 `/media/upload`）。
   - 预览/排名：`total = (marketingScore ?? 0) + (operationsScore ?? 0)`，排序，按分位阈值（集中为常量 `ABC_GRADE_THRESHOLDS`）分 A/B/C。返回 **view shape**（勿直接返回 Prisma 实体）。
   - publish：校验是否允许（可选：要求两部门进度 100%），写 `status='published'` + `publishedAt`。
4. **DTO**（`dto/`，`class-validator`，分 Create/Update/Query；仿 recruitment dto）：
   - `create-cycle.dto.ts`（`label`）
   - `fill-marketing-score.dto.ts`（`score:number @Min/@Max`，`notes?:string`）
   - `fill-operations-score.dto.ts`（同上）
   - `attach-media.dto.ts`（`objectKey:string`，`fileName?:string`）
   - `list-cycles-query.dto.ts`（`status?`）
5. **类型**：把控制器/服务返回的 view 类型（`AbcCycleSummary`、`AbcStoreScoreItem`、`AbcProgress`、`AbcLeaderboardEntry`）放 `apps/backend/src/abc-scores/abc-scores.types.ts`，并在 [@zhao/types](packages/types) 暴露前端需要的契约（仿 `RecruitmentRequestItem`）。

### 验证清单

- [ ] `pnpm --filter backend typecheck` 通过。
- [ ] `pnpm --filter backend test`：为 service 写最小单测（仿 [recruitment-requests.service.spec.ts](apps/backend/src/recruitment-requests/recruitment-requests.service.spec.ts)）覆盖：进度计数、upsert 填分、排名分级。
- [ ] 手测：`pnpm dev:api` 后 `GET http://localhost:3002/api/abc-scores/cycles`（带 Bearer）返回 200。
- [ ] `grep -rn "AbcScoresModule" apps/backend/src/app.module.ts` 命中。

### Anti-pattern guards

- 控制器禁止 Prisma；DTO 禁止业务逻辑。
- 返回值禁止裸 Prisma 实体 → 映射 view shape。
- `BigInt` 注意：本功能用 `Int`，若引用 `Product` 等 BigInt 字段需 `.toString()`。

---

## Phase 3 — `@zhao/api` + `@zhao/types` 契约

**目标**：前端可类型安全地调用后端。

### 要做的

1. **`@zhao/types`**：新增 `abc-scores` 契约类型（`AbcCycleSummary`、`AbcStoreScoreItem`、`AbcProgress`、`AbcLeaderboardEntry`、`FillMarketingScoreRequest`、`FillOperationsScoreRequest`、`AttachAbcMediaRequest`、`ListAbcCyclesQuery`）。在该包 index 暴露。
2. **`@zhao/api`**：新建 [endpoints/abc-scores.ts](packages/api/src/endpoints/abc-scores.ts)，复制 [recruitment.ts](packages/api/src/endpoints/recruitment.ts) 的 `createXxxApi(apiClient)` 模式，导出 `createAbcScoresApi`，方法对应 Phase 2 端点（`listCycles/getCycle/getProgress/fillMarketing/fillOperations/attachMedia/getPreview/publish/createCycle`）。在 [endpoints/index.ts](packages/api/src/endpoints/index.ts) 加 `export * from "./abc-scores"`。

### 验证清单

- [ ] `pnpm --filter @zhao/api typecheck`、`pnpm --filter @zhao/types typecheck` 通过。
- [ ] `grep -rn "createAbcScoresApi" packages/api/src/endpoints/index.ts`（经 `export *`）可由 `@zhao/api` 导入。

### Anti-pattern guards

- 路径用 `encodeURIComponent` 包裹 id（仿 recruitment.ts:45）。
- 只用 `apiClient.get/post/patch/delete`（无 `put`）。

---

## Phase 4 — 前端页面、菜单入口、状态栏、上传、预览

**目标**：完整 UI。新建 feature `apps/web/src/features/abc-scores/` + 路由 + 菜单。

### 要做的

1. **路由入口**：`apps/web/app/dashboard/abc-scores/page.js`，复制 [stores/page.js](apps/web/app/dashboard/stores/page.js) 薄包装，渲染 `AbcScoresPage`。（静态路由，无需 `generateStaticParams`。）
2. **菜单项**：在 [dashboard-copy.js](apps/web/src/features/dashboard/constants/dashboard-copy.js:17-24) 的 `menu` 分组加：
   ```js
   { id: "abc-scores", href: "/dashboard/abc-scores",
     zh: "ABC 评分排行榜", en: "ABC scoreboard", fr: "Classement ABC",
     requiredPermission: "abc.score.read" }
   ```
   （持有任一 `abc.score.read` 的角色可见；`Sidebar` 自动过滤。）
3. **feature service** `services/abcScoresApi.ts`：复制 [recruitmentRequestsApi.ts](apps/web/src/features/recruitment-requests/services/recruitmentRequestsApi.ts) 用 `createAbcScoresApi(apiClient)`；媒体上传复制 [restaurantsApi uploadStorePhoto](apps/web/src/features/stores/services/restaurantsApi.ts:123-140)（folder 用 `abc-scores/reports`，得到 objectKey 后调 `attachMedia`）。
4. **constants** `constants/abc-copy.js`：三语 `ABC_COPY[lang]`（仿 `STORES_COPY`），含状态栏、表格、上传、预览、发布文案。
5. **page** `pages/AbcScoresPage.js`（复制 [StoresPage.js](apps/web/src/features/stores/pages/StoresPage.js) 的 header/lang/sidebar/modal 骨架）：
   - **顶部状态栏**：调 `getProgress`，渲染 `营销部 {filled}/{total}` 与 `营运部 {filled}/{total}`（进度条组件 `components/ProgressBar.js`）。
   - **评分表格** `components/StoreScoreTable.js`：每行一家门店，两列分数。营销列对持 `fill_marketing` 者可编辑；营运列 + **上传报告**入口对持 `fill_operations` 者可编辑（权限判断仿 [StoresPage canManageStoreRecords](apps/web/src/features/stores/pages/StoresPage.js:41-48)，读 `user.permissions`）。
   - **媒体上传**：复用 stores 的 file input + 预览 UI（[StoresPage.js:481-523](apps/web/src/features/stores/pages/StoresPage.js:481)）。
   - **模拟预览** `components/LeaderboardPreview.js`：模态/抽屉，调 `getPreview` 展示排名 + A/B/C，**不发布**。
   - **发布按钮**：持 `abc.score.publish` 可见，调 `publish`，建议二次确认（`window.confirm`，仿 [handleDeleteStore](apps/web/src/features/stores/pages/StoresPage.js:266)）。
6. **样式** `abc-scores-page.module.css`：复制 [stores-page.module.css](apps/web/src/features/stores/stores-page.module.css) 的 page/header/modal 基础类按需精简。

### 验证清单

- [ ] `pnpm --filter @zhao/web typecheck` 通过（注意 JS feature 里类型来自 `@zhao/types`）。
- [ ] `pnpm --filter @zhao/web lint` 通过。
- [ ] `pnpm dev:web` → 以含 `abc.score.read` 的账号登录，侧边栏出现「ABC 评分排行榜」；打开页面顶部状态栏显示 `x/总数`。
- [ ] 营销账号只能编辑营销列；运营账号能填稽核分 + 上传报告；持 publish 者能看到「模拟预览」与「发布」。
- [ ] `pnpm build`（含 `next build` 静态导出）通过 —— 证明无遗漏 `generateStaticParams`、无 server action。

### Anti-pattern guards

- ❌ feature 代码里禁止裸 `fetch/axios`，一律走 `apiClient`/feature service。
- ❌ 禁止 import Prisma 类型；只用 `@zhao/types`。
- ❌ 菜单项忘记 `requiredPermission` 会对所有人可见。

---

## Phase 5 — 最终验证 (Verification)

1. **全量检查**（仓库根）：
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm --filter backend test`
   - `pnpm build`（web 静态导出 + backend）
2. **Anti-pattern grep**：
   - `grep -rn "fetch(\|axios" apps/web/src/features/abc-scores` → 应为空（除经 apiClient）。
   - `grep -rn "@prisma/client\|PrismaClient" apps/web` 在新代码中应无新增。
   - `grep -rn "generateStaticParams" apps/web/app/dashboard/abc-scores` → 若有 `[id]` 动态路由必须存在；本计划用静态路由则不需要。
3. **端到端手测脚本**（`pnpm dev:api` + `pnpm dev:web`）：
   - 创建 draft 周期 → 营销账号填 2 家分 → 状态栏 `营销部 2/N`。
   - 运营账号填 1 家稽核分 + 上传 1 份报告 → 报告可经 `GET /media/file?objectKey=` 打开。
   - 打开「模拟预览」→ 排名与 A/B/C 正确，且周期仍为 `draft`。
   - 点「发布」→ `status=published`、`publishedAt` 写入。
4. **权限矩阵核对**：营销账号看不到运营列编辑/上传，看不到发布；运营账号反之；只有 publish 角色能发布。

---

## 文件清单（执行索引）

**后端**
- `apps/backend/prisma/schema.prisma`（改）
- `apps/backend/prisma/migrations/<ts>_add_abc_scores/migration.sql`（生成）
- `apps/backend/prisma/seed.js`（改：PERMISSIONS + ROLES）
- `apps/backend/src/auth/permissions.ts`（改：`ABC_SCORE_PERMISSIONS`）
- `apps/backend/src/abc-scores/{abc-scores.module,abc-scores.controller,abc-scores.service,abc-scores.types}.ts`（新）
- `apps/backend/src/abc-scores/dto/*.ts`（新）
- `apps/backend/src/abc-scores/abc-scores.service.spec.ts`（新）
- `apps/backend/src/app.module.ts`（改：注册模块）

**共享包**
- `packages/types/...`（新增 abc-scores 契约 + index 导出）
- `packages/api/src/endpoints/abc-scores.ts`（新）+ `endpoints/index.ts`（改）

**前端**
- `apps/web/app/dashboard/abc-scores/page.js`（新）
- `apps/web/src/features/dashboard/constants/dashboard-copy.js`（改：菜单项）
- `apps/web/src/features/abc-scores/pages/AbcScoresPage.js`（新）
- `apps/web/src/features/abc-scores/components/{ProgressBar,StoreScoreTable,LeaderboardPreview}.js`（新）
- `apps/web/src/features/abc-scores/services/abcScoresApi.ts`（新）
- `apps/web/src/features/abc-scores/constants/abc-copy.js`（新）
- `apps/web/src/features/abc-scores/abc-scores-page.module.css`（新）

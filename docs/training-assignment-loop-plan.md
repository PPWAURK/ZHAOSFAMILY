# 培训资料「岗位驱动自动分配」闭环 — 工作计划

> 状态:**设计定稿,待实现**。本文件是后端重构的施工蓝图。
> 范围决策(已锁定):
> 1. **仅岗位驱动分配** — RBAC 权限只 gate 管理动作(上传/管理岗位),不参与资料可见性。
> 2. **数据化映射** — `jobRole → 培训岗位` 由可在界面维护的数据决定,废弃硬编码启发式。
> 3. **手机端零改动** — `/training/my-plan` 是末端消费者,后端修好即自动正确。

---

## 1. 问题诊断(为什么要做)

当前 `jobRole`(用户岗位枚举)与 `TrainingPosition.code`(培训岗位树)是**两套词汇**,中间靠
[`training.service.ts` 的 `resolveSingleTrainingPositionCodes`](../apps/backend/src/training/training.service.ts)
(~90 行 + 几十个 `.includes()` 模糊匹配 + 兜底 `['FOH']`)勉强连接。

具体缺陷:
1. **映射写死在代码**:岗位管理界面新增岗位,`getMyPlan` 不会自动认它,必须改 TS。不是闭环。
2. **"谁看全部"埋在分支顺序里**:经理类命中 `.includes('manager')` → 看全部;而 `holding` 先命中 `.includes('holding')` → 只看 `HOLDING + ALL`(与预期相反)。
3. **9 个角色无显式映射**,靠模糊匹配,行为难预测。
4. **无完整性约束**:`CreateTrainingMaterialDto.positionId` 只校验格式(`^[A-Z0-9_]+$`)不校验存在性 → 可产生永不分配的孤儿资料;`jobRole` 也可能指向不存在的岗位。
5. **RBAC 权限不参与分配**(本次确认维持现状)。

---

## 2. 目标闭环(数据流)

```
┌──────────────────────── 管理端(Web,RBAC 权限 gate)────────────────────────┐
│   ①权限中心 PermissionsPage      ②岗位管理 TrainingPositionsPage   ③资料上传   │
│   PATCH .../job-role             岗位树 + 映射表(本次新增)        POST          │
│   给用户配 jobRole                training.position.manage         /training/   │
│        │                         ┌────────────┬─────────────┐    materials    │
│        │                         │TrainingPos.│JobRolePos.   │     │           │
│        ▼                         │ (岗位树)   │ (映射表)     │     ▼           │
└────────┼─────────────────────────────┼───────────────────────────┼─────────────┘
         ▼                              ▼                           ▼
   ┌───────────┐               ┌────────────────┐         ┌──────────────────┐
   │ User      │               │ 映射 + 岗位树    │         │ TrainingMaterial │
   │ .jobRole  │──────┐        │ (单一事实来源)   │         │ .positionId      │
   └───────────┘      ▼        └────────────────┘         └──────────────────┘
            ╔══════════════════════════════════╗                  │
            ║ 解析器 resolveTrainingPositionCodes║◄─────────────────┘
            ║ (Phase 1:查表 + 树遍历,纯函数)    ║   按 positionId 匹配
            ╚══════════════════════════════════╝
                      │ 岗位码集合,如 [FRONT_HOST, FOH, ALL]
                      ▼
            ┌───────────────────────┐      ┌──────────────────────────┐
            │ GET /training/my-plan  │─────►│ TrainingMaterialProgress │
            │ 必修/选修/完成度        │ 进度 │ (per user × material)    │
            └───────────────────────┘      └──────────────────────────┘
                      │
                      ▼  📱 手机端(末端消费,零改动)
```

---

## 3. 岗位树 + 定稿映射表

### 3.1 岗位树(`TrainingPosition`,`parentCode` 层级,多根)

```
ALL(全岗通用,无父)        ← 永远附加给每个人
FOH 前厅 ─┬─ FRONT_HOST 迎宾 · FRONT_CASHIER 收银 · FRONT_SERVER 服务生
          └─ FRONT_PACKER 打包 · FRONT_BAR 吧台
BOH 后厨 ─┬─ BACK_DISHWASHER 洗碗 · BACK_NOODLE 打面 · BACK_HOT_APPETIZER 热前菜
          └─ BACK_COLD_APPETIZER 冷前菜 · BACK_RICE 饭
CASH 收银(独立根) · SM 店长 · RM 区域 · HOLDING 最高管理(各独立根)
```

### 3.2 两个数据开关(取代 `.includes` 猜测)

- **`grantsAllPositions = true`** → 直接拿全部活跃岗位码(+ALL),跳过树遍历。给「看全部」的角色。
- **`includeDescendants = true`** → anchor 岗位 + 其全部后代 + 祖先(+ALL)。给「看本分支」的角色。
- 二者都 false → 只看本岗 + 祖先(+ALL)。叶子工位默认。

### 3.3 定稿映射(全部 19 个 `JOB_ROLE_VALUES`)

| jobRole | positionCode | includeDescendants | grantsAllPositions | 看到的范围 |
|---|---|---|---|---|
| `holding` | HOLDING | — | **✅ true** | 全部资料 |
| `regional-manager` | RM | — | **✅ true** | 全部资料 |
| `store-manager` | SM | — | **✅ true** | 全部资料(全工位) |
| `front-manager` | FOH | ✅ true | false | 前厅整条 + ALL |
| `back-manager` | BOH | ✅ true | false | 后厨整条 + ALL |
| `front-assistant` | FOH | ✅ true | false | 前厅整条 + ALL |
| `back-assistant` | BOH | ✅ true | false | 后厨整条 + ALL |
| `front-of-house` | FOH | ✅ true | false | 前厅整条 + ALL |
| `back-of-house` | BOH | ✅ true | false | 后厨整条 + ALL |
| `front-host` | FRONT_HOST | false | false | 迎宾 + FOH + ALL |
| `front-cashier` | FRONT_CASHIER | false | false | 收银 + FOH + ALL |
| `front-server` | FRONT_SERVER | false | false | 服务生 + FOH + ALL |
| `front-packer` | FRONT_PACKER | false | false | 打包 + FOH + ALL |
| `front-bar` | FRONT_BAR | false | false | 吧台 + FOH + ALL |
| `back-dishwasher` | BACK_DISHWASHER | false | false | 洗碗 + BOH + ALL |
| `back-noodle` | BACK_NOODLE | false | false | 打面 + BOH + ALL |
| `back-hot-appetizer` | BACK_HOT_APPETIZER | false | false | 热前菜 + BOH + ALL |
| `back-cold-appetizer` | BACK_COLD_APPETIZER | false | false | 冷前菜 + BOH + ALL |
| `back-rice` | BACK_RICE | false | false | 饭 + BOH + ALL |

> 备注:`CASH` 岗位当前无任何 jobRole 映射到它,由 Phase 3 诊断接口标记(`positionsWithoutMaterials` / 无角色解析到)。`front-assistant` / `back-assistant` 若日后想收窄为只看本岗,可单独调 `includeDescendants=false`,不影响其它角色。

---

## 4. 解析算法(决策流)

```
输入 User.jobRole(可逗号多选)
   │ getRoleValues 拆分
   ▼ 对每个角色:
查 JobRolePosition 映射表 ──未命中──► 解析为 [ALL] + ⚠️告警(诊断暴露,不兜底 FOH)
   │ 命中
   ▼
grantsAllPositions == true ? ──是──► 返回【全部活跃岗位码】+ ALL
   │ 否
   ▼
收集 anchor + 沿 parentCode 的祖先;若 includeDescendants 再收集全部后代
   │
   ▼
合并所有角色结果 → 去重 → +ALL → 匹配 TrainingMaterial.positionId → 必修/选修
```

### 解析示例

```
① front-host    → {FRONT_HOST, FOH, ALL}                        本岗+前厅+通用
② front-manager → {FOH, FRONT_HOST/CASHIER/SERVER/PACKER/BAR, ALL}  前厅整条
③ store-manager → 全部活跃岗位码 + ALL                           全工位(grantsAll)
④ holding       → 全部活跃岗位码 + ALL                           全部
```

---

## 5. 分阶段实施计划

### Phase 0 — 映射数据模型 + 迁移 + 种子
- 新增 Prisma model `TrainingJobRolePosition`(表 `training_job_role_positions`):
  - `jobRole String @unique @db.VarChar(40)`(应用层校验 ∈ `JOB_ROLE_VALUES`)
  - `positionCode String @db.VarChar(40)`(逻辑外键 → `TrainingPosition.code`)
  - `includeDescendants Boolean @default(false)`
  - `grantsAllPositions Boolean @default(false)`
  - `@@index([positionCode])`
- 迁移:从 `apps/backend` 跑 `npx prisma migrate dev --name add_job_role_position_map`(**勿用**根 `db:migrate` 包装器,它写死 `--name init`)。
- 种子:在 [`prisma/seed.js`](../apps/backend/prisma/seed.js) 新增 `upsertJobRolePositions()`,紧跟 `upsertTrainingPositions()` 调用,落库 §3.3 定稿映射(全部 19 行,幂等 upsert)。

### Phase 1 — 解析逻辑重构(核心)
- 新建纯函数模块 `apps/backend/src/training/training-position-resolver.ts`,实现 §4 算法(便于单测,也给 `training.service.ts` 1001 行减负)。
- 用它替换 `resolveSingleTrainingPositionCodes` / `resolveTrainingPositionCodes`;删除 `JOB_ROLE_POSITION_CODE_BY_ROLE` 及 `.includes()` 分支。
- 新增 `listJobRolePositionRows()`,在 `getMyPlan` / `getStoreProgress` 里与 `listActivePositionRows()` 并行加载。**保持两者签名与返回结构不变**。
- 兜底策略:未命中映射 → `['ALL']` + warning(不再 `['FOH']`)。
- 在 [`training.service.spec.ts`](../apps/backend/src/training/training.service.spec.ts) 补单测:叶子含祖先+ALL、`includeDescendants` 含整条分支、`grantsAllPositions` 含全部、多角色合并去重、未映射只得 ALL+告警。

### Phase 2 — 完整性校验(堵孤儿)
- `createMaterial` / `updateMaterial`:写库前校验 `positionId` 在 `TrainingPosition` 存在且 `isActive`(复用 `ensureParentPosition` 同款模式),否则 `BadRequestException('TRAINING_POSITION_NOT_FOUND')`。
- 映射写入(若做编辑端点)校验 `positionCode` 存在。
- 删岗位时:若仍有资料或映射指向它,拒绝并给明确错误。

### Phase 3 — 诊断 / 可见性接口
- `GET /training/diagnostics`(受 `training.position.manage` 保护)返回:
  - `unmappedJobRoles` — 无映射行的角色
  - `positionsWithoutMaterials` — 活跃岗位但无资料(如 CASH)
  - `orphanMaterials` — `positionId` 不在岗位表中的资料
  - `rolesResolvingToEmpty` — 解析后 0 必修资料的角色
- (可选)`GET /training/resolve-preview?jobRole=front-host` → 解析岗位码 + 必修/选修资料数,供权限中心分配预览。

### Phase 4 — Web 管理界面(让闭环可运营,后端稳定后单独做)
- [`TrainingPositionsPage.js`](../apps/web/src/features/training/pages/TrainingPositionsPage.js) 增加「岗位映射」区:列出/编辑 jobRole↔positionCode↔两开关;接口走 [`trainingMediaApi.ts`](../apps/web/src/features/training/services/trainingMediaApi.ts)(新增 `fetchJobRolePositions`/`updateJobRolePosition`)。
- [`PermissionsPage.js`](../apps/web/src/features/permissions/pages/PermissionsPage.js) 配岗位时调 `resolve-preview` 显示「该岗位将获得 N 必修 / M 选修」。
- 诊断结果在岗位管理页顶部以告警条呈现。

### Phase 5 — 回归 + 验证
- `pnpm --filter backend typecheck` / `lint` / `test`(含新单测)全过。
- `pnpm db:seed` 幂等。
- 抽样核对 `front-host`(叶子)、`front-manager`(分支)、`store-manager`(全工位)、`holding`(全部)、未映射角色的 `my-plan`;`store-progress` 不回归。
- 确认手机端 `my-plan` 无需改动即正确。

---

## 6. 约束(AGENTS.md)
- 控制器瘦、逻辑在 service;函数 ≤40 行、单文件 ≤300 行(顺势把解析器拆出独立文件,**不做无关大重构**)。
- TypeScript 显式返回类型;错误显式不吞;不引入新依赖;不伪造测试/构建结果。
- 迁移用 `prisma migrate dev` 直跑。
- 输出:改了什么 / 为什么 / 影响范围 / 风险点 / 验证方式;未执行的测试如实写「未执行」。

---

## 7. 可粘贴执行 Prompt(后端 Phase 0–3 + 5)

```text
背景:
zhao-family monorepo,后端 apps/backend(NestJS 11 + Prisma 6 + MySQL)。
目标:打通「岗位 → 学习资料」自动分配闭环,把 jobRole→培训岗位 的映射从硬编码启发式重构为可在界面维护的数据。
范围锁定:仅岗位驱动分配(RBAC 权限维持只 gate 管理动作);手机端不改动(/training/my-plan 是末端消费者)。
本次实现后端 Phase 0-3 + Phase 5 验证;Phase 4(Web 界面)后端稳定后单独做。
详细设计见 docs/training-assignment-loop-plan.md,务必先读。

现状(必读):
- jobRole 枚举:apps/backend/src/auth/job-roles.ts(19 个,可逗号多选)。
- 培训岗位:TrainingPosition 表(code 大写带 parentCode 树,见 schema.prisma 与 seed.js 的 TRAINING_POSITIONS)。
- 待替换的根因:apps/backend/src/training/training.service.ts 的 resolveSingleTrainingPositionCodes(:239 起,Map + .includes 模糊匹配 + 兜底 FOH)。
- getMyPlan 在 :584;CreateTrainingMaterialDto.positionId 只校验格式不校验存在性(产生孤儿资料)。

任务:
Phase 0: 新增 Prisma model TrainingJobRolePosition { jobRole @unique, positionCode, includeDescendants @default(false),
         grantsAllPositions @default(false) };迁移名 add_job_role_position_map(从 apps/backend 跑 npx prisma migrate dev,勿用根 db:migrate)。
         在 seed.js 新增 upsertJobRolePositions() 落库设计文档 §3.3 的全部 19 行映射:
         holding/regional-manager/store-manager → grantsAllPositions=true;
         front/back-manager、front/back-assistant、front/back-of-house → 对应 FOH/BOH + includeDescendants=true;
         其余叶子工位 → 对应 FRONT_*/BACK_*,两开关均 false。
Phase 1: 新建纯函数 training-position-resolver.ts 实现:映射查表 → grantsAllPositions 则返回全部活跃岗位码 →
         否则收集 anchor+祖先(沿 parentCode),includeDescendants 时加全部后代 → 合并去重 → 始终 +ALL;
         未命中映射解析为 [ALL] 并记 warning(不兜底 FOH)。替换 service 里两个旧解析函数并删除 .includes 分支,
         getMyPlan/getStoreProgress 签名与返回不变。补 training.service.spec.ts 单测(叶子/分支/全部/多角色/未映射)。
Phase 2: createMaterial/updateMaterial 写库前校验 positionId 存在且 isActive(参考 ensureParentPosition),
         否则 BadRequestException('TRAINING_POSITION_NOT_FOUND');删岗位时若有资料/映射指向则拒绝并给明确错误。
Phase 3: GET /training/diagnostics(受 training.position.manage 保护)返回 unmappedJobRoles/positionsWithoutMaterials/
         orphanMaterials/rolesResolvingToEmpty。(可选)GET /training/resolve-preview?jobRole= 返回解析岗位码+必修/选修数。
Phase 5: pnpm --filter backend typecheck/lint/test 全过;pnpm db:seed 幂等;抽样核对
         front-host/front-manager/store-manager/holding/未映射角色的 my-plan。

约束(AGENTS.md):控制器瘦、逻辑在 service;函数 ≤40 行、文件 ≤300 行;TS 显式返回类型;错误不吞;不引入新依赖;不伪造结果。
输出:改了什么/为什么/影响范围/风险点/验证方式;未执行的测试如实标注。
```

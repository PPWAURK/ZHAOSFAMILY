# Zhao Family 项目完善计划书（Roadmap to 100%）

> 状态:**待执行**。本文件是项目收尾的施工蓝图,基于 2026-06-15 对三端代码的完整走查得出。
> 走查方法:代码层面盘点(全部路由 / 控制器 / Prisma 模型 / 种子数据 / 测试)+ 全仓 `pnpm typecheck`(**7/7 包通过**)。
> 未实际启动 DB / MinIO / 真机运行,完成度百分比为基于"控制器+服务+前端+测试是否齐全、是否有占位/未接线"的判断估值。

---

## 0. 现状总览

pnpm + Turborepo 单仓,3 个 app + 4 个共享包。

| 端 | 完成度 | 主要缺口 |
|---|---|---|
| 后端 `apps/backend` | **~95%**（P0-2 已补测+验证，P1-6 映射端点已加） | — |
| Web `apps/web` | **~93%** | 改密码接线、门店排行榜验证（岗位映射 UI 已完成 P1-6） |
| Mobile `apps/mobile` | **~90%** | 培训真机验证未做（店长改岗位 P1-4 已修复可用） |
| 共享包 | **~95%** | — |

**Mobile 定位（2026-06-15 锁定）:** Mobile 面向一线/店长日常使用,**不做管理后台**。inventory / suppliers / order-history / 完整权限管理留在 Web。mobile 上唯一的管理类能力是「店长改本店员工岗位」。据此 mobile 完成度从原估 ~70%(按"4 模块未接线")上调到 ~85%,因为那 3 个模块本就不在 mobile 范围内。

**收尾逻辑:** P0 已全部完成(分支固化、AI 出题测试+验证、部署冒烟)。「让现有代码真正可上线」已达成(M1),后续按价值补 P1/P2。

---

## 1. 优先级总表

| 优先级 | 含义 |
|---|---|
| 🔴 P0 | 上线阻塞项,先做 |
| 🟠 P1 | 核心体验补全 |
| 🟡 P2 | 收尾打磨,可并行 |

**建议执行顺序:** P0 → P1#6(映射 UI,后端已就绪只差前端)→ P1#4 / #5(mobile)→ P2。

---

## 2. 🔴 P0 — 上线阻塞项(预估 1–2 天)

### P0-1 固化当前分支
- **做什么:** 提交 34 个改动(含 2 个新 migration)→ 跑 `pnpm lint` + `pnpm build` + `pnpm --filter backend test` 一轮回归。
- **为什么不是 100%:** 训练测验 / AI / 称号 / 门店排行榜代码写完且 **typecheck 通过**,但**未提交、未跑 lint/build/test、未在浏览器实测**。目前只验证了类型,没验证运行。
- **验证:** 三项命令全绿;`git status` 干净。
- **工作量:** 0.5 天。

### P0-2 AI 出题端到端验证 + 补测
- **做什么:** 用真实 key 跑通 `POST /training/materials/:id/quiz/generate` 整条生成链路;给 `training-quiz-generator.service.ts` 和 `training-quiz-admin.service.ts` 补单测(覆盖:JSON 解析容错、错误分类 `classifyAiError`、配置未设置 / 无源文件分支)。
- **为什么不是 100%:** 接了 OpenAI SDK、写了错误分类和配置加密(`ai-config-crypto.ts`),但**整条生成链路从未真跑过**,且这两个服务是后端唯一**没有 `.spec.ts`** 的新模块。
- **验证:** 单测通过;真实环境生成出 ≥1 道有效题目。
- **工作量:** 1 天。

### P0-3 部署冒烟
- **做什么:** 干净环境演练一次部署 —— web 静态导出产物(`output: 'export'`)、backend 生产 env(`AUTH_TOKEN_SECRET` / `DATABASE_URL` / MinIO / Brevo key)、`GET /api/health` 通。
- **为什么不是 100%:** 配置散落,`.env.example` 的 `DATABASE_URL` 端口(3306)与 docker-compose 映射(3307)不一致,未做过一次干净环境部署演练。
- **验证:** web 导出可静态托管;backend 起得来且 health 200;登录链路通。
- **工作量:** 0.5 天。

---

## 3. 🟠 P1 — 核心体验补全(预估 3–5 天)

### P1-4 Mobile 店长改员工岗位 ✅ 已完成（2026-06-15）
- **范围决策:** Mobile **不做管理后台**。inventory / suppliers / order-history / 完整 permissions 管理留在 Web。mobile 唯一的管理类能力是店长改本店员工岗位。
- **结果:** 该能力其实早已在 mobile **Stores 模块（门店 tab → 团队视图）**里实现(列本店员工、搜索/按岗位筛选、逐人岗位选择器 + 保存,调 `PATCH /permissions/users/:id/job-role`)。但发现一个真 bug:岗位选择器只列**管理类**岗位(holding/店长/经理…),全部不在后端 `MANAGEABLE_JOB_ROLE_VALUES` 内 → 店长每次保存都被 **403**,功能实际是坏的。
- **修复(提交 685c451):** 给 mobile 补齐**一线岗位**选项(迎宾/收银/服务生/打包/吧台 + 洗碗/打面/热前菜/冷前菜/饭),并让非 holding 视图只展示后端可赋集;holding/admin 仍可见全部。mobile typecheck/lint/test 全绿。
- **仍待:** 真机端到端确认一次(随 P1-5 一起做)。

### P1-5 Mobile 培训真机验证
- **做什么:** 真机跑通学习闭环(标记完成 + 进度)、quiz 答题闭环、称号(TrainingTitle)展示、防截屏(`useScreenCaptureProtection`)。
- **为什么不是 100%:** 记忆记录 phase 1(学习闭环)已于 2026-06-10 编码,**真机验证 pending**。防截屏、PDF/视频预览、quiz gate 行为只能在真实设备上确认。
- **验证:** EAS/真机上完整走一遍学习→测验→获得称号;iOS/Android 防截屏生效。
- **工作量:** 1 天。

### P1-6 训练岗位映射闭环 Phase 4(Web 管理 UI)✅ 已完成（2026-06-15）
- **做了什么:** 后端补齐映射管理端点 `GET/PUT/DELETE /training/job-role-positions`(受 `training.position.manage` 保护,校验 jobRole ∈ JOB_ROLE_VALUES 且锚点岗位 active);Web `TrainingPositionsPage` 新增 `JobRolePositionPanel` —— 可编辑的 `jobRole → 锚点岗位 + includeDescendants + grantsAllPositions` 表格、逐行 `resolve-preview`(「N 必修 / M 选修」)、页内诊断条(未映射/解析为空/无资料岗位/孤儿)。提交 d685404。
- **结果:** 映射现在可在界面维护,闭环"可运营性"补齐。后端 +5 单测(124 全绿)。
- **工作量:** 1–1.5 天。

---

## 4. 🟡 P2 — 收尾打磨(预估 2–3 天,可并行)

### P2-7 Web 改密码接线
- **做什么:** profile 页把 mock 占位换成调用 `PATCH /auth/me/password`。
- **为什么不是 100%:** `apps/web/src/features/profile/constants/profile-copy.js` 留了"敬请期待(模拟占位)/ Coming soon (mock placeholder)"文案,但**后端端点其实已存在**,纯前端接线即可。
- **工作量:** 0.5 天。

### P2-8 门店排行榜验证
- **做什么:** 核实新增 `StoreScoreLeaderboard` 的数据来源与评分口径,确认对接真实数据而非静态资源(`apps/web/public/store-score/`)。
- **为什么不是 100%:** 新增组件(未提交),评分来源 / 计算是否接真实数据未核实。
- **工作量:** 0.5 天。

### P2-9 补缺测单测
- **做什么:** 给 `dashboard-news` / `inventory` / `mail` 三个 service 补 `.spec.ts`。
- **为什么不是 100%:** 早期模块,后端 11 个 service 里这 3 个没有测试覆盖。
- **工作量:** 1 天。

### P2-10 全仓回归
- **做什么:** lint + build + `backend test` + `mobile jest` 一次性全绿,过 CI 门槛。
- **为什么不是 100%:** 目前只确认了 typecheck 7/7,从未一次性跑完整套。
- **工作量:** 0.5 天。

---

## 5. 已完成 / 无需动的部分(避免重复劳动)

- **后端模块**(auth / permissions / products / suppliers / restaurants / orders / inventory / recruitment-requests / dashboard-news / media / mail / health)控制器 + 服务 + 单测齐全。
- **auth** 自研 HMAC token + scrypt + refresh session 完整;**mail** 已接 Brevo API(非 stub)。
- **训练岗位映射闭环后端 Phase 0–3** 已落地(仅差 Web Phase 4,见 P1-6)。
- **共享包** `@zhao/api` / `@zhao/auth` / `@zhao/types` / `@zhao/utils` 全部 typecheck 通过、三端源引用。

---

## 6. 约束(遵循 AGENTS.md)

- 控制器瘦、逻辑在 service;函数 ≤40 行、单文件 ≤300 行;TypeScript 显式返回类型;错误显式不吞。
- 不引入无关依赖;不做无关大重构;迁移用 `prisma migrate dev` 直跑(勿用根 `db:migrate` 包装器,它写死 `--name init`)。
- 不伪造测试 / 构建 / lint 结果;未执行的验证如实标注「未执行」。
- 输出格式:改了什么 / 为什么 / 影响范围 / 风险点 / 验证方式。

---

## 7. 里程碑汇总

| 里程碑 | 包含 | 累计工作量 | 达成后状态 |
|---|---|---|---|
| **M1 可部署** ✅ | P0-1 ~ P0-3 | 已完成 | 现有功能可干净部署上线 |
| **M2 运营闭环** ✅ | + P1-6 | 已完成 | 培训岗位分配可在界面运营 |
| **M3 移动端到位** | + P1-4 ✅ / P1-5 | 仅剩真机验证 | 店长可在 mobile 改员工岗位(已修) + 培训真机验证(待) |
| **M4 100%** | + P2 全部 | ~+2–3 天 | 全功能完成 + 测试/回归到位 |

> M3 已按"mobile 不做管理后台"收窄:不再追求 mobile 与 web 功能对齐,只补「店长改员工岗位」窄屏 + 培训真机验证。

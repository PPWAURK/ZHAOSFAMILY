# Backend — 高风险文件清单

> 基于 `apps/backend/` 的全量静态分析生成。高保真修改前请先读此清单。

---

## 超限文件（AGENTS.md 硬限制 500 行/文件）

| 文件 | 行数 | 超限倍数 | 风险等级 | 主要原因 |
|------|------|---------|---------|---------|
| `src/orders/orders.service.ts` | **1,548** | **3.1×** | 🔴 极高 | 订单 CRUD + 退货 + 库存校验 + PDF 编排 + 文件路径解析全揉在一起 |
| `src/orders/orders-document.service.ts` | **621** | **1.2×** | 🟠 高 | PDFKit 渲染 + CJK 字体加载 + Logo 资源发现逻辑，硬编码字体/路径候选列表 |
| `src/permissions/permissions.service.ts` | **978** | **2.0×** | 🟠 高 | 审批工作流 + RBAC 角色分配 + 用户管理 + 职务管理 + 餐厅作用域 |
| `src/auth/auth.service.ts` | **856** | **1.7×** | 🟠 高 | 认证 + 令牌管理 + 权限解析 + 账户生命周期 + 密码管理；冗余字段映射 firstName/givenName/... |
| `src/training/training.service.ts` | **1,316** | **2.6×** | 🔴 极高 | 课程(静态目录) + 职位 CRUD + 材料 CRUD + 进度追踪 + 培训计划 + 诊断 + 角色-职位映射 |
| `src/training/training-monthly-report.service.ts` | **521** | **1.0×** | 🟡 中 | 刚到警戒线；从 training.service 重复了 `hasJobRole`/`isHoldingJobRole`/`listActivePositionRows` |
| `src/mail/mail.service.ts` | **513** | **1.0×** | 🟡 中 | 刚到警戒线；HTML 模板内联字符串拼接，品牌颜色/Logo URL 硬编码 |

---

## 功能逻辑风险

| 文件 | 位置 | 风险 | 说明 |
|------|------|------|------|
| `src/training/training-quiz.service.ts` | **L213** | 🔴 功能不完整 | `submitAttempt` 返回的 `newTitles` 始终为 `[]`，类型声明了但实现从未调用 `titleService.evaluateForMaterial()` |
| `src/prisma/prisma.service.ts` | **全文件** | 🟠 缺少主动连接 | 缺少 `onModuleInit` + `$connect()`，首请求有建连延迟；无 `enableShutdownHooks`，优雅关闭有风险 |
| `src/auth/guards/auth.guard.ts` | **L28** | 🟠 重复 DB 查询 | 全局 Guard 调 `getCurrentUser()` 但丢弃结果，不 attach user 到 `req`。每个受保护端点都要重新解析 token 再调一次 `getCurrentUser()`，每次请求至少 2 次 DB 查询 |
| `src/training/training-quiz.service.ts` | **全文件** | 🟡 重复代码 | `parseOptions`/`parseKeys`/`normalizeType` 与 `training-quiz-admin.service.ts` 完全重复 |
| `src/training/training.service.ts` | **全文件** | 🟡 重复代码 | `hasJobRole`/`isHoldingJobRole`/`listActivePositionRows`/`listJobRolePositionRows`/`findRegionalManagedRestaurantIds` 与 `training-monthly-report.service.ts` 重复 |
| `src/products/products.service.ts` | **全文件** | 🟡 重复代码 | `fixMojibake`/`containsCjk`/`CP1252_REVERSE` 与 `src/inventory/inventory.service.ts` 完全重复 |
| `src/abc-scores/abc-scores.service.ts` | **L64** | 🟡 硬编码 | `HOLDING_RESTAURANT_NAME = 'ZHAO Groupe'` — 按名称识别控股，品牌改名则断；建议用 DB 标志 |
| `src/auth/auth.module.ts` | **L15-16** | 🟡 循环依赖 | `forwardRef(() => RestaurantsModule)` + `forwardRef(() => MailModule)` — 需审计是否可消除 |

---

## 零测试文件（高风险变更区域）

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/mail/mail.service.ts` | **513** | **最大未测试文件** — Brevo API 集成 + HTML 模板生成 + 国际化，无任何测试 |
| `src/inventory/inventory.service.ts` | **223** | 完整的库存出入库逻辑，零测试 |
| `src/inventory/inventory.controller.ts` | 44 | 零测试 |
| `src/media/media.service.ts` | 151 | 文件上传/流读取/删除 — controller 有测试但 service 零 |
| `src/training/screenshot-event.service.ts` | 123 | training 模块唯一无测试的 service |
| `src/auth/guards/auth.guard.ts` | 50 | 全局认证守卫，无测试 |
| `src/auth/guards/permission.guard.ts` | 59 | 全局权限守卫，无测试 |
| `src/notifications/notifications.service.ts` | 74 | 推送注册/发送/失效清理，无测试 |

---

## 测试薄弱文件

| 文件 | 行数 | 测试数量 | 缺失场景 |
|------|------|---------|---------|
| `src/suppliers/suppliers.service.ts` | 129 | 1 个 | 缺少创建/更新/删除/排序测试 |
| `src/products/products.service.ts` | 265 | 1 个 | 缺少创建/更新/删除/NotFound 测试 |
| `src/training/training-monthly-report.service.ts` | 521 | **1 个** | 缺少 holding/regional/store-manager 作用域、餐厅过滤、空数据、多店、通过率测试 |
| `src/training/training-quiz.service.spec.ts` | 424 (service) | 部分 | 缺少 `getQuizForMaterial`、maxAttempts 强制、未完成答案拒绝、失败路径测试 |
| `src/training/training-quiz-admin.service.spec.ts` | 363 (service) | 部分 | 缺少 `upsertQuiz`、`deleteQuiz`、`updateQuestion`、`deleteQuestion` happy path 测试 |
| `src/minio/minio.service.spec.ts` | 232 (service) | 3 个 | 缺少 `getFileStream`、`getPartialFileStream`、`statObject`、`removeObject` 测试 |
| `src/auth/auth.service.spec.ts` | 856 (service) | 623 行测试 | 缺少 `login()`、`getCurrentUser()`、`updateCurrentUser()`、`changeCurrentPassword()`、`refresh()`、`logout()`、`getPermissionsForToken()` |

---

## E2E 测试缺口

| 文件 | 覆盖内容 | 缺少 |
|------|---------|------|
| `test/app.e2e-spec.ts` (496 行) | health/restaurants/suppliers/products/auth/register 验证 | **无任何 training 端点**（~30 端点）、无 orders/permissions/abc-scores/case-shares 等 |

---

## 架构风险

| 问题 | 涉及文件 | 风险 |
|------|---------|------|
| `MinioService` 无 presigned URL | 所有文件上传经过后端代理（大文件低效） | 🟡 性能 |
| `AuthContext.tsx` 接受 8+ 名字字段 | `firstName`/`givenName` + `lastName`/`familyName` + `store`/`restaurant` + `avatar`/`profilePhoto` 双份映射 | 🟡 后端不稳定或历史演进残留 |
| `forwardRef` 循环依赖 | AuthModule ↔ MailModule + AuthModule → RestaurantsModule | 🟡 重构阻力 |
| 自实现 JWT 无标准库 | `auth.service.ts` 用 HMAC-SHA256 + base64url 自编码 token，无 `iat`/`iss`/`aud`/`jti` | 🟡 未来 OAuth/SSO 集成困难 |
| `training-catalog.ts` 硬编码 | 9 个课程含静态 `progressPercent: 55` 等，不反映真实进度 | 🟡 可能是废弃设计 |
| 全局 ThrottlerGuard + AuthGuard | 2 个全局 guard，AuthGuard 不 attach user | 🟡 每次请求额外 DB 开销 |
| `mail.service.ts` HTML 模板内联 | 字符串拼接 HTML，无模板引擎 | 🟡 可维护性差 |

---

## 服务大小排名（Top 10）

| # | 文件 | 行数 | 模块 |
|---|------|-------|------|
| 1 | `orders/orders.service.ts` | 1,548 | Orders |
| 2 | `training/training.service.ts` | 1,316 | Training |
| 3 | `permissions/permissions.service.ts` | 978 | Permissions |
| 4 | `auth/auth.service.ts` | 856 | Auth |
| 5 | `orders/orders-document.service.ts` | 621 | Orders |
| 6 | `training/training-monthly-report.service.ts` | 521 | Training |
| 7 | `abc-scores/abc-scores.service.ts` | 518 | ABC Scores |
| 8 | `mail/mail.service.ts` | 513 | Mail |
| 9 | `case-shares/case-shares.service.ts` | 489 | Case Shares |
| 10 | `training/training-quiz.service.ts` | 424 | Training |

---

## Schema / 数据层

| 资产 | 行数 | 状态 | 说明 |
|------|------|------|------|
| `prisma/schema.prisma` | 1,006 | **COMPLETE** | 24 个模型 + 9 个枚举 + 10 个 Legacy 遗留模型；26 次迁移，从 4 月持续到 7 月 |
| `prisma/seed.js` | 905 | **COMPLETE** | 24 权限 / 6 角色 / 17 培训职位 / 19 角色-职位映射 / 6 徽章 / 3 样本问题 / 控股餐厅 |
| `test/app.e2e-spec.ts` | 496 | **MOSTLY COMPLETE** | 仅覆盖基础 CRUD，training 等大模块无 e2e |

---

> 生成日期：2026-07-07
> 生成方式：全量静态代码分析

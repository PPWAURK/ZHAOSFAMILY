# 2026-07-27 首轮跨端 Review

## 范围与基线

审查范围：Next.js Web、Expo React Native、NestJS/Prisma 后端，以及 `@zhao/api`、`@zhao/auth`、`@zhao/types` 共享包。

本次是静态代码和本地自动化验证审查；未连接生产环境、未执行真机回归，也未改动业务实现。

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm lint` | 通过 | 7 个 workspace 均完成 lint。 |
| `pnpm typecheck` | 通过 | 7 个 workspace 均完成 TypeScript 检查。 |
| `pnpm --filter backend test` | 通过 | 32 个 suite、251 个测试通过。 |
| `pnpm --filter @zhao/mobile exec jest --runInBand` | 通过 | 10 个 suite、42 个测试通过。 |
| `pnpm build:web` | 通过 | 静态导出完成；Next.js 提示 ESLint 未启用 Next.js 插件。 |
| `pnpm build:api` | 通过 | Prisma Client 生成和 NestJS 编译完成。 |
| `pnpm --filter backend test:e2e` | 失败 | 8 个测试中 6 个失败，详见 P1-03。 |

## 审查结论

当前代码的基础质量门禁和后端单测处于可用状态：全局认证守卫、DTO 白名单验证、权限守卫、CORS/Helmet、移动端 SecureStore 均已具备。发布前应先关闭以下 P1 风险；P2 项进入紧随其后的治理迭代。

| 优先级 | 问题 | 责任端 | 影响 |
| --- | --- | --- | --- |
| P1 | 通用媒体资源未按归属/业务权限授权 | 后端 | 已登录用户可读取已知私有对象键，并可向任意业务目录上传允许的文件。 |
| P1 | Web refresh token 可被 XSS 读取 | Web、后端 | "记住设备" 会在浏览器持久化 30 天 refresh token。 |
| P1 | 后端 E2E 契约测试失效且未在 CI 执行 | 后端、平台 | API 鉴权和响应字段变更不会被 E2E 门禁捕获。 |
| P2 | API/DTO 契约存在双轨实现 | Web、移动端、共享包 | 接口字段与错误处理容易在三端逐步漂移。 |
| P2 | 关键模块过大，职责边界难以审查 | Web、移动端、后端 | 修改和回归范围过大，测试定位成本高。 |
| P2 | Web 缺少自动化交互测试，且未启用 Next ESLint 规则 | Web | 登录保护、表单状态和无障碍回归只能依赖人工发现。 |

## 详细发现

### [P1-01] 通用媒体接口缺少对象级授权和上传目录授权

- **位置**：`apps/backend/src/media/media.controller.ts` 的 `POST /media/upload`、`GET /media/sign` 与 `GET /media/file`；`apps/backend/src/media/media.service.ts` 的 `sanitizeFolder`。
- **证据**：路由仅由全局 `AuthGuard` 保护；上传端接受客户端传入的 `folder`，签名与旧流式下载仅对 ABC 检查报告目录额外校验权限，其他对象键直接签名或读取。
- **影响**：任何已登录用户都能将可接受的媒体写入如 `stores/photos/` 的公开目录；知道或从业务响应获得私有 `objectKey` 后，也可绕过资源所属业务的权限模型获取媒体。
- **整改**：将上传改为业务资源专用入口，服务端决定固定目录并校验对应权限；将下载/签名统一委派给资源所有者校验（培训资料、案例、公告、门店、ABC 等），未知或无归属对象一律拒绝。保留公开门店照片时，仅允许拥有门店管理权限的调用方写入该目录。
- **回归**：覆盖未授权上传、跨业务对象键签名、公开目录写入、正确资源所有者读取、过期签名和超限文件；对磁盘临时文件增加并发/容量行为测试。

### [P1-02] Web 持久化 refresh token 暴露给浏览器脚本

- **位置**：`apps/web/src/features/auth/context/AuthContext.tsx` 的 `persistSessionTokens` 与 `readStoredTokens`；`apps/web/src/shared/api/api-client.ts` 的本地存储同步；`apps/backend/src/auth/auth.service.ts` 的 `REFRESH_TOKEN_TTL_MS`。
- **证据**：access token 和 refresh token 会写入 `localStorage` 或 `sessionStorage`；后端 refresh session 的有效期为 30 天。
- **影响**：一旦 Web 发生 XSS，攻击脚本可带走可续期的长期会话凭据，风险大于仅存放短期 access token。
- **整改**：确定 Web 会话模型。推荐由同源 BFF/后端通过 `HttpOnly`、`Secure`、适当 `SameSite` 的 refresh cookie 管理续期，浏览器脚本只保存短期 access token 或不保存 token；同时为静态导出部署评估 API 域名、CORS、CSRF 与登出清理策略。迁移期间删除遗留 `buildMediaFileUrl` 的 query-token 使用路径。
- **回归**：验证登录、刷新、关闭浏览器后的预期会话、登出/删号后的 token 失效、跨站请求与 XSS 防护策略；确认 Web 与移动端的 token 存储方案各自独立且不互相退化。

### [P1-03] 后端 E2E 测试与当前 API 契约脱节，CI 未覆盖 E2E

- **位置**：`apps/backend/test/app.e2e-spec.ts`；`.github/workflows/ci.yml`。
- **证据**：本次 `pnpm --filter backend test:e2e` 为 2 通过、6 失败。测试仍断言 `photoUrl`，实现已使用 `photoObjectKey`；受全局认证守卫保护的 suppliers/products 路由被测试当作匿名可访问；健康检查 mock 仍为旧的 `$queryRawUnsafe` 调用。CI 仅执行后端 unit test，未执行 `test:e2e`。
- **影响**：真实 API 鉴权和响应契约的回归无法在合并前被发现，且当前失败的 E2E 结果会降低测试可信度。
- **整改**：先决定 E2E 的边界：使用真实测试数据库的黑盒测试，或保留 mock 但将其定义为 HTTP 集成测试。随后统一认证 fixture、Prisma mock 和当前 DTO/响应字段，并将通过后的 E2E 命令加入 CI；禁止仅通过删除断言来恢复绿色。
- **回归**：至少覆盖 health、匿名 auth 路由、匿名访问受保护资源的 401、低权限用户的 403、授权用户的列表/写入、响应 DTO 字段和 ValidationPipe 的 400。

### [P2-01] 跨端 API 和类型契约没有单一实现入口

- **位置**：`packages/api/src/endpoints/`、`packages/types/src/`、`apps/web/src/features/**/services/*Api.*`、`apps/mobile/src/features/**/**Api.ts`。
- **证据**：共享包目前有 11 个 endpoint 模块，而 Web feature 内还有 17 个 API 模块、移动端有 10 个 API 模块；训练、订单、库存、媒体、门店公告和权限等后端领域没有对应的共享 endpoint/type 表面。Web 的 `AuthContext` 还重新声明了 `AuthUser`、会话和输入类型。
- **影响**：后端字段、错误码、分页和权限语义需要在多处手工同步；TypeScript 无法为三端提供完整的编译期契约保护。
- **整改**：以 Controller DTO/响应为基准，为缺失领域补充共享类型和 endpoint factory；Web/Mobile 仅保留平台专属的 URL、媒体处理和 UI 映射层。优先迁移 auth、media、orders、training 和 inventory，且每次迁移保持端点与响应行为不变。
- **回归**：每个迁移域至少具有共享包的请求路径/序列化测试，以及 Web、移动端各一条调用 smoke test。

### [P2-02] 核心模块超过可审查尺寸，混合多项职责

- **位置**：`apps/backend/src/orders/orders.service.ts`（1548 行）、`apps/backend/src/training/training.service.ts`（1316 行）、`apps/backend/src/permissions/permissions.service.ts`（983 行）、`apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx`（1911 行）、`apps/mobile/src/features/case-shares/CaseSharesModuleScreen.tsx`（1357 行）、`apps/web/src/features/dashboard/components/DashboardNewsModule.js`（1584 行）。
- **影响**：权限、查询、映射、状态与展示交织时，局部改动难以建立完整回归边界。
- **整改**：不做机械拆分。按业务子能力提取，例如订单的查询/退货/文档服务，训练的资料/进度/徽章服务，移动端页面的容器 hook 与展示组件；每次拆分先补当前行为测试，避免改变接口。
- **回归**：拆分前后保留相同的 service/controller 测试，UI 保留 loading、empty、error 和主要交互测试。

### [P2-03] Web 自动化测试和框架规则覆盖不足

- **位置**：`apps/web/eslint.config.mjs`、`apps/web/`。
- **证据**：Web 构建提示 Next.js ESLint 插件未检测到；Web 没有 Jest/Playwright 配置或组件测试文件。路由访问控制依赖客户端 `RequireAuth`，因此登录恢复、重定向和权限不足状态需要自动化回归覆盖。
- **整改**：在不替换现有 lint 规则的前提下接入 Next.js 推荐规则；新增最小 Web 测试基线，优先覆盖 AuthProvider/RequireAuth、共享 API 错误映射和一个高风险表单流程。对关键 dashboard 路由补充窄屏、键盘和错误状态手动验收清单。
- **回归**：将新增 Web 测试纳入 CI，并确认 lint 输出不再包含 Next.js 插件警告。

## 跨端 API 契约差异表

| 后端领域 | 共享 API/Types 状态 | 当前平台调用 | 下一步 |
| --- | --- | --- | --- |
| Auth | 已有，但 Web 重复声明类型与直接请求 | Web、移动端 | 以共享类型/API 为唯一契约，保留平台 token storage adapter。 |
| Products、Restaurants、Suppliers | 已有 | Web 仍有 feature 内 API 层 | 先核对响应字段，再逐域收敛调用。 |
| Case shares、Notifications、Recruitment、Recipes、Waiting queue、ABC | 已有 | 两端同时存在共享与本地调用方式 | 统一 query key、错误映射和 DTO 来源。 |
| Orders、Inventory、Training、Media、Dashboard news、Permissions | 缺少完整共享入口 | Web/Mobile feature 内直接调用 | 按风险优先补共享 endpoint/type，先从媒体和订单开始。 |

## 可执行整改 Backlog

1. **P1 / 后端**：设计并实施媒体资源授权策略；先用测试锁定现有合法访问与拒绝跨资源访问的行为。
2. **P1 / Web+后端**：确定基于 HttpOnly refresh cookie/BFF 的 Web 会话方案，输出迁移和 CSRF 兼容设计后再改动 token 流。
3. **P1 / 后端+平台**：修复 E2E fixture 与断言，将 `pnpm --filter backend test:e2e` 加入 CI。
4. **P2 / 共享包+前端**：为 media、orders、training、inventory 建立共享契约，逐域删除重复 DTO/API 定义。
5. **P2 / 各端**：按一个业务子能力一个 PR 的粒度拆分超大模块，并配套更新测试。
6. **P2 / Web**：补齐 Auth/路由保护自动化测试和 Next ESLint 规则。

## 后续 PR 规则

所有 PR 使用 [PR 模板](../../.github/pull_request_template.md)。涉及权限、API、DTO、Prisma、文件、认证或移动端原生能力的变更，必须在模板中记录影响、回归场景和跨端验证；P0/P1 不得以未验证状态合并。

## 未执行的验证

未执行生产环境探测、真实数据库 E2E、浏览器自动化、iOS/Android 真机回归、性能压测和人工无障碍审查。

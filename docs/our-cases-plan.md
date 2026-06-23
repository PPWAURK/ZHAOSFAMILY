# 我们的案例 — 功能实施计划（Refined Phased Plan）

> 目标：在**手机端**新增一个内部分享入口 **「我们的案例」**，允许伙伴发布**个人案例**或**团队案例**。内容以**文字**为主，可**选传 1 张图片**。案例默认进入**待审核**状态，经总部审核通过后进入公开案例流。已公开案例支持**点赞**与**评论**。

本计划是 **refined** 版本：在原始方案基础上，进一步冻结首发范围、字段约束、接口形状、权限边界、页面落点与实施顺序，让后续可以直接进入实现。

---

## 0. 首发版本冻结（必须先统一）

### 0.1 产品名与技术名

- 中文产品名：**我们的案例**
- 技术命名：统一使用 `case-shares`
- 数据表、后端模块、前端 feature、共享 types/api 全部围绕 `case-shares` 命名

### 0.2 V1 范围（冻结）

**V1 必做：**
- 移动端入口“我们的案例”
- 发布案例：`个人 / 团队 + 文字 + 可选 1 张图片`
- 我的案例状态：`pending / approved / rejected`
- Web 审核端：通过 / 拒绝
- 公开案例流：只展示审核通过内容
- 已公开案例：点赞、评论

**V1 不做：**
- 多图
- 视频
- 草稿箱
- 编辑已提交案例
- 转发 / 收藏 / 置顶 / 推荐
- 评论回复树（楼中楼）
- 实时通知（评论通知、点赞通知、审核通知）
- 移动端审核
- 公开案例的复杂筛选与排序器

### 0.3 产品规则（冻结）

1. **所有已审核通过的员工**都可进入“我们的案例”，不额外配置 `read/create` 权限。
2. **审核权限**只给总部角色，V1 默认给 `holding`。
3. **首版不支持编辑案例**。原因：编辑会引入“重新审核”“版本覆盖”“公开后编辑追溯”等额外状态复杂度。
4. **删除规则**：
   - 作者可删除自己的 `pending/rejected` 案例
   - `approved` 案例 V1 默认**不允许作者删除**
   - 审核端是否需要“下架”能力：V1 默认**不做**
5. **公开流排序**：
   - `approved` 流按 `reviewedAt DESC, createdAt DESC`
   - “我的案例”按 `createdAt DESC`
6. **评论/点赞对象**：仅 `approved` 案例可点赞、评论。
7. **案例类型**：
   - `personal`：个人案例
   - `team`：团队案例
8. **图片数量**：严格 0 或 1 张。

---

## 1. 关键决策与默认值（执行前确认；未确认则按以下值实现）

1. **移动端入口位置**：V1 放在 mobile dashboard 的 **More / 更多** 区域，不挤占底部主导航。后续如使用频率高，再考虑提升为一级入口。
2. **Web 审核路由**：使用独立后台页面：
   - `apps/web/app/dashboard/case-shares-review/page.js`
   - URL：`/dashboard/case-shares-review`
3. **审核权限键**：V1 只新增一个：
   - `case.share.review`
4. **图片大小约束**：V1 业务层建议控制在 **10MB 以内**，仅允许图片 MIME。
5. **分页默认值**：
   - feed：`page=1`, `pageSize=10`
   - comments：`page=1`, `pageSize=20`
6. **内容长度约束**：
   - 案例正文：`1 ~ 2000` 字符
   - 审核备注：`0 ~ 500` 字符
   - 评论内容：`1 ~ 300` 字符
7. **审核备注策略**：
   - `approved`：备注可空
   - `rejected`：备注**建议必填**，方便作者理解原因
8. **餐厅归属**：案例按作者当前 `restaurantId` 归属；V1 不做冗余快照表。

---

## 2. Documentation Discovery（已确认的 Allowed Patterns）

后续实现必须复用以下已存在模式，不重新发明：

### 2.1 移动端

- 全局 Provider：
  [apps/mobile/app/_layout.tsx](apps/mobile/app/_layout.tsx)
- Toast：
  [apps/mobile/src/components/toast/ToastProvider.tsx](apps/mobile/src/components/toast/ToastProvider.tsx)
- Confirm：
  [apps/mobile/src/components/confirm/ConfirmProvider.tsx](apps/mobile/src/components/confirm/ConfirmProvider.tsx)
- 移动 API 客户端：
  [apps/mobile/src/lib/api.ts](apps/mobile/src/lib/api.ts)
- upload 能力：
  [packages/api/src/client.ts](packages/api/src/client.ts)
- 图片选择器样板：
  [apps/mobile/src/features/auth/RegisterForm.tsx:103](apps/mobile/src/features/auth/RegisterForm.tsx:103)
  [apps/mobile/src/features/auth/RegisterForm.tsx:342](apps/mobile/src/features/auth/RegisterForm.tsx:342)
- dashboard 模块承载：
  [apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx](apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx)

### 2.2 后端

- 内容流样板：
  [apps/backend/src/dashboard-news/dashboard-news.controller.ts](apps/backend/src/dashboard-news/dashboard-news.controller.ts)
  [apps/backend/src/dashboard-news/dashboard-news.service.ts](apps/backend/src/dashboard-news/dashboard-news.service.ts)
  [apps/backend/src/dashboard-news/dto/create-dashboard-news-post.dto.ts](apps/backend/src/dashboard-news/dto/create-dashboard-news-post.dto.ts)
  [apps/backend/src/dashboard-news/dashboard-news.types.ts](apps/backend/src/dashboard-news/dashboard-news.types.ts)
- 审核状态流样板：
  [apps/backend/src/recruitment-requests/recruitment-requests.service.ts](apps/backend/src/recruitment-requests/recruitment-requests.service.ts)
- 权限控制：
  [apps/backend/src/permissions/permissions.controller.ts](apps/backend/src/permissions/permissions.controller.ts)
  [apps/backend/src/permissions/dto/update-user-approval.dto.ts](apps/backend/src/permissions/dto/update-user-approval.dto.ts)
- 媒体上传：
  [apps/backend/src/media/media.controller.ts](apps/backend/src/media/media.controller.ts)
  [apps/backend/src/media/media.service.ts](apps/backend/src/media/media.service.ts)

### 2.3 共享包

- 分页类型：
  [packages/types/src/common/pagination.ts](packages/types/src/common/pagination.ts)
- types 导出入口：
  [packages/types/src/index.ts](packages/types/src/index.ts)
- api endpoint 导出入口：
  [packages/api/src/endpoints/index.ts](packages/api/src/endpoints/index.ts)

### 2.4 已确认不存在的现成能力

- 没有现成的点赞 / 评论模块可直接复用
- 没有现成的案例审核模块可直接复用
- `dashboard-news` 不是审核流，不能直接拿来作为业务实现，只能借结构

### 2.5 Anti-patterns（禁止）

- ❌ 裸 `fetch/axios`
- ❌ Prisma 实体直出前端
- ❌ 用 data URL 作为案例图片正式存储方案
- ❌ 一开始做多图 / 视频 / 评论树

---

## 3. 数据模型与索引（Prisma）

**目标**：冻结首发版数据库结构，避免实现过程反复改 schema。

### 3.1 模型建议

#### `CaseShare` → `case_shares`

建议字段：

- `id Int @id @default(autoincrement())`
- `authorId Int @map("author_id")`
- `restaurantId Int @map("restaurant_id")`
- `type String @db.VarChar(20)`  // `personal | team`
- `content String @db.Text`
- `imageBucket String? @map("image_bucket") @db.VarChar(100)`
- `imageObjectKey String? @map("image_object_key") @db.VarChar(500)`
- `imageName String? @map("image_name") @db.VarChar(255)`
- `imageMimeType String? @map("image_mime_type") @db.VarChar(100)`
- `imageSizeBytes BigInt? @map("image_size_bytes")`
- `status String @default("pending") @db.VarChar(20)`  // `pending | approved | rejected`
- `reviewNote String? @map("review_note") @db.Text`
- `reviewedByUserId Int? @map("reviewed_by_user_id")`
- `reviewedAt DateTime? @map("reviewed_at")`
- `createdAt DateTime @default(now()) @map("created_at")`
- `updatedAt DateTime @updatedAt @map("updated_at")`

关系：
- `author -> User`
- `restaurant -> Restaurant`
- `reviewedBy -> User?`
- `comments -> CaseShareComment[]`
- `likes -> CaseShareLike[]`

索引建议：
- `@@index([status, reviewedAt])`
- `@@index([authorId, createdAt])`
- `@@index([restaurantId, createdAt])`
- `@@map("case_shares")`

#### `CaseShareComment` → `case_share_comments`

建议字段：
- `id`
- `caseShareId @map("case_share_id")`
- `authorId @map("author_id")`
- `content @db.VarChar(300)`
- `createdAt @map("created_at")`
- `updatedAt @map("updated_at")`

索引建议：
- `@@index([caseShareId, createdAt])`

#### `CaseShareLike` → `case_share_likes`

建议字段：
- `id`
- `caseShareId @map("case_share_id")`
- `userId @map("user_id")`
- `createdAt @map("created_at")`

约束 / 索引：
- `@@unique([caseShareId, userId])`
- `@@index([userId, createdAt])`

### 3.2 明确不做的表

V1 不新增：
- `case_share_images`
- `case_share_tags`
- `case_share_mentions`
- `case_share_notifications`

### 3.3 迁移要求

- 用 Prisma schema 驱动迁移
- 命令：
  `pnpm --filter backend exec prisma migrate dev --name add_case_shares`
- 不使用根级 `pnpm db:migrate`

### 3.4 验证清单

- [ ] 3 张表已建
- [ ] 关系、索引、唯一约束完整
- [ ] 命名保持 snake_case 映射

---

## 4. 权限与角色边界

**目标**：避免把“开放给所有伙伴”和“总部审核”混成同一套权限模型。

### 4.1 V1 权限策略（冻结）

#### 普通员工侧
- 不要求 `case.share.read`
- 不要求 `case.share.create`
- 只要是**已审批通过且已登录的员工**，即可：
  - 浏览公开案例
  - 发布案例
  - 查看自己的案例
  - 对已公开案例点赞/评论

#### 审核侧
新增权限键：
- `case.share.review`

默认赋予：
- `holding`

### 4.2 为什么不加 `case.share.read/create`

因为这是一个“向伙伴开放”的基础功能，不是后台模块。
若引入 `read/create` 权限：
- 种子和权限配置复杂度增加
- 首发测试账号覆盖面更重
- 与当前需求“开放给伙伴们”不一致

### 4.3 路由权限边界

- 员工接口：走登录用户身份校验，不加 `PermissionGuard`
- 审核接口：使用 `@UseGuards(PermissionGuard)` + `@RequirePermissions('case.share.review')`
- Web 审核页面：前端菜单隐藏 + 后端接口权限双重保护

### 4.4 验证清单

- [ ] 普通员工可正常发与看
- [ ] 无 `case.share.review` 的用户无法访问审核接口
- [ ] Web 审核入口仅审核角色可见

---

## 5. 共享契约（@zhao/types + @zhao/api）

**目标**：在实现前先冻结接口语义，避免 mobile / web / backend 各写各的。

### 5.1 `@zhao/types` 新增目录

建议：
- `packages/types/src/case-shares/models.ts`
- `packages/types/src/case-shares/dto.ts`
- `packages/types/src/case-shares/index.ts`

### 5.2 共享模型建议

#### 基础枚举 / union
- `CaseShareType = 'personal' | 'team'`
- `CaseShareStatus = 'pending' | 'approved' | 'rejected'`

#### 视图类型
- `CaseShareAuthor`
- `CaseShareRestaurant`
- `CaseShareImage`
- `CaseShareItem`
- `CaseShareDetail`
- `CaseShareCommentItem`

#### DTO / 请求类型
- `ListCaseSharesQuery`
- `ListMyCaseSharesQuery`
- `CreateCaseShareRequest`
- `ReviewCaseShareRequest`
- `CreateCaseShareCommentRequest`

### 5.3 精确字段建议

#### `CreateCaseShareRequest`
- `type: CaseShareType`
- `content: string`
- `imageBucket?: string`
- `imageObjectKey?: string`
- `imageName?: string`
- `imageMimeType?: string`
- `imageSizeBytes?: number`

#### `ReviewCaseShareRequest`
- `status: 'approved' | 'rejected'`
- `reviewNote?: string`

#### `ListCaseSharesQuery`
- `page?: number`
- `pageSize?: number`

#### `ListMyCaseSharesQuery`
- `page?: number`
- `pageSize?: number`
- `status?: CaseShareStatus`

### 5.4 API factory 建议

新增：
- `packages/api/src/endpoints/case-shares.ts`

导出工厂：
- `createCaseSharesApi(apiClient)`

方法建议：
- `listPublic(query)`
- `listMine(query)`
- `getDetail(id)`
- `create(payload)`
- `remove(id)`
- `listComments(id, query?)`
- `createComment(id, payload)`
- `like(id)`
- `unlike(id)`
- `listPending(query?)`
- `review(id, payload)`

### 5.5 验证清单

- [ ] `packages/types/src/index.ts` 导出 `./case-shares`
- [ ] `packages/api/src/endpoints/index.ts` 导出 `./case-shares`
- [ ] mobile / web 端只引用共享契约，不自己手搓重复类型

---

## 6. 后端模块设计（apps/backend/src/case-shares）

**目标**：冻结首发后端目录、DTO、接口、核心业务规则。

### 6.1 目录落点

- `apps/backend/src/case-shares/case-shares.module.ts`
- `apps/backend/src/case-shares/case-shares.controller.ts`
- `apps/backend/src/case-shares/case-shares.service.ts`
- `apps/backend/src/case-shares/case-shares.types.ts`
- `apps/backend/src/case-shares/dto/create-case-share.dto.ts`
- `apps/backend/src/case-shares/dto/list-case-shares-query.dto.ts`
- `apps/backend/src/case-shares/dto/list-my-case-shares-query.dto.ts`
- `apps/backend/src/case-shares/dto/review-case-share.dto.ts`
- `apps/backend/src/case-shares/dto/create-case-share-comment.dto.ts`

### 6.2 V1 精确接口（冻结）

#### 员工侧

- `GET /case-shares?page=1&pageSize=10`
  - 公开案例流
  - 仅返回 `approved`
- `GET /case-shares/mine?page=1&pageSize=10&status=`
  - 我的案例
  - `status` 可选：`pending | approved | rejected`
- `GET /case-shares/:id`
  - 公开案例详情
  - 作者可查看自己的非公开案例详情
  - 审核人可查看待审核详情
- `POST /case-shares`
  - 创建案例
- `DELETE /case-shares/:id`
  - 作者删除自己的 `pending/rejected` 案例
- `GET /case-shares/:id/comments?page=1&pageSize=20`
- `POST /case-shares/:id/comments`
- `POST /case-shares/:id/like`
- `DELETE /case-shares/:id/like`

#### 审核侧

- `GET /case-shares/review/pending?page=1&pageSize=10`
- `PATCH /case-shares/:id/review`

### 6.3 DTO 约束（冻结）

#### `CreateCaseShareDto`
- `type`: `personal | team`
- `content`: `@Length(1, 2000)`
- `imageBucket?`: `@MaxLength(100)`
- `imageObjectKey?`: `@MaxLength(500)`
- `imageName?`: `@MaxLength(255)`
- `imageMimeType?`: `@MaxLength(100)`
- `imageSizeBytes?`: `@IsInt() @Min(0)`

#### `ReviewCaseShareDto`
- `status`: `approved | rejected`
- `reviewNote?`: `@MaxLength(500)`
- service 内补充规则：若 `status === 'rejected'` 且 `reviewNote` 为空，则拒绝提交

#### `CreateCaseShareCommentDto`
- `content`: `@Length(1, 300)`

### 6.4 Service 规则（冻结）

1. 创建案例默认：`status = 'pending'`
2. `GET /case-shares` 只返回 `approved`
3. `GET /case-shares/mine` 只返回当前作者自己的内容
4. 评论 / 点赞仅允许对 `approved` 内容执行
5. 审核通过时：
   - `status = 'approved'`
   - `reviewedByUserId = reviewer.id`
   - `reviewedAt = new Date()`
6. 审核拒绝时：
   - `status = 'rejected'`
   - `reviewedByUserId = reviewer.id`
   - `reviewedAt = new Date()`
   - `reviewNote` 必填
7. 作者只能删除自己的 `pending/rejected` 内容
8. `approved` 内容 V1 不支持作者删除
9. feed 返回统一 view shape，不直接透出 Prisma 模型
10. 图片删除只允许处理 `case-shares/` 前缀对象

### 6.5 返回视图建议

#### `CaseShareItemView`
- `id`
- `type`
- `content`
- `status`
- `author`
- `restaurant`
- `image`
- `likeCount`
- `commentCount`
- `likedByCurrentUser`
- `canDelete`
- `canReview`
- `reviewNote`（仅我的案例详情 / 我的案例列表可考虑返回）
- `createdAt`
- `updatedAt`
- `reviewedAt`

### 6.6 测试清单（必须）

- [ ] 创建案例默认 pending
- [ ] 公共流看不到 pending/rejected
- [ ] 作者能看见自己的 pending/rejected
- [ ] 无审核权限不能 review
- [ ] rejected 必须填写 reviewNote
- [ ] approved 内容可评论/点赞
- [ ] pending/rejected 内容不可评论/点赞
- [ ] like 重复提交不产生重复记录
- [ ] 作者不能删除 approved 内容

---

## 7. 媒体上传链路

**目标**：冻结“先传图，再发案例”的链路，避免后续在 create 接口里混传文件。

### 7.1 上传流程（冻结）

1. 移动端选择图片
2. 构造 `FormData`
3. 调 `POST /media/upload`，传：
   - `file`
   - `folder = case-shares`
4. 拿到返回：
   - `bucket`
   - `objectKey`
   - `mimeType`
   - `size`
5. 再调用 `POST /case-shares`

### 7.2 V1 约束

- 仅允许图片 MIME
- 仅允许 1 张
- 建议上传前压缩或限制质量，沿用现有 image picker 参数

### 7.3 返回 URL 处理

建议由前端 service 统一把：
- `objectKey`
- 映射为 `GET /api/media/file?objectKey=...`

不要在组件里手工拼 URL。

### 7.4 Anti-patterns

- ❌ `POST /case-shares` 直接混合文件流
- ❌ 组件里直接拼接媒体 URL
- ❌ 使用 avatar data URL 方案替代对象存储

---

## 8. 移动端实现（apps/mobile/src/features/case-shares）

**目标**：冻结移动端文件落点与页面结构。

### 8.1 文件落点建议

- `apps/mobile/src/features/case-shares/CaseSharesModuleScreen.tsx`
- `apps/mobile/src/features/case-shares/caseSharesApi.ts`
- `apps/mobile/src/features/case-shares/caseSharesCopy.ts`
- `apps/mobile/src/features/case-shares/caseSharesTypes.ts`
- 可选：
  - `CaseShareCard.tsx`
  - `CaseShareComposerModal.tsx`
  - `CaseShareCommentsModal.tsx`
  - `MyCaseSharesSection.tsx`

### 8.2 入口放置（冻结）

- V1 放入 mobile dashboard 的 **More** 区域
- 文案固定：`我们的案例`
- 不新增底部 tab

### 8.3 页面结构（冻结）

一个页面内拆成 3 段：
1. 公开案例流
2. 发布按钮 / 发布弹层
3. 我的案例区块

### 8.4 发布表单字段（冻结）

- 案例类型（个人 / 团队）
- 内容文本域
- 图片选择（0/1）
- 提交按钮

### 8.5 交互规则（冻结）

- 提交成功：`toast.success("案例已提交，等待审核")`
- 删除我的待审/拒绝案例：使用 `useConfirm()`
- 点赞：先做普通请求后回写，不强求复杂 optimistic update
- 评论：modal / bottom sheet 简化实现，不做楼中楼

### 8.6 UI 实施顺序（建议）

1. 只读公开 feed
2. 发布（无图片）
3. 图片上传
4. 我的案例
5. 点赞评论

### 8.7 验证清单

- [ ] 从首页进入“我们的案例”
- [ ] 能浏览公开案例
- [ ] 能提交个人/团队案例
- [ ] 能上传 1 张图
- [ ] 我的案例显示状态
- [ ] 公开案例支持点赞评论

---

## 9. Web 审核端（apps/web/src/features/case-shares）

**目标**：冻结首发 Web 审核端落点，避免与未来 web 公共案例页冲突。

### 9.1 路由与入口（冻结）

- 路由：`/dashboard/case-shares-review`
- 页面文件：
  `apps/web/app/dashboard/case-shares-review/page.js`
- feature：
  `apps/web/src/features/case-shares/pages/CaseSharesReviewPage.js`

### 9.2 菜单入口

- 放入 dashboard 菜单
- 仅 `case.share.review` 用户可见
- 文案建议：`案例审核`

### 9.3 页面首发能力（冻结）

- 待审核案例列表
- 查看正文与图片
- 通过
- 拒绝
- 填写拒绝原因

### 9.4 首发不做

- 批量审核
- 复杂筛选器
- 导出
- 下架已公开案例
- 审核操作历史

### 9.5 验证清单

- [ ] 审核角色看得到入口
- [ ] 能进入待审核列表
- [ ] 能通过 / 拒绝
- [ ] 审核结果回流到移动端

---

## 10. MVP 与 Post-MVP 拆分

### 10.1 MVP（建议第一批上线）

只包含：
- 移动端入口
- 公开案例流
- 发布：个人/团队 + 文字 + 可选 1 图
- 我的案例状态
- Web 审核：通过 / 拒绝

### 10.2 Post-MVP（第二批）

再补：
- 点赞
- 评论
- 删除
- 审核备注对作者展示优化

> 虽然原始需求里包含点赞与评论，但如果目标是尽快上线第一版，建议把互动能力放到第二批。若你坚持第一版必须带互动，则 Phase 6 前移即可。

---

## 11. 推荐执行顺序（最终版）

1. **Phase A**：Prisma 数据模型 + 迁移
2. **Phase B**：共享 types/api
3. **Phase C**：后端基础接口（create / listPublic / listMine / detail / review）
4. **Phase D**：移动端 MVP（先无图，再补图）
5. **Phase E**：Web 审核端
6. **Phase F**：点赞评论
7. **Phase G**：全量验证

---

## 12. 最终验证（必须真实执行）

### 12.1 命令验证

- [ ] `pnpm --filter backend typecheck`
- [ ] `pnpm --filter backend test`
- [ ] `pnpm --filter @zhao/mobile typecheck`
- [ ] `pnpm --filter @zhao/mobile lint`
- [ ] `pnpm --filter @zhao/web typecheck`
- [ ] `pnpm --filter @zhao/web lint`

### 12.2 手工路径验证

#### 移动端员工
- [ ] 进入“我们的案例”
- [ ] 浏览公开案例流
- [ ] 发布文字案例
- [ ] 发布文字 + 图片案例
- [ ] 查看我的案例状态

#### Web 审核端
- [ ] 审核通过一条案例
- [ ] 审核拒绝一条案例并填写原因

#### 回到移动端
- [ ] approved 内容进入公开流
- [ ] rejected 内容不进入公开流
- [ ] 若互动已上线：可点赞、可评论

### 12.3 Anti-pattern grep

- [ ] 没有新增裸 `fetch(` / `axios.`
- [ ] 公共流查询不返回 pending/rejected
- [ ] 审核接口全部受 `case.share.review` 保护

---

## 13. 当前仍需你拍板的唯一产品点

如果现在要继续往实现推进，最值得先拍板的只有 1 个：

**点赞 / 评论是否进入第一版（MVP）？**

我当前建议：
- **MVP 不带互动**，先把“发 -> 审 -> 公布”主链路上线
- 点赞评论放第二批

这样最稳，也最容易按阶段交付。
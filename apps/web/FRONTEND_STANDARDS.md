# Frontend Standards

本规范适用于 `apps/web` 前端项目中的所有新功能、修复、重构和文档补充。

项目定位是企业内部运营平台，前端代码优先级为：稳定、清晰、可维护、可测试、低回归风险。不要为了炫技、过度抽象或视觉噱头牺牲业务可读性。

## 1. 技术边界

- 框架：Next.js App Router。
- 语言：新增代码默认使用 TypeScript。
- 组件：React 函数组件。
- 样式：优先 CSS Modules，复用现有模块样式和全局设计变量。
- API：所有请求必须经过 `src/shared/api/api-client.ts` 或 feature 内的 service 封装。
- 路由：`app/**/page.tsx` 只负责挂载 feature page，不承载业务逻辑。

## 2. 目录规范

前端采用 feature-based 架构：

```text
apps/web
├── app
├── components
├── public
└── src
    ├── features
    │   └── feature-name
    │       ├── pages
    │       ├── components
    │       ├── hooks
    │       ├── services
    │       ├── constants
    │       ├── types
    │       └── utils
    └── shared
        ├── api
        ├── components
        ├── constants
        ├── hooks
        ├── types
        └── utils
```

放置规则：

- `app`：Next.js 路由入口、layout、metadata。
- `features/*/pages`：页面编排，连接数据、状态和组件。
- `features/*/components`：当前业务域内可复用 UI。
- `features/*/hooks`：当前业务域内状态和副作用编排。
- `features/*/services`：当前业务域 API 请求封装。
- `features/*/constants`：文案、静态选项、业务常量。
- `features/*/types`：当前业务域类型。
- `features/*/utils`：无副作用纯函数。
- `shared/*`：跨两个及以上 feature 复用的能力。
- `components`：历史全局组件目录。新增通用组件优先放到 `src/shared/components`。

禁止把页面、请求、状态、格式化、权限判断全部堆进同一个文件。

## 3. TypeScript 规范

- 新增文件默认使用 `.ts` 或 `.tsx`。
- 公共函数、service 方法、hook 返回值必须声明返回类型。
- 禁止滥用 `any`。确实无法确定外部输入时，优先使用 `unknown` 并在边界处收窄。
- API response、DTO、ViewModel 分层定义，不要让页面直接依赖后端内部实体。
- 可空字段必须显式表达：`string | null` 优于“猜测 optional”。
- 不使用大范围 `as` 断言。优先修正源类型或添加解析函数。
- 类型只在当前 feature 使用时放入 `features/*/types`；跨 feature 使用时提升到 `shared/types`。

推荐：

```ts
export type StoreSummary = {
  id: string;
  name: string;
  status: "open" | "closed";
};

export async function fetchStores(): Promise<StoreSummary[]> {
  return apiClient.get<StoreSummary[]>("/restaurants");
}
```

避免：

```ts
export async function getData(): Promise<any> {
  return apiClient.get("/restaurants");
}
```

## 4. React 组件规范

- 组件只做一个清晰职责。
- Screen/page 负责编排，不承载复杂业务细节。
- 展示组件不直接发请求。
- JSX 中不要写复杂判断、复杂映射或重计算。
- 列表必须使用稳定 `key`。
- 事件处理函数命名表达业务意图，例如 `handleSubmitOrder`、`handleSelectStore`。
- props 数量过多时，优先拆组件或收敛为业务对象。
- 不新增 class component。

页面推荐结构：

```text
1. imports
2. local constants
3. pure helper functions
4. component
5. derived state
6. effects
7. event handlers
8. render branches
9. JSX
```

## 5. Hooks 和状态

- 自定义 hook 必须以 `use` 开头。
- hook 聚焦单一能力，不要把整个页面逻辑塞进一个 hook。
- `useEffect` 必须写完整依赖。
- 异步 effect 必须处理取消、竞态或卸载后的状态更新。
- 本地 UI 状态放组件内。
- 跨组件但限于 feature 的状态放 feature hook 或 feature store。
- 跨 feature 的认证、权限、主题等状态才进入 shared context/store。
- 不要为了少量 props 传递引入全局状态。

## 6. API 和数据流

统一数据流：

```text
app route
  -> feature page
  -> feature component / hook
  -> feature service
  -> shared api client
  -> backend API
```

规则：

- 页面和组件不得直接拼接 `fetch`。
- feature service 负责 endpoint、参数转换、返回结构转换。
- API 错误必须可被页面表达为 loading、empty、error、success 状态。
- service 不处理 UI 文案，不操作 React state。
- 不把后端原始错误直接展示给用户，除非确认安全且适合用户理解。
- 请求参数构造优先使用 `URLSearchParams`。
- 上传请求统一走 `apiClient.upload`。

## 7. 错误、加载和空状态

用户可见页面必须明确处理：

- loading
- empty
- error
- success
- permission denied

错误文案要求：

- 用户文案友好、可操作。
- 内部错误保留调试价值。
- 不暴露 token、SQL、服务器路径、堆栈等敏感信息。
- 不允许空 `catch` 或静默失败。

## 8. 权限和认证

- `/dashboard/**` 受 `RequireAuth` 保护。
- 权限判断优先集中在导航、页面入口或业务动作入口。
- 不在多个组件中散写同一权限字符串判断。
- 权限常量应集中管理。
- 前端权限只负责体验和入口控制，后端仍必须做最终授权。
- 不在 localStorage 存储除既有认证约定外的敏感信息。

## 9. 样式和 UI

- 默认使用 CSS Modules。
- 页面级样式放在 feature 的 `*.module.css`。
- 复用现有颜色、间距、字号、阴影和布局模式。
- 不在 JSX 中大量写 inline style。仅允许非常局部、稳定、不复用的样式。
- 组件尺寸、按钮、表格、卡片、状态标签要保持同一模块内一致。
- 企业后台优先信息密度、扫描效率、明确层级，避免营销式 hero 和装饰性堆叠。
- 文本不能溢出按钮、卡片、表格单元格。
- 移动端和桌面端都必须考虑布局可用性。

## 10. 命名规范

命名必须体现真实业务语义。

推荐：

- `StoresPage`
- `SupplierForm`
- `fetchTrainingMaterials`
- `buildOrderPayload`
- `useRegisterStores`
- `TrainingMaterialSummary`

避免：

- `Common`
- `Manager`
- `Processor`
- `Helper`
- `data`
- `obj`
- `temp`
- `handleThing`

事件函数：

- 用户事件：`handleCreateSupplier`
- 数据转换：`buildSupplierPayload`
- 校验：`validateOrderQuantity`
- 查询：`fetchOrderProducts`

## 11. 文件大小和拆分

默认目标：

- 展示组件：30 到 150 行。
- 页面组件：80 到 250 行。
- hook：30 到 120 行。
- service：20 到 150 行。
- 单文件超过 300 行必须评估拆分。
- 单文件超过 500 行原则上应拆分，除非是纯常量或文案文件。

拆分优先级：

1. 纯 UI 子组件。
2. 业务 hook。
3. service/API 层。
4. 类型和常量。
5. 纯工具函数。

不要为了行数机械拆分，拆分必须让职责更清晰。

## 12. 性能规范

- 不做未经验证的微优化。
- 长列表关注渲染数量、稳定 key 和图片尺寸。
- 昂贵计算使用 `useMemo`，但不要滥用。
- 传给深层 memo 组件的事件函数可使用 `useCallback`。
- 避免重复请求和 effect 循环触发。
- 图片必须设置合理尺寸、懒加载或降级资源。
- 动画必须轻量，不影响表单、表格、上传等核心操作。

## 13. 安全规范

- 不硬编码 token、密码、密钥、生产 API 地址。
- 不提交 `.env*`、数据库备份、真实用户敏感信息。
- 不在 console 输出用户隐私、token、权限详情或后端敏感错误。
- 上传、下载、权限、认证相关改动必须保守处理。
- 用户输入在前端可做体验校验，但不能替代后端校验。

## 14. 测试和验证

有逻辑改动时，至少执行相关验证：

```bash
pnpm --filter @zhao/web typecheck
pnpm --filter @zhao/web lint
pnpm --filter @zhao/web build
```

关键业务建议补测试：

- 登录、注册、退出。
- 权限可见性。
- 订单创建。
- 供应商编辑。
- 培训资料上传、删除、播放。
- loading、empty、error 状态。

不得声称测试通过，除非实际执行。

## 15. 迁移策略

当前项目允许渐进式 TypeScript 迁移：

- 新增代码必须使用 TypeScript。
- 修改旧 JS 文件时，如果改动超过局部修复，优先迁移为 TS/TSX。
- 先迁移 shared、services、types、hooks，再迁移页面。
- 每次迁移保持小步可验证。
- 不为迁移而重写无关业务逻辑。
- 不在一次 PR 中混合大规模格式化、迁移和业务改动。

推荐迁移顺序：

1. `src/shared`
2. `features/*/services`
3. `features/*/types`
4. `features/*/hooks`
5. 小型 components
6. 页面组件
7. 大型历史文件拆分后迁移

## 16. 提交前检查清单

提交前确认：

- 改动范围是否聚焦。
- 是否复用了现有组件、service、hook、类型。
- 是否新增了不必要依赖。
- 是否有未处理 loading、empty、error。
- 是否有权限或认证影响。
- 是否有前后端契约变化。
- 是否执行并如实记录验证结果。
- 是否留下 `console.log`、临时代码或注释掉的大段旧代码。

## 17. 禁止事项

- 禁止页面组件直接访问后端 API。
- 禁止把数据库模型直接当作前端公共类型。
- 禁止新增无业务意义的抽象层。
- 禁止为了“更优雅”大范围重构。
- 禁止无理由批量重命名或格式化。
- 禁止静默吞错。
- 禁止在未确认的情况下修改 CI、部署或环境配置。
- 禁止引入来源不明或未经请求的新依赖。
- 禁止提交临时调试代码。

## 18. Definition of Done

前端任务完成必须满足：

- 与现有架构和风格一致。
- 改动最小且职责清楚。
- TypeScript 类型边界清晰。
- API 调用集中在 service 层。
- 页面状态完整覆盖 loading、empty、error。
- 权限和认证边界未被绕过。
- 无明显安全泄露。
- 已执行可行的验证，或明确说明未执行。
- 输出说明包含修改内容、原因、影响范围、风险点和验证方式。

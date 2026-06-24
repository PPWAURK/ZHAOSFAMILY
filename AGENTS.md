# AGENTS.md

## Objective

在本仓库中进行任何代码生成、修改、重构、修复、测试、文档补充时，必须优先遵守本规范。

本仓库是企业级项目，技术栈为：

- Frontend: NextJS
- Backend: NestJS
- Language: JavaScript

所有改动必须以以下目标为优先：

1. 可读性
2. 可维护性
3. 可测试性
4. 可扩展性
5. 最小改动原则
6. 低回归风险
7. 明确边界和清晰职责

---

## Instruction Priority

当规则冲突时，按以下优先级执行：

1. 用户当前任务要求
2. 本 AGENTS.md
3. 仓库现有代码风格与架构
4. 通用最佳实践

---

## Core Principles

1. 先理解现有实现，再修改代码。
2. 优先最小必要改动，不做无关重构。
3. 优先修复根因，不做表面补丁。
4. 不引入未经请求的新依赖。
5. 不修改与任务无关的文件。
6. 不破坏现有接口，除非任务明确要求。
7. 新代码必须与现有项目风格一致。
8. 所有改动都应尽量可验证。
9. 保持模块边界清晰，避免职责泄漏。
10. 企业级代码优先稳定、清晰、可审查，而不是“聪明”或“炫技”。

---

## Before Coding

在开始实现前，必须先完成以下步骤：

1. 阅读相关文件，理解现有架构和调用链。
2. 确认修改入口、依赖关系、影响范围。
3. 识别当前代码风格、命名方式、目录组织。
4. 优先复用现有组件、hooks、services、DTO、guards、utils。
5. 不重复实现已有能力。
6. 涉及 bug 修复时，先明确 root cause，再改代码。
7. 涉及接口变更时，先确认前后端影响面。
8. 涉及状态管理时，先确认数据流和副作用位置。
9. 涉及数据库或持久化时，先确认 schema、DTO、service、controller 是否一致。
10. 若任务不明确，按最保守、最小影响方案处理。

---

## Output Requirements

完成任务后，输出必须包含：

1. 修改了什么
2. 为什么这么改
3. 影响范围
4. 风险点
5. 验证方式
6. 若未执行测试，明确写：`未执行测试`

不得伪造以下内容：

- 测试通过
- 构建通过
- lint 通过
- 接口已验证
- 运行结果正常

除非这些步骤已经实际执行。

---

## Forbidden Actions

1. 不要臆造不存在的 API、类型、函数、文件、环境变量。
2. 不要擅自扩大需求范围。
3. 不要顺手修 unrelated issue。
4. 不要引入大规模格式化改动。
5. 不要无理由批量重命名。
6. 不要伪造测试或运行结果。
7. 不要提交调试代码、临时代码、注释掉的大段旧代码。
8. 不要保留 `console.log`、`print`、临时埋点，除非任务明确要求。
9. 不要在未确认的情况下修改 CI、部署、环境配置。
10. 不要为了“更优雅”而重构整个模块。
11. 不要新增不必要抽象。
12. 不要把多个职责混进一个函数、class、module。
13. 不要使用宽泛模糊命名，如 `manager`、`handler`、`processor`、`common`，除非该角色真实成立。

---

# General Coding Standards

## Readability

1. 代码必须以“维护者易读”为第一优先。
2. 命名必须语义明确。
3. 逻辑必须直白，避免过度技巧化写法。
4. 复杂逻辑可添加简短注释，但注释应解释“为什么”，不是重复“做了什么”。
5. 尽量使用早返回，避免深层嵌套。
6. 删除无用 import、变量、分支、旧逻辑。

## Maintainability

1. 复用现有模式，不随意创造新范式。
2. 修改应局部化，降低影响面。
3. 常量、枚举、配置集中管理，避免硬编码散落。
4. 所有边界情况必须显式处理。
5. 错误处理必须明确，不允许静默吞错。
6. 对外接口、DTO、返回结构必须保持一致。

## Simplicity

1. 优先简单方案。
2. 不为未来假设需求做过度设计。
3. 不做“为了通用而通用”的抽象。
4. 能用清晰函数解决的问题，不要上复杂继承。
5. 能复用现有模块时，不要新建重复层。

---

# TypeScript Standards

## General

1. 默认使用严格类型思维。
2. 禁止滥用 `any`。
3. 优先精确类型，而不是宽泛联合类型。
4. 公共函数、导出函数、服务层方法必须显式声明返回类型。
5. 参数、DTO、实体、返回值都应有清晰类型约束。
6. 不要滥用 `as` 断言，优先修正源类型。

## Type Design

1. 公共结构优先提取为 `type` 或 `interface`。
2. 类型命名必须体现业务语义。
3. 不要重复定义语义相同但名字不同的结构。
4. DTO、实体、ViewModel、API Response 类型必须分层明确。
5. 不要把数据库模型直接暴露到前端。
6. 不要让前端直接依赖后端内部实体结构。

## Nullability and Optional Fields

1. 可空字段必须显式表达。
2. 可选字段必须有明确业务语义。
3. 不要把“不确定”全部写成可选。
4. 对外部输入必须做空值和类型校验。
5. 调用方不应猜测字段是否一定存在。

---

# Function Standards

## General Rules

1. 每个函数只做一件事。
2. 函数名必须准确表达行为，优先动词开头。
3. 禁止含义模糊命名，例如：
    - `doStuff`
    - `processData`
    - `handleThing`
    - `tempFn`
4. 如果函数需要长注释才能解释用途，优先拆分或重命名。
5. 函数应尽量短小、聚焦、可测试。

## Function Size

1. 单个函数应尽量保持在 20~40 行内。
2. 超过 40~60 行的函数，默认应评估是否拆分。
3. 超长函数通常意味着职责过多。
4. 拆分函数时应按职责拆分，而不是机械按代码块切割。

## Parameters

1. 参数数量应尽量不超过 4 个。
2. 超过 4 个参数时，优先改为对象参数。
3. 布尔参数禁止语义模糊。
4. 不要让调用方依赖参数位置猜测含义。
5. 参数命名必须具体，不要滥用 `data`、`obj`、`payload`，除非上下文非常明确。

## Return Values

1. 返回值必须稳定且可预期。
2. 一个函数不要有时返回对象、有时返回布尔、有时返回 `null`。
3. 查询函数找不到结果时，需遵守统一约定。
4. 失败处理要么抛出明确异常，要么返回结构化失败结果。
5. 不要让调用方猜测返回结构。

## Side Effects

1. 纯函数和副作用函数应尽量分离。
2. 工具函数中不得偷偷写入存储、发请求、打日志。
3. 有副作用的函数必须一眼可识别。
4. 副作用包括：
    - 网络请求
    - 状态修改
    - 数据库写入
    - 文件写入
    - 缓存操作
    - 日志记录

## Control Flow

1. 避免超过 3 层嵌套。
2. 优先使用 early return。
3. 复杂条件应提取为具名变量或独立函数。
4. 不要把多段独立业务判断堆进一个函数里。

## Error Handling

1. 不允许空 `catch`。
2. 不允许吞错。
3. `catch` 中必须重新抛出、返回结构化结果，或记录必要上下文后继续抛出。
4. 错误信息必须可定位，不要只写 `Something went wrong`。

## Async Functions

1. 统一优先使用 `async/await`。
2. 不要混用 `then/catch` 和 `async/await`。
3. 所有异步流程必须处理失败路径。
4. 可并行时使用 `Promise.all`，但不能牺牲可读性与错误控制。
5. 异步函数命名必须表达行为，例如：
    - `fetchUserProfile`
    - `saveDraft`
    - `uploadImage`

---

# Class and Module Standards

## Core Principles

1. class 必须有单一核心职责。
2. 若无状态、无生命周期、无封装必要，优先使用函数或模块，而不是 class。
3. 不要创建 God Class。
4. 不要用 class 充当“命名空间”。

## Class Size

1. 单个 class 建议控制在 50~200 行。
2. 超过 200 行应评估拆分。
3. 超过 300 行通常应拆分。
4. 超过 500 行原则上视为不合格设计，除非有明确理由。

## Method Count

1. 单个 class 的公开方法建议不超过 10 个。
2. 当公开方法超过 7~10 个时，应评估职责是否过多。
3. 私有方法过多也说明内部复杂度过高，应重新设计结构。

## Constructor Rules

1. constructor 只负责依赖注入和轻量初始化。
2. constructor 中禁止：
    - 发请求
    - 写数据库
    - 复杂业务逻辑
    - 大量分支判断
3. constructor 参数过多时，必须评估是否依赖过多或职责过大。
4. constructor 参数超过 4 个时，默认需要审查设计。

## Fields and State

1. 实例字段必须尽量少。
2. 字段超过 5~8 个时，应评估状态复杂度。
3. 尽量减少可变状态。
4. 不要通过隐式共享状态制造方法间耦合。

## Inheritance

1. 优先组合，谨慎继承。
2. 继承层级超过 2 层时，必须评估是否可改为组合。
3. 子类不得破坏父类语义。
4. 为少量代码复用而引入复杂继承是禁止的。

## Module / File Size

1. 单文件建议聚焦单一核心概念。
2. 超过 300 行的文件应评估拆分。
3. 超过 500 行的文件通常应拆分。
4. 不要把 types、service、constants、UI、helpers、DTO 全写进一个文件。

## Hard Limits

1. 非特殊情况，禁止新增超过 300 行的 class。
2. 非特殊情况，禁止新增超过 500 行的单文件。
3. 非特殊情况，单个 class 的公开方法不得超过 10 个。
4. 如超过上述限制，必须在输出中明确说明原因。

---

# Architecture Standards

## Layering Principles

系统必须维持清晰分层，不允许跨层混乱调用。

### Frontend Recommended Layers

- screens
- components
- hooks
- services / api
- store / state
- utils
- types
- constants

### Backend Recommended Layers

- controller
- dto
- service
- repository / data access
- entity / schema
- guards
- interceptors
- filters
- modules

## Separation of Concerns

1. UI 只负责展示和交互，不承载过重业务逻辑。
2. hooks 负责前端状态和副作用编排。
3. services 负责请求封装或业务编排，不负责 UI。
4. controller 保持薄，负责接收请求和返回响应。
5. NestJS service 负责业务逻辑。
6. repository / data access 负责持久化访问。
7. DTO 负责输入输出约束，不承载业务逻辑。
8. validator 不负责持久化。
9. mapper 不负责发请求。
10. 不允许 controller 直接写复杂业务逻辑。
11. 不允许 screen 直接拼接复杂接口逻辑。

---

# Frontend Standards (React Native)

## General Principles

1. 使用函数组件。
2. 禁止新增 class component，除非项目已有强制约束。
3. 组件应单一职责。
4. Screen 负责页面编排，不要塞满业务细节。
5. 可复用 UI 应提取到 components。
6. 重逻辑应提取到 hooks、services、utils。

## Component Design

1. 组件必须边界清晰。
2. 展示型组件与业务型组件尽量分离。
3. 组件 props 必须明确、收敛。
4. 不要把过多状态提升到无必要的上层。
5. 不要制造过深 props drilling；但也不要为小问题引入过度全局状态。

## JSX Rules

1. JSX 内不要写重逻辑。
2. 复杂判断提取为具名变量或函数。
3. 列表渲染必须提供稳定 `key`。
4. 不要在 JSX 里内联复杂匿名函数。
5. 不要在 render 中做重计算。

## State Management

1. 本地状态优先放本地。
2. 跨页面共享状态才考虑全局状态。
3. UI 状态、服务端状态、表单状态应尽量分离。
4. 不要把所有数据塞进全局 store。
5. 状态结构命名必须反映业务语义。

## Hooks

1. 自定义 hook 必须以 `use` 开头。
2. hook 应围绕单一能力封装。
3. hook 内不要堆积整个页面全部逻辑。
4. `useEffect` 必须有正确依赖。
5. 需要清理的副作用必须显式清理。
6. 注意异步竞态、重复请求、卸载后更新状态等问题。

## Networking

1. 所有 API 请求必须统一封装。
2. 不要在多个 screen 中重复写相同请求逻辑。
3. 请求错误必须统一处理策略。
4. loading、empty、error 状态必须明确。
5. Token、认证头、刷新逻辑必须集中管理。

## Forms

1. 表单状态管理必须清晰。
2. 校验规则必须集中化，不要散落在各个 onChange 中。
3. 提交逻辑、校验逻辑、展示逻辑应适当分离。
4. 禁止把后端错误直接原样展示给用户，除非明确安全。

## Navigation

1. 路由参数必须类型明确。
2. 页面跳转参数必须可预测、可追踪。
3. 不要通过隐式全局变量传页面关键数据。
4. 页面初始化逻辑不能过度依赖导航副作用。

## Styling

1. 样式必须一致，遵循项目现有设计体系。
2. 复用设计 token、颜色、间距、字号常量。
3. 不要在页面中到处硬编码颜色和尺寸。
4. 避免重复样式对象。
5. 可复用样式抽离，但不要过度抽象。

## Performance

1. 避免不必要重渲染。
2. 列表必须关注性能和 key 稳定性。
3. 重计算使用 `useMemo`，事件回调根据实际需要使用 `useCallback`。
4. 不做未经验证的过度优化。
5. 图片、长列表、频繁更新区域必须关注渲染开销。

## Frontend Error Handling

1. 所有网络请求必须有失败处理。
2. 屏幕级别必须能表达 loading / empty / error。
3. 用户可见错误文案应友好。
4. 内部错误信息应保留调试价值。
5. 不得静默失败。

---

# Backend Standards (NestJS)

## General Principles

1. NestJS 必须遵循模块化设计。
2. controller 保持薄。
3. service 负责业务逻辑。
4. repository / data access 负责持久化。
5. DTO 负责输入输出约束。
6. entity / schema 只表达持久化模型，不承载复杂业务。
7. 不要在 controller 中写复杂逻辑。
8. 不要让 service 既做编排又做所有细节转换、校验、持久化、日志。

## Controller Rules

1. controller 只负责：
    - 接收请求
    - 参数解析
    - 调用 service
    - 返回响应
2. controller 不直接访问数据库。
3. controller 不写复杂条件编排。
4. controller 中不要出现大段业务处理。

## Service Rules

1. service 只负责业务逻辑。
2. service 应聚焦某个业务域。
3. service 之间依赖必须克制，避免循环依赖。
4. service 不要吞并 repository、mapper、validator 的职责。
5. service 返回值结构必须稳定明确。

## DTO Rules

1. 所有入参必须使用 DTO。
2. DTO 字段命名要清晰。
3. DTO 只做数据结构约束和验证。
4. DTO 中不写业务逻辑。
5. 更新 DTO、创建 DTO、查询 DTO 应分离，不要混用。
6. 输入 DTO 和输出 ViewModel 尽量不要混为一体。

## Validation

1. 所有外部输入都必须验证。
2. 参数校验必须靠 DTO / pipes / validator 实现。
3. 不要相信客户端传入数据。
4. 错误响应必须明确指出输入问题，但不能泄露敏感信息。

## Repository / Data Access

1. repository 负责数据访问。
2. repository 不承载复杂业务规则。
3. repository 方法命名必须反映查询意图。
4. 不要把数据库细节泄露到 controller。
5. 不要在多个 service 重复写相同查询逻辑。

## Exception Handling

1. 所有后端错误必须明确分层处理。
2. 使用 NestJS exception/filter 保持一致性。
3. 不要直接把底层错误原样暴露给客户端。
4. 错误日志和用户响应要区分。
5. 业务异常与系统异常要区分。

## Authentication and Authorization

1. 鉴权与授权逻辑必须明确分离。
2. 使用 guards 处理权限边界。
3. 不要在 controller 或 service 中到处散写权限判断。
4. Token、session、用户上下文处理必须统一。

## Logging

1. 日志必须有业务价值。
2. 不记录敏感数据。
3. 不刷屏。
4. 错误日志必须保留定位上下文。
5. 普通成功路径不做冗余日志。

## Transactions

1. 涉及多步写操作且需一致性时，必须评估事务。
2. 不要在 service 中分散执行可能导致半成功的写操作而不说明策略。
3. 事务边界必须清晰。

## Caching

1. 缓存必须明确 key 规则、失效策略、适用范围。
2. 不要偷偷引入缓存导致数据不一致。
3. 缓存逻辑必须可追踪、可维护。

## API Response Design

1. API 返回结构应统一。
2. 成功、失败、分页结构必须保持一致风格。
3. 不要让前端猜测某接口字段风格。
4. 不要把内部数据库字段直接暴露为公共 API 契约，除非已明确约定。

---

# Naming Standards

## General

1. 名称必须表达真实职责。
2. 避免模糊泛化名。
3. 禁止无语义缩写，除非领域内通用。

## Recommended Naming

- `UserService`
- `CreateOrderDto`
- `FeedRepository`
- `validateCoupon`
- `buildUploadPayload`
- `useNotificationSettings`
- `ProfileScreen`
- `OrderListItem`

## Avoid Naming

- `CommonUtil`
- `DataManager`
- `HandleService`
- `Processor`
- `Helper`
- `TmpData`
- `misc`

---

# Security Standards

1. 永远不要硬编码密码、token、密钥、证书。
2. 不要记录敏感信息到日志。
3. 不要信任客户端输入。
4. 上传、鉴权、支付、执行命令、文件读写等高风险逻辑必须保守处理。
5. 后端错误响应不得泄露内部堆栈、SQL、密钥、路径等敏感信息。
6. 前端本地存储敏感信息时必须遵循项目安全约定。
7. 不要引入来源不明依赖。
8. 不要为了调试而降低安全边界且不恢复。

---

# Testing Standards

## General

1. 有现成测试体系时，必须沿用现有测试风格。
2. 修改逻辑时，优先补充或更新相关测试。
3. 至少考虑以下场景：
    - 正常路径
    - 边界条件
    - 失败路径
4. 不得声称测试通过，除非实际执行过。

## Frontend Testing

1. 组件测试关注：
    - 渲染状态
    - 用户交互
    - loading / empty / error
2. hooks 测试关注：
    - 状态流转
    - 副作用
    - 异步边界
3. 不要写与实现细节强耦合的脆弱测试。

## Backend Testing

1. service 测试关注业务逻辑。
2. controller 测试关注接口行为。
3. repository 测试关注数据访问正确性。
4. 认证、权限、异常路径必须有覆盖策略。
5. 涉及关键业务时，优先补集成测试或 e2e 测试。

---

# Performance Standards

1. 不做未经验证的性能优化。
2. 发现明显性能问题时可修复，但改动必须可控。
3. 避免重复请求、重复渲染、重复计算。
4. 前端关注：
    - 列表性能
    - 图片处理
    - 渲染频率
    - 不必要的 re-render
5. 后端关注：
    - N+1 查询
    - 无索引查询
    - 重复计算
    - 冗余序列化
    - 高频接口吞吐
6. 不要为了微优化牺牲可读性。

---

# Documentation Standards

1. 公共模块、复杂业务规则、特殊兼容逻辑应适当补充注释。
2. 注释解释“为什么这样做”。
3. 不要写废话注释。
4. 对外 API、复杂 DTO、关键流程应保持文档可追踪。
5. 不要让文档与代码长期不一致。

---

# Refactoring Triggers

出现以下情况时，应评估是否需要拆分或重构：

- 函数超过 40~60 行
- class 超过 200~300 行
- 文件超过 300~500 行
- class 公开方法超过 10 个
- constructor 参数过多
- 实例字段过多
- screen 同时处理 UI、请求、表单、权限、缓存、转换
- controller 中出现复杂业务逻辑
- service 同时处理验证、映射、持久化、权限、缓存、日志
- 多处复制粘贴相似代码
- 测试困难
- 命名开始泛化为 `manager`、`processor`、`helper`

---

# Practical Size Guidelines

## Functions

- 推荐：10~30 行
- 可接受：30~40 行
- 超过 40~60 行：应评估拆分

## React Native Components

- 展示型组件：建议 30~150 行
- Screen：建议 80~250 行
- 超过 300 行：应评估拆分 UI / hook / helpers

## NestJS Controllers

- 建议保持轻量，通常不应超过 150 行
- 超过 200 行：应评估是否职责泄漏

## NestJS Services

- 建议 80~200 行
- 超过 250~300 行：通常应评估拆分

## Files

- 推荐：小于 300 行
- 300~500 行：警戒区
- 超过 500 行：原则上应拆分

> 上述阈值是默认设计警戒线，不是绝对死规则。超过阈值时，必须先审查职责边界，再决定是否保留。

---

# Definition of Done

只有满足以下条件，任务才算完成：

1. 改动与现有项目风格一致
2. 改动范围最小且聚焦
3. 无明显未处理异常路径
4. 类型约束清晰
5. 关键逻辑有验证方式
6. 输出说明清楚，不夸大结果
7. 未引入无关副作用
8. 未破坏架构边界
9. 前后端契约保持一致或已明确说明变更

---

# Preferred Workflow

执行任务时遵循以下顺序：

1. 阅读相关代码
2. 总结当前实现方式
3. 识别问题根因或实现策略
4. 做最小必要改动
5. 检查影响范围
6. 检查类型与边界情况
7. 执行相关测试 / lint / 构建（如可用）
8. 输出变更说明与验证结果

---

# Final Enforcement

在本仓库中生成代码时，必须始终遵循以下原则：

- 小函数
- 小模块
- 小而清晰的 class
- 明确分层
- 最小改动
- 严格类型
- 清晰边界
- 明确错误处理
- 易读优先
- 可测试优先
- 企业级稳定性优先

如某次实现必须违反本规范，必须在结果中明确说明：

1. 违反了哪条规范
2. 为什么无法避免
3. 风险是什么
4. 后续可如何拆分或修正

<claude-mem-context>
# Memory Context

# [zhao-family] recent context, 2026-06-24 3:09pm GMT+2

No previous sessions found.
</claude-mem-context>
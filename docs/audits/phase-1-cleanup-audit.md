# Phase 1 Cleanup Audit

Date: 2026-06-04
Branch: cleanup-prepare-deploy

## Summary

本阶段只处理本地清理、风险审计和 GitHub 推送准备，不开发新功能，不执行目录重构、部署配置或 CI/CD 改造。

当前项目是 pnpm workspace monorepo，包含 `apps/backend`、`apps/web`、`apps/mobile` 和 `packages/*`。本地工作区存在大量未提交改动，且运行时数据、生成目录、重复素材和源码改动混在一起，直接提交会增加审查难度和生产风险。

## Issues

| Risk | Problem | Evidence | Recommendation |
| --- | --- | --- | --- |
| P1 | 本地运行数据和工具缓存未统一忽略 | `.codex/`、`.pnpm-store/`、`apps/backend/uploads/`、`apps/mobile/.bundle/`、`apps/mobile/vendor/` 曾出现在未跟踪列表 | 已补充根 `.gitignore`，避免运行时数据和本地缓存进入 Git |
| P1 | 数据库备份文件残留在仓库目录 | `webapp2026.sql`、`backups/webapp2026-current-20260526-104953.sql` 存在于工作区 | 已通过 `.gitignore` 忽略 SQL/backup 类文件；正式迁移应使用受控备份目录，不进入源码仓库 |
| P1 | 后端目录包含大量重复品牌静态素材 | `apps/backend/assets` 与 `apps/web/public`、`apps/mobile/assets` 重复，约 72MB | 已清理 backend 重复素材，仅保留订单 PDF 当前依赖的最小文件 |
| P1 | 当前 Docker/MySQL 配置与实际本地运行实例不一致 | `docker-compose.yml` 使用 `zhao_family:3307`，后端 `.env` 使用 `webapp2026:3306` | 第二阶段或第四阶段统一环境变量与 compose，本阶段只记录风险 |
| P1 | 缺少 GitHub Actions 工作流 | `.github/workflows` 不存在 | 第六阶段补充 PR 检查、build、typecheck、deploy workflow |
| P2 | Web 存在 JS 到 TS/TSX 迁移残留 | 多个 `.js` 文件删除，同时新增同名 `.ts/.tsx` 文件 | 本阶段保留迁移结果，验证 typecheck；后续检查 import 路径和 tsconfig |
| P2 | Mobile 原生目录属于生成产物还是源码尚未制度化 | `apps/mobile/ios`、`apps/mobile/android` 当前未跟踪 | 本阶段按 Expo prebuild 产物忽略；若后续需要原生定制，再重新制定版本管理规则 |
| P2 | 依赖版本存在潜在不一致 | Web 使用 TypeScript 6 RC 风格版本，backend/mobile 使用 TypeScript 5.9 | 第三阶段执行依赖审计，不在本阶段直接调整 |
| P2 | Backend 订单 PDF 对本地 asset 路径有隐式依赖 | `OrdersDocumentService` 查找 backend assets 下的 logo 和 watermark | 本阶段保留最小必需素材；后续建议将 PDF 静态资源路径显式配置化 |

## Completed In This Phase

- 创建清理分支 `cleanup-prepare-deploy`。
- 更新根 `.gitignore`，覆盖本地运行数据、数据库备份、工具状态、Expo 生成目录和移动端本地依赖缓存。
- 清理 `apps/backend/assets` 重复素材，仅保留：
  - `apps/backend/assets/ZHAO-元素element/logo/2-01.png`
  - `apps/backend/assets/logo2024/logo水印.jpg`
- 保留 `.env`、`.env.local` 为本地文件，不纳入 Git。
- 保留现有业务代码改动，不做功能扩展。

## Next Phases

- 第二阶段：目录结构审计，明确 shared code、types、services、hooks、stores 的边界。
- 第三阶段：依赖审计，输出 `pnpm remove` 建议和版本统一方案。
- 第四阶段：统一 `.env.example` 命名规范，区分 backend、web、mobile 的 public/private 变量。
- 第五阶段：设计 Ubuntu 24.04 生产部署结构，包括 Docker Compose、Nginx、HTTPS 和自动重启。
- 第六阶段：补充 GitHub Actions，实现 PR 检查、构建检查、typecheck、lint 和自动部署。

# 部署硬化计划（Deployment Hardening Plan）

> 目标：把后端部署从"服务器上现编译 + PM2"升级为**不可变镜像 + 容器化 + 有安全网**的专业形态，
> 同时保住这套 legacy MySQL 库的安全策略（人工迁移）。范围 = **B 档**（安全网 + Docker 化后端）。
>
> 背景与拓扑见 [deployment.md](./deployment.md)。本计划因 2026-07-09 的一次生产事故而起
> （重启后 PM2 未自启导致 10h 502；且代码超前于 schema 造成过崩溃）。

## 0. 决策（已确认）

| 项 | 决定 |
| --- | --- |
| 范围 | **B**：安全网 + 后端 Docker 化（不做 staging/蓝绿） |
| 迁移策略 | **人工迁移**；CI 只做**漂移检测**，检测到待处理迁移就**挡下部署**（旧容器继续跑），提示手动 `db:deploy`。绝不 `migrate dev`。 |
| 告警 | **邮件**（复用已有 `BREVO_API_KEY`） |
| 拓扑 | **统一一台 prod** = `152.228.137.101` / `api.zhaosfamily.com`；**下线并回收**旧机 `vps-de782b8a` / `api.zhaoplatforme.com` |
| 触发方式 | **ZHAO Monitor 一键部署**（已拆到独立仓库 `zhao-monitor`）：其 "Deploy Backend" 按钮跑 `gh workflow run deploy-backend.yml`（workflow_dispatch）。部署引擎仍是该 workflow，Monitor 只是本地触发 UI。 |

## 1. 目标 / 非目标

**目标**
- 构建可复现：镜像在 CI 构建一次，生产只"拉起来跑"，不再在服务器上 `git pull && build`。
- 秒级、确定的回滚：回滚 = 换回上一个镜像 tag。
- 开机自愈：容器 `restart: always`，重启不再宕机。
- 部署有健康门：应用没起来 CI 变红并自动保留旧版本，不"假绿"。
- schema 不被代码超前：迁移漂移检测挡住不同步的发布。
- 出事有人知道：邮件告警。
- 拓扑唯一、有文档。

**非目标（本轮不做）**
- Kubernetes / 编排器 / 服务网格。
- staging 预发环境、蓝绿/金丝雀（C 档，后续按需）。
- 动 MySQL / MinIO 容器和其中的生产数据（只连接，不重建）。
- 改 web（静态导出 + SFTP）和 mobile（EAS）的发布方式。

## 2. 目标架构（B）

```
GitHub push(main, backend paths)
      │
      ▼
GitHub Actions
  1) build 多阶段 Docker 镜像  →  推送 GHCR (ghcr.io/ppwaurk/zhao-backend:<sha>, :latest)
  2) SSH 到 prod:
       - 迁移漂移检测（只读）→ 有 pending 就 abort
       - docker compose pull && up -d（换成新镜像）
       - 健康门：curl /api/health 重试，失败则回滚到上一个 tag
      │
      ▼
prod VPS (152.228.137.101)
  ┌─ nginx (/api → 127.0.0.1:3002) ── 已有，不变
  ├─ backend 容器 (restart: always, network_mode: host, env_file=apps/backend/.env)
  ├─ zhao-family-mysql 容器 (:3310) ── 已有，不动数据
  └─ zhao-family-minio 容器 (:9010) ── 已有
```

关键取舍：
- **网络**：后端容器用 `network_mode: host`，这样 `DATABASE_URL`（127.0.0.1:3310）和 nginx→127.0.0.1:3002 **完全不用改**，改动面最小。代价是隔离性略低（单机可接受）。备选：把后端并入 mysql 所在 docker 网络、用容器名做 host——更干净，但要改 `DATABASE_URL` 且动到 mysql 容器网络，本轮不做。
- **密钥**：`apps/backend/.env` 留在服务器上，用 compose `env_file` 挂进容器，**绝不打进镜像**。
- **镜像仓库**：GHCR（对私有 repo 免费）。生产机需 `docker login ghcr.io`（一个 read:packages 的 PAT，配一次）。

## 3. 分阶段实施

### Phase 0 — 前置与安全网（0.5 天）
- [ ] 每次动 prod 前 `mysqldump` 备份（已有脚本模式，见事故记录）。
- [ ] 确认生产机已装 `docker compose` v2（`docker compose version`）。
- [ ] 在 GitHub 配置：GHCR 权限（`packages: write`）、`DEPLOY_*` secrets 复用现有。
- [ ] 生产机 `docker login ghcr.io`（一次性，用 read PAT）。

### Phase 1 — Docker 化后端（1–2 天）✅ 已完成并实测
- [x] 写 `apps/backend/Dockerfile`（多阶段，base=runtime=`node:22-bookworm-slim` 使 Prisma native engine 匹配）。
- [x] 写 **`docker-compose.backend.yml`**（`restart: always`、`network_mode: host`、`env_file: apps/backend/.env`、容器 healthcheck）。**故意不叫 `docker-compose.prod.yml`** —— 生产机上那个名字已被**基础设施 compose**（管理 `zhao-family-mysql` 容器）占用,绝不能覆盖,否则误 `compose down` 会停掉生产库。后端 compose 只管后端容器,与基础设施 compose 完全分离。
- [x] 查清 **MinIO 实为 Cloudflare R2**（`*.r2.cloudflarestorage.com:443`,S3 兼容,出站 HTTPS）—— 容器与 PM2 走法一致,**非问题**。
- [x] 在旧机 `vps-de782b8a`（有 Docker、后端已停、自带 mysql）**真构建 + 冒烟测试通过**：镜像约 1GB，容器启动后 `/api/health` = 200，Prisma client 正常。

**Phase 1 踩到的两个坑（一个已修，一个留给 Phase 3）：**
1. **`pnpm deploy --prod` 不带生成好的 Prisma client** → 容器启动报 `@prisma/client did not initialize`。修法：deploy 之后在裁剪产物里用构建阶段的 prisma CLI **重新 `prisma generate`**（已写进 Dockerfile）。
2. **服务器 `apps/backend/.env` 的值带双引号**（`DATABASE_URL="..."`）。`docker run --env-file` / 部分 compose 版本不会剥引号,会把引号当值 → Prisma 解析失败。冒烟测试里临时用 `sed` 剥引号绕过。**Phase 3 落地时要固化**：要么部署时生成剥引号的 env 注入容器,要么把服务器 `.env` 改成无引号。

### Phase 2 — CI 改造（1 天）✅ 已写完，待首次真跑验证
- [x] `deploy-backend.yml` 全量重写：**build job**（`docker/build-push-action` → GHCR `:<sha>` + `:latest`，gha 缓存）+ **deploy job**（scp compose → SSH：GHCR 登录（run-scoped `GITHUB_TOKEN`，免存 PAT）→ pull → 漂移门 → up -d → 健康门 → 失败回滚上一个 tag）。
- [x] **workflow_dispatch only**（去掉 push 自动部署）；保留 `apply_migrations` 输入（勾选时先自动 mysqldump 再 `migrate deploy`）。
- [x] ZHAO Monitor：`部署后端` 旁加 `apply_migrations` 勾选框；`fireBackend()` + `runGH` 透传 `--field`（Swift typecheck 通过）。工具已拆到独立仓库 `zhao-monitor`，需在该仓库运行 `./build.sh` 重打包 App 才生效。
- [x] 漂移门/迁移用运行镜像内的 prisma CLI（Dockerfile 已加 `npm i -g prisma@6.19.3`；旧机实测 `prisma migrate status` = up to date）。
- [x] **部署脚本逻辑已在旧机端到端预演通过**（用本地镜像模拟 compose 部署，不碰 GHCR/真生产）：漂移门=up to date ✅、happy-path up→health 200 ✅、坏镜像→健康门失败→**回滚到上一个 tag→恢复 200** ✅。预演中发现并修复：`docker compose run` 需加 `-T`（否则占 TTY/吞 stdin），已同步进 workflow。
- [ ] **仍待真跑验证（只能通过一次真实 Actions run）**：GHCR 推送/私有包创建、两 job 串联、生产机 GHCR 登录拉取。建议 Phase 3 切换后，首跑用 ZHAO Monitor 触发并盯 Actions。

> ⚠️ **顺序**：新 workflow 用 `docker compose` 起容器占 3002，而真生产现在仍是 **PM2** 占 3002。**必须先做 Phase 3 切换**（停 PM2 → 首次 compose up）再让这个 workflow 打真生产,否则首跑会端口冲突、健康门失败（PM2 不受影响，workflow 变红回滚，属安全失败但很乱）。

### Phase 3 — 生产切换 ✅ 已完成（2026-07-09，停机 ~3 秒）
- [x] 备份 DB（`~/backups/precutover_*.sql.gz`）。
- [x] 生产机**无 buildx** → Dockerfile 去掉 `--mount=type=cache`（传统 builder 也能构建；CI 层缓存走 gha 不受影响）；首次在生产机本地构建镜像 `:cutover`（含 f72922a 代码，与原 PM2 同一份，仅换运行方式）。
- [x] 停 PM2 → `docker compose -f docker-compose.backend.yml up -d` → 健康门 200（downtime ~3s）→ `pm2 delete zhao-family-backend` + `pm2 save`。
- [x] 验证:公网 health/restaurants 200、badges 401、CORS 204；容器 `Up (healthy)`、`restart: always`、docker 开机自启 → 重启自恢复。
- [ ] **仍待做**:提交并推送本批改动;然后用 ZHAO Monitor 触发一次**真 workflow 部署**,验证 GHCR 全链路(会把本地 `:cutover` 镜像换成 GHCR `:<sha>` 镜像）。

### Phase 4 — 邮件告警（0.5 天）
- [ ] 探活：优先外部 SaaS（UptimeRobot/Healthchecks.io 免费版）打公网 `https://api.zhaosfamily.com/api/health`，异常发**邮件**。（外部探活能发现整机/网络故障，比机内 cron 更可靠。）
- [ ] 兜底（可选）：生产机 cron 每分钟自检 `/api/health`，连续失败用已有 Brevo 发邮件。
- [ ] 演练：手动停一次容器，确认收到邮件；恢复。

### Phase 5 — 拓扑收敛与文档（0.5 天）
- [ ] 旧机 `vps-de782b8a`：已 `pm2 stop`；确认无流量后**彻底下线**（停容器 / 回收实例），或明确保留用途并写清。
- [ ] 更新 [deployment.md](./deployment.md)：唯一 prod = `152.228.137.101` / `api.zhaosfamily.com`，容器化后的部署/回滚/迁移步骤。
- [ ] 记录镜像仓库、回滚命令、告警配置。

## 4. 迁移处理（人工 + 漂移门）

- 日常：schema 变更**人工**在生产跑 `pnpm db:deploy`（或 `docker compose run --rm backend pnpm db:deploy`），**迁移前先 mysqldump**。
- CI：每次部署做**只读漂移检测**，`prisma migrate status` 不是 "up to date" 就**挡下部署**（旧容器继续服务），避免代码超前于 schema。
- 破坏性变更遵循**扩展-收缩**（expand-contract）：加可空列 → 双写代码 → 回填 → 切读 → 删旧列，每步向后兼容，永不在同一次发布引入"代码需要但库还没有"的断裂。
- 例外通道：`workflow_dispatch` 手动触发并勾 `apply_migrations=true` 时，才在部署中自动 `db:deploy`（且先备份）。

## 5. 回滚

- 代码：`docker compose` 把 image tag 换回上一个 `:<sha>` 再 `up -d`（秒级）。
- 迁移：迁移前的 `mysqldump` 是还原点；破坏性变更靠 expand-contract 尽量做到"旧代码也能跑"从而免于回滚 DB。

## 6. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 容器连不上宿主的 mysql/minio | 用 `network_mode: host`，地址与端口和现状完全一致，先在旧机验证 |
| Prisma engine 与基础镜像不匹配 | Dockerfile 里设 `binaryTargets`，构建后在容器内跑一次 `migrate status` 验证 |
| GHCR 拉取鉴权 | 生产机一次性 `docker login`；镜像可设私有 |
| 切换期短暂抖动 | 低峰操作；容器验证通过再摘 pm2；健康门 + 可秒级回滚 |
| 破坏性迁移 | 人工 + 漂移门 + 备份 + expand-contract（见 §4） |

## 7. 工期与顺序

Phase 0 → 1 → 2 →(旧机上先验证 1/2)→ 3 → 4 → 5。总计约 **3–6 天**（含验证与观察）。
先做 Phase 4 的**外部探活告警**也可提前插队（10 分钟即可，先防下次静默宕机）。

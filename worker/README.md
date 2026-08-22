# 下载网关 Worker（windinput-dl）

给 `dl.windinput.com` 的安装包下载加上**下载计数**与**线路分流**。

- `GET /WindInput-*` —— 是安装包则计数 +1，然后 **302** 到实际出口：已登记镜像 → 国内网盘直链；否则 → R2 公共域。
- `GET /api/stats` —— 返回 `{ total, versions, platforms, sources }`，供文档站下载页展示。数据落 D1，读走边缘缓存（≤5 分钟延迟）。
- Cron（每 10 分钟）—— 探活镜像，连续 2 次失败自动下线回落 R2。

对外的下载 URL 与文件名**始终不变**，文档站与 `latest.json` 无需改动。

## 架构

```
                    ┌─ /WindInput-*  ─► Worker ─┬─ 有镜像 ─► 国内网盘直链
dl.windinput.com ───┼─ /api/*        ─► Worker  └─ 否则   ─► r2.windinput.com
                    └─ latest.json…  ─► R2 直连（不唤起 Worker）

r2.windinput.com ──► R2 自定义域 + Cache Rule（边缘缓存，命中后不回源）
```

## 多平台

产物命名口径集中在 `src/env.ts` 的 `ARTIFACTS` 一处，**新增平台只需加一行**，计数、分流、镜像三处自动跟上：

| 对象名 | platform | 是否推 R2 |
|---|---|---|
| `WindInput-Setup-<版本>.exe` | `windows` | 是 |
| `WindInput-<版本>-macOS.pkg` | `macos` | 是 |
| `WindInput-Portable-<版本>.zip` | `windows-portable` | **否**，只发 GitHub Releases |

便携版规则是预留的：目前主仓 CI 不把它同步到 R2，所以永远匹配不到，留着是为了将来要上时零改动。

不匹配任何一条的对象（`WindInput-<版本>-Release.md`、`.sha256`）不计数、不查镜像，直接 302 回 R2。两个平台的升级元数据 `latest.json` / `latest-mac.json` 不以 `WindInput-` 开头，连 Worker 都不进，仍走 R2 直连。

macOS 与 Windows 共用同一个 `wind-setting` 的下载器（`Artifact::Exe` / `Artifact::Pkg` 按编译目标分支），所以 `redirects(3)`、8MB 分片阈值、`bytes=0-0` 探测这些约束对两个平台完全一致，镜像校验规则通用。

路由用 `WindInput-*` 一条通吃而非逐个列举：macOS 包名与发布说明的前缀无法区分（都是 `WindInput-<版本>-`），而路由模式的尾部扩展名匹配（`*.pkg`）不在官方文档保证内，不值得赌。代价是发布说明与 `.sha256` 也进 Worker 多一跳 302——小文件，相对额度可忽略，换来的是以后加产物不用再改路由。

`downloads` 主键是 `(version, platform)`：Windows 与 macOS 的同一版本是两个包，只按 `version` 记会撞进同一行。`/api/stats` 的 `versions` 仍按版本**跨平台聚合**，所以下载页徽章不受影响。

**Worker 不代理字节流。** 早期版本用 R2 binding 直读对象再写回响应（`env.BUCKET.get()`），看似只是多一跳，实际代价是**绕过了 Cloudflare 边缘缓存**——in-Worker 的 R2 API 直连存储，于是每个用户、每次下载、每个分片都在跨洋回源同一个 20MB 文件。改成 302 之后，字节流交给配了 Cache Rule 的 R2 公共域（或国内镜像），Worker 只发「票」不扛货。

因此 `wrangler.jsonc` 里**没有 `r2_buckets` 绑定**，这是有意的。

## 镜像管理

手动把安装包传到国内网盘后，用 CLI 登记。**按完整对象名寻址**——镜像是「一个文件 ↔ 一个直链」的映射，与版本/平台无关，Windows 与 macOS 各登记各的：

```bash
cd worker

pnpm mirror ls                                          # 列出所有镜像
pnpm mirror add '<直链>'                                 # 校验并登记，对象名自地址推断
pnpm mirror add '<短链>' WindInput-0.115.1-macOS.pkg     # 推断不出时才补对象名
pnpm mirror on  WindInput-Setup-0.115.1.exe             # 启用
pnpm mirror off WindInput-Setup-0.115.1.exe             # 停用，回落 R2
pnpm mirror rm  WindInput-Setup-0.115.1.exe             # 删除
pnpm mirror check                                       # 只读探活，诊断所有镜像
```

`add` 的对象名通常不用写。地址里（入口，或跟随重定向后的存储地址）能认出完整的安装包文件名就直接采用，`…/5147a68c-…_WindInput-Setup-0.118.0.exe` 这种带上传前缀的也认得：

```bash
pnpm mirror add 'https://www.senluopan.com/f/vQa5UP/WindInput-Setup-0.118.0.exe'
#   ✓ 对象名  WindInput-Setup-0.118.0.exe （自地址推断）
```

只有 `/s/abc123` 这类纯短链才需要补对象名，两个参数不分先后。推断只认已知产物命名，猜不出宁可报错也不瞎登记；万一猜错，登记前的 R2 大小比对也会拦下来。`on`/`off`/`rm` 同样接受直链，省得回头翻文件名。

直链务必用**单引号**包起来，否则其中的 `&` 会被 shell 当作后台运行符号，写进库的 URL 会少半截。

`add` 会把该做的检查全部跑一遍，**任一项不过都不写库**：

| 检查 | 挡住什么 |
|---|---|
| 解析重定向 | 入口不可达 / 最终不是 200 |
| 对象名 | 省略时地址里认不出安装包文件名 → 报错，不猜着写库 |
| 地址稳定性 | 地址带签名与有效期（数分钟后失效）→ 告警但不阻断 |
| Range 支持 | 不返回 206 → 分片下载失效，且一次在线更新会被计成 2 次 |
| 跳数预算 | 客户端跳数超过 `ureq` 的 `redirects(3)` → 在线更新静默失败 |
| 与 R2 比对 | 网盘传的是旧包却按新版本号登记 → 用户升级报 sha256 不匹配，极难排查 |

登记的是**无 Range 请求解析到底后的地址**，不是网盘分享入口。网盘链路通常是「入口 → 302 → S3 网关 →（带 Range 时再 302）→ 真实节点」，存入口会让客户端跳 3 次正好顶满上限；存最终地址既省一跳，又天然停在不带签名的稳定地址上（带 Range 才会跳到带 `X-Amz-Signature` 的临时节点，那种地址不能入库）。

### 安全底线：未登记即回落

发版流程不变——CI 照常推 R2，下载立刻可用。**上传网盘并登记是可选的后置步骤**，任何一步没做，用户只是回到纯 R2 体验，不会遇到「302 到一个还没上传的文件」。

镜像映射在边缘缓存 60 秒，所以任何改动（含停用）**最多 60 秒全球生效**。Cache API 没有全球 purge，这个延迟去不掉。

## 计数口径

只统计「下载起始请求」：无 `Range` 头，或 `Range` 恰好是 `bytes=0-0`（客户端分片前的 1 字节探测）。分段 / 续传不会把一次下载重复计数。**尽力而为的近似值**——不用 Cookie / 指纹，无法按人精确去重。

改成 302 之后这个口径依然成立，但**前提是镜像真的支持 Range**：若探测拿不到 206，客户端会回退单连接再发一个无 Range 请求，一次更新就被计成 2 次。`pnpm mirror add` 的 Range 校验就是为了守住这个前提。

各场景的实际表现：

| 场景 | Worker 收到 | 计数 | Worker 调用数 |
|---|---|---|---|
| 浏览器点击 | 1 个无 Range GET | 1 | 1 |
| 在线更新（>8MB） | `bytes=0-0` 探测 + 4 个分片 Range | 1 | 5 |

在线更新的 5 次调用是客户端 `download_parallel` 每个分片都重新走原 URL 导致的，改 302 前后都是 5 次——区别在于每次从「代理 4.7MB」变成「返回一个 302」。

计数双写：`downloads` 记总量（前端徽章数据源，含历史数据），`download_events` 按 `source`（`mirror` / `r2`）记渠道，用于评估分流效果。两条语句走 D1 `batch`；若 `download_events` 尚未建表，降级为只写 `downloads`。

## 首次部署

前置：本机已 `wrangler login`，且拥有目标 Cloudflare 账号的 R2/D1/Workers 权限。

### 1. Cloudflare 控制台

**a) 新建 R2 公共域**

R2 → `windinput` 桶 → Settings → Custom Domains → Add → `r2.windinput.com`，等状态变 **Active**。

**b) 配 Cache Rule（关键，不做等于白干）**

`.exe` **不在** Cloudflare 默认缓存的扩展名列表里，必须显式配：

Rules → Cache Rules → Create rule

| 项 | 值 |
|---|---|
| 匹配 | Hostname `equals` `r2.windinput.com` |
| Cache eligibility | Eligible for cache |
| Edge TTL | Ignore cache-control header and use this TTL → 1 month |
| Browser TTL | 4 hours |

Edge TTL 敢设 1 个月，是因为 URL 带版本号、内容不可变；旧版本被 CI 删除后不会再有人请求，缓存自然过期，无需 purge。

验证**必须用 GET**——`HEAD` 请求恒返回 `cf-cache-status: DYNAMIC`，用 `curl -I` 会得到「规则没生效」的错误结论：

```bash
curl -s -o /dev/null -D - https://r2.windinput.com/WindInput-Setup-<版本>.exe | grep -i cf-cache-status
# 第一次 MISS，第二次 HIT
```

**c) `dl.windinput.com` 保持现状**：R2 自定义域底座 + 下面两条 Worker 路由，不要改动。

### 2. 部署

```bash
cd worker
# 用 --ignore-workspace：本目录不是根 pnpm workspace 成员，需独立安装自己的依赖
pnpm install --ignore-workspace

wrangler d1 create windinput-downloads   # 首次；把 database_id 填进 wrangler.jsonc

# 已有生产数据的库先迁移（downloads 主键 version → (version, platform)），只跑一次。
# 执行前会自动把 downloads 全表导出到 .backups/ —— D1 没有快照，出事只能靠它。
pnpm db:migrate:remote
pnpm db:init:remote                      # 建表（含 mirrors / download_events）

pnpm deploy
```

### 为什么数据库操作都走 scripts/d1.mjs

两个坑，都踩过，改回去会立刻复现：

1. **不用 `wrangler d1 execute --file`**。它走 D1 的 **import** 端点（为支持大文件做暂存上传），与 `--command` 的 **query** 端点授权路径不同。OAuth token 即使有 `d1 (write)`，import 端点仍可能报 `Authentication error [code: 10000]`。所以 `d1.mjs` 把 .sql 读进来拆成语句，逐条用 `--command` 发。
2. **不 spawn `npx.cmd`**。Node ≥ 20.12.2 因 CVE-2024-27980 不再为 `.bat`/`.cmd` 自动套 shell，直接 spawn 会 `EINVAL`；强行 `shell: true` 又要经 cmd.exe 解析参数，直链里的 `&` `=` 会被截断。改用 `process.execPath` 直跑 wrangler 的 JS 入口，不经 shell，参数原样传递。

代价是逐条执行没有事务性，所以 `d1.mjs` 在任一条失败时立刻停下并打印是哪一条。

验证：

```bash
curl -sI https://dl.windinput.com/WindInput-Setup-<版本>.exe   # 302 + location 指向出口
curl -s  https://dl.windinput.com/api/stats                    # {"total":...,"versions":[...]}
curl -sI https://dl.windinput.com/latest.json                  # 由 R2 直接返回，不进 Worker
```

### 回滚

- **停某个镜像**：`pnpm mirror off <对象名>`，60 秒内回落 R2。
- **停全部镜像**：`wrangler d1 execute windinput-downloads --remote --command "UPDATE mirrors SET enabled = 0"`。
- **停整个 Worker**：在 Workers 控制台删掉两条 route，即恢复纯 R2 直连（计数停止，下载不受影响）。保留 R2 自定义域即可。

## 免费额度承载力

路径分流保证**只有安装包下载与 stats 唤起 Worker**，升级检查等高频流量走 R2 直连，不计入 Worker 额度。

| 资源 | 免费额度 | 消耗来源 |
|---|---|---|
| Worker 请求 | 10 万 / 天 | 浏览器下载 1 次 / 在线更新 5 次 + stats + Cron 144 次/天 |
| D1 写行 | 10 万 / 天 | 每次下载 2 行（总量 + 渠道） |
| D1 读行 | 500 万 / 天 | stats 读 N 行；镜像映射读走 60 秒边缘缓存 |
| R2 Class B（读） | 1000 万 / 月 | 边缘缓存命中后不回源，实际远低于下载数 |
| 出站带宽 | R2 出站免费 | 0 计费 |

## 本地开发

```bash
pnpm db:init:local   # 建本地库表
pnpm dev             # 本地起 Worker，操作本地 D1 模拟
```

注意本地 `dev` 的 302 目标仍是线上的 `r2.windinput.com`（`vars` 里写死），这符合预期——本地没有 R2 缓存可测。

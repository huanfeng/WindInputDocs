# 下载计数服务（windinput-dl-service）

替代原先跑在 Cloudflare 上的下载网关 Worker。与 `edge/gateway.js`（EdgeOne 边缘函数）配合工作。

## 为什么这么切

分工是按**可降级性**分的，不是按组件分的：

| | 跑在哪 | 挂了会怎样 |
|---|---|---|
| 发 302（分流决策） | EdgeOne 边缘函数，多节点 | **用户下载不了** —— 必须高可用 |
| 计数 / 镜像数据源 / 探活 | 本服务，单机 VPS | 只丢计数，用户照常下载 |

所以**本服务不在下载的关键路径上**。边缘函数拿不到 `/mirrors` 就回落 R2，上报计数失败就静默丢弃。

这条边界不是新发明的：原 Worker 里 `ctx.waitUntil(bumpCount(...))` 表达的就是它，只不过那时两侧在同一个进程里。

> **为什么计数不放 EdgeOne KV**：KV 只有 `get/put/delete/list`，**没有原子操作**，递增只能 read-modify-write ——两个节点同时读到 100 都写 101 就丢一次，而它是 60 秒最终一致的。SQL 的 `count = count + 1` 是单行原子写，这是计数必须留在 SQLite 这一侧的全部理由。

> **不需要 EdgeOne KV。** 镜像映射由边缘函数 `fetch` 本服务的 `/mirrors` 并缓存 60 秒，
> 与原 Worker 用 Cache API 缓存整表是同一个口径（`MIRROR_CACHE_TTL = 60`），
> 对外「改动最多 60 秒生效」的承诺一字未变。KV 在限量内测、开通不了也不影响本方案。

## 边缘函数开通不了怎么办

EdgeOne 的边缘函数同样属于限量内测。开通不了时，把本服务切成**网关模式**（`GATEWAY_ENABLED=1`），
让 `dl.windinput.com` 直接回源到它——302 分流、计数、发布说明转发全在这里完成，不需要边缘函数。

```
边缘函数可用：  用户 → EdgeOne 边缘函数 → 302        （VPS 只收计数，挂了不影响下载）
边缘函数没有：  用户 → EdgeOne → 回源本服务 → 302     （VPS 进关键路径，挂了下载就挂）
```

**这是降级不是平替。** 启用网关模式时**必须**在 EdgeOne 侧配回源故障转移，备用源站指向
`r2.windinput.com`：本服务挂掉时请求直接落到 R2，用户拿到不带镜像分流的原始下载——慢，但活着。
配好这一条，单点风险就退回到「镜像分流失效」，与 mirrors 表读不到是同一级别。

边缘函数一旦开通，把 `GATEWAY_ENABLED` 去掉、路由切到函数即可，两种模式的分流与计数口径完全一致。

## 端点

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| GET | `/healthz` | — | 存活检查 |
| GET | `/mirrors` | — | 启用中的镜像映射，边缘函数查询（响应 `max-age=60`） |
| GET | `/api/stats` | — | 下载量统计，下载页徽章 |
| POST | `/count` | 令牌 | 计数上报 |
| POST | `/admin/sql` | 令牌 | 执行 SQL，供 `worker/scripts/mirror.mjs` 远程管理 |

`/admin/sql` 确实是「执行任意 SQL」的端点。这么做是因为 `mirror.mjs` 的全部数据访问收敛在一行 `const d1 = (sql) => runSql(sql)` 上——提供一个等价的远程执行器，那 521 行运维脚本一个字都不用改。它替代的正是 wrangler CLI（同样能对 D1 执行任意 SQL），风险等级没有升高。**前提是令牌不泄露、且服务只听回环由反代转入**，这两条都在下面的部署步骤里。

## 部署

前置：一台能被 EdgeOne 回源访问的 VPS。**建议腾讯云香港轻量**——免备案、国内三网直连优化、与 EdgeOne 国际版节点同区。最低配足够。

```bash
# 1) 装依赖
cd service-dl
npm install            # 只有 better-sqlite3 一个依赖

# 2) 自检 —— 第一步就跑，别等接了流量才发现计数是错的
npm run selftest
# 期望：全部通过。任何一项失败都不要继续部署。

# 3) 建表
npm run db:init

# 4) 配置
cp .env.example .env
# 编辑 .env，至少要设 AUTH_TOKEN（一串足够长的随机字符）
#   openssl rand -hex 32

# 5) 起服务
node --env-file=.env src/index.mjs
curl localhost:8080/healthz     # 期望 {"ok":true}
```

### 反代与 systemd

服务默认只听 `127.0.0.1`。公网入口应当是 **EdgeOne 回源 → nginx/caddy → 本服务**。直接把 Node 服务暴露在公网上，等于把 `/admin/sql` 的防线全押在一个令牌上。

Caddy 配置示例：

```
dl-api.windinput.com {
    reverse_proxy 127.0.0.1:8080
}
```

systemd unit（`/etc/systemd/system/windinput-dl.service`）：

```ini
[Unit]
Description=WindInput download counter service
After=network.target

[Service]
Type=simple
User=windinput
WorkingDirectory=/opt/windinput-dl
ExecStart=/usr/bin/node --env-file=/opt/windinput-dl/.env src/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now windinput-dl
journalctl -u windinput-dl -f
```

## 从 D1 迁移数据

在装了 wrangler 的机器上导出三张表，再灌进本服务。

```bash
# 在 worker/ 目录下，逐表导出
cd ../worker
for t in downloads download_events mirrors; do
  node -e "
    const {runSql}=await import('./scripts/d1.mjs');
    console.log(JSON.stringify(runSql('SELECT * FROM $t'),null,2))
  " > /tmp/d1-export/$t.json
done

# 传到 VPS 后导入
cd service-dl
node scripts/import-d1.mjs /tmp/d1-export
```

导入脚本用 `INSERT OR REPLACE` 按主键覆盖，**幂等**——迁移期要来回对账，重复导入不会翻倍。

导入后立刻核对：脚本打出的 `downloads` 总计数应与迁移前 `https://dl.windinput.com/api/stats` 的 `total` 一致。

### 建议的切换节奏

1. 服务起好、数据导入、`/api/stats` 与 CF 侧数字一致
2. 部署边缘函数，但**先只把 `/api/stats` 指过来**，观察一天
3. 再把安装包路径指过来，对比两侧计数增长是否同步
4. 稳定后再停掉 CF 的 Worker（**别急着删 D1**，它是唯一的回滚路径）

## 运维

```bash
# 看统计
curl localhost:8080/api/stats | jq

# 看镜像状态（含探活结果）
curl -X POST localhost:8080/admin/sql \
  -H "x-auth-token: $AUTH_TOKEN" -H 'content-type: application/json' \
  -d '{"sql":"SELECT key, enabled, fail_count, last_status FROM mirrors"}' | jq

# 备份：SQLite 就是一个文件，停机拷走即可；不停机用 sqlite3 的 .backup
sqlite3 data/downloads.db ".backup data/backup-$(date +%F).db"
```

镜像的登记与上下线仍用 `worker/scripts/mirror.mjs`——设好 `DL_SERVICE_URL` 与 `DL_SERVICE_TOKEN` 两个环境变量，它就会走本服务而不是 wrangler，命令用法完全不变。

## 配置项

| 变量 | 默认 | 说明 |
|---|---|---|
| `AUTH_TOKEN` | **必填** | 计数与管理端点的令牌。缺失时服务拒绝启动 |
| `PORT` | `8080` | |
| `HOST` | `127.0.0.1` | 默认只听回环，见上方安全说明 |
| `DB_PATH` | `./data/downloads.db` | |
| `PROBE_INTERVAL_MIN` | `10` | 镜像探活间隔（分钟），与原 Worker 的 Cron 一致 |

## 探活为什么现在更准了

`worker/src/mirrors.ts` 的开头写着：

> 校验要从本机直连国内网盘，放在境外边缘节点上跑既慢又测不准（Worker 到国内的链路和用户到国内的链路完全不同）

这正是登记校验被留在 `mirror.mjs`（跑在作者本机）的原因。本服务跑在香港 VPS 上，到国内网盘的链路比 CF 边缘接近真实用户得多——**探活结果第一次称得上可信**。

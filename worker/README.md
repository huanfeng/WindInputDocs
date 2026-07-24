# 下载网关 Worker（windinput-dl）

给 `dl.windinput.com` 的下载加上**下载计数**，同时继续从 R2 直出安装包。

- `GET /<文件名>` —— 从 R2 取对象返回（支持 Range 续传 / 条件请求），并在「下载起始请求」时给对应版本计数 +1。
- `GET /api/stats` —— 返回 `{ total, versions: [{ version, count }] }`，供文档站下载页展示。数据落 D1，读走边缘缓存（≤5 分钟延迟）。

下载 URL 与文件名**不变**，只是 `dl.windinput.com` 背后从「R2 自定义域直连」换成「本 Worker 绑定 R2」。文档站侧无需改直链。

## 首次部署

前置：本机已 `wrangler login`，且拥有目标 Cloudflare 账号的 R2/D1/Workers 权限。

```bash
cd worker
# 用 --ignore-workspace：本目录不是根 pnpm workspace 成员，需独立安装自己的依赖
pnpm install --ignore-workspace   # 安装 wrangler 等，不影响文档站

# 1) 建 D1 库，把输出的 database_id 填进 wrangler.jsonc
wrangler d1 create windinput-downloads

# 2) 建表（远程库）
pnpm db:init:remote

# 3) 填 wrangler.jsonc 里的 bucket_name（= 主仓 release-published.yml 推送的 R2 桶名）

# 4) 切换 dl.windinput.com 的归属（关键，见下）后部署
pnpm deploy
```

### 切换 dl.windinput.com（务必按顺序）

同一个主机名不能同时是「R2 自定义域」和「Worker 自定义域」。

1. Cloudflare 控制台 → R2 → 目标桶 → **Settings → Custom Domains**，移除 `dl.windinput.com`。
2. `pnpm deploy`。`wrangler.jsonc` 里的 `routes: [{ pattern: "dl.windinput.com", custom_domain: true }]` 会让 wrangler 为本 Worker 重新创建该自定义域（含证书签发，DNS 生效需几分钟）。
3. 验证：
   ```bash
   curl -I  https://dl.windinput.com/WindInput-Setup-<版本>.exe   # 200 + accept-ranges: bytes
   curl -s  https://dl.windinput.com/api/stats                     # {"total":...,"versions":[...]}
   ```

> 回滚：删除本 Worker 的自定义域，再在 R2 桶重新绑定 `dl.windinput.com`，即恢复直连（计数停止，下载不受影响）。

## 计数口径

只统计「下载起始请求」：无 `Range` 头，或 `Range` 从 0 开始且非 `bytes=0-0`（下载器 1 字节探测）。分段 / 续传不会把一次下载重复计数。**尽力而为的近似值**——不用 Cookie / 指纹，无法按人精确去重，用于「大致了解各版本下载量」足够。

计数在 `ctx.waitUntil` 中后台写入，写失败不影响下载响应。

## 免费额度承载力

R2 网关方案下**每次下载都穿过 Worker**，瓶颈是 Worker 每日请求数，不是带宽（R2 出站免费，穿 Worker 不额外计费）。

| 资源 | 免费额度 | 每次下载消耗 |
|---|---|---|
| Worker 请求 | 10 万 / 天 | 浏览器下载 1 次；多线程下载器 N 次（每线程 1） |
| D1 写行 | 10 万 / 天 | 1 行 |
| D1 读行 | 500 万 / 天 | stats 读 N 行（N=版本数），且有边缘缓存 |
| R2 Class B（读） | 1000 万 / 月 | 1 |
| 出站带宽 | R2 出站免费 | 0 计费 |

对输入法量级，离免费线很远。唯一现实风险是某天请求量 > 10 万/天 → Worker 返回 429（下载失败）。届时升级 **Workers Paid（$5/月，含 1000 万请求/月）** 即可，代码无需改动。

## 本地开发

```bash
pnpm db:init:local   # 建本地库表
pnpm dev             # 本地起 Worker，操作本地 R2/D1 模拟
```

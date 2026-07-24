# 下载网关 Worker（windinput-dl）

给 `dl.windinput.com` 的安装包下载加上**下载计数**。

- `GET /WindInput-Setup-<版本>.exe` —— 从 R2 取对象返回（支持 Range 续传 / 条件请求），并在「下载起始请求」时给对应版本计数 +1。
- `GET /api/stats` —— 返回 `{ total, versions: [{ version, count }] }`，供文档站下载页展示。数据落 D1，读走边缘缓存（≤5 分钟延迟）。

## 路径分流（省 Worker 额度的关键）

`dl.windinput.com` 的「底座」是 **R2 自定义域（直连、不经 Worker）**，只在**安装包**与 **stats** 两个路径上叠加窄 Worker 路由：

```
dl.windinput.com/WindInput-Setup-*  ─► Worker（计数 + R2 直出）   ← 唤起 Worker
dl.windinput.com/api/*              ─► Worker（stats）           ← 唤起 Worker
dl.windinput.com/其它（latest.json…）─► R2 直连                   ← 不唤起 Worker
```

Worker 路由优先级高于 R2 自定义域：匹配路径归 Worker，其余落到 R2。这样**升级检查等高频请求走 R2 直连、不消耗 Worker 额度**，Worker 调用数 ≈ 真实安装包下载数。下载 URL 与文件名**不变**，文档站侧无需改直链。

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

# 4) 完成 dl.windinput.com 的域名归属（关键，见下）后部署
pnpm deploy
```

### 配置 dl.windinput.com（分流模型，务必按顺序）

目标：`dl.windinput.com` 归 **R2 自定义域**，Worker 只叠加两条窄路由。

1. **若之前把它设成了 Worker 自定义域**：先在 Cloudflare 控制台 → **Workers & Pages → windinput-dl → Settings → Domains & Routes** 删除 `dl.windinput.com` 那条 **Custom Domain**。
2. Cloudflare 控制台 → **R2 → windinput 桶 → Settings → Custom Domains**，绑定 `dl.windinput.com`（含证书签发，DNS 生效需几分钟）。此时下载已可直连 R2（尚无计数）。
3. `pnpm deploy`。`wrangler.jsonc` 里的两条 `routes`（`/WindInput-Setup-*` 与 `/api/*`，均 `zone_name: windinput.com`）会被创建，安装包下载与 stats 从此走 Worker。
4. 验证：
   ```bash
   curl -sI https://dl.windinput.com/WindInput-Setup-<版本>.exe  # 200 + accept-ranges: bytes（走 Worker）
   curl -s  https://dl.windinput.com/api/stats                    # {"total":...,"versions":[...]}（走 Worker）
   curl -sI https://dl.windinput.com/<某个非安装包文件>            # 由 R2 直接返回，不进 Worker
   ```

> 回滚：在 Workers 控制台删除这两条 route，即恢复纯 R2 直连（计数停止，下载不受影响）。保留 R2 自定义域即可。

## 计数口径

只统计「下载起始请求」：无 `Range` 头，或 `Range` 从 0 开始且非 `bytes=0-0`（下载器 1 字节探测）。分段 / 续传不会把一次下载重复计数。**尽力而为的近似值**——不用 Cookie / 指纹，无法按人精确去重，用于「大致了解各版本下载量」足够。

计数在 `ctx.waitUntil` 中后台写入，写失败不影响下载响应。

## 免费额度承载力

得益于路径分流，**只有安装包下载与 stats 请求唤起 Worker**；升级检查等高频流量走 R2 直连，不计入 Worker 额度。所以 Worker 调用数 ≈ 真实下载数，离免费线很远。

| 资源 | 免费额度 | 消耗来源 |
|---|---|---|
| Worker 请求 | 10 万 / 天 | 仅安装包下载 + stats（升级检查不计） |
| D1 写行 | 10 万 / 天 | 每次安装包下载 1 行 |
| D1 读行 | 500 万 / 天 | stats 读 N 行（N=版本数），且有边缘缓存 |
| R2 Class B（读） | 1000 万 / 月 | 每次经 R2 的请求 1（含升级检查直连） |
| 出站带宽 | R2 出站免费 | 0 计费 |

带宽不是瓶颈（R2 出站免费，穿 Worker 也不额外计费）。真要撞线只可能是安装包**下载**本身 > 10 万/天，那属于该庆祝的量级；届时升级 **Workers Paid（$5/月，含 1000 万请求/月）** 即可，代码无需改动。

## 本地开发

```bash
pnpm db:init:local   # 建本地库表
pnpm dev             # 本地起 Worker，操作本地 R2/D1 模拟
```

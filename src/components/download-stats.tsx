"use client";

import { ArrowDownToLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { currentVersion, statsDetailUrl, statsUrl } from "@/lib/releases";

/** 精简档。徽章要的几个数，每次访问下载页都会拉。 */
interface Stats {
  total: number;
  versions: { version: string; count: number }[];
  platforms: Record<string, number>;
  sources: Record<string, number>;
  /** 合并总数的构成：站内实时计数 + GitHub Releases 快照 */
  totals?: { site: number; github: number };
  detail?: Detail;
}

/** 明细档。仅在统计面板解锁后随 ?detail=1 一起返回。 */
interface Detail {
  rows: { version: string; platform: string; site: number; github: number }[];
  githubSyncedAt: string | null;
}

const fmt = (n: number) => n.toLocaleString("en-US");

// —— 统计面板的开启方式 ——
//
// 连点徽章 10 次，且**相邻两次间隔不超过 600ms**，慢了就从头计数。加节奏要求是为了
// 挡住误触：这个徽章在下载按钮正下方，慢悠悠点几下是很容易发生的事，只数次数不看
// 间隔的话，普通访客迟早会莫名其妙撞开一块调试面板。
//
// 600ms 比双击的判定（约 300-500ms）宽一点：要的是「连着点」而不是「点得快」，
// 触屏上手指移动也要留出余量。
const CLICKS_REQUIRED = 10;
const MAX_GAP_MS = 600;
/** 点到第几次开始给视觉反馈，暗示「还有下文」，免得节奏对了却因为没反馈半途放弃。 */
const HINT_AT = 4;
const STORAGE_KEY = "windinput:stats-panel";

/** 平台代码 → 展示名。口径与 worker/src/env.ts 的 ARTIFACTS 一致。 */
const PLATFORM_LABEL: Record<string, string> = {
  windows: "安装版",
  "windows-portable": "便携版",
  macos: "macOS",
};

/** 列顺序。与 worker/src/stats.ts 的 PLATFORM_ORDER 同序，新增平台两处一起加。 */
const PLATFORM_ORDER = ["windows", "windows-portable", "macos"];

const SOURCE_LABEL: Record<string, string> = {
  mirror: "国内镜像",
  r2: "R2 直连",
};

/**
 * 下载量徽章。数据来自下载网关 Worker 的 /api/stats。
 * 纯客户端拉取：静态导出没有服务端，计数是实时变化的，不能在构建期定值。
 *
 * 显示的是**站内 + GitHub 合并**后的数字。项目的安装包有两条分发路径，只报站内会
 * 系统性低估——便携版尤其明显，它只发布在 GitHub 上，站内计数恒为 0。
 *
 * 防抖动：外层容器用 min-h 从一开始就把徽章高度占好，数据到达时徽章只在原位
 * 做透明度淡入（不做位移、不新增高度），不会把下方内容顶下去。
 * 仅当请求失败 / Worker 未部署时收起容器（罕见），静默降级。
 */
export function DownloadStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  /** 面板是否已解锁（持久化）。解锁后每次访问默认展开。 */
  const [unlocked, setUnlocked] = useState(false);
  /** 本次访问内的临时收起，不持久化——下次进来仍是展开的。 */
  const [collapsed, setCollapsed] = useState(false);
  /** 连点进度，仅用于给出「快到了」的视觉反馈 */
  const [progress, setProgress] = useState(0);

  const clicks = useRef(0);
  const lastClickAt = useRef(0);
  /** 连点中断后把视觉反馈收回去的定时器 */
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 防止运行时解锁与初始加载重复拉明细 */
  const detailRequested = useRef(false);

  // 组件卸载时清掉待触发的定时器，避免在已卸载的组件上 setState
  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const loadDetail = useCallback(() => {
    if (detailRequested.current) return;
    detailRequested.current = true;
    fetch(statsDetailUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      // 明细档是精简档的超集，整体替换即可，不必逐字段合并
      .then((data: Stats) => setStats(data))
      .catch(() => {
        // 明细拉不到不影响徽章：面板会显示为空，重试留给下次点击
        detailRequested.current = false;
      });
  }, []);

  useEffect(() => {
    // localStorage 只能在挂载后读：静态导出的 HTML 是构建期生成的，
    // 在渲染阶段读会让首屏与服务端产物不一致（hydration mismatch）。
    let alreadyUnlocked = false;
    try {
      alreadyUnlocked = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // 隐私模式 / 禁用存储：当作未解锁，连点照样能开，只是不记住
    }
    setUnlocked(alreadyUnlocked);
    if (alreadyUnlocked) detailRequested.current = true;

    // 已解锁就直接拉明细档（它包含精简档的全部字段），省掉一次往返
    const ac = new AbortController();
    fetch(alreadyUnlocked ? statsDetailUrl : statsUrl, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((data: Stats) => {
        if (data && typeof data.total === "number") setStats(data);
        else setFailed(true);
      })
      .catch(() => {
        // AbortController.abort() 也会走到这里，但组件已卸载，setState 被忽略。
        setFailed(true);
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!stats) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [stats]);

  const onBadgeClick = useCallback(() => {
    // 解锁之后徽章就是个普通的展开/收起开关，不必再连点
    if (unlocked) {
      setCollapsed((v) => !v);
      return;
    }

    const now = Date.now();
    clicks.current =
      now - lastClickAt.current <= MAX_GAP_MS ? clicks.current + 1 : 1;
    lastClickAt.current = now;
    setProgress(clicks.current);

    // 节奏断了就把放大效果收回去。计数本身靠上面的时间戳比较判超时，这个定时器
    // 只管视觉——少了它，点到一半走开的人会看到徽章一直停在放大状态。
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setProgress(0), MAX_GAP_MS);

    if (clicks.current >= CLICKS_REQUIRED) {
      clearTimeout(hintTimer.current);
      clicks.current = 0;
      setProgress(0);
      setUnlocked(true);
      setCollapsed(false);
      loadDetail();
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // 存不下就只在本次访问有效，不影响已经开出来的面板
      }
    }
  }, [unlocked, loadDetail]);

  if (failed) return null;

  const current =
    stats?.versions.find((v) => v.version === currentVersion)?.count ?? 0;
  const open = unlocked && !collapsed;
  // 连点过半时轻微放大，暗示还有下文。没到 HINT_AT 不给任何反馈，
  // 否则随手点两下的访客会以为自己弄坏了什么。
  const hinting = progress >= HINT_AT;

  return (
    <div className="mt-3 flex flex-col items-center">
      <div className="flex min-h-7 justify-center">
        {stats && (
          <button
            type="button"
            onClick={onBadgeClick}
            aria-expanded={unlocked ? open : undefined}
            title={
              unlocked ? (open ? "收起统计明细" : "展开统计明细") : undefined
            }
            className={`inline-flex items-center gap-1.5 rounded-full border bg-fd-card/50 px-3 py-1 text-xs text-fd-muted-foreground transition-all duration-500 ${
              shown ? "opacity-100" : "opacity-0"
            } ${hinting ? "scale-110 border-fd-primary/40" : "scale-100"} ${
              unlocked ? "cursor-pointer hover:bg-fd-accent" : "cursor-default"
            }`}
          >
            <ArrowDownToLine className="size-3.5 text-fd-primary" aria-hidden />
            本版本{" "}
            <span className="font-semibold text-fd-foreground">
              {fmt(current)}
            </span>
            <span className="text-fd-muted-foreground/40">·</span>
            累计{" "}
            <span className="font-semibold text-fd-foreground">
              {fmt(stats.total)}
            </span>
          </button>
        )}
      </div>

      {open && stats && <StatsPanel stats={stats} />}
    </div>
  );
}

/**
 * 统计明细面板。
 *
 * 数据本来就有版本 × 平台的二维明细，只是 /api/stats 的精简档把它压成了几个总数。
 * 这里展开的是原始行，不是另算的一套数——两处对不上就是 bug，不是口径差异。
 */
function StatsPanel({ stats }: { stats: Stats }) {
  const detail = stats.detail;
  const site = stats.totals?.site ?? 0;
  const github = stats.totals?.github ?? 0;

  // 站内分渠道的合计**小于**站内总量：download_events 是后来补的表，更早的下载
  // 只进了 downloads。差额如实标成「未分渠道」，否则镜像 + R2 ≠ 总量会像个 bug。
  const sourceSum = Object.values(stats.sources ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  const unattributed = Math.max(0, site - sourceSum);

  const platforms = PLATFORM_ORDER.filter((p) =>
    detail?.rows.some((r) => r.platform === p),
  );
  // 出现了 PLATFORM_ORDER 里没有的平台（主仓加了新产物而这里没跟上）：也列出来，
  // 免得新平台的下载量静默消失在面板之外。
  const extra = [...new Set(detail?.rows.map((r) => r.platform) ?? [])].filter(
    (p) => !PLATFORM_ORDER.includes(p),
  );
  const columns = [...platforms, ...extra];

  // 版本顺序直接沿用后端排好的行序（版本降序），Set 去重不改变插入顺序
  const versions = [...new Set(detail?.rows.map((r) => r.version) ?? [])];
  // 建索引再查，而不是每个格子 find 一遍：表是 22 版本 × 3 平台，逐格线性扫
  // 是四千多次比较，而它每次重渲染都要跑一遍
  const byKey = new Map(
    detail?.rows.map((r) => [`${r.version} ${r.platform}`, r] as const) ?? [],
  );
  const cell = (version: string, platform: string) =>
    byKey.get(`${version} ${platform}`);

  return (
    <div className="mt-3 w-full max-w-2xl rounded-lg border bg-fd-card/50 p-4 text-left text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-fd-foreground">
          下载统计明细
        </h3>
        <p className="text-fd-muted-foreground">
          站内{" "}
          <span className="font-semibold text-fd-foreground">{fmt(site)}</span>
          {" + "}GitHub{" "}
          <span className="font-semibold text-fd-foreground">
            {fmt(github)}
          </span>
          {" = "}
          <span className="font-semibold text-fd-foreground">
            {fmt(stats.total)}
          </span>
        </p>
      </div>

      {!detail && <p className="mt-3 text-fd-muted-foreground">明细加载中…</p>}

      {detail && (
        <>
          {/* 宽表在窄屏上必须自己横向滚动，不能让整个页面横向滚 */}
          <div className="mt-3 max-h-72 overflow-auto rounded border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-fd-card">
                <tr className="text-fd-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">版本</th>
                  {columns.map((p) => (
                    <th key={p} className="px-2 py-1.5 text-right font-medium">
                      {PLATFORM_LABEL[p] ?? p}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-right font-medium">小计</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => {
                  const rowTotal = columns.reduce((sum, p) => {
                    const c = cell(v, p);
                    return sum + (c ? c.site + c.github : 0);
                  }, 0);
                  return (
                    <tr key={v} className="border-t">
                      <td className="px-2 py-1 font-mono text-fd-foreground">
                        {v}
                        {v === currentVersion && (
                          <span className="ml-1.5 rounded bg-fd-primary/10 px-1 text-[10px] text-fd-primary">
                            当前
                          </span>
                        )}
                      </td>
                      {columns.map((p) => {
                        const c = cell(v, p);
                        const total = c ? c.site + c.github : 0;
                        return (
                          <td
                            key={p}
                            className="px-2 py-1 text-right tabular-nums"
                            // 悬停看构成：面板主体给合并数，来源拆分不占版面
                            title={
                              c
                                ? `站内 ${fmt(c.site)} · GitHub ${fmt(c.github)}`
                                : undefined
                            }
                          >
                            {total > 0 ? (
                              fmt(total)
                            ) : (
                              <span className="text-fd-muted-foreground/30">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-right font-semibold tabular-nums text-fd-foreground">
                        {fmt(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-fd-muted-foreground">
            <span>
              站内分流：
              {Object.entries(stats.sources ?? {}).map(([k, v]) => (
                <span key={k} className="ml-2">
                  {SOURCE_LABEL[k] ?? k}{" "}
                  <span className="font-semibold text-fd-foreground">
                    {fmt(v)}
                  </span>
                </span>
              ))}
              {unattributed > 0 && (
                <span className="ml-2">
                  未分渠道{" "}
                  <span className="font-semibold text-fd-foreground">
                    {fmt(unattributed)}
                  </span>
                </span>
              )}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-fd-muted-foreground/70">
            站内计数实时递增；GitHub 侧每小时同步一次，
            {detail.githubSyncedAt
              ? `最近一次 ${new Date(detail.githubSyncedAt).toLocaleString("zh-CN")}`
              : "尚未同步"}
            。「未分渠道」是分流统计上线前的历史下载，只记了总量。
          </p>
        </>
      )}
    </div>
  );
}

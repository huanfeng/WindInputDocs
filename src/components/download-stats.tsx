"use client";

import { ArrowDownToLine } from "lucide-react";
import { useEffect, useState } from "react";
import { currentVersion, statsUrl } from "@/lib/releases";

interface Stats {
  total: number;
  versions: { version: string; count: number }[];
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * 下载量展示。数据来自下载网关 Worker 的 /api/stats。
 * 纯客户端拉取：静态导出没有服务端，计数是实时变化的，不能在构建期定值。
 * Worker 未部署或请求失败时静默不渲染，不影响页面其余部分。
 *
 * 数据到达后淡入 + 轻微上移，避免数字突然「跳」出来。
 */
export function DownloadStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(statsUrl, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Stats | null) => {
        if (data && typeof data.total === "number") setStats(data);
      })
      .catch(() => {
        // 网络错误 / Worker 未部署：静默降级。
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!stats) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [stats]);

  if (!stats) return null;

  const current =
    stats.versions.find((v) => v.version === currentVersion)?.count ?? 0;

  return (
    <div
      className={`mt-5 flex justify-center transition-all duration-500 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-fd-card/50 px-3 py-1 text-xs text-fd-muted-foreground">
        <ArrowDownToLine className="size-3.5 text-fd-primary" aria-hidden />
        本版本{" "}
        <span className="font-semibold text-fd-foreground">{fmt(current)}</span>
        <span className="text-fd-muted-foreground/40">·</span>
        累计{" "}
        <span className="font-semibold text-fd-foreground">
          {fmt(stats.total)}
        </span>
      </span>
    </div>
  );
}

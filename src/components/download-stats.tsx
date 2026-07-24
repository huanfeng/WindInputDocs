"use client";

import { useEffect, useState } from "react";
import { currentVersion, statsUrl } from "@/lib/releases";

interface Stats {
  total: number;
  versions: { version: string; count: number }[];
}

// 千分位；数值太大时才需要，但统一处理更省心。
const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * 下载量展示。数据来自下载网关 Worker 的 /api/stats。
 * 纯客户端拉取：静态导出没有服务端，计数是实时变化的，不能在构建期定值。
 * Worker 未部署或请求失败时静默不渲染，不影响页面其余部分。
 */
export function DownloadStats() {
  const [stats, setStats] = useState<Stats | null>(null);

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

  if (!stats) return null;

  const current =
    stats.versions.find((v) => v.version === currentVersion)?.count ?? 0;

  return (
    <p className="mt-4 text-sm text-fd-muted-foreground">
      本版本已下载{" "}
      <span className="font-medium text-fd-foreground">{fmt(current)}</span> 次
      {" · "}累计{" "}
      <span className="font-medium text-fd-foreground">{fmt(stats.total)}</span>{" "}
      次
    </p>
  );
}

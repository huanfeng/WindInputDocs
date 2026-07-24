"use client";

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
 * 渲染为行内 <span>，追加在「Cloudflare R2 全球 CDN」那一行末尾——不新增块级
 * 高度，数据到达时只做透明度淡入（不做位移），避免把下方内容顶得抖动。
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
    <span
      className={`transition-opacity duration-500 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {" · 本版本已下载 "}
      <span className="font-medium text-fd-foreground">{fmt(current)}</span>
      {" 次，累计 "}
      <span className="font-medium text-fd-foreground">{fmt(stats.total)}</span>
      {" 次"}
    </span>
  );
}

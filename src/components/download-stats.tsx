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
 * 下载量徽章。数据来自下载网关 Worker 的 /api/stats。
 * 纯客户端拉取：静态导出没有服务端，计数是实时变化的，不能在构建期定值。
 *
 * 防抖动：外层容器用 min-h 从一开始就把徽章高度占好，数据到达时徽章只在原位
 * 做透明度淡入（不做位移、不新增高度），不会把下方内容顶下去。
 * 仅当请求失败 / Worker 未部署时收起容器（罕见），静默降级。
 */
export function DownloadStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(statsUrl, { signal: ac.signal })
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

  if (failed) return null;

  const current =
    stats?.versions.find((v) => v.version === currentVersion)?.count ?? 0;

  return (
    <div className="mt-5 flex min-h-7 justify-center">
      {stats && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border bg-fd-card/50 px-3 py-1 text-xs text-fd-muted-foreground transition-opacity duration-500 ${
            shown ? "opacity-100" : "opacity-0"
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
        </span>
      )}
    </div>
  );
}

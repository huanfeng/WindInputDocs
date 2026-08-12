#!/usr/bin/env node
/**
 * 下载镜像管理 CLI。
 *
 *   pnpm mirror ls                    列出所有镜像
 *   pnpm mirror add <对象名> <直链>    校验并登记（校验不过不写库）
 *   pnpm mirror on|off <对象名>       启用 / 停用
 *   pnpm mirror rm <对象名>           删除
 *   pnpm mirror check                 只读探活，诊断所有已登记镜像
 *
 * 用**完整对象名**而不是版本号寻址：镜像是「一个文件 ↔ 一个直链」的映射，与
 * 版本/平台无关。Windows 与 macOS 同版本是两个不同的包，各自需要各自的直链；
 * 将来新增任何产物类型，这个 CLI 也不用改。
 *
 * 为什么校验放在本机而不是 Worker 里：Worker 跑在境外边缘节点，到国内网盘的链路
 * 和真实用户的链路完全不同，在那边测出的「能连通」说明不了什么，还慢。本机执行
 * 还能直接看到完整的重定向链和错误。
 *
 * 数据库访问统一走 scripts/d1.mjs —— 那里说明了为什么不能用 `--file`（import 端点
 * 授权不同）也不能 spawn `npx.cmd`（Node ≥20.12.2 的 .cmd 限制 + shell 会吃掉 URL
 * 里的 & 和 =）。
 */
import { runSql } from "./d1.mjs";

const R2_PUBLIC_BASE = "https://r2.windinput.com";

/** 客户端 wind-setting 用 ureq，redirects(3) 是硬上限。 */
const CLIENT_MAX_REDIRECTS = 3;
/** Worker 自己那一跳恒定占 1。 */
const WORKER_HOP = 1;

const TIMEOUT_MS = 20_000;
const MAX_HOPS = 5;

/** 与 src/env.ts 的 ARTIFACTS 保持一致，仅用于给出更准确的提示。 */
const ARTIFACT_RES = [
  /^WindInput-Setup-(.+)\.exe$/i,
  /^WindInput-Portable-(.+)\.zip$/i,
  /^WindInput-(.+)-macOS\.pkg$/i,
];

const color = process.stdout.isTTY;
const c = {
  dim: (s) => (color ? `\x1b[90m${s}\x1b[0m` : s),
  ok: (s) => (color ? `\x1b[32m${s}\x1b[0m` : s),
  warn: (s) => (color ? `\x1b[33m${s}\x1b[0m` : s),
  fail: (s) => (color ? `\x1b[31m${s}\x1b[0m` : s),
  bold: (s) => (color ? `\x1b[1m${s}\x1b[0m` : s),
};

// ── D1 ──────────────────────────────────────────────────────────────────

const d1 = (sql) => runSql(sql, { remote: true });

/** SQL 字符串字面量转义。URL 里出现单引号极少但不是不可能。 */
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const nowIso = () => new Date().toISOString();

function assertKey(key) {
  if (!key) die("缺少对象名。例：WindInput-Setup-0.115.1.exe");
  if (key.includes("/") || /\s/.test(key)) die(`对象名不合法：${key}`);
  if (!ARTIFACT_RES.some((re) => re.test(key))) {
    console.log(
      c.warn(`提示：${key} 不符合已知安装包命名，登记后网关不会使用它。`),
    );
    console.log(
      c.dim("  已知：WindInput-Setup-<版本>.exe / WindInput-Portable-<版本>.zip / WindInput-<版本>-macOS.pkg"),
    );
  }
  return key;
}

// ── 校验 ────────────────────────────────────────────────────────────────

const step = (level, name, detail) => {
  const mark = level === "ok" ? c.ok("✓") : level === "warn" ? c.warn("!") : c.fail("✗");
  console.log(`  ${mark} ${pad(name, 14)}${detail}`);
};

/** 带签名 / 有效期参数的临时地址特征。 */
const SIGNED_RE = /[?&](x-amz-signature|x-amz-expires|x-amz-date|expires|token|sign)=/i;

/**
 * 逐跳跟随，停在**最后一个不带签名参数的地址**。
 *
 * 不能无脑跟到底：网盘的典型链路是
 *   分享入口 → 302 → S3 网关（稳定，无签名）→ 302 → 存储节点（带 X-Amz-Expires=900）
 * 跟到最后一跳存进库，等于登记一个十几分钟后就 403 的地址；停在网关那一跳，
 * 地址长期有效，签名由网盘每次现签。
 *
 * 附带一个教训：早期用 `curl -I` 探这个网关得到 200，据此以为「无 Range 时它自己
 * 响应」——实际 HEAD 与 GET 行为不同，GET 一律 302。所以这里必须用 GET 探。
 */
async function resolveStable(entry) {
  let url = entry;
  let hops = 0;
  const chain = [entry];

  while (hops <= MAX_HOPS) {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    res.body?.cancel().catch(() => {});

    if (res.status < 300 || res.status >= 400) {
      return { url, hops, status: res.status, chain, stoppedBeforeSigned: false };
    }
    const loc = res.headers.get("location");
    if (!loc) return { url, hops, status: res.status, chain, stoppedBeforeSigned: false };

    const next = new URL(loc, url).toString();
    if (SIGNED_RE.test(next)) {
      // 下一跳是临时地址：当前这个才是要登记的稳定地址
      return { url, hops, status: res.status, chain, stoppedBeforeSigned: true };
    }
    url = next;
    chain.push(url);
    hops++;
  }
  return { url, hops, status: 310, chain, stoppedBeforeSigned: false };
}

/**
 * 复刻客户端 supports_ranges() 的第一个动作：Range: bytes=0-0。
 * 逐跳跟随以便数清跳数——这正是最容易顶满 redirects(3) 的那条链路。
 */
async function probeRange(start) {
  let url = start;
  let hops = 0;
  while (hops <= MAX_HOPS) {
    const res = await fetch(url, {
      method: "GET",
      headers: { range: "bytes=0-0" },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    res.body?.cancel().catch(() => {});
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { status: res.status, total: null, hops };
      url = new URL(loc, url).toString();
      hops++;
      continue;
    }
    const m = /^bytes\s+\d+-\d+\/(\d+)$/i.exec(
      (res.headers.get("content-range") ?? "").trim(),
    );
    return { status: res.status, total: m ? Number(m[1]) : null, hops };
  }
  return { status: 310, total: null, hops };
}

async function r2Size(key) {
  const res = await fetch(`${R2_PUBLIC_BASE}/${encodeURIComponent(key)}`, {
    method: "HEAD",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const len = res.headers.get("content-length");
  return len ? Number(len) : null;
}

/**
 * 登记前的完整校验。
 *
 * 为什么解析到「无 Range 的最终地址」再存：网盘分享入口 → 302 → S3 网关 →
 * （带 Range 时再 302）→ 真实节点。存入口的话客户端要跳 3 次（Worker + 入口 +
 * 网关），正好顶满 ureq 的 redirects(3)，网盘哪天多加一跳就静默失败。存「无 Range
 * 最终地址」既省掉入口那一跳，又天然停在不带签名的稳定地址上——带 Range 才会跳到
 * 带 X-Amz-Signature 的临时节点，那种地址有效期只有十几分钟，绝不能入库。
 */
async function verify(key, entryUrl) {
  if (!/^https:\/\//i.test(entryUrl)) {
    step("fail", "地址协议", "必须是 https:// —— 客户端拒绝非 https 的下载地址");
    return null;
  }

  let resolved;
  try {
    resolved = await resolveStable(entryUrl);
  } catch (e) {
    step("fail", "解析重定向", `请求失败：${errText(e)}`);
    return null;
  }
  // 停在签名地址前一跳时状态码是 302，那是期望结果；只有既非 200 也非「主动停下」
  // 才算解析失败。
  if (!resolved.stoppedBeforeSigned && resolved.status !== 200) {
    step("fail", "解析重定向", `最终响应 ${resolved.status}（期望 200）`);
    console.log(c.dim(`      链路：${resolved.chain.join("\n            → ")}`));
    return null;
  }
  step(
    "ok",
    "解析重定向",
    (resolved.hops === 0 ? "入口即目标地址" : `跟随 ${resolved.hops} 跳 → ${resolved.url}`) +
      (resolved.stoppedBeforeSigned ? c.dim("（已在签名地址前停下）") : ""),
  );

  // 走到这里 url 通常已不含签名。仍要检查：若入口本身就是临时地址，就无处可退，
  // 只能告警——配合 Cron 探活仍能用，但必须让人知道它会过期。
  if (SIGNED_RE.test(resolved.url)) {
    step(
      "warn",
      "地址稳定性",
      "含签名 / 有效期参数且无更上游的稳定地址可用，将在数分钟后失效",
    );
  } else {
    step("ok", "地址稳定性", "无签名参数，可长期使用");
  }

  let probe;
  try {
    probe = await probeRange(resolved.url);
  } catch (e) {
    step("fail", "Range 支持", `请求失败：${errText(e)}`);
    return null;
  }
  if (probe.status !== 206) {
    step(
      "fail",
      "Range 支持",
      `返回 ${probe.status} 而非 206：分片下载会退回单连接，且一次在线更新会被计成 2 次`,
    );
    return null;
  }
  if (probe.total === null) {
    step("fail", "Range 支持", "缺少可解析的 Content-Range，无法确认支持分片");
    return null;
  }
  step("ok", "Range 支持", `206 Partial Content，总长 ${probe.total} 字节`);

  const totalHops = WORKER_HOP + probe.hops;
  if (totalHops > CLIENT_MAX_REDIRECTS) {
    step(
      "fail",
      "跳数预算",
      `客户端需跟随 ${totalHops} 次跳转，超过上限 ${CLIENT_MAX_REDIRECTS}，在线更新会失败`,
    );
    return null;
  }
  step(
    totalHops === CLIENT_MAX_REDIRECTS ? "warn" : "ok",
    "跳数预算",
    `客户端共需跟随 ${totalHops} 次（上限 ${CLIENT_MAX_REDIRECTS}）` +
      (totalHops === CLIENT_MAX_REDIRECTS ? "，已无余量，网盘再加一跳即失效" : ""),
  );

  // 挡住「网盘传的是旧包 / 传的是另一个平台的包，却按这个对象名登记」——那种错
  // 会让用户的在线更新报 sha256 不匹配，现象诡异且极难排查。
  let size;
  try {
    size = await r2Size(key);
  } catch (e) {
    step("fail", "与 R2 比对", `无法读取 R2 对象：${errText(e)}`);
    return null;
  }
  if (size === null) {
    step("fail", "与 R2 比对", `R2 上没有 ${key}，对象名写对了吗？`);
    return null;
  }
  if (size !== probe.total) {
    step(
      "fail",
      "与 R2 比对",
      `大小不一致：R2 ${size} ≠ 镜像 ${probe.total} —— 多半是网盘上传的不是这个文件`,
    );
    return null;
  }
  step("ok", "与 R2 比对", `大小一致（${size} 字节）`);

  return { url: resolved.url, size: probe.total };
}

// ── 命令 ────────────────────────────────────────────────────────────────

function cmdList() {
  const rows = d1("SELECT * FROM mirrors ORDER BY key DESC;");
  if (!rows.length) {
    console.log(c.dim("还没有登记任何镜像，所有下载都走 R2。"));
    return;
  }
  for (const m of rows) {
    console.log(c.bold(m.key));
    const state = m.enabled ? c.ok(pad("启用", 8)) : c.dim(pad("停用", 8));
    console.log(
      "  " + state + pad(fmtSize(m.size), 11) + pad(fmtTime(m.last_check), 14) +
        (m.last_status ?? "-"),
    );
    console.log(c.dim(`  → ${m.url}`));
  }
}

async function cmdAdd(key, url) {
  assertKey(key);
  if (!url) die("用法：pnpm mirror add <对象名> '<网盘直链>'");

  console.log(`校验 ${c.bold(key)} → ${c.dim(url)}\n`);
  const result = await verify(key, url);
  if (!result) {
    console.log(`\n${c.fail("未写入数据库。")}`);
    process.exitCode = 1;
    return;
  }

  const now = nowIso();
  d1(
    `INSERT INTO mirrors (key, url, size, enabled, fail_count, last_check, last_status, updated_at)
     VALUES (${q(key)}, ${q(result.url)}, ${result.size}, 1, 0, ${q(now)}, '登记时校验通过', ${q(now)})
     ON CONFLICT(key) DO UPDATE SET
       url = ${q(result.url)}, size = ${result.size}, enabled = 1, fail_count = 0,
       last_check = ${q(now)}, last_status = '登记时校验通过', updated_at = ${q(now)};`,
  );
  console.log(`\n${c.ok("已登记")} ${key} 已启用，最多 60 秒后全球生效。`);
}

function cmdToggle(key, enabled) {
  assertKey(key);
  // 重新启用时清零 fail_count，否则下一轮探活失败会立刻又把它下线
  d1(
    `UPDATE mirrors SET enabled = ${enabled ? 1 : 0}, fail_count = 0,
            updated_at = ${q(nowIso())} WHERE key = ${q(key)};`,
  );
  console.log(
    `${key} 已${enabled ? c.ok("启用") : c.warn("停用")}，最多 60 秒后全球生效。`,
  );
}

function cmdRemove(key) {
  assertKey(key);
  d1(`DELETE FROM mirrors WHERE key = ${q(key)};`);
  console.log(`${key} 的镜像已删除，该文件回落 R2（最多 60 秒生效）。`);
}

/**
 * 只读诊断：不改数据库。自动下线是 Cron 的职责，CLI 插一脚只会让
 * 「谁把它关掉的」变得难以追溯。
 */
async function cmdCheck() {
  const rows = d1("SELECT * FROM mirrors ORDER BY key DESC;");
  if (!rows.length) {
    console.log(c.dim("没有已登记的镜像。"));
    return;
  }
  console.log(c.dim("探活（只读，不改数据库）\n"));
  let bad = 0;
  for (const m of rows) {
    const tag = m.enabled ? "" : c.dim("（已停用）");
    try {
      const probe = await probeRange(m.url);
      if (probe.status !== 206) {
        bad++;
        console.log(`  ${c.fail("✗")} ${m.key} ${tag} HTTP ${probe.status}`);
      } else if (probe.total !== m.size) {
        bad++;
        console.log(`  ${c.fail("✗")} ${m.key} ${tag} 大小变化 ${probe.total} ≠ ${m.size}`);
      } else {
        console.log(`  ${c.ok("✓")} ${m.key} ${tag} 206，总长一致`);
      }
    } catch (e) {
      bad++;
      console.log(`  ${c.fail("✗")} ${m.key} ${tag} ${errText(e)}`);
    }
  }
  if (bad) {
    console.log(
      c.dim("\n如需手动下线：pnpm mirror off <对象名>（Cron 连续 2 次失败也会自动下线）"),
    );
    process.exitCode = 1;
  }
}

// ── 工具 ────────────────────────────────────────────────────────────────

const errText = (e) => (e instanceof Error ? e.message : String(e));
const fmtSize = (n) => (n ? `${(n / 1048576).toFixed(1)} MB` : "-");

/** 中日韩字符在终端占两列，padEnd 按码点数补齐会让中文列整体左移。 */
const dispWidth = (s) =>
  [...s].reduce((w, ch) => w + (ch.codePointAt(0) > 0x2e7f ? 2 : 1), 0);
const pad = (s, n) => s + " ".repeat(Math.max(1, n - dispWidth(s)));

function fmtTime(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function die(msg) {
  console.error(c.fail(msg));
  process.exit(1);
}

const USAGE = `下载镜像管理

  pnpm mirror ls                    列出所有镜像
  pnpm mirror add <对象名> '<直链>'  校验并登记（任一项校验不过都不写库）
  pnpm mirror on  <对象名>          启用
  pnpm mirror off <对象名>          停用，回落 R2
  pnpm mirror rm  <对象名>          删除
  pnpm mirror check                 只读探活，诊断所有已登记镜像

对象名是 R2 上的完整文件名，例如：
  WindInput-Setup-0.115.1.exe       Windows 安装版
  WindInput-0.115.1-macOS.pkg       macOS 安装包
  WindInput-Portable-0.115.1.zip    Windows 便携版

直链务必用单引号包起来，否则其中的 & 会被 shell 当作后台运行符号。
改动最多 60 秒全球生效。`;

const [cmd, a, b] = process.argv.slice(2);
switch (cmd) {
  case "ls":
    cmdList();
    break;
  case "add":
    await cmdAdd(a, b);
    break;
  case "on":
    cmdToggle(a, true);
    break;
  case "off":
    cmdToggle(a, false);
    break;
  case "rm":
    cmdRemove(a);
    break;
  case "check":
    await cmdCheck();
    break;
  default:
    console.log(USAGE);
    if (cmd) process.exitCode = 1;
}

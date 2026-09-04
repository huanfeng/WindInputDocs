import { siteNotice } from "./notice";

/**
 * 注入 `<head>` 同步执行的判定脚本，以及它们与各自组件共用的键名。
 *
 * 为什么单独一个模块，而不是跟在各自的组件旁边：这些字符串要被 app/layout.tsx
 * 这个**服务端**组件读到，而 Next 的 RSC 边界会把 `"use client"` 模块的每一个
 * 导出都换成客户端引用代理——字符串常量也不例外。服务端拿到的于是不是脚本本身，
 * 而是一个抛错的存根，渲染进 `<script>` 就成了
 *
 *     function(){throw Error("Attempted to call previewBootstrap() from the server ...")}
 *
 * 一段语法错误的脚本，浏览器整段跳过，且不会有任何提示。本文件没有 `"use client"`，
 * 常量因此原样过得去。**要往 `<head>` 加新的 bootstrap，请加在这里。**
 */

/** 预览模式：URL 参数、localStorage 键、写在 `<html>` 上的标记 */
export const PREVIEW_PARAM = "preview";
export const PREVIEW_KEY = "wi-preview";
export const PREVIEW_ATTR = "data-preview";

/** 全站公告：localStorage 键（存的是公告 id）、写在 `<html>` 上的标记 */
export const NOTICE_KEY = "wi-notice";
export const NOTICE_ATTR = "data-notice-dismissed";

/**
 * 预览模式的开关。必须同步、且必须在 body 之前：晚一步执行，未发布的内容就会
 * 先渲染出来再被藏掉，闪那一下等于没藏。所以是一段裸字符串而不是 React 组件
 * ——组件最早也要等到水合，来不及。
 *
 * `?preview=1` 开启并记住，`?preview=0` 关闭并忘掉；开过之后不带参数也保持开启，
 * 免得每次翻页都要重新加参数。配套的隐藏规则见 global.css 的
 * `:root:not([data-preview]) [data-unreleased]`。
 */
export const previewBootstrap = `
try {
  var p = new URLSearchParams(location.search).get("${PREVIEW_PARAM}");
  if (p === "1" || p === "0") localStorage.setItem("${PREVIEW_KEY}", p);
  if (localStorage.getItem("${PREVIEW_KEY}") === "1")
    document.documentElement.setAttribute("${PREVIEW_ATTR}", "1");
} catch (e) {}
`;

/**
 * 全站公告的关闭状态，同样必须早于首帧：静态导出的每一页 HTML 里都带着那枚胶囊，
 * 等水合后再摘掉，关过它的人每翻一页都会看见它闪一下。
 *
 * 比对的是公告 id 而不是 `true`：换公告时连 id 一起换，比对自然不相等，胶囊对
 * 所有人重新出现。没有公告时整段为空串。
 */
export const noticeBootstrap = siteNotice
  ? `
try {
  if (localStorage.getItem("${NOTICE_KEY}") === ${JSON.stringify(siteNotice.id)})
    document.documentElement.setAttribute("${NOTICE_ATTR}", "1");
} catch (e) {}
`
  : "";

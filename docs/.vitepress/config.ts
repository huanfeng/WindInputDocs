import { defineConfig } from "vitepress";

const base = process.env.WINDINPUT_DOCS_BASE || "/";

const CJK_CLASS = "[\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff]";
const cjkCharRe = new RegExp(CJK_CLASS);
const cjkRunRe = new RegExp(`(${CJK_CLASS}+)`, "u");

export default defineConfig({
  title: "清风输入法",
  description: "清风输入法 - 轻量、快速、可定制的开源中文输入法",

  lang: "zh-CN",
  base,

  srcDir: ".",

  head: [["link", { rel: "icon", href: `${base}logo.png` }]],

  themeConfig: {
    logo: `${base}logo.png`,

    nav: [
      { text: "首页", link: "/" },
      { text: "快速入门", link: "/guide/install" },
      { text: "输入法设置", link: "/settings/general" },
      { text: "专题", link: "/topics/" },
      { text: "常见问题", link: "/faq/" },
      { text: "更新记录", link: "/changelog/" },
      { text: "下载", link: "/download/" },
      {
        text: '主题编辑器<span class="nav-badge-new">NEW</span>',
        link: "https://theme.windinput.com",
        target: "_blank",
      },
      {
        text: '主题市场<span class="nav-badge-new">NEW</span>',
        link: "https://market.windinput.com",
        target: "_blank",
      },
    ],

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      label: "本页目录",
    },

    lastUpdated: {
      text: "最后更新于",
    },

    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到亮色模式",
    darkModeSwitchTitle: "切换到暗色模式",

    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: "搜索文档",
                buttonAriaLabel: "搜索文档",
              },
              modal: {
                noResultsText: "无相关结果",
                resetButtonTitle: "清除查询条件",
                displayDetails: "显示详情",
                backButtonTitle: "返回",
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                  closeText: "关闭",
                },
              },
            },
          },
        },
        miniSearch: {
          options: {
            tokenize: (text: string) => {
              const tokens: string[] = [];
              for (const part of text.split(cjkRunRe)) {
                if (!part) continue;
                if (cjkCharRe.test(part)) {
                  for (let i = 0; i < part.length; i++) {
                    tokens.push(part[i]);
                    if (i + 1 < part.length) tokens.push(part.slice(i, i + 2));
                  }
                } else {
                  for (const t of part.split(/[\s\p{P}]+/u)) {
                    if (t) tokens.push(t);
                  }
                }
              }
              return tokens;
            },
            processTerm: (term: string) => term.toLowerCase(),
          },
          searchOptions: {
            fuzzy: 0,
            prefix: true,
            combineWith: "AND",
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
      },
    },

    sidebar: [
      {
        text: "快速入门",
        items: [
          { text: "安装", link: "/guide/install" },
          { text: "基础使用", link: "/guide/basics" },
        ],
      },
      {
        text: "输入法设置",
        items: [
          { text: "方案", link: "/settings/general" },
          { text: "输入", link: "/settings/input" },
          { text: "按键", link: "/settings/hotkeys" },
          { text: "外观", link: "/settings/appearance" },
          { text: "词库", link: "/settings/dictionary" },
          { text: "高级", link: "/settings/advanced" },
          { text: "统计", link: "/settings/stats" },
        ],
      },
      {
        text: "高级",
        items: [
          { text: "方案介绍与切换", link: "/schema/" },
          { text: "方案配置制作", link: "/schema/custom" },
          { text: "配置机制与全局配置", link: "/config/" },
          { text: "方案配置详解", link: "/config/schema" },
          { text: "兼容性与自定义主题", link: "/config/compat-theme" },
        ],
      },
      {
        text: "专题",
        items: [
          { text: "专题索引", link: "/topics/" },
          { text: "权重系统", link: "/topics/weight-system" },
          { text: "命令直通车", link: "/topics/command-bar" },
          { text: "引导键特殊模式", link: "/topics/special-mode" },
        ],
      },
      {
        text: "快捷键参考",
        items: [{ text: "快捷键一览", link: "/hotkeys/" }],
      },
      {
        text: "常见问题",
        items: [{ text: "FAQ", link: "/faq/" }],
      },
      {
        text: "更新记录",
        items: [{ text: "更新记录", link: "/changelog/" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/huanfeng/WindInput" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present WindInput",
    },
  },

  markdown: {
    lineNumbers: true,
  },

  ignoreDeadLinks: true,
});

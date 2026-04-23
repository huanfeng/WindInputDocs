import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '清风输入法',
  description: '清风输入法 - 轻量、快速、可定制的开源中文输入法',

  lang: 'zh-CN',

  srcDir: '.',

  head: [
    ['link', { rel: 'icon', href: '/logo.png' }]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: '首页', link: '/' },
      { text: '下载', link: 'https://github.com/huanfeng/WindInput/releases' },
      { text: '快速入门', link: '/guide/install' },
      { text: '输入方案', link: '/schema/' },
      { text: '设置', link: '/settings/general' },
      { text: '配置', link: '/config/' },
      { text: '常见问题', link: '/faq/' },
    ],

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '本页目录',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到亮色模式',
    darkModeSwitchTitle: '切换到暗色模式',

    sidebar: [
      {
        text: '快速入门',
        items: [
          { text: '安装', link: '/guide/install' },
          { text: '基础使用', link: '/guide/basics' },
        ]
      },
      {
        text: '输入方案',
        items: [
          { text: '方案介绍与切换', link: '/schema/' },
          { text: '方案配置制作', link: '/schema/custom' },
        ]
      },
      {
        text: '设置说明',
        items: [
          { text: '常规与启动', link: '/settings/general' },
          { text: '输入行为', link: '/settings/input' },
          { text: '快捷键', link: '/settings/hotkeys' },
          { text: '外观与主题', link: '/settings/appearance' },
          { text: '词库管理', link: '/settings/dictionary' },
          { text: '高级选项', link: '/settings/advanced' },
        ]
      },
      {
        text: '配置文件',
        items: [
          { text: '配置机制与全局配置', link: '/config/' },
          { text: '方案配置详解', link: '/config/schema' },
          { text: '兼容性与自定义主题', link: '/config/compat-theme' },
        ]
      },
      {
        text: '快捷键参考',
        items: [
          { text: '快捷键一览', link: '/hotkeys/' },
        ]
      },
      {
        text: '常见问题',
        items: [
          { text: 'FAQ', link: '/faq/' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/huanfeng/WindInput' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present WindInput'
    }
  },

  markdown: {
    lineNumbers: true
  },

  ignoreDeadLinks: true
})

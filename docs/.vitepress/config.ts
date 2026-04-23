import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '清风输入法',
  description: '清风输入法 - 轻量、快速、可定制的开源中文输入法',

  srcDir: '.',

  head: [
    ['link', { rel: 'icon', href: '/logo.png' }]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/install' },
      { text: '快捷键', link: '/hotkeys/' },
      { text: '配置', link: '/config/' },
      { text: '常见问题', link: '/faq/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '安装', link: '/guide/install' },
            { text: '快速入门', link: '/guide/quickstart' },
            { text: '输入方案', link: '/guide/schemas' },
            { text: '切换输入法', link: '/guide/switch' },
            { text: '设置工具', link: '/guide/settings' },
          ]
        }
      ],
      '/hotkeys/': [
        {
          text: '快捷键',
          items: [
            { text: '快捷键一览', link: '/hotkeys/' },
          ]
        }
      ],
      '/config/': [
        {
          text: '配置',
          items: [
            { text: '配置说明', link: '/config/' },
          ]
        }
      ],
      '/faq/': [
        {
          text: '常见问题',
          items: [
            { text: 'FAQ', link: '/faq/' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/huanfeng/WindInput' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present WindInput'
    }
  },

  markdown: {
    lineNumbers: true
  },

  ignoreDeadLinks: true
})

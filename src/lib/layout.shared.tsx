import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, mainRepo, releasesUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    links: [
      { text: '文档', url: '/docs', active: 'nested-url' },
      { text: '下载', url: releasesUrl, external: true },
      { text: '主题编辑器', url: 'https://theme.windinput.com', external: true },
      { text: '主题市场', url: 'https://market.windinput.com', external: true },
    ],
    // 顶栏 GitHub 图标指向主程序仓库
    githubUrl: `https://github.com/${mainRepo.user}/${mainRepo.repo}`,
  };
}

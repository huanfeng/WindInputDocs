import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  // 静态导出没有图片优化服务，next/image 需显式关闭优化
  images: { unoptimized: true },
};

export default withMDX(config);

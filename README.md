# Kevin AI局 · kevinai.top

Kevin 的长期个人主页：展示真正上线的产品、文章与开发记录，并把可复核评测作为其中一个独立栏目。站点提供中文 / 与英文 /en 两套可索引路径。

## 技术栈

- 框架：Vite 6 + React 18 + TypeScript
- 路由：react-router-dom（BrowserRouter）
- 样式：Tailwind CSS 3
- 3D / 动效：Three.js + React Three Fiber + GSAP ScrollTrigger
- SEO：react-helmet-async、Open Graph、hreflang、sitemap、robots
- 内容：产品档案、文章归档、评测原始网页与公开数据

## 快速开始

    npm install
    npm run dev

## 构建与验证

    npm run typecheck
    npm run lint
    npm run build
    npm run verify

## 部署

已配置 GitHub Pages 工作流。推送至 main 后自动构建并部署到 kevinai.top。

SPA 深链通过 404.html + redirect 查询参数回退处理，确保中文、英文以及评测详情路径都可直接访问。

## 项目文档

- PRODUCT.md：产品目标、信息架构与数据边界
- DESIGN.md：视觉系统、动效规则与双语约定
- CONTENT_SOURCES.md：真实素材与事实来源

## 域名

public/CNAME 内容为 kevinai.top。

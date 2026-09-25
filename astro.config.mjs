import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// 사이트별 환경 변수에서 site URL 읽음 (자동 셋업 스크립트가 .env 자동 생성)
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://smartcashflow.org';

// Confirmed noindex category routes; preserve robots directives.
// Recheck this bounded list when retained category membership changes.
const NOINDEX_CATEGORY_PATHS = new Set([
  "/category/banking/",
  "/category/cash-flow/",
  "/category/education-planning/",
  "/category/emergency-budgeting/",
  "/category/emergency-funds/",
  "/category/household-budget/",
  "/category/investing/",
  "/category/medical-bills/",
  "/category/rent-housing-costs/",
  "/category/retirement/",
  "/category/savings/",
  "/category/tax-planning/"
]);

export default defineConfig({
  site: SITE_URL,
  integrations: [
    tailwind({
      applyBaseStyles: false, // global.css에서 직접 베이스 스타일 작성
    }),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !NOINDEX_CATEGORY_PATHS.has(decodeURIComponent(pathname.replace(/\/?$/, '/'))) && !pathname.startsWith('/tags/') && pathname !== '/search/' && !pathname.startsWith('/posts/page/');
      },
    }),
    mdx(),
  ],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});

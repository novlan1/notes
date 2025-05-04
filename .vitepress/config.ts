import { defineConfig } from 'vitepress';
import sidebarConfig from './sidebar.json';
import { getFooterMessage } from './footer';


// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: '简单点',
  description: '杨的笔记',


  lastUpdated: true,
  cleanUrls: true,
  base: '/notes/',

  head: [
    ['link', { rel: 'icon', href: '/notes/favicon.ico' }],
    ['meta', { name: 'author', content: 'novlan1' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          '前端, notes, 笔记, Javascript, Typescript, React, Vue, webpack, vite, HTTP, 算法',
      },
    ],
    [
      'script',
      {
        src: 'https://tam.cdn-go.cn/aegis-sdk/latest/aegis.min.js',
      },
    ],
    [
      'script',
      {},
      `
      console.log('Aegis', window.Aegis);
      if (typeof Aegis === 'function') {
        var aegis = new Aegis({
          id: 'gQnLgtg0Ge1bzwkXy2', // 上报 id
          uin: 'xxx', // 用户唯一 ID（可选）
          reportApiSpeed: true, // 接口测速
          reportAssetSpeed: true, // 静态资源测速
          spa: true, // spa 应用页面跳转的时候开启 pv 计算
          hostUrl: 'https://rumt-zh.com'
        });
        console.log('aegis', aegis);
      }
      console.log('welcome notes of novlan1!');
      `,
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Press UI', link: 'https://github.com/novlan1/press-ui/' },
      { text: 'T Comm', link: 'https://github.com/novlan1/t-comm/' },
      {
        text: 'Plugin Light',
        link: 'https://github.com/novlan1/plugin-light/',
      },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },

    sidebar: [
      ...sidebarConfig.sidebar,
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/novlan1/notes/' }],

    footer: {
      message: getFooterMessage(),
      copyright: 'Copyright © 2025-present novlan1',
    },
  },
  ignoreDeadLinks: true,

  vite: {
    esbuild: {
      loader: 'tsx', // 支持 TS/TSX
    },
  },
});

import { withMermaid } from 'vitepress-plugin-mermaid';
import sidebarConfig from './sidebar.json';
import { getFooterMessage } from './footer';

// https://vitepress.dev/reference/site-config
export default withMermaid({
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
          // uin: 'xxx', // 用户唯一 ID（可选）
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
      {
        text: '组件库',
        items: [
          {
            text: 'Press UI',
            link: 'https://github.com/novlan1/press-ui/',
          },
          {
            text: 'TDesign UniApp',
            link: 'https://uwayfly.com/tdesign-uniapp/',
          },
        ],
      },
      {
        text: '工具',
        items: [
          {
            text: 'T Comm',
            link: 'https://github.com/novlan1/t-comm/',
          },
          {
            text: 'Plugin Light',
            link: 'https://github.com/novlan1/plugin-light/',
          },
          {
            text: 'NPM',
            link: 'https://www.npmjs.com/search?page=0&q=author%3Ayanggwcn&sortBy=downloads_weekly',
          },
          {
            text: 'NPM TD Uniapp',
            link: 'https://www.npmjs.com/search?q=%40tdesign%2Funiapp',
          },
          {
            text: 'TD Uniapp 插件',
            link: 'https://ext.dcloud.net.cn/plugin?name=tdesign-uniapp',
          },
          {
            text: 'TAPD',
            link: 'https://tapd.woa.com/tapd_fe/my/work?default=1&jump_count=1',
          },
          {
            text: 'TD Uniapp Demo',
            link: 'https://tdesign.tencent.com/uniapp/live#/',
          },
          {
            text: 'TD Uniapp Docs',
            link: 'https://tdesign.tencent.com/uniapp/overview/',
          },
          {
            text: 'TD Uniapp Starter',
            link: 'https://tdesignoteam.github.io/tdesign-uniapp-starter/#/',
          },
          {
            text: 'TD Uniapp Starter Apply',
            link: 'https://tdesignoteam.github.io/tdesign-uniapp-starter-apply/#/',
          },
          {
            text: 'TD Uniapp Vue3 HX',
            link: 'https://tdesignoteam.github.io/tdesign-uniapp-starter-vue3-hx/#/',
          },
          {
            text: 'TD Uniapp Vue2 CLI',
            link: 'https://tdesignoteam.github.io/tdesign-uniapp-starter-vue2-cli/#/',
          },
          {
            text: 'TD Uniapp Vue2 HX',
            link: 'https://tdesignoteam.github.io/tdesign-uniapp-starter-vue2-hx/#/',
          },
          {
            text: 'CF 赛事',
            link: 'https://h5.igame.qq.com/pmd-mobile.cg-match.cf-match.cf-pc/#/allscheduletopersonal/7336115/7336116/7336197/1?subGid=2',
          },
        ],
      },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },

    sidebar: {
      '/docs/': [...sidebarConfig.sidebar],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/novlan1/notes/' },
    ],

    footer: {
      message: getFooterMessage(),
      copyright: 'Copyright © 2025-present novlan1',
    },
  },
  ignoreDeadLinks: false,

  vite: {
    esbuild: {
      loader: 'tsx', // 支持 TS/TSX
    },
  },

  mermaid: {
    // 配置参考： https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults
  },

  // 可选地使用 MermaidPluginConfig 为插件本身设置额外的配置
  mermaidPlugin: {
    class: 'mermaid my-mermaid-class', // 为父容器设置额外的CSS类
  },
});

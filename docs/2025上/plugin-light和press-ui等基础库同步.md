## 1. 开始

同步下 `plugin-light`、`press-ui`、`press-plus`、`press-next` 等基础库的作用、文档、常见问题等，避免来回提问。这里的每个库都已深入应用到游戏人生所有业务中。

## 2. plugin-light

[plugin-light](https://mobile.com/plugin-light/) 是一个丰富、易用的工具集，采用基于 pnpm 的 monorepo 架构，模块包含项目公共配置、基础 Eslint 配置、基础插件、脚手架等。

每个包都有单独的文档地址，如 [eslint-config-light-vue3](https://mobile.com/plugin-light/zh/eslint-config-light-vue3.html)，每次发布都有更新日志，如 [project-config-uni-vite](https://mobile.com/plugin-light/changelog/project-config-uni-vite.html)。每个包的常见问题都会罗列在文档中，如 [project-config-vite](https://mobile.com/plugin-light/zh/project-config-vite.html#%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)。建议前端同事从头翻到尾，有能力的看下源码。

| 类型            | 命名                                                                | 数量 |
| --------------- | ------------------------------------------------------------------- | ---- |
| 项目配置        | `project-config-*`                                                  | 4    |
| 底层依赖        | `plugin-light-*`, `import-meta-resolve`, <br/>`uni-read-pages-vite` | 5    |
| 运行时工具      | `ebus-light`, `share-light`, `vconsole-helper`                      | 3    |
| 脚手架          | `net-cli`                                                           | 1    |
| ESLint 共享配置 | `eslint-config-*`                                                   | 2    |
| ESLint 插件     | `eslint-plugin-*`                                                   | 1    |
| Vite 插件       | `vite-plugin-*`                                                     | 28   |
| Webpack 插件    | `webpack-plugin-*`                                                  | 25   |
| Webpack Loader  | `webpack-loader-*`                                                  | 20   |
| Postcss 插件    | `postcss-plugin-*`                                                  | 2    |

以下项目建议首先阅读：

- [Uni App Vite 项目基础配置](https://mobile.com/plugin-light/zh/project-config-uni-vite.html)
- [Uni App Vue 项目基础配置](https://mobile.com/plugin-light/zh/project-config-uni-vue.html)
- [Vite 项目基础配置](https://mobile.com/plugin-light/zh/project-config-vite.html)
- [Vue 项目基础配置](https://mobile.com/plugin-light/zh/project-config-vue.html)
- [ESlint Config Light](https://mobile.com/plugin-light/zh/eslint-config-light.html)
- [ESlint Config Light Vue3](https://mobile.com/plugin-light/zh/eslint-config-light-vue3.html)
- [Vue3 前端脚手架 Net CLI](https://mobile.com/plugin-light/zh/net-cli.html)

贡献指南[参考这里](https://mobile.com/plugin-light/CONTRIBUTING.html)。

## 3. press-ui

[press-ui](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui/) 是一套易用、灵活、基于 `uni-app` 的跨端组件库，兼容 Vue2 和 Vue3，同时支持 `uni-app` 和 `非uni-app`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/press/img/services.gif" width="500">

建议参与跨端开发、H5开发的同事仔细阅读文档。

贡献指南[参考这里](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui/contributing.html)。

## 4. press-plus

[press-plus](https://h5.igame.qq.com/pmd-mobile.support.press-plus.press-ui/) 是基于 `press-ui` 的业务组件库，核心组件包括物品兑换、物品详情、物品列表、消息详情、赛程等。

`press-plus` 可应用的技术栈同 `press-ui` 一样，支持 Vue2 和 Vue3，支持 `uni-app` 和 `非uni-app`。

贡献指南[参考这里](https://h5.igame.qq.com/pmd-mobile.support.press-plus.press-ui/contributing.html)。

## 5. press-next

[press-next](https://h5.igame.qq.com/pmd-mobile.pmd-h5.press-next.press-next/) 也是基于 `press-ui` 的业务组件库，与 [press-plus](https://h5.igame.qq.com/pmd-mobile.support.press-plus.press-ui/) 不同的是 `press-next` 可以支持 `composition API`，且不再支持 Vue2。

press-next 中组件包括和平赛事、掼蛋赛事、无畏赛事等组件，未来所有 vue3 h5 项目的组件都会沉淀到这里。

贡献指南[参考这里](https://h5.igame.qq.com/pmd-mobile.pmd-h5.press-next.press-next/contributing.html)。

## 6. press-components

[press-components](https://h5.igame.qq.com/pmd-mobile.pmd-h5.press-components.press/) 是基于 pnpm 的 monorepo 库，包含了对 `tdesign-vue-next` 和 `element-plus` 的二次封装，是 PC 组件库。与 `press-ui/press-next` 等互不引用。

贡献指南[参考这里](https://h5.igame.qq.com/pmd-mobile.pmd-h5.press-components.press/zh-CN/guide/docs-dev.html)。

## 7. 其他

- [frontend-cloud](https://git.com/pmd-mobile/pmd-h5/frontend-cloud)，上云项目，用于回滚、灰度发布、备份等
- [cron-job](https://git.com/pmd-mobile/pmd-h5/cron-job)，定时任务管理
- [t-comm](https://git.com/pmd-mobile/pmd-h5/t-comm)，专业、稳定、纯粹的工具库
- [vue-template](https://git.com/pmd-mobile/pmd-h5/vue3-h5-template)，非 uni-app Vue3 项目模板，包括 h5、PC、TGS等模版
- [vue-cross-template](https://git.com/pmd-mobile/pmd-h5/vue3-cross-template)，uni-app Vue3 项目模板

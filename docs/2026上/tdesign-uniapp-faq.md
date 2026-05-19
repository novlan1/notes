<!-- @tdesign/uniapp 常见问题 -->
## 1. 开始

罗列下 [@tdesign/uniapp](https://tdesign.tencent.com/uniapp/) 中的常见问题，持续更新。

## 2. FAQ

### 2.1. setup 语法糖下函数式调用 Toast 等组件时如何传递 `context`

最简单的方式是在页面下预埋，这时根本不需要传递 `context`。

```vue
<!-- 页面级别组件: xx.vue -->
<template>
 <div>
    ...
    <t-toast />
  </div>
</template>
```

### 2.2. Icon 太大怎么办

<img src="https://cdn.uwayfly.com/article/2026/2/own_mike_6k8bS4My3RnnZKFa.png" width="500" />

可以参考[这篇文章](https://juejin.cn/post/7604037348607377446)，使用[这个插件](https://www.npmjs.com/package/@novlan/postcss-plugin-remove-selector?activeTab=readme)进行解决。

### 2.3. HBuilderX 中运行到内置浏览器时报错 `Unexpected token .`

报错如下：

<img src="https://cdn.uwayfly.com/article/2026/2/own_mike_zK46aa55bnbrGXZx.png" width="700" />

这是 HBuilderX 自己的问题，[参考这里](https://ask.dcloud.net.cn/question/195875)。

可以运行到 Chrome 中，或者使用 CLI 模式。

### 2.4. Vue2 下的适配

参考[这篇文章](https://juejin.cn/post/7602901195154030644)。

### 2.5. 报错 Failed to load font

微信开发者工具报错

```
[渲染层网络层错误] Failed to load font https://tdesign.gtimg.com/icon/0.4.1/fonts/t.woff
net::ERR_CACHE_MISS
(env: macOS,mp,2.01.2510270; lib: 3.14.2)
```

<img src="https://cdn.uwayfly.com/article/2026/3/own_mike_yPaRHdteSeCnbZc7.png" width="600" />

原因：微信开发者工具的 bug，忽略即可。

参考：[wx.loadFontFace 文档](https://developers.weixin.qq.com/miniprogram/dev/api/ui/font/wx.loadFontFace.html)

### 2.6. Input 组件内容抖动

小程序下，在 Popup 或 Dialog 等组件中，Input 组件中内容可能会抖动。

原因：本质是小程序自己的问题，可以设置组件的 `transition:none;` 禁用动画，或者在 Popup/Dialog 组件中，延迟显示 Input 组件。

参考：

1. [issue#3078](https://github.com/Tencent/tdesign-miniprogram/issues/3078)
2. [issue#2674](https://github.com/Tencent/tdesign-miniprogram/issues/2674)
3. [issue#489](https://github.com/Tencent/tdesign-miniprogram/issues/489)

之前：

<img src="https://cdn.uwayfly.com/tdesign-uniapp/faq/2025-05/placeholader-before.gif" width="300" />

之后：

<img src="https://cdn.uwayfly.com/tdesign-uniapp/faq/2025-05/placeholader-after.gif?a=2123" width="300" />

### 2.7. 插槽类型报错

报错如下：

```
Property 'description' does not exist on type '{}'.
```

<img src="https://cdn.uwayfly.com/article/2026/3/own_mike_GkHMbCKWxGERyhQJ.png" width="600" />

<img src="https://cdn.uwayfly.com/article/2026/3/own_mike_ZKMS3XyGHjtSnCGC.png" width="600" />

原因：`tsconfig.json` 中 `compilerOptions.moduleResolution` 配置了 `node` 等字段，未识别到 `@tdesign/uniapp` 中的 `exports`。

解决办法：修改 `tsconfig.json` 中 `compilerOptions.moduleResolution` 为 `bundler`。可参考 [tdesign-uniapp-starter](https://github.com/TDesignOteam/tdesign-uniapp-starter/)。

### 2.8. PC 浏览器环境下的拖动

PC 环境下，可以通过加载 `touch-emulator` 脚本来适配。

脚本地址: https://tdesign.gtimg.com/js/touch-emulator.js, 你可以放到自己的 CDN 上。

### 2.9. Indexes 组件滑动问题

Indexes 组件依赖 onPageScroll，在小程序、APP-PLUS 等平台下，动态监听 `onPageScroll` 不生效，需要业务自己在页面中监听，下面给出最佳实践之一。

```js
// 页面 Vue 文件下，引入组件库提供的监听方法
// 该方法内部会通过 event-bus，传递参数给对应的组件
import { handlePageScroll } from 'tdesign-uniapp/mixins/page-scroll';

// Vue3
defineOptions({
  onPageScroll(e) {
    handlePageScroll(e);
  },
});

// Vue2
export default {
  onPageScroll(e) {
    handlePageScroll(e);
  },
}
```

### 2.10. H5 端横滑组件导致页面上下抖动

`swipe-cell` 等需要横向手势的组件，在 H5 端左右滑动时，浏览器默认会同时触发纵向滚动判定，导致页面跟着上下抖动。

解决方案：在组件根节点上加一行 CSS，告诉浏览器**只处理纵向手势**，横向交给组件自己消费。

```less
// 全局或父组件样式中（注意非 scoped 或加 :deep）
:deep(.t-swipe-cell) {
  touch-action: pan-y;
}
```

说明：

- `touch-action: pan-y` 表示元素只允许浏览器接管纵向滚动，横向 touch 事件由 JS 处理，从而消除横滑抖动
- 该属性是浏览器原生 CSS，**仅 H5 端生效**，小程序 / nvue 端会自动忽略，无副作用
- 同理也可以用在其他自定义横滑组件上（如 swiper 容器、轮播 tab 等）

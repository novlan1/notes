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

第二种方式如下。

```vue
<script lang="ts" setup>
import TToast from '@tdesign/uniapp/toast/toast.vue';

Toast({
  context: {
    $refs: {
      't-toast': TToast.value,
    },
    // ...
  }
})
</script>
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

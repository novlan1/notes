### 1. 背景

[@tdesign/uniapp](https://tdesign.tencent.com/uniapp/) 在 Vue2 中需要做一些适配。

1. 组件库使用了 `:v-deep(xxx)`，Vue2 下需要用插件转成 `::v-deep xxx`
2. 组件库单位使用了 `rpx`，这样在小程序等场景更合适。但是默认情况下 H5 环境 `node_modules` 或 `uni_modules` 下的内容其实不会转化。

### 2. CLI 模式

解决方案是

1. 在 [postcss.config.js](https://github.com/novlan1/tdesign-uniapp-vue2-cli-starter/blob/master/postcss.config.js) 中增加一些插件
2. [transpileDependencies](https://github.com/novlan1/tdesign-uniapp-vue2-cli-starter/blob/master/vue.config.js) 中配置 `['tdesign-uniapp', 'tdesign-uniapp-chat']`

### 3. HBuilderX 模式

解决方案类似

1. 在 [postcss.config.js](https://github.com/novlan1/tdesign-uniapp-vue2-cli-starter/blob/master/postcss.config.js) 中增加一些插件，与 CLI 模式有差异
2. 先临时修改 uni_modules/tdesign-uniapp/components 组件样式引入方式

```diff
- <style scoped>
-  @import './button.css';
+ <style scoped src="./button.css">
</style>
```

第2条是临时方案，下一个版本优化下。

### 4. 示例项目

提供了多种模式的模板项目，方便查看、借鉴。

- [Vue2 CLI 模式](https://github.com/TDesignOteam/tdesign-uniapp-starter-vue2-cli)
- [Vue2 HBuilderX 模式](https://github.com/TDesignOteam/tdesign-uniapp-starter-vue2-hx)
- [Vue3 HBuilderX 模式](https://github.com/TDesignOteam/tdesign-uniapp-starter-vue3-hx)

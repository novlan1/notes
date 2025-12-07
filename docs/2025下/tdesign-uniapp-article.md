## 1. 背景

跨端开发一直是前端领域的重要部分，旨在实现一套代码在多个平台运行。国内使用 [uniapp](https://uniapp.dcloud.net.cn/) 框架人数较多，一直有外部声音想要 uniapp 版本的 TDesign，如 TDesign Miniprogram 下的众多 [issue](https://github.com/Tencent/tdesign-miniprogram/issues?q=uniapp)。

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_z2BC3Qi7FE8DNNWx.png" width="600" />

原生小程序和 uniapp 有差异，有人在 uniapp 项目里用了原生小程序组件，需要魔改内部组件代码。

基于以上需求，写了 [TDesign UniApp](https://github.com/novlan1/tdesign-uniapp) 项目。支持：

- 🌈 暗色模式
- 🌈 自定义主题
- 🌍  国际化
- 🚀 API 对齐官方
- 🚀 类型提示
- ...

欢迎使用，欢迎 star，欢迎反馈！

- 文档地址：https://uwayfly.com/tdesign-uniapp/
- Github 地址：https://github.com/novlan1/tdesign-uniapp
- NPM 地址: https://www.npmjs.com/package/tdesign-uniapp
- DCloud 插件：https://ext.dcloud.net.cn/plugin?id=25431

## 2. 预览

扫码查看 ↓

<img src="https://cdn.uwayfly.com/tdesign-uniapp/tdesign-uniapp-qrcodes.png?a=3" width="600" />

（注：其他平台同样支持，仅因平台审核等原因未能上架预览，不影响组件库正常使用。）

## 3. 快速开始

### 3.1. 安装

1. NPM 方式

```bash
npm i tdesign-uniapp
```

2. UNI_MODULES 方式

已上传[插件](https://ext.dcloud.net.cn/plugin?id=25431)到 DCloud 插件市场，请打开插件详情页并点击`使用 HBuilderX 导入插件`。

### 3.2. 引入并使用

1. `main.ts` 中引入样式文件

```js
import 'tdesign-uniapp/common/style/theme/index.css';
```

2. 在文件中使用

```html
<template>
  <t-loading />
</template>

<script lang="ts" setup>
import TLoading from 'tdesign-uniapp/loading/loading.vue';
</script>
```

### 3.3. 自动导入

在 `pages.json` 配置 [easycom](https://uniapp.dcloud.net.cn/collocation/pages.html#easycom)，可实现自动导入。

1. CLI 模式

使用 CLI 模式，即使用 `node_modules` 下的 `tdesign-uniapp` 时，配置如下。

```json
{
  "easycom": {
    "custom": {
      "^t-(.*)": "tdesign-uniapp/$1/$1.vue"
    }
  }
}
```

2. UNI_MODULES 模式

使用 `uni_modules` 下的 `tdesign-uniapp` 时，配置如下。

```json
{
  "easycom": {
    "custom": {
      "^t-(.*)": "@/uni_modules/tdesign-uniapp/components/$1/$1.vue"
    }
  }
}
```

### 3.4. 平台兼容性

| 平台         | Vue2 | Vue3 | H5  | Android | iOS | App-nvue | 微信小程序 | QQ小程序 |
| ------------ | ---- | ---- | --- | ------- | --- | -------- | ---------- | -------- |
| **支持情况** | ✅    | ✅    | ✅   | ✅       | ✅   | ⚠️        | ✅          | ✅        |

| 平台         | 支付宝小程序 | 抖音小程序 | 百度小程序 | 快手小程序 | 小红书小程序 | 京东小程序 |
| ------------ | ------------ | ---------- | ---------- | ---------- | ------------ | ---------- |
| **支持情况** | ✅            | ✅          | ✅          | ✅          | ✅            | ✅          |

## 4. 浅思考

有几点是做之前要想清楚的。

### 4.1. 为什么不做转换工具

1. 工具转出来的可读性差，可维护性差
2. 转换工具无法做到100%，总有些语法需要手动转换。这意味着一定会有人工介入
3. 维护转换工具成本比维护组件库高好几倍，且写出来的还不一定就能完全满足
4. 业务真正要用的是组件库，真正关心的也是组件库

### 4.2. 与 tdesign-miniprogram 版本关系

`tdesign-uniapp` 有独立的版本，并不与 `tdesign-miniprogram` 的版本相同。这是因为转换后的产物很有可能有自己的 `feature/bug`，处理需要发版，必然导致版本分叉。

多个 `tdesign-uniapp` 版本会对应一个 `tdesign-miniprogram` 版本，会尽量提供 `miniprogram`  最新版本的转换产物。

### 4.3. API 设计

API 一定要与官方一致，这是最不能妥协的，包括 `props`、`events`、事件参数，参数类型、插槽、CSS变量。

这样做的好处是，开发者没有额外心智负担，同时限制开发人员的胡乱发挥，以及减少开发者的决策成本。

API 尽量与小程序对齐，而不是 `mobile-vue/mobile-react`，因为 `uniapp` 语法主要是小程序的语法。

### 4.4. 可维护性

- 用统一的语法
- 不使用编译后的、混淆后的变量

## 5. 转化过程

### 5.1. 核心转换逻辑

之前写过 Press UI，整体思路差不多。就是将小程序的 `wxml/wxss/js/json` 转成 uniapp 的 Vue，四个文件合成一个文件。以及将小程序的语法进行转化，以下是核心部分：

1. uniComponent 包裹，内部有一些公共处理
2. properties => props
3. setData => data 正常赋值
4. 生命周期改造
5. 事件改造
6. props 文件改造，from: `value: ([^{]+)`，to: `default: $1`

其他部分，如 `externalClasses`、`relations`，以及组件库特有的受控属性、命令调用等都需要进行额外的处理。

### 5.2. 事件参数

`tdesign-miniprogram` 中的事件参数，在 `tdesign-uniapp` 中都被去掉了 `detail` 一层。以 Picker 组件为例，在 `tdesign-miniprogram` 中，这样获取参数

```js
onPickerChange(e) {
  console.log(e.detail.value);
}
```

在 `tdesign-uniapp` 中，需要去掉 `.detail`，即

```js
onPickerChange(e) {
  console.log(e.value);
}
```

这样做是为了简化使用。`tdesign-uniapp` 中所有组件都采用了这种方式。

## 6. 细节

### 6.1. 命令调用

tdesign-uniapp 中支持命令调用的组件有

- ActionSheet
- Dialog
- Message
- Toast

TDesign UniApp 下，命令调用的核心思路是数据转化，就是把所有 `props` 都声明成 `data`，比如 `visible` => `dataVisible`，这样组件自身才能既能从方法（`methods`）中得到值，又能从 `props` 中得到值。要改的地方包括

1. `data` 中初始化
2. `watch` 中监听
3. `setData` 收口，设置的时候都加上特殊开头

每个组件具体实现不同。

- Message 嵌套了一层 `message-item`，`message-item` 没有 `props`，都是 `setData` 直接给的 `data`，所以根本不需要转换。
  - 这是另一种解决思路了，用嵌套子组件，而不是转换数据。子组件一嵌套，且数据全部不走 `props`，而是调用子组件内部方法。
  - 展示时， `setMessage`（组件调用、命令调用都走） => `addMessage` ( => `showMessageItem`) 或者 `updateMessage`
  - Message 中的 `setMessage/addMessage/showMessageItem` 都是指的内部的 `message-item`，是循环的 `messageList`，而不是页面级别的 `t-message`
- Dialog、ActionSheet 需要转换
  - 调用 `setData`，将属性（包含 `visible: true`）传进去，同时将 `instance` 的 `_onConfirm` 设置为 `promise` 的 `resolve`
- Toast 没有组件调用，只有命令式，无需数据转换。
  - 调用 `instance.show`，内部还是 `setData`

### 6.2. 受控属性

存在受控属性的非表单组件有

- 反馈类：ActionSheet、DropdownItem、Guide
- 展示类：CheckTag、Collapse、Image-viewer
- 导航类：Indexes、Sidebar、Steps、Tabbar、Tabs

TDesign UniApp 中受控属性的处理，和小程序版本差不多。是将其转成 `data` 开头的内部属性，初始化的时候，会判断受控和非受控值。同时触发事件的时候也要判断当前是否存在受控属性，非受控的时候直接改变内部值并抛出事件，受控的时候只抛出事件。以及，`props` 中受控属性的默认值需是 `null` 或 `undefined`。

不同的是，小程序受控属性，可以使用 `this.setData({ [value]: this.defaultValue })`，也就是 `data` 中声明了一个和 `properties` 名称一样的变量，Vue 中不可以，会报错 `'set' on proxy: trap returned falsish for property 'value'`

总结下来，受控属性要处理的：

1. `watch` 中监听
2. `created` 中初始化
3. `methods` 中新增 `_trigger`，作为抛出事件的收口

### 6.3. 三方库

`tdesign-miniprogram` 执行 `npm run build`，在 `miniprogram_dist/node_modules` 目录下 拿到 `dayjs` 和 `tinycolor2` 的产物，复制到 `tdesign-uniapp` 的 `npm` 目录下，用啥拿啥
。

一次性工作，一般不会改。

### 6.4. input 受控

H5 下，uni-app 封装了 `input`，且不支持受控。

Input 限制中文字符在 uni-app 实现的话，解决方案是先设置一次，然后在 `nextTick` 中再设置一次。

参考：https://ask.dcloud.net.cn/article/39736

其他方案：

1. 可以动态创建 `input` 元素，不用 uni-app 包裹的，缺点是更新属性麻烦。
2. 动态计算 `maxlength`，用浏览器原生属性约束，缺点是实现稍复杂、代码量稍多。

### 6.5. externalClass

uni-app 下，`externalClasses` 是不生效的。

参考：

- https://github.com/dcloudio/uni-app/issues/3275
- https://ask.dcloud.net.cn/question/163695

所以 `styleIsolation: apply-shared` 不够用，以只能改成 `styleIsolation: shared`，这样开发者才能在任意使用的地方覆盖组件样式。

可以改下 `packages/site/node_modules/@dcloudio/uni-mp-compiler/dist/transforms/transformComponent.js`，把 `isComponentProp` 方法，将 `t-class` 排除，就能解决，但是官方不会推出。

### 6.6. scoped

tdesign-uniapp 必须加 `scoped`，否则一个自定义组件加了 `styleIsolation: shared`，同一页面下其他没加此属性的自定义组件也会生效，只要 `class` 相同！

### 6.7. t-class

统一用 `tClass`，而不是 `class`。

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_bR3Jm86QaWDeWRdD.png" width="600" />

### 6.8. distanceTop

Drawer 顶部过高，是因为子组件 `popup` 中使用的 `--td-popup-distance-top` 变量为 `0`，这个变量由 `distanceTop` 生成，`distanceTop` 又是由 `using-custom-navbar` 这个 `mixin` 生成。

`distanceTop` 由 `uni.getMenuButtonBoundingClientRect` 计算生成，H5 和 App 下没有这个API，可以直接传入 `customNavbarHeight`，这个值由业务自行计算得到。

目前使用到 `using-custom-navbar` 这个 `mixin` 的组件有

- Overlay，基础，使用到它的也会引用
  - Popup
  - Picker
  - ActionSheet
  - Calendar
  - Dialog
  - Drawer
  - Guide
  - Toast
- Fab
- ImageViewer

### 6.9. page-scroll

APP-PLUS 下，动态监听 `onPageScroll` 不生效，需要业务自己在页面中监听，下面给出最佳实践之一。

```js
// 页面 Vue 文件下，引入组件库提供的监听方法
// 该方法内部会通过 event-bus，传递参数给对应的组件
import { handlePageScroll } from 'tdesign-uniapp/mixins/page-scroll';

export default {
  onPageScroll(e) {
    handlePageScroll(e);
  },
}
```

目前使用到 `page-scroll` 这个 `mixin` 的组件有

1. Sticky
2. Indexes
3. Tabs(引入了 Sticky)

示例页面有

- Fab
- PullDownRefresh

### 6.10. getCustomNavbarHeight 报错

```
Cannot read properties of null (reading 'parentElement')
```

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_ycz2zafE5BbMiDDs.png" width="600" />

这种就是 `mounted` 之后没延时，没获取到对应元素。

### 6.11. site 工程中的 alias

tdesign-uniapp 在 H5 下使用 `vite.config` 中的 `alias`，不使用 `workspace`，可解决修改组件后必须重启才能生效。

小程序下，这种方式需要进一步改造，只能引用同一个子工程，即不能跨 `src`，解决方案就是监听组件变动，同步复制到 `site` 工程下。

### 6.12. watch

小程序的 `observers` 和 `vue` 的 `watch` 逻辑并不完全相同，小程序下，如果 `prop` 接收外部传入的实参与该 `prop` 的默认值不相等时，会导致 `observer` 被立即调用一次，Vue 而不是。

`image` 中 `calcSize` 中就用到了。

### 6.13. auto-import

开发了 auto-import-resolver 插件，但是发现微信小程序下编译有问题，H5 下正常，推测是 uniapp 自己的问题。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_PEGTWZzYiQR36r7C.png" width="400" />

可以使用 [easycom](https://uniapp.dcloud.net.cn/collocation/pages.html#easycom) 模式。

⚠️ 注意，`easycom` 不支持 `TIcon` 这种大驼峰，只能是 `t-icon`，这种中划线形式。

### 6.14. visible

下面几个组件在关闭时，需要父组件中设置 `visible` 为 `false`，否则无法再次开启。也就是 `visible` 只能是受控的。可以给 `visible` 属性增加 `v-model` 语法糖。

- picker
- drawer
- cascader
- calendar
- date-time-picker
- color-picker

## 7. 支付宝小程序

### 7.1. styleIsolation

支付宝小程序只支持在 `json` 文件中配置 `styleIsolation`，参考[文档](https://opendocs.alipay.com/mini/framework/component-template#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6%E6%A0%B7%E5%BC%8F%E9%9A%94%E7%A6%BB)。

uni-app 会静态分析组件中的 `styleIsolation` 配置，放到组件对应的 `json` 文件中。源码地址：[packages/uni-mp-vite/src/plugins/entry.ts](https://github.com/dcloudio/uni-app/tree/next/packages/uni-mp-vite/src/plugins/entry.ts)。

正则表达式如下：

```js
const styleIsolationRE = [
  /defineOptions\s*[\s\S]*?styleIsolation\s*:\s*['"](isolated|apply-shared|shared)['"]/,
  /export\s+default\s+[\s\S]*?styleIsolation\s*:\s*['|"](isolated|apply-shared|shared)['|"]/,
]
```

所以，不能用 `uniComponent` 在运行时添加，只能在 Vue 中显式声明。

### 7.2. background

Stepper 中需显式声明 background 和 padding。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_Hce7tsxzWisb4MXZ.png" width="500" />

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_J8YPSmdtHBtKPQAs.png" width="500" />

Search 中同样问题。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_nPmaDZpdMnwrxGjm.png" width="500" />

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_bBmbPbAYx7R8abDf.png" width="500" />

### 7.3. disable-scroll

滚动穿透问题，uniapp 有[通用方案](https://uniapp.dcloud.net.cn/tutorial/vue3-basics.html#%E4%BA%8B%E4%BB%B6%E4%BF%AE%E9%A5%B0%E7%AC%A6) `@touchmove.stop.prevent="noop"`，支付宝下无效，需要设置 `disable-scroll`。参考[文档](https://opendocs.alipay.com/support/01rb9a)。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_Rs2z2SHDRnm4a4aa.png" width="600" />

⚠️ 注意，设置 `disable-scroll` 为 `true` 后，所有子元素的滚动都不能冒泡了，即便子元素设置的 `disable-scroll` 为 `false`，所以也尽可能减少 `disable-scroll` 属性的覆盖范围。

### 7.4. :deep 编译问题

避免 `less` 中两个 `:deep` 嵌套，其中一个不会被转化。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_t6jQCkeSjhYc2AYz.png" width="500" />

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_D643Bm7WjzhQX3jc.png" width="500" />

### 7.5. scroll-view

微信小程序 `scroll-view`，宽度 `100%`。支付宝小程序不是，需手动设置，不设置的话，撑不开。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_RYRrXDTrmrSdmCMh.png" width="500" />

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_NpK4EZ3p78tsQNda.png" width="500" />


## 8. 抖音小程序

### 8.1. virtualHost

遇到一个点击事件不能传递的问题，排查下来以为是不能用 `uniComponent` 包裹，猜测其内部会静态检测 `js` 文件。后面发现是不能使用 `virtualHost: true`，不止 `button` 组件，其他组件也不一样。

### 8.2. 样式穿透

抖音小程序原生的话，可以用 [externalClasses](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/tutorial/custom-component/component-model-and-style#a6c4373d) 来进行样式覆盖，但是前面提到过 uni-app 不支持。

它也不支持标签选择器，加上刚说的不能用 `virtualHost: true`，所以它的样式穿透是最麻烦的。

解决方案是，根据具体情况，对 `class/t-class/style/custom-style` 这些属性区分平台处理，比如

- DropdownItem 组件中，`btn` 用了 `class/t-class` 区分，`radio-group/checkbox-group` 用了 `custom-style`
- AvatarGroup 组件中，`avatar` 用了 `setStyle`（`children` 获取），因为 `avatar` 是外部定义的，无法用 `custom-style`
- 涉及到伪类的只能用 `class`，不能用 `custom-style`

### 8.3. 父子关系

抖音小程序给两个组件绑定父子关系也是最复杂的，其他小程序及H5可以通过 `provide/inject` 来收集 `parent`，抖音小程序中找不到（下面部分截图是放的 PressUI 组件库的）。

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_HHa8HeNminHbpC3j.png" width="600">

这里想到一个办法是递归调用 `$parent`，找最近的一个和目标组件名称相同的 `parent`。比如 `picker-item` 中就找组件名称为 `TPicker` 最近的父组件。

但是，抖音小程序子孙组件的 `$parent` 竟然就是页面，页面的所有 `$children` 都是拉平的。基于此，想到的办法是从上往下遍历这个拉平的 `$children`，找距离子组件最近的一个父组件。

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_bmwwwRjGpQYYHhf8.png" width="600">

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_XSEkhMDNRdNmXEDp.png" width="600">

但是，页面的 `$children` 并不是"父子父子父子.."这样顺序排列的，而是"父父父子子子..."，导致 `$children` 收集有问题，要么多于实际，要么为空。

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_b6aXQpMmPxh3naGG.png" width="600">

想到的办法是父子组件之间传递一个 `relationKey`，这个值是唯一的，找 `$parent` 时就不会找错了。

```ts
function findNearListParent(children = [], name) {
  let temp;
  for (const item of children) {
    const parentRelationKey = item.$props?.relationKey;
    const thisRelationKey = this.$props?.relationKey;
    if (item.$options.name === name && parentRelationKey === thisRelationKey) {
      temp = item;
    }
    if (item === this && temp) {
      return temp;
    }
  }

  return temp;
}
```

上面的 `relationKey` 应该永远从业务传入。内部组件，不管父子，都只接受 `props`，不自己生产，减少复杂度。这样的话，不管用 `slot`， `<x><x-item></x>` 还是用一个 `<x>`，都能保证 `relationKey` 同一个，且不论空还是不空，都是相等的。

此外，还有这种游离在依赖树之外的 `vm` 实例，也拿不到 `provide` 的值。

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_DZRyKmZBRZRA2B6k.png" width="600" />

这种主要发生在 Popup 组件内部的父子关系，比如 `dropdown-menu` 组件中的 `radio-group/radio`、 `cascader` 组件 `tab` 模式的 `tabs/tab-panel`。

这种问题的一个解决方案是在使用它们的地方手动关联。

### 8.4. 生命周期

Vue 中父子组件生命周期正常的执行顺序是：父组件先创建，然后子组件创建；子组件先挂载，然后父组件挂载，即“父beforeCreate-> 父create -> 子beforeCreate-> 子created -> 子mounted -> 父mounted”。

抖音小程序并不遵循这样的规律。

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_8rXrNdH7m6fmAaSd.png" width="600">

这个问题会导致父子组件的初始化数据出问题，之前在父组件 `mounted` 中执行的初始逻辑，都会因为还没收集完 `children`，而失败。

<img src="https://cdn.uwayfly.com/article/2025/6/own_mike_d3M8XdYzTBxHSRzh.png" width="370">

解决办法有两种，可用延时，也可用回调。回调更安全，延时可能跟机器性能有关。回调就是在子组件 `mounted` 的时候调用父组件的数据初始化方法。

## 9. 其他

### 9.1. 最简单的

`button` 不是最简单的，`loading/icon` 才是最简单的，它们是 `button` 的子元素。

### 9.2. 组件归类

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_4fNtPMKtDajWBTyW.png" width="600" />

导航类

- Navbar、Tabbar、Sidebar、Indexes 分别是上下左右四个方向的导航，固定
- Drawer、BackTop 都是可隐藏的，点击某处或滑动到某处时才显示
- Tabs 是业务中最常用的导航类组件，Steps 比 Tabs 更苛刻，有顺序，这两都以 `s` 结尾

反馈类

- Overlay、Popup、Loading 基础
- Message、Toast、Dialog、NoticeBar 是一类，Message 上+动态，Toast 中间，Dialog 中间，更重，NoticeBar 上+固定
- DropdownMenu、ActionSheet 一个从上往下显示，一个从下往上
- SwipeCell，PulldownRefresh 一个向左滑，一个向下滑
- Guide 特殊，全局，其他的都是局部

输入类

- Input、Textarea、Search，文字输入
- Radio、Checkbox、Switch，点击选择
- Stepper、Slider，数字选择（输入）一个是点击，一个是滑动
- Picker，Cascader、TreeSelect，滑动选择
- Calendar、DatetimePicker，特殊场景
- ColorPicker，特殊场景
- Rate，特殊场景
- Upload，特殊场景

### 9.3. 野蛮生长

只有流量大的、用户多的APP，才可能有小程序。国内小程序生态百花齐放，没有两个是完全一样的。每一种小程序框架、文档、运营平台、开发者工具、审核等都需要不少的工作量、不少的人力。看得出来中国互联网过去几年发展的可以。

### 9.4. 图标

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_4mZKcT6zYQNyJjrB.png" width="600" />

上面是几个小程序开发者工具的图标

- 微信/qq、支付宝、百度（BAT）
- 抖音、快手、小红书（分享社区）
- 京东

有意思的是，大家想的都差不多

1. 体现连接
   - 抖音，平面
   - 京东，立体
   - 快手，横向
   - 百度，中间
2. 代码符号
   - 支付宝
   - 小红书
   - 微信（结合了自己的 logo）
3. 产品 logo 变形
   - QQ
   - 微信



### 9.5. wxComponent

`tdesign-miniprogram` 中 `wxComponent` 类的作用：

1. 属性，处理受控属性，增加 `default*` 属性的默认值，增加 `style/customStyle` 属性，增加 `aria*` 相关属性
2. `externalClasses`，增加 `class`
3. 方法，增加 `_trigger`，兼容受控情况下的抛出事件，非生命周期函数挂载在 `methods` 对象上
4. 生命周期函数放到 `lifetimes` 上

### 9.6. uni-app

`src/core/runtime/mp/polyfill/index.js`

uni-app 中运行时对 `vant-weapp` 的 `polyfill` 核心逻辑

### 9.7. data

**只要不在模板中使用**，`data` 不用提前声明，`created` 中动态声明即可

```ts
created() {
  this.xxx = 'xxx';
}
```

### 9.8. Slider 组件细节

前置变量：

- `initLeft = boxLeft - halfblock`
- `initRight  = boxRight - halfblock`
- `maxRange = boxRight - boxLeft - blockSize - 6` ( 6 是边框)

`capsule` 模式下：

1. 左边滑块滑动，`offset = blockSize + 3`，`currentLeft = clientLeft - initLeft - offset`，就是 `clientLeft - boxLeft - halfBlock - 3`
2. 右边滑动滑动，`offset = - 3`，`currentIRight = -(clientRight - initRight - offset)`，就是 `boxRight - clientRight - halfBlock - 3`

假设 `boxLeft = 0`，`boxRight = 100`, `halfBlock = 10`,

- 左就是 `clientLeft - 13`，左边最小是 13
- 右就是 `87 - clientRight`，右边最大是 87
- `maxRange` 就是 74

<img src="https://cdn.uwayfly.com/article/2025/11/own_mike_mDk26PEERn43wxNX.png" width="600" />

图中分别是左、右、边框。

## 10. 反馈

有任何问题，建议通过 [Github issues](https://github.com/novlan1/tdesign-uniapp/issues) 反馈或扫码加入用户微信群。

<img src="https://raw.githubusercontent.com/Tencent/tdesign/main/packages/site-components/src/images/groups/wx-group.png" width="200" />

## 11. 总结

> TDesign is an artwork.

向 TDesign 的开发者致敬🫡。

后续规划是

1. 同步 TDesign Miniprogram 改动，尽量在小程序版本发布后的一周内，同步改动到 uniapp 版本上
2. 兼容调试更多平台
3. 模板工程等

---

注，本文发布于非工作时间。

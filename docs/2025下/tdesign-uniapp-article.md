<!-- TDesign is an artwork. -->

## 1. 开始

跨端需求一直就有，一套代码用在多个平台。国内使用 [uniapp](https://uniapp.dcloud.net.cn/) 框架人数较多，一直有外部声音想要 uniapp 版本的 TDesign，如 TDesign Miniprogram 下的众多 [issue](https://github.com/Tencent/tdesign-miniprogram/issues?q=uniapp)。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/10/own_mike_z2BC3Qi7FE8DNNWx.png" width="600" />

原生小程序和 uniapp 有差异，有人在 uniapp 项目里用了原生小程序组件，需要魔改内部组件代码。

基于以上需求，写了 [TDesign UniApp](https://www.npmjs.com/package/tdesign-uniapp) 项目，目前支持 H5/微信小程序/iOS/安卓等（2025.10.25）。

## 2. 转化过程

### 2.1. 整体思路

之前写过 Press UI，整体思路差不多。就是将小程序的 `wxml/wxss/js/json` 转成 uniapp 的 Vue，四个文件合成一个文件。以及将小程序的语法进行转化，以下是核心部分：

1. uniComponent 包裹，内部有一些公共处理
2. properties => props
3. setData => data 正常赋值
4. 生命周期改造
5. 事件改造
6. props 文件改造，from: `value: ([^{]+)`，to: `default: $1`

其他部分，如 `externalClasses`、`relations`，以及组件库特有的受控属性、命令调用等都需要进行额外的处理。

### 2.2. API 设计

API 一定要与官方一致，这是最不能妥协的，包括 `props`、`events`、事件参数，参数类型、插槽、CSS变量。

这样做的好处是，开发者没有额外心智负担，同时限制开发人员的胡乱发挥，以及减少开发者的决策成本。

API 尽量与小程序对齐，而不是 `mobile-vue/mobile-react`，因为 `uniapp` 语法主要是小程序的语法。

### 2.3. 事件参数

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

### 2.4. 可维护性

转换工具无法做到 100%，意味着一定会有人工介入。工具转换结果中，会出现一些奇怪的、难以理解的、难以维护的代码，需要改造。

- 用统一的语法
- 不使用编译后的、混淆后的变量

## 3. 细节

### 3.1. 命令调用

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

### 3.2. 受控属性

存在受控属性的非表单组件有

- 反馈类：ActionSheet、DropdownItem、Guide
- 展示类：CheckTag、Collapse、Image-viewer
- 导航类：Indexes、Sidebar、Steps、Tabbar、Tabs

TDesign UniApp 中受控属性的处理，和小程序版本差不多。是将其转成 `data` 开头的内部属性，初始化的时候，会判断受控和非受控值。同时触发事件的时候也要判断当前是否存在受控属性，非受控的时候直接改变内部值并抛出事件，受控的时候只抛出事件。以及，`props` 中受控属性的默认值需是 `null` 或 `undefined`。

不同的是，小程序受控属性，可以使用 `this.setData({ [value]: this.defaultValue })`，也就是 `data` 中声明了一个和 `properties` 中一样的变量，Vue 中不可以，会报错 `'set' on proxy: trap returned falsish for property 'value'`

总结下来，受控属性要处理的：

1. `watch` 中监听
2. `created` 中初始化
3. `methods` 中新增 `_trigger`，作为抛出事件的收口


### 3.3. 三方库

`tdesign-miniprogram` 执行 `npm run build`，在 `miniprogram_dist/node_modules` 目录下 拿到 `dayjs` 和 `tinycolor2` 的产物，复制到 `tdesign-uniapp` 的 `npm` 目录下，用啥拿啥
。

一次性工作，一般不会改。

### 3.4. input 受控

H5 下，uni-app 封装了 `input`，且不支持受控。

Input 限制中文字符在 uni-app 实现的话，解决方案是先设置一次，然后在 `nextTick` 中再设置一次。

参考：https://ask.dcloud.net.cn/article/39736

其他方案：

1. 可以动态创建 `input` 元素，不用 uni-app 包裹的，缺点是更新属性麻烦。
2. 动态计算 `maxlength`，用浏览器原生属性约束，缺点是实现稍复杂、代码量稍多。

### 3.5. externalClass

uni-app 下，`externalClasses` 是不生效的。

参考：

- https://github.com/dcloudio/uni-app/issues/3275
- https://ask.dcloud.net.cn/question/163695

所以 `styleIsolation: apply-shared` 不够用，以只能改成 `styleIsolation: shared`，这样开发者才能在任意使用的地方覆盖组件样式。

可以改下 `packages/site/node_modules/@dcloudio/uni-mp-compiler/dist/transforms/transformComponent.js`，把 `isComponentProp` 方法，将 `t-class` 排除，就能解决，但是官方不会推出。

### 3.6. scoped

tdesign-uniapp 必须加 `scoped`，否则一个自定义组件加了 `styleIsolation: shared`，同一页面下其他没加此属性的自定义组件也会生效，只要 `class` 相同！

### 3.7. t-class

统一用 `tClass`，而不是 `class`。

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_bR3Jm86QaWDeWRdD.png" width="600" />

### 3.8. distanceTop

Drawer 顶部过高，是因为子组件 `popup` 中使用的 `--td-popup-distance-top` 变量为 `0`，这个变量由 `distanceTop` 生成，`distanceTop` 又是由 `using-custom-navbar` 这个 `mixin` 生成。

`distanceTop` 由 `uni.getMenuButtonBoundingClientRect` 计算生成，H5下没有这个API，可以直接传入 `customNavbarHeight`，这个值由业务自行计算得到。

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

### 3.9. page-scroll

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

### 3.10. getCustomNavbarHeight 报错

```
Cannot read properties of null (reading 'parentElement')
```

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_ycz2zafE5BbMiDDs.png" width="600" />

这种就是 `mounted` 之后没延时，没获取到对应元素。

### 3.11. site 工程中的 alias

tdesign-uniapp 在 H5 下使用 `vite.config` 中的 `alias`，不使用 `workspace`，可解决修改组件后必须重启才能生效。

小程序下，这种方式需要进一步改造，只能引用同一个子工程，即不能跨 `src`，解决方案就是监听组件变动，同步复制到 `site` 工程下。

### 3.12. watch

小程序的 `observers` 和 `vue` 的 `watch` 逻辑并不完全相同，小程序下，如果 `prop` 接收外部传入的实参与该 `prop` 的默认值不相等时，会导致 `observer` 被立即调用一次，Vue 而不是。

`image` 中 `calcSize` 中就用到了。


## 4. 其他

### 4.1. button

`button` 不是最简单的，`loading/icon` 才是最简单的，它们是 `button` 的子元素。

### 4.2. 组件

下面是个人对一些移动端组件的理解。

导航类

- Navbar、Tabbar、Sidebar、Indexes 分别是上下左右四个方向的导航，固定
- Drawer、Backtop 都是可隐藏的，点击某处或滑动到某处时才显示
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

### 4.3. wxComponent

`tdesign-miniprogram` 中 `wxComponent` 类的作用：

1. 属性，处理受控属性，增加 `default*` 属性的默认值，增加 `style/customStyle` 属性，增加 `aria*` 相关属性
2. `externalClasses`，增加 `class`
3. 方法，增加 `_trigger`，兼容受控情况下的抛出事件，非生命周期函数挂载在 `methods` 对象上
4. 生命周期函数放到 `lifetimes` 上

### 4.4. uni-app

`src/core/runtime/mp/polyfill/index.js`

uni-app 中运行时对 `vant-weapp` 的 `polyfill` 核心逻辑

### 4.5. data

只要不在模板中使用，`data` 不用提前声明，`created` 中动态声明即可

```ts
created() {
  this.xxx = 'xxx';
}
```

## 5. 总结

TDesign UniApp 的开发，像一种翻译，原创部分当然也有。这里向 TDesign Miniprogram 的开发者致敬🫡。

后续规划是

1. 同步 TDesign Miniprogram 改动，尽量在小程序版本发布后的一周内，同步改动到 uniapp 版本上
2. 兼容调试更多平台
3. 模板工程等

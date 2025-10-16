### 1. button

button 不是最简单的，loading/icon才是最简单的，它们是 button 的子元素

### 2. tdesign-miniprogram

`tdesign-miniprogram` 中 `wxComponent` 类的作用：

1. 属性，处理受控属性，增加 `default*` 属性的默认值，增加 `style/customStyle` 属性，增加 `aria*` 相关属性
2. `externalClasses`，增加 `class`
3. 方法，增加 `_trigger`，兼容受控情况下的抛出事件，非生命周期函数挂载在 `methods` 对象上
4. 生命周期函数放到 `lifetimes` 上

### 3. uni-app

`src/core/runtime/mp/polyfill/index.js`

uni-app 中运行时对 `vant-weapp` 的 `polyfill` 核心逻辑

### 4. data

`data` 不用提前声明，`created` 中动态声明即可

```ts
created() {
  this.xxx = 'xxx';
}
```

### 5. uni-app 中 事件的处理

```ts
 const oldEmit = vm.$emit
  vm.triggerEvent = (eventName, detail, options) => {
    const target = {
      dataset: vm.$el.dataset
    }

    const event = {
      target,
      currentTarget: target,
      detail,
      preventDefault: noop,
      stopPropagation: noop
    }

    oldEmit.call(vm, eventName, event)
  }
  // 主要是Vant 自己封装了 $emit,放到 methods 中会触发 Vue 的警告,索性,框架直接重写该方法
  vm.$emit = (...args) => {
    vm.triggerEvent(...args)
  }
```

### 6. watch

`watch`，这么获取

```
vm.$options.watch
```

小程序的 `observers` 和 `vue` 的 `watch` 逻辑并不完全相同，小程序下，如果 `prop` 接收外部传入的实参与该 `prop` 的默认值不相等时，会导致 `observer` 被立即调用一次，vue 而不是。

`image` 中 `calcSize` 中用到了。


### 7. props

`miniprogram-to-uniapp` 直接转化后的代码有 `this = props`，这肯定是不对的，需要改成 `this.props = props`

### 8. 通用

1. 去掉 `zpMixins`， `zpMixins.extend`
2. 组件位置改成` index`，比如 `loading/index`，而不是 `loading/loading`
3. `demo` 转换的 `base` 有问题，需改成两个单词的
4. 引入路径 `./tdesign-miniprogram/icon/icon`，需改成 `tdesign-uniapp/icon`
5. 工具把 `icon` 的 `font-family` 也转换错了
6. 转换工具对 `cell` 组件 `title` 的处理有问题
7. `<tag arrow />` 中 `arrow` 在组件里取到的值为空字符串，但是期望是 `boolean`。`tdesign-miniprogram` 中一些 `props` 的 `type` 为 `null`，会导致这个问题。
`<tag arrow />` `arrow` 在组件里取到的值为空字符串，但是期望是 `true`。

### 9. token 核心

> 颜色色板 => 全局语义token => 组件token

----

2025.10.9

----

### 10. API 设计

API 一定要与官方一致，这是最不能妥协的，包括 `props`、`events`、事件参数，参数类型、插槽、CSS变量。

一方面开发者没有额外心智负担，一方限制开发人员的胡乱发挥，也减少开发者的决策成本。

尽量与小程序对齐，而不是 `mobile-vue`，因为 `uniapp` 语法主要是小程序的语法。

### 11. TODO

- [ ] ~~组件结构优化，components/name/name => components/name/index~~
- [x] 组件中 css 改回 less
- [ ] image 的 mode 属性在 H5 的适配
- [ ] props 由 tdesign-api 统一自动生成
- [ ] 事件抛出检查，统一去掉 detail，以及 tap => click
- [ ] 统一 externalClasses 的使用，去掉手动写在 props 中的，以及 extra-class => t-class
- [ ] badge 在 h5 下有偏移
- [ ] 之前组件中的 pageLifetimes 处理
- [x] Grid 组件css修改
- [ ] dialog confirm/cancel 按钮的 class 都改成 tClass了，小程序下要确认
- [x] dialog with-input 示例
- [ ] getInstance 这个方法，refs要兼容带或不带#
- [ ] 每个组件补充 emits，尤其是 click 事件，并提到单独文件中，由 tdesign-api 生成
- [x] pull-down-refresh 中与back-top的relation
- [ ] demo 中 组件和样式放一起，一起自动渲染到文档中
- [ ] Icon 组件太大（样式文件大），需要优化
- [ ] 组件中之前的 externalClasses 的 class 检查
- [ ] 下面这种传值被过滤了，要检查 `icon="{{ { name: 'xx' } }}"`
- [ ] 检查需要增加 v-model 的组件，有些属性必须受控，比如 cascader/calendar 的 visible
- [ ] 文档代码格式不友好，两个属性再换行，充分利用空间
- [ ] Loading 示例 slider 部分 需要补充
- [x] Less 编译成 css，以及将 rpx 转成 px
- [ ] Slider 组件 h5 竖向，有错位
- [ ] calendar 小程序展示时没有动画（非必现）
- [ ] miniprogram uploader 组件 defaultFiles 未使用
- [ ] tdesign-uniapp 模板
- [ ] 文档顶部链接问题
- [ ] 其他端适配问题


link 新增 css

```scss
/* #ifdef H5 */
:deep(.navigator-wrap) {
  display: flex;
  align-items: center;
}
/* #endif */
```

### 12. 命令调用

tdesign-uniapp 中支持命令调用的组件有

- action-sheet
- dialog
- message
- toast

关于数据转换

- toast 没有组件调用，只有命令式，无需数据转换。
- message 嵌套了一层 message-item，message-item 没有 props，都是 setData 直接给的 data，所以根本不需要转换。
  - 这是另一种解决思路了，用嵌套子组件，而不是转换数据。子组件一嵌套，且数据全部不走props，而是调用子组件内部方法。
  - 当前 message 父组件只监听 visible。这种方式有个弊端，就是组件调用时，其他属性变化，并没有监听到。
  - message 核心 setMessage（组件调用、命令调用都走） => addMessage (=> showMessageItem) 或者 updateMessage
  - Message.ts 中的 setMessage/addMessage/showMessageItem 都是指的 message 内部的 message-item，是循环的 messageList，而不是页面级别的 t-message

- dialog/action-sheet 需要转换

核心

- dialog 的命令调用核心就跟 press-ui 的一样了，调用 setData，将属性（包含 visible: true）传进去，同时将 instance 的 _onConfirm 设置为 promise 的 resolve
- toast 一样的，只是用来 instance.show 方法，内部还是 setData

转换就是把所有props都声明成data，比如 visible=> dataVisible，要改的地方包括

1. data 中初始化
2. watch 中监听
3. setData 收口，设置的时候都加上 data 开头

### 13. 受控属性

存在受控属性的非表单组件有

- 反馈类：action-sheet、dropdown-item、guide
- 展示类：check-tag、collapse、image-viewer
- 导航类：indexes、sidebar、steps、tabbar、tabs

小程序受控属性，可以使用 `this.setData({ [value]: this.defaultValue })`，即改变 props 的值，vue 中不可以，会报错 `'set' on proxy: trap returned falsish for property 'value'`

所以，需要 useDefaultValue 这种 hook，根据 defaultValue和value，得出新的 newValue，用于组件中真正判断

当前受控属性的处理，是将其转成 data 开头的内部属性，不过初始化的时候，会判断受控和非受控值。同时触发事件的时候也要判断当前是否存在受控属性，非受控的时候直接改变内部值并抛出事件，受控的时候只抛出事件。

注意，props 中受控和非受控属性的默认值都是 null 或 undefined

总结下来，受控属性要处理的：

1. watch 中监听
2. created 中初始化
3. methods 中新增 _trigger，作为抛出事件的收口

### 14. 可维护性

- 用统一的语法
- 不使用编译后的、混淆后的变量

### 15. 最新转换步骤

1. uniComponent包裹
2. 去掉 setData，改成直接赋值
3. externalClasses 改成 props，在模板中同步修改
4. prefix 改具名导入，之前是 const { prefix } = config;
5. replace props.js，from: `value: ([^{]+)`，to: `default: $1`

### 16. site 工程中的 alias

tdesign-uniapp 在 H5下使用 vite.config 中的 alias，不使用 workspace，解决修改组件后必须重启才能生效

小程序下，这种方式会报错，找不到组件，只能找js文件，所以vite.config 需根据环境判断，是否设置 alias

### 17. hard

The hard road might not lead to glory But the easy road definitely won't.

### 18. WXS

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_62aJQAxB8dp3b6j7.png" width="600" />

### 19. artwork

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_YerJ44De845RSASw.png" width="600" />

### 20. 三方库

`tdesign-miniprogram` 执行 `npm run build`，在 `miniprogram_dist/node_modules` 目录下 拿到 `dayjs` 和 `tinycolor2` 的产物，复制到 `tdesign-uniapp` 的 `npm` 目录下，用啥拿啥
。

一次性工作，一般不会改。

### 21. input 受控

H5 下，uni-app 封装了 `input`，且不支持受控。

Input 限制中文字符在 uni-app 实现的话，解决方案是先设置一次，然后在 nextTick 中再设置一次。

参考：https://ask.dcloud.net.cn/article/39736

其他方案：

1. 可以动态创建input，不用 uni-app 包裹的，缺点是更新属性麻烦。
2. 动态计算 maxlength，用浏览器原生属性约束。

### 22. externalClass

uni-app 下，externalClasses 是不生效的。

参考：

- https://github.com/dcloudio/uni-app/issues/3275
- https://ask.dcloud.net.cn/question/163695

所以 `styleIsolation: apply-shared` 不够用，以只能改成 `styleIsolation: shared`

可以改下 `packages/site/node_modules/@dcloudio/uni-mp-compiler/dist/transforms/transformComponent.js`，把 `isComponentProp` 方法，将 `t-class` 排除，就能解决，但是官方不会推出。

### 23. scoped

tdesign-uniapp 必须加 `scoped`，否则一个自定义组件加了 `styleIsolation: shared`，同一页面下其他没加此属性的自定义组件也会生效，只要 `class` 相同！

### 24. t-class

统一用 tClass，而不是 class

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_bR3Jm86QaWDeWRdD.png" width="600" />

### 25. distanceTop

`drawer` 顶部过高，是因为子组件 `popup` 中使用的 `--td-popup-distance-top` 变量为0，这个变量由 `distanceTop` 生成，`distanceTop` 又是由 `using-custom-navbar` 这个 `mixin` 生成。

distanceTop 由 uni.getMenuButtonBoundingClientRect 计算生成，H5下没有这个API，可以直接传入 customNavbarHeight

### 26. page-scroll

使用到 `page-scroll` 这个 `mixin` 的组件有

1. sticky
2. indexes
3. tabs(引入了sticky)

所有如果改动了 `page-scroll`，这三个组件都要测试下

### 27. getCustomNavbarHeight 报错

```
Cannot read properties of null (reading 'parentElement')
```

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_ycz2zafE5BbMiDDs.png" width="600" />

这种就是 mounted 之后没延时，没获取到对应元素。



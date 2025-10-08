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

### 10. TODO

1. 组件结构优化，components/name/name => components/name/index
2. 组件中 css 改回 less
3. image 的 mode 属性在 H5 的适配
4. props 由 tdesign-api 统一自动生成
5. 事件抛出检查，统一去掉 detail，以及 tap => click
6. badge 在 h5 下有偏移
7. 统一 externalClasses 的使用，去掉手动写在 props 中的，以及 extra-class => t-class，
8. 之前组件中的 pageLifetimes 处理
9. Grid 组件css修改
10. dialog confirm/cancel 按钮的 class 都改成 tClass了，小程序下要确认
11. dialog with-input 示例
12. getInstance 这个方法，refs要兼容带或不带#
13. 每个组件补充 emits，尤其是 click 事件
14. pull-down-refresh 中与back-top的relation
15. demo 中 组件和样式放一起，一起自动渲染到文档中
16. Icon 组件太大（样式文件大），需要优化
17. 组件中之前的 externalClasses 的 class 检查
18. `icon="{{ { name: 'xx' }}}"` 这种传值并过滤了，要检查

link 新增 css

```scss
/* #ifdef H5 */
:deep(.navigator-wrap) {
  display: flex;
  align-items: center;
}
/* #endif */
```

### 11. 命令调用

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

### 12. 受控属性

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

### 13. 可维护性

- 用统一的语法
- 不使用编译后的、混淆后的变量

### 14. 最新转换步骤

1. uniComponent包裹
2. 去掉 setData，改成直接赋值
3. externalClasses 改成 props，在模板中同步修改
4. prefix 改具名导入，之前是 const { prefix } = config;
5. replace props.js，from: `value: ([^{]+)`，to: `default: $1`

### 15. site 工程中的 alias

tdesign-uniapp 在 H5下使用 vite.config 中的 alias，不使用 workspace，解决修改组件后必须重启才能生效

小程序下，这种方式会报错，找不到组件，只能找js文件，所以vite.config 需根据环境判断，是否设置 alias

### 16. hard

The hard road might not lead to glory But the easy road definitely won't.

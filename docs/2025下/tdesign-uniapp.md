#### 1. tdesign-miniprogram

`tdesign-miniprogram` 中 `wxComponent` 类的作用：

1. 属性，处理受控属性，增加 `default*` 属性的默认值，增加 `style/customStyle` 属性，增加 `aria*` 相关属性
2. `externalClasses`，增加 `class`
3. 方法，增加 `_trigger`，兼容受控情况下的抛出事件，非生命周期函数挂载在 `methods` 对象上
4. 生命周期函数放到 `lifetimes` 上

#### 2. uni-app

`src/core/runtime/mp/polyfill/index.js`

uni-app 中运行时对 `vant-weapp` 的 `polyfill` 核心逻辑

#### 3. data

`data` 不用提前声明，`created` 中动态声明即可

```ts
created() {
  this.xxx = 'xxx';
}
```

#### 4. uni-app 中 事件的处理

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

#### 5. watch

`watch`，这么获取

```
vm.$options.watch
```

小程序的 `observers` 和 `vue` 的 `watch` 逻辑并不完全相同，小程序下，如果 `prop` 接收外部传入的实参与该 `prop` 的默认值不相等时，会导致 `observer` 被立即调用一次，vue 而不是。

`image` 中 `calcSize` 中用到了。


#### 6. props

`miniprogram-to-uniapp` 直接转化后的代码有 `this = props`，这肯定是不对的，需要改成 `this.props = props`

#### 7. 通用

1. 去掉 `zpMixins`， `zpMixins.extend`
2. 组件位置改成` index`，比如 `loading/index`，而不是 `loading/loading`
3. `demo` 转换的 `base` 有问题，需改成两个单词的
4. 引入路径 `./tdesign-miniprogram/icon/icon`，需改成 `tdesign-uniapp/icon`
5. 工具把 `icon` 的 `font-family` 也转换错了
6. 转换工具对 `cell` 组件 `title` 的处理有问题
7. `<tag arrow />` 中 `arrow` 在组件里取到的值为空字符串，但是期望是 `boolean`。`tdesign-miniprogram` 中一些 `props` 的 `type` 为 `null`，会导致这个问题。
`<tag arrow />` `arrow` 在组件里取到的值为空字符串，但是期望是 `true`。

#### 8. token 核心

> 颜色色板 => 全局语义token => 组件token

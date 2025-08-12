#### tdesign-miniprogram

tdesign-miniprogram 中 `wxComponent` 类的作用：

1. 属性，处理受控属性，增加 `default*` 属性的默认值，增加 `style/customStyle` 属性，增加 `aria*` 相关属性
2. `externalClasses`，增加 `class`
3. 方法，增加 `_trigger`，兼容受控情况下的抛出事件，非生命周期函数挂载在 `methods` 对象上
4. 生命周期函数放到 `lifetimes` 上

#### uni-app

src/core/runtime/mp/polyfill/index.js

uni-app 中运行时对 vant-weapp 的 polyfill 核心逻辑

#### data

data不用提前声明，created中动态声明即可

```ts
created() {
  this.xxx = 'xxx';
}
```

#### uni-app 中 事件的处理

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

#### watch

watch，这么获取

```
vm.$options.watch
```


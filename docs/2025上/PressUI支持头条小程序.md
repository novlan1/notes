## 1. 开始

头条小程序跟其他小程序很不一样。

## 2. 问题及解决方法

### 2.1. $parent 收集

其他小程序及H5可以通过 `provide/inject` 来收集 `parent`。头条小程序中找不到。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_HHa8HeNminHbpC3j.png" width="600">

这里想到一个办法是递归调用 `$parent`，找最近的一个和目标组件名称相同的 `parent`。比如 `picker-column` 中就找组件名称为 `PressPicker` 最近的父组件。

但是，头条小程序子孙组件的 `$parent` 竟然就是页面，而页面的所有 `$children` 都是拉平的。基于此，想到的办法是从上往下遍历这个拉平的 `$children`，找距离子组件最近的一个父组件。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_bmwwwRjGpQYYHhf8.png" width="600">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_XSEkhMDNRdNmXEDp.png" width="600">

但是，页面的 `$children` 并不是"父子父子父子.."这样顺序排列的，而是"父父父子子子..."，导致 `$children` 收集有问题，要么多于实际，要么为空。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_b6aXQpMmPxh3naGG.png" width="600">

想到的办法是父子组件之间传递一个 `relationKey`，父组件初始化的时候生成，并传给子组件，这个值是唯一的，找 `$parent` 时就不会找错了

```ts
function findNearListParent(children = [], name) {
  let temp;
  for (const item of children) {
    const parentRelationKey = item.$data && item.$data.relationKey;
    const thisRelationKey = this.$props && this.$props.relationKey;
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

### 2.2. 生命周期

Vue 中父子组件生命周期正常的执行顺序是：父组件先创建，然后子组件创建；子组件先挂载，然后父组件挂载，即“父beforeCreate-> 父create -> 子beforeCreate-> 子created -> 子mounted -> 父mounted”。

头条小程序并不遵循这样的规律。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_8rXrNdH7m6fmAaSd.png" width="600">

这个问题会导致父子组件的初始化数据出问题，之前在父组件 `mounted` 中执行的初始逻辑，都会因为还没收集完 `children`，而失败。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_d3M8XdYzTBxHSRzh.png" width="600">

解决办法有两种，可用延时，也可用回调。回调更安全，延时可能跟机器性能有关。回调就是在子组件 `mounted` 的时候调用父组件的数据初始化方法。

```ts
mounted() {
  this[PARENT].setColumns();
}
```

看一下 `area` 组件数据初始化流程：

`column` 组件 `mounted` => 调用 `picker` 组件 `setColumns`; `emit afterSetColumns` => `area` 组件 `setValues` => 调用 `picker` 组件 `setColumnValues` 和 `setIndexes`

### 2.3. 样式覆盖

头条小程序下，父组件中不能在样式文件中覆盖子组件的样式。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_HaQmC7fSnrBbXhzS.png" width="600">

解决办法是，通过 `customStyle` 属性传递，或者写在全局。写在全局是下策，业务过于关心组件库了，这里采用的是 `customStyle`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_X5XhDK4Gh5MxAQbN.png" width="600">

### 2.4. 虚拟节点

使用 Fragment 组件节点后，自定义事件将失效。Press UI 针对头条小程序，一律不适用此属性，保持统一。

参考[文档](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/tutorial/custom-component/component-model-and-style#7417c627)

## 3. 其他

### 3.1. onPageScroll

必须在页面声明 `onPageScroll` 方法（空的也行）后，才能动态添加新的监听事件。

```ts
export default {
  onPageScroll() {},
}
```

### 3.2. 抖音授权登录

只能用原生组件以及原生方法。推测其会检测语法，`@click="onLogin"` 也不行，因为他会转变成 `bindtap={{xx}}`，这种有大括号，不被认可。

```html
<button class="abc" bindtap="onLogin">抖音授权登录</button>
```

```ts
defineOptions({
  onLogin() {
    uni.getUserProfile({
    success(res) {
      console.log('onLogin.res', res)
    },
    fail(err) {
      console.log('onLogin.fail', err)
    }
  })
  }
})
```

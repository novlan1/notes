[toc]


## 1. v-for

### 1.1. 基础


- 在H5平台 使用 v-for 循环整数时和其他平台存在差异，如 `v-for="(item, index) in 10"` 中，在H5平台 item 从 1 开始，其他平台 item 从 0 开始，可使用第二个参数 index 来保持一致。
- 在非H5平台 循环对象时不支持第三个参数，如 `v-for="(value, name, index) in object"` 中，index 参数是不支持的。
- 小程序端数据为差量更新方式，由于小程序不支持删除对象属性，使用的设置值为 null 的方式替代，导致遍历时可能出现不符合预期的情况，需要自行过滤一下值为 null 的数据。

文档地址[在这里](https://uniapp.dcloud.net.cn/tutorial/vue3-basics.html#%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)。

###  1.2. v-for 的 key

小程序不支持字符串拼接，比如

```html
:key="`hold` + index"
```

这样其实也是有问题的，控制台会报错：

```html
:key="`hold-${index}`"
```

甚至提到一个函数中，也有可能有问题：

```
:key="getHoldKey(index)"


getHoldKey(index) {
  return `hold${index}`
}
```

最佳方式其实是提前处理好数据，这样性能会更好，也避免了key重复。

```ts
getData() {
  items = items.map((item,index) => ({
    ...item,
    key: `hold-${index}`
  }))
}
```


key重复会造成挂载在组件上面的事件参数为undefined，从而不成功。


参考：

1. https://blog.csdn.net/weixin_55489077/article/details/119983795
2. https://www.jianshu.com/p/ec4c0c73bb83


## 2. this指向问题

### 2.1. prop为函数类型

父组件把方法传给子组件后，该方法里的 this 是子组件的 this 而不是父组件的 this。

这个[链接](https://ask.dcloud.net.cn/question/97718)提到了相同的问题，一个解决方法是在外层声明`gThis`，然后在 `mounted` 或 `updated` 中将this 赋值给 gThis，`gThis = this`。

### 2.2. vant组件

有时候vant-weapp的组件报this指向问题，但在真机或其他人的电脑上就没事，可以尝试把小程序基础库版本降低下，比如调整到 2.23.0。有时候不一定是自己代码的问题。


相关链接：https://ask.dcloud.net.cn/question/97718

## 3. list挂载属性


之前在list上挂载属性，比如`list = []; list.a = 1`，是可以传递给子组件的，但是uni-app编译后则不可以。


## 4. Vue TypeError: Right-hand side of 'instanceof' is not an object

Vue项目报上面这个错误，一般是props类型校验问题。这个搜索引擎一搜就能知道。

## 5. uni-app传递对象props，对象中的function会被丢掉


写在对象中的 function 会被丢掉，需要改成 $emit，但是直接写 Function 类型的 props 是可以的。

相关链接：
- https://ask.dcloud.net.cn/question/72570
- https://ask.dcloud.net.cn/question/70659

## 6. input的focus

小程序中需要手动指定 focus，没有js调用的API。

删除时，input 事件 `e.target.value === ''` 为 true



## 7. uni-app中捕获事件

有个需求，点击浮层外的DOM元素，关闭浮层，如果是h5的话，比较简单，核心是 dom 的 contains 事件：

```ts
document.addEventListener('click', this.onWatchClick);

onWatchClick(e) {
  const { menuPanel } = this.$refs;
  if (menuPanel && this.showMenu && !menuPanel.contains(e.target)) {
    this.onToggleShowMenu();
  }
}
```

到了小程序里，由于不能动态监听事件，只能在组件最外层去手动绑定事件，官方文档地址[在这里](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxml/event.html#%E7%BB%91%E5%AE%9A%E5%B9%B6%E9%98%BB%E6%AD%A2%E4%BA%8B%E4%BB%B6%E5%86%92%E6%B3%A1)。

由于捕获事件是在冒泡阶段之前触发，在下面的代码中，点击 inner view 会先后调用 handleTap2、handleTap4、handleTap3、handleTap1。

```html
<view id="outer" bind:touchstart="handleTap1" capture-bind:touchstart="handleTap2">
  outer view
  <view id="inner" bind:touchstart="handleTap3" capture-bind:touchstart="handleTap4">
    inner view
  </view>
</view>
```

到了uni-app里，写成`capture-bind:touchstart`是不支持的，需要`@click`，我们的需求需要加`@click.capture = "onClickWrap"`:

```ts
onClickWrap() {
  if (this.showMenu) {
    this.showMenu = false;
  }
}
```

如果不加`.capture`，那么同一页面内的其他点击事件触发时，将不会收起浮层。


参考：
- [Vue文档地址](https://cn.vuejs.org/guide/essentials/event-handling.html#event-modifiers)
- [uni-app文档地址](https://uniapp.dcloud.net.cn/tutorial/vue3-basics.html#%E4%BA%8B%E4%BB%B6%E4%BF%AE%E9%A5%B0%E7%AC%A6)。



## 8. uni-app不支持的语法

### 8.1. 扩展运算符


`uni-app`不支持在Vue模板中使用下面的语法：

```html
<div
  @onClickSche="onClickCycleSche({...$event,...finalScheItem})"
/>
```
### 8.2. 两个&&

`uni-app`小程序不能用 `<comp :a="b&&c&&d" />` 识别不出来，可以用 `computed` 属性。



## 9. uni-app中的mounted与beforeDestroy

uni-app 中的页面也可以触发 `beforeDestroy`，但是前提是路由出栈，但是如果是入栈就不会销毁页面，也就不会调用 `beforeDestroy`，并且重新进入也不会触发`mounted`。

出栈发生的场景是点击了返回，入栈的场景是进入了新的页面。

由于`tabBar`页面是第一个，所以永远不会被销毁，永远不会触发 `beforeDestroy`、`destroyed` 方法。


相关文档：

- [小程序页面路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)
- [uni-simple-router](https://hhyang.cn/v2/start/cross/codeRoute.html)

## 10. uni-app页面生命周期执行顺序

- beforeCreate 
- created 
- beforeMount 
- onLoad 
- onShow 
- mounted  
- onReady

注意 `beforeMount -> onLoad -> onShow -> mounted -> onReady`

由于子组件内没有 `onShow`，所以只能在页面级组件中写。如何在页面级组件中监听 `onShow`，然后传递给子组件做事情呢？

可以使用`ebus`，`onShow`中触发事件，子组件中监听。如果子组件监听的时机是在`mounted`中，那么页面的第一次的`onShow`是监听不到的。


```ts
// 页面级组件
onShow() {
  this.$ebus.emit('onShow');
},
```

```ts
// 子组件
this.$ebus.on('onShow', () => {
  if (!this.firstEnter) {
    this.checkViChange();
  }
});
```

相关文档：

- [uni-app应用生命周期](https://uniapp.dcloud.net.cn/collocation/App.html#applifecycle)
- [uni-app页面生命周期](https://uniapp.dcloud.net.cn/tutorial/page.html#lifecycle)
- [小程序页面生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)


_____

此外，实践发现uni-app和普通h5项目不同的生命周期：

- app.created
- app.mounted

- page.created
- page.mounted


## 11. 获取当前页面内部的某个方法

用 getCurrentPages 获取当前页面 curPage，使用 curPage 的 $vm 属性。

```ts
const pages = getCurrentPages();
const curPage = pages[pages.length - 1];
const path = curPage?.$vm?.getNavigatorPreviousPath?.();
```

## 12. dataset类型

uni-app 中 view 标签上的 dataset 可以保留 number 类型，div 不可以。

```html
<view 
  v-for="(item, index) of list"
  :key="index"
  :data-index="index"
  @click="onClick"
/>
```

```js
function onClick(event) {
  const { index } = event.currentTarget.dataset;
  console.log(typeof index) // number
}
```

## 13. 遍历

uni-app 小程序中遍历 slot，会生成抽象节点 `componentGenerics`

比如：

```html
<movable-view
  v-for="(item, index) in model"
  :id="index"
  :key="item.key"
  direction="vertical"
  :x="item.x"
  :y="item.y"
  :style="item.moving ? 'z-index: 3' : ''"
  @change="change"
  @touchstart="startMove"
  @touchend="endMove"
>
  <slot :item="item" />
</movable-view>
```

## 14. ref只能写在原生节点上

将ref定义在组件上面再使用如下代码去获取其方法获取其top，则会报错

```html
 <el-row class="qzblgzhTable" ref="row"></el-row>       
```

```js
this.$refs.row.getBoundingClientRect().top
```

正确写法

```html
 <div ref="row"> </div>
```

```js
this.$refs.row.getBoundingClientRect().top
```

将 ref 写在原生的html标签上再使用其方法去获取top，则不会报错

## 15. 避免改变props


uni-app微信小程序解决：

`Avoid mutating a prop directly since the value will be overwritten whenever the parent`

`data` 中通过`this.dataShow = this.show`等定义一些`data`，监听这些`props`，重新赋值。




## 16. 全局组件的注册位置

必须在`main.js`使用 `Vue.component`，在另一个文件中使用，在 `main.js` 中引入都是不行的。

```ts
// main.js
import './global-comp'


// global-comp.js
Vue.component('MatchLoading', MatchLoading);
Vue.component('MatchPicker', MatchPicker);
```

## 17. scroll事件

`scroll`的`event.detail`示例

```js
deltaX: 0
deltaY: 7.987464904785156
scrollHeight: 968
scrollLeft: 0
scrollTop: 32.91862487792969
scrollWidth: 375
```

`rect` 示例

```ts
bottom: 599
dataset: {eventOpts: Array(2)}
height: 535
id: "tipMatchMsgWrap"
left: 0
right: 375
top: 64
width: 375
```

## 18. computed中不要用sort方法

`vue`的`computed`中不要对`dom`直接用的对象进行`sort`，或者vuex中的数据，`sort`方法是改变原来数组的，会造成无限循环，报错：

```
You may have an infinite update loop in a component render function.
```


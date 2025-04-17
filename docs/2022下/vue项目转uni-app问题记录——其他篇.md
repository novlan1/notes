[toc]

# 1. 小程序特殊标签&API

## 1.1. scroll-view


### 1.1.1. 基础设置

小程序内无法获取或改变一个普通 `view` 的 `scrollTop`，只能用`scroll-view`。

这个标签需要设置 `scroll-y` 纵向滚动或者 `scroll-x` 横向滚动，默认都是`false`。

`enable-flex="true"` 是开始flex布局，默认为`false`。


### 1.1.2. 动态scrollTo

设置`enhanced="true"`后，可以通过下面代码动态改变其`scrollTop`。

```ts
function mpBackUp() {
  this.createSelectorQuery()
    .select('#scheduleTreeId')
    .node()
    .exec((res) => {
      const scrollView = res[0]?.node;
      if (!scrollView) return;
      scrollView.scrollTo({
        top: 0,
      });
    });
}
```

### 1.1.3. 动态scrollIntoView

这个API的参数必须是 `scrollView` 的子元素，不能是子子元素。


```ts
this.createSelectorQuery()
  .select('#scheduleTreeId')
  .node()
  .exec((res) => {
    const scrollView = res[0]?.node;
    if (!scrollView) return;
    scrollView.scrollIntoView('.my-team-id-sche');
  });
```

### 1.1.4. 嵌套slot

`scroll-view`中嵌套`slot`后，`scroll-into-view`不生效，参考:

1. https://developers.weixin.qq.com/community/develop/doc/0006ca373801c8a733d816af256800
2. https://developers.weixin.qq.com/community/develop/doc/00080caa80c200d35d0ffe0bb51c00



## 1.2. 获取小程序运行环境

```ts
const { envVersion = '', version = '', appId = '' } = wx?.getAccountInfoSync?.()?.miniProgram || {};
const { SDKVersion = '', platform = '' } = __wxConfig as any;
```

`envVersion` 取值有：`develop`，`trial`，`release`

类似的参数还有`version`、`platform`等，可以看上面代码。


## 1.3. 跳转腾讯文档小程序


注意是`pages/detail/detail`，不可以是`pages/detail/detail.html`，否则第一次跳成功，后面跳会失败。

```ts
if (url.startsWith('https://docs.qq.com')) {
  uni.navigateToMiniProgram({
    appId: 'wxd45c635d754dbf59',
    path: `pages/detail/detail?url=${url}`,
    success() {
    },
    fail() {
    },
  });
  return;
}
```

参考：https://developers.weixin.qq.com/community/develop/doc/0008281ac88f503bacaef712a51000


## 1.4. wx.relaunch

`wx.relaunch({url: url})`，关闭所有页面，重新打开当前页面，不会执行 `App.vue` 的 `beforeDestory`、`mounted` 方法。


## 1.5. 小程序props

小程序中`props`是对象的话，如果其有个属性值是`function`，只有初次赋值有效，后面替换的话，不会生效。就是不会替换成功，一直是初始的那个值。


## 1.6. undefined

`uni-app`的小程序中如果对象为`undefined`时，渲染结果就是`undefined`，但是h5就会为空字符串，比如：

```html
<div> {{ item.awardStatusDesc || '' }} </div>
```

这里后面最好加 `||''`


## 1.7. key

`:key="`section-${index}`"`这样的`key`没生效，编译后的`wxml`没有`wx:key`。

下面这样的可以才生效：

```html
:key="getUniqueKey('nav', idx)"
```

```ts
getUniqueKey(a, b) {
  return `${a}-${b}`;
},
```

## 1.8. 选择子组件元素

```ts
this.createSelectorQuery().select(`.wrap >>> #${id}`);
```

## 1.9. qs版本过高时，微信小程序报错

报错内容：

```
Reflect.apply requires the first argument be a function
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_bbddb032816df0fe51.jpg" width="375">

解决：`qs`从`6.11.2`降级到`6.5.2`时，亲测正常。


参考：
1. https://developers.weixin.qq.com/community/develop/doc/0000acb32a08f0aa8ddd47b6b51800


## 1.10. click.native

`click.native`可以监听组件根元素的原生事件，但是需要注意子组件的根元素，不要已经用`click.stop`监听了，否则`click`事件不生效。


下面是错误使用示例。

父组件：

```html
<press-cell
  @click.native="onOptionTap(item)"
>
  xxx
</press-cell>
```

子组件：

```html
<template>
  <div
    @click.stop="onClick"
  >
    xxx
  </div>
</template>
```

参考：
1. https://blog.csdn.net/qq_25906119/article/details/128839414
2. https://ask.dcloud.net.cn/question/76184

## 1.11. 不要滥用原生标签


`uni-app` 项目自定义组件标签不能使用原生标签，比如不能用 ListView，否则透传的参数，会变成 `$event`。

```ts
onFilterClicked(event) {
  // #ifndef H5
  event = event?.detail?.__args__?.[0] || event;
  // #endif
  this.$emit('onFilterClicked', event);
},
```

上面这种兼容是丑陋的，容易遗忘，应该避免。



# 2. 同时开发


1、h5和小程序同时开发一个需求时，推荐先做h5，因为h5编译快，api规范，相对来讲开发者更熟悉。

2、发现h5事件正常但是小程序不正常，检查`v-for`的`key`是否有重复

3、发现h5样式正常，但是小程序不正常，检查是否使用了`()=>import('')`


# 3. qq小程序

## 3.1. 不支持 virtualHost

qq小程序不支持 `virtualHost`，类似 `press-tabs press-tab`，`press-tabbar press-tabbar-item`，有些写在子元素根标签的样式不生效，比如`width: 100%`, `flex: 1`，`flex-shrink: 0`等。

这类css属性的特点是必须和特定的父元素在一起才行，所以需要额外设置下。可以用这种方式：


```scss
// press-tabbar.vue
.press-tabbar {
  ::v-deep press-tabbar-item {
    flex: 1;
  }
}
```

## 3.2. 不支持console.table

需要自己`polyfill`下。

## 3.3. 动态设置style时，该有的空格不能缺

比如下面这个：

```ts
computed: {
  transformStyle() {
    let res = `transform: translate3d(0rpx, ${this.currentScroll * 2}rpx, 0rpx);`;

    // #ifdef H5
    res = `transform: translate3d(0px, ${this.currentScroll * 2 / 100}rem, 0px);`;
    // #endif

    return res;
  },
},
```

如果 translate3d 中没有空格的话，会设置不生效。

## 3.4. scroll-view

qq小程序 `scroll-view` 不支持 `enable-flex`，手动写`display: flex`也不行。

```scss
.tip-match-pk-schedule-item {
    transition: all .45s;
    // qq小程序scroll-view不支持enable-flex，子元素需要如下设置，否则无法横向布局。
    display: inline-block;
}
```


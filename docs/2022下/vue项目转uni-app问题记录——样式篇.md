[toc]

# 1. 样式

## 1.1. fixed弹窗滑动时，下层页面也跟着滑动（穿透问题）


这里[有篇文章](http://t.zoukankan.com/zlfProgrammer-p-10750058.html)介绍的比较好。

对于uni-app来说，最简单的方法应该是第一种，在弹窗外层元素加上事件`@touchmove.stop="preventTouchMove"`：

```ts
preventTouchMove() {
  return;
},
```


如果弹窗内部有滚动元素，则在滚动元素外层用`scroll-view`包裹。

这个 scroll-view 的子孙元素不能添加 overflow: auto，否则无法滚动。


另外，试了下在`page-meta`上加上 `page-style="height: 100%; overflow: 'hidden'"` 是不生效的。

## 1.2. 安全区

h5的时候有下面的样式，就是处理ios的刘海屏。

```css
body {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-left: constant(safe-area-inset-left);
  padding-left: env(safe-area-inset-left);
  padding-right: constant(safe-area-inset-right);
  padding-right: env(safe-area-inset-right);
  /* padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom); */
}
```

在小程序中，这段样式需要去掉，否则会在自定义导航栏下面出现一条白框。

在uni-app项目中，只要把上面代码移动到`index.html`中就可以了，因为只有h5项目才会使用这个`index.html`文件。


## 1.3. page-meta

```
<page-meta :root-font-size="fontsize+'px'"></page-meta>
```

page-meta只能是页面内的第一个节点，可以实现rem


## 1.4. slot问题

uni-app是支持具名插槽的，有一点需要注意，对于写在slot标签上的类名，h5会下发到slot内部的外层元素上，而小程序则会创建view元素，在这个元素上添加类名。

如果遇到slot的样式异常，可以先排查下这里。

举个例子：

```html
<SomeComp class="extra">
  <template #middle>
      title
  </template>
</SomeComp>
```

SomeComp组件内容如下：

```html
<div class="inner">
  <div class="middle">
    <slot name="middle" />
  </div>
</div>
```

在h5中会被渲染成：

```html
<div class="extra inner">
  <div class="middle">
    title
  </div>
</div>
```

在小程序会被渲染成：

```html
<view class="extra">
  <view class="inner">
    <view class="middle">
      title
    </view>
  </view>
</view>
```

子组件加上下面代码可以解决：

```ts
options: {
  virtualHost: true,
},
```

## 1.5. 样式隔离

主要涉及 styleIsolation 属性。文档地址[在这里](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/wxml-wxss.html#%E7%BB%84%E4%BB%B6%E6%A0%B7%E5%BC%8F%E9%9A%94%E7%A6%BB)。

styleIsolation 选项支持以下取值：

- isolated 表示启用样式隔离，在自定义组件内外，使用 class 指定的样式将不会相互影响（一般情况下的默认值）；
- apply-shared 表示页面 wxss 样式将影响到自定义组件，但自定义组件 wxss 中指定的样式不会影响页面；
- shared **表示页面 wxss 样式将影响到自定义组件，自定义组件 wxss 中指定的样式也会影响页面和其他设置了 apply-shared 或 shared 的自定义组件**。（这个选项在插件中不可用）




## 1.6. uni-app在h5端默认开启scoped

H5端为了隔离页面间的样式默认启用了 scoped，且无法取消

1. [官方文档](https://uniapp.dcloud.net.cn/matter.html#h5%E6%AD%A3%E5%B8%B8%E4%BD%86app%E5%BC%82%E5%B8%B8%E7%9A%84%E5%8F%AF%E8%83%BD%E6%80%A7)
2. [相关文章](https://blog.csdn.net/qq_34825590/article/details/119412740)


## 1.7. 不要在 class、style 中使用复杂对象

不能在 class、style 中直接使用 函数、data、计算属性 的对象，比如：

```html
<div
  :style="scheItemStyle[index]"
>
```

但是可以这样：


```html
<div
 :style="{ height: scheItemStyle[index].height }"
>
```

也就是使用某个具体的属性（字符串、数字等非引用类型类型），但不能是对象、数组等。


这种也不可以：

```html
<div
  :class="[
    {'hidden-van-tabs': stageCfgList.length === 1},
  ]"
/>
```


这种可以：

```html
<div
  :class="[
    {'hidden-van-tabs': isOnlyOneStage},
  ]"
/>
```

_____

后面发现用字符串就可以了。

这样会报错
              
```html 
:style="getString(item,index)"
```

这样就不会

```html
<div
  :style="type === 'card'? getString(item,index): getString(item,index)"
/>
```
可以变通一下，这样也不会报错
 
```html
<div
 :style="true ? getString(item,index) : ''"
/>
```


## 1.8. v-if vs v-show

都知道v-show比v-if性能高，但是uni-app不支持v-show，对于dom节点特别大的页面来说，切换tab只能用v-show，v-if太卡。

这时可以用修改动态元素样式来实现，示例如下：

```html
<div
  :class="['double-fail-wrap', `double-fail-wrap-${curTab}`]"
>

<style lang="scss">
.double-fail-wrap-1 {
  .loser-sche-map {
    display: none;
  }
}
.double-fail-wrap-2 {
  .winner-sche-map {
    display: none;
  }
}
</style>
```

## 1.9. CSS变量

uni-app 中css变量可以用 page，在h5模式下会自动转成`uni-page-body`，不能用`:root`，小程序中不生效，如：

```scss
page {
  // 修改switch的一些变量
  --switch-width: 0.88rem;
  --switch-height: 0.48rem;
}
```

## 1.10. 小程序中的`:empty`问题

uni-app 小程序 `:empty`，可能会存在问题，slot 即使父组件不传的情况下，还是会生成 `<scoped-slots-label />`，导致永远不为空，无法命中 `empty`。

## 1.11. 样式层级问题

有些组件不要加scoped，加了以后，外面的样式很难覆盖里面的。

比如组件内的这个样式

```css
.press-popover--right.data-v-3fdac1da {}
```


比组件外的这个样式优先级高。

```css
.popover-wrap .demo-nav-popover--right {}
```

这块总之很乱，要每个case去看。

## 1.12. rpx精度丢失


小程序 rpx 转 px 时会直接去掉小数点，导致赛程树错位，用原生 rem 解决




## 1.13. 自定义组件多节点带来的样式问题


自定义组件渲染差异


微信（可以使用`virtualHost`配置）/QQ/百度/字节跳动这四家小程序，自定义组件在渲染时会比App/H5端多一级节点，在写样式时需要注意：

1. 使用`flex`布局时，直接给自定义组件的父元素设置为·不能影响到自定义组件内部的根节点，需要设置当前自定义组件为`display:flex`才可以。
2. 在自定义组件内部设置根元素高度为`100%`，不能撑满自定义组件父元素。需要同时设置当前自定义组件高度为`100%`才可以。


支付宝小程序默认启用了 virtualHost 配置不会插入节点，一般不存在如上问题。


参考：[uni-app官网](https://uniapp.dcloud.net.cn/matter.html)




## 1.14. 条件编译

样式文件中的条件编译需要用`/* */`包裹，不能用`/**  */`包裹。

下图左边不生效，右边才生效。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/6/own_mike_9637fa73dedc6e87b0.png" width="500">


## 1.15. 样式转化

对`page`设置的样式，在h5中会被转成`uni-page-body`：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/6/own_mike_af5205041bba65884d.png" width="700">

对`html`和`body`设置的样式，在小程序中会被转成`page`：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/6/own_mike_1018511e52a1f96ed5.png" width="700">


对于这些容易造成歧义、容易产生误解，理解成本较高的转化样式，建议使用条件编译，只在本平台写本台可识别的样式，减少这种转化。


## 1.16. 多行省略号兼容性

不是`uni-app`项目独有的问题，这里也记录下。

多行省略号只能支持 `webkit` 内核浏览器, IE系就不兼容，所以对于多行省略号是不能用`stylelint`的默认规则。

- 溢出隐藏：`overflow: hidden;`
- 省略号：`text-overflow: ellipsis; display: -webkit-box;`
- 弹性盒模型：
  设置弹性盒子的子元素的排列方式 ：`-webkit-box-orient: vertical;`
  设置显示文本的行数：`-webkit-line-clamp: 3;` (最多显示3行)



## 1.17. page大部分情况下都应该为overflow:hidden

### 1.17.1. page

移动端，不论是h5还是小程序，大部分页面应该设置为`height: 100%;overflow: hidden;`，这样整个页面才不会跟着滑动，才不会漏出最底层，用户体验才好点。

如果是渐变式导航，则相反，`page`需要设置为`height: auto`，这样才会触发`onPageScroll`事件。此外，想让`page`滚动，那么`page`下的第一层的高度要大于一屏才可以，也就是不能在`demo-wrap`上设置`height: 100%`，可以给`height: auto`，或具体的高度。

除了需要`onPageScroll`事件的，其他都建议`page`设置为`overflow: hidden`。

设置`page`为`overflow:hidden`还有个好处，不用再给`page`设置额外的背景色了，反正看不见，只关心页面就行了，没铺满的就铺满即可。

### 1.17.2. demo-wrap

既然`page`设置了`overflow:hidden`，那么`page`下的第一个元素如果超出了屏幕高度，则需要设置`overflow: auto;height: 100%;`，否则就会显示不全。

如果不加`demo-wrap`，则页面在h5下可以滚动，在小程序下不可以滚动。因为h5中`uni-page-body`设置了`overflow:auto`，而小程序没有这个中间层。

### 1.17.3. press-ui

对于`press-ui`示例项目：

- H5中`html/body`设置了`height: 100%;overflow:hidden`，`uni-page-body`设置了`height: 100%;overflow:auto`
- 小程序中，`page`设置了`height: 100%;overflow:hidden;`，页面顶层需要滚动的`dom`，加上类名`demo-wrap`，其样式为`height: 100%；overflow: auto;`。

小程序下页面级别的`vue`文件中，对`page`的样式设置：

- 小程序下，不能加`scoped`，否则无效。
- H5下，加了`scoped`，`page`转化的`uni-page-body`样式是生效的。


## 1.18. 安全区

什么时候需要适配安全区呢，底部是`tabbar`、购买按钮、输入框等不随页面滚动的元素。


## 1.19. 页面样式

归类，页面一定要有统一的包裹层`class`。好处是方便维护。


## 1.20. 动态class

小程序不支持这个

```html
  :class="`tip-match-schedule-tab-item--scroll-${col - scrollTime}`"
```

但是支持这个

```html
  :class="[`tip-match-schedule-tab-item--scroll-${col - scrollTime}`]"
```





# 2. vant



## 2.1. van-tab

### 2.1.1. change事件参数

uni-app中 vant-tab 的change事件暴露参数为event，需适配

```ts
this.curTab = e.detail.name;
```


### 2.1.2. v-model无效

uni-app 中 van-tab 使用 v-model 无效，会被转为，所以必须要想拿到改变后的tab，要写change事件，因为 van-weapp 默认更新的是 active 属性。

```html
<van-tabs active="{{ active }}" bind:change="onChange">

</van-tabs>
```

```ts
Page({
  data: {
    active: 1,
  },

  onChange(event) {
    wx.showToast({
      title: `切换到标签 ${event.detail.name}`,
      icon: 'none',
    });
  },
});
```

### 2.1.3. 性能问题

`tabMap[curTab]`不要写在 template 中，否则切换 tab 时会有延迟，也不要写在 computed 中，最好不依赖 curTab。


```html
<!-- 存在问题 -->
<Comp 
  :list="tabMap[curTab]"
/>
```



```vue
<!-- 不推荐 -->
<Comp 
  :list="curList"
/>

computed: {
  curList() {
    const { tabMap, curTab } = this;
    return tabMap[curTab]
  }
}
```

更好的方式是不依赖curTab

```html
:sche-list="stageScheMap[index]"
```





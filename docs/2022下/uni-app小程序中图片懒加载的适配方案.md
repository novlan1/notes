
## 1. 背景

在普通的Vue项目中，图片懒加载使用的 [vue-lazyload](https://www.npmjs.com/package/vue-lazyload) 这个三方库，用法如下：

```js
Vue.use(VueLazyload, {
  preLoad: 1.3,
  error: errorimage,
  loading: loadimage,
  attempt: 1
})
```

然后在Vue模板中，这样来使用：

```html
<ul>
  <li v-for="img in list">
    <img v-lazy="img.src" >
  </li>
</ul>
```

到了uni-app小程序项目中，是无法支持的，因为目前uni-app并不支持自定义指令，所以要想其他办法改造懒加载。

## 2. 方案

翻了一下网上的小程序懒加载方法，有以下几种：

1. 小程序自带的lazy-load属性
2. onPageScroll监听页面滚动，计算图片高度和clientHeight的关系来判断
3. 用wx.createIntersectionObserver().relativeToViewport等API，监听图片是否在当前视口

后两种方法不适合我们的场景，如果是单个页面还可以，要做通用方法的话，要改造很多代码。

并且关键是lazy-load是有效果的，可以尝试在img上加个@load方法，然后滚动下，可以看到是有懒加载的。

```html
<img :src="url" lazy-load @load="loadImg">
```

现在问题变成了如何批量替换之前的v-lazy，让它在小程序模式下，变成lazy-load，且转为src。这个可以用webpack-loader解决，如果匹配到v-lazy的img标签，将其替换成对应的src，并添加lazy-load属性。

此外，之前的懒加载是可以自动获取元素的宽高，然后请求指定宽高的数据，来达到性能优化的目的。到了小程序，这一步不能自动获取了，想了个方法，可以把size/width/height写在标签属性上，然后调用自定义的压缩方法，获取指定宽高的url。

这个urlHandler可以写在全局mixin中，方法里添加云图片的压缩参数。

总体的思路如下：


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-v-lazy.png" width="800">


```html
<img v-lazy="img"> 

<!-- 会转为 -->
<img :src="img">
```


如果提供 options.urlHandler，则用 urlHandler 包裹，比如：

```html
<img v-lazy="img"> 

<!-- 会转为 -->
<img :src="getCompressUrl(img)">
```

如果提供 size 和 urlHandler，则向 urlHandler 传递 size 参数，比如：
```html
<img v-lazy="img" size="50">

<!-- 会转为 -->
<img :src="getCompressUrl(img, 50, 50)">
```


以下几种size都是有效的：

```html
<img v-lazy="src" size="50">
<img v-lazy="src" data-size="50">
<img v-lazy="src" width="50" height="100">
<img v-lazy="src" data-width="50" data-height="100">
```
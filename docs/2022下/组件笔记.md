[toc]
## 1. uni-icons

uni-icons本质用的是字体文件，所以不支持多色，用字体的优势是比较普适，因为小程序不支持svg。

icon实现有以下几种：

- 雪碧图
  - 本质是图片，缺点是维护困难，每新增一个图标，都需要改动原始图片
- unicode
  - 原理：使用了Unicode中`E000 - F8FF`这一私用区范围，并通过 @font-face 引入自定义字体(其实就是一个字体库)
  - 优势：兼容性好，支持ie6+；支持按照字体的方式调整icon大小、颜色
  - 劣势：不支持多色；在不同的设备浏览器字体的渲染会略有差别；书写不直观，语义不明确
- font
  - font-class 是 Unicode 使用方式的一种变种
  - 优势：相比unicode，书写直观，语义明确；当要替换图标时，只需要修改 class 里面的 Unicode 引用
- svg
  - 优势：支持多色图标；矢量，缩放不失真
  - 劣势：兼容性较差，支持 IE9+，及现代浏览器

uni-icons主要代码如下：

```scss
@font-face {
  font-family: uniicons;
  src: url('./uniicons.ttf') format('truetype');
}

.uni-icons {
  font-family: uniicons;
  text-decoration: none;
  text-align: center;
}

.uniui-arrow-up:before {
  content: "\e6bd";
}


.uniui-arrow-down:before {
  content: "\e6be";
}
```

我们项目没使用uni-icons，而是另一个iconfont库，原理一样，小程序中`iconfont.css`写在了项目中，H5的`iconfont.css`使用了外链。

## 2. uni-transition

uni-transition核心是用了uni.createAnimation这个方法。

既然style不能传递对象，那么组件内部做一层处理，传递styles，在组件内部拼接成style。

用了setTimeout，来延迟执行操作。

## 3. uni-picker-view

uni-app内置picker-view，其DOM结构如下：

```html
<uni-picker-view
  style="position: relative;"
>
  <uni-resize-sensor>
    <div><div /></div>
    <div><div /></div>
  </uni-resize-sensor>
  <div class="uni-picker-view-wrapper">
    <!-- 内容 -->
  </div>
</uni-picker-view>
```

两层嵌套：

```
- uni-picker-view
  - uni-resize-sensor
  - uni-picker-view-wrapper
    - 实际内容
```

### 3.1. uni-picker-view-column

uni-app内置picker-view-column，其DOM结构如下：

```html
<uni-picker-view-column>
  <div class="uni-picker-view-group">
    <div
      class="uni-picker-view-mask"
      style="background-size: 100% 125px;"
    />
    <div
      class="uni-picker-view-indicator"
      style="height: 50px;"
    >
      <uni-resize-sensor>
        <div><div /></div>
        <div><div /></div>
      </uni-resize-sensor>
    </div>
    <div
      class="uni-picker-view-content picker-view-column-1667531825290"
      style="padding: 125px 0px; transform: translateY(-300px) translateZ(0px);"
    >
     <!-- 循环内容 -->
    </div>
  </div>
</uni-picker-view-column>
```

也可以当作两层嵌套吧：

```
- uni-picker-view-column
  - uni-picker-view-group
  - uni-picker-view-indicator
    - uni-resize-sensor
  - uni-picker-view-content
    - 实际内容
```


## 4. van-tabs

了解van-tabs的结构，看似荒诞，其实在日常开发中是很有用的。


```
- tabs
  - sticky
    - tabs__wrap
      - slot (name="nav-left")
      - tabs__scroll(scroll-view)，控制滚动
        - tabs__nav，flex布局
          - tabs__line，绝对定位，tabs下面的线
          - tab，v-for遍历
            - ellipsis
              - info  
      - slot (name="nav-right")
  - tabs__content，实际内容包裹层，touch事件
    - tabs__track，可以加 animated
      - tab__pane
```


底下线偏移距离逻辑，先加上累计的宽度，再加上多出来的一半：



```ts
 let lineOffsetLeft = rects
    .slice(0, currentIndex)
    .reduce((prev, curr) => prev + curr.width, 0);

lineOffsetLeft 
  += (rect.width - lineRect.width) / 2 + (ellipsis ? 0 : 8);
```

## 5. van-sticky

结构如下：

```
- van-sticky
  - van-sticky-wrap
    - slot
```

为什么是两层结构呢，因为如果一层的，原来的位置高度会塌陷。

### 5.1. 不含容器

滚动的时候，如果`offsetTop > root.top`，则说明需要固定了，这里的`root`就是`van-sticky`。

固定的时候，`van-sticky`设置一个高度`root.height`，否则`wrap`会塌陷。

同时，`wrap`设置`class`为`--fixed`，值即`position:fixed;left:0;right:0`，`wrap`的`top`设置为`offsetTop`。

```ts
if (offsetTop >= root.top) {
  this.setDataAfterDiff({ fixed: true, height: root.height });
  this.transform = 0;
} else {
  this.setDataAfterDiff({ fixed: false });
}
```

### 5.2. 容器内

当sticky组件在容器内，会存在下面三种情况：

1. `offsetTop + root.height > container.height + container.top`，container滚动到不可见的顶部时，sticky的元素也随之移动。此时让`root`位置不动，只改变内部元素的`translateY`
2. `offsetTop >= root.top`，可见，存在偏移
3. 不存在相对偏移

第1种情况，可以将式子转为`container.bottom - root.height < offsetTop`，如果满足上式，则说明`container`已经滚动到界外了，需要设置`transform`。

`translateY`设置为多少呢，应该是设置多少都无所谓，反正不可见了，vant这里是设置了`container.height - root.height`，也就是容器的最底部，这样更严谨一点。


第2种情况就是不含容器的情况，不再赘述。

```ts
if (root && container && offsetTop + root.height > container.height + container.top) {
  this.setDataAfterDiff({
    fixed: false,
    transform: container.height - root.height,
  });
} else if (root && offsetTop >= root.top) {
  this.setDataAfterDiff({
    fixed: true,
    height: root.height,
    transform: 0,
  });
} else {
  this.setDataAfterDiff({ fixed: false, transform: 0 });
}
```

### 5.3. 滚动

H5监听滚动是先获取了scroller，就是overflowY为auto或者scroll的父元素，然后监听其scroll事件。

小程序监听滚动是在page.onPageScroll中添加一个回调。

## 6. van-picker

```ts
this.$emit('change', {
  picker: this,
  value: this.getValues(),
  index: event, 
});
```

不能暴露“picker: this”，微信小程序会报错，“ Property or method "toJSON" is not defined on the instance but referenced during render.”。

## 7. van-loading

```
- loading
  - loading__spinner
    - loading_dot，只有loadingType为spinner才有，循环12个
  - loading__text
    - slot, 文本
```


### 7.1. circular动画

circular类型的loading，就是一个1/4的圆，然后一个旋转动画。

圆形就是正方形加上`border-radius: 100%`

```scss
.van_loading__spinner--circular {
  border: 1px solid transparent;
  border-top-color: currentColor;
  border-radius: 100%;
}
```

currentColor是CSS3中的变量，它表示“当前的标签所继承的文字颜色”。

“当前颜色” 指本体color , 如果没有设置color就找父元素,一级一级找,一直到根元素位置。

旋转动画：

```scss
&__spinner {
  animation: van-rotate
    var(
      --loading-spinner-animation-duration,
      $loading-spinner-animation-duration
    )
    linear infinite;
}

@keyframes van-rotate {
  0% {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(1turn);
  }
}
```

### 7.2. spinner动画

spinner动画就是12条线，360度平均分布，透明度渐变，然后再加上旋转动画。

12条线。每隔30度一条线。

```scss
@for $i from 1 through 12 {
  .van-loading__dot:nth-of-type(#{$i}) {
    transform: rotate($i * 30deg);
    opacity: 1 - (0.75 / 12) * ($i - 1);
  }
}
```

用 less 实现：

```less
.generate(@n, @i: 1) when (@i =< @n) {
  .van-loading__dot:nth-of-type(@{i}) {
    transform: rotate(@i * 30deg);
    opacity: 1 - (0.75 / 12) * (@i - 1);
  }
  .generate(@n, (@i + 1));
}
.generate(12);
```

spinner的旋转动画，是steps类型的，也就是不是顺畅的，是一帧一帧的。steps(12)就是截取其中的12帧。可以修改steps的值，从小到大，有利于加深对steps的理解。

```scss
&--spinner {
  animation-timing-function: steps(12);
}
```
## 8. transition

vant-weapp的transition基本是模拟了vue的transition，也有6个状态：

<img width="500" src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article%2F2022%2F12%2Fvue-transition.png">

1. v-enter-from（v2版本名为v-enter）：进入动画的起始状态。在元素插入之前添加，在元素插入完成后的下一帧移除。


2. v-enter-active：进入动画的生效状态。应用于整个进入动画阶段。在元素被插入之前添加，在过渡或动画完成之后移除。这个 class 可以被用来定义进入动画的持续时间、延迟与速度曲线类型。


3. v-enter-to：进入动画的结束状态。在元素插入完成后的下一帧被添加 (也就是 v-enter-from 被移除的同时)，在过渡或动画完成之后移除。

4. v-leave-from（v2版本名为v-leave）：离开动画的起始状态。在离开过渡效果被触发时立即添加，在一帧后被移除。

5. v-leave-active：离开动画的生效状态。应用于整个离开动画阶段。在离开过渡效果被触发时立即添加，在过渡或动画完成之后移除。这个 class 可以被用来定义离开动画的持续时间、延迟与速度曲线类型。

6. v-leave-to：离开动画的结束状态。在一个离开动画被触发后的下一帧被添加 (也就是 v-leave-from 被移除的同时)，在过渡或动画完成之后移除。

## 9. button

loading 和 disable 都是 unclickable



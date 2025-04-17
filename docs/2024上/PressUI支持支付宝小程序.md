## 1. 开始

记录一些坑。

## 2. 模板部分


### 2.1. $slots.xxx 判断是否有插入内容无效

在 `template` 中，其他平台可以通过 `$slots.default` 判断是否有插入内容，而支付宝小程序不支持。

比如，`press-field` 使用的 `press-cell` 需要改造。


### 2.2. 子元素 slot 的 v-if

`press-toast` 预埋时，会显示一道杠，发现是 `press-toast--text` 元素被渲染出来了，而其他平台没有。

推测是子元素的 `v-if` 没有生效，这样修改：

```html
<press-transition
  :show="dataShow"
>
  <!-- 在 press-toast 内部再加一层判断，不依赖子元素 -->
  <div
    v-if="dataShow"
    :class="toastClass"
    @touchmove.stop.prevent="noop"
  >
  <!-- 其他逻辑 -->
  </div>
</press-transition>
```

### 2.3. 模板行内箭头函数

支付宝不支持如下写法：

```html
<div
  v-for="(item, index) in showingData"
  :key="index"
  @mouseup="e => itemUp(e, item.uniqueKey)"
>
  {{ item.label }}
</div>
```

可以这样改，将额外数据放到 `dataset` 中，然后方法中也从 `event.target.dataset` 中取。

```html
<div
  v-for="(item, index) in showingData"
  :key="index"
  class="press-picker-view--item"
  :data-unique-key="item.uniqueKey"
  @mouseup="itemUp"
>
  {{ item.label }}
</div>
```

```ts
export default {
  methods() {
    itemUp(e) {
      const { uniqueKey } = e.currentTarget.dataset;
      // ...
    }
  }
}
```

### 2.4. 形如 name="" 会被当成 boolean 类型

组件如果要接受 `string` 类型的 `name`，其他平台传入 `name=""` 没任何问题，支付宝则会把它当成 `true`，可以这样修改：

```html
<press-transition :name="``" />
```

### 2.5. press-icon 不应该用 click.stop

图标组件不应该用 click.stop，否则使用它的所有地方都要声明 click 事件，比较容易出错。


### 2.6. 自定义组件的 click.stop 无效

比如 `press-button` 上使用 `click.stop` 无效，按钮点击事件不触发，需要去掉 `.stop`。

### 2.7. canvas的id

`canvas` 的 `id` 不能相同，否则绘制的时候会因为错位而闪烁。



## 3. 样式部分

### 3.1. 自定义组件的样式

还是在 `toast` 组件中，引用的自定义组件，上面声明了 `class`，对它进行的样式声明无效。

```html
<press-icon-plus
  class="press-toast__icon"
/>
```

```scss
::v-deep .press-toast__icon {
  font-size: var(--toast-icon-size, $toast-icon-size);
  white-space: normal;
}
```

可以改成在 `press-icon-plus` 上声明，`press-icon-plus` 是子组件自己的类名。

```scss
::v-deep .press-icon-plus {
  font-size: var(--toast-icon-size, $toast-icon-size);
  white-space: normal;
}
```

顺便说下，微信小程序的 `custom-class` 样式和子组件的自身样式的优先级，不能确定，即使你加了类名，提高比重，一样不能提升其优先级，除非用 `!important`。[参考这里](https://developers.weixin.qq.com/community/develop/doc/000046750e80180c07b63826151400)。


所以最终改成这种方案，组件自己的 `class`、`v-deep`，也就是条件编译 + `custom-class`。


### 3.2. scroll-view 默认宽度

微信小程序和 `uni-app` 的 h5 下的 `scroll-view` 都是 `width: 100%`;

支付宝小程序并没有。

### 3.3. page 设置 100% 无效

`page` 设置 `100%` 无效，其高度实际为子元素高度，子元素高度大，则会撑开，高度小，则不满。

可以将 `page` 改成 `100vh`。


### 3.4. 路径上只能有1个::v-deep

`scss` 选择器路径上只能有1个 `::v-deep`，其他不会被转化。

比如 

```scss
.press-collapse-item {
  ::v-deep &__title {
    ::v-deep &--expanded {
      .press-cell__right-icon {
        transform: rotate(-90deg);
      }
    }
  }
}
```

会被转为

```scss
.data-v-469c232f ::v-deep .press-collapse-item__title--expanded .press-cell__right-icon {
  -webkit-transform: rotate(-90deg);
          transform: rotate(-90deg);
}
```

而你想要的应该是

```scss
.data-v-469c232f .press-collapse-item__title--expanded .press-cell__right-icon {
  -webkit-transform: rotate(-90deg);
          transform: rotate(-90deg);
}
```

多了一个 `::v-deep`，由于原生 CSS 并不认识它，所以样式不生效。

### 3.5. swiper-item 高度

支付宝小程序 `swiper-item` 高度只能由子元素高度，不能自主设置 `style=“height: 100%”`。

所以 `image-preview` 组件的图片需要增加一个包裹层，设置为 `100%`。


### 3.6. 滚动穿透

可以[参考这里](https://open.alipay.com/portal/forum/post/24301024)，滚动时，将页面设置为 `fixed`。

但组件库还是要提供基础的体验，实践下来发现在 `press-overlay`, `press-popup` 等元素添加 `touch-action:none;` 属性即可。

如果用户内嵌了其他元素，可以自行设置 `touch-action:none;`

另外，`@touchmove.stop.prevent="noop"` 在支付宝小程序是无效的，在 H5、微信小程序、QQ小程序中有效。


### 3.7. Picker 滚动

Picker 在支付宝小程序中， 要用 `scroll view`，而不是 `div`，并设置 `scroll-y` 为 `true`，否则 `Picker` 滚动的时候页面也跟着滚动。

## 4. 脚本部分

### 4.1. 导航栏设置

支付宝的导航栏支持的颜色比较少，可以放到脚本中。比如下面就是放到 mixin 中，每个页面的 onLoad 时，都会执行。

```ts
onLoad() {
  // https://opendocs.alipay.com/mini/api/xwq8e6
  // #ifdef MP-ALIPAY
  // @ts-ignore
  my?.setNavigationBar({
    backgroundColor: '#fff',
    frontColor: '#000',
  });
  // #endif
}
```


### 4.2. 不支持 scrollIntoView

支付宝小程序和QQ小程序都不支持函数式的设置 `scroll-top`，也就是不支持 `node.scrollIntoView`，只能在模板上设置 `scroll-top`。



### 4.3. createIntersectionObserver

支付宝小程序的 createIntersectionObserver 有以下不同：

1. 不支持传入组件实例，下面的 `this` 仅是为了统一 API
2. 不支持在自定义组件上的 `class`
3. 需要显式设置 `dataset` 为 `true`，才能拿到 `Dom` 上的数据

```js
const contentObserver = uni.createIntersectionObserver(this, {
  thresholds: threshold,
  observeAll,
  dataset: true,
});
```

## 5. 组件理解

记录自己对一些组件的理解。

### 5.1. index-bar

一看到 `bar`，就知道是边栏，`index-bar` 就是索引栏，所以这个组件的核心就是可点击的那一小列，并不是指的整个页面，默认放到右侧，就跟微信里的一样。

那么主体放哪里呢，组件需要监听主体的滚动，所以用 `scroll-view` 套住，并放在 `index-bar` 的 `slot` 内。这里的核心就是要把主体放到 `index-bar` 的 `slot` 内，因为用户可以自定义主体内容，组件只需要关心其滚动行为。

到这里基本的组件结构就呼之欲出了，伪代码如下。

```html
<div>
  <scroll-view>
   <slot/>
  </scroll-view>
  <div 
    v-for="(item, index) of indexList" 
    :key="item"
  >
  </div>
</div>
```

光有这个还不够，还需要提供一个 `index-anchor`，也就是锚点。主体滚动时，顶部会固定不同的内容，也就是 `fixed`，同时右侧 `index-bar` 的激活内容也跟着变。

用户可以将 `index-anchor` 穿插在主体内容中，并用 `index-bar` 包裹：

```html
<press-index-bar>
  <div>
    <press-index-anchor index="A" />
    <press-cell title="文本" />
    <press-cell title="文本" />
    <press-cell title="文本" />
  </div>

  <div>
    <press-index-anchor index="B" />
    <press-cell title="文本" />
    <press-cell title="文本" />
    <press-cell title="文本" />
  </div>

  ...
</press-index-bar>
```

还有一个细节，`scroll-view` 滚动时，判断 `active` 索引的核心逻辑如下。从后往前数，激活态就是第一个满足下面这个条件的，`scrollTop < child[i].top`。


## 6. 总结

下面是可预览的 Press UI 的产品矩阵：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/press%2Fimg%2Fpress-demo-cluster.gif" width="700">

下面是 Press UI 所有可提供的服务：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/press/img/services.gif" width="600">

官网地址：[https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui)
## 1. 开始

[Press UI](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui/) 是一套基于 [uni-app](https://uniapp.dcloud.net.cn/) 的组件库，是项目内孵化的，但并不与任何业务绑定的底层组件库。

目前 Press UI 主要有三方面功能：

- 基础组件，提供与 [Vant](https://vant-contrib.gitee.io/vant/v2/#/zh-CN/) 相同API的组件，比如 Button、Picker 等共60多个
- 业务组件，在基础组件上搭建的、业务中沉淀的组件，目前有10多个
- 核心逻辑，包含路由寻址、IM模块封装等

下图是示例二维码，分别为H5、微信小程序、QQ小程序。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/press/qrcode/press-ui-demo-qrcode-3.png" width="600">

在做一个普通Vue项目（非`uni-app`环境）需求时，需要一个组件，在 Press UI 已经有了，可不可以直接用 Press UI 内的呢？这样就不用写两套代码了。

进而想一下，能否让所有组件都支持普通Vue项目呢？

## 2. 思路

其实，`uni-app`的组件也是SFC，相比普通H5项目，有以下不同：

1. 支持条件编译，是跨平台的关键部分
2. 包含`uni-app`内置组件，比如
   - `scroll-view`
   - `swiper`
   - `swiper-item`
   - `view`
   - `image`
   - `rich-text`
   - ...
3. 包含`uni-app`提供的API，比如
   - `uni.createSelectorQuery()`
   - `uni.vibrateLong`
   - `uni.showToast`
   - ...
4. 包含与小程序对齐的生命周期，如`onShow`、`onLoad`

现在分析下如何抹平上面几点，达到一套代码走天下。

1. 对于条件编译，可以实现一套一样的，专门针对于非 `uni-app` 项目。

看了下 `uni-app` 的源码，其条件编译是在[preprocess](https://github.com/jsoverson/preprocess)魔改的。

2. 对于`uni-app`内置组件，有两种处理办法：

  - H5端直接不用内置组件，完全用H5的Tag或Vue语法处理。

  - 用内置组件，但在非`uni-app`场景下，实现内置组件的`polyfill`。

Press UI 同时采用了这两种方法，对于一些简单的，可直接替代的，用第一种方法：

- view => div
- text => span
- image => img
- uni-shadow-root => div
- rich-text => v-html

对于相对复杂的组件，用的第二种方法，比如自己实现了`scroll-view`、`swiper`、`swiper-item`。

3. 对于`uni-app`提供的API，Press UI 在非`uni-app`环境实现了对应的`polyfill`。

4. 对于非Vue原生支持的生命周期，可替换为Vue自身的。


## 3. 实现

工欲善其事，必先利其器。对于组件库，示例和文档就是“器”。

Press UI 要想跨第n+1端，需要一个环境来调试并检验成果。由于`uni-app`为`vue-cli-service`注入了插件，所以这里另起了一个示例项目，把 Press UI 当`submodule`引入。

然后实现了与`uni-app`一模一样的条件编译工具 ifdef-loader，使用方式与`uni-app`相同，并沉到业务底层。


并且实现了`scroll-view`、`swiper`等组件，提供与`uni-app`相同的属性和事件，另外，对组件涉及的`uni-app`相关的`api`也进行了兼容。

下面是 Press UI 在非`uni-app`环境下的示例：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_32e3f24500cdc9b1c0.png" width="300">


## 4. 遇到的问题

`uni-app`使用的Vue是修改过的，并非Vue官方版本，因为在渲染等方面有差异。

### 4.1. uni-shadow-root

`uni-shadow-root`替换成`div`有坑点，可能会导致一些场景无法滑动，比如`press-tab`。

小程序下`uni-shadow-root`的`display`默认值是`inline`，也就是子元素展示高度(比如内容`1700px`)不会超过父元素高度(比如`300px`)，但是换成`div`后，对应的`view`的`display`属性值为`block`，其高度是子元素完整的高度（`1700px`）。

### 4.2. 插值语法

`uni-app`项目中，插值前后的空格是被抹掉的，而Vue是保留的。举个例子：

```html
<span>
  {{ text }}
</span>
```

在`uni-app`中会被渲染成:

```html
<span>{{ text }}</span>
```

而在普通Vue项目中，会被渲染成：

```html
<span> {{ text }} </span>
```

这个不同在`white-space`被设置成`pre-wrap`等属性时显示出来。

### 4.3. image

将`image`替换为`img`标签时，需处理属性`mode`。

### 4.4. IntersectionObserver

这个API在`Calendar`组件中用到了，当月份滑动的时候，父组件获取当前月份，来展示对应的标题。

具体是如何判断呢？如果某个月份的顶部小于父组件的顶部时，意味着它滑到了当前视口。

```ts
initRect() {
  if (this.contentObserver != null) {
    this.contentObserver.disconnect();
  }
  const rootSelector = '.press-calendar__body';
  const selector = '.month';
  const threshold = [0, 0.1, 0.9, 1];
  const observeAll = true;

  if (intersectionObserverPloyFill({
    selector,
    options: {
      threshold,
      observeAll,
      root: document.querySelector(rootSelector),
    },
    callback: (changes) => {
      for (const change of changes) {
        if (change.boundingClientRect.top <= change.rootBounds.top) {
          this.subtitle = formatMonthTitle(+change.target.dataset.date);
        }
      }
    },
  })) {
    return;
  }


  const contentObserver = uni.createIntersectionObserver(this, {
    thresholds: threshold,
    observeAll,
  });

  this.contentObserver = contentObserver;
  contentObserver.relativeTo(rootSelector);

  contentObserver.observe(selector, (res) => {
    if (res.boundingClientRect.top <= res.relativeRect.top) {
      this.subtitle = formatMonthTitle(res.dataset.date);
    }
  });
},
```

```ts
export function intersectionObserverPloyFill({
  selector,
  callback,
  options,
}) {
  if (isNotInUni()) {
    const io = new IntersectionObserver(callback, options);
    const target = document.querySelectorAll(selector);
    target.forEach((element) => {
      io.observe(element);
    });
    return true;
  }
  return false;
}
```

### 4.5. 输入框高度自适应


`textarea`的`autosize`属性在`uni-app`项目中是封装好的，如果自己实现呢？

可以监听输入框的`scrollHeight`，如果其发生了变化，那么说明输入的文字行数也发生了变化，然后把这个`scrollHeight`当作`height`赋值给`textarea`即可。

```ts
adjustSize() {
  const { input } = this.$refs;
  if (!(this.type === 'textarea' && this.autosize) || !input) {
    return;
  }

  const scrollTop = getRootScrollTop();
  input.style.height = 'auto';

  let height = input.scrollHeight;
  if (isObject(this.autosize)) {
    const { maxHeight, minHeight } = this.autosize;
    if (maxHeight) {
      height = Math.min(height, maxHeight);
    }
    if (minHeight) {
      height = Math.max(height, minHeight);
    }
  }

  if (height) {
    input.style.height = `${height}px`;
    setRootScrollTop(scrollTop);
  }
},
```

### 4.6. event.detail

`uni-app`中获取`scrollTop`等属性是通过`event.detail`，而普通Vue项目是通过`event.target`。

### 4.7. dataset

`uni-app`会把`event.target.dataset`的数字转为`number`类型，而普通Vue项目一直是`string`。


```html
<div
  v-for="(item,index) in (options)"
  :key="item.index"
  :data-index="index"
>
</div>
```

### 4.8. uni-page-head 兼容

`uni-page-head` 是`position: fixed`的元素，高度`44px`，在它下面加个同等高度的`uni-placeholder`，这样下面的元素就不会顶上去了，好处是对其他元素样式无侵入。

```scss
.uni-placeholder {
  width: 100%;
  height: 44px;
  height: calc(44px + constant(safe-area-inset-top));
  height: calc(44px + env(safe-area-inset-top));
}
```

### 4.9. top-window


`uni-app`中如果有`top-window`，也就是`uni-page-head`那层级，计算`boundingClientRect`时，是会去除`top-window`的高度的，也就是会少`44px`。

```ts
uni.createSelectorQuery().in(this);
item
  .select(`#seq-${this.curSelItem}`)
  .boundingClientRect((res) => {})
  .exec();
```

## 5. 效果

目前 Press UI 的`schedule-tree`、`area`组件在普通Vue项目中使用，实现了一套代码`n+1`端复用，`n`是`uni-app`赋予的，`1`是本次扩展的。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_99e6e6c41944b384b4.jpg" width="375">

有些组件还实现了5端复用，除了H5、微信小程序、QQ小程序、普通H5外，还兼容了PC端。不过这种兼容并非是平台级别的，更多是UI展示和事件的处理。

## 6. 总结

总结下 Press UI 是如何兼容非 uni-app 环境的普通 Vue 项目的。

- 将 Press UI 作为 submodule，搭建 Press UI Pure 工程，进行调试和验证
- 对于模板标签，尽量用浏览器原生标签，并仿 uni-app 实现 scroll-view、swiper、swiper-item 等核心组件
- 对于 uni 相关API，利用浏览器原生API，自己实现一套功能一样的
- 对于某些相同API，但 uni-app 环境和普通 Vue 项目表现不一致的，也进行兼容
- 利用条件编译，减少代码冗余，减小代码体积

## 一、开始

[NProgress](https://ricostacruz.com/nprogress/)是一个指示页面加载的进度条动画库，本文是一篇简单的学习笔记，


## 二、结构

NProgress结构如下，bar是顶部加载进度条，spinner指示loading状态。


```html
<div id="nprogress">
  <div
    class="bar"
    role="bar"
  >
    <div class="peg" />
  </div>
  <div
    class="spinner"
    role="spinner"
  >
    <div class="spinner-icon" />
  </div>
</div>
```

## 三、样式

这个动画的核心应该是样式，JS主要是影响了加载进度，其他操作可以看作是锦上添花。

进度条bar是核心，其为 `position: fixed`。

```css
#nprogress {
  pointer-events: none;
}

#nprogress .bar {
  background: #29d;
  position: fixed;
  z-index: 1031;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
}
```

进度样式是写在行内的：

```css
.bar {
  transform: translate3d(-52.5829%, 0px, 0px);
  transition: all 200ms ease 0s;
}
```

X轴偏移距离是通过progress计算出来的：

```js
function toBarPerc(n) {
  return (-1 + n) * 100;
}
```

peg增加了一些阴影效果。

```css
#nprogress .peg {
  display: block;
  position: absolute;
  right: 0px;
  width: 100px;
  height: 100%;
  box-shadow: 0 0 10px #29d, 0 0 5px #29d;
  opacity: 1.0;

  -webkit-transform: rotate(3deg) translate(0px, -4px);
      -ms-transform: rotate(3deg) translate(0px, -4px);
          transform: rotate(3deg) translate(0px, -4px);
}
```

## 四、细节

### 1. 加载进度

NProgress的默认加载进度不是线性增大的，其实现方式如下，就是控制了每个阶段的加速度。

```js
NProgress.inc = function(amount) {
  var n = NProgress.status;

  if (!n) {
    return NProgress.start();
  } else if(n > 1) {
    return;
  } else {
    if (typeof amount !== 'number') {
      if (n >= 0 && n < 0.2) { amount = 0.1; }
      else if (n >= 0.2 && n < 0.5) { amount = 0.04; }
      else if (n >= 0.5 && n < 0.8) { amount = 0.02; }
      else if (n >= 0.8 && n < 0.99) { amount = 0.005; }
      else { amount = 0; }
    }

    n = clamp(n + amount, 0, 0.994);
    return NProgress.set(n);
  }
};
```

### 2. 浏览器兼容

NProgress 选用浏览器支持的CSS属性，降级方案依次为`translate3d/translate/margin`，它是根据`document.body.style`是否存在某属性来判断的。

```js
 NProgress.getPositioningCSS = function() {
  // Sniff on document.body.style
  var bodyStyle = document.body.style;

  // Sniff prefixes
  var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
                      ('MozTransform' in bodyStyle) ? 'Moz' :
                      ('msTransform' in bodyStyle) ? 'ms' :
                      ('OTransform' in bodyStyle) ? 'O' : '';

  if (vendorPrefix + 'Perspective' in bodyStyle) {
    // Modern browsers with 3D support, e.g. Webkit, IE10
    return 'translate3d';
  } else if (vendorPrefix + 'Transform' in bodyStyle) {
    // Browsers without 3D support, e.g. IE9
    return 'translate';
  } else {
    // Browsers without translate() support, e.g. IE7-8
    return 'margin';
  }
};
```

### 3. 队列

另外，NProgress还实现了一个同步队列，当调用 `set` 来改变进度的次数太多时，可以依次执行。

注意 `if (pending.length == 1) next()`，因为 `queue` 是一个个添加的，所以一定存在 `pendding.length===1` 的情况，所以一定会执行 `next()`。

当 `queue` 为空或者大于1时，`next` 不会执行。大于1说明有任务在 `next` 中执行了，不需要在这里调用。

`next` 就是取队列的第一个，如果存在就执行，并依次调用下一个。


```js
var queue = (function() {
  var pending = [];

  function next() {
    var fn = pending.shift();
    if (fn) {
      fn(next);
    }
  }

  return function(fn) {
    pending.push(fn);
    if (pending.length == 1) next();
  };
})();
```

注意这是一个同步的队列，异步队列的实现可以参考这篇文章：[实现一个带并发限制的异步调度器，保证同时运行的任务最多有两个](https://juejin.cn/post/7039917386589437989)。

## 五、相关资料

1. [NProgress.js](https://ricostacruz.com/nprogress/)
2. [NProgress-github](https://github.com/rstacruz/nprogress)


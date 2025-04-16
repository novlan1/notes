
## 一、开始

本文探讨CSS、JS的加载和执行对DOM的解析和渲染的阻塞作用，文中的代码可以在[这里](https://github.com/novlan1/js-css-block-dom)看到。

## 二、浏览器渲染流程

浏览器是解析 DOM 生成 `DOM Tree`，结合 CSS 生成的 `CSS Tree`，最终组成 `render tree`，再渲染页面。


<img src="http://doc.uwayfly.com/dom_render_process2.png" width="700">

- 第一步，用 HTML 分析器，分析 HTML 元素，构建一颗 DOM 树(标记化和树构建)。
- 第二步，用 CSS 分析器，分析CSS文件和元素上的 `inline` 样式，生成页面的样式表。
- 第三步，将 DOM 树和样式表，关联起来，构建一颗`Render`树(这一过程又称为`Attachment`)。每个 DOM 节点都有 `attach` 方法，接受样式信息，返回一个 `render`对象(又名`renderer`)。这些 `render`对象最终会被构建成一颗`Render`树。
- 第四步，有了`Render`树，浏览器开始布局，为每个`Render`树上的节点确定一个在显示屏上出现的精确坐标。
- 第五步，`Render`树和节点显示坐标都有了，就调用每个节点 `paint` 方法，把它们绘制出来。 



要了解JS和CSS是否阻塞DOM的解析和渲染，关键其实是找到一个好的、合适的测试用例。

## 二、CSS相关


### 1. 简单例子


对于CSS是否阻塞DOM的解析，可以用下面的文件测试：


```html
<!-- test.html -->
<head>
  <style>
    div {
      width: 100px;
      height: 100px;
      background: lightgreen;
    }
  </style>
  <link rel="stylesheet" href="/css/sleep3000-common.css">
  <script defer src="/js/logDiv.js"></script>
</head>

<body>
  <div></div>
</body>
```

其中 `logDiv.js` 文件如下，就是打印下 `document` 中的 `div` 元素。


```js
const div = document.querySelector('div');
console.log(div);
```

这里用了 `defer` 属性，也就是该脚本将在文档完成解析后，触发 `DOMContentLoaded` 事件前执行。之所以这样设置就是保证JS文件位置不受影响，只要文档解析完成，这里是 `div` 有了，就去执行。也就是如果打印成功，就证明DOM解析完成。



`common.css` 文件如下，这个文件会在3秒后才会返回。`sleep${time}` 的文件表示这个文件的加载时间是 `time`。

```css
div {
  background: lightblue;
}
```

可以看到控制台先打印出了 `div` 元素，过3秒后生成一个 `lightblue` 颜色的 `div`，并显示在浏览器上。

控制台立即打印出了 `div` 元素，说明 CSS 并没有影响 DOM 的解析。另外，一开始页面并没有渲染出内容，直到3秒后，才有内容，说明 CSS 影响了 DOM 的渲染。

原因是因为 DOM 解析不需要 CSS 参与，所以 CSS 加载不会阻塞 DOM 解析。而 DOM 渲染需要 CSS 参与，如果 CSS 加载不阻塞 DOM 渲染的话，那么浏览器渲染完成后的内容很可能会被新加载的 CSS 文件改变，这样用户体验差（之前的内容一闪而过），而且会增加一次额外的渲染，尤其是现在网速快，CSS加载速度快，对比更加明显。

注意，上面只是讨论的 `link` 标签中的CSS，也就是外链CSS的加载。对于页面内的 `style` 标签中的CSS的解析执行，其实是一样的，也会阻塞DOM的渲染，不会阻塞DOM的解析。


### 2. 复杂例子

下面是一个比较复杂的例子，可以查看CSS文件和JS文件的下载顺序，以及CSS加载是否阻塞JS的下载和执行。

```html
<!-- test12.html -->
<head>
  <style>
    div {
      width: 100px;
      height: 100px;
      background: lightgreen;
    }
  </style>
</head>
<body>
  <div></div>
  <link rel="stylesheet" href="/css/sleep3000-common.css">
  <link rel="stylesheet" href="/css/sleep3000-common2.css">
  <script src="/js/logDiv.js"></script>
  <script src="/js/sleep5000-logDiv.js"></script>
  <div></div>
</body>
```

页面先渲染出1个 `lightgreen` 颜色的 `div`，然后3秒后该 `div` 颜色变成 `lightblue`，之后打印出 `div`，接着2秒后出现另一个 `lightblue` 的 `div`。

结合开发者工具，可以看到：

1. CSS/JS文件是并行下载的

2. CSS的下载会阻塞后面JS的执行

3. CSS的下载不会阻塞后面JS的下载，但是JS下载完成后，被阻塞执行

<img src="http://doc.uwayfly.com/browser-render.png" width="800">


## 三、JS相关

### 1. JS执行是否阻塞DOM的解析

JS执行可分为内联脚本的执行和外链脚本的执行。

#### （1）外链脚本的执行（一）

对于外链脚本的执行是否阻塞DOM的解析，可以用下面的文件测试：

```html
<!-- test2.html -->
<head>
  <style>
    div {
      width: 100px;
      height: 100px;
      background: lightgreen;
    }
  </style>
  <script src="/js/block.js"></script>
</head>

<body>
  <div></div>
</body>
```

`block.js` 文件如下，其实就是执行无意义的、耗时的循环（完全可以去掉，只是让效果更明显），然后尝试打印 `div`，如果 `div` 可以找到就说明并没有阻塞DOM解析：

```js
const arr = [];
for (let i = 0; i < 100000000; i++) {
  arr.push(i);
  arr.splice(i % 3, i % 7, i % 5);
}
const div = document.querySelector('div');
console.log(div);
```

打开控制台，发现浏览器等待JS执行完成，然后控制台打印出 `null`，然后浏览器渲染出一个 `lightgreen` 的 `div` 元素。

控制台打印出 `null` 说明外链脚本的执行阻塞DOM的解析，也就会阻塞DOM的渲染。

#### （2）外链脚本的执行（二）

浏览器遇到 `script` 标签时，会触发页面渲染。也就是**外链脚本只会阻塞其后面的DOM的解析和渲染**。

下面的例子中会先渲染出“第一部分”，然后过几秒钟，加载并执行完JS文件后，再渲染出“第二部分”。

```html
<!-- test8.html -->
<body>
  <div style="color: red">
    第一部分
  </div>
  <!-- <script src="/js/sleep3000-empty.js"></script> -->
  <!-- 或者 -->
  <script src="/js/block.js"></script>
  <div>
    第二部分
  </div>
</body>
```

#### （3）内联脚本执行

下面是另外一个例子，测试的是内联脚本是否阻塞DOM解析和渲染：

```html
<!-- test7.html -->
<body>
  <div style="color: red">
    第一部分
  </div>
  <script>
    const div = document.querySelector('div')
    console.log(div.style.red)
  </script>
  <script type="text/javascript">
    // 循环5秒钟
    var n = Number(new Date());
    var n2 = Number(new Date());
    while ((n2 - n) < (6 * 1000)) {
      n2 = Number(new Date());
    }
  </script>

  <div>
    第二部分
  </div>

</body>
```

发现一开始页面没有任何内容，控制台打印为`undefined`，过几秒后，浏览器同时渲染出两个 `div`。

也就是再次说明了JS的执行会阻塞DOM的解析和渲染。

### 2. JS下载是否阻塞DOM的解析

上面讨论的是JS的执行，对于JS下载是否阻塞DOM的解析，可以用下面的文件测试：

```html
<!-- test3.html -->
<head>
  <style>
    div {
      width: 100px;
      height: 100px;
      background: lightgreen;
    }
  </style>
  <script src="/js/sleep3000-empty.js"></script>
  <script src="/js/logDiv.js"></script>
</head>

<body>
  <div></div>
</body>
```

`logDiv.js` 文件与上面相同，`empty.js` 内容为空，加载它只是为了测试JS的下载是否会阻塞DOM的解析。


打开控制台，发现结果与上面一致，也是等待3秒后控制台打印出 `null`，然后浏览器渲染出一个 `lightgreen` 的 `div` 元素。也就说明了JS的下载也会阻塞DOM的解析和渲染。也就是如果JS文件不带 `defer/async` 属性，那么就会立刻下载并执行，那么DOM的解析和渲染就会暂停。

JS对DOM解析和渲染的阻塞是因为，加载的JS中很有可能有代码直接改变了DOM树结构，比如使用 `document.write` 或 `appendChild`，甚至是直接使用的 `location.href` 进行跳转。这些操作会对DOM树产生影响，如果不阻塞，等浏览器解析完标签生成DOM树后，JS修改了某些节点，那么浏览器又需要重新解析，然后生成DOM树，性能会变差。

### 3. 复杂例子

看下面这个例子，猜一下会发生什么。

```html
<!-- test4.html -->
<head>
  <style>
    div {
      width: 100px;
      height: 100px;
      background: lightgreen;
    }
  </style>
</head>

<body>
  <div></div>
  <script src="/js/sleep3000-logDiv.js"></script>
  <style>
    div {
      background: lightgrey;
    }
  </style>
  <script src="/js/sleep5000-logDiv.js"></script>
  <link rel="stylesheet" href="/css/common.css">
</body>
```

结果是，浏览器先渲染一个 `lightgreen` 的 `div`，然后等待3秒后打印出 `div`，之后 `div` 变成 `lightgrey` 颜色，接着等待2秒后再次打印出 `div`，接着 div 变成 `lightblue` 颜色。

这个例子可以证明，JS阻塞浏览器的渲染和执行，以及说明CSS对DOM解析的阻塞，只是针对在它位置之后的元素。


另外，这个项目可以测试`defer/async`的运行机制，以及浏览器对同一域名的并发请求数量（Chrome是6个）。



## 四、总结

CSS加载会阻塞后续DOM的渲染，内联脚本执行会阻塞整个DOM的解析和渲染，外链JS的下载和执行会阻塞后续DOM的解析和渲染。

为了不阻塞页面，工程上的启发有：

- 将CSS文件放在 head 中
- 尽量合并脚本减少 script 的出现
- 尽量使用外联脚本并将脚本放置在 body 底部
- 内嵌脚本放置在`window.onload`中执行
- 使用延迟脚本和异步脚本


## 五、参考资料

1. [原来 CSS 与 JS 是这样阻塞 DOM 解析和渲染的](https://juejin.cn/post/6844903497599549453)
2. [JS以及CSS对页面的阻塞](https://www.cnblogs.com/heshan1992/p/7029431.html)


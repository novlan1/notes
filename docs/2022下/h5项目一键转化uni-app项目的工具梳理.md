## 1. 背景

h5项目要转为uni-app项目可以参考这篇[文章](https://ask.dcloud.net.cn/article/36174)，我们在实际处理过程中，开发了一系列工具，比如Eslint插件、nodejs脚本、Webpack loader、Webpack plugin等。这些工具特点不同，工作阶段不同，本篇文章旨在理清这些工具的差异和特点。


## 2. 不同工具的作用阶段

一个普通的h5项目，从开发到上线运行会经过这些阶段：

```
源代码 => 编译 => 打包产物 => 浏览器运行
```

h5项目转为uni-app项目会比上面多一步：


```
h5源代码 => uni-app代码 => 编译 => 打包产物 => 浏览器运行
```

- Eslint插件，作用阶段为源代码开发阶段，包括h5源代码或者uni-app代码，主要是一些语法的转换
- 转换工具，本质是nodejs脚本，作用在h5源代码转为uni-app代码阶段，包括pages.json的生成、小程序main.js的生成等
- Webpack-loader，作用在编译阶段，为uni-app代码编译成打包产物的阶段
- Webpack-plugin，与上类似，但是功能更全面
- 运行时的代理，作用在运行时



## 3. Eslint插件和Webpack loader

Eslint插件和Webpack loader内容有些重叠，有些功能既可以用Eslint插件实现，也可以用Webpack loader实现，这时候怎么区分呢？

假设对于一个问题或功能，有A、B两种实现方式，有下面几种情况：

1. 小程序只支持A，H5都可以支持，并且A、B两种方式对产品性能等指标没有影响
2. 小程序只支持A，H5都可以支持，但是在H5上，B比A性能更佳
3. 小程序只支持A，H5只支持B
4. 小程序都可以支持，H5只支持B（基本不存在）
5. 小程序和H5都可以支持


下面我们分析下各种情况。

- 第1种情况，应该用Eslint插件将B语法转为A。比如vue模板中`:childId="+childId"`和`:childId="parseInt(childId, 10)"`，这两种写法对性能几乎没影响。

- 第2种情况，不应该用Eslint插件，因为会损失h5上的性能。比如动态加载组件，h5上是需要的，并且有一定性能提升。

- 第3、4种情况，无法用Eslint插件，只能用Webpack loader或其他方式

- 第5种情况，不用处理


## 4. 尽早执行

对于跨平台项目，对代码的改造应该越早越好，也就是说能用Eslint插件解决的，尽量不用转换工具、Webpack loader，能用转换工具解决的，尽量不用Webpack loader。

因为越往后，改动成本越高，越容易出错。并且Webpack loader并不是透明的，多个loader会相互影响，很容易引起一些bug。

## 5. 不同工具功能梳理

这里占个位，后面有空再整理。

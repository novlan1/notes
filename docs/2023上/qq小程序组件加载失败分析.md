## 1. 问题

qq小程序（基于uni-app）使用JS分发和组件分发插件后，有些页面会白屏，打开调试器，会看到下面的报错：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/5/own_mike_a0f5dfd42aa98ffea0.jpg" width="500">

意思是找不到这个页面，然后列举了一系列的有效的组件。

这个问题只在qq小程序的真机上出现，在qq小程序开发者工具、微信小程序都没有。

## 2. 原因

找了一圈原因，最后发现是执行顺序不同导致的原因。qq小程序真机上，并不是先运行`Page`页面，而是先执行每个组件，或者说校验每个合理的组件，而其他环境，都是先执行`Page`下的`js`。

`Page`下的`js`会加载此分包下的`vendor.js`，也就是每个页面下的`js`第一句都是下面的代码：

```js
require('./common/vendor.js');(global["webpackJsonp"]=global["webpackJsonp"]||[]).push()
```

这会加载分包中的`module`，注册一些`moduleId`。而`qq`小程序真机环境先执行了组件，此时如果某些`moduleId`还没注册的话，就会报错。

## 3. 实验

我们检验一下这个结论，在组件和页面对应的JS中分别打印一句话，看看执行顺序。

在qq小程序真机下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/5/own_mike_5c035aeb5615e7ef18.jpeg" width="500">

在qq小程序开发者工具下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/5/own_mike_e92cb7473fdd00a4a7.jpeg" width="500">

上面的`create page`对应页面，`press switch`对应组件，可以看到`qq`小程序真机与开发者工具，对组件和页面的加载顺序确实不同。


## 4. 解决

如何解决这个问题呢？既然组件需要这个`moduleId`，那就提前加载好就可以了。这里写了个插件，自动引入分包所在的`vendor`。


会不会有副作用呢？不会的，这里要了解下`webpack`运行时原理。`vendor.js`只是往`global["webpackJsonp"]`中`push`了一些`module`，`push`方法被`hook`了，本质是会缓存一些`moduleId`。


另外，那些并非插件移动的组件为什么没问题呢，因为它们和`Page`下的`js`一样，第一句都引用了分包中的`vendor.js`。


## 5. 后记

虽然是个小问题，定位却花了不少时间，因为微信小程序没问题，所以没往执行顺序不同那方面想，期间猜想问题原因可能是`moduleId`找错了之类的。

----

## 2024.8.15 更新

用了插件后，还是出现白屏。

问题原因：uni-app 问题，QQ小程序打包 `vendor` 时模块划分有问题，把应该放到主包的模块放到了分包中。

解决方法：需要确定被划分错的是哪个模块，比如最近一次的模块是 `@tencent/pmd-tools/lib/time`，当前的解决方法是把它放到 `main.js` 中。


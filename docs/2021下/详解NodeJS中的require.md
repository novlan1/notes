## 一、开始

`require/module.exports`属于`CommonJS`规范，`import/export`属于ES6规范。我们一起来看下其中的不同。

## 二、NodeJS模块

先介绍下NodeJS中模块的相关概念。

### 1. Module

在NodeJS中，一个文件就是一个单独的模块。

CommonJS规范规定，每个模块内部，`module`变量代表当前模块。这个变量是一个对象，

在一个NodeJS模块内部打印下`module`：

```js
// console.log(module)
{
  id: '.',
  path: '/Users/mike/Documents/igame-web',
  exports: {},
  parent: null,
  filename: '/Users/mike/Documents/igame-web/test3.js',
  loaded: false,
  children: [
    Module {
      id: '/Users/mike/Documents/igame-web/test2.js',
      path: '/Users/mike/Documents/igame-web',
      exports: [Object],
      parent: [Circular *1],
      filename: '/Users/mike/Documents/igame-web/test2.js',
      loaded: true,
      children: [],
      paths: [Array]
    }
  ],
  paths: [
    '/Users/mike/Documents/igame-web/node_modules',
    '/Users/mike/Documents/node_modules',
    '/Users/mike/node_modules',
    '/Users/node_modules',
    '/node_modules'
  ]
}
```

`module`上有一些属性：
- `id`，模块的标识符
- `exports`，模块的导出对象
- `parent`，表示当前模块的父模块，当前模块是谁加载的
- `filename`，模块的绝对路径
- `loaded`，表示是否加载完成
- `children`，表示当前模块加载了哪些模块
- `paths`，表示模块的搜索路径，路径的多少取决于目录的深度，寻找第三方模块时会用到


在模块的内部，`this`指向的是当前模块的导出对象：

```js
console.log(this === module.exports); // true
console.log(this === exports); // true
```

### 2. require

#### （1）运行机制

模块的`exports`属性（即`module.exports`）是对外的接口。加载某个模块，其实是加载该模块的`module.exports`属性。

通过`require`加载模块的流程：
1. 找到需要加在的模块文件
2. 判断是否缓存过，如果没有，就读取模块文件
3. 把读取到的内容放到一个自执行函数中执行

```js
(function (exports, require, module, __filename, __dirname) {
    //模块的代码实际上在这里
});
```

4. 返回`module.exports`需要导出的内容

#### （2）支持类型

NodeJS支持三种类型的文件，`.js`、`.json`、`.node`(C++扩展二进制模块)。

模块类型分为核心模块、文件模块、第三方模块，其中核心模块是编译二进制文件，加载速度最快，比如`fs/path/http`等。

当尝试加载一个不带后缀的文件时，比如`require('./test')`，会依次尝试`test/test.js/test.json/test.node`。


#### （3）缓存

再看一下模块的缓存，缓存可以通过`require.cache`查看，其返回一个对象，`key`是文件绝对路径，`value`是`Module`对象。

```js
// console.log(require.cache)

{
  '/Users/mike/Documents/igame-web/test3.js': {
    // Module对象
  },
  '/Users/mike/Documents/igame-web/test2.js': {
    // Module对象
  }
}
```

最近遇到一个问题就是CommonJS的模块缓存机制导致的，起初想通过改变`.env.local`文件，对多个项目一起打包。由于缓存机制，新写入的环境变量，并不会被重新加载，也就导致了无法生效。

#### （4）特点

1. CommonJS加载的是一个对象（`module.exports`属性），只有脚本运行时该对象才会确定，所以CommonJS是运行时加载。
2. CommonJS输出的是一个值的拷贝，也就是说模块输出一个值后，模块内部的变化就影响不到该值。
3. CommonJS模块是同步加载，由于是运行时加载，且从写法可以看出来，没有回调或`promise.then`方法，所以是同步的。

对比一下ES6的`import`语法，ES6是编译时输出接口，输出的是值的引用，且ES6模块是异步加载，有独立的模块依赖的解析阶段。


### 3. exports和module.exports

模块的`exports`属性（即`module.exports`）是对外的接口。加载某个模块，其实是加载该模块的`module.exports`属性。

为了方便，Node为每个模块提供一个`exports`变量，指向`module.exports`。这等同在每个模块头部，有一行这样的命令：

```js
var exports = module.exports;
```

<img src="http://doc.uwayfly.com/nodejs-exports.png"  width="500">


如果对`exports`直接赋值，也就是给它一个新的引用地址，会切断其与`module.exports`的引用关系，也就会导致`require`加载不到。

```js
// a.js
// 错误，加载不到
exports = {
  a: 1
}


// 正确
exports.a = 1

// 正确
module.exports = {
  a: 1
}

// b.js
const { a } = require('./a.js')
```

## 三、babel转化

我们在用`webpack`做项目的时候，经常CommonJS和ES模块混用，这是因为`babel`做了转化，将它们都转为CommonJS。

### 1. 转化导出

ES6的导出类型有：

```js
export default 123;

export const a = 123;

const b = 3;
const c = 4;
export { b, c };
```

`babel`会把它们转化为：

```js
exports.default = 123;
exports.a = 123;
exports.b = 3;
exports.c = 4;
exports.__esModule = true;
```

就是将ES6模块内容赋值给`exports`，然后加上`__esModule`属性。

### 2. 转化导入

ES6的导入大概有这么几种：

```js
import a from './a.js';

import * as b from './b.js';

import { c } from './c.js';
```

对于第一种导入方式，本意是想倒入模块的`default`属性，所以会被转化为：

```js
const a = require('./a.js').default;
```

所以如果你使用了`babel`，想要`require`方法导入ES6模块的`default`输出，可以用上述方式。

第二种导入方式，就是导入`b.js`文件中所有输出，其实就是`exports`对象，所以会被转为：

```js
const b = require('./b.js');
```

第三种方式会被转为：

```js
const { c } = require('./c.js');
```

## 四、总结

本文重点讲解了NodeJS中的模块加载原理，和`babel`转化ESM的机制。CJS和ESM加载原理上几乎针锋相对，掌握了它们可以在开发过程中规避一些坑。

关于`babel`转化，可以自己动手试一下，看一下对其他ES6语法的转化结果。


## 五、相关资料

1. [Module 的加载实现](https://es6.ruanyifeng.com/#docs/module-loader)
2. [import、require、export、module.exports 混合使用详解](https://juejin.cn/post/6844903520865386510#heading-1)
3. [require时，exports和module.exports的区别你真的懂吗？](https://juejin.cn/post/6844903919726886920)
4. [node.js中module模块的理解](https://www.cnblogs.com/jkko123/p/10226585.html)
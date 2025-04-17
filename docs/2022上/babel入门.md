## 一、开始

最近重温了babel的相关功能，主要是一些笔记。

## 二、babel

babel的两个功能：

1. 将新版js的语法用旧版语法实现，从而在对应运行时运行，比如箭头函数、for of、扩展运算符、instanceof等
2. 为旧版运行时中打补丁(也被称为polyfill)，从而可以使用新版js中定义但在旧版运行时为提供的功能，包括三类
    - 新定义的内置对象，比如Promise
    - 原有内置对象新添加的静态方法，比如Array.from
    - 原有内置对象新添加的实例方法，比如Array.prototype.includes

对于第一个功能，babel可以借助各种插件对各种新语法进行转换，对于第二个功能，babel需要借助一个core-js来完成。


插件用于指导相关语法解析和ast处理。前者被称为Syntax Plugins，后者被称为Transform Plugins。

Syntax Plugins一般不会直接操作，会在对应Transform Plugins使用时自动启用


Transform Plugins包含以下几类

- 各个版本的ES
- Modules
- 实验性的语法
- 实现压缩
- react
- 其他，比如typescript、flow、runtime、regenerator等

@babel/preset-env是个智能预设，根据browserslist配置生成需要的插件列表。

>@babel/preset-env不会包含任何低于第 3 阶段的 JavaScript 语法提案，因为在 TC39 流程的那个阶段，无论如何它都不会被任何浏览器实现。这些将需要手动包含在内。该shippedProposals选项将包括一些浏览器已经实施的第 3 阶段提案。

看下有哪些插件列表：


TC39 Proposals(以`@babel/plugin-proposal`开头，不包含在`@babel/preset-env`以内)

- decorators
- do-expressions
- export-default-from
- export-namespace-from
- function-bind
- function-sent
- partial-application
- pipeline-operator
- throw-expressions
- record-and-tuple

ES2022

- class-properties
- class-static-block
- private-property-in-object
- syntax-top-level-await

ES2021

- logical-assignment-operators
- numeric-separator

ES2020

- export-namespace-from
- nullish-coalescing-operator
- optional-chaining
- syntax-dynamic-import
- syntax-import-meta
- syntax-bigint

ES2019

- optional-catch-binding
- json-strings

ES2018

- async-generator-functions
- dotall-regex
- named-capturing-groups-regex
- object-rest-spread
- unicode-property-regex

ES2017

- async-to-generator

ES2016

- exponentiation-operator

ES2015(都以`@babel/plugin-transform`开头)

- arrow-functions
- block-scoped-functions
- block-scoping
- classes
- computed-properties
- destructuring
- duplicate-keys
- for-of
- function-name
- instanceof
- literals
- new-target
- object-super
- parameters
- shorthand-properties
- spread
- sticky-regex
- template-literals
- typeof-symbol
- unicode-escapes
- unicode-regex

ES5

- property-mutators

ES3

- member-expression-literals
- property-literals
- reserved-words

Module Formats

- modules-amd
- modules-commonjs
- modules-systemjs
- modules-umd




## 三、polyfill

### 1. core-js

core-js是JavaScript的模块化标准库，包括了ECMAScript到最近的新api的向后兼容实现。它和babel高度集成，是babel解决新特性在浏览器中兼容问题的核心依赖。corejs是api兼容实现的提供者。


目前core-js的版本是3.x，与core-js@2相比不仅在本身的架构上有重大调整，还对babel中的一些插件有重大影响。



core-js@3放弃了对`@babel/polyfill`的支持，被`@babel/preset-env`和`@babel/runtime-corejs3`引入来进行新api的兼容处理。

由于core-js@2包的体积太大（约2M），并且有很多重复的文件被引用。所以，core-js@3对包进行拆分，其中两个核心的包分别是：

- core-js：污染全局的polyfill包，供`@babel/preset-env`引入，等价于`core-js@2/modules`；
- core-js-pure：不污染全局的runtime包，供`@babel/runtime-corejs3`引入，等价于`core-js@2/library`。

`core-js@2`分支已经冻结，不会再添加新特性，新特性都会添加到core-js@3。例如你使用了`Array.prototype.flat()`，如果你使用的是core-js@2，那么其不包含此新特性。


### 2. @babel/preset-env

@babel/preset-env​主要的作用是用来转换那些已经被正式纳入TC39中的语法，并且可以依赖core-js在全局和构造函数静态属性、实例属性上添加 api 的方式来解决 api 兼容性问题，所以需要事先安装core-js。当设置了useBuiltIns选项（不为false）时，就会使用core-js来对api进行处理。

useBuiltIns是babel7的新功能，这个配置提供了三个选项告诉babel该如何引入polyfill包：

#### 2.1 usage

代码中不用主动import，babel会自动将代码里已使用到的且`browserslist`环境不支持的`polyfill`导入。

编译前：

```js
const result = [1, 2, 3, 4, 5].copyWithin(0, 3)

const instance = newPromise((resolve, reject) => {
  resolve(123)
})
```

编译后：

```js
"use strict";

require("core-js/modules/es.array.copy-within.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.promise.js");

var result = [1, 2, 3, 4, 5].copyWithin(0, 3);
var instance = newPromise(function (resolve, reject) {
  resolve(123);
});
```

#### 2.2 entry

需要在代码运行之前导入，会将`browserslist`环境不支持的所有`polyfill`都导入。

编译前：

```js
import"core-js/stable";
import"regenerator-runtime/runtime";

const result = [1, 2, 3, 4, 5].copyWithin(0, 3)

const instance = newPromise((resolve, reject) => {
  resolve(123)
})
```

编译后：

```js
"use strict";

require("core-js/modules/es.symbol.js");

// ...

require("regenerator-runtime/runtime");

var result = [1, 2, 3, 4, 5].copyWithin(0, 3);
var instance = newPromise(function (resolve, reject) {
  resolve(123);
});
```

#### 2.3 false

只做了语法转换，不会导入任何`polyfill`进来，并且`corejs`配置将无效。

编译前：

```js
const result = [1, 2, 3, 4, 5].copyWithin(0, 3)

const instance = newPromise((resolve, reject) => {
    resolve(123)
})

const shen = result?.a
```

编译后：

```js
"use strict";

var result = [1, 2, 3, 4, 5].copyWithin(0, 3);
var instance = newPromise(function (resolve, reject) {
  resolve(123);
});
var shen = result === null || result === void0 ? void0 : result.a;
```



### 3. runtime

在使用@babel/preset-env提供的语法转换和api添加的功能时，会造成文件的体积增加以及api的全局污染。为了解决这类问题，引入了runtime的概念，runtime的核心思想是**以引入替换的方式来解决兼容性问题**。

runtime包有三个：

- @babel/runtime
- @babel/runtime-corejs2
- @babel/runtime-corejs3

三个包都依赖`helpers`、`regenerator-runtime`模块来实现语法的替换，helpers中提供了一些语法模拟的函数，regenerator-runtime中实现了async/await语法的转换。

只有在@babel/preset-env的帮助下，runtime包的语法模拟替换功能才会发挥作用。

三个包不同的区别是：

- @babel/runtime只能处理语法替换;
- @babel/runtime-corejs2相比较@babel/runtime增加了core-js@2来支持全局构造函数和静态方法兼容;
- @babel/runtime-corejs3相比较@babel/runtime-corejs2支持了实例方法的兼容，同时还支持对ECMAScript提案的api进行模拟。


@babel/runtime-corejs@2只支持全局变量（例如Promise）和静态方法（例如Array.from）兼容，而`@babel/runtime-corejs@3`在`@babel/runtime-corejs@2`的基础上还支持实例方法（例如`[].flat()`）兼容。

具体看看@babel/runtime-corejs2和@babel/runtime-corejs3的区别：

@babel/runtime-corejs2会从core-js中的library模块去加载对应的runtime代码：

```js
// runtime-corejs2/core-js/array/from.js
module.exports = require("core-js/library/fn/array/from")
```
@babel/runtime-corejs3会从core-js-pure这个包中去加载对应的runtime代码：

```js
// runtime-corejs3/core-js/array/from.js
module.exports = require("core-js-pure/features/array/from")
```

对于数组的includes方法，@babel/runtime-corejs3提供了模拟api，而@babel/runtime-corejs2没有：

```js
var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes"))

(0, _includes.default)(_context = [1, 2, [3, 4]]).call(_context)
```

甚至，如果我们想在一个不支持Promise的环境下使用Promise，可以这样：

```js
// @babel/runtime-corejs2
// var _interopRequireDefault = require("@babel/runtime-corejs2/helpers/interopRequireDefault");
// var _promise = _interopRequireDefault(require("@babel/runtime-corejs2/core-js/promise"));

// @babel/runtime-corejs3
var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");
var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var instance = new _promise["default"](function (resolve, reject) {
  resolve(123);
});
```

### 4. @babel/plugin-transform-runtime

@babel/plugin-transform-runtime可以通过ast的分析，自动识别并替换代码中的新api，解决手动require的烦恼。

```js
{
  "presets": [
    [
      "@babel/preset-env"
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": 3
      }
    ]
  ]
}
```

| 选用corejs的版本 | Install command                           |
| ---------------- | ----------------------------------------- |
| false            | npm install --save @babel/runtime         |
| 2                | npm install --save @babel/runtime-corejs2 |
| 3                | npm install --save @babel/runtime-corejs3 |

corejs选项来配置使用的是@babel/runtime-corejs2还是@babel/runtime-corejs3。

使用@babel/runtime-corejs3可以模拟数组上的copyWithin等方法，而@babel/runtime-corejs2则不能。


### 5. babel处理兼容性方案

目前，babel处理兼容性问题有两种方案：

- @babel/preset-env + corejs@3，可称为polyfill方案；
- @babel/preset-env + @babel/runtime-corejs3 + @babel/plugin-transform-runtime，可称为runtime方案。

两种方案一个依赖核心包core-js，一个依赖核心包core-js-pure，两种方案各有优缺点：

- polyfill方案很明显的缺点就是会造成全局污染，而且会注入冗余的工具代码；优点是可以根据浏览器对新特性的支持度来选择性的进行兼容性处理；
- runtime方案不能根据浏览器对新特性的支持度来选择性的进行兼容性处理，也就是说只要在代码中识别到的api，并且该api也存在core-js-pure包中，就会自动替换，这样一来就会造成一些不必要的转换，从而增加代码体积。

所以，polyfill方案比较适合单独运行的业务项目，第三方工具库用runtime方案比较好，不会影响使用者的运行环境。




## 四、ECMA

ECMA（European Computer Manufacturers Association，欧洲计算机制造商协会），这是一个国际组织，主要负责维护各种计算机的相关标准。JavaScript这门语言最早来自于网景（Netscape），但网景在和微软（IE）的竞争落得下风，为了避免最终Web脚本主导权落入微软手中，网景开始寻求ECMA组织的帮助，来推动JavaScript的标准化。

在1996年，JavaScript正式加入了ECMA大家庭。次年，ECMA 发布 262 号标准文件（ECMA-262）的第一版，规定了浏览器脚本语言的标准，并将这种语言称为 ECMAScript。

ECMAScript 和 JavaScript 的关系是，前者是后者的规格，后者是前者的一种实现。

### 1. TC39

TC39则是ECMA为ES专门组织的技术委员会（Technical Committee），39这个数字则是因为ECMA使用数字来标记旗下的技术委员会。TC39的成员由各个主流浏览器厂商的代表构成。

对于一个提案从提出到最后被纳入ES新特性，TC39的规范中有五步要走：

- stage0（strawman 稻草人）
    - 任何TC39的成员都可以提交，代表目前仅仅是一个想法。
- stage1（proposal 提案）
    - 当想法变成提案，就需要进入阶段 1，面向委员会讲解和介绍，需要概述解决方案，并且提出一些潜在的困难。委员会可能会接受提案，但并不代表就要在浏览器中生效。它仅仅是委员会觉得这是一个值得讨论的议题且愿意继续讨论。
- stage2（draft 草稿）
    - 进入这一阶段的讨论会更加严肃，需要讨论具体的语法和语义的细节。需要提供具体的解决方案，如何在语言中实现它，就像一个具体的 API 的实现。
- state3（candidate 候选）
    - 这个阶段设计的工作已经结束，需要接受来自具体实现者和用户们的反馈。这个阶段也会有不同的 JavaScript 引擎来实现新特性。
- state4（finished 结束）
    - 一旦这个特性被添加进至少两个 JavaScript 实现并且通过具体的测试，代表着可以被大家使用了，提案的标准和规范也会进入到主要的标准规范中，会制定测试去保证未来的实现都会包含这项特性，也会添加参考文档。

### 2. ECMAScript 2015 (ES6) 版本发布问题

ECMAScript的最新版本ES6很大，并且在ES5之后近6年才标准化（2009年12月与2015年6月）。发布之间的时间过长有两个主要问题：

- 比发布更早准备好的功能必须等到发布完成。
- 需要很长时间才能完成的功能面临着完成的压力，因为将它们推迟到下一个版本将意味着漫长的等待。此类功能也可能会延迟发布。

因此，从 ECMAScript 2016 (ES7) 开始，发布的频率会更高，因此会更小。每年将发布一个版本，它将包含在年度截止日期前完成的所有功能。


从[这里](https://github.com/tc39/proposals/blob/main/finished-proposals.md)可以看到2016年及以后通过的提案。




## 五、配置

下面看几个仓库的babel配置。

### 1. @vue/babel-preset-app

```js
 const {
    polyfills: userPolyfills,
    loose = false,
    debug = false,
    useBuiltIns = 'usage',
    modules = false,
    bugfixes = true,
    targets: rawTargets,
    spec,
    ignoreBrowserslistConfig,
    configPath,
    include,
    exclude,
    shippedProposals,
    forceAllTransforms,
    decoratorsBeforeExport,
    decoratorsLegacy,
    entryFiles = defaultEntryFiles,
    absoluteRuntime = runtimePath,
    version = runtimeVersion
  } = options

  const envOptions = {
    bugfixes,
    corejs: useBuiltIns ? require('core-js/package.json').version : false,
    spec,
    loose,
    debug,
    modules,
    targets,
    useBuiltIns,
    ignoreBrowserslistConfig,
    configPath,
    include,
    exclude: polyfills.concat(exclude || []),
    shippedProposals,
    forceAllTransforms
  }

  // ...

  return {
    sourceType: 'unambiguous',
    overrides: [{
      exclude: [/@babel[\/|\\\\]runtime/, /core-js/],
      presets,
      plugins
    }, {
      // there are some untranspiled code in @babel/runtime
      // https://github.com/babel/babel/issues/9903
      include: [/@babel[\/|\\\\]runtime/],
      presets: [
        [require('@babel/preset-env'), envOptions]
      ]
    }]
  }
```

@vue/babel-preset-app的corejs默认配置是usage。

```js
  plugins.push(
    require('@babel/plugin-syntax-dynamic-import'),
    [require('@babel/plugin-proposal-decorators'), {
      decoratorsBeforeExport,
      legacy: decoratorsLegacy !== false
    }],
    [require('@babel/plugin-proposal-class-properties'), { loose }]
  )

  // transform runtime, but only for helpers
  plugins.push([require('@babel/plugin-transform-runtime'), {
    regenerator: useBuiltIns !== 'usage',

    // polyfills are injected by preset-env & polyfillsPlugin, so no need to add them again
    corejs: false,

    helpers: useBuiltIns === 'usage',
    useESModules: !process.env.VUE_CLI_BABEL_TRANSPILE_MODULES,

    absoluteRuntime,

    version
  }])
```

添加了一些插件，比如动态引用、装饰器、class属性语法等。

`@babel/plugin-transform-runtime`这个插件的corejs配置是false。当useBuiltIns不为“usage”的时候开启regenerator属性，当useBuiltIns为“usage”的时候打开了helpers函数。


### 2. tdesign-vue

```js
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: [
            'last 3 Chrome versions',
            'last 3 Firefox versions',
            'Safari >= 10',
            'Explorer >= 11',
            'Edge >= 12',
          ],
          esmodules: true,
        },
        modules: false,
      },
    ],
    '@vue/babel-preset-jsx',
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            modules: 'commonjs',
          },
        ],
        '@vue/babel-preset-jsx',
      ],
    },
    production: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
          },
        ],
        '@vue/babel-preset-jsx',
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
      ],
    },
  },
};
```


## 六、参考资料

- [The TC39 process for ECMAScript features](https://2ality.com/2015/11/tc39-process.html)
- [聊一聊进行中的TC39提案（stage1/2/3）](https://zhuanlan.zhihu.com/p/381256585)
- [Finished Proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [ECMAScript 6 简介](https://es6.ruanyifeng.com/#docs/intro)
- [十分钟揭秘 TC39: ES2020 和 ES2021](https://blog.csdn.net/ch834301/article/details/112551319)
- [babe从入门到精通](https://vvbug.blog.csdn.net/article/details/107092536)
- [core-js@3, babel展望未来](https://juejin.cn/post/6844904055005773831)
- [你所需要知道的最新的babel兼容性实现方案](https://juejin.cn/post/6976501655302832159)


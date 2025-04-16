## 一、@babel/preset-env

`preset-env`根据配置的浏览器的列表，自动加载当前浏览器所需要的插件，然后对ES语法做转换。

### 1. targets

`string | Array<string> | { [string]: string }`

描述项目所在环境，比如

```js
{
  "targets": "> 0.25%, not dead"
}
```

或者
```js
{
  "targets": {
    "chrome": "58",
    "ie": "11"
  }
}
```

`babel`中内置了[browserslist](https://github.com/browserslist/browserslist)，也可以用`.browserslistrc`配置文件配置，比如

```
> 0.25%, not dead
```

或者在`package.json`中指定：

```json
"browserslist": "> 0.25%, not dead"
```

可以用下面命令查看`> 0.25%, not dead`代表的浏览器列表：

```bash
$ npx browserslist "> 0.25%, not dead"
and_chr 94
and_ff 92
and_uc 12.12
chrome 94
chrome 93
chrome 92
chrome 91
chrome 87
edge 94
...
```


如果不指定`targets`，将会转化所有的`ES2015-ES202`语法到`ES5`。不推荐这么做，这样不能发挥`preset-env`针对性转化的作用。


### 2. loose

`boolean`，默认`false`。设为`true`的时候是会`preset`的插件开启宽松模式。`loose`模式会生成简单的ES5代码，正常模式则会尽可能遵循`ECMAScript 6`的语义，一般不建议开启。

举个例子，对于下面的代码：
```js
class Test {
    say(){}
}
```

如果开启`loose`模式，会十分接近我们的ES5写法，直接在`Test.prototype`上增加属性：

```js
var Test = /*#__PURE__*/function () {
  function Test() {}

  var _proto = Test.prototype;

  _proto.say = function say() {
    console.log('say');
  };

  return Test;
}();
```

如果未开启`loose`，会利用`Object.defineProperty`在`Test`上增加属性：

```js
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Test = /*#__PURE__*/function () {
  function Test() {
    _classCallCheck(this, Test);
  }

  _createClass(Test, [{
    key: "say",
    value: function say() {
      console.log('say');
    }
  }]);

  return Test;
}();
```

### 3. moduels

`"amd" | "umd" | "systemjs" | "commonjs" | "cjs" | "auto" | false`，默认为`"auto"`.

是否把ESM语法转为其他类型，如果是`false`就不转化。

比如对于以下代码：

```js
import { a } from './a.js'
var b = 1;
export default b;
export { a }
```

如果是`modules`是`cjs`，会转为：

```js
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "a", {
  enumerable: true,
  get: function get() {
    return _a.a;
  }
});
exports["default"] = void 0;

var _a = require("./a.js");

var b = 1;
var _default = b;
exports["default"] = _default;
```

默认情况下，`@babel/preset-env`会根据`caller data`确定是否转换ES6的模块，比如使用`babel-loader`、`@rollup/plugin-babel`时。

### 4. debug

`boolean`，默认为`false`。

开启后，会在控制台输出当前的`targets`、使用的插件列表等信息。

### 5. include/exclude

`Array<string|RegExp>`，默认为`[]`

表示增加或排除的插件列表

### 6. useBuiltIns

`"usage" | "entry" | false`，默认为`false`。

`@babel/preset-env`使用`polyfill`的配置。

什么是`polyfil`l？`polyfill`可翻译为垫片，就是为旧浏览器提供新的功能(API)。

`Babel`只转换不兼容的新语法，比如箭头函数和`class`，对于新的API，比如`Iterator`、`Generator`、`Set`、`Map`、`Proxy`、`Reflect`、`Symbol`、`Promise`、`Object.assign()`等，是不会转换的。这时候就需要`polyfill`了。


`babel`在`7.4.0`版本后弃用了`@babel/polyfill`，建议我们直接使用`core-js`，并且设置`corejs`的版本来替换`polyfill`。


#### （1）false

`useBuiltIns`为`false`的话，不对`polyfill`做操作。如果引入了`core-js`，则无视配置的浏览器兼容，引入所有的`polyfill`。

#### （2）entry

`useBuiltIns`是`entry`的话，引入浏览器不兼容的`polyfill`，需要在入口文件手动添加`import 'core-js'`，会自动根据`browserslist`替换为浏览器不兼容的`polyfill`。这里需要指定`core-js`的版本：

```json
"useBuiltIns": "entry",
"corejs": 2,
```

比如对于下面代码：

```js
import "core-js";

new Promise(() => {})
```

`babel`转化结果为：

```js
"use strict";

require("core-js/modules/es6.array.copy-within.js");
require("core-js/modules/es6.array.every.js");
// 省略很多require('core-js/modules/es6...')

new Promise(function () {}); 
```

#### （3）usage

`useBuiltIns`是`usage`的话，会根据配置的浏览器的兼容性，以及代码中用到的API来进行`polyfill`，实现了按需添加。

```json
"useBuiltIns": "usage",
"corejs": 2,
```

比如，对于以下代码：

```js
new Promise(() => {})
```

转化结果为：

```js
"use strict";

require("core-js/modules/es6.object.to-string.js");

require("core-js/modules/es6.promise.js");

new Promise(function () {}); 
```


### 7. corejs

`string or { version: string, proposals: boolean }`，默认为`"2.0"`。

执行`core-js`的版本，该选项仅在与`useBuiltIns`为`entry`或`usage`时有效。


## 二、@babel/plugin-transform-runtime

如果我们有很多需要编译的文件的时候，每个文件中都会有这些方法的定义，这样整个包就会很大，`runtime`把这些方法抽离到一个公共的地方`@babel/runtime/helpers`，所以可以让我们打包出来的源码变小。

注意安装依赖的时候，`@babel/runtime`要`--save`而不是`--save-dev`，因为它是运行时引入的，其实上面的`core-js`也是一样：

```bash
npm install --save-dev @babel/plugin-transform-runtime

npm install --save @babel/runtime
```


### 1. corejs

`false, 2, 3 or { version: 2 | 3, proposals: boolean }`，默认`false`。

指定`core-js`的版本，注意`core-js3`版本才包含`[].includes`语法。


| corejs | 安装命令                                  |
| ------ | ----------------------------------------- |
| false  | npm install --save @babel/runtime         |
| 2      | npm install --save @babel/runtime-corejs2 |
| 3      | npm install --save @babel/runtime-corejs3 |


举个例子，对于以下代码：

```js
class Test {
}
const c = [1, 2, 3].includes(1)
```

如果设置如下：

```js
{
  "presets": [
    [
      "@babel/preset-env",
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

转换结果：

```js
"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/classCallCheck"));

var _context;

var Test = function Test() {
  (0, _classCallCheck2["default"])(this, Test);
};

var c = (0, _includes["default"])(_context = [1, 2, 3]).call(_context, 1); 
```

`@babel/plugin-transform-runtime`中的`core-js`引入的是局部变量，不会污染环境，比如`_includes`。而`@babel/preset-env`中的`core-js`使用的方式是`require("core-js/modules/es7.array.includes.js")`，会污染全局变量。

如果指定了这里的`core-js`为`2`或`3`，并且`preset-env`设置了`useBuiltIns`为`usage`，那么`preset-env`的`core-js`就用不到了，因为还是使用运行时的。

### 2. helpers

`boolean`，默认`true`。

是否用外部引入的方式使用帮助函数，比如`classCallCheck`、`extends`等。

如果设置为`false`，则会在文件顶部声明这些`helper`，而不是引入外部文件。

### 3. regenerator

`boolean`，默认`true`。

是否开启添加`regenerator`函数的`polyfill`防止全局污染。

举个例子，对于以下代码：

```js
function* testGenerator() {
  yield '1';
  yield '2';
  return '3';
}
```


如果设置为`true`，转化结果为：


```js
"use strict";

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _marked = /*#__PURE__*/_regenerator["default"].mark(testGenerator);

function testGenerator() {
  return _regenerator["default"].wrap(function testGenerator$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return '1';

        case 2:
          _context.next = 4;
          return '2';

        case 4:
          return _context.abrupt("return", '3');

        case 5:
        case "end":
          return _context.stop();
      }
    }
  }, _marked);
}
```

如果设置为`false`，并且文件中使用了`generator`，会在文件顶部`require("regenerator-runtime/runtime.js")`，会造成全局污染。

## 三、配置示例

```js
// .babelrc
{
  "presets": [
    [
      "@babel/preset-env",
      {
        // "modules": "cjs",
        "useBuiltIns": "usage",
        "corejs": 2,
        // "loose": false,
        // "targets": "chrome 79",
        // "debug": true,
      }
    ],
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        // "corejs": 3,
        "helpers": false,
        "regenerator": false,
      }
    ],
  ]
}
```

## 四、系列文章

1. Babel基础
2. [Babel源码解析之@babel/core](https://juejin.cn/post/7041068341754069006/)
3. [Babel源码解析之@babel/parser](https://juejin.cn/post/7041068763566833672)
4. [Babel源码解析之@babel/traverse](https://juejin.cn/post/7041069084292677663/)
5. [Babel源码解析之@babel/generator](https://juejin.cn/post/7041069387607965710)
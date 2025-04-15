`tree-shaking`是一种性能优化方式，通过去除不会调用的代码，减小打包后文件体积。

本次`demo`测试采用`5.11`和`4.28.3`两个版本，一个是最新版本，一个是项目中采用版本。

模块定义方式有以下几种：

```js
// 一、
export const sayHello1 = () => {
  console.log('hello1');
}

// 二、注意：与三不同，由于存在变量提升，webpack在处理此类函数比较谨慎，不一定会做tree shaking
function sayHello1()  {
  console.log('hello1');
}
export default {
  sayHello1
}

// 三、
const sayHello1 = () => {
  console.log('hello1');
}
export default {
  sayHello1
}

// 四、
const exportObj = {}
exportObj.sayHello1 = () => {
  console.log('hello1');
}
export default exportObj;
```

新建四个文件`module.js`、`module2.js`、`module3.js`、`module4.js`，分别以上述四种方式定义模块，并加入以下非纯函数：

```js
function go (url) {
  window.location.href = url
}
go('123')
```

纯函数，即函数的返回结果只依赖于它的参数，并且在执行过程里面没有副作用。

`webpack.config.js`如下：

```js
const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    app: "./src/index.js"
  },
  output: {
    publicPath: __dirname + "/dist/",
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js"
  }
}
```

测试结果，其中`yes`代表可以实现`tree-shaking`，`no`代表不可以实现`tree-shaking`

```js
// 一、yes
import { sayHello1 } from './module';
sayHello1()

// 二、no
import * as obj from './module'
const { sayHello1 } = obj;
sayHello1();

// 三、yes
import * as obj from './module2'
obj.sayHello1();

//  四、no
import obj from  './module3'
const { sayHello1 } = obj;
sayHello1()

//  五、no
import obj from  './module4'
const { sayHello1 } = obj;
sayHello1();

// 六、yes
import * as obj from './module'
obj.sayHello1();

// 七、yes
import * as obj from './module2'
obj.sayHello1();

// 八、yes
import obj from  './module3'
obj.sayHello1()

//  九、
// 5.11 => 无副作用代码时yes，有副作用代码时no
// 4.28.3 => no
import obj from  './module4'
obj.sayHello1();
```

结论：第四种方式是最差的，其他几种几乎都可以实现tree-shaking。

Demo地址：[webpack-tree-shaking-demo](https://github.com/novlan1/webpack-tree-shaking-demo.git)


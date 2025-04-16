## 一、开始

[Rollup](https://rollupjs.org/guide/zh/) 是一个`JavaScript`模块打包器，其使用`ES6`规则进行打包，天然具有`tree-shaking`特性，且体积轻巧，打包后文件可读性高。`Vue`、`Vue Router`、`Vuex`等库均使用`Rollup`打包。

下面从一个简单的例子开始，[代码地址在这里](https://github.com/novlan1/rollup-intro)。

新建一个项目，在`src/index.js`中随便写点内容：

```js
console.log('How are you?')
```

安装`rollup`，然后执行：

```bash
rollup src/index.js -f umd -o dist/bundle.js
```

在`dist/bundle.js`中即可查看到打包后的文件。

## 二、命令行参数

下面是`rollup`常用的命令行的参数：

- `-f`。`--format`的缩写，它表示生成代码的格式，取值有`amd`、`cjs`、`system`、`esm`、`iife`、`umd`。关于打包方式的差异可以[参考这里](https://github.com/novlan1/technical-blog/issues/121)。
- `-o`。`-o`指定了输出的路径，比如上面的`dist/bundle.js`
- `-c`。指定`rollup`的配置文件。默认为`rollup.config.js`
- `-w`。监听源文件是否有改动，如果有改动，重新打包。
- `-n`。`--name`的缩写，是打包后的模块名称，同一页面的其他脚本可以访问它。也可以在配置文件的`output.name`中定义


## 三、配置文件

新建文件`rollup.config.js`：

```js
export default {
  input: ["./src/index.js"],
  output: {
    file: "./dist/bundle.js",
    format: "umd",
    name: "myBundle",
  },
  external: ["vue"],
};
```


- `input`表示入口文件的路径（老版本为`entry`，已经废弃）
- `output`表示输出文件的内容，它允许传入一个对象或一个数组，当为数组时，依次输出多个文件，它包含以下内容：
  - `output.file`：输出文件的路径（老版本为`dest`，已经废弃）
  - `output.format`：输出文件的格式
  - `output.banner`：文件头部添加的内容
  - `output.footer`：文件末尾添加的内容
- `external`打包时要排除掉的模块

## 四、插件

`Rollup`只提供了最核心的打包功能，很多其他功能需要插件实现。

### 1. [@rollup/plugin-node-resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve)

`Rollup`不识别`node_modules`的模块引入，比如`import answer from "the-answer"`，所以需要resove插件解决。

### 2. [@rollup/plugin-commonjs](https://www.npmjs.com/package/@rollup/plugin-commonjs)

rollup打包时只支持ES6的模块导入导出方式，即`export/import`，对于`CommonJS`方式导出的包，需要使用`@rollup/plugin-commonjs`解决。

### 3. [@rollup/plugin-babel](https://www.npmjs.com/package/@rollup/plugin-babel)

目前很多浏览器不完全支持ES6，所以需要将项目中的`ES6`语法转为`ES5`，这就用到了`babel`插件。

注意要同时配置`.babelrc`文件，并且安装`@babel/core`和`@babel/preset-env`插件。

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "modules": false,
      }
    ]
  ]
}
```

### 4. [@rollup/plugin-json](https://www.npmjs.com/package/@rollup/plugin-json)

使用`json`插件可以在代码中直接引用`json`文件，比如

```js
import json from '../package.json'

console.log(json.name)
```

### 5. [rollup-plugin-terser](https://www.npmjs.com/package/rollup-plugin-terser)

该插件可以压缩打包文件。


### 6. [rollup-plugin-replace](https://www.npmjs.com/package/rollup-plugin-replace)
 
该插件用来替换变量：

```js
import replace from '@rollup/plugin-replace'
// ...

plugins: [
  replace({
    preventAssignment: true,
    values: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  }),
]

// ...
```

为了防止替换过程中，将`something=false`替换成`false=false`，引发错误的问题，可以将`preventAssignment`设置为`true`。

## 五、Demo地址

这里有个简单的[例子](https://github.com/novlan1/rollup-intro)，你可以`clone`下来，然后执行`npm install`、`npm run build`查看打包结果。

该[项目](https://github.com/novlan1/rollup-intro)中还包含了一些自定义[插件](https://rollupjs.org/guide/en/#plugin-development)。


## 六、Rollup原理

`Rollup`分为`build`（构建）阶段和`output generate`（输出生成）阶段。主要过程如下：
- 获取入口文件的内容，包装成`module`，生成抽象语法树
- 对入口文件抽象语法树进行依赖解析
- 生成最终代码
- 写入目标文件

<img src="http://doc.uwayfly.com/rollup-code-structure.png" width="800">


## 七、Rollup与Webpack

`Rollup`优势：
- 基于`ES6`，支持`tree shaking`
- 冗余代码少，执行快
- 打包结果依然完全可读

`Rollup`缺陷：
- 不支持热更新
- 对于`commonjs`模块，需要用插件读成`ES6`代码后再处理
- `umd`和`iife`格式无法对公共代码进行拆分，因为自执行函数会把所有的模块都放到一个函数中，并没有像`webpack`一样有一些引导代码，所以没有办法做到代码拆分


## 八、相关资料

1. [Rollup文档](https://rollupjs.org/guide/en/)
2. [文章中的例子](https://github.com/novlan1/rollup-intro)
3. [一文带你快速上手Rollup](https://juejin.cn/post/6869551115420041229)
4. [Rollup使用](https://www.jianshu.com/p/f9db553849f2)
5. [从0到1解读rollup Plugin](https://juejin.cn/post/7023934469568462878)
6. [rollup实践系列之从0到1手写rollup](https://juejin.cn/post/6970657641559392269)
7. [从rollup初版源码学习打包原理](https://juejin.cn/post/6898865993289105415)
8. [estree](https://github.com/estree/estree)
9.  [原来rollup这么简单之rollup.rollup篇](https://juejin.cn/post/6844904094377705480)
10. [使用 Acorn 来解析 JavaScript](https://juejin.cn/post/6844903450287800327)


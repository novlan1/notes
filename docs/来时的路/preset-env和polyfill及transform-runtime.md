
## 1. @babel/preset-env

### 1.1. 参数

####  1.1.1. `target` - 设置支持的运行环境

```ts
{ [string]: number | string }, 默认为 {}。
```

#### 1.1.2. `modules` - 将ES6模块语法转换为另一种模块类型

```ts
"amd" | "umd" | "systemjs" | "commonjs" | false， 默认为 "commonjs".
```

将其设置为 false 就不会转换模块。

#### 1.1.3. `debug` - 输出插件等信息

`boolean`， 默认为 `false`。

将使用的目标浏览器/插件和在 数据插件版本 中指定的版本用 `console.log` 输出。

#### 1.1.4. `useBuiltIns`

它有三个值可以选

##### 1.1.4.1. `entry`

这是一种入口导入方式, 只要我们在打包配置入口 或者 文件入口写入 `import "core-js"` 这样一串代码， `babel` 就会替我们根据当前你所配置的目标浏览器(`browserslist`)来引入所需要的`polyfill` 。

像这样， 我们在 index.js 文件中加入试一下core-js

```js
// src/index.js
import "core-js";

function test() {
  new Promise()
}
test()

const arr = [1,2,3,4].map(item => item * item)
console.log(arr)
```

babel配置如下

```js
[
  "presets": [
    ["@babel/preset-env",
      {
        "useBuiltIns": "entry"
      }
    ]
  ]
}
```

##### 1.1.4.2. useage

这个就比较神奇了， useBuiltIns = useage 时，会参考目标浏览器（browserslist） 和 代码中所使用到的特性来按需加入 polyfill

当然， 使用 useBuiltIns = useage, 还需要填写另一个参数 corejs 的版本号，

core-js 支持两个版本， 2 或 3， 很多新特性已经不会加入到 2 里面了， 比如: flat 等等最新的方法， 2 这个版本里面都是没有的， 所以建议大家用3

此时的 .babelrc

```json
{
  "presets": [
    ["@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ]
}
```

##### 1.1.4.3. false

剩下最后一个 `useBuiltIns = false` , 那就简单了， 这也是默认值， 使用这个值时不引入 `polyfill`

## 2. 为什么要集成babel-polyfill?

Babel默认只转换新的JavaScript句法（`syntax`），如箭头函数、`const`、`class`、扩展运算符，而不转换新的API，比如`Iterator`、`Generator`、`Set`、`Maps`、`Proxy`、`Reflect`、`Symbol`、`Promise`等全局对象，以及一些定义在全局对象上的方法（比如`Object.assign`）都不会转码。

举例来说，ES6在Array对象上新增了`Array.from`方法。Babel就不会转码这个方法。如果想让这个方法运行，必须使用`babel-polyfill`，为当前环境提供一个垫片。

## 3. `@babel/plugin-transform-runtime`

这是一个`babel`插件，使用这个插件的同时，必须同时安装`@babel/runtime`这个包，而且必须是安装在`dependencies`里面，而非`devDependencies`里面。

1. 将`preset-env`所产生的`helpers`函数提出到一个独立文件中，从而减少代码量
2. 建立运行时沙盒，避免像`babel-polyfill`一样，修改全局对象，造成全局污染

### 3.1. 配置

- `corejs`

配置版本，传入`corejs`的值和同时安装的`@babel/runtime`包是不一致的，你需要手动安装。例如，你传入2则需要手动安装`@babel/runtime-corejs2`，传入3则需要手动安装`@babel/runtime-corejs3`，并且，这三个包只安装对应的一个就好，它们是互斥的。

- `helpers`

是否要将所有`helper`函数提炼到另外一个公共文件中。默认为`true`。

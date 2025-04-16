## 一、开始

在用`webpack`做项目的过程中，可以在项目代码中使用`process.env.NODE_ENV`，根据开发环境和生产环境的不同做不同的逻辑。于是想到`webpack`是如何把`process.env.NODE_ENV`替换的呢？

对`webpack`打包原理不熟悉的同学，可以看一下[这篇文章](https://juejin.cn/post/7039916456514945037)。

简单来说，`webpack`是利用了`DeinePlugin`来给源代码做变量替换，`process.env.NODE_ENV`是其中一个，`webpack`为此设置了默认值，另外在`optimization`配置中设置`nodeEnv`可以覆盖此默认值。

## 二、[DeinePlugin](https://webpack.docschina.org/plugins/define-plugin/)

本次分析的`webpack`版本是`v5.62.1`。

在[lib/DefinePlugin.js](https://github.com/webpack/webpack/blob/v5.62.1/lib/DefinePlugin.js#L255)中定义了[DefinePlugin](https://webpack.docschina.org/plugins/define-plugin/)，这个插件的使用方式如下：

```js
new webpack.DefinePlugin({
  PRODUCTION: JSON.stringify(true),
  VERSION: JSON.stringify('5fa3b9'),
  BROWSER_SUPPORTS_HTML5: true,
  TWO: '1+1',
  'typeof window': JSON.stringify('object'),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
});
```

`DefinePlugin`的定义如下：

```js
class DefinePlugin {
  constructor(definitions) {
    this.definitions = definitions;
  }

  apply(compiler) {
    const definitions = this.definitions;
    compiler.hooks.compilation.tap(
      "DefinePlugin",
      (compilation, { normalModuleFactory }) => {

        const handler = parser => { 
          const walkDefinitions = (definitions, prefix) => {
            Object.keys(definitions).forEach(key => {
              const code = definitions[key];
              if (
                code &&
                typeof code === "object" &&
                !(code instanceof RuntimeValue) &&
                !(code instanceof RegExp)
              ) {
                walkDefinitions(code, prefix + key + ".");
                applyObjectDefine(prefix + key, code);
                return;
              }
              applyDefineKey(prefix, key);
              applyDefine(prefix + key, code);
            });
          };

          const applyDefine = (key, code) => {
            const originalKey = key;
            const isTypeof = /^typeof\s+/.test(key);
            if (isTypeof) key = key.replace(/^typeof\s+/, "");
            let recurse = false;
            let recurseTypeof = false;
            if (!isTypeof) {
              parser.hooks.canRename.for(key).tap("DefinePlugin", () => {
                addValueDependency(originalKey);
                return true;
              });
              parser.hooks.evaluateIdentifier
                .for(key)
                .tap("DefinePlugin", expr => {
                  if (recurse) return;
                  addValueDependency(originalKey);
                  recurse = true;
                  const res = parser.evaluate(
                    toCode(
                      code,
                      parser,
                      compilation.valueCacheVersions,
                      key,
                      runtimeTemplate,
                      null
                    )
                  );
                  recurse = false;
                  res.setRange(expr.range);
                  return res;
                });
              parser.hooks.expression.for(key).tap("DefinePlugin", expr => {/**/});
            }
            parser.hooks.evaluateTypeof.for(key).tap("DefinePlugin", expr => {/**/});
            parser.hooks.typeof.for(key).tap("DefinePlugin", expr => {/**/});
          };

          walkDefinitions(definitions, "");
        }

        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("DefinePlugin", handler);
        normalModuleFactory.hooks.parser
          .for("javascript/dynamic")
          .tap("DefinePlugin", handler);
        normalModuleFactory.hooks.parser
          .for("javascript/esm")
          .tap("DefinePlugin", handler);
      }
    )
  }
}
```

上面只贴了关键逻辑。

`DefinePlugin`的`apply`方法中，在`compiler.hooks.compilation`里注册了名为`DefinePlugin`插件，其回调函数中定义了`handler`，然后在`normalModuleFactory.hooks.parser`的回调中使用了这个`handler`。

在`handler`中定义了`walkDefinitions`和`applyDefine`，然后调用了`walkDefinitions`，其判断`definitions`的`key`还是对象的话会进行递归替换，然后调用了`applyDefine`。`applyDefine`在`parser.hooks`.`evaluateIdentifier/expression/evaluateTypeof`等钩子中进行了`code`的替换。

整体的调用链和执行逻辑如下：

<img src="http://doc.uwayfly.com/webpack-define-plugin.png" width="500">

## 三、WebpackOptionsApply

在[lib/webpack.js](https://github.com/webpack/webpack/blob/v5.62.1/lib/webpack.js#L61)的`createCompiler`中执行了`new WebpackOptionsApply().process()`，这个方法就是执行一些用户设置和默认设置。

```js
const WebpackOptionsApply = require("./WebpackOptionsApply");
const { applyWebpackOptionsDefaults } = require("./config/defaults");

const createCompiler = rawOptions => {
  const options = getNormalizedWebpackOptions(rawOptions);
  const compiler = new Compiler(options.context, options);
  applyWebpackOptionsDefaults(options);
  // ...
  new WebpackOptionsApply().process(options, compiler);
  return compiler
}
```

看下`WebpackOptionsApply`的`process`方法：

```js
class WebpackOptionsApply extends OptionsApply {
  process(options, compiler) {
    // ...
    if (options.optimization.nodeEnv) {
      const DefinePlugin = require("./DefinePlugin");
      new DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(options.optimization.nodeEnv)
      }).apply(compiler);
    }
  }
}
```

从上面可以看出，如果在`options.optimization`中设置了`nodeEnv`，则会新建一个`process.env.NODE_ENV`为`key`的`DefinePlugin`。

其实这个`optimization`的`nodeEnv`是有默认值的，也就是说，默认情况下，我们在业务代码中写`process.env.NODE_ENV`就会被替换。

看下`nodeEnv`的默认值，在[lib/config/defaults.js](https://github.com/webpack/webpack/blob/v5.62.1/lib/config/defaults.js#L1071)文件中：

```js
const F = (obj, prop, factory) => {
  if (obj[prop] === undefined) {
    obj[prop] = factory();
  }
};

const applyOptimizationDefaults = (
  optimization,
  { production, development, records }
) => {
  F(optimization, "nodeEnv", () => {
    if (production) return "production";
    if (development) return "development";
    return false;
  });
}

const applyWebpackOptionsDefaults = options => {
  const development = mode === "development";
  const production = mode === "production" || !mode;
  // ...
  applyOptimizationDefaults(options.optimization, {
    development,
    production,
    records: !!(options.recordsInputPath || options.recordsOutputPath)
  });
}

exports.applyWebpackOptionsDefaults = applyWebpackOptionsDefaults;
```

从上面可以看出，`nodeEnv`的默认值和`mode`有关。`mode`如果是`production`或者`development`，则`nodeEnv`和`mode`的值相同，否则`nodeEnv`为`false`。

`applyWebpackOptionsDefaults`在`createCompiler`中被调用，也就是应用了默认值。

## 四、总结

本文从一个业务中的疑惑出发，简单介绍了`DeinePlugin`和`WebpackOptionsApply`的相关逻辑，可以看到变量替换还是嵌套在`webpack`的插件系统中，插件系统果然是`webpack`的灵魂。

## 五、相关资料

1. [深入Webpack打包原理](https://juejin.cn/post/7039916456514945037)
2. [DefinePlugin](https://webpack.docschina.org/plugins/define-plugin/)
3. [optimization.nodeEnv](https://webpack.docschina.org/configuration/optimization/#optimizationnodeenv)



## 一、开始

[webpack-chain](https://github.com/neutrinojs/webpack-chain) 提供了链式API，来修改或生成 Webpack 配置。Vue CLI 内部的 Webpack 配置就是用它来维护的，另外，在 `vue.config.js` 中可以配置 `chainWebpack` 字段，我们可以用链式方式来修改配置。

## 二、用法


### 1. ChainedMap 和 ChainedSet


`webpack-chain` 中有两个核心对象，ChainedMap 和 ChainedSet。一般情况下，如果 Webpack 原配置项是对象类型，在`webpack-chain` 中会对应生成 ChainedMap，如果 Webpack 原配置项是数组类型，在 `webpack-chain` 中会对应生成 ChainedSet。

ChainedMap 和 ChainedSet 的操作类似于 JavaScript Map, 为链式和生成配置提供了一些便利。

ChainedMap 中常用的 API：

```js
// 从 Map 移除所有 配置.
clear()

// 通过键值从 Map 移除单个配置.  // key: *
delete(key)

// 获取 Map 中相应键的值。   // key: *    // returns: value
get(key)

// 获取 Map 中相应键的值。如果键在Map中不存在，则ChainedMap中该键的值会被配置为fn的返回值.
// key: *  // fn: Function () -> value   // returns: value
getOrCompute(key, fn)

// 配置Map中 已存在的键的值。 // key: * // value: *
set(key, value)

// Map中是否存在一个配置值的特定键，返回 真或假。  // key: *   // returns: Boolean
has(key)

// 返回 Map中已存储的所有值的数组。// returns: Array
values()

// 返回Map中全部配置的一个对象, 其中 键是这个对象属性，值是相应键的值， 如果Map是空，返回 `undefined`
// 使用 `.before() 或 .after()` 的ChainedMap, 则将按照属性名进行排序。 returns: Object, undefined if empty
entries()

// 提供一个对象，这个对象的属性和值将 映射进 Map。你也可以提供一个数组作为第二个参数以便忽略合并的属性名称。
// obj: Object // omit: Optional Array
merge(obj, omit)

// 对当前配置上下文执行函数。  handler: Function -> ChainedMap。 一个把ChainedMap实例作为单个参数的函数
batch(handler)

// 条件执行一个函数去继续配置
when(condition, whenTruthy, whenFalsy)
```

有一个地方需要注意，ChainedMap 的 `entries()` 方法会返回对象类型。而 Javascript中 的 `Object.entries(obj)` 方法会返回二维数组，比如：

```js
console.log(Object.entries({a:1,b:2}))
// [['a', 1], ['b', 2]]
```

ChainedSet 中常用的 API：

```js
// 添加/追加 给Set末尾位置一个值.
add(value)

// 添加 给Set开始位置一个值.
prepend(value)

// 移除Set中全部值.
clear()

// 移除Set中一个指定的值.
delete(value)

// 检测Set中是否存在一个值.
has(value)


// 返回Set中值的数组.
values()

// 连接给定的数组到 Set 尾部。
merge(arr)


// 对当前配置上下文执行函数。
batch(handler)

// 条件执行一个函数去继续配置
when(condition, whenTruthy, whenFalsy)
```


### 2. Shorthand methods

`Shorthand methods` 可翻译成简便方法，就是把 `ChainedMap.set(key, value)`，转成 `ChainedMap.[key](value)`，方便使用。

```js
// 在 ChainedMap 上设置一个值的 速记方法
devServer.hot(true);

// 上述方法等效于:
devServer.set('hot', true);
```

### 3. 例子


```js
// 导入 webpack-chain 模块，该模块导出了一个用于创建一个webpack配置API的单一构造函数。
const Config = require('webpack-chain');

// 对该单一构造函数创建一个新的配置实例
const config = new Config();

// 用链式API改变配置
// 每个API的调用都会跟踪对存储配置的更改。

// 会把默认的入口清空
config.entryPoints.clear() 

config
  // 修改 entry 配置
  .entry('index')
    .add('src/index.js')
    .end()
  // 修改 output 配置
  .output
    .path('dist')
    .filename('[name].bundle.js')
    .chunkFilename("chunks/[name].[chunkhash].js")
    .libraryTarget("umd");


// 配置路径别名，resolve.alias 其实是一个 ChainMap 对象
config.resolve.alias
  .set('assets',resolve('src/assets'))
  .set('components',resolve('src/components'))
  .set('static',resolve('src/static'))
  .delete('static') // 删掉指定的别名


// 创建loader
// config.module
//   .rule(name)
//     .use(name)
//       .loader(loader)
//       .options(options)


// 创建一个具名规则，以后用来修改规则
config.module
  .rule('lint')
    .test(/\.js$/)
    .pre()
    .include
      .add('src')
      .end()
    // 还可以创建具名use (loaders)
    .use('eslint')
      .loader('eslint-loader')
      .options({
        rules: {
          semi: 'off'
        }
      });

config.module
  .rule('compile')
    .test(/\.js$/)
    .include
      .add('src')
      .add('test')
      .end()
    .use('babel')
      .loader('babel-loader')
      .options({
        presets: [
          ['@babel/preset-env', { modules: false }]
        ]
      });

config.module.rule('eslint').uses.clear();

/**
 * 也可以创建一个具名的插件
 * 先指定名字(这个名字是自定义的)，然后通过 use 添加插件
 * use 的第二个参数为插件参数，必须是一个数组，也可以不传
 */

config
  .plugin('clean')
    .use(CleanPlugin, [['dist'], { root: '/dir' }]);

// 移除插件
config.plugins.delete('extract')

// 指定插件在 xx 插件之前/之后调用
config.plugin('html')
  .use(require('html-webpack-plugin'))
  .before('extract')

// 动态修改插件参数
// 使用 tap 方法修改参数
config
  .plugin(name)
  .tap(args => newArgs)


// 自定义插件的实例化的过程
// 通过 init 方法，返回一个实例，这将代替原有的实例化过程
config
  .plugin(name)
  .init((Plugin, args) => new Plugin(...args));


// 利用when，条件满足时才修改或生成配置
config
  .when(
    process.env.PUBLISH_ENV !== 'test',
    (config) => {
      config.optimization.minimizer('terser').tap((args) => {
        // remove debugger
        args[0].terserOptions.compress.drop_debugger = true;
        // 移除 console.log
        args[0].terserOptions.compress.pure_funcs = ['console.log', 'console.table'];
        // 去掉注释
        args[0].terserOptions.output = {
          comments: false,
        };
        return args;
      });
    },
  );

// 导出这个修改完成的要被webpack使用的配置对象
module.exports = config.toConfig();
```


## 三、原理

### 1. 基本的继承链

`webpack-chain` 目录结构如下，可以看到它是极其扁平的，阅读难度不大。

```
- Chainable.js     
- ChainedSet.js    
- DevServer.js     
- Optimization.js  
- Output.js        
- Plugin.js        
- ResolveLoader.js 
- Use.js
- ChainedMap.js    
- Config.js        
- Module.js        
- Orderable.js     
- Performance.js   
- Resolve.js       
- Rule.js
```

其中有几个业务无关的 Class：`ChainedMap`、`ChainedSet`、`Orderbale`、`Chainable`，其中`ChainedMap`、`ChainedSet` 都继承自 Chainable，部分 ChainedMap 继承自 Orderbale。

<img src="http://doc.uwayfly.com/webpack-chain-class.png" width="500">

Chainable 是最底层的逻辑，只提供了 `end/batch` 方法：

```js
module.exports = class {
  constructor(parent) {
    this.parent = parent;
  }

  batch(handler) {
    handler(this);
    return this;
  }

  end() {
    return this.parent;
  }
};
```


### 2. 总体逻辑

webpack-chain 对外暴露 Config 类，其继承自 ChainMap，在 Config 的构造函数中，会实例化 `resolve`、`node`、`module`、`devServer` 等，其实就是 Webpack 的第一层配置项。

```js
module.exports = class extends ChainedMap {
  constructor() {
    super();
    this.devServer = new DevServer(this);
    this.entryPoints = new ChainedMap(this);
    this.module = new Module(this);
    this.node = new ChainedMap(this);
    this.optimization = new Optimization(this);
    this.output = new Output(this);
    this.performance = new Performance(this);
    this.plugins = new ChainedMap(this);
    this.resolve = new Resolve(this);
    this.resolveLoader = new ResolveLoader(this);
    this.extend([
      'amd',
      'bail',
      'cache',
      'context',
      'devtool',
      'externals',
      'loader',
      'mode',
      'name',
      'parallelism',
      'profile',
      'recordsInputPath',
      'recordsPath',
      'recordsOutputPath',
      'stats',
      'target',
      'watch',
      'watchOptions',
    ]);
  }
}
```

`resolve`、`module`、`optimization` 等有自己的类，也就是它们有自己的方法和属性。以 Module 为例，它也继承自 ChainMap，在它的构造函数中声明了 `rules`、`defaultRules`。

```js
module.exports = class extends ChainedMap {
  constructor(parent) {
    super(parent);
    this.rules = new ChainedMap(this);
    this.defaultRules = new ChainedMap(this);
    this.extend(['noParse', 'strictExportPresence']);
  }

  defaultRule(name) {
    return this.defaultRules.getOrCompute(
      name,
      () => new Rule(this, name, 'defaultRule'),
    );
  }

  rule(name) {
    return this.rules.getOrCompute(name, () => new Rule(this, name, 'rule'));
  }
}
```


ChainMap 是 `webpack-chain` 的核心，可以看作一个与业务无关的类，就是提供类似 Map 的 API，包括 `get`、`set`、`values`、`entries` 等，还有 `order` 排序方法、`merge` 融合属性方法等，以及下面会提到的 `extend` 方法。

```js
module.exports = class extends Chainable {
  constructor(parent) {
    super(parent);
    this.store = new Map();
  }

  extend(methods) {
    this.shorthands = methods;
    methods.forEach((method) => {
      this[method] = (value) => this.set(method, value);
    });
    return this;
  }

  clear() {
    this.store.clear();
    return this;
  }

  delete(key) {
    this.store.delete(key);
    return this;
  }
}
```

当调用 `config.toConfig()` 的时候，会调用每个属性的 `toConfig`、`entries`、`values` 方法，将其返回一个大配置对象。每个属性的 `toConfig` 方法内部也会调用 `entries`、`values` 方法，返回当前的配置项。

```js
// Config.js
module.exports = class extends ChainedMap {
  toConfig() {
    const entryPoints = this.entryPoints.entries() || {};

    return this.clean(
      Object.assign(this.entries() || {}, {
        node: this.node.entries(),
        output: this.output.entries(),
        resolve: this.resolve.toConfig(),
        resolveLoader: this.resolveLoader.toConfig(),
        devServer: this.devServer.toConfig(),
        module: this.module.toConfig(),
        optimization: this.optimization.toConfig(),
        plugins: this.plugins.values().map((plugin) => plugin.toConfig()),
        performance: this.performance.entries(),
        entry: Object.keys(entryPoints).reduce(
          (acc, key) =>
            Object.assign(acc, { [key]: entryPoints[key].values() }),
          {},
        ),
      }),
    );
  }
}
```

### 3. Shorthand methods 原理

`Shorthand methods` 核心是下面的 `extend` 方法，它定义在 ChainedMap 上。每个 ChainedMap 的实例，都会在初始化的时候调用它。

```js
extend(methods) {
  this.shorthands = methods;
  methods.forEach(method => {
    this[method] = value => this.set(method, value);
  });
  return this;
}
```

经过 `extend` 的处理后，`ChainedMap.set(key, value)` 就可以写成 `ChainedMap.[key](value)`。


### 4. before/after 原理

`webpack-chain` 中有个 Orderable 类，其定义如下。对于 `plugin`、`Rule`、`Use` 这三个类，会继承自 Orderable，也就是增加了 `before`、`after` 方法。当调用 `before` 时，会执行 `this.__before = name`，当调用 `after` 时，会执行 `this.__after = name`。

```js
module.exports = (Class) =>
  class extends Class {
    before(name) {
      if (this.__after) {
        throw new Error(
          `Unable to set .before(${JSON.stringify(
            name,
          )}) with existing value for .after()`,
        );
      }

      this.__before = name;
      return this;
    }

    after(name) {
      if (this.__before) {
        throw new Error(
          `Unable to set .after(${JSON.stringify(
            name,
          )}) with existing value for .before()`,
        );
      }

      this.__after = name;
      return this;
    }

    merge(obj, omit = []) {
      if (obj.before) {
        this.before(obj.before);
      }

      if (obj.after) {
        this.after(obj.after);
      }

      return super.merge(obj, [...omit, 'before', 'after']);
    }
  };
```

注意 `plugin`、`Rule`、`Use` 也继承了 ChainedMap，在调用它上面的 `entries`、`values` 方法时，会先调用 `order` 方法调整顺序。

```js
// ChainedMap.js
module.exports = class extends Chainable {
  constructor(parent) {
    super(parent);
    this.store = new Map();
  }

  order() {
    const entries = [...this.store].reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
    const names = Object.keys(entries);
    const order = [...names];

    names.forEach((name) => {
      if (!entries[name]) {
        return;
      }

      const { __before, __after } = entries[name];

      if (__before && order.includes(__before)) {
        order.splice(order.indexOf(name), 1);
        order.splice(order.indexOf(__before), 0, name);
      } else if (__after && order.includes(__after)) {
        order.splice(order.indexOf(name), 1);
        order.splice(order.indexOf(__after) + 1, 0, name);
      }
    });

    return { entries, order };
  }

  entries() {
    const { entries, order } = this.order();

    if (order.length) {
      return entries;
    }

    return undefined;
  }

  values() {
    const { entries, order } = this.order();

    return order.map((name) => entries[name]);
  }
};
```

### 5. 作用域

这里的作用域，或者叫上下文，当配置的时候当前操作的对象的，以下面例子说明：

```js
config.module
  .rule('compile')
    .test(/\.js$/)
    .include
      .add('src')
      .add('test')
      .end()
    .use('babel')
      .loader('babel-loader')
      .options({
        presets: [
          ['@babel/preset-env', { modules: false }]
        ]
      });
```

简单来说，链式配置的过程中，遇到新的属性会进入下一个属性的上下文，遇到方法则在当前上下文操作。

`module` 是 `config` 上的属性，`rule` 是 `module` 上的属性，`test/include/use` 是 `rule` 上的属性（`test` 同时是方法），`include.add`、`use.loader`、`use.options` 则是方法，它们在相应的上下文操作。

对应的 Webpack 配置如下。

```js
{
  module: {
    rules: [
      { 
        test: /\.js$/, 
        include: ['src', 'test'],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { modules: false }]
              ]
            }
          }
        ] 
      }
    ],
  },
}
```

看到这里，其实发现直接写 Webpack 配置似乎更直观、直接、简单。即使写 `webpack-chain`，也是需要先熟悉 Webpack 自身配置。

## 四、总结

人们对于 `webpack-chain` 的态度，可分为两种，一种觉得好用，另一种觉得它比较多余，增加了学习成本，还把配置变成了黑盒。个人比较倾向于后者，也许在配置生成之后，再用 `webpack-chain` 修改可能稍微便利了一点点，但这也导致了无法做到可见即可得。

尽管如此，学习下链式 API 的实现原理是很有帮助的。链式API中所有的简便方法，其实只是换了个方式来维护内部的 `config`，比如 `plugins`、`rules`。



## 五、相关资料

1. [我曾为配置 webpack 感到痛不欲生](https://juejin.cn/post/6950076780669566983)
2. [前端工程化：webpack-chain](https://juejin.cn/post/6844904138954801166)

----

在同一个规则rule的条件下，其规则rule中的loader都是后写的先执行。

参考：https://blog.csdn.net/wang_js_amateyr/article/details/107257441

2023.12.18 补充。

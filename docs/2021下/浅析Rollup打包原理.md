## 一、开始

本次`Rollup`打包原理分析是[v0.3.1](https://github.com/rollup/rollup/tree/v0.3.1)版本，因其代码精简，易读性高，所以用它来初探打包器的工作原理。

在`Rollup`中，一个文件就是一个`Module`(模块)，每一个模块都会生成`AST`语法抽象树，`Rollup`会对每个`AST`节点进行分析。

## 二、AST

`Rollup`打包的核心是对`AST`的解析和处理，要想深入理解打包原理，必须深入理解`AST`。

`Rollup`是通过[acorn](https://github.com/acornjs/acorn)这个库进行`AST`的生成的，`acorn`的生成结果遵循[estree](https://github.com/estree/estree)规范。

下面是一个通过`acorn`生成的`AST`例子，来直观感受下。

```js
const { parse } = require('acorn');
const code = `import { a } from './a.js'`

console.log(parse(code, {
  ecmaVersion: 7,
  sourceType: 'module',
}))
```

生成的`AST`结果：

```js
{
  type: 'Program',
  start: 0,
  end: 26,
  body: [
    {
      type: 'ImportDeclaration',
      start: 1,
      end: 26,
      specifiers: [
        {
          type: 'ImportSpecifier',
          start: 9,
          end: 10,
          imported: {
            type: 'Identifier',
            start: 9,
            end: 10,
            name: 'a',
          },
          local: {
            type: 'Identifier',
            start: 9,
            end: 10,
            name: 'a',
          },
        },
      ],
      source: {
        type: 'Literal',
        start: 18,
        end: 26,
        value: './a.js',
        raw: '\'./a.js\'',
      },
    },
  ],
  sourceType: 'module',
};
```

`AST`的基本结构是一个个`Node`节点，其必包含`type`和`loc`(`start/end`)信息。`type`为`Program`的`Node`节点表明这是段程序，通常是脚本的最外层，`body`是其属性。

这里有几个网站可以在线查看`AST`结构：[AST Explorer](https://astexplorer.net/)、[esprima](https://esprima.org/demo/parse.html#)。

## 三、V0.3.1的打包原理

入口文件是[src/rollup.js](https://github.com/rollup/rollup/blob/v0.3.1/src/rollup.js#L9)，其实例化了一个`Bundle`，调用其`build`方法后，返回了一个对象，包含`generate`和`write`方法。

```js
export function rollup(entry, options = {}) {
  const bundle = new Bundle({
    entry,
    esolvePath: options.resolvePath
  }) 
  return bundle.build().then(() => {
    return {
      generate: options => bundle.generate(options),
      write: (dest, options = {}) => {
        let { code, map } = bundle.generate({
					dest,
					format: options.format,
					globalName: options.globalName
				});

				return Promise.all([
					writeFile( dest, code ),
					writeFile( dest + '.map', map.toString() )
				]);
      }
    }
  })
}
```

注意这个版本的`Rollup`的使用方式举例如下：

```js
rollup('entry.js').then((res) => {
  res.wirte('bundle.js')
})
```

可以看出其主要分为两步，第一步是通过`build`构建，第二步是`generate`或者`write`进行输出。`genenrate`是把`code`返回，`write`是把`code`写入文件中。

### 1. build

在[bundle.build](https://github.com/rollup/rollup/blob/v0.3.1/src/Bundle.js#L62)方法中，调用了[this.fetchModule](https://github.com/rollup/rollup/blob/v0.3.1/src/Bundle.js#L31)，其主要是读取文件(模块)内容，然后实例化一个`Module`。

```js
class Bundle {
  build() {
    return this.fetchModule(this.entryPath)
      .then(entryPath => {
        this.entryModule = entryModule;
        return entryModule.expandAllStatements(true);
      })
      .then((statements) => {
        this.statements = statements;
        this.deconflict();
      });
  }

  fetchModule() {
    // ...
    
    const module = new Module({
      code,
      path: route,
      bundle: this,
    });

    // ...
  }
}
```

在[Module](https://github.com/rollup/rollup/blob/v0.3.1/src/Module.js#L13)的构造函数中，对传入的`code`(文件内容)通过`acorn.parse`进行了解析，获取了`AST`，然后调用了`this.analyse`。

```js
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code, {
      filename: path
    })
    this.ast = acorn.parse(code, {
      ecmaVersion: 6,
      sourceType: 'module',
    })
  }
  this.analyse();
}
```

在`module`的[analyse](https://github.com/rollup/rollup/blob/v0.3.1/src/Module.js#L40)方法中对`ast`的`body`进行了遍历，判断如果存在`import`或者`export`语句，将其放到`this.imports`和`this.exports`中。

然后调用了`ast`目录下的[analyse](https://github.com/rollup/rollup/blob/v0.3.1/src/ast/analyse.js#L7)方法，为每个`node`节点增加了`_scope`(作用域)、`_defines`(定义变量)、`_modifies`(修改的)、`_dependsOn`(依赖)等变量。

回到`bundle.build`方法中，在调用`fetchModule`获取到`entryModule`(入口模块)后，然后调用了[entryModule.expandAllStatements](https://github.com/rollup/rollup/blob/v0.3.1/src/Module.js#L339)方法。其遍历了`ast.body`，调用`expandStatement`去收集所有的语句。

[expandStatement](https://github.com/rollup/rollup/blob/v0.3.1/src/Module.js#L293)根据节点的`_dependsOn`属性，找到其依赖，然后依次调用`define`方法。[define](https://github.com/rollup/rollup/blob/v0.3.1/src/Module.js#L206)方法中根据导入模块的路径去调用`fetchModule`，实现了递归引入依赖，构建了一个大的模块树。

这样所有的声明都被收集到了`bundle.statements`中，然后调用[this.deconflict](https://github.com/rollup/rollup/blob/v0.3.1/src/Bundle.js#L86)解决命名冲突。

`bundle.build`的整体逻辑就是这样，在其过程中会有许多对`AST`的判断，以区分不同的类型的节点，来进行不同的处理。

### 2. generate

[bundle.generate](https://github.com/rollup/rollup/blob/v0.3.1/src/Bundle.js#L142)的方法是相对独立的，其核心思想是对`this.statements`的拼接。因为所有的语句都已经收集到了`statement`中，那么拼接起来返回就行了。

在拼接过程中过滤了`export`语句，并处理了一些`import`语句，然后返回了`code`。

## 四、流程图

画了一张流程图，来加深理解：

<img src="http://doc.uwayfly.com/rollup-code-0.3.1.png" width="700">

## 五、总结

上面就是`Rollup`基本的打包原理，简单的总结下就是从入口文件开始构建`AST`、收集依赖，最后拼接所有语句，输出`bundle`。

现在的最新版本`V2.59.0`比其多出的功能包括：`watch`、`plugin`、命令行参数等。

`Rollup`的插件系统其实就是在`build`和`generate`的不同生命周期阶段额外做的一些事情，其英文文档非常详细，建议直接阅读文档。


## 六、相关资料

1. [Rollup文档](https://rollupjs.org/guide/en/)
2. [文章中的例子](https://github.com/novlan1/rollup-intro)
3. [estree](https://github.com/estree/estree)
4. [使用Acorn来解析JavaScript](https://juejin.cn/post/6844903450287800327)
5. [从rollup初版源码学习打包原理](https://juejin.cn/post/6898865993289105415)
6. [原来rollup这么简单之rollup.rollup篇](https://juejin.cn/post/6844904094377705480)



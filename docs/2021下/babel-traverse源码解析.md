## 一、开始

前面文章讲了[@babel/core](https://juejin.cn/post/7041068341754069006/)、[@babel/parser](https://juejin.cn/post/7041068763566833672)的原理，这次讲一下`@babel/traverse`。

这个库主要是遍历AST，操作Node上的节点。

## 二、API说明

`@babel/traverse`暴露了`traverse(ast, opts)`这个API：

```js
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

const code = `function square(n) {
  return n * n;
}`;

const ast = parser.parse(code);

traverse(ast, {
  enter(path) {
    if (path.isIdentifier({ name: "n" })) {
      path.node.name = "x";
    }
  },
});

// 或者
traverse(ast, {
  FunctionDeclaration: function(path) {
    path.node.id.name = "x";
  },
});
```

`opts`为一个对象，其`key`可以是`enter/exit`，也可以是`FunctionDeclaration`这种`Node.type`，或者`FunctionDeclaration|Identifier`这种组合模式。

如果`opts`的key为`enter/exit`，在进入每一个节点的时候都会调用此函数，如果`key`为`Node.type`，则只有在解析到对应的节点时才调用此函数。


## 三、源码解析

本次分析的`@babel/traverse`版本是[v7.16.3](https://github.com/babel/babel/tree/main/packages/babel-traverse)。


### 1. 目录结构

`@babel/traverse`的目录结构如下：

```js
- path // 暴露出来的path对象，会作为插件的第一个参数
  - ancestry.ts
  - context.ts
  - removal.ts
  - replacement.ts
  - index.ts
  ...
- scope // 作用域相关
  - binding.ts
  - index.ts
- cache.ts
- hub.ts
- context.ts // 导出TraversalContext，包含visit方法，其会调用path中的visit，也就是执行插件
- types.ts // ts类型
- visitors.js // 格式化visitor
- index.ts // 暴露traverse方法
```

### 2. 运行机制

`traverse`方法会先判断传入的节点类型是否在`VISITOR_KEYS`中，是的话，执行`visitors.explode(opts)`，然后调用`traverse.node`。

```js
function traverse(
  parent: t.Node,
  opts: TraverseOptions = {},
  scope?: Scope,
  state?: any,
  parentPath?: NodePath,
) {
  if (!parent) return;

  if (!VISITOR_KEYS[parent.type]) {
    return;
  }

  visitors.explode(opts);

  traverse.node(parent, opts, scope, state, parentPath);
}
```

`VISITOR_KEYS`是从`@babel/types`导出的，在[definitions/core.ts](https://github.com/babel/babel/blob/main/packages/babel-types/src/definitions/core.ts)可以看到。

它是一个对象，`key`为`node.type`，`value`是`node`属性的数组：

```js
{
  ArrayExpression: [ 'elements' ],
  AssignmentExpression: [ 'left', 'right' ],
 ClassDeclaration: [
    'id',
    'body',
    'superClass',
    'mixins',
    'typeParameters',
    'superTypeParameters',
    'implements',
    'decorators'
  ],
  // ...
}
```

`visitors.explode`方法会格式化传过来的第二个参数：

- 传入一个方法的话，将其转为包含`enter`的对象，如`Identifier() { ... }` -> `Identifier: { enter() { ... } }`
- 分离`node.type`，如`"Identifier|NumericLiteral": { ... }` -> `Identifier: { ... }, NumericLiteral: { ... }`
- 将`enter/exit`转为数组，如`enter() {}` -> `[enter() { }]`
- 传入的`node.type`是`@babel/types`中的别名的话，对其做扩展，如`Property: { ... }` -> `ObjectProperty: { ... }, ClassProperty: { ... }`

看下traverse.node：

```js
traverse.node = function (
  node: t.Node,
  opts: TraverseOptions,
  scope?: Scope,
  state?: any,
  parentPath?: NodePath,
  skipKeys?,
) {
  const keys = VISITOR_KEYS[node.type];
  if (!keys) return;

  const context = new TraversalContext(scope, opts, state, parentPath);
  for (const key of keys) {
    if (skipKeys && skipKeys[key]) continue;
    if (context.visit(node, key)) return;
  }
};
```

`traverse.node`中新建了一个`TraversalContext`对象，然后调用了`context.visit(node, key)`。

一般情况下，初始传入的`node.type`是`File`，而`VISITOR_KEYS['File']`为`['program']`。

看下`context.visit`：

```js
visit(node, key) {
  const nodes = node[key];
  if (!nodes) return false;

  if (Array.isArray(nodes)) {
    return this.visitMultiple(nodes, node, key);
  } else {
    return this.visitSingle(node, key);
  }
}
```

`context.visit`方法先判断`node[key]`类型，如果是数组类型，调用`visitMultiple`，否则调用`visitSingle`。

`visitMultiple`和`visitSingle`最后都会调用`visitQueue`，只不过因为前者是数组类型，所以会依次遍历每个元素执行`visitQueue`方法。


```js
visitMultiple(container, parent, listKey) {
  // nothing to traverse!
  if (container.length === 0) return false;

  const queue = [];

  // build up initial queue
  for (let key = 0; key < container.length; key++) {
    const node = container[key];
    if (node && this.shouldVisit(node)) {
      queue.push(this.create(parent, container, key, listKey));
    }
  }

  return this.visitQueue(queue);
}

visitSingle(node, key): boolean {
  if (this.shouldVisit(node[key])) {
    return this.visitQueue([this.create(node, node, key)]);
  } else {
    return false;
  }
}
```

`visitQueue`主要是调用了`path.visit`方法：

```js
visitQueue(queue: Array<NodePath>) {
  this.queue = queue;
  this.priorityQueue = [];

  const visited = new WeakSet();
  let stop = false;

  for (const path of queue) {
    path.resync();

    if (
      path.contexts.length === 0 ||
      path.contexts[path.contexts.length - 1] !== this
    ) {
      path.pushContext(this);
    }

    if (path.key === null) continue;

    const { node } = path;
    if (visited.has(node)) continue;
    if (node) visited.add(node);

    if (path.visit()) {
      stop = true;
      break;
    }
  }
```

`context.visit`方法核心逻辑主要是`this.call('enter')`、`traverse.node`、`this.call('exit')`。这里的`traverse.node`实现了递归。

```js
export function visit(this: NodePath): boolean {
  if (!this.node) {
    return false;
  }

  if (this.isDenylisted()) {
    return false;
  }

  if (this.opts.shouldSkip && this.opts.shouldSkip(this)) {
    return false;
  }

  const currentContext = this.context;
  if (this.shouldSkip || this.call("enter")) {
    this.debug("Skip...");
    return this.shouldStop;
  }
  restoreContext(this, currentContext);

  this.debug("Recursing into...");
  traverse.node(
    this.node,
    this.opts,
    this.scope,
    this.state,
    this,
    this.skipKeys,
  );

  restoreContext(this, currentContext);

  this.call("exit");

  return this.shouldStop;
}
```

`call`方法会调用`_call`，先执行`_call(opts[key])`，然后执行`_call(opts[this.node.type][key])call('enter')`。

如果插件格式是`enter() {}`，则会执行它，如果插件格式是`NODE_TYPE(){}`，则只在访问到相应的`node`时会执行。

`_call`方法中主要通过`fn.call`方法真正的执行插件。

```js
export function call(this: NodePath, key: string): boolean {
  const opts = this.opts;

  this.debug(key);

  if (this.node) {
    if (this._call(opts[key])) return true;
  }

  if (this.node) {
    return this._call(opts[this.node.type] && opts[this.node.type][key]);
  }

  return false;
}

export function _call(this: NodePath, fns?: Array<Function>): boolean {
  if (!fns) return false;

  for (const fn of fns) {
    if (!fn) continue;

    const node = this.node;
    if (!node) return true;

    const ret = fn.call(this.state, this, this.state);

    // node has been replaced, it will have been requeued
    if (this.node !== node) return true;

    // this.shouldSkip || this.shouldStop || this.removed
    if (this._traverseFlags > 0) return true;
  }

  return false;
}
```

### 3. 流程图

<img src="http://doc.uwayfly.com/babel-traverse-structure.png" width="800">

## 四、系列文章


1. [Babel基础](https://juejin.cn/post/7041067247615344654)
2. [Babel源码解析之@babel/core](https://juejin.cn/post/7041068341754069006/)
3. [Babel源码解析之@babel/parser](https://juejin.cn/post/7041068763566833672)
4. Babel源码解析之@babel/traverse
5. [Babel源码解析之@babel/generator](https://juejin.cn/post/7041069387607965710)

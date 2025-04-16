## 一、开始

前面分析了[@babel/core](https://juejin.cn/post/7041068341754069006/)、[@babel/parser](https://juejin.cn/post/7041068763566833672)、[@babel/traverse](https://juejin.cn/post/7041069084292677663/)，下面看一下`@babel/generator`。

这个库主要是根据AST生成代码，相对比较简单，本文会介绍其核心逻辑，再举个简单的例子。


## 二、API说明

看下`@babel/generator`[官方文档](https://www.babeljs.cn/docs/babel-generator)，其API使用方法如下：

```js
import { parse } from "@babel/parser";
import generate from "@babel/generator";

const code = "class Example {}";
const ast = parse(code);

const output = generate(
  ast,
  {
    /* options */
  },
  code
);
```

## 三、源码解析

本次分析的`@babel/generator`版本是[v7.16.0](https://github.com/babel/babel/tree/v7.16.4/packages/babel-generator)。

### 1. 结构

`@babel/generator`的目录结构如下：

```js
- generators // 对不同种类的node有不同的生成模式
  - base.js
  - class.js
  - expression.js
  ...
- node // 主要是对空格和小括号的判断
  - index.js
  - parentheses.js
  - whitespace.js
- buffer.js  // Buffer类，存储最后的返回信息，包含操作_buf的方法
- printer.js // Printer类，中间层，包含print方法
- index.js // Generator类，继承自Printer，导出generate方法
```

### 2. 核心思想

`@babel/generator`内部维护了一个`_buf`，就是`code`字符串。遍历AST，根据Node节点的类型不同去增加或改变这个`_buf`，最后将其返回。

### 3. 运行机制

下面是一个简单的例子：

```js
const { parse } = require("@babel/parser");
const generate = require("@babel/generator").default;

const a = "const a = 1;";
const ast = parse(a);
const code = generate(ast)

console.log('code', code)
```

通过`@babel/parser`拿到AST，然后调用`@babel/generator`的`generate`方法。

这个AST在上篇关于[@babel/parser](https://juejin.cn/post/7041068763566833672)文章中介绍过，主要由`File`、`Program`、`VariableDeclarator`、`VariableDeclarator`、`NumericLiteral`几种Node构成。

```js
{
  "type": "File",
  "start": 0,
  "end": 11,
  "program": {
    "type": "Program",
    "start": 0,
    "end": 11,
    "sourceType": "module",
    "interpreter": null,
    "body": [
      {
        "type": "VariableDeclaration",
        "start": 0,
        "end": 11,
        "declarations": [
          {
            "type": "VariableDeclarator",
            "start": 6,
            "end": 11,
            "id": {
              "type": "Identifier",
              "start": 6,
              "end": 7,
              "name": "a"
            },
            "init": {
              "type": "NumericLiteral",
              "start": 10,
              "end": 11,
              "extra": {
                "rawValue": 1,
                "raw": "1"
              },
              "value": 1
            }
          }
        ],
        "kind": "const"
      }
    ],
  },
}
```

调用`generate`后，先实例化一个`Generator`，然后调用其上的`generate`方法。它又调用了`super.generate`方法，也就是`Printer`类中定义的`generate`。


```js
export default function generate(
  ast: t.Node,
  opts?: GeneratorOptions,
  code?: string | { [filename: string]: string },
): any {
  const gen = new Generator(ast, opts, code);
  return gen.generate();
}


class Generator extends Printer {
  generate() {
    return super.generate(this.ast);
  }
}

class Printer {
  generate(ast) {
    this.print(ast);
    this._maybeAddAuxComment();

    return this._buf.get();
  }
}
```

之后进入[print](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/printer.ts#L402)方法，主要是根据`node.type`获取`printMethod`，这里的`node.type`是`File`，即这里的`printMethod`是一个名为`File`的函数。

```js
class Printer {
  print(node, parent?) {
    if (!node) return;

    const oldConcise = this.format.concise;
    if (node._compact) {
      this.format.concise = true;
    }

    const printMethod = this[node.type];
    // ...

    const loc = isProgram(node) || isFile(node) ? null : node.loc;
    this.withSource("start", loc, () => {
      printMethod.call(this, node, parent);
    });
    // ...
  }
}
```

这个[File](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/base.ts#L5)函数来自于`generators`目录，就是针对`node`的不同类型做的不同操作。

```js
import * as generatorFunctions from "./generators";

Object.assign(Printer.prototype, generatorFunctions);
```

接着调用`this.withSource`，在它的回调中调用了`printMethod`。`withSource`方法主要是对`sourcemap`生成的处理，如果不需生成`sourcemap`，直接调用`cb`，这里是`File`函数。

```js
class Printer {
    withSource(prop: string, loc: any, cb: () => void): void {
    this._catchUp(prop, loc);

    this._buf.withSource(prop, loc, cb);
  }
}


class Buffer {
  withSource(prop: string, loc: t.SourceLocation, cb: () => void): void {
  if (!this._map) return cb();
  // ...
  }
}
```

`File`函数判断有无`node.program`，有的话，执行`this.print(node.program.interpreter, node)`，也就又回到`print`方法中。我们的例子中有`node.program`，但是`node.program.interpreter`为`null`，所以再次进入`print`方法时什么也没做，直接返回。

接着执行`this.print(node.program, node)`，这次进入`print`方法主要是执行[Program](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/base.ts#L15)方法。


```js
export function File(this: Printer, node: t.File) {
  if (node.program) {
    this.print(node.program.interpreter, node);
  }

  this.print(node.program, node);
}

export function Program(this: Printer, node: t.Program) {
  this.printInnerComments(node, false);

  this.printSequence(node.directives, node);
  if (node.directives && node.directives.length) this.newline();

  this.printSequence(node.body, node);
}
```

这次`node`上没有`directives`属性，所以会调用`this.printSequence(node.body, node)`。之所以不用`print`方法，是因为`node.body`是数组类型。

`printSequence`中调用了`printJoin`方法，`printJoin`中依次遍历传入的`nodes`，调用`_printNewline`和`this.print`方法。

再次进入`print`中，会调用[VariableDeclaration](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/statements.ts#L253)方法。

```js
class Printer {
  printSequence(
    nodes,
    parent,
    opts: {
      statement?: boolean;
      indent?: boolean;
      addNewlines?: Function;
    } = {},
  ) {
    opts.statement = true;
    return this.printJoin(nodes, parent, opts);
  }

  printJoin(nodes: Array<any> | undefined | null, parent: any, opts: any = {}) {
    if (!nodes?.length) return;

    if (opts.indent) this.indent();

    const newlineOpts = {
      addNewlines: opts.addNewlines,
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;

      if (opts.statement) this._printNewline(true, node, parent, newlineOpts);

      this.print(node, parent);

      if (opts.iterator) {
        opts.iterator(node, i);
      }

      if (opts.separator && i < nodes.length - 1) {
        opts.separator.call(this);
      }

      if (opts.statement) this._printNewline(false, node, parent, newlineOpts);
    }

    if (opts.indent) this.dedent();
  }
}
```

[VariableDeclaration](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/statements.ts#L253)方法在`generators/statement.js`中，会先调用`this.word(node.kind)`，`word`方法会调用`Buffer`中的`_append`方法。也就是在`_buf`中添加一个字符——`node.kind`，这里就是`const`。

然后调用`this.space()`添加一个空格。

接着调用`this.printList(node.declarations, node, { separator }`。

```js
export function VariableDeclaration(
  this: Printer,
  node: t.VariableDeclaration,
  parent: t.Node,
) {
  if (node.declare) {
    this.word("declare");
    this.space();
  }

  this.word(node.kind);
  this.space();

  let hasInits = false;
  if (!isFor(parent)) {
    for (const declar of node.declarations as Array<any>) {
      if (declar.init) {
        hasInits = true;
      }
    }
  }
  let separator;
  if (hasInits) {
    separator =
      node.kind === "const"
        ? constDeclarationIndent
        : variableDeclarationIndent;
  }

  this.printList(node.declarations, node, { separator });

  if (isFor(parent)) {
    if (isForStatement(parent)) {
      if (parent.init === node) return;
    } else {
      if (parent.left === node) return;
    }
  }

  this.semicolon();
}

class Printer {
  word(str: string): void {
    if (
      this._endsWithWord ||
      (this.endsWith(charCodes.slash) && str.charCodeAt(0) === charCodes.slash)
    ) {
      this._space();
    }

    this._maybeAddAuxComment();
    this._append(str);

    this._endsWithWord = true;
  }

  _append(str: string, queue: boolean = false) {
    this._maybeAddParen(str);
    this._maybeIndent(str);

    if (queue) this._buf.queue(str);
    else this._buf.append(str);

    this._endsWithWord = false;
    this._endsWithInteger = false;
  }
}

class Buffer {
  append(str: string): void {
    this._flush();
    const { line, column, filename, identifierName, force } =
      this._sourcePosition;
    this._append(str, line, column, identifierName, filename, force);
  }

  _append(
    str: string,
    line: number,
    column: number,
    identifierName?: string | null,
    filename?: string | null,
    force?: boolean,
  ): void {
    this._buf += str;
    this._last = str.charCodeAt(str.length - 1);

    let i = str.indexOf("\n");
    let last = 0;

    if (i !== 0) {
      this._mark(line, column, identifierName, filename, force);
    }

    while (i !== -1) {
      this._position.line++;
      this._position.column = 0;
      last = i + 1;

      if (last < str.length) {
        this._mark(++line, 0, identifierName, filename, force);
      }
      i = str.indexOf("\n", last);
    }
    this._position.column += str.length - last;
  }
}
```

`printList`与`printSequence`的区别是，`printList`会提供`separator`，也就是在拼接的时候会提供连接符，比如`,`，`;`。


这里会遍历`node.declarations`，调用`print`方法。例子中`node.declarations`中只有一个元素，其`type`为`VariableDeclarator`，也就是会调用[VariableDeclarator](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/statements.ts#L314)方法。


```js
class Printer {
  printList(
    items,
    parent,
    opts: { separator?: Function; indent?: boolean; statement?: boolean } = {},
  ) {
    if (opts.separator == null) {
      opts.separator = commaSeparator;
    }

    return this.printJoin(items, parent, opts);
  }
}
```


`VariableDeclarator`方法主要逻辑有：
- 调用`this.print(node.id, node)`，这里`node.id`是`type`为`Identifier`的`Node`
- `node.init`存在的话，调用`space`、`token`方法等，这里`node.init`为`type`为`NumericLiteral`的`Node`

```js
export function VariableDeclarator(this: Printer, node: t.VariableDeclarator) {
  this.print(node.id, node);
  if (node.definite) this.token("!"); // TS
  this.print(node.id.typeAnnotation, node);
  if (node.init) {
    this.space();
    this.token("=");
    this.space();
    this.print(node.init, node);
  }
}
```

我们已经知道`print`方法主要是调用与`node.type`同名的函数，这里会调用[Identifier](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/types.ts#L6)函数和[NumericLiteral](https://github.com/babel/babel/blob/v7.16.4/packages/babel-generator/src/generators/types.ts#L187)函数，最终为`_buf`增加`a = 1`

```js
export function Identifier(this: Printer, node: t.Identifier) {
  this.exactSource(node.loc, () => {
    this.word(node.name);
  });
}

export function NumericLiteral(this: Printer, node: t.NumericLiteral) {
  const raw = this.getPossibleRaw(node);
  const opts = this.format.jsescOption;
  const value = node.value + "";
  if (opts.numbers) {
    this.number(jsesc(node.value, opts));
  } else if (raw == null) {
    this.number(value); // normalize
  } else if (this.format.minified) {
    this.number(raw.length < value.length ? raw : value);
  } else {
    this.number(raw);
  }
}
```

最后调用`this._buf.get()`将`code`、`map`等信息返回。


```js
class Buffer {
  get(): any {
    this._flush();

    const map = this._map;
    const result = {
      code: this._buf.trimRight(),
      map: null,
      rawMappings: map?.getRawMappings(),
    };

    if (map) {
      Object.defineProperty(result, "map", {
        configurable: true,
        enumerable: true,
        get() {
          return (this.map = map.get());
        },
        set(value) {
          Object.defineProperty(this, "map", { value, writable: true });
        },
      });
    }

    return result;
  }
}
```



### 4. 流程图

<img src="http://doc.uwayfly.com/babel-generator-structure.png" width="900">

## 四、总结

本文简单介绍了`@babel/generator`主要逻辑，其可视为分层架构：
- `Buffer`层维护核心的_`buf`，提供操作`_buf`和`_queue`的`append`等方法；
- `Printer`为中间的抽象层，调用底层`Buffer`中提供的`append`等方法，并提供`print`、`printList`等方法；
- `Generator`为顶层，提供对外API。

生成`code`的思想就是从顶层`File`、`Program`开始，分析`Node.type`，递归调用对应的生成函数，不断增加或修改`_buf`，最后返回。

## 五、系列文章

1. [Babel基础](https://juejin.cn/post/7041067247615344654)
2. [Babel源码解析之@babel/core](https://juejin.cn/post/7041068341754069006/)
3. [Babel源码解析之@babel/parser](https://juejin.cn/post/7041068763566833672)
4. [Babel源码解析之@babel/traverse](https://juejin.cn/post/7041069084292677663/)
5. Babel源码解析之@babel/generator




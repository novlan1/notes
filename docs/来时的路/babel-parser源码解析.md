## 一、开始

[上篇文章](https://juejin.cn/post/7041068341754069006/)介绍了[@babel/core](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/index.ts)，这次分析下[@babel/parser](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js)。

`@babel/parser`主要可分为词法分析和语法分析两大部分，我们来看下二者都是如何运作、如何结合的。

## 二、API说明

`babel`之前的版本是直接调用了[recast](https://github.com/benjamn/recast)库，来生成的AST。现在的`@babel/parser`很大程度借鉴了[acorn](https://github.com/acornjs/acorn)。

看源码之前可以先看[文档](https://babeljs.io/docs/en/babel-parser)，对它的功能、API有基本认识。

`@babel/parser`对外主要暴露了[parse](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js#L18)和[parseExpression](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js#L62)两个API，形式为：

```js
babelParser.parse(code, [options])
```

看下`options`中的[sourceType](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js#L19)参数，其值可以是`script`、`module`、`unambiguous`，默认是`script`。

如果是`unambiguous`的话会根据代码中是否出现`import/export`关键词来判断`sourceType`，如果出现了`import/export`则将`sourceType`更新为`module`，否则为`script`。

## 三、源码分析

本次分析的[@babel/parser](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js)的版本是`v7.16.4`。

### 1. 目录结构


先看下它的目录结构：

```
- parser
  - base
  - comment
  - error
  - expression
  - index
  - lval
  - node
  - statement
- plugins
  - flow
  - jsx
  - typescript
- tokenizer
  - context
  - index
  - state
- utils
  - identifier
  - location
  - scope
- index
```

可以看出它主要包含3个部分：`tokenizer`、`plugins`、`parser`。其中
1. `tokenizer`用来解析获取`Token`，包括`state`和`context`；
2. `parser`包含`node`、`statement`、`expression`等；
3. `plugins`则是用来帮助解析`ts`、`jsx`等语法的。


从[index.js](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js)看起，当调用`parser.parse`方法后，会实例化一个[Parser](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/index.js#L12)，就是上面`parser/index.js`文件中的`Parser`。`Parser`的实现很有意思，它有一长串的继承链：

<img src="http://doc.uwayfly.com/babel-parser-class-extends-2.png" width="250">

为什么要用这种方式组织代码呢？这种继承链的好处是只需要调用`this`就可以获取到其他对象的方法， 而且可以维护一份共同的数据，或者说状态，比如Node节点、`state`状态、`context`上下文、`scope`作用域等。

### 2. 运行机制

下面以一个极简单的例子来说明`parser`的运行机制：

```js
const { parse } = require('@babel/parser')

parse('const a = 1', {})
```

调用`@babel/parser`的`parse`方法的时候，会先通过[getParser]((https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/index.js#L80))实例化一个`Parser`，然后调用`Parser`上面的`parse`方法。

```js
function getParser(options: ?Options, input: string): Parser {
  let cls = Parser;
  if (options?.plugins) {
    validatePlugins(options.plugins);
    cls = getParserClass(options.plugins);
  }

  return new cls(options, input);
}
```

由于`Parser`的继承关系，在实例化的时候会在各个类中进行一系列初始化操作，包括`state`、`scope`和`context`等。

然后进入[parse](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/index.js#L35)方法，主要逻辑包括：

1. 进入初始化的作用域
2. 通过`startNode`创建`File`节点和`Program`节点
3. 通过`nextToken`去获取一个`token`
4. 通过`parseTopLevel`递归去解析。

```js
export default class Parser extends StatementParser {
  parse(): File {
    this.enterInitialScopes();
    const file = this.startNode();
    const program = this.startNode();
    this.nextToken();
    file.errors = null;
    this.parseTopLevel(file, program);
    file.errors = this.state.errors;
    return file;
  }
}
```

[startNode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/node.js#L93)在`NodeUtil`这个类中，就是新建了一个`Node`，为什么掉用两次`startNode`呢，因为AST的顶层`Node`是`File`类型，其有一个属性`program`，需要新建另一个`Node`，这两个`Node`的`start`、`loc`信息一样。

```js
export class NodeUtils extends UtilParser {
 startNode<T: NodeType>(): T {
    return new Node(this, this.state.start, this.state.startLoc);
  }
}
```

进入[nextToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L298)，其在`Tokenizer`中，主要逻辑是判断当前位置是否已经大于输入的长度，如果是的话，调用[finishToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L489)去结束`token`，否则调用[getTokenFromCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L832)或者[readTmplToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1380)，去从`code中`读取`token`。

这里的`ct.template`就是以反引号开头，我们的例子是`const a = 1`，会走到[getTokenFromCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L832)。

`this.codePointAtPos(this.state.pos)`会获取当前字符，我们的例子中是`c`。

```js
export default class Tokenizer extends ParserErrors {
 nextToken(): void {
    const curContext = this.curContext();
    if (!curContext.preserveSpace) this.skipSpace();
    this.state.start = this.state.pos;
    if (!this.isLookahead) this.state.startLoc = this.state.curPosition();
    if (this.state.pos >= this.length) {
      this.finishToken(tt.eof);
      return;
    }

    if (curContext === ct.template) {
      this.readTmplToken();
    } else {
      this.getTokenFromCode(this.codePointAtPos(this.state.pos));
    }
  }
}
```

[getTokenFromCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L832)会对传入的`code`做判断，是否是点号、左右括号、逗号、数字等，我们的例子中会走到`default`，调用`isIdentifierStart`判断是否是标志符的开始，是的话调用[readWord](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1613)读取一个完整的`token`。

```js
getTokenFromCode(code: number): void {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.

    case charCodes.dot:
      this.readToken_dot();
      return;

    // Punctuation tokens.
    case charCodes.leftParenthesis:
      ++this.state.pos;
      this.finishToken(tt.parenL);
      return;
    case charCodes.rightParenthesis:
      ++this.state.pos;
      this.finishToken(tt.parenR);
      return;
    case charCodes.semicolon:
      ++this.state.pos;
      this.finishToken(tt.semi);
      return;
    case charCodes.comma:
      ++this.state.pos;
      this.finishToken(tt.comma);
      return;
    // ...

    default:
      if (isIdentifierStart(code)) {
        this.readWord(code);
        return;
      }
  }
}
```

[isIdentifierStart](https://github.com/babel/babel/blob/v7.16.4/packages/babel-helper-validator-identifier/src/identifier.ts#L52)的核心就是对字符的`unicode`编码做判断：
- 如果`code`编码小于大写的`A`的编码（65），只有`code`是$符号才为`true`
- 如果`code`编码介于`A-Z`之间（65-90），则为`true`
- 如果`code`编码在大写`Z`和小写的`a`之间（91-96），只有`code`是下划线`_`才会`true`
- 如果`code`编码介于`a-z`之间（97-122），则为`true`
- 如果`code`编码小于65535，且大于170，并且不以特殊的ASCII字符开头才为`true`
- 如果`code`编码大于65535，通过`isInAstralSet`判断是否是合法标志符

```js
export function isIdentifierStart(code: number): boolean {
  if (code < charCodes.uppercaseA) return code === charCodes.dollarSign;
  if (code <= charCodes.uppercaseZ) return true;
  if (code < charCodes.lowercaseA) return code === charCodes.underscore;
  if (code <= charCodes.lowercaseZ) return true;
  if (code <= 0xffff) {
    return (
      code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code))
    );
  }
  return isInAstralSet(code, astralIdentifierStartCodes);
}
```

在这里我们的`c`可以作为标志符开头，进入[readWord](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1613)。

[readWord](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1613)还是在`Tokenizer`中，作用是读取一个完整的关键字或者标志符。

它首先调用了[readWord1](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1566)，`readWord1`则会通过[isIdentifierChar](https://github.com/babel/babel/blob/v7.16.4/packages/babel-helper-validator-identifier/src/identifier.ts#L67)判断当前字符是否可以做标志符，来给它的位置`pos`加1，也就是向后移动。

我们的例子中，`ch`为`const`的下一个空格的时候会跳出循环，此时`state.pos`为5，得到的word为`const`。

然后判断`word`的类型，是否是关键字。[keywordTypes](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/types.js#L82)是一个`Map`，其`key`是各种关键字或者符号等，`value`是一个数字。这里`const`属于关键字，其对应的`value`是67，也就是`type`为67。然后调用[tokenLabelName](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/types.js#L393)。

[tokenLabelName](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/types.js#L393)会根据`type`获取`token`对应的标签，`const`对应的标签是`_const`。

这里顺便看一下`word`不是关键字的逻辑，[readWord](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1613)会把`word`当作用户的自定义变量，比如例子中的`a`。


```js
// Read an identifier or keyword token. Will check for reserved
// words when necessary.
readWord(firstCode: number | void): void {
  const word = this.readWord1(firstCode);
  const type = keywordTypes.get(word);
  if (type !== undefined) {
    // We don't use word as state.value here because word is a dynamic string
    // while token label is a shared constant string
    this.finishToken(type, tokenLabelName(type));
  } else {
    this.finishToken(tt.name, word);
  }
}

readWord1(firstCode: number | void): string {
  this.state.containsEsc = false;
  let word = "";
  const start = this.state.pos;
  let chunkStart = this.state.pos;
  if (firstCode !== undefined) {
    this.state.pos += firstCode <= 0xffff ? 1 : 2;
  }

  while (this.state.pos < this.length) {
    const ch = this.codePointAtPos(this.state.pos);
    if (isIdentifierChar(ch)) {
      this.state.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === charCodes.backslash) {
      this.state.containsEsc = true;

      word += this.input.slice(chunkStart, this.state.pos);
      const escStart = this.state.pos;
      const identifierCheck =
        this.state.pos === start ? isIdentifierStart : isIdentifierChar;

      if (this.input.charCodeAt(++this.state.pos) !== charCodes.lowercaseU) {
        this.raise(this.state.pos, Errors.MissingUnicodeEscape);
        chunkStart = this.state.pos - 1;
        continue;
      }

      ++this.state.pos;
      const esc = this.readCodePoint(true);
      if (esc !== null) {
        if (!identifierCheck(esc)) {
          this.raise(escStart, Errors.EscapedCharNotAnIdentifier);
        }

        word += String.fromCodePoint(esc);
      }
      chunkStart = this.state.pos;
    } else {
      break;
    }
  }
  return word + this.input.slice(chunkStart, this.state.pos);
}
```

接着进入[finishToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L489)。

[finishToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L489)就是设置`end`、`type`、`value`属性，因为此时已经读取了一个完整的`token`，可以获取到它的结束位置、类型和真正的值了。

```ts
finishToken(type: TokenType, val: any): void {
  this.state.end = this.state.pos;
  const prevType = this.state.type;
  this.state.type = type;
  this.state.value = val;

  if (!this.isLookahead) {
    this.state.endLoc = this.state.curPosition();
    this.updateContext(prevType);
  }
}
```

回到`Parser`的`parse`方法，之后会进入

1. [parseTopLevel](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L114) =>
2. [parseProgram](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L123) =>
3. [parseBlockBody](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L950) =>
4. [parseBlockOrModuleBlockBody](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L971) =>
5. [parseStatement](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L243) =>
6. [parseStatementContent](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L250)，也就是解析语句。


```js
parseBlockOrModuleBlockBody(
  body: N.Statement[],
  directives: ?(N.Directive[]),
  topLevel: boolean,
  end: TokenType,
  afterBlockParse?: (hasStrictModeDirective: boolean) => void,
): void {
  const oldStrict = this.state.strict;
  let hasStrictModeDirective = false;
  let parsedNonDirective = false;

  while (!this.match(end)) {
    const stmt = this.parseStatement(null, topLevel);

    if (directives && !parsedNonDirective) {
      if (this.isValidDirective(stmt)) {
        const directive = this.stmtToDirective(stmt);
        directives.push(directive);

        if (
          !hasStrictModeDirective &&
          directive.value.value === "use strict"
        ) {
          hasStrictModeDirective = true;
          this.setStrict(true);
        }

        continue;
      }
      parsedNonDirective = true;
      // clear strict errors since the strict mode will not change within the block
      this.state.strictErrors.clear();
    }
    body.push(stmt);
  }

  if (afterBlockParse) {
    afterBlockParse.call(this, hasStrictModeDirective);
  }

  if (!oldStrict) {
    this.setStrict(false);
  }

  this.next();
}
```

[parseStatementContent](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L250)根据`startType`类型解析不同的声明，比如`function/do/while/break`等，这里是`const`，会进入[parseVarStatement](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L802)。


```ts
export default class StatementParser extends ExpressionParser {
  parseStatement(context: ?string, topLevel?: boolean): N.Statement {
    if (this.match(tt.at)) {
      this.parseDecorators(true);
    }
    return this.parseStatementContent(context, topLevel);
  }

  parseStatementContent(context: ?string, topLevel: ?boolean): N.Statement {
    let starttype = this.state.type;
    const node = this.startNode();
    let kind;

    if (this.isLet(context)) {
      starttype = tt._var;
      kind = "let";
    }

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {
      case tt._break:
        return this.parseBreakContinueStatement(node, /* isBreak */ true);
      case tt._continue:
        return this.parseBreakContinueStatement(node, /* isBreak */ false);
      case tt._debugger:
        return this.parseDebuggerStatement(node);
      case tt._do:
        return this.parseDoStatement(node);
      case tt._for:
        return this.parseForStatement(node);
      case tt._function:
        // ...
      case tt._const:
      case tt._var:
        kind = kind || this.state.value;
        if (context && kind !== "var") {
          this.raise(this.state.start, Errors.UnexpectedLexicalDeclaration);
        }
        return this.parseVarStatement(node, kind);
      // ...
    }
  }

  parseVarStatement(
    node: N.VariableDeclaration,
    kind: "var" | "let" | "const",
  ): N.VariableDeclaration {
    this.next();
    this.parseVar(node, false, kind);
    this.semicolon();
    return this.finishNode(node, "VariableDeclaration");
  }
}
```

[parseVarStatement](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L802)又会调用[next](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L159) => [nextToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L298)，去解析下一个`token`，这个例子中是`a`。

```js
next(): void {
  this.checkKeywordEscapes();
  if (this.options.tokens) {
    this.pushToken(new Token(this.state));
  }

  this.state.lastTokEnd = this.state.end;
  this.state.lastTokStart = this.state.start;
  this.state.lastTokEndLoc = this.state.endLoc;
  this.state.lastTokStartLoc = this.state.startLoc;
  this.nextToken();
}
```

[parseVarStatement](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L802)之后会进入[parseVar](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L1107)，`parseVar`会新建一个`node`，作为`var`声明，然后调用[eat](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L174).

```js
parseVar(
  node: N.VariableDeclaration,
  isFor: boolean,
  kind: "var" | "let" | "const",
): N.VariableDeclaration {
  const declarations = (node.declarations = []);
  const isTypescript = this.hasPlugin("typescript");
  node.kind = kind;
  for (;;) {
    const decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(tt.eq)) {
      decl.init = isFor
        ? this.parseMaybeAssignDisallowIn()
        : this.parseMaybeAssignAllowIn();
    } else {
      if (
        kind === "const" &&
        !(this.match(tt._in) || this.isContextual(tt._of))
      ) {
        // `const` with no initializer is allowed in TypeScript.
        // It could be a declaration like `const x: number;`.
        if (!isTypescript) {
          this.raise(
            this.state.lastTokEnd,
            Errors.DeclarationMissingInitializer,
            "Const declarations",
          );
        }
      } else if (
        decl.id.type !== "Identifier" &&
        !(isFor && (this.match(tt._in) || this.isContextual(tt._of)))
      ) {
        this.raise(
          this.state.lastTokEnd,
          Errors.DeclarationMissingInitializer,
          "Complex binding patterns",
        );
      }
      decl.init = null;
    }
    declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(tt.comma)) break;
  }
  return node;
}
```

[eat](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L174)方法在`Tokenizer`中，这里会调用[next](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L159) => [nextToken](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L298) => [getTokenFromCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L83) => [ReadNumber](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/tokenizer/index.js#L1228)，解析下一个字符也就是`1`。然后返回`true`，进入[parseMaybeAssignDisallowIn](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/expression.js#L240)。

[parseMaybeAssignDisallowIn](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/expression.js#L240)这里不再展开了，最后会得到一个`type`为`NumericLiteral`类型的`Node`的节点，并赋值给`dcl.init`。

之后在[parseVar](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L1107)中调用`declarations.push(this.finishNode(decl, "VariableDeclarator"))`，结束`VariableDeclarator`这个`Node`的解析。

```js
eat(type: TokenType): boolean {
  if (this.match(type)) {
    this.next();
    return true;
  } else {
    return false;
  }
}
```

回到[parseVarStatement](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L802)中，最后调用`this.finishNode(node, "VariableDeclaration")`结束`VariableDeclaration`这个`Node`的解析。

回到[parseBlockOrModuleBlockBody](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L971)中，`smt`解析完后会放到`body`中，然后再次调用`next` => `nextToken`，这次`state.pos`为11，`this.length`也是11，会调用`finishToken(tt.eof)`。

回到[parseProgram](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L123)中，调用`finishNode(program, "Program")`，结束`program`的解析。

再回到[parseTopLevel](https://github.com/babel/babel/blob/v7.16.4/packages/babel-parser/src/parser/statement.js#L114)中，调用`this.finishNode(file, "File")`，结束`File`的解析。

```js
nextToken(): void {
  const curContext = this.curContext();
  if (!curContext.preserveSpace) this.skipSpace();
  this.state.start = this.state.pos;
  if (!this.isLookahead) this.state.startLoc = this.state.curPosition();
  if (this.state.pos >= this.length) {
    this.finishToken(tt.eof);
    return;
  }

  if (curContext === ct.template) {
    this.readTmplToken();
  } else {
    this.getTokenFromCode(this.codePointAtPos(this.state.pos));
  }
}
```

总结下`@babel/parser`对`const a = 1`的解析主流程：

1. 新建`File`类型的`Node`，暂命名为`NodeA`；
2. 新建`Program`类型的`Node`，命名为`NodeB`；
3. 解析`token`，获取`const`；
4. 进入`parser`，进入`parseVarStatement`，新建`VariableDeclaration`的`Node`，命名为`NodeC`；
5. 调用`next`再解析一个`token`，得到`a`；
6. 进入`parseVar`，新建`VariableDeclarator`的`Node`，命名为`NodeD`；
7. 调用`eat`，因为下一个字符为`=`，继续调用`next`，解析下一个字符`1`；
8. 进入`parseMaybeAssignDisallowIn`获取`NumericLiteral`类型的`Node`，命名为`NodeE`；
9. 将`NodeE`赋值给`NodeD`的`init`属性；
10. 将`NodeD`赋值给`NodeC`的`declarations`属性；
11. 将`NodeC`赋值给`NodeB`的`body`属性；
12. 将`NodeB`赋值给`NodeA`的`program`属性；
13. 返回`File`类型的`Node`节点。


下面贴一下`const a = 1`这个简单例子的AST（省略了`loc/errors/comments`等属性），也可以去[AST Explorer](https://astexplorer.net/)这个网站查看。

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


### 3. 流程图

下面是一张流程图，方便加深理解。

<img src="http://doc.uwayfly.com/babel-parser-structure.png" width="800">


## 五、总结

通过上面这个例子，可以看出：

1. 词法的解析和语法的解析，并不像许多文章中说的那样泾渭分明，不是先整体解析成`token`、再将`token`解析成AST，而是获得第一个`token`后就进行词法解析，也就是说会同时维护`Node`和`Token`。解析过程中，会不断地通过`nextToken`方法获取下一个`Token`。
2. `startNode`、`finishNode`，`startToken`、`finishToken`是成对存在的，可以理解为栈或洋葱模型。进入一个`Node`，最后一定会通过`finishNode`对`type/end`等属性进行赋值，`token`也是一样。


本文主要起抛砖引玉作用。对`@babel/parser`感兴趣的同学，建议深入阅读源码，如果有疑问，欢迎探讨。

## 六、系列文章

1. [Babel基础](https://juejin.cn/post/7041067247615344654)
2. [Babel源码解析之@babel/core](https://juejin.cn/post/7041068341754069006/)
3. Babel源码解析之@babel/parser
4. [Babel源码解析之@babel/traverse](https://juejin.cn/post/7041069084292677663/)
5. [Babel源码解析之@babel/generator](https://juejin.cn/post/7041069387607965710)


## 七、相关资料

1. [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)
2. [babel-handbook](https://github.com/jamiebuilds/babel-handbook)
3. [loose-mode](https://2ality.com/2015/12/babel6-loose-mode.html)

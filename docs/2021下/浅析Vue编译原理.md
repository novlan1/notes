## 一、开始

Vue的编译原理相对响应式来说，讨论的比较少，但深入理解编译原理有助于分析Vue的全貌。

Vue的编译流程大致如下，主要经历了`parse`、`optimize`、`generate`三个阶段：

1. `parse`，对`template`进行解析，生成AST
2. `optimize`，对AST进行优化，标注静态节点
3. `generate`，根据AST生成`render`函数

<img src="http://doc.uwayfly.com/vue-code-parser.png" width="700">


## 二、Vue版本

Vue有两个版本：

- `vue.js`： 完整版本，包含了模板编译的能力；
- `vue.runtime.js`： 运行时版本，不提供模板编译能力，需要通过 `vue-loader` 进行提前编译。

<img src="http://doc.uwayfly.com/vue-version.png" width="700">

什么时候需要编译器，什么时候不需要编译器呢？

```js
// 需要编译器
new Vue({
  template: '<div>{{ hi }}</div>'
})

// 不需要编译器
new Vue({
  render (h) {
    return h('div', this.hi)
  }
})
```

直接写`render`函数不需要编译器，写`template`模版就需要编译器。`render`函数不够直观，平时我们都是写`teamplate`模版。

- 如果用了`vue-loader`，`template`会在构建时被编译，我们可以使用 `vue.runtime.min.js`；
- 如果是在浏览器中直接通过`script`标签引入 Vue，需要使用`vue.min.js`，运行的时候编译模板。


## 三、编译入口

本次分析的是Vue的`v2.6.10`版本。

Vue的编译入口比较绕，主要是因为其考虑了参数和方法的复用。

在我们实例化Vue的时候，会调用[$mount](https://github.com/vuejs/vue/blob/v2.6.10/src/core/instance/init.js#L69)方法。

在带编译的Vue版本的入口文件`src/platforms/web/entry-runtime-with-compiler.js`中，看一下`$mount`方法：

```js
// src/platforms/web/entry-runtime-with-compiler.js
import { compileToFunctions } from './compiler/index'
const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (el) {
  const options = this.$options
  if (!options.render) {
    let template = options.template
    if (template) {
     const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
    }
  }
  return mount.call(this, el, hydrating)
}

```

`src/platforms/web/compiler/index.js`中：

```js
import { createCompiler } from 'compiler/index'
const { compile, compileToFunctions } = createCompiler(baseOptions)
export { compile, compileToFunctions }
```

`src/compiler/index`中：


```js
import { createCompilerCreator } from './create-compiler'
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```

`src/compiler/create-compiler.js`中：


```js
import { createCompileToFunctionFn } from './to-function'
export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      if (options) {
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      const compiled = baseCompile(template.trim(), finalOptions)
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
```

`src/compiler/to-function.js`中：


```js
function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}
export function createCompileToFunctionFn (compile: Function): Function {
  const cache = Object.create(null)

  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    options = extend({}, options)
    const warn = options.warn || baseWarn
    delete options.warn
    // check cache
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    if (cache[key]) {
      return cache[key]
    }

    // compile
    const compiled = compile(template, options)

    // turn code into functions
    const res = {}
    const fnGenErrors = []
    res.render = createFunction(compiled.render, fnGenErrors)
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    return (cache[key] = res)
  }
}
```

从上面可以看出，Vue的`$mount`判断如果没有`render`方法，会根据`template`调用`compileToFunctions`生成`render`，然后调用之前`mount`方法。

看一下调用链：

`compileToFunctions`由`createCompiler`生成，而`createCompiler`又是`createCompilerCreator`的返回结果，`createCompilerCreator`接受一个`baesCompile`参数，其类型为函数，这个`baesCompile`其实就是编译的主函数。

<img src="http://doc.uwayfly.com/vue-code-create-compiler.png" width="780">


## 四、编译流程

### 1. parse

`parse`方法主要引用了`parseHTML`进行解析，然后返回了AST根节点。

AST元素节点总共有3种类型，`type`为1表示是普通元素，2表示是表达式，3表示是纯文本

看下下面这段`template`：

```html
<div id="app">
  <ul :class="bindCls" class="list" v-if="isShow">
    <li v-for="(item,index) in data" @click="clickItem(index)">{{item}}:{{index}}</li>
  </ul>
</div>
```

`parse`过后的AST为：

```js
{
  type: 1,
  tag: 'div',
  attrsList: [{
    name: 'id',
    value: 'app',
    start: 5,
    end: 13,
  }],
  attrsMap: {
    id: 'app',
  },
  children: [
    // ...
  ],
  rawAttrsMap: {
    id: {
      name: 'id',
      value: 'app',
      start: 5,
      end: 13,
    },
  },
  start: 0,
  end: 175,
  plain: false,
  attrs: [{
    name: 'id',
    value: 'app',
    start: 5,
    end: 13,
  }],
  static: false,
  staticRoot: false,
}
```

`parseHTML`接收两个参数，`template`和`options`，`options.start`、`options.end`代表的是解析开始标签和结束标签的回调函数。


```js
export function parse (
  template: string,
  options: CompilerOptions
): ASTElement | void {
  warn = options.warn || baseWarn

  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    start (tag, attrs, unary, start) {
      // check namespace.
      // inherit parent ns if there is one
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

      // handle IE svg bug
      /* istanbul ignore if */
      if (isIE && ns === 'svg') {
        attrs = guardIESVGBug(attrs)
      }

      let element: ASTElement = createASTElement(tag, attrs, currentParent)
      if (ns) {
        element.ns = ns
      }

      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.start = start
        element.rawAttrsMap = element.attrsList.reduce((cumulated, attr) => {
          cumulated[attr.name] = attr
          return cumulated
        }, {})
      }

      // apply pre-transforms
      for (let i = 0; i < preTransforms.length; i++) {
        element = preTransforms[i](element, options) || element
      }

      if (!inVPre) {
        processPre(element)
        if (element.pre) {
          inVPre = true
        }
      }
      if (platformIsPreTag(element.tag)) {
        inPre = true
      }
      if (inVPre) {
        processRawAttrs(element)
      } else if (!element.processed) {
        // structural directives
        processFor(element)
        processIf(element)
        processOnce(element)
      }

      if (!root) {
        root = element
      }

      if (!unary) {
        currentParent = element
        stack.push(element)
      } else {
        closeElement(element)
      }
    },

    end (tag, start, end) {
      const element = stack[stack.length - 1]
      if (!inPre) {
        // remove trailing whitespace node
        const lastNode = element.children[element.children.length - 1]
        if (lastNode && lastNode.type === 3 && lastNode.text === ' ') {
          element.children.pop()
        }
      }
      // pop stack
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end
      }
      closeElement(element)
    },

    chars (text: string, start: number, end: number) {
      if (!currentParent) {
        return
      }
      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      const children = currentParent.children
      if (inPre || text.trim()) {
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text)
      } else if (!children.length) {
        // remove the whitespace-only node right after an opening tag
        text = ''
      } else if (whitespaceOption) {
        if (whitespaceOption === 'condense') {
          // in condense mode, remove the whitespace node if it contains
          // line break, otherwise condense to a single space
          text = lineBreakRE.test(text) ? '' : ' '
        } else {
          text = ' '
        }
      } else {
        text = preserveWhitespace ? ' ' : ''
      }
      if (text) {
        if (whitespaceOption === 'condense') {
          // condense consecutive whitespaces into single space
          text = text.replace(whitespaceRE, ' ')
        }
        let res
        let child: ?ASTNode
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          }
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          child = {
            type: 3,
            text
          }
        }
        if (child) {
          if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
            child.start = start
            child.end = end
          }
          children.push(child)
        }
      }
    },
    comment (text: string, start, end) {
      const child: ASTText = {
        type: 3,
        text,
        isComment: true
      }
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        child.start = start
        child.end = end
      }
      currentParent.children.push(child)
    }
  })
  return root
```

`parseHTML`是根据正则从开始便签，维护AST，其关键是对正则的解析。

这里有个[网站](https://jex.im/regulex/)可以对正则可视化。


### 2. optimize


```js
export function optimize (root, options) {
  if (!root) return
  // first pass: mark all non-static nodes.
  markStatic(root)
  // second pass: mark static roots.
  markStaticRoots(root, false)
}
```

`optimize`主要是调用`markStatic`标记静态节点，和`markStaticRoots`标记静态根节点。

这些标记出的静态节点在非首次`patch`阶段，生成DOM的时候，是不会变的，从而提高渲染性能。

### 3. generate

`generate`主要是调用`genElement`递归生成`code`，然后返回`render`函数和`staticRenderFns`。

```js
export function generate (
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  const state = new CodegenState(options)
  const code = ast ? genElement(ast, state) : '_c("div")'
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}
```

上面的例子生成的`render`函数为：

```js
with (this) {
  return _c('div', {
    attrs: {
      "id": "app"
    }
  },
  [(isShow) ? _c('ul', {
    staticClass: "list",
    class: bindCls
  },
  _l((data),
  function(item, index) {
    return _c('li', {
      on: {
        "click": function($event) {
          return clickItem(index)
        }
      }
    },
    [_v(_s(item) + ":" + _s(index))])
  }), 0) : _e()])
}
```

[with(this)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/with)的意思是下面的语句块的所有未声明属性，都来自于`with`后面的对象，这里是`this`。也就是避免了写`this._c`、`this._l`、`this._v`等等。

>with语法的本质是将某对象添加到作用域链的顶部，如果在statement中有某个未使用命名空间的变量，跟作用域链中的某个属性同名，则这个变量将指向这个属性值。


## 五、相关问题

>vue-loader中有对template的编译，vue的runtime+compiler版本也有对template的编译，二者有何联系和区别呢？

`vue-loader`中的[compiler](https://github.com/vuejs/vue-loader/blob/v15.9.8/lib/index.js#L19)是由`vue-template-compiler`引入的，这个库的源码在[vue/packages](https://github.com/vuejs/vue/blob/v2.6.10/packages/vue-template-compiler/index.js)中。

在[vue/scripts/config.js](https://github.com/vuejs/vue/blob/v2.6.10/scripts/config.js)中可以看出`vue-template-compiler`和`vue`是一起发布的。

`vue-template-compiler`的入口文件是[packages/vue-template-compiler/index.js](https://github.com/vuejs/vue/blob/v2.6.10/packages/vue-template-compiler/index.js)，其会比较`vue-template-compiler`和`vue`版本是否相同，如果不同会抛出错误，然后导出`./build.js`中的内容。

`build.js`是打包产物，其入口在[vue/scripts/config.js](https://github.com/vuejs/vue/blob/v2.6.10/scripts/config.js#L142)中可以看到，是`web/entry-compiler.js`。

```js
'web-compiler': {
  entry: resolve('web/entry-compiler.js'),
  dest: resolve('packages/vue-template-compiler/build.js'),
  format: 'cjs',
  external: Object.keys(require('../packages/vue-template-compiler/package.json').dependencies)
}
```

[web/entry-compiler.js](https://github.com/vuejs/vue/blob/v2.6.10/src/platforms/web/entry-compiler.js)内容如下，可以看到它其实和`vue`共用了`compiler`。

```js
// vue/src/platforms/web/entry-compiler.js
export { parseComponent } from 'sfc/parser'
export { compile, compileToFunctions } from './compiler/index'
export { ssrCompile, ssrCompileToFunctions } from './server/compiler'
export { generateCodeFrame } from 'compiler/codeframe'

// vue/src/sfc/parser.js
import { parseHTML } from 'compiler/parser/html-parser'
export function parseComponent(content, options) {
  function start() { /**/ }
  function end() { /**/ }
  function warn() { /**/ }
  
  parseHTML(content, {
    warn,
    start,
    end,
    outputSourceRange: options.outputSourceRange
  })
}
```

所以`vue-loader`和`vue`编译逻辑是基本相同的。

## 六、总结

本文简单介绍了下Vue的编译流程，对细节感兴趣的可以查看源码和阅读下方的相关资料。

Vue的编译因其特殊性，并没有借助`babel`或`acorn`，在阅读它的过程中，不禁感叹作者基本功多深厚，前端也可以如此精彩。


## 七、相关资料

1. [Vue.js技术揭秘](https://ustbhuangyi.github.io/vue-analysis/v2/compile/)
2. [Vue模板编译原理](https://juejin.cn/post/6863241580753616903)
3. [with - MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/with)
4. [JavaScript Regular Expression Visualizer](https://jex.im/regulex/)
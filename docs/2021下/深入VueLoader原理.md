## 一、开始

[上一篇文章](https://juejin.cn/post/7039916456514945037)分析了`Webpack`打包的原理，其中的`loader`用来转换非JS文件，这次来分析一个具体且常用的`loader`——`vue-loader`。

本文会从源码入手，详细分析`vue-loader`的工作原理，以及说明`Scoped CSS`、`CSS Modules`的实现原理。

下面是一张流程图：

<img src="http://doc.uwayfly.com/vue-loader-code-structure-2.png" width="600">

## 二、前置知识

### 1. [Pitching Loader](https://webpack.docschina.org/api/loaders/#pitching-loader)

`loader`用于对模块的源代码进行转换，因为`webpack`只能识别JS文件，`loader`的作用一般是将其他文件转为JS文件。

`loader`的调用顺序是从右到左，从下到上。但在实际执行`loader`之前，会从左到右，从上到下调用`loader`的[pitch](https://webpack.docschina.org/api/loaders/#pitching-loader)方法。

下面是[官网](https://webpack.docschina.org/api/loaders/#pitching-loader)的一个例子。

`webpack`配置如下：

```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        use: ['a-loader', 'b-loader', 'c-loader'],
      }
    ]
  }
}
```

将发生的步骤为：

```
|- a-loader `pitch`
  |- b-loader `pitch`
    |- c-loader `pitch`
      |- requested module is picked up as a dependency
    |- c-loader normal execution
  |- b-loader normal execution
|- a-loader normal execution
```


`pitching loader`的一个作用是可以共享数据。`pitch`的第三个参数`data`，会暴露给`loader`的`this.data`，比如下面的例子：

```js
module.exports = function (content) {
  return someSyncOperation(content, this.data.value);
};

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
  data.value = 42;
};
```

另一个作用是当一个`loader`的`pitch`方法返回非`undefined`时，会中断后面`loader`的执行，比如若上面例子中的`b-loader`如下：

```js
module.exports = function (content) {
  return someSyncOperation(content)
}

module.exports.pitch = function () {
  return 'export {}'
}
```

则`loader`的执行顺序会缩减为：

```
|- a-loader `pitch`
  |- b-loader `pitch` returns a module
|- a-loader normal execution
```

### 2. [内联loader](https://webpack.docschina.org/concepts/loaders/#inline)

`loader`有两种使用方式：配置方式和内联方式。
- 配置方式是我们常用的方式，就是在`webpack.config.js`中使用`loader`。
- 内联方式是在`import/require`语句中显示的指定`loader`。

内联方式使用`loader`的示例如下：

```js
import Styles from 'style-loader!css-loader?modules!./styles.css';
```

`!`将多个loader分割，行内`loader`调用顺序还是从右到左，所以上述语句意思为对`./style.css`文件依次使用`css-loader`和`style-loader`处理，并且`css-loader`传递了参数`modules`。


与上面语句等价的`webpack`配置如下：

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          },
          { loader: 'sass-loader' }
        ]
      }
    ]
  }
};
```


可以为内联`import`语句增加前缀，来覆盖配置中的`loader`、`preLoader`、`postLoader`。

- 使用`!`前缀，将禁用所有的`normal loader`(普通loader)
  `import Styles from '!style-loader!css-loader?modules!./styles.css';`
- 使用`!!`前缀，将禁用所有已配置的`loader`(`preLoader`、`loader`、`postLoader`)
  `import Styles from '!!style-loader!css-loader?modules!./styles.css';`
- 使用`-!`前缀，将禁用所有已配置的`preLoader`和`loader`，但不禁用`postLoader`
  `import Styles from '-!style-loader!css-loader?modules!./styles.css';`

### 3. [resourceQuery](https://webpack.docschina.org/configuration/module/#ruleresourcequery)

在配置`loader`时，大部分时候通过配置`test`字段，来匹配文件：

```js
{
  test: /\.vue$/,
  loader: 'vue-loader'
}

// 当引入vue后缀文件时，将文件内容传输给vue-loader进行处理
import Foo from './source.vue'
```

`resourceQuery`可以根据文件的引用路径参数来匹配文件，当引入文件路径携带`query`参数匹配时，也将加载该`loader`

```js
{
  resourceQuery: /vue=true/,
  loader: path.resolve(__dirname, './test-loader.js')
}

// 下面两个文件会经test-loader处理
import './test.js?vue=true'
import Foo from './source.vue?vue=true'
```

## 三、vue-loader原理

本次分析的版本为[v15.9.8](https://github.com/vuejs/vue-loader/tree/v15.9.8)。

`vue-loader`的使用方式如下，注意要同时配置`VueLoaderPlugin`。

```js
// webpack.config.js
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  module: {
    rules: [
      // ... 
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
}
```

### 1. VueLoaderPlugin

先看下`VueLoaderPlugin`的作用：

```js
// plugin-webpack4.js
const RuleSet = require('webpack/lib/RuleSet')

class VueLoaderPlugin = {
  apply(compiler) {

    // use webpack's RuleSet utility to normalize user rules
    const rawRules = compiler.options.module.rules
    const { rules } = new RuleSet(rawRules)

    // for each user rule (except the vue rule), create a cloned rule
    // that targets the corresponding language blocks in *.vue files.
    const clonedRules = rules
      .filter(r => r !== vueRule)
      .map(cloneRule)

    const pitcher = {
      loader: require.resolve('./loaders/pitcher'),
      resourceQuery: query => {
        const parsed = qs.parse(query.slice(1))
        return parsed.vue != null
      },
      options: {
        cacheDirectory: vueLoaderUse.options.cacheDirectory,
        cacheIdentifier: vueLoaderUse.options.cacheIdentifier
      }
    }
    
    // replace original rules
    compiler.options.module.rules = [
      pitcher,
      ...clonedRules,
      ...rules
    ]
  }
}
module.exports = VueLoaderPlugin
```

`VueLoaderPlugin`先获取了`webpack`原来的`rules`，然后创建了`pitcher`规则，其作用是对`query`中包含`vue`的文件，使用`./loaders/pitcher`中的`loader`，也就是`PitcherLoader`。

然后为携带了`?vue&lang=xx`这种`query`参数的文件，创建和`.xx`文件一样的规则。比如`query`中携带`?vue&lang=ts`，则复制并应用用户为`.ts`定义的规则，比如`ts-loader`。这些复制的规则称为`clonedRules`。

然后将`[pitcher, ...clonedRules, ...rules]`作为新的`rules`。


### 2. 第一阶段

`vue-loader`的入口文件是`lib/index.js`，其导出了一个方法。`webpack`处理`vue`文件的过程中，会调用两次此方法。

第一次是是通过`parse`方法，将`.vue`文件按照`teplate/script/style`类型分为多个块。

```js
const { parse } = require('@vue/component-compiler-utils')

function loadTemplateCompiler() {
  return require('vue-template-compiler')
}

module.exports = function (source) {
  const {
    resourceQuery = '',
    resourcePath
  } = loaderContext = this;

  const descriptor = parse({
    source,
    compiler: loadTemplateCompiler(loaderContext),
  })

  // template
  let templateImport = `var render, staticRenderFns`
  let templateRequest
  if (descriptor.template) {
    const src = descriptor.template.src || resourcePath
    const idQuery = `&id=${id}`
    const scopedQuery = hasScoped ? `&scoped=true` : ``
    const attrsQuery = attrsToQuery(descriptor.template.attrs)
    const query = `?vue&type=template${idQuery}${scopedQuery}${attrsQuery}${inheritQuery}`
    const request = templateRequest = stringifyRequest(src + query)
    templateImport = `import { render, staticRenderFns } from ${request}`
  }

  // script
  let scriptImport = `var script = {}`
  if (descriptor.script) {
    const src = descriptor.script.src || resourcePath
    const attrsQuery = attrsToQuery(descriptor.script.attrs, 'js')
    const query = `?vue&type=script${attrsQuery}${inheritQuery}`
    const request = stringifyRequest(src + query)
    scriptImport = (
      `import script from ${request}\n` +
      `export * from ${request}` // support named exports
    )
  }

  // styles
  let stylesCode = ``
  if (descriptor.styles.length) {
    stylesCode = genStylesCode(
      loaderContext,
      descriptor.styles,
      id,
      resourcePath,
      stringifyRequest,
      needsHotReload,
    )
  }
   let code = `
${templateImport}
${scriptImport}
${stylesCode}

/* normalize component */
import normalizer from ${stringifyRequest(`!${componentNormalizerPath}`)}
var component = normalizer(
  script,
  render,
  staticRenderFns,
  ${hasFunctional ? `true` : `false`},
  ${/injectStyles/.test(stylesCode) ? `injectStyles` : `null`},
  ${hasScoped ? JSON.stringify(id) : `null`},
  ${isServer ? JSON.stringify(hash(request)) : `null`}
  ${isShadow ? `,true` : ``}
)
  `.trim() + `\n`

  code += `\nexport default component.exports`
  return code
}
```

`@vue/component-compiler-utils`的`parse`方法如下：


```js
function parse(options) {
  const {
    source,
    filename = '',
    compiler,
    compilerParseOptions = { pad: 'line' },
    sourceRoot = '',
    needMap = true
  } = options
  const cacheKey = hash(
    filename + source + JSON.stringify(compilerParseOptions)
  )
  let output = cache.get(cacheKey)
  if (output) return output
  output = compiler.parseComponent(source, compilerParseOptions)
  
  if (needMap) {
    if (output.script && !output.script.src) {
      output.script.map = generateSourceMap()
    }
    if (output.styles) {
      output.styles.forEach(style => {
        if (!style.src) {
          style.map = generateSourceMap()
        }
      })
    }
  }
  cache.set(cacheKey, output)
  return output
}
```

`parse`方法先判断是否有缓存，有的话直接返回缓存内容，否则，调用`compiler.parseComponent(source)`获取`output`，然后如果需要`sourcemap`，则在`output.script`和`output.styles`中赋值`map`属性，最后返回`output`。

这里的`compiler`就是`vue-template-compiler`导出的`compiler`方法。

`@vue/component-compiler-utils`这个库的名称副其实，只是个工具，核心逻辑还是在其他库中，比如这里的`vue-template-compiler`。

上面的`compiler.parseComponent`方法在`vue/src/sfc/parser.js`中，其会返回如下结构的对象：

```js
{
  template: null,
  script: null,
  styles: [],
  customBlocks: [],
  errors: []
}
```

`vue-loader`对`descriptor`的`template/script/style`等部分做判断，拼接出各自新的引用路径，其导出的内容示例如下：

```js
import { render, staticRenderFns } from "./empty-state.vue?vue&type=template&id=619de588&scoped=true&"
import script from "./empty-state.vue?vue&type=script&lang=js&"
export * from "./empty-state.vue?vue&type=script&lang=js&"
import style0 from "./empty-state.vue?vue&type=style&index=0&id=619de588&scoped=true&lang=scss&"

/* normalize component */
import normalizer from "!../../../../../../node_modules/vue-loader/lib/runtime/componentNormalizer.js"
var component = normalizer(
  script,
  render,
  staticRenderFns,
  false,
  null,
  "619de588",
  null
  
)

export default component.exports
```

### 3. 第二阶段


上面讲到的`VueLoaderPlugin`中，如果文件`query`中包含`vue`，则会应用`pitcherLoader`。

第一阶段导出的内容带有`vue`参数，会触发`pitcherLoader`的调用。看下`pitcherLoader`的源码：

```js
const templateLoaderPath = require.resolve('./templateLoader')
const isPitcher = l => l.path !== __filename
const isPreLoader = l => !l.pitchExecuted
const isPostLoader = l => l.pitchExecuted

module.exports = code => code

module.exports.pitch = function () {
  const query = qs.parse(this.resourceQuery.slice(1))
  let loaders = this.loaders

  // remove self
  loaders = loaders.filter(isPitcher)

  const genRequest = loaders => {
    const seen = new Map()
    const loaderStrings = []

    loaders.forEach(loader => {
      const identifier = typeof loader === 'string'
        ? loader
        : (loader.path + loader.query)
      const request = typeof loader === 'string' ? loader : loader.request
      if (!seen.has(identifier)) {
        seen.set(identifier, true)
        loaderStrings.push(request)
      }
    })

    return loaderUtils.stringifyRequest(this, '-!' + [
      ...loaderStrings,
      this.resourcePath + this.resourceQuery
    ].join('!'))
  }

  if (query.type === `style`) {
    const cssLoaderIndex = loaders.findIndex(isCSSLoader)
    if (cssLoaderIndex > -1) {
      const afterLoaders = loaders.slice(0, cssLoaderIndex + 1)
      const beforeLoaders = loaders.slice(cssLoaderIndex + 1)
      const request = genRequest([
        ...afterLoaders,
        stylePostLoaderPath,
        ...beforeLoaders
      ])
      return query.module
        ? `export { default } from  ${request}; export * from ${request}`
        : `export * from ${request}`
    }
  }

  if (query.type === `template`) {
    const preLoaders = loaders.filter(isPreLoader)
    const postLoaders = loaders.filter(isPostLoader)

    const request = genRequest([
      ...cacheLoader,
      ...postLoaders,
      templateLoaderPath + `??vue-loader-options`,
      ...preLoaders
    ])
    return `export * from ${request}`
  }
  
  const request = genRequest(loaders)
  return `import mod from ${request}; export default mod; export * from ${request}`
}
```

`pitcherLoader`的`noraml loader`部分未做任何操作，直接返回了之前的`code`，所以核心在`pitch`方法上。

由于`pitch`方法返回了非`undefined`，且它是第一个`loader`，所以会跳过之后的`loader`。

`pitcherLoader`的作用是将之前文件的`query`，根据参数`type`，替换成相应的带`loader`的`query`，也就是上面提到的内联`loader`。

对于`type=template`文件的引用，比如：

```js
import { render, staticRenderFns } from "./create-team-dialog.vue?vue&type=template&id=127d8294&scoped=true&"
```

则`pitcherLoader`会将该文件的引用替换为：

```js
export * from "-!../../../../../../node_modules/cache-loader/dist/cjs.js?{\"cacheDirectory\":\"node_modules/.cache/vue-loader\",\"cacheIdentifier\":\"2f391a00-vue-loader-template\"}!../../../../../../node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!../../../../../../node_modules/cache-loader/dist/cjs.js??ref--0-0!../../../../../../node_modules/vue-loader/lib/index.js??vue-loader-options!./create-team-dialog.vue?vue&type=template&id=127d8294&scoped=true&"
```

行内`loader`的执行顺序是从右到左，也就是依次执行`vue-loader`、`cache-loader`、`templateLoader`、`cache-loader`。

下面是一个`type`为`style`的文件转化结果：

```js
import mod from "-!../../../../../node_modules/vue-style-loader/index.js??ref--6-oneOf-1-0!../../../../../node_modules/css-loader/dist/cjs.js??ref--6-oneOf-1-1!../../../../../node_modules/vue-loader/lib/loaders/stylePostLoader.js!../../../../../node_modules/postcss-loader/src/index.js??ref--6-oneOf-1-2!../../../../../node_modules/postcss-loader/src/index.js??ref--6-oneOf-1-3!../../../../../node_modules/cache-loader/dist/cjs.js??ref--0-0!../../../../../node_modules/vue-loader/lib/index.js??vue-loader-options!./gp.vue?vue&type=style&index=0&id=6e34f811&scoped=true&lang=css&";
export default mod;
export * from "/*引用地址同上*/"
```

对于上述样式文件，`loader`的执行顺序为：`vue-loader`、`cache-loader`、`postcss-loader * 2`、`vue-loader/stylePostLoader`、`css-loader`、`vue-style-loader`。

对于`type=script`的文件来说，会走到最后一个逻辑，把原来的`loaders`通过`genRequest`转为`request`参数，覆盖之前的文件引用。

```js
const request = genRequest(loaders)
return `import mod from ${request}; export default mod; export * from ${request}`
```

`pitcherLoader`对`query`参数中含`vue`的文件，进行了上述引用的替换，替换后会依次调用`query`上的内联`loader`。内联的第一个`loader`是`vue-loader`，所以会再次调用`vue-loader`。


### 4. 第三阶段

这一次`vue-loader`做的事情比较简单，仅是根据`query.type`去执行下一个`loader`。

```js
module.exports = function (source) {
  const incomingQuery = qs.parse(resourceQuery.slice(1))
  if (!incomingQuery.type) {
    // 第二次进入vue-loader时
    return selectBlock(
      descriptor,
      loaderContext,
      incomingQuery,
    )
  }
}

function selectBlock() {
  if (query.type === `template`) {
    if (appendExtension) {
      loaderContext.resourcePath += '.' + (descriptor.template.lang || 'html')
    }
    loaderContext.callback(
      null,
      descriptor.template.content,
      descriptor.template.map
    )
    return
  }
  if (query.type === `script`) {
  }
  if (query.type === `style`) {
  }
  if (query.type === `custom`) {
  }
  //...
}
```

对于`type=template`的部分来说，`pitcherLoader`中插入了`templateLoader`，该`loader`在`lib/loaders/templateLoader.js`中：

```js
const { compileTemplate } = require('@vue/component-compiler-utils')

module.exports = function (source) {
  // ...
  const compiled = compileTemplate(finalOptions)
  const { code } = compiled
  return code + `\nexport { render, staticRenderFns }`
}
```

`templateLoader`调用了`@vue/component-compiler-utils`的`compileTemplate`方法，返回一个对象，包含了`render`方法，其实这就是`vue-loader`最核心的功能，即把组件转为`render`函数。

下面是一个例子：

```js
var render = function() {
	var _vm = this;
	var _h = _vm.$createElement;
	var _c = _vm._self._c || _h;
	return _c('div', {
		staticClass: "wrap"
	},
	[_c('a', {
		staticClass: "tip-toc-commbtn tip-btn-primary",
		on: {
			"click": function($event) {
				$event.stopPropagation();
				return _vm.enterGame($event)
			}
		}
	},
	[_vm._v("进入游戏")])])
}
var staticRenderFns = []
export { render, staticRenderFns }
```

对于`type=style`的部分来说，`pitcherLoader`中插入了`stylePostLoader`，该`loader`在`lib/loaders/stylePostLoader.js`中：

```js
const { compileStyle } = require('@vue/component-compiler-utils')

module.exports = function (source, inMap) {
  const query = qs.parse(this.resourceQuery.slice(1))
  const { code, map, errors } = compileStyle({
    source,
    filename: this.resourcePath,
    id: `data-v-${query.id}`,
    map: inMap,
    scoped: !!query.scoped,
    trim: true
  })

  if (errors.length) {
    this.callback(errors[0])
  } else {
    this.callback(null, code, map)
  }
}
```

`stylePostLoader`调用了`compileStyle`，它的一个作用是，对含有`scoped`属性`style`中的属性选择器前加上`[data-v-hash]`。

`style`部分后面会经过`style-loader`添加到`head`中，或者通过`miniCssExtractPlugin`提取到一个公共的`css`文件中。


获取到`script`、`render`和`staticRenderFns`，在运行时会调用`normalizeComponent`，返回`component`，其包含`options`和`exports`。

## 四、总结

下面总结下`vue-loader`的工作流程：

1. 将`.vue`文件分割成`template/script/styles`三个部分
2. `template`部分经过`pitcherLoader`、`templateLoader`，最终会通过`compile`生成`render`和`staticRenderFns`
3. 获取`script`部分，命名为`script`，在后面的`normalizeComponent`中会用到，并导出`script`。
4. `styles`部分经过`pitcherLoader`、`stylePostLoader`，最终会通过`css-loader`、`vue-style-loader`添加到`head`中，或者通过`css-loader`、`miniCssExtractPlugin`提取到一个公共的`css`文件中。
5. 使用`vue-loader`的`normalizeComponent`方法，合并`script`、`render和staticRenderFns`，返回`component`，其包含`options`和`exports`。

看下`scoped css`工作流程：

1. `vue-loader`在处理`.vue`文件的`template`部分时，会根据文件路径和文件内容生成`hash`值。
2. 如果`.vue`文件中有`scoped`的`style`标签，则生成一个`scopedId`，形如`data-v-hash`，这里的`hash`就是上面的`hash`值。
3. 对于`vue`中的`style`部分，`vue-loader`会在`css-loader`前增加自己的`stylePostLoader`，`stylePostLoader`会给每个选择器增加属性`[data-v-hash]`，然后通过`style-loader`把`css`添加到`head`中，或通过`miniCssExtractPlugin`把`css`提取成单独的文件。
4. `vue-loader`的`normalizeComponent`方法，判断如果`vue`文件中有`scoped`的`style`，则其返回的`options._scopeId`为上面的`scopedId`.
5. 上面的`_scopedId`在`vnode`渲染生成 DOM 的时候会在`dom`元素上增增加` scopedId`，也就是增加` data-v-hash`。

经过上面的过程，实现了CSS的模块私有化。

另外简要说一下`css modules`原理：

1. `vue-loader`在处理`.vue`文件时，遇到含有`module`的`style`标签，会在生成的`code`中注入`injectStyles`方法，该方法会执行`this["a"] = (style0.locals || style0)`或者`this["$style"] = (style1.locals || style1)`，从而在vue文件中可以使用`this.$style.class0`等引入模块化的类和`id`。
2. `css-loader`对`vue`文件中`style`部分解析，导出`locals`属性，将原来的类名和`id`转为唯一的值。
3. `normalizeComponent`中判断如果含有`injectStyles`，则会将`render`方法包装成含有`injectStyles`的`renderWithStyleInjection`方法。`vue`实例化的时候，会首先执行`injectStyles`方法，然后执行原来的`render`方法。这样`vue`实例上就能拿到`$style`的类名和`id`了，也就实现了CSS的模块化。



## 五、相关资料

1. [vue-loader 深入学习](https://juejin.cn/post/6844903930187497480)
2. [一文读懂 vue-loader 原理](https://juejin.cn/post/7028410359207690247)
3. [深入 vue-loader 原理](https://juejin.cn/post/6994468137584295973)
4. [从vue-loader源码分析CSS Scoped的实现](https://juejin.cn/post/6844903949900742670)
5. [css-loader style-loader原理探究](https://blog.csdn.net/huige232508/article/details/108221449)
6. [less-loader、css-loader、style-loader实现原理](https://juejin.cn/post/6944668149849522213)
7. [webpack的几个常见loader源码浅析](https://blog.csdn.net/frontend_frank/article/details/105631717)
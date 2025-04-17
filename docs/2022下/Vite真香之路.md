## 一、开始

近期将几个项目的脚手架从 Vue-CLI 替换成了 Vite，直呼真香，原来冷启动2分多钟，现在只要几秒，对于需要频繁切项目的人来说，真的是开发利器。

当前 Vite 的优点不止于此，这篇文章不探讨 Vite 的优势，只记录下从 Vue-CLI 转 Vite 踩的一些坑。


## 二、问题记录

提前说明下，以下问题的解决方法可能有多种，这里选用的是对业务库改动最小的，原因是：

1. 一个项目往往有多个开发者，不希望改动会对之前的 Vue-CLI 启动或者打包造成影响
2. 配置文件会抽取到基础库中，使用的项目会有很多，如果改动大意味着成本会很高，出错的概率也更大




### 1. 环境变量



Vite 在一个特殊的 import.meta.env 对象上暴露环境变量，Vue-CLI 是基于webpack，它是在 process.env 上挂载的。

此外，还有一个不同点是，原来的 vue.config.js 是能直接通过 process.env 拿到环境变量的，vite.config.js 却不能直接拿到，需要开发者自己调用 loadEnv 加载。

还有 Vite 只暴露以 VITE_ 开头的环境变量给客户端，Vue-CLI 中是 VUE_APP_ 开头。

对应的处理如下，通过 define 替换全局变量，这种方式目前来看是安全的。

```ts
import { loadEnv } from 'vite';

const ENV_PREFIX = ['VITE_', 'VUE_APP'];

export default ({ mode, serverProxy }) => {
  const envMap = loadEnv(mode, process.cwd(), ENV_PREFIX) || {};
  const appDir = envMap.VUE_APP_DIR;

  return defineConfig({
    root: `${path.resolve(curDirname, `./src/${appDir}`)}/`,
    define: {
      'process.env': {
        ...envMap,
        NODE_ENV: mode,
      },
    },
  })
}
```


### 2. index.html处理

Vite 中默认 index.html 在项目根目录下，也就是和 vite.config.js 同一层级，但是我们的大多数项目是 monorepo 模式，index.html 在 src/project/some-project下。

解决方法是设置root:

```ts
{
  root: `${path.resolve(curDirname, `./src/${appDir}`)}/`,
}
```

但是，只有这个还不行，默认的 index.html 中是没有 `<script type="module" src="./src/project/some-project/main.js"></script>` 这一句的，所以要写个插件，当加载 index.html 时，动态插入这一句。

打包的时候发现另一个问题，只打包出来 index.html，其他js等文件没有被打包，猜测是打包的时候找不到 main.js，于是给插件增加配置`enforce: pre`。

下面是插件核心代码：

```ts
return {
  name: 'vite-plugin-transform-html',
  enforce: 'pre',
  transformIndexHtml(html) {
    return html.replace(
      /<\/head>/,
      `<script type="module" src="./main.js"></script>
  </head>`,
    );
  },
};
```

后面发现，生产环境不会触发`transformIndexHtml`方法，上面代码并没有效果，于是优化成：

```ts
const res = {
  name: 'vite-plugin-transform-html',
  enforce: 'pre',
};

if (mode === 'development') {
  return {
    ...res,
    transformIndexHtml(code) {
      return transformIndexHtml(code, mode);
    },
  };
}

return {
  ...res,
  transform(code, id) {
    if (id?.endsWith('.html')) {
      return transformIndexHtml(code, mode);
    }
  },
};
```



### 3. 预构建缓存问题

Vite有个预构建阶段，用于将`commonjs/UMD`模块转为ESM，和合并多个模块。就是把一些模块处理后放在`node_modules/.vite/deps`目录下，项目启动时直接引用这个目录下的内容。

值得注意的是，这一阶段是有缓存的，且存在两处缓存，一处是`.vite/deps`下的缓存，一处是浏览器的缓存。如果发现修改了插件，但是观察不到效果，可以尝试`npx vite --fore`，以及禁用浏览器缓存。


### 4. vue2/vue3并存


有个公共库是同时支持vue2/vue3的，比如有个extend-comp功能，用来扩展组件，代码如下：

```ts
import Vue, { createApp } from 'vue';

export function extendComp(arg: ExtendCompParam) {
  if (Vue?.version?.startsWith?.('2')) {
    return extendV2(arg);
  }
  if (typeof createApp === 'function') {
    return extendV3(arg);
  }
  return extendV2(arg);
}
```

它的顶部会尝试引用 createApp，如果是vue2的项目，它会报错，之前的兼容方案是扩展下vue的类型声明:

```ts
import 'vue/types/index';

declare module 'vue/types/index' {
  function createApp(c: any, d?: any): any;
}
```

现在vite的预构建，会直接报错，因为vue依然没导出createApp，想到一个方式是写个插件在最底部加上createApp的导出，核心代码如下：

```ts
return {
  transform(source, id) {
    if (id.indexOf('vue.js') > -1 || id.indexOf('vue.runtime.esm.js') > -1) {
      return `${source}

  export const createApp = () => {}
`;
    }
    return source;
  },
};
```


### 5. vue组件的动态导入


vue动态导入有多种方式，Vite可以支持 `xxComp: ()=>import('xx.vue')`，不支持 `xxComp(resolve){ require(['xx.vue'], resolve) }`，可以手动改业务库，但我们的目标是尽可能少的改项目，所以也可以写个插件，用于替换源代码，核心代码如下：

```ts
return {
  transform(source, id) {
    if (id.indexOf('.vue') === -1) {
      return source;
    }
    const reg = new RegExp(/([a-zA-Z]+?)\(resolve\)(?:\s*?)\{(?:\n\s*)require\(\['(.*?)'\],(?:\s*?)resolve\);(?:\n\s*)\}/, 'g');
    const match = source.match(reg);
    if (match?.[1] && match[2]) {
      const res = source.replace(reg, (match, originA, originB) => `${originA}: () => import('${originB}')`);
      return res;
    }
    return source;
  },
};
```


### 6. Vant样式按需加载

这个问题只要使用一下`vite-plugin-style-import`就可以。

```ts
import {
  createStyleImportPlugin,
  VantResolve,
} from 'vite-plugin-style-import';
// ...
plugins: [
  createStyleImportPlugin({
    resolves: [
      VantResolve(),
    ],
  }),
]
```


### 7. externals配置

关于external的Vite插件众多，这里用的是`vite-plugin-externals`。

```ts
import { viteExternalsPlugin } from 'vite-plugin-externals';
// ...
plugins: [
  viteExternalsPlugin({
    vue: 'Vue',
    'vue-router': 'VueRouter',
    vuex: 'Vuex',
    axios: 'axios',
    'vue-lazyload': 'VueLazyload',
  }),
]
```


### 8. proxy配置

部分项目需要配置proxy，配置如下。

```ts
const serverProxy = {
  '/xxx-cgi': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
    rewrite: path => path.replace(/^\/xxx-cgi/, ''),
  },
};
// ...
server: {
  proxy: {
    ...serverProxy,
  },
},
```

### 9. sass相关

Vite 中要想支持scss文件，需要安装sass，注意不是node-sass，这会引起另一个问题，`/deep/`会报错，需要将 `/deep/` 换成 `::v-deep`，这两个作用一样，都可以在scoped下修改子组件样式，一些文章说`::v-deep`性能更佳。


此外，某些项目有这种写法：

```scss
$--font-path: "~element-ui/lib/theme-chalk/fonts";
```

这种引用方式Vite默认情况下是无法识别的，最简单的方式是改成：

```scss
$--font-path: "node_modules/element-ui/lib/theme-chalk/fonts";
```

### 10. BASE_URL

之前index.html中的这种写法会报错：

```html
<link rel="icon" href="<%= BASE_URL %>favicon.ico" />
```

报错信息为： 

```bash
[vite] Internal server error: URI malformed
```

解决方法是写个插件替换下：

```ts
res = code.replace(/<%=\s+BASE_URL\s+%>/g, baseDir);
```


### 11. 编译时动态加载对应的样式

值得注意的是下面这行代码不会报错，所以当要找的样式文件不存在时，可以直接用空字符串替换。

```html
<style lang="scss" scoped src=""></style>
```

如何判断要找的文件存不存在呢，如何判断当前操作的文件目录呢？用`path.dirname(id)`就可以，相关插件代码如下：

```ts
transform(source, id) {
  let res = source;

  if (res.indexOf(STYLE_KEYWORD) !== -1) {
    const styleName = getStyleName(appDir);
    const curDir = path.dirname(id);

    let pureCSSLink = `./css/${styleName}.scss`;
    const cssLink = path.resolve(curDir, pureCSSLink);

    const isExist = fs.existsSync(cssLink);
    if (!isExist) {
      pureCSSLink = '';
    }

    res = res.replace(new RegExp(STYLE_KEYWORD, 'g'), pureCSSLink);
  }
  return res;
}
```


### 12. 分包策略

关于分包策略没有标准答案，每个项目都有自己的特点，目前我们项目采用的是这种：


```ts
const SPLIT_CHUNK_CONFIG = [
  {
    match: /[\\/]src[\\/]_?common(.*)/,
    output: 'chunk-common',
  },
  {
    match: /[\\/]src[\\/]_?component(.*)/,
    output: 'chunk-component',
  },
  {
    match: /[\\/]src[\\/]_?logic(.*)/,
    output: 'chunk-logic',
  },
];

const rollupOptions = {
  output: {
    chunkFileNames: 'assets/js/[name]-[hash].js',
    entryFileNames: 'assets/js/[name]-[hash].js',
    assetFileNames: 'assets/static/[name]-[hash].[ext]',
    manualChunks(id) {
      for (const item of SPLIT_CHUNK_CONFIG) {
        const { match, output } = item;

        if (match.test(id)) {
          return output;
        }
      }

      if (id.includes('node_modules')) {
        return id.toString().split('node_modules/')[1].split('/')[0].toString();
      }
    },
  },
},
```

### 13. Vue2中支持JSX

在Vue-CLI中是默认支持Vue2+JSX的，也就是不需额外配置，但是vite+vue2项目中，如果直接写jsx会报错，报错信息如下：

```
[vite] Internal server error: Failed to parse source for import analysis because the content contains invalid JS syntax. Install @vitejs/plugin-vue to handle .vue files.
```

尽管上面提示让你安装`@vitejs/plugin-vue`这个库，但是这个是for Vue3 版本的，如果加上它，会报额外的的错误，说这个库仅服务于Vue3。

那怎么办呢，很简单，在使用JSX的script的地方加上：

```js
<script lang="jsx">
```

然后在`vite.config.js`中，为`vite-plugin-vue2`这个插件增加`jsx: true`的选项。

```ts
import { createVuePlugin } from 'vite-plugin-vue2';

// ...
plugins: [
  createVuePlugin({
    jsx: true,
  }),
  // ...
]
```


### 14. qrcodejs2报错

报错信息如下：

```
TypeError: Cannot read properties of undefined (reading '_android')
```

这个问题其实是判断的不严谨，已经有很多issue了，比如[159](https://github.com/davidshimjs/qrcodejs/issues/159)，也有人提了[PR](https://github.com/davidshimjs/qrcodejs/commit/68668bc3574152d2296c565674a22b5679896edb)，甚至合了，但是没发布版本。。


```ts
if (this._android && this._android <= 2.1) {
  var factor = 1 / window.devicePixelRatio;
  // ...
}
```


知道了问题，解决办法就很多了，可以fork下，自己发个包，也可以写个Vite插件转换下代码。

此外，有个问题是，在Vue-CLI中为什么不会报错呢？

因为Vite中使用的是ESM模块，默认会使用严格模式，“禁止this指向全局对象”。而Vue-CLI中使用的是UMD方式加载，在浏览器中会顶层的this等于window，所以不会报错。



### 15. 使用 path-browserify 

不要在前端项目中使用：

```ts
import path from 'path'
```

会报错：

```
Error in render: "Error: Module "path" has been externalized for browser compatibility and cannot be accessed in client code."
```

而应该使用`path-browserify`：


```ts
import path from 'path-browserify';
```

如果是用 path.resolve 方法，这样还是不行的，因为 resolve 方法里面使用了 process.cwd 方法，而 Vite 是没有注入 process 这个变量的。

有多个解决方法：
1. 安装`process`包，然后在项目中执行 `window.process = process`，注意不要与vite.config.js中define变量冲突。
2. 写个Vite插件用来转换源码，开发环境替换为真实的`process.cwd()`对应的字符串，生产环境替换成`/`
3. 自己写`path.resolve`方法，不用第三方库

```ts
// 模拟path.resolve()
function resolve(...paths) {
  let resolvePath = '';
  let isAbsolutePath = false;
  let cwd;

  for (let i = paths.length - 1; i >= -1; i--) {
    let path;
    if (isAbsolutePath) {
      break;
    }
    if (i >= 0) {
      path = paths[i];
    } else {
      if (cwd === undefined) {
        cwd = process.cwd();
      }
      path = cwd;
    }
    if (!path) {
      continue;
    }
    resolvePath = `${path}/${resolvePath}`;
    isAbsolutePath = path.charCodeAt(0) === 47;
  }
  if (/^\/+$/.test(resolvePath)) {
    resolvePath = resolvePath.replace(/(\/+)/, '/');
  } else {
    resolvePath = resolvePath.replace(/(?!^)\w+\/+\.{2}\//g, '')
      .replace(/(?!^)\.\//g, '')
      .replace(/\/+$/, '');
  }
  return resolvePath;
}

console.log(resolve('/aa', '../bb', 'cc', 'dd')); // => /bb/cc/dd
console.log(resolve('/aa', '../bb', './cc', 'dd')); // =>  bb/cc/dd
console.log(resolve('/', '/system', 'user', 'userIndex')); // => /system/user/userIndex
console.log(resolve('', 'system', 'user', 'userIndex')); // => ${cwd}/system/user/userIndex
```


### 16. base设置

base是开发或生产环境服务的公共基础路径，也就是文件引用路径，默认是`/`。合法的值包括以下几种：

- 绝对 URL 路径名，例如 `/foo/`
- 完整的 URL，例如 `https://foo.com/`
- 空字符串或 `./`（用于开发环境）

我们项目会把静态文件上传到CDN，所以生产环境会应该是第二种——完整的URL，所以可以这么设置：

```ts
base: envMap.VUE_APP_PUBLIC_PATH || './',
```



## 三、参考

- [Vite中文文档](https://vitejs.cn/)
- [vite 改变入口文件地址](https://www.csdn.net/tags/NtTaggwsNTA2OTUtYmxvZwO0O0OO0O0O.html)
- [Vue动态加载组件的四种方式](https://blog.csdn.net/weixin_45645846/article/details/122725028)
- [vite插件指北](https://juejin.cn/post/6979147163259371556)
- [在 umi 项目中使用 vite](https://zhuanlan.zhihu.com/p/399998544)
- [深度作用选择器>>>或/deep/或::v-deep](https://juejin.cn/post/6913200316314746894)
- [是否可以提供一个类似于@vitejs/plugin-vue-jsx的vite-vue2-jsx的plugins](https://github.com/vitejs/vite/issues/2189)


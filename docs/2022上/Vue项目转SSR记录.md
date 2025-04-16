## 一、开始

本文讲解了关于 SSR 的基本概念，以及将 CSR 项目转为 SSR 时遇到的一些问题，及其解决方法。在解决问题的过程中，分析了一下内在原因。

## 二、SSR原理

Vue 默认是一个单页应用（SPA，single page web application），以 CSR（Client Side Rendering）方式渲染页面，就是一开始只请求空壳的 HTML，数据请求和 Dom 渲染都是在浏览器端完成。

服务端渲染（SSR，Server Side Rendering），就是将组件或页面通过服务器生成 `html` 字符串，再发送到浏览器，最后将静态标记"混合"为客户端上的应用程序。 


服务器渲染的 Vue.js 应用程序也可以被认为是"同构"或"通用"，因为应用程序的大部分代码都可以在服务器和客户端上运行。


服务端渲染的优点主要是良好的 SEO 和减少首屏时间，缺点是服务器负载增加、学习和开发成本上升。


### 1. 构建流程


<img src="http://doc.uwayfly.com/vue-ssr-process-official.png" width="900">

1. 先把组件渲染成 `html` 在 `node` 的 `server` 中返回，中间如果有请求数据则会请求数据。
2. 请求到的数据会放到 `window.__INITIAL_STATE__` 中。
3. `entry-client` 打包的文件在 `html` 中，在浏览器渲染阶段会执行。
4. 浏览器渲染时判断 `window.__INITIAL_STATE__` 有数据的话，会拿出来用，不用再重复请求。


### 2. hydrate

把水理解为数据，`hydrate` 可以视为把字符串变成可用的组件渲染到浏览器。

1. 服务端渲染：在服务端注入数据，构建出组件树，`render` 阶段。
2. 序列化成 HTML：脱水，称为 `dehydrate`。
3. 客户端渲染：到达客户端后泡水，激活水流，称为 `hydrate`。

### 3. 基本注意事项

1. Vue、Vuex、Vue-Router 都要用工厂模式生成，防止多个用户之间的污染。

2. 所有的生命周期钩子函数中，只有 `beforeCreate` 和 `created` 会在服务器端渲染过程中被调用。这就是说任何其他生命周期钩子函数中的代码（例如 `beforeMount` 或 `mounted`），只会在客户端执行。

3. 通用代码不可接受特定平台的 API，因此如果你的代码中，直接使用了像 `window` 或 `document`，这种仅浏览器可用的全局变量，则会在 Node.js 中执行时抛出错误，反之也是如此（`global`）。



## 三、更多


上面介绍了 SSR 的一些基本概念和基本注意事项，在将 CSR 项目转 SSR 过程中，踩过一些坑，这里记录下。

### 1. 使用 `lodash-es` 时报错 `Must use import to load ES Module`

猜测报错的原因是 `webpack` 将 `import` 语句转为了 `require`。

尝试在 `webpack` 的 `babel-loader` 配置中加上：

```js
options: {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
      },
    ],
  ],
},
```

发现不起作用。

目前解决办法是，要么动态导入，要么将 `lodash-es`，改为 `lodash`。

### 2. Koa 如何开启 https

为什么要开启 `https`，因为后台只接受 `https` 的请求。

开启 `https` 方式是利用 `https` 和 `koa-sslify` 模块。

```js
const Koa = require('koa');
const https = require('https');
const enforceHttps = require('koa-sslify').default;
const app = new Koa();
app.use(enforceHttps());

const options = {
  key: fs.readFileSync(path.resolve(__dirname, './ssl/private.key')),
  cert: fs.readFileSync(path.resolve(__dirname, './ssl/mydomain.crt')),
};

https.createServer(options, app.callback()).listen(port, () => {
  console.log(`应用实例，访问地址为 https://:localhost:${port}`);
});
```

上面的证书可以使用 `openssl` 生成自签名证书(免费，本地测试使用)：

生成 `private key` 和 `csr`：

```bash
openssl req -new -newkey rsa:2048 -nodes -out mydomain.csr -keyout private.key
```

利用上一步生成的 `private.key` 和 `mydomain.csr` 生成自签名证书：

```bash
openssl x509 -req -days 365 -in mydomain.csr -signkey private.key -out mydomain.crt
```

打开网页，如果提示“Chrome浏览器出现：您目前无法访问 XX.XX.XX.XX，因为此网站发送了 Google Chrome 无法处理的杂乱凭据”，可以在当前页面顶层输入 `thisisunsafe`。


### 3. Vue 全局 mixin

`Vue.mixin` 需在 `Vue` 实例化之前添加，举例：

```js
Vue.mixin({
  methods: {
    testFn() {
      return '';
    },
  },
});

const app = new Vue({})

Vue.mixin({
  methods: {
    testFn2() {
      return '';
    },
  },
});
```

打印 `app`，会发现 `app.testFn` 存在，而 `app.testFn2` 不存在。

关于这个问题的内在原因，我在[另一篇文章](https://juejin.cn/post/7054744502912679973/)有详细说明，使用的时候只要注意全局 `mixin` 要在实例化之前调用就行了。


### 4. 环境变量

由于不用 `vue-cli` 搭建，所以之前的 `.env.local` 中的 `VUE_APP_DIR` 等环境变量都要自己去取。


### 5. Cookie 的处理


`SSR` 中的 `node server` 其实是充当中间层的作用，拿到用户的 `cookie`，带着它再去请求后台服务器。

<img src="http://doc.uwayfly.com/vue-ssr-process-mine.png" width="1000">

将 `cookie` 注入到 `global` 的方法不再适用，因为会造成所有用户用同一个 `cookie`。

      
可以将 `cookie` 放到 `ssr` 的 `context` 中，在 `entry-server.js` 中调用 `api.setCookies(context.cookies)`，发起请求的时候将 `cookie` 放在 `axios` 的 `header` 中。

因为每一个到来的请求都会新建一个上下文，也就是每次都会调用 `api.setCookies` 方法，不会造成 `cookie` 污染。

```js
// api.js
export default {
  api: null,
  cookies: '',
  setCookies(value = '') {
    this.cookies = value;
    this.api = axios.create({
      baseURL: config.baseURL,
      withCredentials: true,
      headers: {
        cookie: value,
      },
      timeout: config.timeout,
    });
  },
  post(url, data) {
    if (!this.api) this.setCookies();

    return new Promise((resolve, reject) => {
      this.api({
        method: 'post',
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => {
        resolve(res);
      })
        .catch((err) => {
          reject(err);
        });
    });
  },
};
```

```js
// entry-server.js

export default function (context) {
  return new Promise((resolve, reject) => {
    const s = isDev && Date.now();
    const { app, router, store } = createApp();

    const { url } = context;
    const { fullPath } = router.resolve(url).route;

    if (fullPath !== url) {
      return reject({ url: fullPath });
    }
    router.push(url);

    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents();
      if (!matchedComponents.length) {
        return reject({ code: 404 });
      }

      // 重点是这里
      api.setCookies(context.cookies);

      Promise.all(matchedComponents.map(({ asyncData }) => asyncData && asyncData({
        store,
        route: router.currentRoute,
      }))).then(() => {
        context.state = store.state;
        resolve(app);
      })
        .catch(reject);
    }, reject);
  });
};
```


### 6. window/document 的兼容

对于 `window/documet/navigotor/location` 等变量，如果必须暴露在 node 环境中，要想不报错的话，需要加如下的判断：

```js
if (typeof window !== 'undefined') {
  // do something
}
```

注意，`if (typeof window !== 'undefined')` 不会报错，而 `if (window && window.xx)` 会报错。

### 7. Vant 按需加载

`vant ssr` 不支持 `es`，需要从 `lib` 中引入

```js
import List from 'vant/lib/list';
import Toast from 'vant/lib/toast';

import 'vant/lib/index.css';
```


不能这样：

```js
import { List } from 'vant'
```

### 8. 应用实例

服务端的 `app` 和客户端的 `app` 不是同一个，它们是完全隔离的。服务端的 app 是 NodeJS 生成的，客户端的是浏览器加载包含 Vue 的 JS 文件，然后实例化的，它们环境不一样，产物也不一样。

另外，SSR 服务端的 Vue 引入的是 CJS 版本，客户端引入的是 ESM 版本。 原因在于服务端的 webpack 配置了 `target:node`。这点在调试的时候要注意。

```js
// node_modules/vue/package.json
{
  "main": "dist/vue.runtime.common.js",
  "module": "dist/vue.runtime.esm.js",
}
```

### 9. Express 相关

#### （1）app.use

`app.use` 是用来给 `path` 注册中间函数的，这个 `path` 默认是 `’/’`，也就是默认会处理用户的任何 `url` 请求。

注意，当设置了某一个 `path` 的时候，`app.use` 会同时处理 `path` 下的子路径：比如设置 `path` 为 `’/hello’`，当请求路径为 `’/hello/’`、 `’/hello/nihao’`、`’/hello/nihao/1’` 时，也会交给中间函数处理。

#### （2）express.static()

作用是提供静态资源文件(图片、`csss` 文件、`javascript` 文件)，比如：

```js
app.use(express.static('public'));
```

`express` 会在静态资源目录下查找文件，所以不需要把静态目录 `public` 作为 `url` 的一部分。可以用以下方式加载 `public` 目录下的文件：

```js
http://localhost:3000/hello.html
http://localhost:3000/images/1.jpg
http://localhost:3000/css/style.css
http://localhost:3000/js/index.js
```

可以多次使用 `express.static` 中间件来添加多个静态资源目录，这时 `express` 将会按照设置静态资源目录的顺序来查找静态资源文件：

```js
app.use(express.static('public'));
app.use(express.static('files'));
```

为了给静态资源文件创建一个虚拟的文件前缀(实际上文件系统中并不存在) ，可以使用 `express.static` 函数指定一个虚拟的静态目录，就像下面这样：

```js
app.use('/static', express.static('public'));
```

现在可以使用 `/static` 作为前缀来加载 `public` 文件夹下的文件了：

```js
http://localhost:3000/static/hello.html
http://localhost:3000/static/images/1.jpg
http://localhost:3000/static/css/style.css
http://localhost:3000/static/js/index.js
```

然而，你提供给 `express.static` 函数的路径是一个相对 `node` 进程启动位置的相对路径。如果你在其他的文件夹中启动 `express app`，更稳妥的方式是使用静态资源文件夹的绝对路径：


```js
app.use('/static', express.static(__dirname + '/public'));
```

## 四、总结

将 CSR 项目做 SSR 项目，比直接新建一个 SSR 项目要复杂一些，因为既要搭架子，又要将之前代码改造成兼容的，中间会遇到各种各样的问题，有些比较零碎。在解决问题过程中，最重要的应该是分析问题的本质。

## 五、相关资料

1. [webpack4、Koa配置Vue服务器端渲染(SSR)](https://juejin.cn/post/6844903701434335246)
2. [Must use import to load ES Module](https://github.com/tauri-apps/tauri/issues/1928)
3. [将koa的node服务升级到https](https://juejin.cn/post/6844903924336443405)
4. [使用nodejs搭建HTTPS server](https://juejin.cn/post/6844903697151983629)
5. [Chrome浏览器出现：您目前无法访问 XX.XX.XX.XX](https://blog.csdn.net/sdfsdfasfddsafwesd/article/details/109379788)
6. [再说 Vue SSR 的 Cookies 问题](https://www.mmxiaowu.com/article/596cbb2d436eb550a5423c30)
7. [最后说 Vue2 SSR 的 Cookies 问题](https://www.mmxiaowu.com/article/5b053d142fad053ed0369e99)
8. [如何理解 SSR 中的 hydrate](https://zhuanlan.zhihu.com/p/323174003)
9. [vue-ssr-renderer-demo](https://github.com/heiyu4585/vue-ssr-renderer-demo)
10. [Vue SSR 组件加载](https://zhuanlan.zhihu.com/p/36233639)
11. [lodash-es 最小化引入](http://t.zoukankan.com/mengfangui-p-13881630.html)


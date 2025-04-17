[toc]

## 1. 背景

`uni-app` 内主流的 `router` 方案是使用`uni-simple-router`加`uni-read-pages`，自动读取 `pages.json`，然后替换`ROUTES`变量，[相关文档在这里](https://hhyang.cn/v2/start/quickstart.html)。

`uni-simple-router` 提供了两种方式，进行带参数的路由的跳转：

```ts
// 命名的路由
this.$Router.push({ name: 'router1', params: { userId: '123' }})

// 带查询参数，变成 /router1?plan=private
this.$Router.push({ path: '/router1', query: { plan: 'private' }})
```

这里有一个很重要的限制，就是参数为 `name` 时传递的参数必须为 `params`，相反 `path` 必须对应 `query`。

一般情况下，`name`前面没有`/`，`path`前面有`/`。

```ts
// 这里的 params 不生效
this.$Router.push({ path: '/user', params: { userId }}) // -> /user
```

回到我们的项目中，我们是h5项目转的小程序，就有个很大问题，之前的写法都是这样：


```js
router.push('/somePath/:id') 
```

或者这样：

```js
router.push({ path '/somePath/:id' })
```

如果挨个改成上面的方式太麻烦了，如何变得更简单和自动化呢？

## 2. 方案

### 2.1. 代理跳转方法router.push/replace

一种方式是进行正则的替换，就是匹配出 `router.push`、`router.replace` 这种关键词，然后把它替换为对应的 `name` 和 `params`。这种方式的问题是，无法处理远离 `pages` 的组件，什么是远离`pages`呢，就是不知道这个组件归哪个项目，也就找不到`path`对应的`name`，自然无法替换。


另一种方式就是动态替换 `router.push`、`router.replace` 方法，根据之前的 `router.js` 拿到原来的 `path`，借助 `path-to-regexp` 找到其对应的正则。然后当 `router.push` 触发的时候，判断要跳转的 `path` 属于哪个正则，也就找到了对应的 `name`。



```ts
function interceptorOriginFunc(router, FuncName, originFunc) {
  router[FuncName] = function (...args) {
    let rawPath;
    let rawQuery = {};
    if (args.length === 1 && !args[0].name && args[0].path) {
      rawPath = args[0].path;
      rawQuery = args[0].query || {};
    } else if (args.length === 1 && typeof args[0] === 'string') {
      rawPath = args[0];
    }

    if (rawPath) {
      const { name, params } = findRouteName(rawPath, newRouterMap) || {};

      if (name) {
        originFunc.call(this, {
          name,
          params: {
            ...params,
            ...rawQuery,
          },
        });
        return;
      }
    }
    originFunc.call(this, ...args);
  };
}

function routerInterCeptor(router) {
  const originPush = router.push;
  const originReplace = router.replace;

  interceptorOriginFunc(router, 'push', originPush);
  interceptorOriginFunc(router, 'replace', originReplace);
}
```

在处理的过程中，发现一个问题，对于 `query` 直接写在 `path` 后面的，比如`router.push({ path '/somePath/:id?param=1' })`，需要先把问号后面的处理掉，否则会把问号及后面的参数一起当作`id`。


### 2.2. 代理获取参数route.params


另外，跳转后的页面获取参数的方式也要处理下，之前的 `route.params`，都要替换成 `route.query`，否则小程序获取不到，相关源码可以在 `uni-simple-router/src/helpers/utils.ts` 中的 `paramsToQuery` 看到。

这里的替换也有两种方式：
1. 直接全局替换
2. `hook`掉


全局替换比较简单，可以通过正则，替换为一个其他变量或方法。

要 `hook` 的话，有点麻烦，因为 `uni-simple-router` 这个库已经把 `params` 这个参数删了，即使重新覆盖，也会得到一个空对象，源码如下：


```ts
// uni-simple-router/src/public/query.ts
delete (toRule as totalNextRoute).params;
```

```ts
// uni-simple-router/src/public/router.ts
Object.defineProperty(Vue.prototype, '$Route', {
  get() {
    return createRoute(router);
  }
});
```

也就是想通过 `this.$route` 获取任意参数的时候，都会调用 `createRoute` 生成一个新的对象，导致 `params` 始终为空对象，所以下面两种方式都是无效的`hook`：

```ts
// 无效
this.$route.params = { ...this.$route.params }

// 无效
const that = this;
Object.defineProperty(this, 'params', {
  get() {
    return that.$route.query;
  },
});
```

下面这种方式可以，注意要声明另一个变量，否则会造成无限递归：

```ts
const originRoute = { ...this.$route };
Object.defineProperty(this, '$route', {
  get() {
    return {
      ...originRoute,
      params: originRoute.query,
    };
  },
});
```

然后把它放在 `mixin` 中的 `mounted` 中就可以 `hook` 了。

然而，这种方式可能存在隐患，之前每次获取 `$route`，都是根据 `routeMap`、`query` 等参数重新生成，现在都改成固定了，可能会在某些场景引起其他问题。


### 2.3. 小结

1. 对 `router.push`、`router.replace` 的 `hook`，是根据之前的 `route.path` 得到 `regexp`，跳转时由 `path` 匹配 `regexp`，然后找到对应的 `name`，之后跳转。
2. 对 `route.params` 的 `hook`，是在 `mixin` 的 `mounted` 中，对 `this.$route` 进行劫持。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-router-hook.png" width="500">
### 1. 内部的 keep-alive

最近遇到一个问题，基于 `uni-app` 的一个项目，在 H5 下，不同的 `query` 参数页面仍然被缓存，但是项目中并没有发现 `keep-alive`。

查看源码，发现原因是 `uni-app` 内部自己做了 `keep-alive`，源码在这里：`src/platforms/h5/components/app/index.vue`。

简单来说，就是 `uni-app` 想在 H5 平台也模拟小程序的入栈、出栈，当页面返回时，不用再次刷新。其内部有个核心变量 `keepAliveInclude`，当页面跳转时候，根据不同的跳转类型，对 `keepAliveInclude` 做入栈和出栈。

```js
function beforeEach (to, from, next, routes) {
  currentPages = getCurrentPages(true) // 每次 beforeEach 时获取当前currentPages，因为 afterEach 之后，获取不到上一个 page 了，导致无法调用 onUnload
  const fromId = from.params.__id__
  const toId = to.params.__id__
  const toName = to.meta.name + '-' + toId
  if (toId === fromId && to.type !== 'reLaunch') { // 相同页面阻止
    // 处理外部修改 history 导致卡在当前页面的问题
    if (to.fullPath !== from.fullPath) {
      addKeepAliveInclude.call(this, toName)
      next()
    } else {
      next(false)
    }
  } else if (to.meta.id && to.meta.id !== toId) { // id 不妥，replace跳转
    next({
      path: to.path,
      replace: true
    })
  } else {
    const fromName = from.meta.name + '-' + fromId

    switch (to.type) {
      case 'navigateTo':
        break
      case 'redirectTo':
        // 关闭前一个页面
        removeKeepAliveInclude.call(this, fromName)
        if (from.meta) {
          if (from.meta.isQuit) { // 如果 redirectTo 的前一个页面是 quit 类型，则新打开的页面也是 quit
            to.meta.isQuit = true
            to.meta.isEntry = !!from.meta.isEntry
          }
          // 小程序没有这个逻辑，当时为何加了保留并更新 tabBar 的逻辑？
          // if (from.meta.isTabBar) { // 如果是 tabBar，需要更新系统组件 tabBar 内的 list 数据
          //   to.meta.isTabBar = true
          //   to.meta.tabBarIndex = from.meta.tabBarIndex
          //   const appVm = getApp().$children[0]
          //   appVm.$set(appVm.tabBar.list[to.meta.tabBarIndex], 'pagePath', to.meta.pagePath)
          // }
        }

        break
      case 'switchTab':
        switchTab.call(this, routes, to, from)
        break
      case 'reLaunch':
        reLaunch.call(this, toName)
        to.meta.isQuit = true // reLaunch后，该页面为 quit 类型
        break
      default:
        // 后退或非 API 访问
        if (fromId && fromId > toId) { // back
          removeKeepAliveInclude.call(this, fromName)
          if (this.$router._$delta > 1) {
            removeKeepAliveInclude.call(this, this.$router._$delta)
          }
        }
        break
    }

    if (to.type !== 'reLaunch' && to.type !== 'redirectTo' && from.meta.id) { // 如果不是 reLaunch、redirectTo，且 meta 指定了 id
      addKeepAliveInclude.call(this, fromName)
    }
    // if (to.type !== 'reLaunch') { // TODO 如果 reLaunch，1.keepAlive的话，无法触发页面生命周期，并刷新页面，2.不 keepAlive 的话，页面状态无法再次保留,且 routeView 的 cache 有问题
    addKeepAliveInclude.call(this, toName)
    // }

    next()
  }
}
```


不过当你使用 `this.$router.push` 这种 `VueRouter` 语法，而不是 `uni.navigateTo` 时，并没有携带 `type`，导致 `keepAliveInclude` 栈出现错误。

知道了原因，解决办法就很简单了，可以 `hook` 一下 `router.push` 和 `router.replace`方法，增加对应的 `type` 字段。

其实还有另一种思路，既然内部都是用了 `keep-alive`，如果我就想缓存某个页面怎么办呢？就是即使出栈，我还是保留这个页面的数据。

可以监听 `keepAliveInclude`，当发现其没有想要常驻的页面的时候，就 `push` 一下。

### 2. keepAliveInclude

`uni-app` 内部的 `router` 还有个 `params.__id__` 的概念。路由跳转的时候，这个 `__id__` 会加到 `name`，作为路由的唯一标识，如果不加就自动生成。

```ts
function addKeepAliveInclude (componentName) {
  if (this.keepAliveInclude.indexOf(componentName) === -1) { // 目标页面,自动 include
    this.keepAliveInclude.push(componentName)
  }
}

function beforeEach (to, from, next, routes) {
  currentPages = getCurrentPages(true) // 每次 beforeEach 时获取当前currentPages，因为 afterEach 之后，获取不到上一个 page 了，导致无法调用 onUnload
  const fromId = from.params.__id__
  const toId = to.params.__id__
  const toName = to.meta.name + '-' + toId

  // 其他判断逻辑
  addKeepAliveInclude.call(this, toName)
}
```

`location.params__id__` 的生成逻辑如下，优先取 `meta.id`，否则取 `router.id`。

```ts
if (record && record.meta && record.meta.id) {
  location.params.__id__ = record.meta.id;
} else if (!location.params.__id__) {
  location.params.__id__ = router.id;
}
```

`keepAliveInclude` 有两个阶段会生成，一是上面提到的路由跳转，二是初始化的时候，我们看下初始化时候的生成逻辑。

```ts
if (entryRoute.meta.name) {
  if (entryRoute.meta.id) {
    keepAliveInclude.push(entryRoute.meta.name + '-' + entryRoute.meta.id)
  } else {
    keepAliveInclude.push(entryRoute.meta.name + '-' + (minId + 1))
  }
}
```


参考：https://ask.dcloud.net.cn/question/148194

源码地址：https://github.com/dcloudio/uni-app/blob/9c1aad1166d56639e2147fed882a5de90d6fbc70/packages/vue-cli-plugin-uni/lib/h5/index.js


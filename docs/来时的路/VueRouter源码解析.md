### 一、开始

`Vue Router`是`Vue`官方的路由管理器，本质是`Vue`的插件。下面是`Vue Router`的一个简单例子，从它入手，看看`Vue Router`的实现原理。
```js
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

const router = new VueRouter({
  routes
})

const app = new Vue({
  router
}).$mount('#app')
```

```html
<div id="app">
  <h1>Hello App!</h1>
  <router-view></router-view>
</div>
```

下面是一张流程图：

![vue-router](http://doc.uwayfly.com/vue-router-code-2.png)


### 二、源码解析

#### 1. Vue Router注册

`Vue Router`插件使用时，用到了`Vue.use(VueRouter)`。我们先看下`Vue`的静态的方法`use`，定义在`vue/src/core/global-api/use.js`中

```ts
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
```

`Vue.use`先判断是否已经安装了`plugin`，如果已经安装了则直接返回`Vue`。

然后判断`plugin.install`是否是函数，如果是，则执行`install`方法，并且`install`的第一个参数是`Vue`；否则如果`plugin`本身是函数，则执行`plugin`，然后将`plugin`添加在Vue维护的一个数组中。

`Vue Router`上定义了`install`方法，看一下它的实现：

```ts
export let _Vue

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })

  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  Vue.component('router-view', View)
  Vue.component('router-link', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
```

`install`方法先判断是否安装过了，然后利用`Vue.mixin`在所有组件的`beforeCreate`和`destroyed`中混入了一些属性。`this.$options.router`就是我们实例化`Vue`的时候传入的`router`，这里执行了它的`init`方法，我们在后面再看下它的实现。并将`_route`定义为响应式对象，指向了`this._router.history.current`，其实就是当前的路由信息，后面也会讲到。

并且在`Vue`的原型上定义了`$router`和`$route`，这也就是我们可以在组件中用`this.$router`和`this.$route`。

另外，全局注册了两个组件`router-view`和`router-link`。

#### 2. VueRouter类

我们使用`Vue Router`时，会实例化`VueRouter`得到`router`，并传到`Vue.options`中。下面看一下`VueRouter`类的定义，在`src/index.js`中。

```ts
export default class VueRouter {
  static install: () => void;
  static version: string;

  app: any;
  apps: Array<any>;
  ready: boolean;
  readyCbs: Array<Function>;
  options: RouterOptions;
  mode: string;
  history: HashHistory | HTML5History | AbstractHistory;
  matcher: Matcher;
  fallback: boolean;
  beforeHooks: Array<?NavigationGuard>;
  resolveHooks: Array<?NavigationGuard>;
  afterHooks: Array<?AfterNavigationHook>;

  constructor (options: RouterOptions = {}) {
    this.app = null
    this.apps = []
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    this.matcher = createMatcher(options.routes || [], this)

    let mode = options.mode || 'hash'
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }

  match (
    raw: RawLocation,
    current?: Route,
    redirectedFrom?: Location
  ): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }

  get currentRoute (): ?Route {
    return this.history && this.history.current
  }

  init (app: any /* Vue component instance */) {
    process.env.NODE_ENV !== 'production' && assert(
      install.installed,
      `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
      `before creating root instance.`
    )

    this.apps.push(app)

    // main app already initialized.
    if (this.app) {
      return
    }

    this.app = app

    const history = this.history

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation())
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }

    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }

  beforeEach (fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
  }

  beforeResolve (fn: Function): Function {
    return registerHook(this.resolveHooks, fn)
  }

  afterEach (fn: Function): Function {
    return registerHook(this.afterHooks, fn)
  }

  onReady (cb: Function, errorCb?: Function) {
    this.history.onReady(cb, errorCb)
  }

  onError (errorCb: Function) {
    this.history.onError(errorCb)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.push(location, onComplete, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.replace(location, onComplete, onAbort)
  }

  go (n: number) {
    this.history.go(n)
  }

  back () {
    this.go(-1)
  }

  forward () {
    this.go(1)
  }

  getMatchedComponents (to?: RawLocation | Route): Array<any> {
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply([], route.matched.map(m => {
      return Object.keys(m.components).map(key => {
        return m.components[key]
      })
    }))
  }

  resolve (
    to: RawLocation,
    current?: Route,
    append?: boolean
  ): {
    location: Location,
    route: Route,
    href: string,
    // for backwards compat
    normalizedTo: Location,
    resolved: Route
  } {
    const location = normalizeLocation(
      to,
      current || this.history.current,
      append,
      this
    )
    const route = this.match(location, current)
    const fullPath = route.redirectedFrom || route.fullPath
    const base = this.history.base
    const href = createHref(base, fullPath, this.mode)
    return {
      location,
      route,
      href,
      // for backwards compat
      normalizedTo: location,
      resolved: route
    }
  }

  addRoutes (routes: Array<RouteConfig>) {
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }
}
```

`VueRouter`类定义了一些属性：
- `app`：存放当前的`Vue`实例
- `apps`：存放`Vue`实例列表
- `mode`：路由模式，`hash/history/abstract`
- `matcher`：`createMatcher`的返回值，包含了`match`和`addRoutes`两个方法
- `history`：`VueRouter`中`html5/hash/abstract`这三种不同模式的实例
- `beforeHooks/resolveHooks/afterHooks`：导航守卫

在`constructor`中执行了`createMatcher`，拿到`matcher`。根据`options`中的`mode`实例化对应的`history`。

`Vue Router`有三种模式：`hash/history/abstact`，内部是由三个类实现的：`HashHistory/HTML5History/AbstractHistory`，它们都继承自`History`。`History`包含了三种模式共有的方法和属性，比如`updateRoute`、`transitionTo`方法。三个具体的类则实现了`push/replace`等方法。

`VueRouter`中定义了`push/replace/go/back/forward`方法，可以看出，它们最后都是引用`history`的方法，也就是对应模式的实例的方法。

另外，`VueRouter`执行`install`方法注册过程中，执行了这里的`init`方法。`init`方法中，赋值了`app/apps`，并执行了`history.transitionTo`，进行了路由的初始化跳转。

`VueRouter`中还定义了`addRoutes`方法，进行动态添加路由，其实是调用了`createMatcher`返回的
`addRoutes`方法。

下面先看一下`createMatcher`的实现。


#### 3. createMatcher

```js
export function createMatcher (
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  const { pathList, pathMap, nameMap } = createRouteMap(routes)

  function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }

  function match (
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {
    const location = normalizeLocation(raw, currentRoute, false, router)
    const { name } = location

    if (name) {
      const record = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      if (!record) return _createRoute(null, location)
      const paramNames = record.regex.keys
        .filter(key => !key.optional)
        .map(key => key.name)

      if (typeof location.params !== 'object') {
        location.params = {}
      }

      if (currentRoute && typeof currentRoute.params === 'object') {
        for (const key in currentRoute.params) {
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            location.params[key] = currentRoute.params[key]
          }
        }
      }

      if (record) {
        location.path = fillParams(record.path, location.params, `named route "${name}"`)
        return _createRoute(record, location, redirectedFrom)
      }
    } else if (location.path) {
      location.params = {}
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]
        const record = pathMap[path]
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // no match
    return _createRoute(null, location)
  }

  function _createRoute (
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
  }

  return {
    match,
    addRoutes
  }
}
```

`createMatcher`有两个参数：`options`中的`routes`数组和`router`实例，返回了两个函数`match`和`addRoutes`。

内部调用了`createRouteMap`方法：

```ts
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>
): {
  pathList: Array<string>;
  pathMap: Dictionary<RouteRecord>;
  nameMap: Dictionary<RouteRecord>;
} {
  // the path list is used to control path matching priority
  const pathList: Array<string> = oldPathList || []
  // $flow-disable-line
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // $flow-disable-line
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route)
  })

  // ensure wildcard routes are always at the end
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}

function addRouteRecord (
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,
  parent?: RouteRecord,
  matchAs?: string
) {
  const { path, name } = route
  const pathToRegexpOptions: PathToRegexpOptions = route.pathToRegexpOptions || {}
  const normalizedPath = normalizePath(
    path,
    parent,
    pathToRegexpOptions.strict
  )

  if (typeof route.caseSensitive === 'boolean') {
    pathToRegexpOptions.sensitive = route.caseSensitive
  }

  const record: RouteRecord = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component },
    instances: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props: route.props == null
      ? {}
      : route.components
        ? route.props
        : { default: route.props }
  }

  if (route.children) {
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }

  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }
}
```

`createRouteMap`根据`routes`生成了`pathList`、`pathMap`、`nameMap`，`pathMap`和`nameMap`就是`key`为`path`和`name`的路由信息对象，是为了方便使用。

`createRouteMap`内部遍历`routes`，并为每个`route`执行了`addRouteRecord`。`addRouteRecord`方法中，`normalizePath`将`path`规范化，返回了一个规范化的`route`，并且如果`route.children`存在，则递归执行`addRouteRecord`，最终创建了一个`route`树。


`createRouteMap`最后对`pathList`进行了额外处理，将`path`为`*`的的放到最后。

然后看下`match`，其作用就是找到匹配的路由。`match`接受三个参数：目前地址`rawLocation`、当前路由`currentRoute`、重定向地址`redirectFrom`。match内部首先调用`normalizeLocation`对目标路由进行规范化得到`location`。

如果`location`的`name`存在，从`nameMap`中取得对应的路由，如果不存在则创建空路由并返回。取得路由的`param`，并把其和当前路由对比，取交集，然后将`params`填充到`location.path`中，创建新路由并返回。
如果`location.path`存在，则遍历`pathList`，找到匹配的路由并返回。

上面创建路由的方法都是`_createRoute`。`_createRoute`方法判断`record.redirect`，即有重定向，如果存在，则执行`redirect`方法并返回，如果存在`record.matchAs`，即别名，则执行`alias`方法并返回，最后调用真正的创建路由方法`createRoute`方法：

```js
export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  const stringifyQuery = router && router.options.stringifyQuery

  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}

  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    matched: record ? formatMatch(record) : []
  }
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  return Object.freeze(route)
}
```

`createRoute`方法就是返回了一个标准的`Route`对象。

#### 4. TransitionTo

`TransitionTo`定义在`History`这个基类上：

```ts
export class History {
  transitionTo (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const route = this.router.match(location, this.current)
    this.confirmTransition(route, () => {
      this.updateRoute(route)
      onComplete && onComplete(route)
      this.ensureURL()

      // fire ready cbs once
      if (!this.ready) {
        this.ready = true
        this.readyCbs.forEach(cb => { cb(route) })
      }
    }, err => {
      if (onAbort) {
        onAbort(err)
      }
      if (err && !this.ready) {
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
      }
    })
  }
}
```

`TransitionTo`接受三个参数：跳转地址`location`、成功回调`onComplete`、失败回调`onAbort`。

其内部先调用了`router.match`方法，即上面`createMatcher`中返回的`match`，找到匹配的路由`route`。然后执行了`confirmTransition`。

```js
confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
  const current = this.current
  const abort = err => {
    if (isError(err)) {
      if (this.errorCbs.length) {
        this.errorCbs.forEach(cb => { cb(err) })
      } else {
        warn(false, 'uncaught error during route navigation:')
        console.error(err)
      }
    }
    onAbort && onAbort(err)
  }
  if (
    isSameRoute(route, current) &&
    // in the case the route map has been dynamically appended to
    route.matched.length === current.matched.length
  ) {
    this.ensureURL()
    return abort()
  }

  const {
    updated,
    deactivated,
    activated
  } = resolveQueue(this.current.matched, route.matched)

  const queue: Array<?NavigationGuard> = [].concat(
    // in-component leave guards
    extractLeaveGuards(deactivated),
    // global before hooks
    this.router.beforeHooks,
    // in-component update hooks
    extractUpdateHooks(updated),
    // in-config enter guards
    activated.map(m => m.beforeEnter),
    // async components
    resolveAsyncComponents(activated)
  )

  this.pending = route
  const iterator = (hook: NavigationGuard, next) => {
    if (this.pending !== route) {
      return abort()
    }
    try {
      hook(route, current, (to: any) => {
        if (to === false || isError(to)) {
          // next(false) -> abort navigation, ensure current URL
          this.ensureURL(true)
          abort(to)
        } else if (
          typeof to === 'string' ||
          (typeof to === 'object' && (
            typeof to.path === 'string' ||
            typeof to.name === 'string'
          ))
        ) {
          // next('/') or next({ path: '/' }) -> redirect
          abort()
          if (typeof to === 'object' && to.replace) {
            this.replace(to)
          } else {
            this.push(to)
          }
        } else {
          // confirm transition and pass on the value
          next(to)
        }
      })
    } catch (e) {
      abort(e)
    }
  }

  runQueue(queue, iterator, () => {
    const postEnterCbs = []
    const isValid = () => this.current === route
    // wait until async components are resolved before
    // extracting in-component enter guards
    const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
    const queue = enterGuards.concat(this.router.resolveHooks)
    runQueue(queue, iterator, () => {
      if (this.pending !== route) {
        return abort()
      }
      this.pending = null
      onComplete(route)
      if (this.router.app) {
        this.router.app.$nextTick(() => {
          postEnterCbs.forEach(cb => { cb() })
        })
      }
    })
  })
}
```

`confirmTransition`先判断当前路由和要跳转的路由是否相等，如果是，则执行`onAbort`，并返回。

然后调用了`resolveQueue`，`resolveQueue`就是对比了`current`路由和`next`路由，拿到更新了的、激活的、失活的组件。

```js
function resolveQueue (
  current: Array<RouteRecord>,
  next: Array<RouteRecord>
): {
  updated: Array<RouteRecord>,
  activated: Array<RouteRecord>,
  deactivated: Array<RouteRecord>
} {
  let i
  const max = Math.max(current.length, next.length)
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
    }
  }
  return {
    updated: next.slice(0, i),
    activated: next.slice(i),
    deactivated: current.slice(i)
  }
}
```

并创建了一个队列`queue`，包含了：
- `deactivated`组件的`beforeRouteLeave`守卫
- 全局的`beforeEach`守卫
- `updated`组件的`beforeRouteUpdate`守卫
- `activated`组件里的`beforeEnter`守卫
- 异步路由组件解析

然后调用`runQueue`执行了这个队列，`runQueue`是一个队列依次执行的工具函数：

```ts
function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      cb()
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
```

在回调中又创建了另一个队列：

- `activated`组件中的`beforeRouteEnter`
- 全局的`beforeResolve`

又调用了`runQueue`执行了上面的队列，并在回调中执行了`onComplete`。

这里的`onComplete`就是传入`confirmTransition`的第二个参数：

```js
() => {
  this.updateRoute(route)
  onComplete && onComplete(route)
  this.ensureURL()

  // fire ready cbs once
  if (!this.ready) {
    this.ready = true
    this.readyCbs.forEach(cb => { cb(route) })
  }
}
```

首先执行了`updateRoute`：

####  5. updateRoute

```js
updateRoute (route: Route) {
  const prev = this.current
  this.current = route
  this.cb && this.cb(route)
  this.router.afterHooks.forEach(hook => {
    hook && hook(route, prev)
  })
}
```

在`updateRoute`中重新赋值了`this.current`，注意这个`current`比较重要，因为上面响应式定义：`Vue.util.defineReactive(this, '_route', this._router.history.current)`，所以重新对`current`赋值，就会触发`_route`的`watcher`重新渲染。

那么`_route`的依赖是什么时候收集的呢。`install`中将`$route`定义为`this._routerRoot._route`，`this._routerRoot=this`。那么访问`$route`即为访问`_route`。

而`Vue Router`使用时需要用`router-view`包裹下组件，`router-view`的`render`函数中引用了这个`$route`，所以会在渲染`router-view`时进行依赖收集。


```js
export default {
  name: 'router-view',
  functional: true,
  render (_, { props, children, parent, data }) {
    data.routerView = true

    // directly use parent context's createElement() function
    // so that components rendered by router-view can resolve named slots
    const h = parent.$createElement
    const name = props.name
    const route = parent.$route

    const matched = route.matched[depth]

    const component = cache[name] = matched.components[name]

    // ...
    return h(component, data, children)
  }
}
```

回到`updateRoute`中，随后执行了`cb(route)`，然后又调用了全局的`afterEach`钩子。这个`cb`是在`history`的`listen`中进行赋值的：

```js
listen (cb: Function) {
  this.cb = cb
}
```

而在`VueRouter`实例化的过程中会调用`listen`：

```js
history.listen(route => {
  this.apps.forEach((app) => {
    app._route = route
  })
})
```

所以`cb(route)`，就是重新对`vm._route`进行赋值。


### 三、流程图

下面是流程图：

![vue-router](http://doc.uwayfly.com/vue-router-code-2.png)

### 四、总结

`Vue Router`本质还是对响应式原理的运用，加上对`history/hash`模式两种原生API的封装，另外包括各种方便的导航守卫。

`Vue Router`的`History`的实现方式值得学习，在基类中实现核心方法，在具体的类中实现`push/replace/go`等具体方法。另外很多工具类函数的封装也是非常值得学习的。

### 五、相关资料

1. [Vue Router源码](https://github.com/vuejs/vue-router)
2. [Vue.js技术揭秘](https://ustbhuangyi.github.io/vue-analysis/v2/vue-router/)


## 一、开始

`Vuex`是`Vue`的状态管理工具。核心思想是提供了全局状态管理的模式，并努力确保数据单向流动。在复杂项目中，当多个组件同时依赖、或需改变同一状态时，`Vuex`的优势明显：
1. 集中管理共享的数据，易于开发和维护
2. 能高效在组件间共享数据，提高开发效率
3. 存储在`Vuex`中的数据都是响应式的（`localstorage`无法直接做到），能实现数据与页面的同步


下图是`Vuex`的状态流转图：

![vuex](http://doc.uwayfly.com/vuex-mode.png)


下面是Vuex的一个简单使用示例：

```js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment (state) {
      state.count++
    }
  }
})

new Vue({
  el: '#app',
  store, // 这样在组件中可以用this.$store拿到store实例
})
```

组件中使用：
```js
this.$store.commit('increment')
```

下图是Vuex原理的流程图：

<img src="http://doc.uwayfly.com/vuex-code-mode-3.png" width="700">

## 二、源码解析

### 1. install

`Vuex`和`Vue Router`一样都是`Vue`的插件，我们在上一篇[Vue Router的源码分析](https://juejin.cn/post/7039913312619855903)中分析了`Vue.use`方法，知道了`Vue`插件如果存在`install`方法的话，会优先执行`install`方法。`Vuex`的`install`方法如下：

```js
let Vue // bind on install
export function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}

export default function applyMixin(Vue) {
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit })
  }
  // ...

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */
  function vuexInit () {
    const options = this.$options
    // store injection
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}
```

`install`方法先判断`Vuex`是否已经注册，如果是则直接返回。

然后调用了`applyMixin`方法，其利用`Vue.mixin`在每个组件的`beforeCreate`钩子函数中执行了`vueInt`。

`vueInit`只做了一件事，就是把实例化`Vue`时传入的`store`赋值给`this.$store`，这样我们就可以在组件中使用`this.$store`了。

### 2. Store

再来看一下`Store`类，其在`src/store.js`中。`Store`类就是我们使用`Vuex`时创建`store`时使用的，其逻辑相对复杂，先看下其构造函数。

```js
export class Store {
  constructor (options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }

    if (__DEV__) {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
      assert(this instanceof Store, `store must be called with the new operator.`)
    }

    const {
      plugins = [],
      strict = false
    } = options

    // store internal state
    this._committing = false
    this._actions = Object.create(null)
    this._actionSubscribers = []
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    this._subscribers = []
    this._watcherVM = new Vue()
    this._makeLocalGettersCache = Object.create(null)

    // bind commit and dispatch to self
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    plugins.forEach(plugin => plugin(this))

    const useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }
}
```

`Store`的构造函数中，先判断如果没有调用`install`的话，手动调用一次；然后判断了当前浏览器是否支持`Promise`，以及是否使用了`new`来创建的`store`。

接下来定义了一下实例变量和方法。比较关键的有以下几个：
1. 初始化模块：`this._modules = new ModuleCollection(options)`
2. 安装模块：`installModule(this, state, [], this._modules.root)`
3. 初始化`store._vm`：`resetStoreVM(this, state)`

我们依次来看一下。

#### (1) ModuleCollection

如果状态比较复杂，可以使用模块化的思想拆分`Vuex`的状态，示例如下：

```js
const moduleA = {
  state: () => ({ ... }),
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: () => ({ ... }),
  mutations: { ... },
  actions: { ... },

  // 嵌套模块
  modules: {  
    na: {
      state: () => ({ ... }),
    }
  }
}

const store = new Vuex.Store({
  modules: {
    a: moduleA,
    b: moduleB
  }
})

store.state.a // -> moduleA 的状态
store.state.b // -> moduleB 的状态
```

`ModuleCollection`就是用来初始化模块的，其在`src/module/module-collection.js`中：

```js
export default class ModuleCollection {
  constructor (rawRootModule) {
    // register root module (Vuex.Store options)
    this.register([], rawRootModule, false)
  }

  get (path) {
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }

  register (path, rawModule, runtime = true) {
    if (__DEV__) {
      assertRawModule(path, rawModule)
    }

    const newModule = new Module(rawModule, runtime)
    if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }

  // ...
}

export default class Module {
  constructor (rawModule, runtime) {
    this.runtime = runtime
    // Store some children item
    this._children = Object.create(null)
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule
    const rawState = rawModule.state

    // Store the origin module's state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }

  addChild (key, module) {
    this._children[key] = module
  }

  getChild (key) {
    return this._children[key]
  }

  // ...
}
```

`ModuleCollection`构造函数中调用了`this.register([], rawRootModule, false)`。其在`register`中实例化了一个`newModule`，实例化的时候创建了`_children`，其存储的是子模块。

然后判断`path`的长度，如果`path`长度为0，则表明该模块为根模块，赋值给`this.root`；如果有子模块`modules`，则递归调用`register`生成模块树。

进行到第一层的子模块时，也就是第二次调用`register`时，`path`的长度大于0，会走到`this.get(path.slice(0, -1))`，`path.slice(0, -1)`就是去掉了最后一个元素，比如`[a]`最后变成了`[]`。这时获取到的`parent`就是`this.root`。然后调用了`parent.addChild`，就是给`parent._children`增加了一个`key`为`a`的模块。

这样递归下去就构建了一个模块树。


#### (2) installModule


在讲解安装模块前，先熟悉下`Vuex`提供的`commit`的用法，方便我们理解源码。

`commit`的调用方式有：
1. `commit(type: string, payload?: any, options?: Object)`
2. `commit(mutation: Object, options?: Object)`

比如：
```js
this.$store.commit('increment', {
  count: 10
}, {
  root: true,
})

// 或者
this.$store.commit({
  type: 'increment',
  count: 10,
}, {
  root: true,
})
```

同样的，`dispatch`调用方式也有两种：

```js
// 1. dispatch(type: string, payload?: any, options?: Object): Promise<any>
this.$store.dispatch('increment', {
  count: 10,
}, {
  root: true,
})


// 2. dispatch(action: Object, options?: Object): Promise<any>
this.$store.dispatch({
  type: 'increment',
  count: 10,
}, {
  root: true,
})
```

`Vuex`内部是用`unifyObjectStyle`处理这两种不同模式的数据的：

```js
function unifyObjectStyle (type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload
    payload = type
    type = type.type
  }

  if (__DEV__) {
    assert(typeof type === 'string', `expects string as the type, but found ${typeof type}.`)
  }

  return { type, payload, options }
}
```

如果第一个参数是对象，且包含`type`属性，则说明调用方式是第二种，通过调整参数位置，返回真正的参数。

接下来看一下`installModule`：

```js
function installModule (store, rootState, path, module, hot) {
  const isRoot = !path.length
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && __DEV__) {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      if (__DEV__) {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join('.')}"`
          )
        }
      }
      Vue.set(parentState, moduleName, module.state)
    })
  }

  const local = module.context = makeLocalContext(store, namespace, path)

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}

function getNestedState (state, path) {
  return path.reduce((state, key) => state[key], state)
}
```

首先用`store._modules.getNamespace(path)`方法获取了`namespace`，`getNamespace`定义在`ModuleCollection`中：

```js
getNamespace (path) {
  let module = this.root
  return path.reduce((namespace, key) => {
    module = module.getChild(key)
    return namespace + (module.namespaced ? key + '/' : '')
  }, '')
}
```

`getNamespace`就是遍历了`path`，然后依次获取模块，如果模块上定义了`namespace`为`true`，则加上`key/`，否则返回`''`，这样就获取了`path`对应的命名空间。

然后在`store._modulesNamespaceMap`中存储了以`namespace`为`key`的`模块`，这样做的目的是为了方便读取。

对于非根模块和非热更新时，如果父模块`state`的`key`和子模块的`key`重复时，则发出告警。下面是这种重复场景的一个例子：

```js
new Vuex.Store({
  state: {
    a: 1,
  },
  modules: {
    a: {
      namespace: true,
      // ...
    }
  }
})
```
然后调用了`Vue.set(parentState, moduleName, module.state)`，这样`state`可以变成连环调用比如`this.$store.a.b`，同时也维护了`state`的响应式（后面会提到）。

接下来调用`local=module.context=makeLocalContext(store, namespace, path)`获取模块的上下文环境，这个函数的作用是对于`namespace`为`true`的模块，覆盖默认的`commit/dispatch/state/getters`：

```js
function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === ''

  const local = {
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (__DEV__ && !store._actions[type]) {
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
          return
        }
      }

      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (__DEV__ && !store._mutations[type]) {
          console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`)
          return
        }
      }

      store.commit(type, payload, options)
    }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}
```

`makeLocalContext`中的`dispatch`和`commit`，判断如果存在`namespace`，且`options.root`不为`true`，则在`type`前加上`namespace`，并调用之前的`dispatch/commit`方法。

对于`state`，覆盖了之前的`get`方法，可以用嵌套的方式获取`state`，比如`this.$store.a.b.c`，注意这里`namespace`的值对`state`的获取是没有影响的，[官方文档](https://vuex.vuejs.org/zh/guide/modules.html#%E5%91%BD%E5%90%8D%E7%A9%BA%E9%97%B4)中也有说明。

对于`getters`，如果存在`namespace`，则调用`makeLocalGetters(store, namespace)`：

```js
function makeLocalGetters (store, namespace) {
  if (!store._makeLocalGettersCache[namespace]) {
    const gettersProxy = {}
    const splitPos = namespace.length
    Object.keys(store.getters).forEach(type => {
      // skip if the target getter is not match this namespace
      if (type.slice(0, splitPos) !== namespace) return

      // extract local getter type
      const localType = type.slice(splitPos)

      // Add a port to the getters proxy.
      // Define as getter property because
      // we do not want to evaluate the getters in this time.
      Object.defineProperty(gettersProxy, localType, {
        get: () => store.getters[type],
        enumerable: true
      })
    })
    store._makeLocalGettersCache[namespace] = gettersProxy
  }

  return store._makeLocalGettersCache[namespace]
}
```

`makeLocalGetters`就是遍历了`store.getters`，如果找到了前缀和`namespace`相同的`getter`，就把剩余的`type`赋值为`localType`，并设置代理。这样访问`localType`的时候，就是访问完整的`namespace+localType`。

回到`installModule`中，接下来依次执行了：`registerMutation`、`registerAction`、`registerGetter`，然后对子模块递归执行了`installModule`。

`mutation/action/getters`的注册比较相似，我们先看下`registerMutation`:

```js
function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}
```

`registerMutation`就是把`mutation`保存到`store`的`_mutations`这个对象中。注意第三个参数`handler`就是用户定义的`mutation`函数。当我们调用`commit`的时候，其实就是取出其中的一个函数来执行。

`registerMutation`略有不同，`action`中间可以有异步操作，并且其返回的是`Promise`，所以在调用`handler`返回结果后，用`Promise`包裹了一层。

```js
function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload) {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload)
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}
```

`registerGetter`的逻辑比较简单，将所有的`getters`收集在`store._wrappedGetters`中，这里的`rawGetter`就是用户定义的`getter`函数。

```js
function registerGetter (store, type, rawGetter, local) {
  if (store._wrappedGetters[type]) {
    if (__DEV__) {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}
```

#### (3) resetStoreVM

在递归的安装完模块后，调用了`resetStoreVM(this, this.state)`，主要作用是将`state`变成响应式，并且将`getters`存储在`computed`中，使其具有缓存性。

```js
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  // reset local getters cache
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent
}
```

`store._vm`定义了一个`$$state`指向`state`的`data`，然后将所有的`getters`放到`computed`中。

当我们访问`getters[key]`时，就是访问`store._vm[key]`，也就是`computed[key]`。当`state`改变时，`computed[key]`相应改变，`getters[key]`也就发生变化。


#### (4) commit

`store`提供了`commit`和`dispath`两个API，用以改变数据，其中`commit`由于改变`mutation`，`dispatch`用于派发`action`。下面看一下`commit`：

```js
class Store {
  // ...
  commit (_type, _payload, _options) {
    // check object-style commit
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = { type, payload }
    const entry = this._mutations[type]
    
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })

    // ....
  }
}
```

`commit`的逻辑比较简单，我们在上面也简单提到了，其主要作用是找到`this._mutations[type]`，并依次执行它们。

为什么`this._mutations[type]`是数组呢，是因为这里的`type`是`namespace+lolcalType`，可能在根模块存在一个`mutation`名字是`a/increase`，同时有个子模块的`key`为`a`，子模块中存在一个`key`为`increase`的`mutation`。

注意这里`mutation`的执行是在`this._withCommit`中执行的，这个是配合严格模式检查用的，我们在后面会讲到。

#### (5) dispatch

`dispatch`和`commit`的实现类似，找到对应的`this._actions[type]`，赋值给`entry`。如果`entry`多于1个，则用`Promise.all`包裹。

注意执行`entry`前后都遍历了订阅者，进行了相应的调用，然后返回了`result`。


```js
class Store {
  // ...

  dispatch (_type, _payload) {
    // check object-style dispatch
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const action = { type, payload }
    const entry = this._actions[type]

    try {
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (__DEV__) {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }

    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)

    return new Promise((resolve, reject) => {
      result.then(res => {
        try {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after(action, this.state))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in after action subscribers: `)
            console.error(e)
          }
        }
        resolve(res)
      }, error => {
        try {
          this._actionSubscribers
            .filter(sub => sub.error)
            .forEach(sub => sub.error(action, this.state, error))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in error action subscribers: `)
            console.error(e)
          }
        }
        reject(error)
      })
    })
  }
}
```

#### (6) 严格模式

`Vuex`中有个`strict`选项，当设置为`true`的时候：
>会使`Vuex store`进入严格模式，在严格模式下，任何`mutation`处理函数以外修改`Vuex state`都会抛出错误。

这个是怎么实现的呢，我们来看一下：

```js
function resetStoreVM(store, state, hot) {
  // ...
  if (store.strict) {
    enableStrictMode(store)
  }
}

function enableStrictMode (store) {
  store._vm.$watch(function () { return this._data.$$state }, () => {
    if (__DEV__) {
      assert(store._committing, `do not mutate vuex store state outside mutation handlers.`)
    }
  }, { deep: true, sync: true })
}
```

当开启了严格模式后，会执行`enableStrictMode`方法，这个方法会监听`store._vm._data.$$state`的变化，当其发生变化时，如果`store._committing`不为`true`，就会告警。

`_committing`默认为`false`，那么我们只要保证只有`mutation`中改变`state`时才让`_committing`变为`true`，那么其他方式的改变自然会触发告警了。

`mutation`中对`state`的改变是在`_withCommit`中进行的，`_withCommit`的定义在下面，先将`_commiting`设置为`false`，然后执行`fn`，最后将`_commiting`再设置回`false`，这样就实现了严格模式。

```js
class Store {
  constructor() {
    this._committing = false
  }

  // ...

  _withCommit (fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}
```

### 3. 其他API

除了`Store`中提供的一些API外，`Vuex`还提供了`mapState/mapGetters`等API，其本质是一种语法糖，我们一起看一下。

#### mapState

先来看一下`mapState`：

```js
export const mapState = normalizeNamespace((namespace, states) => {
  const res = {}
  if (__DEV__ && !isValidMap(states)) {
    console.error('[vuex] mapState: mapper parameter must be either an Array or an Object')
  }
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState () {
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
})

function getModuleByNamespace (store, helper, namespace) {
  const module = store._modulesNamespaceMap[namespace]
  if (__DEV__ && !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`)
  }
  return module
}
```

`mapState`调用了`normalizeNamespace`。`normalizeNamespace`作用是兼容了两种不同的参数：

```js
computed: {
  // 第一种
  ...mapState('some/nested/module', {
    a: state => state.a,
    b: state => state.b
  }),
  // 第二种
  ...mapState({
    a: state => state.some.nested.module.a,
    b: state => state.some.nested.module.b
  })
}
```

`normalizeNamespace`的逻辑如下：

```js
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}
```

然后遍历`states`，如果有`namespace`，则通过`getModuleByNamespace`找到对应的`module`，取出其中的`state`和`getters`。然后执行`mapState`回调或者直接返回对应的`key`。

`mapGetters/mapMutations/mapActions`的逻辑和`mapState`大同小异，其分别取出对应的`getters/commit/dispatch`，并进行了调用，这里不再赘述。


## 三、流程图

`Vuex`的核心流程都在`Store`中，在实例化`Store`的过程中，依次进行了生成模块树、递归安装模块、初始化`store._vm`等，并且暴露出`commit`和`dispatch`等核心API。

文章最后再贴一下流程图，加深理解：

<img src="http://doc.uwayfly.com/vuex-code-mode-3.png" width="700">


## 四、总结

`Vuex`的逻辑清晰，顺着引用路径依次读下去就可大致懂得其原理。`Vuex`中的主要流程包括：初始化模块树、安装模块、实现响应式。另外，`Vuex`中`state`的响应式和`getters`的缓存实现的非常巧妙，值得学习。


## 五、相关资料

1. [Vuex源码](https://github.com/vuejs/vuex)
2. [Vue.js技术揭秘](https://ustbhuangyi.github.io/vue-analysis/v2/vue-router/)



## 1. 开始

本文探究了关于 Vue 实例的几个问题，及其内在原因。

在 Vue 组件中的 `methods` 方法、`mounted` 等生命周期中，可以通过 `this` 访问 Vue 组件的实例，其中 `this.$root` 指向根实例。


## 2. 问题

### 2.1. 关于 _uid

`_uid` 就是 Vue 实例的唯一 ID，每新建一个 Vue 对象，`_uid` 就会加1。打印下 Vue 根实例：

<img src="http://doc.uwayfly.com/vue-instance-2.png" width="900">

看到它的 `_uid` 是 `3`，为什么不是 `0` 呢？

看下源码，`_uid` 是在 Vue 的 `_init` 方法中定义的，只有在 `Vue.extend` 和 Vue 构造函数中才会调用 `_init`。

```js
// src/core/instance/init.js
let uid = 0

Vue.prototype._init = function (options?: Object) {
  const vm: Component = this
  // a uid
  vm._uid = uid++
  
  // ...
}
```


```js
// src/core/instance/index.js
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
```

```js
// src/core/global-api/extend.js
 Vue.extend = function (extendOptions: Object): Function {
  extendOptions = extendOptions || {}
  const Super = this
  const SuperId = Super.cid
 
  const Sub = function VueComponent (options) {
    this._init(options)
  }

  // ...
}
```


`Vue.extend` 是使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象。比如：

```js
// 创建构造器
var Profile = Vue.extend({
  template: '<p>{{firstName}} {{lastName}} aka {{alias}}</p>',
  data: function () {
    return {
      firstName: 'Walter',
      lastName: 'White',
      alias: 'Heisenberg'
    }
  }
})
// 创建 Profile 实例，并挂载到一个元素上。
new Profile().$mount('#mount-point')
```

但是我们项目没有用到 `Vue.extend`。

通过调试，发现在 `app.js` 的 `new Vue` 之前，调用 Vue 构造函数的有 `ebus` 和 Vuex。其中 Vuex 调用了 `new Vue` 两次：

```js
// vuex/src/store.js

export class Store {
  constructor (options = {}) {
    this._watcherVM = new Vue()
    resetStoreVM(this, state)
    // ...
  }
}

function resetStoreVM (store, state, hot) {
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  // ...
}
```

下面看下 `ebus` 的实现。

`ebus` 的实现借助了 Vue 自带的 `$emit`、[$on](https://cn.vuejs.org/v2/api/#vm-on) 等 API，其原理与 NodeJS 中的 EventEmitter 一致。项目中的 `ebus` 定义如下：

```js
const install = function (Vue) {
  const eBus = new Vue({
    methods: {
      emit(event, ...args) {
        this.$emit(event, ...args);
      },
      on(event, callback) {
        this.$on(event, callback);
      },
      off(event, callback) {
        this.$off(event, callback);
      },
    },
  });
  Vue.prototype.$ebus = eBus;
};

Vue.use(install);
```


这里新建一个新的 Vue，可以保证 `ebus` 是独立的。在项目中可以这样使用：

```js
this.$ebus.on('onRegister', this.showRegisterDialog);
this.$ebus.emit('onRegister', {})
this.$ebus.off('onRegister', this.showRegisterDialog);
```

通过上面分析，我们知道了项目中的 Vue 根实例的 `_uid` 为什么是 `3` 了。

注意，SSR 项目中，用户每刷新一次，相当于一个新的请求，会重新 `createApp`，也就重新生成 Vue 实例，`_uid` 也就会递增。



### 2.2. 为什么 Vue.mixin 要在实例化之前才生效？

看下面代码：

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


其实原因很简单，Vue 实例化的时候，会把 `Vue.options` 上的方法放到实例对象 `app` 上，在 `new Vue` 之后再调用 `Vue.mixin`，已经改变不了这个实例对象 `app` 了。

`Vue.mixin` 定义如下，就是将 Vue 类上的 `options` 融合：

```js
// src/core/global-api/mixin.js
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 这里的this是Vue类
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
```

Vue 实例化的时候会调用 `_init`，在 `_init` 中会调用 `mergeOptions`，将 `vm` 构造函数（其实就是 Vue 类）上的 `options` 融合进 `vm.$options` 中：

```js
// src/core/instance/init.js
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this

    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    // ...
  }
}
```

在 `initState` 中会调用 `initMethods`，初始化 `methods`，将 `vm.$options` 中的方法融合进去：

```js
// src/core/instance/state.js
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}
```

最后看到 `methods` 中的方法其实是挂在是实例的最外层的，打印一个组件实例看看：

<img src="http://doc.uwayfly.com/vue-instance-3.png" width="900">

上图中的 `getActReward`、`getTaskReward` 等就是实例上的方法。


### 2.3. vnode

`vm._vnode` 和 `vm.$vnode` 的关系就是一种父子关系，用代码表达就是：

```ts
vm._vnode.parent === vm.$vnode
```


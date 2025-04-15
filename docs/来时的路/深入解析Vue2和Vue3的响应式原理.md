## 一、Vue2 解析

本次分析的Vue2版本为2.6。

### 1. 响应式原理

1、从 `new Vue` 开始，经过了一系列调用 [init](https://github.com/vuejs/vue/blob/2.6/src/core/instance/init.js#L16)、[initState](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L48)、[initData](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L112)、[observe](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L151)、[new Obsever](https://github.com/vuejs/vue/blob/2.6/src/core/observer/index.js#L37)、[defineReactive](https://github.com/vuejs/vue/blob/2.6/src/core/observer/index.js#L135)，来看下`defineReactive`的实现。


```js
function defineReactive(obj, key, val) {
  const dep = new Dep();
  Object.defineProperty(obj, key, {
    get() {
      const value = val;
      // 如果存在依赖此数据的Watcher，则进行依赖搜集
      if (Dep.target) {
        dep.depend();
      }
      return value;
    },
    set(newVal) {
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      val = newVal;
      // 数据更新的时候进行派发更新
      dep.notify();
    },
  });
}
```

2、通过 [get](https://github.com/vuejs/vue/blob/2.6/src/core/observer/index.js#L160)、[set](https://github.com/vuejs/vue/blob/2.6/src/core/observer/index.js#L173) 监听 `Data` 中的数据变化，同时为每一个属性创建 [Dep](https://github.com/vuejs/vue/blob/2.6/src/core/observer/dep.js#L13) 用来搜集使用该 `Data` 的 `Watcher`，来看下`Dep`的实现。

```js
class Dep {
  static target;
  // subs 存放的 Watcher 对象集合
  subs;

  constructor() {
    this.subs = [];
  }
  addSub(sub: Watcher) {
    this.subs.push(sub);
  }
  depend() {
    if (Dep.target) {
      // 依赖收集，会调用上面的 addSub 方法
      Dep.target.addDep(this);
    }
  }
  notify() {
    const subs = this.subs.slice();
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}
```

3、编译模板，创建 [Watcher](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L26)，并将 `Dep.target` 标识为当前 `Watcher`，来看下`Watcher`的实现。

```js
class Watcher {
  constructor(vm, expOrFn) {
    // expOrFn 就是 vm._render
    this.getter = expOrFn;
    this.value = this.get();
  }
  get() {
    Dep.target = this;
    // 重新触发_render函数，生成VDom、更新Dom
    const value = this.getter.call(this.vm, this.vm);
    return value;
  }
  addDep(dep) {
    // 收集当前的Watcher为依赖
    dep.addSub(this);
  }
  update() {
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }
  run() {
    const value = this.get();
  }
}
```

4、编译模板时，如果使用到了 `Data` 中的数据，就会触发 `Data` 的 `get` 方法，然后调用 `Dep.addSub` 将 `Watcher` 搜集起来。

5、数据更新时，会触发 `Data` 的 `set` 方法，然后调用 [dep.notify](https://github.com/vuejs/vue/blob/2.6/src/core/observer/dep.js#L37)，进而调用 [watcher.update](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L164) 方法，将所有使用到这个 `Data` 的 `Watcher` 加入一个[异步队列](https://github.com/vuejs/vue/blob/2.6/src/core/observer/scheduler.js#L130)。

6、最终执行 [_render](https://github.com/vuejs/vue/blob/2.6/src/core/instance/render.js#L62) 方法完成页面更新


流程图如下：

<img src="http://doc.uwayfly.com/vue-code-reactive.png" width="900">


### 2. `watch`原理

`computed`和`watch`内部都是利用了`watcher`，`user watcher`的过程如下：

1. Vue 在 [initWatch](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L290) 过程中，创建`Watcher`，并设置标志位 [user](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L355) 为`true`，并判断用户是否设置了`immediate`为`true`，如果是，立即执行回调；
2. `watch`的对象 [update](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L164) 时，判断是否设置了`sync`为`true`，如果是，不加入异步队列，直接更新；
3. `Watcher`更新时判断标志位`user`是否为`true`，如果是，则执行用户传入的 [cb](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L195)，把`newVal`和`oldVal`传入。

### 3. `computed`原理

看这个例子：

```js
computed: {
  name() {
    return `My name is ${this.user.name}`;
  }
}
```

`computed watcher`的过程如下：

1. Vue 在 [initComputed](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L169) 过程中，创建标志位`lazy`为`true`的`Watcher`：
2. 因为初始化的时候`dirty=lazy=true`，会调用 [watcher.evaluate](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L246) 方法进行一次求值 [this.getter.call(vm, vm)](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L106) ，此时会访问`this.user.name`，所以会触发其依赖收集。这时候`Dep.target`的值为`computed watcher`，依赖收集完后，`this.user.name`的`dep`中就有了`computed watcher`；
3. 然后在`watcher.evaluate`中将`dirty`设置为`false`；
4. 如果`Dep.target`存在，则调用 [watcher.depend](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L249) 进行一次`render watcher`的收集；

```js
// 创建computed的getter的工厂函数
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```

1. 当 `name` 值改变时，会触发`set`，然后通知 `computed watcher`，执行 [update](https://github.com/vuejs/vue/blob/2.6/src/core/observer/watcher.js#L164) 方法，并将`dirty`设置为`true`。
2. 再次访问`computed`属性时，如果`dirty`为`false`，则不会执行 [watcher.evaluate](https://github.com/vuejs/vue/blob/2.6/src/core/instance/state.js#L246) 方法，直接返回之前缓存的值，如果`dirty`为`true`，则重新计算。


## 二、Vue3 解析

Vue3 的代码在 [vue-next](https://github.com/vuejs/vue-next) 仓库中，本次分析的版本是3.2。响应式部分在`reactivity`文件夹中，并且可独立引用。

Vue3 的响应式多了一个副作用函数，即`effect`函数，指的是响应式数据在发生变更的时候，要执行的函数。

### 1. 响应式原理

1. [reactive](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/reactive.ts#L88) 函数对包裹的对象进行 [proxy](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/reactive.ts#L204) 代理，在 [get](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/baseHandlers.ts#L40) 中利用 [track](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/baseHandlers.ts#L114) 函数进行依赖收集，在 [set](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/baseHandlers.ts#L138) 中利用 [trigger](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/baseHandlers.ts#L168) 派发更新。


```ts
function reactive(obj: any) {
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      let res = Reflect.get(target, key);
      return res;
    },
    set: function (target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return res;
    }
  });
  return proxy;
}
```

2. 依赖收集在 [targetMap](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/effect.ts#L18) 中，其是一个`WeakMap`，`key`是响应式对象，`value`是`Map`类型的 [depsMap](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/effect.ts#L192)。`depsMap`的`key`是响应式对象的`key`，`value`是 [effect](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/effect.ts#L53) 函数。

```ts
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

function trigger(target: any, key: ObjKeyType) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }

  let deps = depsMap.get(key);
  if (deps) {
    deps.forEach((efn: EffectFn) => efn());
  }
}

function track(target: any, key: ObjKeyType) {
  if (effectStack.length === 0) return;

  let depMap = targetMap.get(target);
  if (!depMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let deps = depMap.get(key);
  if (!deps) {
    depMap.set(key, (deps = new Set()));
  }

  // 添加栈顶副作用作为依赖
  deps.add(getCurrentEffect());
}
```

3. 响应式Data更新的时候会触发 [trigger](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/effect.ts#L243)，然后从`targetMap`中取出对应的依赖进行更新。
4. `effect`函数的创建时机包括 [mountComponent](https://github.com/vuejs/vue-next/tree/3.2/packages/runtime-core/src/renderer.ts#L1278)、[computed](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/computed.ts#L51)、[watch](https://github.com/vuejs/vue-next/tree/3.2/packages/runtime-core/src/apiWatch.ts#L134) 等。

流程图如下：


<img src="http://doc.uwayfly.com/vue3-code-reactive.png" width="700">


### 2. `ref`原理
[ref](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/ref.ts#L86) 是一个语法糖，返回一个对象，其在`get`中调用`track`，`set`中调用`trigger`。

```js
function ref(value) {
  const res = {
    get value() {
      track(res, 'value');
      return value;
    },
    set value(newVal) {
      value = newVal;
      trigger(res, 'value');
    }
  };

  return res;
}
```


### 3. Vue3 的`computed`原理

1. [computed](https://github.com/vuejs/vue-next/tree/3.2/packages/reactivity/src/computed.ts#L112) 内部用`effect`函数包裹传入的函数`getter`，并执行`getter`，拿到`value`；
2. 内部`effect`中调用了`trigger`，这样computed依赖的值变化的时候，会触发此`effect`函数执行，也就能够触发依赖`computed`的`effect`函数也得到执行；
3. 构造一个对象，对象的`get`方法中调用了`track`，进行了一次依赖收集；
4. 最后返回构造的对象


```js
function computed(getter) {
  let value;
  let res;
  effect(() => {
    value = getter();
    trigger(res, 'value');
  })
  res = {
    get value() {
      track(this, 'value');
      return value;
    }
  }
  return res;
}
```


## 三、总结

对比 Vue2 和 Vue3 的响应式实现方式的不同，可以看出
1. Vue2 使用`Object.defineProperty`进行数据劫持，Vue3 使用`Proxy`，后者优势在于可以劫持`push`、`pop`等方法，也因为在顶层对象直接劫持，可以提高性能。
2. 依赖收集器的数据结构有变化，Vue2 的依赖收集在`Dep.subs`中，也就是一个类的数组中，Vue3 的依赖收集在`targetMap`中，其是一个`WeakMap`。
3. Vue3 的响应式结构更加简单，与其他部分耦合性小，并已经独立成包，即可以和其他框架进行结合。


## 四、相关资料

1. [图解 Vue 响应式原理](https://juejin.cn/post/6857669921166491662)
2. [搞懂computed和watch原理，减少使用场景思考时间](https://juejin.cn/post/6844903926819454983)
3. [Vue源码之computed和watch](https://blog.csdn.net/zhoulei1995/article/details/114447005)
4. [Vue.js 技术揭秘](https://ustbhuangyi.github.io/vue-analysis/)
5. [vue3.0响应式函数原理](https://juejin.cn/post/6972769060324900871)
6. [手写Vue3 响应式（Reactivity）模块](https://juejin.cn/post/6994459104945291295)
7. [vue3源码分析（三）—— 响应式系统（reactivity）](https://blog.csdn.net/qq_36131788/article/details/118995492)
8. [Vue3 深度解析](https://blog.csdn.net/weixin_37543731/article/details/103268732)


-------

20240301 更新

-------





### 为什么引入 Watcher

Vue 中定义一个 Watcher 类来表示观察订阅依赖。至于为啥引入Watcher，《深入浅出vue.js》给出了很好的解释:

当属性发生变化后，我们要通知用到数据的地方，而使用这个数据的地方有很多，而且类型还不一样，既有可能是模板，也有可能是用户写的一个watch,这时需要抽象出一个能集中处理这些情况的类。然后，我们在依赖收集阶段只收集这个封装好的类的实例进来，通知也只通知它一个，再由它负责通知其他地方。

「依赖收集的目的是:」 将观察者 Watcher 对象存放到当前闭包中的订阅者 Dep 的 subs 中。形成如下所示的这样一个关系（图参考《剖析 Vue.js 内部运行机制》）。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/3/own_mike_3099b1207f542cb05e.png" width="600">



### Watcher 和 Observer 的理解

Watcher 是依赖，Dep 是依赖列表，Observer 是观察者

Watcher 是靠近模版一侧，或者是自定义的 Watcher。而 Observer 是对开发者声明的 data，进行响应式劫持，get 中会把 Watcher 放到 dep.subs中， set 时会依次触发 sub 的 notify，来更新视图

data 的每一个 key，在 Observer 劫持时，都有一个独立的 Dep 对象

Watcher 只在构造函数中对 Dep.target 赋值一次 this，也就可以防止重复被收集。

「依赖的本质：」

所谓的依赖，其实就是Watcher。

至于如何收集依赖，总结起来就一句话:

在getter中收集依赖（收集Watch当如Dep中），在setter中触发依赖。先收集依赖，即把用到该数据的地方收集起来，然后等属性发生变化时，把之前收集好的依赖循环触发一遍就行了。


### Dep 和 Watcher 的关系

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/3/own_mike_af2a5ba272a89d2ab4.webp" width="600">


Observer 负责将数据转换成 getter/setter 形式； Dep 负责管理数据的依赖列表；是一个发布订阅模式，上游对接 Observer，下游对接 Watcher Watcher 是实际上的数据依赖，负责将数据的变化转发到外界(渲染、回调)； 首先将 data 传入 Observer 转成 getter/setter 形式；当 Watcher 实例读取数据时，会触发 getter，被收集到 Dep 仓库中；当数据更新时，触发 setter，通知 Dep 仓库中的所有 Watcher 实例更新，Watcher 实例负责通知外界

- Dep 负责收集所有相关的的订阅者 Watcher ，具体谁不用管，具体有多少也不用管，只需要根据 target 指向的计算去收集订阅其消息的 Watcher 即可，然后做好消息发布 notify 即可。
- Watcher 负责订阅 Dep ，并在订阅的时候让 Dep 进行收集，接收到 Dep 发布的消息时，做好其 update 操作即可。


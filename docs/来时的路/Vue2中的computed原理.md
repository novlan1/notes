## 一、开始

本文讲解 Vue2 中的 `computed` 的基本原理，文中的代码可以在[这里](https://github.com/novlan1/test-vue-reactive)看到。

`computed` 借助了 Vue 响应式原理的基本结构，核心只是在 `Watcher` 上增加了 `deps` 属性，巧妙的实现了这一方便的功能。

如果不了解 Vue 的响应式基本原理，建议先阅读响应式相关文章。

## 二、原理


### 1. 前置知识

观察者模式是基于目标的，发布订阅模式是基于事件的，二者还是不同的。比如，在微博上关注某个用户相当于观察者模式，关注某个话题，相当于发布订阅模式。Vue 中的响应式原理利用的是观察者模式。

依赖收集指的是，对组件依赖的数据进行收集，发生在 `get` 阶段。

在 Vue2 依赖收集里，依赖的数据是观察目标，而视图、计算属性、侦听器是观察者。

`Dep`，可以理解为观察目标，每个数据都有一个 `Dep` 实例，内部有 `subs` 队列，`subs` 保存者依赖本数据的观察者。

`Watcher`，为观察者，可分为 `render` 函数执行时的 `渲染watcher`、`计算watcher`、`用户watcher`等。`Watcher` 实例上有 `deps` 列表，保存依赖的数据的 `dep`。


### 2. 初始化

`computed` 本质是一个 `Watcher`，带有 `dirty` 属性。

先假设有个 Vue 实例如下：

```js
const vm = new Vue({
  data() {
    return {
      count: 0,
    };
  },
  computed: {
    sum() {
      return this.count + 1;
    },
  },
});
```



我们用下面的方法模拟 DOM 使用 `computed` 元素，用来测试 `computed` 属性：

```js
new Watcher(vm, 'sum', (value) => {
  console.log('sumCb', value);
});
```

在 Vue 初始化的时候，会进入到初始化 `computed` 的函数

```js
var watchers = vm._computedWatchers = Object.create(null);

// 依次为每个 computed 属性定义
for (const key in computed) {
  const userDef = computed[key]
  watchers[key] = new Watcher(
      vm, // 实例
      getter, // 用户传入的求值函数 sum
      noop, // 回调函数 可以先忽视
      { lazy: true } // 声明 lazy 属性 标记 computed watcher
  )

  // 用户在调用 this.sum 的时候，会发生的事情
  defineComputed(vm, key, userDef)
}
```

每个`计算watcher`初始化后的结构大致如下：


```js
{
    deps: [],
    dirty: true,
    getter: ƒ sum(),
    lazy: true,
    value: undefined
}
```

Watcher 的定义如下：

```js
class Watcher {
  constructor(vm, expOrFn, cb, options) {
    this.vm = vm;
    this.cb = cb;
    this.deps = [];

    // expOrFn:string|function
    this.getter = typeof expOrFn === 'function'
      ? expOrFn
      : function () {
        // this:vm
        return this[expOrFn];
      };
    this.lazy = false;

    if (options) {
      this.lazy = !!options.lazy;
    }

    this.dirty = this.lazy;
    this.value = this.lazy
      ? undefined
      : this.get();
  }

  // watcher 的 addDep函数
  addDep(dep) {
    // 这里会把 count 的 dep 也存在自身的 deps 上
    this.deps.push(dep);

    // 又带着 watcher 自身作为参数
    // 回到 dep 的 addSub 函数了
    dep.addSub(this);
  }


  get() {
    pushTarget(this);
    const { vm } = this;
    const value = this.getter.call(vm, vm);
    popTarget();
    return value;
  }

  run() {
    const value = this.get();
    const oldValue = this.value;
    this.value = value;
    this.cb.call(this.vm, value, oldValue);
  }

  update() {
    if (this.lazy) {
      this.dirty = true;
    } else {
      Promise.resolve().then(() => {
        this.run();
      });
    }
  }

  depend() {
    let i = this.deps.length;
    // eslint-disable-next-line no-plusplus
    while (i--) {
      this.deps[i].depend();
    }
  }

  // 惰性 watcher手动求值
  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }
}
```

### 3. 依赖收集

`渲染watcher` 使用 `computed` 中的值（`sum`），就是会执行`渲染watcher`的 `get` 方法，这时 `Dep.target` 为`渲染watcher`。 

`get` 就是获取 `this.sum`，`this.sum` 其实就是 `计算watcher` 定义的 `get`，也就是执行：

```js
if (watcher.dirty) {
  watcher.evaluate()
}

if (Dep.target) {
  watcher.depend()
}

return watcher.value
```


调用 `watcher.evaluate`，这里的 `watcher` 也是`计算watcher`：

```js
this.value = this.get()
this.dirty = false
```

调用 `this.get`，也就是 `watcher.get`，这里的 `watcher` 也是 `计算watcher`，这时 `Dep.target` 也是 `计算watcher`。

`this.get` 也就是执行 `this.count + 1`。

读取 `count` 时，进入 `count` 的 `get` 中，进一步调用 `dep.depend`，注意这里的dep是 `count` 的 `dep`：

```js
class Dep {
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  addSub(sub) {
    if (!this.subs.includes(sub)) {
      this.subs.push(sub);
    }
  }
}
```

```js
class Watcher {
 addDep(dep) {
    // 这里会把 count 的 dep 也存在自身的 deps 上
    this.deps.push(dep);

    // 又带着 watcher 自身作为参数
    // 回到 dep 的 addSub 函数了
    dep.addSub(this);
  }
}
```


```js
dep.depend() => // dep 指的是count的dep
Dep.target.addDep(this) => // this 指的是count的dep，Dep.target 是计算watcher
this.deps.push(dep);dep.addSub(this); => // this 是计算watcher，dep 指的是count的dep
this.subs.push(sub) // // this 指的是count的dep，sub 是计算watcher
```


经过上面的操作，`sum的计算watcher` 的 `deps` 中会有 `count` 的 `dep`，`count` 的 `dep` 中的 `subs`有 `sum` 的`计算watcher`。


`sum` 的 `计算watcher`：

```js
{
    deps: [ count的dep ],
    dirty: false, // 求值完了 所以是false
    value: 2, // 1 + 1 = 2
    getter: ƒ sum(),
    lazy: true
}
```

`count` 的 `dep`：

```js
{
    subs: [ sum的计算watcher ]
}
```

这里对 `dep.depend()` 方法总结下，就是向一个观察者 Watcer 中添加某 `dep`，同时向该 `dep` 的 `subs` 添加 `watcher`。注意，这一过程重要的是 `Dep.target` 变量，在某一时刻，只有一个 `Wacher` 被参与到 `dep.depend` 中，这一次是`计算watcher`。

求值结束后，`targetStack` 弹出`计算watcher`，当前 `Dep.target` 为`渲染watcher`

```js
this.dirty = false
```

进入：

```js
if (Dep.target) {
  watcher.depend();
}
```

进入是 `watcher.depend` 方法，就是遍历 `watcher` 的 `deps`，对每个 `dep` 调用 `depend` 方法：

```js
 depend() {
  let i = this.deps.length;
  // eslint-disable-next-line no-plusplus
  while (i--) {
    this.deps[i].depend();
  }
}
```

这里的 `watcher` 是`计算watcher`，它的 `deps` 中有 `count` 的 `dep`，会再次调用 `dep.depend()`，上面总结过它的过程了。这次的不同是 `Dep.target` 变成了 `渲染watcher`。

调用 `dep.depend()` 以后，会将 `count` 的 `dep` 中的 `subs` 添加 `渲染watcher`，也就是 

```
{
  subs: [ sum的计算watcher，渲染watcher ]
}
```

另外，`渲染watcher`的 `subs` 中也会包含 `count` 的 `dep`，不过这一变量在这里不会影响派发更新。


### 4. 派发更新

更新 `count` 的时候，会触发 `dep.notify`，而 `count` 的 `dep` 中有 `sum` 的`计算watcher`和`渲染watcher`，会调用它们各自的 `update` 方法：

```js
update() {
  if (this.lazy) {
    this.dirty = true;
  } else {
    Promise.resolve().then(() => {
      this.run();
    });
  }
}
```

对于`计算watcher` 的 `update` 方法，只是将 `dirty` 标志位设为 `true`。

对于`渲染watcher`，最终会调用 `run` 方法，获取新的 `value`，调用 `cb`：

```js
run() {
  const value = this.get();
  const oldValue = this.value;
  this.value = value;
  // console.log('run', value, oldValue);
  this.cb.call(this.vm, value, oldValue);
}
```

## 三、总结

要理解整个 `computed` 的原理，重要的一点是将观察者模式和依赖收集联系起来。Watcher 是观察者，在依赖收集中要收集数据的dep，Dep 是观察目标，在依赖收集里代表每份数据。

`computed` 的依赖收集发生在读取阶段，比如尝试获取 `sum`。

依赖收集阶段，`Dep.target` 先后经历了`渲染watcher`、`计算watcher`、`渲染watcher`，关键是 `count` 的 `dep` 中的 `subs` 会收集到`计算watcher`和`渲染watcher`。

更新的时候，会触发计`算wtcher`和`渲染watcher`的 `update`。



## 四、参考资料

1. [Vue 的计算属性真的会缓存吗？](https://juejin.cn/post/6844904120290131982)
2. [深入解析Vue依赖收集原理](https://zhuanlan.zhihu.com/p/45081605)


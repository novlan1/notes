
## 一、开始

本文讲解 ES6 中的 Proxy 和 Reflect。

## 二、Proxy

Proxy 可以理解成，在目标对象之前架设一层“拦截”，外界对该对象的访问，都必须先通过这层拦截，因此提供了一种机制，可以对外界的访问进行过滤和改写。Proxy 这个词的原意是代理，用在这里表示由它来“代理”某些操作，可以译为“代理器”。

用法：

```js
var proxy = new Proxy(target, handler);
```

`new Proxy()` 表示生成一个 Proxy 实例，`target` 参数表示所要拦截的目标对象，`handler` 参数也是一个对象，用来定制拦截行为。



`new Proxy(target, handler)` 如果第一个参数不是对象，会报错：

```js
Uncaught TypeError: Cannot create proxy with a non-object as target or handler
```

注意，要使得 Proxy 起作用，必须针对 Proxy 实例（上例是 `proxy` 对象）进行操作，而不是针对目标对象（上例是空对象）进行操作。

如果 `handler` 没有设置任何拦截，那就等同于直接通向原对象。

```js
var target = {};
var handler = {};
var proxy = new Proxy(target, handler);
proxy.a = 'b';
target.a // "b"
```

Proxy 支持的拦截操作有以下 13 种：

1. `get(target, propKey, receiver)`：拦截对象属性的读取，比如 `proxy.foo` 和 `proxy['foo']`，第三个参数指的是 proxy 实例本身（严格地说，是操作行为所针对的对象）。
2. `set(target, propKey, value, receiver)`：拦截对象属性的设置，比如 `proxy.foo = v` 或 `proxy['foo'] = v`，返回一个布尔值。
3. `has(target, propKey)`：拦截 `propKey in proxy` 的操作，返回一个布尔值。
4. `deleteProperty(target, propKey)`：拦截 `delete proxy[propKey]` 的操作，返回一个布尔值。
5. `ownKeys(target)`：拦截 `Object.getOwnPropertyNames(proxy)、Object.getOwnPropertySymbols(proxy)`、`Object.keys(proxy)`、`for...in` 循环，返回一个数组。该方法返回目标对象所有自身的属性的属性名，而 `Object.keys()` 的返回结果仅包括目标对象自身的可遍历属性。
6. `getOwnPropertyDescriptor(target, propKey)`：拦截 `Object.getOwnPropertyDescriptor(proxy, propKey)`，返回属性的描述对象。
7. `defineProperty(target, propKey, propDesc)`：拦截 `Object.defineProperty(proxy, propKey, propDesc）`、`Object.defineProperties(proxy, propDescs)`，返回一个布尔值。
8. `preventExtensions(target)`：拦截 `Object.preventExtensions(proxy)`，返回一个布尔值。
9. `isExtensible(target)`：拦截 `Object.isExtensible(proxy)`，返回一个布尔值。
10. `getPrototypeOf(target)`：拦截 `Object.getPrototypeOf(proxy)`，返回一个对象。
11. `setPrototypeOf(target, proto)`：拦截 `Object.setPrototypeOf(proxy, proto)`，返回一个布尔值。如果目标对象是函数，那么还有两种额外操作可以拦截。
12. `apply(target, object, args)`：拦截 Proxy 实例作为函数调用的操作，比如 `proxy(...args)`、`proxy.call(object, ...args)`、`proxy.apply(...)`。
13. `construct(target, args)`：拦截 Proxy 实例作为构造函数调用的操作，比如 `new proxy(...args)`。


### 1. receiver

`get` 拦截操作的第三个参数 `receiver`，总是指向原始的读操作所在的那个对象，一般情况下就是 Proxy 实例。

```js
const proxy = new Proxy({}, {
  get: function(target, key, receiver) {
    return receiver;
  }
});
proxy.getReceiver === proxy // true
```

上面代码中，`proxy `对象的 `getReceiver` 属性是由 `proxy` 对象提供的，所以 `receiver` 指向 `proxy` 对象。

```js
const proxy = new Proxy({}, {
  get: function(target, key, receiver) {
    return receiver;
  }
});

const d = Object.create(proxy);
d.a === d // true
```

上面代码中，`d` 对象本身没有 `a` 属性，所以读取 `d.a` 的时候，会去 `d` 的原型 `proxy` 对象找。这时，`receiver` 就指向 `d`，代表原始的读操作所在的那个对象。



### 2. this 问题

在 Proxy 代理的情况下，目标对象内部的 `this` 关键字会指向 Proxy 代理。

```js
const target = {
  m: function () {
    console.log(this === proxy);
  }
};
const handler = {};

const proxy = new Proxy(target, handler);

target.m() // false
proxy.m()  // true
```

上面代码中，一旦 `proxy` 代理 `target`，`target.m()` 内部的`this`就是指向`proxy`，而不是 `target`。所以，虽然 `proxy` 没有做任何拦截，`target.m()` 和 `proxy.m()` 返回不一样的结果。

下面是一个例子，由于this指向的变化，导致 Proxy 无法代理目标对象。

```js
const _name = new WeakMap();

class Person {
  constructor(name) {
    _name.set(this, name);
  }
  get name() {
    return _name.get(this);
  }
}

const jane = new Person('Jane');
jane.name // 'Jane'

const proxy = new Proxy(jane, {});
proxy.name // undefined
```

上面代码中，目标对象 `jane` 的 `name` 属性，实际保存在外部 `WeakMap` 对象 `_name` 上面，通过 `this` 键区分。由于通过 `proxy.name` 访问时，`this` 指向 `proxy`，导致无法取到值，所以返回 `undefined`。


另外，Proxy 拦截函数内部的 `this`，指向的是 `handler` 对象。

```js
const handler = {
  get: function (target, key, receiver) {
    console.log(this === handler);
    return 'Hello, ' + key;
  },
  set: function (target, key, value) {
    console.log(this === handler);
    target[key] = value;
    return true;
  }
};

const proxy = new Proxy({}, handler);

proxy.foo
// true
// Hello, foo

proxy.foo = 1
// true
```



## 三、Reflect

Reflect 对象与 Proxy 对象一样，也是 ES6 为了操作对象而提供的新 API。Reflect 对象的设计目的有这样几个。

（1） 将 Object 对象的一些明显属于语言内部的方法（比如 `Object.defineProperty`），放到Reflect 对象上。现阶段，某些方法同时在 Object 和 Reflect 对象上部署，未来的新方法将只部署在Reflect 对象上。也就是说，从 Reflect 对象上可以拿到语言内部的方法。

（2） 修改某些 Object 方法的返回结果，让其变得更合理。比如，`Object.defineProperty(obj, name, desc)` 在无法定义属性时，会抛出一个错误，而 `Reflect.defineProperty(obj, name, desc)` 则会返回 `false`。

```js
// 老写法
try {
  Object.defineProperty(target, property, attributes);
  // success
} catch (e) {
  // failure
}

// 新写法
if (Reflect.defineProperty(target, property, attributes)) {
  // success
} else {
  // failure
}
```


（3） 让 Object 操作都变成函数行为。某些 Object 操作是命令式，比如 `name in obj` 和 `delete obj[name]`，而 `Reflect.has(obj, name)` 和 `Reflect.deleteProperty(obj, name)` 让它们变成了函数行为。

```js
// 老写法
'assign' in Object // true

// 新写法
Reflect.has(Object, 'assign') // true
```

（4）Reflect 对象的方法与 Proxy 对象的方法一一对应，只要是 Proxy 对象的方法，就能在Reflect 对象上找到对应的方法。这就让 Proxy 对象可以方便地调用对应的 Reflect 方法，完成默认行为，作为修改行为的基础。也就是说，不管 Proxy 怎么修改默认行为，你总可以在 Reflect 上获取默认行为。

```js
Proxy(target, {
  set: function(target, name, value, receiver) {
    var success = Reflect.set(target, name, value, receiver);
    if (success) {
      console.log('property ' + name + ' on ' + target + ' set to ' + value);
    }
    return success;
  }
});
```

上面代码中，Proxy 方法拦截 `target` 对象的属性赋值行为。它采用 `Reflect.set` 方法将值赋值给对象的属性，确保完成原有的行为，然后再部署额外的功能。

下面是另一个例子。

```js
var loggedObj = new Proxy(obj, {
  get(target, name) {
    console.log('get', target, name);
    return Reflect.get(target, name);
  },
  deleteProperty(target, name) {
    console.log('delete' + name);
    return Reflect.deleteProperty(target, name);
  },
  has(target, name) {
    console.log('has' + name);
    return Reflect.has(target, name);
  }
});
```

上面代码中，每一个 Proxy 对象的拦截操作（`get`、`delete`、`has`），内部都调用对应的 Reflect 方法，保证原生行为能够正常执行。添加的工作，就是将每一个操作输出一行日志。

有了 Reflect 对象以后，很多操作会更易读。

```js
// 老写法
Function.prototype.apply.call(Math.floor, undefined, [1.75]) // 1

// 新写法
Reflect.apply(Math.floor, undefined, [1.75]) // 1
```


Reflect 对象一共有 13 个静态方法。

- `Reflect.get(target, name, receiver)`
- `Reflect.set(target, name, value, receiver)`
- `Reflect.has(target, name)`
- `Reflect.deleteProperty(target, name)`
- `Reflect.ownKeys(target)`
- `Reflect.getOwnPropertyDescriptor(target, name)`
- `Reflect.defineProperty(target, name, desc)`
- `Reflect.preventExtensions(target)`
- `Reflect.isExtensible(target)`
- `Reflect.getPrototypeOf(target)`
- `Reflect.setPrototypeOf(target, prototype)`
- `Reflect.apply(target, thisArg, args)`
- `Reflect.construct(target, args)`



上面这些方法的作用，大部分与 Object 对象的同名方法的作用都是相同的，而且它与 Proxy 对象的方法是一一对应的。



## 四、在 Proxy 中推荐使用 `Reflect.get`

`Reflect.get(target, prop, receiver)` 以及 `Proxy` 中的 `handler.get(target, prop, receiver)` 这当中的 `receiver` 是什么？

`Reflect.get(target, prop, receiver)`中的参数 `receiver`：如果 `target` 对象中指定了 `getter`，`receiver` 则为 `getter` 调用时的 `this` 值。

`handler.get(target, prop, receiver)`中的参数 `receiver`：Proxy 或者继承 Proxy 的对象。


看下面例子：

```js
const People = new Proxy({
  _name: 'dog',
  get name() {
    return this._name;
  },
}, {
  get(target, prop, receiver) {
    return target[prop];
  },
});

const Man = { _name: 'cat' };
Man.__proto__ = People; // Man继承People
console.log(Man._name); // cat
console.log(Man.name); // dog
```

`Man` 中已经存在 `_name` 属性，但这里 `Man.name` 返回的却是原型链上的 `_name` 属性，原因很好解释：`get name` 中的 `this` 默认绑定为 `People`。

将上面的例子修改为：

```js
const People = new Proxy({
  _name: 'dog',
  get name() {
    return this._name;
  },
}, {
  get(target, prop, receiver) {
    return Reflect.get(target, prop, receiver);
  },
});
const Man = { _name: 'cat' };

Man.__proto__ = People; // Man继承People
console.log(Man._name); // cat
console.log(Man.name); // cat
```

或者：

```js
const People = new Proxy({ _name: 'dog' }, {
  get(target, prop, receiver) { // receiver指向的是get的调用者
    return Reflect.get(target, prop, receiver); // 调用get name函数时，this被绑定到receiver
  },
});

const Man = {
  _name: 'cat',
  get name() {
    return this._name;
  },
};

Man.__proto__ = People; // Man继承People
console.log(Man._name);// cat
console.log(Man.name); // cat
```


都可以得到正确结果。

调用 `Man.name` 时经过了以下几步：

- 被 `proxy` 拦截，调用 `handler.get`
- `handler.get` 中传入的 `receiver` 参数指向调用者-- `Man`
- 调用 `Reflect.get`，由于 `target` 中的 `name` 指定了 `getter`，`Reflect.get` 自动将调用的 `getter` 函数的 `this` 绑定到 `receiver`，也就是 `Man`


## 五、Proxy 和 Reflect 在 Vue3 中的应用


Vue3 中的响应式是基于 Proxy 实现的，在[这里](https://github.com/vuejs/vue-next/blob/3.2/packages/reactivity/src/reactive.ts#L88)可以看到。

```js
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


## 六、相关资料

1. [ECMAScript 6 入门](https://es6.ruanyifeng.com/#docs/reflect)
2. [在es6 Proxy中，推荐使用Reflect.get而不是target[key]的原因](https://blog.csdn.net/qq_34629352/article/details/114210386)




## 一、开始

`generator`函数是异步操作的一种解决方案，本文简单介绍了一下它，并介绍了`gensync`库的一些用法。

## 二、generator

### 1. 基础

`generator`函数是一个状态机，内部封装了多个状态。调用`generator`函数后，并不立即执行，而是返回一个指向内部状态的指针对象，也就是遍历器对象。

调用遍历器对象的`next`方法，会使指针指向下一个状态，也就是每次调用`next`，内部指针就从函数头部或上一次停下来的地方开始执行，执行遇到下一个`yield`表达式或者`return`为止。也就是遇到`yield`会暂停执行，调用`next`会恢复执行。

调用`next`方法返回的对象含有`value`和`done`两个属性，`value`是`yield`表达式的值或者`return`的值，`done`表示是否遍历结束。


下面是一个简单的例子：

```js
function* testGenerator() {
  yield 'hello';
  yield 'world';
  yield 'go';
  return 'out';
}

const res = testGenerator()
res.next() //  { value: 'hello', done: false }
res.next() //  { value: 'world', done: false }
res.next() //  { value: 'go', done: false }
res.next() //  { value: 'out', done: true }

res.next() // { value: undefined, done: true }
res.next() // { value: undefined, done: true }
// ...
```

`next`方法可以带1个参数，会被当作上一个`yield`表达式的返回值。


下面这个函数是无限运行的，可以通过传入`next`的参数让其重置。

```js
function* f() {
  for (let i = 0;true; i++) {
    const reset = yield i;
    if (reset) i = -1
  }
}

const r = f()
r.next(); // { value: 0, done: false }
r.next(); // { value: 1, done: false }
r.next(true); // { value: 0, done: false } 可以理解为把 const reset = yield i 语句替换为 const reset = true
r.next(); // { value: 1, done: false }
```

第一次使用`next`方法时，函数是从顶部运行到第一个`yield`，`next`中参数无效，有效的是调用函数时传入的参数。

举个例子：

```js
function* f(arg) {
  return arg
}

const a = f(1); 
a.next(2); // { value: 1, done: true}

const b = f();
b.next(3) // { value: undefined, done: true}
```


`generator`函数返回的遍历器对象还有`return`和`throw`方法。

### 2. return 和 throw

`return`方法会返回给定的值，并终结`generator`函数。

```js
function* f() {
  yield 1;
  yield 2;
  yield 3;
}

const a = f();
a.next(); // { value: 1, done: false }
a.return(5) // { value: 5, done: true }  可以理解为，把 yield 2 语句替换为 return 5

a.next() // { value: undefined, done: true }
```

`throw`方法可以在函数体外抛出错误，在函数体内被捕获。

```js
function* f() {
  try {
    yield 1
    yield 2
    yield 3
  } catch (e) {
    console.log('内部捕获', e)
  }
}

const a = f()
a.next()

try {
  a.throw(new Error('aa')) // 可以理解为把 yield 1 替换为 throw new Error('aa') 
  a.throw(new Error('bb')) 
} catch (e) {
  console.log('外部捕获', e)
}

// 内部捕获 Error: aa
// 外部捕获 Error: bb
```

上面例子中的第一个错误被`generator`函数内部的`catch`捕获，由于`catc`h函数已经执行一次了，不会捕获第2个错误，所以它会被外层的`catch`捕获。

### 3. `yield*`

如果在一个`generator`函数A内部，调用另一个`generator`函数B的话，需要在A内部手动遍历B，也可以使用`yield *`。

```js
// 第1个generator函数
function* foo() {
  yield 'a';
  yield 'b';
}

// 第2个generator函数
function* bar() {
  yield 'x';
  yield* foo();
  yield 'y';
}

// 等同于
function* bar() {
  yield 'x';
  for (let v of foo()) {
    yield v;
  }
  yield 'y';
}

for (let i of bar()) {
  console.log(i)
}
// 'x'
// 'a'
// 'b'
// 'y'
```

## 三、gensync

`gensync`库封装`generator`函数，返回一个新的函数，其有不同的使用方式：

1. 同步使用（`sync`）
2. 异步调用，封装成promise，在then方法中获取结果（`async`）
3. 传入回调使用（`errback`）


举个例子：

```js
const gensync = require('gensync');

const readFile = function* () {
  return 10;
};

const readFileAndMore = gensync(function* () {
  const val = yield* readFile();
  return 10 + val;
});

// 同步获取结果
const code = readFileAndMore.sync('./file.js', 'utf8');

// 当作promise，在then方法中获取结果
readFileAndMore.async('./file.js', 'utf8').then((code) => {
  console.log('func code2', code);
});

// 回调函数中获取结果
readFileAndMore.errback('./file.js', 'utf8', (err, code) => {
  console.log('func code3', code);
});
```

也可以传入一个包含`sync/async/errback`属性的对象，手动指定同步和异步操作，其中`sync`属性是必需的。

```js
const readFile = gensync({
  sync: fs.readFileSync,
  errback: fs.readFile,
});

const code = readFile.sync('./test-for-read.js', 'utf8');

readFile.async('./test-for-read.js', 'utf8').then((code) => {
  console.log('obj code2', code);
});

readFile.errback('./test-for-read.js', 'utf8', (err, code) => {
  console.log('obj code3', code);
});
```

## 四、总结

本文简单介绍了`generator`函数和`gensync`库的一些用法，建议阅读完本文后继续深入查看后面的相关资料，进一步加深对`generator`的理解。


## 五、相关资料

1. [Generator 函数的语法](https://es6.ruanyifeng.com/#docs/generator)
2. [gensync文档](https://www.npmjs.com/package/gensync)
3. [gensync源码](https://github.com/loganfsmyth/gensync)
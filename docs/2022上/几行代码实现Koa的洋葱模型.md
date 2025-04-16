Koa的洋葱模型就是从外入内，然后再向外。比如：

```js
app.use((ctx, next) => {
  console.log(1)
  next()
  console.log(2)
})

app.use((ctx, next) => {
  console.log(3)
  next()
  console.log(4)
})
```

上面代码的打印顺序是`1 3 4 2`。

我们现在来实现它的核心原理，其实也非常简单，只要明白上面的next指的是下一个中间件就行了。

```js
function compose(middlewares) {
  function dispatch(i) {
    if (i >= middlewares.length) return Promise.resolve()
    const fn = middlewares[i]
    return Promise.resolve(fn(dispatch.bind(null, i+1)))
  }
  dispatch(0)
}
```

核心就是 `fn(dispatch.bind(null, i+1)))`，这里的`dispatch.bind(null, i+1)`就是`next`，洋葱模型的关键就是在函数参数中去调用下一个函数，本质是利用了**函数调用栈**，然后判断下终止条件就行了。前面加上`Promise.resolve`是为了解决异步调用。


下面我们测试下：


```js
async function m1(next) {
  console.log(1)
  await next()
  console.log(1.1)
}

async function m2(next) {
  console.log(2)
  await next()
  console.log(2.2)
}

async function m3(next) {
  console.log(3)
  await next()
  console.log(3.3)
}

function delay(fn, time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      fn()
      resolve()
    }, time)
  })
}

async function m4(next) {
  await delay(() => console.log(4), 2000)
  await next()
  console.log(4.4)
} 

compose([
  m1, m2, m3, m4
])
```

输出顺序为：

```
1
2
3
4
4.4
3.3
2.2
1.1
```


为什么调用的时候要在`next`前加`await`呢，因为下一个中间件有可能是异步的。另外即使只有一个中间件是异步的，也建议在所有中间件的`next`调用前加上`await`，防止执行混乱。



附上`koa-compose`的[源码](https://github.com/koajs/compose/blob/v4.2.0/index.js)：

```js
function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  return function (context, next) {
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```
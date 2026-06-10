## 1. `then` 的链式调用规则

`Promise.then` 返回值的链式调用规则

1. 返回 `Promise` 对象时

当 `.then()` 回调函数返回一个 `Promise` 时，链式调用会等待这个 `Promise` 解决（`resolve/reject`），然后继续执行下一个 `.then()` 或 `.catch()`。

2. 返回非 `Promise` 值时

当返回一个非 `Promise` 值（普通值、`undefined`、`null` 等），这个值会被自动包装成一个已解决的 `Promise`，链式调用会立即继续。

3. 抛出错误时

如果在 `.then()` 中抛出错误（`throw`）或返回一个被拒绝的 `Promise`，会跳过后续的 `.then()`，直接进入链中最近的 `.catch()`。

4. 不返回任何值时（`undefined`）

如果 `.then()` 回调没有 `return` 语句（即返回 `undefined`），下一个 `.then()` 会接收到 `undefined` 作为参数。

```ts
const a = Promise.resolve()
a.then(res=> {}).then(() => console.log('1')).then(() => console.log('1'))
// 打印两个1
```

## 2. 链式调用中断的情况

1. 抛出错误未被捕获
2. 返回一个被拒绝的 `Promise`
3. 没有后续的 `.then()` 或 `.catch()`

## 3. `catch` 的链式调用规则

​​1. 当 `catch` 成功处理错误并返回值时​​：

- 返回非 `Promise` 值：会自动包装为 `resolved Promise`
- 返回 `Promise`：会等待该 `Promise` 解决
- 之后可以继续使用 `.then()` 或 `.catch()`

```ts
somePromise
  .then(() => { throw new Error('失败') })
  .catch(err => {
    console.log('捕获错误:', err.message); // 捕获错误: 失败
    return '恢复值'; // 返回一个普通值
  })
  .then(value => {
    console.log('继续执行:', value); // 继续执行: 恢复值
  });
```

​​2. 当 `catch` 中又抛出错误时​​：

- 会跳过后续的 `.then()`，进入下一个 `.catch()`

```ts
somePromise
  .then(() => { throw new Error('第一个错误') })
  .catch(err => {
    console.log('捕获第一个错误:', err.message);
    throw new Error('第二个错误'); // 再次抛出错误
  })
  .then(() => {
    // 这里不会执行
  })
  .catch(err => {
    console.log('捕获第二个错误:', err.message); // 捕获第二个错误: 第二个错误
  });
```

3. ​​当 `catch` 不返回值时​​：

- 隐式返回 `undefined`，后续 `.then()` 会接收到 `undefined`

```ts
somePromise
  .then(() => { throw new Error('错误') })
  .catch(err => {
    console.log('捕获错误:', err.message);
    // 没有return语句
  })
  .then(value => {
    console.log('收到:', value); // 收到: undefined
  });
```

### 1. 背景

登录 `webView` 时，用的是 `sso code`，就是一个临时 `token`，后台拿到后，校验并返回对应的登录态信息。

值得注意的有下面几点：

1. 这个 `code` 只能用一次，用完即失效
2. 后台优先使用 `url` 中的登录态，也就是即使你登录成功，存在有效的 `cookie`，也必须把 `url` 中的 `code` 去掉
3. 携带有效 `code` 的请求，只会换取登录态，不再返回 CGI 业务信息

由于我们的页面大部分都是并发请求，所以即使第一个接口获取到登录态后，其他接口请求也会报错。

### 2. 解决并优化

之前的前端解决方案是，用 `code` 获取到登录态之后，就刷新页面，这样就可以防止后面的接口报错。

这样的弊端就是用户体验差，有明显的刷新页面，而且换取登录态的接口的速度越慢，体验越差。如何优化呢？

1. 可以借助 `history.replaceState` 这个API，达到更新 url，但不刷新页面
2. 网络框架增加异步任务调度，支持将接口请求由并发，改成串行，其实就是控制并发数量为 1
3. 网络层支持重放，也就是修改参数后重新请求

### 3. 效果

使用前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/4/own_mike_36f38141915087097a.gif" width="300" />


使用后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/4/own_mike_986e8b3535b0e1ef4a.gif"  width="300" />

### 4. 总结

简单总结流程：

1. 调度层根据当前 `url` 包含 `mpCode` 以及 `config.network.ssoLoginVersion` 配置，设置并发数 为 1
2. 前端携带 `code`，请求后台接口换取登录态
3. `network` 拦截器判断登录成功，通过 `history.replaceState` 去掉当前 `url` 的 `mpCode`，并返回特殊 `code`。具体判断方式：`param.url` 包括 `loginType`、`code`，以及 `response.r == 0`
4. 调度层发现特殊 `code`，重放刚才的请求，拿到真实的业务信息并返回
5. 调度器继续执行栈中的其他请求
6. 由于 `url` 不再包含 `mpCode`，其他请求不再控制并发数，恢复正常逻辑

流程图如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/11/own_mike_b9f845692775d55239.png" width="6000">

### 5. 细节

有几个细节点：

1. 异步任务调度器需要支持从头部插入，即 `unshift`
2. 用 `code` 换登录态登录后，需立即重放，来保证之前的业务顺序，可利用宏任务和微任务实现
3. 必须引入装饰器，只有拦截器，是做不到重放并返回的，装饰器可以控制原始请求，不在错误后立即`resolve`，而是换取登录态、请求完数据后，才`resolve`

调度器代码：

```ts
type IRequest = {
  (): Promise<any>;
  resolve?: (...args: any) => any;
  reject?: (...args: any) => any;
};


class Scheduler {
  pendingState: Array<IRequest>;
  doingJobs: number;
  maxConcurrency: number;

  constructor(maxConcurrency = 2) {
    this.pendingState = [];
    this.doingJobs = 0;
    this.maxConcurrency = maxConcurrency;
  }

  add(promiseCreator: IRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      promiseCreator.resolve = resolve;
      promiseCreator.reject = reject;
      this.pendingState.push(promiseCreator);
      this.doJob();
    });
  }

  unshift(promiseCreator: IRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      promiseCreator.resolve = resolve;
      promiseCreator.reject = reject;
      this.pendingState.unshift(promiseCreator);
      this.doJob();
    });
  }


  doJob = () => {
    if (this.doingJobs < this.maxConcurrency && this.pendingState.length) {
      this.doingJobs += 1;
      const job = this.pendingState.shift();

      if (!job) {
        return;
      }

      job()
        .then((res: any) => {
          this.doingJobs -= 1;
          job.resolve?.(res);
          // 宏任务
          setTimeout(() => {
            this.doJob();
          }, 0);
        })
        .catch((e: any) => {
          this.doingJobs -= 1;
          job.reject?.(e);
          // 宏任务
          setTimeout(() => {
            this.doJob();
          }, 0);
        })
        .finally(() => {});
    }
  };
}

export {
  Scheduler,
};
```

调度层（装饰器）代码：

```ts
const addRequest = new Scheduler(1);

export function mpCodeScheduler(request): Promise<any> {
  const hasMpCodeQuery = !!getUrlPara('mpcode');

  if (getConfig('network.ssoLoginVersion') === 1 && hasMpCodeQuery) {
    return new Promise((resolve, reject) => {
      addRequest.add(request).then((res) => {
        resolve(res);
      })
        .catch((err) => {
          if (err?.code === SSO_LOGIN_SUCCESS_KEY) {
            // 不能用 `add(request)`，会改变请求顺序
            addRequest.unshift(request)
              // 微任务
              .then((tRes) => {
                resolve(tRes);
              })
              .catch((tErr) => {
                reject(tErr);
              });
          } else {
            reject(err);
          }
        });
    });
  }

  return request();
}
```

`Scheduler` 中用了 `setTimeout`，也就是宏任务来执行下一个任务。而装饰器中是在 `Promise` 的 `catch` 中，重新执行失败的请求，是微任务，会在下一个任务执行前执行，从而保证了原有的调用顺序。

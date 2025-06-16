# 网络框架解析

## 1. network

### 1.1. TipRequest

- `send`，调用 `doSend`
- 抽象 `doSend`
- 私有 `interceptBeforeSend`、`interceptAfterResponse`、`interceptError`
- 管理 `requestInterceptors`、`responseInterceptors`、`errorInterceptors`

### 1.2. MpRequest

- 继承 `TipRequest`
- 实现 `doSend`

### 1.3. TipRequestFactory

- 抽象方法 `create`，返回 `TipRequest`
- `create` 表示创建一个实例，用于一次执行请求发送

### 1.4. MpRequestFactory

- 继承 `TipRequestFactory`
- `create` 方法返回 `new MpRequest()`

### 1.5. NetworkManager

- setRequestFactory

```ts
public setRequestFactory(factory: TipRequestFactory) {
  this.requestFactory = factory;
}
```

- `request(param)` 即 `NetworkManager.instance.request(param)`

```ts
public request(param: ITipRequestParam): Promise<any> {
  const request = this.requestFactory.create(param);
  if (this.requestDecorator) {
    return this.requestDecorator(() => request.send(param, this.customInterceptor), param);
  }
  return request.send(param, this.customInterceptor);
}
```

## 2. vue/network

### 2.1. 示例

```ts
const factory = new MpRequestFactory();
factory.requestInterceptors = ['xxx'];
factory.responseInterceptors = ['xxx'];
factory.errorInterceptors = ['xxx'];
NetworkManager.instance.setRequestFactory(factory);
NetworkManager.instance.setDecorator(mpCodeScheduler);
```

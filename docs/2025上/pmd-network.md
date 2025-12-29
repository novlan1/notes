# 网络框架解析

## 1. 基础层

### 1.1. BaseRequest

- `BaseRequest` 是抽象类
- `send`，调用抽象方法 `doSend`
- 私有 `interceptBeforeSend`、`interceptAfterResponse`、`interceptError`
- 管理 `requestInterceptors`、`responseInterceptors`、`errorInterceptors`

```mermaid
graph LR
send
  subgraph send
  interceptBeforeSend --调用抽象方法--> doSend[[doSend]] --处理返回--> interceptAfterResponse --可能存在--> interceptError

  subgraph interceptBeforeSend
    customRequestInterceptorsHead -.-> requestInterceptors -.-> customRequestInterceptorsTail
  end

  subgraph interceptAfterResponse
    customResponseInterceptorsHead -.-> responseInterceptors -.-> customResponseInterceptorsTail
  end

  subgraph interceptError
    customErrorInterceptorsHead -.-> errorInterceptors -.-> customErrorInterceptorsTail
  end
end
```

### 1.2. BaseRequestFactory

- `BaseRequestFactory` 是抽象类
- 抽象方法 `create`，返回 `BaseRequest`
- `create` 表示创建一个实例，用于一次执行请求发送

```mermaid
graph LR

create[[create]]

subgraph names[属性]
 requestInterceptors
 responseInterceptors
 errorInterceptors
end

```

### 1.3. MpRequest

- 继承自 `BaseRequest`
- 实现 `doSend`

```mermaid
graph LR
WebRequest --继承--> BaseRequest
MpRequest --继承--> BaseRequest

subgraph WebRequest
  doSendInWeb[doSend] --> axios
end

subgraph MpRequest
  doSendInMp[doSend] --> uni.request
end

subgraph BaseRequest
  doSendInBase[doSend]
end
```

### 1.4. MpRequestFactory

- 继承自 `BaseRequestFactory`
- `create` 方法返回 `new MpRequest()`

```mermaid
graph LR
WebRequestFactory --继承--> BaseRequestFactory
MpRequestFactory --继承--> BaseRequestFactory

subgraph WebRequestFactory
  createInWeb[create] --传递拦截器--> WebRequest["new WebRequest({...})"]
end

subgraph MpRequestFactory
  createInMp[create] --传递拦截器--> mpRequest["new MpRequest({...})"]
end

subgraph BaseRequestFactory
  createInBase[create]
end
```

### 1.5. NetworkManager

- 是一个单例模式的网络请求管理器，提供统一的网络请求入口和拦截器机制
- 核心方法包括 **`setRequestFactory`、`setDecorator`、`request`**

```ts
public setRequestFactory(factory: BaseRequestFactory) {
  this.requestFactory = factory;
}
```

- `request(param)` 即 `NetworkManager.instance.request(param)`

```ts
public request(param: IBaseRequestParam): Promise<any> {
  const request = this.requestFactory.create(param);
  if (this.requestDecorator) {
    return this.requestDecorator(() => request.send(param, this.customInterceptor), param);
  }
  return request.send(param, this.customInterceptor);
}
```

```mermaid
graph LR
subgraph request
requestFactoryCreate["requestFactory.create()"] --request--> requestDecorator --> send["request.send"]
end
```

### 1.6. post

就是调用 `NetworkManager` 实例的 `request` 方法

```ts
export function request(param: IBaseRequestParam): Promise<any> {
  return NetworkManager.instance.request(param);
}

export const post = request;
export const get = request;
```

```mermaid
graph LR
post --> requestInManager["instance.request"]
```

## 2. 业务层

### 2.1. 示例

```ts
const factory = new MpRequestFactory();
factory.requestInterceptors = ['xxx'];
factory.responseInterceptors = ['xxx'];
factory.errorInterceptors = ['xxx'];
NetworkManager.instance.setRequestFactory(factory);
NetworkManager.instance.setDecorator(mpCodeScheduler);
```

```mermaid
graph LR
initNetworkManager --"index-web"--> initNetworkManagerInWeb[initNetworkManager]
initNetworkManager --"index-mp"--> initNetworkManagerInMp[initNetworkManager]

subgraph initNetworkManagerInWeb
newWebRequestFactory["new MpRequestFactory()"] --设置多种拦截器--> interceptors --> setRequestFactory["setRequestFactory(factory)"] --> setDecorator
end

subgraph initNetworkManagerInMp

end
```

## 3. 总览

所有类（方法）的总览视图

```mermaid
graph LR
business[业务] --> post
business --> initNetworkManager

initNetworkManager -.-> WebRequestFactory
initNetworkManager -.-> MpRequestFactory
initNetworkManager -.-> AppRequestFactory
initNetworkManager --> NetworkManager

WebRequestFactory --> BaseRequestFactory[[BaseRequestFactory]]
WebRequestFactory --> WebRequest

WebRequest --> BaseRequest[[BaseRequest]]
```

## 改动

1. 不是 `igame` 依赖 `default`，是 `default` 依赖 `igame`，`igame` 是明确的，`default` 可以换
2. 所有拦截器都支持异步操作
3. 微信小程序登录支持选择QQ/微信，根据环境及配置判断
4. 注意 `network` 有多余引入，`web` 环境也有引入 `MpRequestFactory`，但是只要项目支持 `tree-shaking` 问题不大，路径在 `packages/network/src/index.ts`

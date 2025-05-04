## 1. 开始

简单记录下GP赛事跨端中，遇到的问题和解决的办法。

## 2. 记录


### 2.1. 登录态

前提是我们的小程序要合入对方的小程序，然而，对方不给小程序密钥。

观察发现他们小程序有返回 MSDK 登录态，申请转换关系权限后，就可以直接拿到登录我们的页面了。简单高效，也算是一个 `hack` 的方法吧。

具体通信方式是，在小程序下，`onLaunch` 时注入一个 `MSDK_PARAMS` 的 `storage`。网络框架检测到这个 `storage` 时，就携带在 url 参数上。

一个细节是，每个页面的 `onShow` 方法都要注入，为了防止登录态失效后重新返回我们页面时，登录态没有刷新。

核心逻辑地址：press-plus/tree/release/src/packages/common/mp-msdk

### 2.2. 登录态失效跳转

由于是独立分包，登录态的来源又只能由宿主小程序产生，所以，当我们的页面失效后，需要跳转到他们登录页面，返回返回。

核心逻辑:

```ts
/**
 * 宿主小程序登录
 */
function loginInGPGameMP() {
  const pages = getCurrentPages();
  const curPage = pages[pages.length - 1];
  const { options, route } = curPage;

  const WELCOME_PATH = '/pages/welcome/welcome';

  if (`/${route}` === WELCOME_PATH) {
    uni.navigateTo({ url: WELCOME_PATH });
    return;
  }

  const url = `${WELCOME_PATH}?path=/${route}&data=${encodeURIComponent(JSON.stringify(options))}`;

  uni.navigateTo({ url });
}
```

### 2.3. appId 转换关系申请

由于采用 msdk 登录态，所以需要申请"宿主小程序"到"人生"的转换关系。

同时又涉及参赛角色，所以又需要申请"人生"到"宿主游戏"的转换关系。

都是微信、QQ双端。

### 2.4. 独立分包路由拦截

小程序内采用的是独立分包，H5不需要，所以需要 hook 路由，找到对应的分包，然后修改跳转路径。

核心逻辑地址：press-plus/tree/release/src/packages/common/uni-router


### 2.5. 独立分包白屏

能引起这个问题的原因挺多，这里的原因是引入了一个比较深的工具方法。

```ts
import { NUMBER_CHI_MAP } from '@xxx/t-comm/lib/base/number/number';
```

推测是由于路径深，打包没找到。uni-app 比较迷，不清楚具体机制，还是排除法发现的。

这个 `case` 的解决办法是，自己写 `NUMBER_CHI_MAP`。


### 2.6. 路由简化

统一路由跳转使用方式，之前在另一个项目中用啥方式的都有，需要各种兜底。本项目又用了微前端，需要跳到对应分包，处理起来会更麻烦。

为了减少后续维护成本，统一路由跳转使用方式，只能用 `path`、`query`。

```ts
this.$router.push({
  path: '/single-match-detail',
  query: {
    siteId,
    parentId,
    childId,
  },
});
```

### 2.7. 查看地图（已废弃）

QQ小程序在 iOS 下不支持 `openLocation`，而 `webview` 的方式又没法添加域名校验。

采用的方法是，打开一个自己的 `webview` 页面，就是有权限加校验文件，内部嵌套地图 `apis.map.qq.com` 的地址。

也就是 `A webview` 打开 `B url`，`B url` 是空壳子，装的是 `C url`。

注意几点，B 不能加登录态校验，且注意 `html title`，因为 `webview` 会将嵌入网页的 `title` 当作 `navigationTitle`。

后面发现这个方法没用，iOS 下依旧会报域名校验错误。

### 2.8. 独立分包 + 微前端

核心逻辑。

相比普通分包，个人感觉更多是工程上的好处，不用担心和主应用互相影响，不会增加主应用主包大小，不用互相扯皮。

使用 `guru` 后，通信方式需要用框架给的，或者放到 `storage` 中。不过我们的业务大部分用不到，核心点在于全局组件和全局逻辑放在了 `global-component` 和 `main.js` 中，这意味着每个独立分包（这里也是子应用）都有自己的登录态、全局组件、全局变量，根本不需要通信。不过应该始终记住此限制，遇到问题时能及时发现。

### 2.9. 动态切换后端环境

借鉴了宿主小程序，实现了运行时切换后端环境，这样就不用打包两份了。

不过，这里也是目前唯一需要子应用间通信的地方，因为每个子应用的 `window.isTestNet` 都是独立的，解决办法是在 `main.js` 中代理 `window.isTestNet`。


```ts
function hookTestNet() {
  const STORAGE_KEY = 'DZS_MATCH_NET_ENV_DEBUG';

  Object.defineProperty(window, 'isTestNet', {
    get() {
      const result = wx.getStorageSync(STORAGE_KEY) === 'test';
      return result;
    },
    set(value) {
      wx.setStorageSync(STORAGE_KEY, value ? 'test' : 'release');
    },
  });
}

// #ifndef H5
hookTestNet();
// #endif
```


### 2.10. 拉起游戏

核心逻辑，包括微信、QQ小程序的拉起。

已沉淀到 press-plus 中。


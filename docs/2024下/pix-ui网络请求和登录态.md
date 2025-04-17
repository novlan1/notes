## 1. 开始

介绍下网络请求、登录态等。

## 2. 环境

### 2.1. 常用链接

管理后台：https://timi-olsb.px.a.com/app/#/app/index

官方文档：https://docs.px.a.com/timi/d/index

先找 xx 加"WZ-电竞项目"权限，再加应用权限。

### 2.2. vscode

WZ是专版，需要加环境。在 `settings.json` 中添加如下配置：

```json
"pixide.px.env": {
  "some-env-key": {
    "apiAddr": "https://timi-olsb.px.a.com",
    "label": "MOBA",
    "type": "olsb",
    "group": "example",
    "key": "some-env-key",
  },
  // ...
}
```

在 `vscode` 下面的状态栏选择WZ环境。

## 3. 运行时


### 3.1. 登录态

`pix-ui` 中可以获取到 `qq/wx` 原始的登录态，放到请求 `url` 中，可以当作我们的登录态，后台可识别。

项目已集成。

### 3.2. 网络请求


#### 3.2.1. axios

PixUI 中不能直接使用 axios，有几个地方会报错：

- axios/lib/helpers/isURLSameOrigin.js，获取 document.createElement('a').pathname 时报错
- node_modules/axios/lib/helpers/cookies.js，执行 document.cookie.match 时报错

第1个，打印 `document.createElement('a')`，可知是 `H5ElementTag` 的一个对象（H5ElementTag 是`pix-ui`内部的类，标准浏览器没有）。可以这样解决：

```ts
H5ElementTag.prototype.pathname = '';
```

第2个，直接赋值 `document.cookie` 就可以解决:

```ts
document.cookie = '';
```

但是这样 `cookie` 就无效了，也失去原来的意义了。可以用 `Proxy` 代理 `cookie`，支持下存、取、清除，这样其他地方就不用改了。

```ts
function proxyCookie() {
  let str = '';
  Object.defineProperty(document, 'cookie', {
    get() {
      return str;
    },
    set(value) {
      return str = value;
    }
  });
}
```

`axios` 可以使用的话， 就方便多了，不用自己封装 xhr，不能自己处理返回数据，还可以使用拦截器。

#### 3.2.2. 封装网络请求

个人建议不要用 `pmd-network`，因为不能直接用，改造成本高，且有点重。我已经封装了一个请求方法，放在了 `src/app/logic/network.ts` 中。

使用示例：

```ts
import { post } from '../logic/network';

export function getHomePage() {
  return post({
    url: 'https://api.nes.smoba.qq.com/pvpesport.sgamenes.nesplayer.nesplayer/RecommendInGameList',
    data: {
      filter: {
        adCode: '',
        ad_code: '',
        area: 0,
        lat: 22.547136,
        lng: 113.943185,
        subArea: 3258,
        subarea: 3258,
      },
      page_num: 20,
    },
  });
}
```

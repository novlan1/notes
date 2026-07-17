<!-- # iTOP WebLoginSdk 应用模块 -->

基于 `itop-web-sdk.umd.js` 的海外第三方登录统一封装，提供 SDK 操作、登录态换取、NetworkManager 拦截器一体化接入。

## 1. 文件结构

```
packages/business/src/network-v2/application/itop/
├── itop-sdk.ts          # iTOP WebLoginSdk 封装（渠道定义、登录 API、helper）
├── session.ts           # 登录态换取 & SayHello 验证
├── index-web.ts         # Web 端 NetworkManager 初始化（拦截器配置）
├── index.ts             # 跨平台统一入口
├── index-@TIP_PLATFORM_NAME.ts  # 编译时平台切换
└── README.md            # 本文档
```

## 2. 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│  业务项目（pubgm-match）                                      │
│  ├─ App.vue         → setItopSdkConfig + setItopSessionConfig │
│  ├─ use-web-login   → Vue composable（UI 编排）               │
│  └─ auth store      → Pinia 状态管理                          │
├─────────────────────────────────────────────────────────────┤
│  pmd-npm / @tencent/pmd-business                             │
│  ├─ itop-sdk.ts     → SDK 封装（纯函数，零 UI 依赖）           │
│  ├─ session.ts      → exchangeSession / sayHello              │
│  └─ index-web.ts    → initNetworkManager（拦截器配置）         │
├─────────────────────────────────────────────────────────────┤
│  浏览器层                                                     │
│  ├─ window.ItopWebSdk  → itop-web-sdk.umd.js                 │
│  └─ cookie (session_id) → Set-Cookie 登录态                   │
└─────────────────────────────────────────────────────────────┘
```

## 3. 快速开始

### 3.1. index.html 引入 SDK

```html
<!-- iTOP WebLoginSdk 依赖 React -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>

<!-- iTOP WebLoginSdk（测试/正式环境按需切换） -->
<script src="https://image.intlgame.com/itop/test/itop-web-sdk.umd.js"></script>
<!-- <script src="https://image.intlgame.com/itop/prod/itop-web-sdk.umd.js"></script> -->
```

### 3.2. 环境变量

```bash
# .env.development
VITE_ITOP_ENV=beta
VITE_ITOP_GAME_ID=1320
VITE_ITOP_BIZ_CODE=GameLife
VITE_ITOP_LANGUAGE=en
VITE_ITOP_DEVICE_NAME=www.pubgmobile.com

# 登录态换取 API
VITE_TGS_LOGIN_API_BASE_URL=https://api-test.partner.esports.gpubgm.com
VITE_TGS_LOGIN_APP_ID=1320
```

### 3.3. 入口初始化

`main.ts` — 切换到 iTOP 网络管理器：

```ts
import { initNetworkManagerItop } from '@tencent/pmd-business/lib/network-v2';

initNetworkManagerItop({
  ...config,
  // iTOP 登录态过期回调（可选）
  onNeedLogin: (response) => {
    // 弹出登录渠道选择 / 跳转登录页
  },
});
```

`App.vue` — 配置 SDK + 注册回调：

```ts
import { setItopSdkConfig } from '@/logic/utils/itop-auth';
import { setItopSessionConfig } from '@/logic/utils/api/session';
import { useWebLogin } from '@/logic/hooks/use-web-login';

// 1. 必须先设配置（SDK init 之前）
setItopSdkConfig({
  env: (import.meta.env.VITE_ITOP_ENV as 'beta' | 'prod') || 'beta',
  gameID: Number(import.meta.env.VITE_ITOP_GAME_ID) || 1320,
  bizCode: import.meta.env.VITE_ITOP_BIZ_CODE || 'GameLife',
  language: import.meta.env.VITE_ITOP_LANGUAGE || 'en',
  device_name: import.meta.env.VITE_ITOP_DEVICE_NAME || window.location.hostname,
});

setItopSessionConfig({
  apiBaseUrl: import.meta.env.VITE_TGS_LOGIN_API_BASE_URL || '',
  appId: Number(import.meta.env.VITE_TGS_LOGIN_APP_ID) || 1320,
});

// 2. 注册 onSuccess/onError 回调
const { init } = useWebLogin();
init();
```

## 4. API 参考

### 4.1. itop-sdk.ts — SDK 封装

#### 4.1.1. 配置

| 函数 | 说明 |
|------|------|
| `setItopSdkConfig(config)` | 设置全局 SDK 配置（env/gameID/bizCode/language/device_name） |
| `getItopSdkConfig()` | 获取当前配置只读快照 |

```ts
import { setItopSdkConfig } from '@tencent/pmd-business/lib/network-v2/application/itop/itop-sdk';

setItopSdkConfig({
  env: 'beta',          // 'beta' | 'prod'
  gameID: 1320,
  bizCode: 'GameLife',
  language: 'en',
  device_name: 'www.pubgmobile.com',
});
```

#### 4.1.2. 渠道

```ts
import { CHANNEL, REDIRECT_CHANNELS, POPUP_CHANNELS } from '@tencent/pmd-business/lib/network-v2/application/itop/itop-sdk';

CHANNEL.Google    // 'google'
CHANNEL.Facebook  // 'facebook'
CHANNEL.Apple     // 'apple'
CHANNEL.Twitter   // 'twitter'

// 重定向模式（全页面跳转）：Google, Facebook
// 弹窗模式（新窗口授权）：Apple, Twitter
```

#### 4.1.3. 核心 API

| 函数 | 说明 | 适用渠道 |
|------|------|----------|
| `getWebLoginSdk(callbacks?)` | 获取/创建 SDK 单例 | 所有 |
| `signInWithRedirect(channel, successUrl?)` | 重定向登录 | Google, Facebook |
| `thirdAuthorize(channel, callbackUrl?)` | 弹窗授权 | Apple, Twitter |
| `itopAuthorize(channel, channelInfo)` | 换取 iOpenid + sInnerToken | Apple, Twitter |
| `buildChannelInfo(channel, thirdResult)` | 渠道凭证 → channel_info 映射 | Apple, Twitter |
| `credentialFromRedirect(channel)` | 从 URL 解析重定向回调凭证 | Google, Facebook |
| `getRedirectResult(channel?)` | 同步解析重定向结果 | Google, Facebook |

#### 4.1.4. Helper

| 函数 | 说明 |
|------|------|
| `isRedirectCallback()` | 当前 URL 是否为重定向回调 |
| `cleanRedirectParams()` | 清理 URL 中的回调参数 |

### 4.2. session.ts — 登录态换取

| 函数 | 说明 |
|------|------|
| `setItopSessionConfig(config)` | 设置 session 配置（apiBaseUrl/appId/loginType/exchangePath） |
| `getItopSessionConfig()` | 获取当前配置只读快照 |
| `exchangeSession(openid, token, cgiPath?, appid?)` | 换取 session_id cookie |
| `sayHello(cgiPath?, apiBaseUrl?)` | 验证 session_id 是否有效（无 query） |

```ts
import { exchangeSession, sayHello } from '@tencent/pmd-business/lib/network-v2/application/itop/session';

// 登录成功后换取 session_id cookie
await exchangeSession(openid, sInnerToken);
// 后续同域 cgi 自动带 session_id cookie

// 验证 cookie 是否生效
const res = await sayHello();
```

### 4.3. index-web.ts — 网络层初始化

```ts
import { initNetworkManager } from '@tencent/pmd-business/lib/network-v2/application/itop';
// 或
import { initNetworkManagerItop } from '@tencent/pmd-business/lib/network-v2';

initNetworkManager({
  // 标准 INetworkConfig 属性
  svrDomain: { dev: '...', test: '...', prod: '...' },
  language: 'en',

  // iTOP 专用
  onNeedLogin: (response) => {
    // 登录态过期时触发，业务方实现重新登录逻辑
  },
});
```

**拦截器链条：**

```
请求链：ShowMsgToast → CommParam → BindParam → Language
响应链：Login(iTOP goLogin) → LoginInfo → NormalizeResponseRet → ShowDataErrorToast → GetData
错误链：ShowNetworkErrorToast
```

## 5. 登录流程

### 5.1. 重定向模式（Google / Facebook）

```
用户点 Google 按钮
  → signInWithRedirect('google')
    → 页面跳转到 Google 授权页
      → 用户授权
        → 重定向回当前页（URL 带 ?operate_type=thirdcallback&...）
          → SDK 构造函数自动解析回调
            → onSuccess(userInfo: { code, iOpenid, sInnerToken })
              → exchangeSession(iOpenid, sInnerToken)
                → POST /SayHello?_ltype=tiploginitop&openid=...&access_token=...
                  → 后端 Set-Cookie: session_id=xxx
                    → 后续 API 请求自动带 cookie ✅
```

### 5.2. 弹窗模式（Apple / Twitter）

```
用户点 Twitter 按钮
  → thirdAuthorize('twitter')
    → 新窗口打开 Twitter 授权
      → 用户授权 → 窗口自动关闭
        → 返回渠道凭证 { access_token, secret, ... }
  → buildChannelInfo('twitter', authResult)
    → { oauthToken: '...', oauthTokenSecret: '...' }
  → itopAuthorize('twitter', channelInfo)
    → 返回 { code: 1, iOpenid: '...', sInnerToken: '...' }
      → exchangeSession(iOpenid, sInnerToken)  ← 与重定向模式汇合
        → 后续同域请求自动带 cookie ✅
```

> ⚠️ 弹窗模式下 SDK **不会**触发 onSuccess 回调，必须手动从 `itopAuthorize` 结果中取 `iOpenid/sInnerToken` 并调用 `exchangeSession`。

### 5.3. buildChannelInfo 字段映射

| 渠道 | thirdAuthorize 返回字段 | → channel_info |
|------|------------------------|----------------|
| Twitter | `access_token`, `secret` | `{ oauthToken, oauthTokenSecret }` |
| Apple | `code` | `{ code }` |
| Facebook | `access_token` | `{ Access_Token }` |
| Google | `code`, `redirecturi` | `{ authCode, redirecturi }` |

## 6. 项目集成清单

将现有项目接入 iTOP 登录需要以下步骤：

- [ ] `index.html` — 引入 React + itop-web-sdk.umd.js
- [ ] `.env` — 添加 `VITE_ITOP_*` 和 `VITE_TGS_LOGIN_*` 环境变量
- [ ] `main.ts` — `initNetworkManagerDefault` → `initNetworkManagerItop`
- [ ] `App.vue` — `setItopSdkConfig()` + `setItopSessionConfig()` → `useWebLogin().init()`
- [ ] `logic/utils/itop-auth.ts` — re-export from `@tencent/pmd-business/lib/network-v2/application/itop/itop-sdk`
- [ ] `logic/utils/api/session.ts` — re-export from `@tencent/pmd-business/lib/network-v2/application/itop/session`
- [ ] `store/auth.ts` — Pinia auth store（openid + token 管理）
- [ ] `logic/hooks/use-web-login.ts` — Vue composable（登录流程编排）
- [ ] 登录 UI 组件 — 业务方按渠道渲染登录按钮
- [ ] `typings/itop.d.ts` — 全局类型声明（`window.ItopWebSdk`）

## 7. 与 igame 应用的差异

| | igame | iTOP |
|------|-------|------|
| 登录方式 | QQ/微信 OAuth | Google/Facebook/Apple/Twitter OAuth |
| SDK | 无（iframe 中转） | `itop-web-sdk.umd.js` |
| 登录态载体 | `tip_uid` cookie | `session_id` cookie（Set-Cookie） |
| 域名拦截器 | `DefaultHostInterceptor`（igame.qq.com） | 无（业务自配域名） |
| 请求格式 | `IgameRequestDataInterceptor`（commcgi） | 标准 REST |
| `forbidFrontEndCookie` | 通常 `false` | 通常 `true`（session 走 Set-Cookie） |
| goLogin | `gotoLogin`（跳转登录页） | 自定义 `onNeedLogin` 回调 |

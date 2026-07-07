<!-- # 账号体系技术文档 -->

> 微信小游戏中的 QQ/微信双账号登录、切换账号、首登引导全链路。

## 1. 架构总览

项目基于 `@tencent/t-comm` 3.x 的 `AccountService`，业务侧通过 `Game.bootstrap()` 中 `AccountService.configure()` 注入依赖后，调用 `AccountService.ins.switchToQQ()` / `switchToWx()` 完成切号。所有登录成功路径最终汇聚到 `onLoginSuccess` 回调，再与 `GooseHomeApp` 的门控（_stepAuth → _stepAdopt → _stepGuide）衔接。

```
┌──────────────────────────────────────────────────────┐
│                    应用层 (Game.ts)                   │
│  AccountService.configure({                          │
│    clearPlayer / bootstrapPlayer / onLoginSuccess    │
│    code2QQLogin / code2WxLogin / qqTicket2Login      │
│  })                                                  │
├──────────────────────────────────────────────────────┤
│                    门控层 (GooseHomeApp.ts)           │
│  _gateBootFlow → _stepAuth → _stepAdopt →            │
│  _stepGuide → _afterGuide                            │
├──────────────────────────────────────────────────────┤
│                    登录 UI 层 (AuthPage.ts)           │
│  _onQqLogin() / _onWechatLogin()                     │
├──────────────────────────────────────────────────────┤
│                    玩家服务层 (PlayerService.ts)       │
│  bootstrap() / register() / _doBootstrap()           │
├──────────────────────────────────────────────────────┤
│                  t-comm 第三方层                      │
│  AccountService.switchToQQ / switchToWx              │
│  _finishLoginOk / _consumeQQTicket                   │
└──────────────────────────────────────────────────────┘
```

---

## 2. 核心角色与事件

| 角色 | 说明 |
|------|------|
| `AccountService` | t-comm 提供的双账号切号能力，业务侧注入依赖后使用 |
| `PlayerService` | 本游戏的玩家数据服务（GetPlayer / CreatePlayer），按 uid 存储玩家状态 |
| `PetService` | 宠物服务，判断是否已领养（`hasAnyPet()`） |
| `GuidePage` | 新手引导页，按 guide_step 切换步骤 |

| 事件 | 含义 | 派发者 | 消费者 |
|------|------|--------|--------|
| `LoginStart` | 登录开始 | PlayerService.bootstrap | — |
| `PlayerLoaded` | 玩家数据已就绪 | PlayerService._applyRsp | 主页 HUD 刷新等 |
| `LoginSuccess` | 登录成功 | PlayerService._applyRsp | 每日签到、上报、切号检测 |
| `LoginFail` | 登录失败 | PlayerService.bootstrap | — |
| `AuthAccepted` | 授权完成（用户点了登录按钮） | Game.onLoginSuccess | GooseHomeApp._afterAuth |
| `AdoptAccepted` | 领养完成 | AdoptPage | GooseHomeApp._afterAdopt |
| `AdoptCancelled` | 领养取消（点返回） | AdoptPage | GooseHomeApp._onAdoptCancelled |
| `GuideFinished` | 引导完成 | GuidePage | GooseHomeApp._afterGuide |
| `AccountSwitched` | 账号已切换 | Game._installAccountSwitchWatcher | 各 View 刷新自身 |

---

## 3. 冷启动完整链路

```mermaid
sequenceDiagram
    participant Canvas as Canvas.onLoad
    participant Game as Game.bootstrap
    participant PS as PlayerService
    participant Backend as 后台
    participant GH as GooseHomeApp

    Canvas->>Game: bootstrap(rootNode)
    Game->>PS: bootstrap() (非 force)
    PS->>Backend: GetPlayer
    alt 已有玩家数据
        Backend-->>PS: { player: { uid, guide_step, ... } }
        PS->>PS: _applyRsp → dispatch PlayerLoaded / LoginSuccess
        GH->>GH: _gateBootFlow → isUnauthorized 预热
        GH->>GH: _stepAuth: uid 已就绪 → _stepAdopt
    else 无玩家数据
        Backend-->>PS: { r: 0 } (无 player)
        PS-->>PS: throw "需先走 register()"
        Game->>GH: bootstrap 完成 (oops.ready=true)
        GH->>GH: _gateBootFlow → isUnauthorized 返回 true
        GH->>GH: _stepAuth: 无 uid → 打开 AuthPage
        GH->>GH: 等待 AuthAccepted 事件
    end
```

冷启动时的关键决策：
- `bootstrap()`（非 force）**不会静默注册** CreatePlayer。GetPlayer 没返回 player → 抛错，由 `GooseHomeApp._stepAuth` 弹 `AuthPage`，等用户显式点"微信登录"或"QQ 登录"
- `isUnauthorized()` 同步调用 GetPlayer + GetPetInfo，完成一次数据预热，结果落到 PlayerService / PetService 单源

---

## 4. 微信登录流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Auth as AuthPage
    participant AS as AccountService
    participant tcomm as t-comm 内部
    participant PS as PlayerService
    participant Backend as 后台
    participant Game as Game.onLoginSuccess
    participant GH as GooseHomeApp

    User->>Auth: 点击"微信登录"
    Auth->>AS: switchToWx()

    alt QQ 环境下切微信 (checkIsQQEnv=true + code2WxLogin)
        AS->>tcomm: wxLogin() 拿 wx code
        tcomm-->>AS: code
        AS->>Backend: code2WxLogin(code) → loginMp(_ltype=tiploginwxproc)
        Backend-->>AS: Logininfo 响应头写入 storage
    else 微信宿主下切微信 (当前是QQ账号)
        AS->>tcomm: clearQQTicketInfo + storage.remove(loginInfoStorageKey)
    end

    AS->>AS: _finishLoginOk('wx', 'switch')
    AS->>Game: clearPlayer() → 记录 _uidBeforeLoginSwitch
    AS->>PS: bootstrapPlayer({ force: true })
    PS->>Backend: GetPlayer

    alt 已有玩家
        Backend-->>PS: { player: { uid, ... } }
        PS->>PS: _applyRsp → dispatch LoginSuccess
        AS->>AS: toast('切换微信账号成功')
        AS->>Game: onLoginSuccess({ platform:'wx', reason:'switch' })

        alt 发生了真实切号 (新旧uid不同)
            Game->>Game: wx.restartMiniProgram({}) 重启小游戏
        else 未切号/首登
            Game->>Game: dispatch AuthAccepted
            Game->>GH: close(Auth)
            GH->>GH: _afterAuth → _stepAdopt → ...
        end
    else 全新账号 (GetPlayer 返回 {r:0})
        Backend-->>PS: { r: 0 }
        Note over PS: bootstrap({force:true}) 内 autoRegister=true
        PS->>Backend: CreatePlayer (幂等)
        PS->>Backend: GetPlayer (再拉最新)
        PS->>PS: _applyRsp → dispatch LoginSuccess
    end
```

关键点：
- `code2WxLogin` 走 `loginMp(_ltype=tiploginwxproc)`，响应头 `Logininfo` 写入 `loginInfoStorageKey`
- `_finishLoginOk` 内部时序：`clearPlayer → bootstrapPlayer → toast → onLoginSuccess`
- 切号后若新旧 uid 不同 → `wx.restartMiniProgram({})` 彻底重启，无需逐个 Service clear
- 全新账号 → `bootstrap({force:true})` 自动走 register 建号

---

## 5. QQ 登录流程

QQ 登录有两个子路径，取决于运行环境：

### 5.1. QQ App 直达路径（Plugin）

```mermaid
sequenceDiagram
    participant User as 用户
    participant Auth as AuthPage
    participant AS as AccountService
    participant Plugin as qq-wxmini-plugin
    participant Backend as 后台

    User->>Auth: 点击"QQ 登录"
    Auth->>AS: switchToQQ()
    Note over AS: checkIsQQEnv()=true + code2QQLogin
    AS->>AS: _switchToQQViaPlugin()
    AS->>Plugin: qqPluginLogin()
    Plugin-->>AS: { code: QQ auth code }
    AS->>Backend: code2QQLogin(code) → loginMp(_ltype=tiploginqqproc)
    Backend-->>AS: Logininfo 响应头写入 storage
    AS->>AS: _finishLoginOk('qq', 'switch') → 后续同微信流程
```

### 5.2. 微信宿主跳腾讯 QQ 小程序路径

```mermaid
sequenceDiagram
    participant User as 用户
    participant Auth as AuthPage
    participant AS as AccountService
    participant QQMP as 腾讯QQ小程序
    participant WxApi as wx.onShow
    participant tcomm as t-comm 内部
    participant Backend as 后台

    User->>Auth: 点击"QQ 登录"
    Auth->>AS: switchToQQ()
    Note over AS: 微信宿主环境 (非QQ App)
    AS->>QQMP: launchQQMP({ qqAppId })
    QQMP-->>User: 跳腾讯QQ小程序授权
    User-->>WxApi: 从QQ小程序返回微信
    WxApi->>AS: _onWxShow → handleQQLoginOnShow 提取票据
    AS->>tcomm: qqTicket2Login(ticket)
    tcomm->>Backend: loginMp(_ltype=tiploginqqproc, code=qqAccessToken)
    Backend-->>tcomm: Logininfo 写入 storage
    tcomm-->>AS: resolve
    AS->>AS: _finishLoginOk('qq', 'switch')
```

`qqTicket2Login` 配置（Game.ts 第 299-311 行）：
```typescript
qqTicket2Login: ticket => loginMp({
    url: `${getBaseUrl()}/merc.iGoose.players_cgi.players_cgi/GetPlayer`,
    appid: QQ_APP_ID,
    _ltype: 'tiploginqqproc',
    code: `${ticket.qqAccessToken}`,    // QQ access_token 当 code 透传
    storage: loginInfoStorage,
    storageKey: apiConfig.loginInfoStorageKey,
    qqTicketInfo: ticket,
    onLoginInfo: () => {
        loginInfoStorage.remove('user_picked_wx'); // 切QQ清微信偏好
    },
}),
```

---

## 6. 切换账号全流程

### 6.1. 切号 → 重启（正常路径）

```mermaid
flowchart TD
    A[用户在设置页/SettingsPage 点切号] --> B{当前是什么账号?}
    B -->|QQ| C[调 AccountService.ins.switchToWx]
    B -->|微信| D[调 AccountService.ins.switchToQQ]

    C --> E[_finishLoginOk: clearPlayer + bootstrapPlayer]
    D --> E

    E --> F{GetPlayer 返回?}
    F -->|有利旧uid| G[onLoginSuccess reason='switch']
    F -->|全新账号| H[bootstrap内自动 register 建号]

    G --> I{新旧 uid 不同?}
    I -->|是| J[wx.restartMiniProgram 冷启动]
    I -->|否 首登| K[dispatch AuthAccepted + close AuthPage]
    H --> K
    K --> L[GooseHomeApp._afterAuth → _stepAdopt → ...]

    J --> M[小游戏重启 → Game.bootstrap 冷启动链路]
```

### 6.2. 切号 → 就地刷新（非小游戏环境兜底）

当 `wx.restartMiniProgram` 不可用时（如浏览器/编辑器预览），走 `_installAccountSwitchWatcher` 兜底：

```mermaid
sequenceDiagram
    participant AS as AccountService
    participant Game as Game._installAccountSwitchWatcher
    participant PS as PlayerService
    participant GLS as GoodsListService
    participant SS as SettingsService
    participant TS as TaskService
    participant BS as BazaarService
    participant PetS as PetService
    participant GS as GooseService
    participant View as 当前打开的View

    AS->>Game: onLoginSuccess(reason='switch')
    Game->>Game: 新旧uid不同? → dispatch AccountSwitched
    Game->>GLS: clear()
    Game->>SS: clear()
    Game->>TS: clear()
    Game->>BS: clear()
    Game->>PetS: clear() + refresh()
    Game->>GS: reloadForAccountSwitch()
    Game->>View: dispatch EventName.AccountSwitched
    View->>View: 重新拉取数据刷新自身
```

---

## 7. 幂等重登流程（已是当前账号）

用户当前是 QQ 账号时点"切换QQ"，或当前是微信时点"切换微信"：

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as AuthPage / SettingsPage
    participant AS as AccountService
    participant PS as PlayerService
    participant Game as Game.onLoginSuccess

    User->>UI: 点"切换QQ" (当前已是QQ)
    UI->>AS: switchToQQ()
    AS->>AS: isQQ()=true → 幂等分支
    AS->>AS: toast('当前已是QQ账号')
    AS->>AS: _finishLoginOk('qq', reason='already')
    Note over AS: clearPlayer 仍执行 (兜底清理)
    AS->>PS: bootstrapPlayer({ force: true })
    PS-->>PS: 重新拉 GetPlayer 刷新本地数据
    AS->>Game: onLoginSuccess(platform:'qq', reason:'already')
    Note over Game: reason='already' → 不重启小游戏
    Game->>Game: dispatch AuthAccepted + close AuthPage
```

幂等重登的 `reason='already'` 跳过 `wx.restartMiniProgram` 判断，只拉最新玩家数据 + 关登录页。

---

## 8. PlayerService 关键方法

### 8.1. bootstrap

```
bootstrap({ force?: boolean })
│
├─ force=false (冷启动)
│   ├─ 已有 state.uid → 直接 return (缓存命中)
│   ├─ 无 uid → _doBootstrap(autoRegister=false)
│   │   ├─ GetPlayer 有 player → _applyRsp
│   │   └─ GetPlayer 无 player → throw "需先走 register()"
│   │                          → 上层 GooseHomeApp._stepAuth 弹 AuthPage
│   └─
│
└─ force=true (切号 / AuthPage 登录)
    ├─ state 清空为 createEmptyPlayerState()
    └─ _doBootstrap(autoRegister=true)
        ├─ GetPlayer 有 player → _applyRsp (回坑老号)
        └─ GetPlayer 无 player → this.register() 自动建号
            ├─ CreatePlayer (后端幂等)
            └─ GetPlayer 再拉最新 → _applyRsp
```

### 8.2. _applyRsp

```
_applyRsp(rsp)
├─ fromGetPlayerRsp(rsp) → state (含 uid/guide_step/food_amount/game_auths)
├─ oops.storage.set(STORAGE_KEY, state) → 本地持久化
├─ oops.storage.setUser(state.uid) → 切换 storage 命名空间
├─ dispatch EventName.PlayerLoaded
├─ dispatch EventName.LoginSuccess
└─ return state
```

---

## 9. GooseHomeApp 门控状态机

```mermaid
stateDiagram-v2
    [*] --> BootCompleted: Game.bootstrap 完成
    BootCompleted --> CheckingAuth: _gateBootFlow
    CheckingAuth --> AuthPage: 无 uid (未授权)
    CheckingAuth --> AdoptCheck: 有 uid (已授权)

    AuthPage --> AdoptCheck: AuthAccepted 事件

    AdoptCheck --> AdoptPage: 无宠物 (未领养)
    AdoptCheck --> GuideCheck: 有宠物 (已领养)
    AdoptPage --> AuthPage: AdoptCancelled (点返回)
    AdoptPage --> GuideCheck: AdoptAccepted 事件

    GuideCheck --> GuidePage: guide_step < STEP_LAST (引导未完成)
    GuideCheck --> Home: guide_step >= STEP_LAST (引导完成)
    GuidePage --> Home: GuideFinished 事件

    Home --> [*]: _afterGuide 显示主页 + 欢迎词
```

每一步门控都是独立的"全屏页拦截"，只有当前步骤通过才推进到下一步，最终到达 `_afterGuide` 显示主页面。

---

## 10. 关键文件索引

| 文件 | 职责 |
|------|------|
| `assets/scripts/Game.ts` | `AccountService.configure` 注入、`onLoginSuccess` 回调、`_installAccountSwitchWatcher` 切号兜底 |
| `assets/scripts/module/auth/view/AuthPage.ts` | 启动授权页 UI，`_onWechatLogin` / `_onQqLogin` 入口 |
| `assets/scripts/module/player/service/PlayerService.ts` | `bootstrap` / `register` / `_doBootstrap` / `isUnauthorized` |
| `assets/scripts/GooseHomeApp.ts` | `_gateBootFlow` → `_stepAuth` → `_stepAdopt` → `_stepGuide` → `_afterGuide` 门控 |
| `assets/scripts/module/adopt/view/AdoptPage.ts` | 领养取名页，派发 `AdoptAccepted` / `AdoptCancelled` |
| `assets/scripts/module/guide/view/GuidePage.ts` | 新手引导页，派发 `GuideFinished` |
| `assets/scripts/config/EventName.ts` | 事件枚举定义（`AuthAccepted` / `LoginSuccess` 等） |
| `node_modules/@tencent/t-comm/es/qq-mp/AccountService.mjs` | t-comm 第三方 AccountService 实现 |
| `node_modules/@tencent/t-comm/es/qq-mp/qq-mp.mjs` | `launchQQMP` / `handleQQLoginOnShow` QQ 小程序跳转 |
| `node_modules/@tencent/t-comm/es/qq-mp/qq-mini-plugin.mjs` | `initQQMiniPlugin` / `qqPluginLogin` / `wxLogin` |

---

## 11. 常见问题排查

### 11.1. 切到全新 QQ 账号后卡在授权页，日志报 `_finishLoginOk bootstrap 失败`

**原因**：`bootstrap({force:true})` 中 GetPlayer 返回 `{r:0}`（无 player），旧版 `_doBootstrap` 直接 throw，`onLoginSuccess` 兜底 register 走不到。

**解决**：`bootstrap({force:true})` 传 `autoRegister=true` 给 `_doBootstrap`，GetPlayer 无 player 时自动 `register()` 建号 → `onLoginSuccess` 正常触发。

### 11.2. Android 微信真机 `wx.getPhoneNumber` 返回 `fail: no permission`

**原因**：Android 端微信小游戏不支持该 API（仅 iOS 可用）。

**解决**：调用前做平台判断，Android 降级为手动输入 + 短信验证码。

### 11.3. 切号后主页数据没刷新

**正常路径**：切号检测新旧 uid 不同 → `wx.restartMiniProgram({})` → 小游戏完全重启，所有数据重新拉取。

**兜底路径**（非小游戏环境）：`_installAccountSwitchWatcher` 逐个 Service clear + PetService.refresh + 派发 `AccountSwitched`，当前打开的 View 需监听该事件自行刷新。

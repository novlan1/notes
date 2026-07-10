# 授权登录系统技术文档

> 本文档描述「我鹅我鹅」小游戏的授权登录系统设计与实现，涵盖隐私授权、微信/QQ 双通道登录、状态流转与典型陷阱。

---

## 1. 系统概述

授权登录系统承担两个核心职责：

1. **微信隐私协议合规**：满足微信基础库 2.32.3+ 的隐私授权要求（`onNeedPrivacyAuthorization` / `requirePrivacyAuthorize`）
2. **双通道账号登录**：支持微信原生登录和 QQ 跨端登录，通过 `@tencent/t-comm` 的 `AccountService` 统一管理

---

## 2. 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                     表现层 (View)                            │
│  AuthPage.ts — 纯代码 UI，IUIView 接口                      │
│  ├─ 视觉：CDN 背景 + Logo + 主图 + 双按钮 + 协议勾选行        │
│  └─ 交互：隐私弹窗、登录按钮点击                              │
├─────────────────────────────────────────────────────────────┤
│                     服务层 (Service)                         │
│  AccountService（t-comm）— switchToWx / switchToQQ           │
│  PlayerService — register / bootstrap / getUid              │
│  BootService — 启动编排                                      │
├─────────────────────────────────────────────────────────────┤
│                     配置层 (Config)                          │
│  EventName.ts — AuthAccepted / LoginSuccess / AccountSwitched│
│  UIConfig.ts — UIID.Auth → LayerType.System                 │
├─────────────────────────────────────────────────────────────┤
│                     基础设施                                  │
│  Game.ts — AccountService.configure + onLoginSuccess 回调    │
│  GooseHomeApp.ts — 启动门控：_stepAuth → _stepAdopt → Home   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心流程时序

### 3.1 完整启动链

```
App Launch
  → Game.onLoad()
    → AccountService.configure({ onLoginSuccess, clearPlayer, bootstrapPlayer })
    → BootService.run()
      → dispatch(BootCompleted)
        → GooseHomeApp._gateBootFlow()
          → _stepAuth()
            ├─ 有 uid → 跳过，直接 _stepAdopt()
            └─ 无 uid → open(UIID.Auth) + 监听 AuthAccepted
```

### 3.2 微信登录时序

```
用户点击「微信登录」按钮
  │
  ▼
_handleWechatBtnTap()
  ├─ 未勾选隐私 → wx.requirePrivacyAuthorize()
  │     → 触发 onNeedPrivacyAuthorization 回调
  │       → wx.showModal 弹隐私弹窗
  │         ├─ 用户同意 → resolve('agree') + 勾选 checkbox
  │         │   → requirePrivacyAuthorize.success()
  │         │     → _doWechatGetProfileAndLogin()
  │         └─ 用户拒绝 → resolve('disagree'), 流程终止
  │
  └─ 已勾选隐私 → _doWechatGetProfileAndLogin()
        │
        ▼
      wx.getUserProfile({ desc: '...' })
        ├─ success → 记录昵称 → _onWechatLogin()
        └─ fail → 忽略（昵称非必需）→ _onWechatLogin()
              │
              ▼
            AccountService.ins.switchToWx()
              → t-comm 内部：wx.login → code2WxLogin → bootstrapPlayer
                → onLoginSuccess 回调
                  → PlayerService.register()（首登兜底）
                    → dispatch(EventName.AuthAccepted)
                      → close(UIID.Auth)
                        → GooseHomeApp._afterAuth() → _stepAdopt()
```

### 3.3 QQ 登录时序

```
用户点击「QQ 登录」按钮
  │
  ▼
_handleQqBtnTap()
  ├─ 未勾选隐私 → ToastTip.show('请先勾选同意协议')
  └─ 已勾选隐私 → _onQqLogin()
        │
        ▼
      AccountService.ins.switchToQQ()
        → t-comm 内部：跳转 QQ 小程序 / QQ App plugin → bootstrapPlayer
          → onLoginSuccess 回调（后续同微信分支）
```

---

## 4. 隐私授权机制

### 4.1 微信隐私 API 模型

微信基础库 2.32.3+ 引入了隐私保护能力，核心 API 对：

| API | 角色 | 说明 |
|-----|------|------|
| `wx.onNeedPrivacyAuthorization(callback)` | 注册方 | 注册隐私需求回调；当用户首次调用隐私相关 API 时微信触发此回调 |
| `wx.requirePrivacyAuthorize({ success, fail })` | 触发方 | 主动触发隐私授权检查；如果用户已同意则直接 success，否则触发上面注册的回调 |

### 4.2 本项目实现

```typescript
// 1. show() 时注册 handler
_registerPrivacyHandler():
  wx.onNeedPrivacyAuthorization((resolve) => {
    if (已勾选) → resolve('agree')     // 快速通道
    else → wx.showModal 弹窗询问用户    // 自定义弹窗
  });

// 2. 按钮点击时触发
_handleWechatBtnTap():
  if (未勾选) → wx.requirePrivacyAuthorize → 触发上面 handler → 弹窗
  if (已勾选) → 直接登录

// 3. 勾选框点击
_onPrivacyCheckTap():
  if (已勾选) → 取消勾选
  if (未勾选) → wx.requirePrivacyAuthorize → 勾上
```

### 4.3 关键设计：避免死循环

**陷阱**：`onNeedPrivacyAuthorization` 回调内不能调用任何需要隐私授权的 API（如 `getUserProfile`），否则会再次触发 `onNeedPrivacyAuthorization`，导致无限递归栈溢出。

**正确做法**：
- `onNeedPrivacyAuthorization` 回调**只做**：缓存 resolve + 弹窗 + resolve
- 登录操作（`getUserProfile` / `switchToWx`）只在 `requirePrivacyAuthorize.success` 回调或按钮点击处发起

```
❌ 错误链路（死循环）：
onNeedPrivacyAuthorization → getUserProfile → 触发 onNeedPrivacyAuthorization → ...

✅ 正确链路：
requirePrivacyAuthorize.success → getUserProfile（此时隐私已通过，不再触发回调）
```

---

## 5. AccountService 集成

### 5.1 初始化配置（Game.ts）

```typescript
AccountService.configure({
  qqAppId: QQ_APP_ID,
  post: tcommPost,
  storage: loginInfoStorage,
  loginInfoStorageKey: apiConfig.loginInfoStorageKey,
  isQQAccount,
  clearPlayer: () => { PlayerService.ins.clear(); },
  bootstrapPlayer: (opts) => PlayerService.ins.bootstrap(opts),
  onLoginSuccess: ({ platform, reason }) => {
    // 切号场景 → restartMiniProgram
    // 正常登录 → register 兜底 → dispatch(AuthAccepted) → close(Auth)
  },
});
```

### 5.2 登录通道

| 方法 | 内部流程 | 适用场景 |
|------|----------|----------|
| `switchToWx()` | wx.login → code2WxLogin(_ltype=tiploginwxproc) → bootstrapPlayer | 微信原生登录 |
| `switchToQQ()` | 跳转 QQ 小程序 / QQ App plugin → bootstrapPlayer | QQ 跨端登录 |

两者最终都走 `onLoginSuccess` 统一回调，业务侧无需区分登录结果处理。

---

## 6. 事件驱动

### 6.1 核心事件

| 事件 | 触发时机 | 监听者 |
|------|----------|--------|
| `auth:accepted` (AuthAccepted) | onLoginSuccess 内 register 成功后 | GooseHomeApp._afterAuth |
| `auth:login-success` (LoginSuccess) | t-comm 登录态变更时 | Game 账号切换检测 |
| `auth:account-switched` (AccountSwitched) | uid 变更检测通过 | 各业务 Service 重置 |

### 6.2 事件链

```
AccountService 登录成功
  → onLoginSuccess 回调（Game.ts）
    → PlayerService.register()（首登兜底）
      → dispatch(AuthAccepted)
        → GooseHomeApp._afterAuth()
          → _stepAdopt()（进入取名页）
```

---

## 7. UI 注册与层级

```typescript
// UIConfig.ts
enum UIID { Auth = 'Auth' }

// 层级
UIDefaultLayer[UIID.Auth] = LayerType.System;  // 最高层，盖住一切
```

AuthPage 使用 `static build(parent)` 工厂模式，由 `Game._registerUIs` 在启动时创建并挂到 System Layer。`show()`/`hide()` 通过 `oops.gui.open/close(UIID.Auth)` 调度。

---

## 8. 视觉构建方案

AuthPage 采用**纯代码 UI**（非 prefab），特点：

| 方面 | 方案 |
|------|------|
| 背景 | Graphics 画兜底色 + CDN 大图叠加 |
| 按钮 | 整张 PNG 切图 + opacity 按压反馈 |
| 协议行 | 多段 Label 拼接 + 独立点击热区 |
| 勾选框 | CDN 加载 checked/unchecked SpriteFrame 切换 |
| 字体 | RemoteFontBinder 远程字体统一绑定 |
| 兜底 | CDN 失败 → 蓝底 + 白色描边标题文字 |
| 尺寸锁定 | Sprite.SizeMode.CUSTOM + 二次 setContentSize |

---

## 9. 降级与兜底策略

| 场景 | 降级方案 |
|------|----------|
| 非微信环境（devtools/低版本） | `requirePrivacyAuthorize` 不可用 → 直接勾选并登录 |
| CDN 图加载失败 | 蓝色兜底背景 + 白色描边 Label 标题 |
| `getUserProfile` 不可用 | 跳过头像昵称授权，直接 `switchToWx` |
| `getUserProfile` 用户拒绝 | 忽略错误，继续登录（昵称非必需） |
| 登录接口失败 | catch → ToastTip.show（不走事件派发，因 Boot 阶段无 GooseHomeApp 监听） |
| `onNeedPrivacyAuthorization` 超时 | setTimeout(0) 兜底直接勾选 |

---

## 10. 典型陷阱与教训

### 陷阱 1：隐私回调内调用隐私 API → 死循环

```
根因：wx.getUserProfile 是隐私 API，在 onNeedPrivacyAuthorization 回调内调用
      会再次触发 onNeedPrivacyAuthorization → 无限递归 → Maximum call stack size exceeded

修复：onNeedPrivacyAuthorization 只做 resolve，登录操作在 requirePrivacyAuthorize.success 内发起
```

### 陷阱 2：Boot 阶段 Toast 不显示

```
根因：AuthPage 处于 Boot 阶段，GooseHomeApp 尚未初始化，没有监听 ShowToast 事件
修复：直接使用 ToastTip.show() 静态方法，不走事件派发
```

### 陷阱 3：Sprite.sizeMode 被 spriteFrame 赋值覆盖

```
根因：Cocos 3.8 Sprite 默认 sizeMode=TRIMMED，赋 spriteFrame 时用图片原尺寸覆盖 UITransform
修复：赋值前后双重设置 sizeMode=CUSTOM + setContentSize
```

### 陷阱 4：切号后状态残留

```
根因：switchToWx/switchToQQ 成功后 uid 变更，但各 Service 缓存旧数据
修复：onLoginSuccess 检测 uid 变更 → restartMiniProgram 彻底重启小游戏
```

---

## 11. 文件清单

| 文件 | 职责 |
|------|------|
| `assets/scripts/module/auth/view/AuthPage.ts` | 授权页视图 + 隐私授权 + 登录入口 |
| `assets/scripts/Game.ts` | AccountService.configure + onLoginSuccess 全局回调 |
| `assets/scripts/GooseHomeApp.ts` | 启动门控：_stepAuth → AuthAccepted → _stepAdopt |
| `assets/scripts/module/boot/service/BootService.ts` | 启动编排（隐私已前移到 AuthPage） |
| `assets/scripts/config/EventName.ts` | 授权相关事件定义 |
| `assets/scripts/config/UIConfig.ts` | UIID.Auth 注册 + System 层级 |
| `assets/scripts/api/account.ts` | isQQAccount 统一判断 |

---

## 12. 演进方向

1. **隐私弹窗组件化**：当前用 `wx.showModal` 原生弹窗，后续可换为游戏内自绘弹窗（与整体视觉统一）
2. **生物识别登录**：支持微信面容/指纹快速登录，减少首次进入步骤
3. **登录态续期**：`AccountService` 内部 token 过期自动静默续期，减少用户感知
4. **多端统一**：QQ 小游戏/H5 端复用同一套 AuthPage 逻辑，通过平台适配层屏蔽差异

<!-- # 启动黑屏优化（2026-07-27） -->

## 1. 问题背景

微信小游戏冷启动期间，first-screen.js（原生层进度条）销毁到 Cocos 主页完整显示之间，存在 **1-3s 纯黑屏**。根因有三层：

| 窗口 | 阶段 | 时长 | 原因 |
|------|------|------|------|
| A | `firstScreen.end()` → Cocos 第一帧 | ~150ms | Camera 默认 clearColor=黑色 |
| B | `buildScene` → CDN 背景图加载 | 200-500ms | `oops.res.loadRemoteSpriteFrame` 异步 |
| C | `_gateBootFlow` 网络等待 | 1-3s | `Promise.all([GetPlayer, GetPetInfo])` |

## 2. 方案架构

```
firstScreen      Camera         Splash过渡层           完整主页
(进度条)    →    clear(浅天蓝)  →  bg-home-large.jpg  →  gameLayer
                150ms            同步+本地               _afterGuide后

                ←── 全程零黑屏，始终有视觉内容填充 ──→
```

### 2.1. 核心设计

- **Splash 过渡层**：独立的 Canvas 子节点，在 `gameLayer`（active=false）之上显示
- **资源分离**：Splash 用本地 resources 图（0ms），主页继续走 CDN
- **单一颜色 token**：ClearColor + Graphics + BgSprite 兜底共用一个 `COLOR.launch.splash`

## 3. 改动文件清单

| 文件 | 改动 | 作用 |
|------|------|------|
| `Game.ts` | `bootstrap()` 设 `Camera.clearColor`；预热本地 Splash SpriteFrame | 引擎初始化黑屏消除 |
| `GooseHomeApp.ts` | `buildScene()` 恢复 `gameLayer.active=false`；新增 `_buildSplashLayer` / `_hideSplashLayer` | Splash 过渡层，完整画面才显示 |
| `MainHomeBuilder.ts` | `_buildBackground` 加 Graphics 兜底填充 | CDN 图加载中含过渡 |
| `ResManager.ts` | 新增 `GameImageRes.SplashBg`；AuthBoot 加 `HomeBg` | Splash 本地化 + CDN 预热 |
| `custom-first-screen.js` | `END_TWEEN_MS` 700→150，`END_HOLD_MS` 100→0，`PROGRESS_TWEEN_MS` 500→200 | 进度条不再假装跑，快速交接 |
| `DesignTokens.ts` | 新增 `COLOR.launch.splash` token | 全局颜色收口到设计系统 |
| `.imageallowlist` | 加 `assets/resources/images/bg-home-large.jpg` | Splash 本地图豁免 CDN 策略 |
| `res-manager.test.ts` | AuthBoot 5→6 items | 测试同步 |

## 4. 关键设计决策

### 4.1. 为什么不用 CDN 图做 Splash

Splash 是启动期最关键体验，CDN 图首次加载 200-500ms 延迟不可容忍。改为本地 `resources.load`（文件 I/O <10ms），通过 `Game.bootstrap()` 预热一次，`buildScene` 中 `resources.load` 直接命中缓存。

### 4.2. 为什么 Camera.clearColor 不能用图片

`Camera.clearColor` 背后是 GPU `gl.clear(gl.COLOR_BUFFER_BIT)`，只接受 RGBA 纯色值，不能传纹理。但它覆盖了 `firstScreen.end()` 到 Cocos 第一帧之间的唯一黑屏窗口，是不可或缺的安全层。

### 4.3. 为什么恢复 gameLayer.active=false

之前尝试让 `gameLayer` 提前可见，但按钮、鹅骨骼等异步元素在 CDN 加载中不完整，用户体验更差。正确做法是保留 `active=false`，用独立的 Splash 层填充等待窗口，保证 `_afterGuide` 时画面完整性。

### 4.4. 颜色 token 收口

`new Color(155, 227, 245, 255)` 在 4 处重复 —— 统一提取为 `COLOR.launch.splash`（DesignTokens.ts），全局单点维护。后续换色只需改 `t(155, 227, 245, '#9BE3F5')` 一行。

## 5. 视觉效果对比

| 阶段 | 优化前 | 优化后 |
|------|--------|--------|
| firstScreen 结束 | 黑屏 800ms | 浅天蓝 150ms → 背景图 |
| buildScene | 黑屏 | 浅天蓝 Graphics |
| CDN 图加载中 | 黑屏 200-500ms | Splash 背景图（本地瞬时可见） |
| 网络请求等待 | 黑屏 1-3s | Splash 背景图持续填充 |
| _afterGuide 完成 | 主页突然出现 | Splash 消失，完整主页平滑显示 |

<img src="https://cdn.uwayfly.com/article/2026/7/own_mike_3St2ME64x6XY6wsN.png" width="400" />

<img src="https://cdn.uwayfly.com/article/2026/7/own_mike_iGdCzCwb4BsrCsYy.png" width="400" />

<img src="https://cdn.uwayfly.com/article/2026/7/own_mike_B6Y5dJ2wyPSNWZw6.png" width="400" />

## 6. 后续可调

- **Splash 图替换**：只需换 `assets/resources/images/bg-home-large.jpg` 和为 `GameImageRes.SplashBg` 改枚举值
- **过渡色微调**：只需改 `DesignTokens.ts` 中 `COLOR.launch.splash` 的 RGB 值，4 处自动同步
- **Splash 切换动画**：可在 `_hideSplashLayer` 中增加 fade-out tween

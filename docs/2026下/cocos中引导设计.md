<!-- # 新手引导系统技术设计与实现 -->

## 一、概述

本文档梳理 **Cocos** 项目新手引导系统的完整技术方案。引导系统负责在用户首次进入主页后，按顺序引导用户完成"喂食 → 收蛋 → 逛集市 → 赚鹅粮 → 碰一碰"五项核心操作。

系统采用**配置驱动的串行状态机**设计，每个引导步骤由若干 Segment 串行组成，每个 Segment 又根据类型分别由 `CutsceneRenderer`（全屏剧情展示）或 `CoachmarkRenderer`（高亮操作引导）渲染。

## 二、整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     GuideConfig.ts                      │
│   STEP_ORDER / STEP_META / ICoachmarkSeg / ICutsceneSeg │
│   （纯配置，描述引导步骤和每步的展示序列）                     │
└──────────────────────┬──────────────────────────────────┘
                       │ 驱动
┌──────────────────────▼──────────────────────────────────┐
│                    GuidePage.ts                         │
│   主状态机：_runFromStep → _runStep → _runSegment         │
│   负责串行推进步骤、调用渲染器、上报服务端进度                  │
└──────────────────────┬──────────────────────────────────┘
                       │ 调度
            ┌──────────┴──────────┐
            ▼                     ▼
   CutsceneRenderer      CoachmarkRenderer
   (全屏剧情/cutscene)     (高亮操作/coachmark)
            │                     │
            └──────────┬──────────┘
                       │ 辅助
            ┌──────────┼──────────┐
            ▼          ▼          ▼
    HollowMaskBuilder  BubbleBuilder  FingerBuilder
    (镂空蒙层)          (气泡切图)     (引导手势)
```

辅助组件：
- **`GuideAnchorRegistry`**：锚点注册表，业务侧注册目标节点，Renderer 异步等待
- **`GuideService`**：运行时单例，管理引导状态、弹窗排队、进度上报

## 三、核心技术要点

### 3.1 Step & Segment 两层状态机

引导不是简单的"弹一个提示 → 点掉 → 下一个"，而是一个**两层串行状态机**：

- **Step 层**：5 个步骤按 `STEP_ORDER` 顺序串行执行（1→2→3→4→5），每步完成后调用 `advanceGuideStep` 上报服务端
- **Segment 层**：每个 Step 内部由若干 Segment 串行组成。例如 `STEP_FEED`：
  ```
  ① Cutscene（展示"获得鹅粮"动画 → 3s 倒计时或点击）
  ② Coachmark（高亮喂食按钮 → 点击 + 等 PetFed 事件 + 等用户回主页）
  ```

```mermaid
flowchart TD
    A[GuidePage.show] --> B{nextPendingStep}
    B -->|有未完成| C[取 step meta]
    B -->|全部完成| G[_finishAll]
    C --> D{segments.length > 0?}
    D -->|是| E[遍历 segments]
    D -->|否| F[advanceWithRetry 无感推进]
    E --> E1[runSegment: cutscene / coachmark]
    E1 --> E2{advanceServer?}
    E2 -->|是| E3[advanceWithRetry]
    E2 -->|否| E4[继续下一段]
    E3 --> E4
    F --> nextStep
    E4 -->|还有下一段| E1
    E4 -->|段结束| nextStep
    nextStep --> B
    G --> H[派 GuideFinished + close UI + flush 排队弹窗]
```

### 3.2 Segment 类型

#### Cutscene Segment（全屏剧情）

不需要用户与业务 UI 交互，只需要"看到"即可推进。

- **视觉结构**（自上而下）：标题切图 → 主体 prefab（如鹅粮包动画）→ 底部倒计时提示
- **推进信号**：空白点击 OR 倒计时归零（取先到者）
- **典型用例**：STEP_FEED 的「今日登录鹅鹅 收获鹅粮」全屏动画

#### Coachmark Segment（高亮操作引导）

需要用户在主页真实 UI 上执行操作。

- **视觉结构**：全屏半透明蒙层 + 镂空高亮区域 + 气泡切图 + 手指手势动画
- **推进信号**：
  - 无 `businessEvent`：仅点击即推进（如 `STEP_TAP` 碰一碰入口）
  - 有 `businessEvent` + `awaitReturnHome=false`：业务事件到达即推进
  - 有 `businessEvent` + `awaitReturnHome=true`：**双信号到齐**（businessEvent + GuideReturnedHome）才推进

### 3.3 双信号推进机制（核心难点）

这是整个系统最复杂的部分。以 `STEP_FEED` 的第二段 Coachmark 为例：

```
用户点击喂食按钮
  ↓ (ClickProxy 转发 TOUCH_END → 业务 Button 触发喂食)
  ↓
  ├─ 视觉让位：立即隐藏 dim（_hideVisuals），让用户看到主页动画
  ↓
  ├─ 等 PetFed 事件（喂食成功回包）
  │    ├─ 带 PetState 数据，可判断 canLayEgg
  │    └─ 3s 超时兜底（eventTimeout）
  ↓
  └─ 等 GuideReturnedHome 事件（用户从 LayEgg/Bazaar/TaskList 回到主页）
       ├─ canLayEgg=true  → LayEgg弹窗 → 关闭派 GuideReturnedHome → 推进
       ├─ canLayEgg=false → 不会有弹窗 → 直接跳过等待 → 零延迟推进
       └─ 30s 超时兜底（极端情况）
```

**设计要点**：
| 配置项 | 说明 | 兜底策略 |
|--------|------|----------|
| `businessEvent` | 业务事件名，如 `PetFed`、`BazaarOpened`、`TaskPanelOpened` | `eventTimeout`（默认3s） |
| `awaitReturnHome` | 是否等待用户从子页面回到主页 | 30s 兜底 timer + `canLayEgg` 捷径 |

### 3.4 锚点注册与异步等待

引导需要高亮的 UI 节点（喂食按钮、集市入口等）由各个业务模块在创建时注册到 `GuideAnchorRegistry`：

```typescript
// 业务侧（如 MainHomeBuilder）
GuideAnchorRegistry.ins.register('home.feed-button', feedButtonNode);
GuideAnchorRegistry.ins.register('home.bazaar-entry', bazaarEntryNode);
```

CoachmarkRenderer 通过 `waitFor(id, 5000)` 异步等待节点就绪，5s 超时后整段降级跳过。

**节点销毁自动摘除**：锚点节点被销毁时自动从注册表移除，避免悬挂引用。

### 3.5 镂空蒙层实现

采用 **Mask + 反向裁剪（inverted stencil）** 方案：

```
dim 容器（全屏 UITransform）
 ├─ HoleClip（Mask GRAPHICS_STENCIL + inverted=true + Graphics 画镂空形状）
 │    └─ DimFill（全屏 2x 放大黑色 Graphics）
 │         → 受 inverted Mask 影响：镂空内透明、镂空外暗色
 ├─ BubbleBuilder（气泡切图，直接挂 dim 下不进 Mask）
 ├─ FingerBuilder（手势动画）
 └─ ClickProxy（透明触摸代理，覆盖镂空区域）
```

为什么不直接用 Graphics 画 even-odd 路径？因为 Cocos 3.8 Graphics 仅支持 nonzero 填充规则，同一 path 反向走点不能稳定挖洞。

### 3.6 引导期弹窗守卫

引导正在运行时，非白名单的 PopUp/Dialog 层弹窗会被拦截入队，引导结束后按顺序弹出：

| 白名单 | 原因 |
|--------|------|
| `Guide` | 引导自身 |
| `LayEgg` | STEP_FEED 喂食后必须看到金蛋弹窗；hide 时派 GuideReturnedHome |
| `Bazaar` | STEP_COLLECT 点击集市入口后需要进入 |
| `TaskList` | STEP_EARN_FOOD 点击赚鹅粮入口后需要进入 |
| `GoodsDetail` | 用户在集市内主动点击兑换卡片 |
| `GetGameGooseFood` | 内部自带引导期守卫 |

## 四、开发中遇到的问题与解决方案

### 问题 1：点击后引导迟迟不推进 —— 单信号等待的局限性

**现象**：最早的实现是"点击即推进"，点击喂食按钮后引导立刻销毁，但此时 `LayEgg` 弹窗还没弹出，导致引导结束后金蛋弹窗盖在正常 UI 上，体验混乱。

**根本原因**：点击与业务结果的时序不同步。点击只是触发请求，真正的业务结果（喂食成功、页面跳转）需要时间返回。

**解决方案**：引入 **双信号推进机制**——`businessEvent` 和 `GuideReturnedHome` 到齐后才推进：
- `businessEvent`（如 `PetFed`）确认业务已成功
- `GuideReturnedHome` 确认用户已从子页面/弹窗回到主页

### 问题 2：GuideReturnedHome 事件丢失

**现象**：用户不通过高亮区域点击，而是直接点击别的兑换卡片完成兑换 → Bazaar 自动关闭 → `GuideReturnedHome` 已派发，但 CoachmarkRenderer 还没订阅 → **事件被错过**，dim 蒙层残留，引导卡死。

**原因**：原实现把 `GuideReturnedHome` 的订阅放在 `_onTargetClicked()` 内部，如果用户不走高亮通道，订阅永远不会建立。

**解决方案**（2026-06-29）：将 `GuideReturnedHome` 的订阅提前到 `_start()` 阶段，与 `businessEvent` 同步订阅，确保无论事件何时到达都不会被错过。

### 问题 3：鹅不产蛋时的 5 秒空等

**现象**：用户喂食完 → `PetFed` 事件已到 → 但鹅 `canLayEgg = false`，`LayEggDialog` 不会弹出 → `GuideReturnedHome` 永远不会来 → 即使 5s 短兜底，用户也要硬等 5 秒才能看到下一步引导。

**原因**：上一版修复用了 `RETURNED_HOME_SHORT_TIMEOUT = 5000` 兜底，但仍然是空等。

**解决方案**（2026-07-02）：`_onBusinessEvent` 收到的 `PetFed` 事件 payload 携带 `PetState`，直接读取 `pet.canLayEgg`。如果为 `false`，立即将 `_returnedHomeFired` 置为 `true`，**零延迟推进**，不再等待任何 timer。

```typescript
// PetFed 事件携带 PetState，若 canLayEgg=false 则鹅不产蛋，
// LayEggDialog 不会弹出、GuideReturnedHome 永远不会来，直接跳过等待。
const petCanLay = (payload as any)?.pet?.canLayEgg;
if (petCanLay === false) {
  this._returnedHomeFired = true;
  this._clearReturnedHomeTimer();
}
```

### 问题 4：引导中"登录收获鹅粮"展示与后台任务系统不一致

**现象**：cutscene ① 硬编码假数据 `iconAmount = 10`，但实际奖励应由后台任务系统（签到 day-1）驱动。用户可能已经领过签到奖励，或者签到配置变更了金额，引导却仍展示虚假的 +10g。

**解决方案**：引入 `requireTaskClaim` 配置项。cutscene ① 运行时：
1. 调用 `TaskService.fetchTaskList()` 检查签到任务状态
2. 找到 `dayNumber=1、state='claimable'` 的任务
3. 有 → 调 `claimTaskReward(taskId)` 真正领取奖励，用返回的真实金额填充 `iconAmount`
4. 无 → 跳过此段 segment，不渲染任何 cutscene

### 问题 5：引导锚点等待超时

**现象**：某些引导步骤迟迟不出高亮，日志显示 `锚点 xxx 等待 5000ms 超时，降级跳过`。

**原因**：业务模块未及时注册锚点节点，或节点被提前销毁。

**解决方案**：
- `GuideAnchorRegistry` 提供 `waitFor(id, timeoutMs)` API，超时返回 `null`
- CoachmarkRenderer 对 `null` 结果做降级处理：整段 segment 跳过，继续推进下一步
- 节点销毁自动摘除（监听 `NODE_DESTROYED` 事件），避免下次拿到已销毁节点

### 问题 6：Mask 镂空无法透出背景

**现象**：用 Graphics + even-odd 规则画矩形挖圆，结果整片都是均匀暗色，无法透出高亮区域。

**原因**：Cocos 3.8 Graphics 仅支持 nonzero 填充规则，没有暴露 `fillRule` 参数。

**解决方案**：改用 **Mask(GRAPHICS_STENCIL) + inverted=true** 方案。在 HoleClip 节点上画镂空形状作为 stencil，反转裁剪后其子节点 DimFill 的全屏黑底仅在镂空外可见，镂空内自然透出背景。

### “喂食”引导事件

喂食的业务事件不能用"喂食成功"，要用"喂食结束"，不管喂食成功还是失败，都要进入下一步，防止用户等的是兜底时间。

## 五、关键文件索引

| 文件 | 职责 |
|------|------|
| `module/guide/model/GuideConfig.ts` | 引导步骤与 Segment 配置定义、辅助函数 |
| `module/guide/view/GuidePage.ts` | 引导主状态机，Step/Segment 串行调度 |
| `module/guide/view/renderer/CoachmarkRenderer.ts` | Coachmark 渲染器，双信号推进逻辑 |
| `module/guide/view/renderer/CutsceneRenderer.ts` | Cutscene 渲染器，倒计时/点击推进 |
| `module/guide/view/builder/HollowMaskBuilder.ts` | 镂空蒙层构建（stencil 反向裁剪） |
| `module/guide/model/GuideAnchorRegistry.ts` | 锚点注册表，异步 waitFor |
| `module/guide/service/GuideService.ts` | 服务端进度上报、弹窗排队与守卫 |

## 六、设计原则总结

1. **配置驱动**：所有引导步骤的行为由 `STEP_META` 配置决定，不硬编码推进逻辑
2. **视觉与逻辑分离**：视觉组件（dim/气泡/手势）可随时隐藏让位，Renderer 继续运行订阅与 timer
3. **多层兜底**：每个异步等待点都有 timer 超时降级（anchor 5s、event 3s、returnHome 30s）
4. **事件早订阅**：businessEvent 和 GuideReturnedHome 在 `_start()` 阶段就订阅，防止事件早于点击到达丢失
5. **可降级不阻塞**：锚点等待失败、服务端上报失败、timer 超时都不会卡死引导流程

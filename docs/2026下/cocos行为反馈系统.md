## 1. 它解决什么问题

养鹅小游戏在不做"行为反馈"之前，鹅就是一个静态立绘 —— 不管玩家喂它、它下蛋、还是三天没上线，鹅都是同一个姿势、同一个表情。游戏因此失去"被养"的感觉，玩家也得不到正反馈。

"行为反馈系统"要做的事只有一件：

> **根据当前游戏状态，自动选择合适的"动作 + 气泡文案"，让鹅像一只活物。**

需求表上 18 个场景覆盖了 5 大行为面：新用户初见、兜底日常、深夜彩蛋、喂食养成（下蛋/进食/告罄）、休息状态、回归彩蛋（每日/久别）。我们不可能为每个场景写一套 if-else，必须设计一个**可扩展的、可配置驱动的、跨业务解耦**的系统。

---

## 2. 总体架构：三层分离

整套系统刻意切成了三个文件、三个角色：

```
┌──────────────────────────────────────────────────────────────┐
│                  业务层 (Service / Page)                      │
│  GooseService · GooseHomeApp · BazaarService · PlayerService │
│  「我什么时机 dispatch 什么事件」                                │
└──────────────────────────┬───────────────────────────────────┘
                           │ oops.message.dispatch(event, payload)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              决策层 GooseBehaviorTrigger.ts                   │
│  「当前状态应该触发哪个场景？用哪份文案？」                         │
│  - 上下文收集  - 优先级匹配  - 后台文案注入  - 每日去重             │
└──────────────────────────┬───────────────────────────────────┘
                           │ oops.message.dispatch(event, payload)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              表现层 GooseAnimController.ts                    │
│  「收到事件后播放 spine 动画 + 弹气泡 + 降级 toast」              │
│  - 监听注册  - 优先级中断  - idle 兜底循环  - 降级回退             │
└──────────────────────────┬───────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
         sp.Skeleton           ToastBubblePresenter
       (spine 骨骼动画)         (头顶气泡 / 表情 emoji)
```

最底层是纯数据文件 `GooseAnimEvent.ts`，它定义事件名、payload 形状、场景配置表 —— 三个文件共享同一个真理源。

### 2.1. 2.1 三个文件的契约关系

| 文件 | 角色 | 关键产物 | 谁会改 |
|------|------|----------|--------|
| `GooseAnimEvent.ts` | 数据/契约 | 事件名枚举、Payload、19 条场景配置 | UI 动效同学 |
| `GooseBehaviorTrigger.ts` | 决策/规则 | `TRIGGER_CONDITION` 枚举、`evaluate()`、`triggerEggResult()` | 业务同学（条件改动） |
| `GooseAnimController.ts` | 表现/播放 | `init(spineSlot, presenter)`、idle 循环、播放降级 | UI 动效同学 |

**铁律**：业务同学只 dispatch 事件，**绝不直接 import** Controller；动效同学只改配置表，**绝不**改业务 Service。这种隔离让 18 个场景可以并行迭代。

---

## 3. 数据层：GooseAnimEvent.ts

### 3.1. 3.1 命名规范：业务可读、动效可控

```ts
export const GooseAnimEventName = {
  FirstMeet:    'goose-anim:first-meet',   // 新用户初见
  IdleWalk:     'goose-anim:idle-walk',    // 兜底日常散步
  Hungry:       'goose-anim:hungry',       // 等待喂食
  LayEgg:       'goose-anim:lay-egg',      // 下蛋瞬间
  // ... 共 18 个
} as const;
```

- **统一前缀** `goose-anim:`：让 mitt 事件总线日志可按前缀 grep
- **`as const`**：导出窄类型 `GooseAnimEventNameType`，避免拼写错误

### 3.2. 3.2 Payload：业务可按需填、动效按需取

```ts
export interface GooseAnimPayload {
  satiety?: number;      // 饱食度 Hungry/AlmostFull 用
  foodAmount?: number;   // 鹅粮余额 FoodEmpty 用
  eggCount?: number;     // 蛋数量 EggFullPrompt 用
  restSeconds?: number;  // 休息剩余秒数 Resting 用
  absentDays?: number;   // 距上次登录天数 DailyReturn/LongAbsence 用
  eggType?: 'silver' | 'gold';
}
```

所有字段都是可选的 —— dispatch 端按场景填就行，Controller 用到哪个读哪个。`{N}` 占位符约定（用于"你已经 N 天没来了"）由 Controller 统一替换。

### 3.3. 3.3 配置表：单一真理源

`GOOSE_ANIM_SCENES` 是整套系统的"主索引"，19 条记录把"事件名 → spine 动画 → 气泡文案 → 停留时长 → 描述"绑在一起：

```ts
{
  id: 4,
  label: '下蛋瞬间',
  event: GooseAnimEventName.LayEgg,
  spineAnim: 'layeggs_silver',   // 设计师给的 spine 动画名
  spineLoop: false,
  bubbleTexts: [
    '噗——下出来了！',
    '鹅了个鹅，这颗是上品！',
    '下蛋成功！请欣赏鹅的杰作~',
    '嘿嘿，蛋到手，别客气~',
  ],
  bubbleEmoji: '🥚',
  bubbleDuration: 3,
  emotion: '中性/专注',
  pose: '坐姿',
  expression: '用力闭眼 + 满足',
  motionDesc: '用力下蹲 + 蛋落地。动作幅度大，下蹲 0.6s 后弹起伴随蛋滚出',
}
```

**关键设计**：所有"动效内容"都被数据化、可视化。设计师在 Figma 给完动画名后，UI 动效同学只需要把名字填进 `spineAnim` 字段 —— 不需要写一行播放代码，新场景就生效了。

### 3.4. 3.4 完整 18 场景清单（来自需求表）

| ID | 场景 | 事件 | 触发条件 | spine 动画 | 气泡 emoji |
|----|------|------|----------|-----------|-----------|
| 1  | 新用户初见 | `FirstMeet` | 首次领养成功 | `welcome` | 👋 |
| 2  | 兜底-散步 | `IdleWalk` | 默认 | `walk_in_out` | 💭 |
| 3  | 深夜彩蛋 | `LateNight` | 02:00~05:00 | `sleepyloop` | 💤 |
| 4  | 下蛋瞬间 | `LayEgg` | 喂食 100% | `layeggs_silver` | 🥚 |
| 5  | 收蛋-银 | `EggSilver` | 下蛋结果=银 | `exciting` | 🤩 |
| 6  | 等待喂食 | `Hungry` | 鹅粮≥10 + 进度 1~79% | `hunger` | 🤤 |
| 7  | 即将喂饱 | `AlmostFull` | 进度 80~99% | `eat` | 🤩 |
| 8  | 收蛋-金 | `EggGold` | 下蛋结果=金 | `layeggs_glod` | 🏆 |
| 9  | 鹅粮告罄 | `FoodEmpty` | 鹅粮<10 且不在休息 | `hunger` | 😢 |
| 10 | 休息恢复 | `RestRecovered` | 倒计时=0 且进度=0 | `exciting` | ⭐ |
| 11 | 蛋多催兑 | `EggFullPrompt` | 蛋≥10 个 | `exciting` | 🛒 |
| 12 | 休息中 | `Resting` | 倒计时>0 | `sleepyloop` | 💤 |
| 13 | 每日回归 | `DailyReturn` | 1~7 天 | `welcome` | 😊 |
| 14 | 久别重逢 | `LongAbsence` | ≥7 天 | `welcome` | 🥺 |
| 15 | 兜底-整理羽毛 | `IdleGroom` | 默认 | `walk_in_out_reverse` | 🪶 |
| 16 | 兜底-原地转圈 | `IdleSpin` | 默认 | `walk_in_out` | 🌀 |
| 17 | 兜底-冥想 | `IdleMeditate` | 默认 | `sleepyloop` | 🧘 |
| 18 | 兜底-对镜 | `IdleMirror` | 默认 | `walk_in_out_reverse` | 🪞 |
| 19 | 喂食进食 | `Feed` | 点喂鹅粮成功 | `eat` | 😋 |

可以发现：动画名是**复用的**（`exciting` 用于三个不同语义场景、`welcome` 用于初见和回归），这是 spine 资源有限的现实约束 —— 语义靠"播放什么动画 + 弹什么气泡"组合表达，而不是靠动画本身。

---

## 4. 决策层：GooseBehaviorTrigger.ts

这是整套系统最有"业务感"的部分。**它的职责**：当玩家进入主页那一刻，根据当前游戏状态判断"现在应该触发哪个场景"。

### 4.1. 4.1 13 个条件枚举（与后端 trigger_condition 字段一一对应）

```ts
export const TRIGGER_CONDITION = {
  NEW_USER_FIRST_HOME:      'new_user_first_home',
  FOOD_GE_10_FEED_1_79:     'food_ge_10_feed_1_79',
  FEED_80_99:               'feed_80_99',
  FEED_100:                 'feed_100',
  FEED_EAT:                 'feed_eat',            // 主动触发，不在 evaluate 链
  LOCAL_TIME_02_05:         'local_time_02_05',
  EGG_RESULT_SILVER:        'egg_result_silver',   // 主动触发
  EGG_RESULT_GOLD:          'egg_result_gold',     // 主动触发
  LAST_ENTER_1_7_DAYS:      'last_enter_1_7_days',
  LAST_ENTER_GE_7_DAYS:     'last_enter_ge_7_days',
  FOOD_LT_10_NOT_RESTING:   'food_lt_10_not_resting',
  REST_COUNTDOWN_0_FEED_0:  'rest_countdown_0_feed_0',
  REST_COUNTDOWN_GT_0:      'rest_countdown_gt_0',
  EGG_COUNT_GE_10:          'egg_count_ge_10',
  DEFAULT:                  'default',
} as const;
```

### 4.2. 4.2 优先级链：自上而下、首命中即返回

```ts
const PRIORITY_CONDITIONS: TriggerConditionType[] = [
  NEW_USER_FIRST_HOME,       // 1. 新用户身份最高
  FOOD_GE_10_FEED_1_79,      // 2. 一般饿
  FEED_80_99,                // 3. 即将喂饱
  FEED_100,                  // 4. 满
  LOCAL_TIME_02_05,          // 5. 深夜彩蛋
  LAST_ENTER_GE_7_DAYS,      // 6. 久别重逢（≥7 天）
  LAST_ENTER_1_7_DAYS,       // 7. 每日回归（1~7 天）
  FOOD_LT_10_NOT_RESTING,    // 8. 鹅粮告罄
  REST_COUNTDOWN_0_FEED_0,   // 9. 满血复活
  REST_COUNTDOWN_GT_0,       // 10. 休息中
  EGG_COUNT_GE_10,           // 11. 催兑换
  DEFAULT,                   // 12. 兜底 → IdleWalk
];
```

**注意**：以下三个条件**不**进优先级链，因为它们是由特定流程主动调用的，不是进入主页时算的：

- `FEED_EAT`：玩家点喂鹅粮按钮那一刻
- `EGG_RESULT_SILVER` / `EGG_RESULT_GOLD`：下蛋结算时

### 4.3. 4.3 上下文收集：把所有判断因子聚成结构体

```ts
private _collectContext(isNewUserFirstHome: boolean): BehaviorContext {
  const pet = PetService.ins.getFirstPet();
  const feedPercent = Math.round((pet.satiety / Math.max(1, pet.satietyMax)) * 100);
  const foodAmount = PlayerService.ins.getFoodAmount();
  const restSeconds = Math.max(0, (pet.nextEggTime || 0) - Math.floor(Date.now() / 1000));
  const totalEggs = (BazaarService.ins.getData()?.goldBalance ?? 0)
                  + (BazaarService.ins.getData()?.silverBalance ?? 0);
  const lastLoginTime = PlayerService.ins.getState().lastLoginTime;
  const absentDays = lastLoginTime > 0
    ? Math.floor((Date.now() - lastLoginTime * 1000) / 86400000)
    : -1;   // -1 = 后端未返回，跳过回归类条件
  // ...
}
```

把多 Service 的状态聚合成一个**纯函数输入** (`BehaviorContext`)，使后续的 `_matchCondition` 退化成纯 if 链 —— 极大地方便单元测试。

### 4.4. 4.4 每日仅一次的本地去重

需求表里有几条明确写"每日仅 1 次"（深夜、每日回归、喂满 100%），后端没法实时去重，前端用 localStorage：

```ts
const STORAGE_KEY_LATE_NIGHT = 'goose_behavior_late_night_date';
const STORAGE_KEY_LAST_ENTER = 'goose_behavior_last_enter_date';
const STORAGE_KEY_FEED_100   = 'goose_behavior_feed_100_date';

private _hasTriggeredToday(key: string): boolean {
  return oops.storage.get(key) === this._todayStr();   // 'YYYY-MM-DD'
}
```

派发成功后立刻 `_markTriggeredToday` 写回。简单的字符串比对，跨日自然失效。

### 4.5. 4.5 后台文案注入：远程可配置

> 这是整套系统最妙的一笔。

`behavior_text_cfg` 来自后端 `BazaarService` 的活动配置，按 `trigger_condition` 维度下发一组文案：

```ts
private _loadBehaviorTextCfg(): void {
  const ruleList = BazaarService.ins.getActInfoData()
                                  ?.frontEndCfg?.behavior_text_cfg?.rule_list;
  for (const item of ruleList) {
    if (item.status === 1 && item.trigger_condition) {
      this._behaviorTextMap.set(item.trigger_condition, item.text_list);
    }
  }
}
```

派发时把对应条件的文案列表塞进 payload：

```ts
const textList = this._behaviorTextMap.get(condition);
if (textList && textList.length > 0) {
  (payload as any)._behaviorTexts = textList;  // 私有字段，仅 Controller 消费
}
oops.message.dispatch(eventName, payload);
```

Controller 收到事件后**优先用 `_behaviorTexts`，没有再回退到配置表 `bubbleTexts`**。这意味着：

- 运营想"圣诞换文案"→ 后台改一次即可，**不用发版**
- 紧急隐藏某条文案 → 后台把 `status` 置 0，前端自动忽略
- 设计师新加文案 → 后台追加 `text_list` 一条即可

### 4.6. 4.6 公共 API

```ts
// 进入主页后调一次
GooseBehaviorTrigger.ins.evaluate(isNewUserFirstHome);

// 下蛋流程调（按结果）
GooseBehaviorTrigger.ins.triggerEggResult('silver');
GooseBehaviorTrigger.ins.triggerEggResult('gold');

// 后台配置更新时调（订阅 BazaarInfoUpdated 事件）
GooseBehaviorTrigger.ins.refreshCfg();
```

---

## 5. 表现层：GooseAnimController.ts

Controller 是"被动执行者" —— 它不知道也不关心为什么这个事件被 dispatch，只负责把它"演"出来。

### 5.1. 5.1 初始化：注入两个核心依赖

```ts
init(spineSlot: Node, presenter: ToastBubblePresenter): void {
  this.spineSlot = spineSlot;       // 白鹅 spine 节点
  this.toastPresenter = presenter;  // 气泡 Presenter
  this._registerAllEvents();        // 注册 19 个监听
  this._startIdleLoop();            // 启动兜底循环
}
```

由 `GooseHomeApp` 在主页 UI 搭建完成后调用一次。`dispose()` 在 `onDestroy` 调，把所有监听 off 掉、清除定时器 —— 严格防内存泄漏。

### 5.2. 5.2 事件处理：统一的 `_onAnimEvent`

```ts
private _onAnimEvent(scene, payload?) {
  const isIdle = IDLE_EVENTS.includes(scene.event);
  if (!isIdle) {
    this.isPlayingPriority = true;
    this._stopIdleLoop();      // 打断 idle
  }
  this._playSpineOrFallback(scene, payload);  // 1. 播动画
  if (scene.bubbleDuration > 0) this._showBubble(text, scene.bubbleEmoji);  // 2. 弹气泡
  if (!isIdle) {
    setTimeout(() => {
      if (this.currentScene === scene) {     // 关键：guard 防覆盖
        this.isPlayingPriority = false;
        this._startIdleLoop();
      }
    }, recoveryDelay);
  }
}
```

**几个设计点**：

1. **优先级动画 vs idle 互斥**：业务态用 `isPlayingPriority` 标志位屏蔽 idle 定时器
2. **guard 防覆盖**：`this.currentScene === scene` 这个判断很关键 —— 如果在 10s 恢复期内又来了一个高优先级事件，恢复定时器会因 scene 不匹配而无效
3. **恢复时间分两档**：
   - `spineLoop: true`（循环动画如 Resting）→ 10s 后恢复 idle
   - `spineLoop: false`（单次动画）→ 等气泡消失后 +1s，至少 3s

### 5.3. 5.3 降级策略：spine 资源没到位时

```ts
private _playSpineOrFallback(scene, payload?) {
  if (scene.spineAnim && skeleton) {
    try {
      skeleton.setAnimation(0, scene.spineAnim, scene.spineLoop);
    } catch (e) {
      this._showFallbackToast(scene, payload);   // try 失败 → 降级
    }
  } else {
    this._showFallbackToast(scene, payload);     // 没配 → 降级
  }
}
```

降级形式是一段**带 payload 关键值的 toast 文本**：

```
🦢 [等待喂食] 负向/饥饿 | 坐姿 | 饱食45% | 鹅粮15g
```

业务联调阶段用这种"伪动画"快速验证：触发时机对不对、payload 传没传对、场景名选没选错 —— 都能在控制台/真机一目了然。**等设计师给完 spine 资源，填一下 `spineAnim` 字段就自动切到真动画，零代码改动。**

### 5.4. 5.4 idle 兜底循环：让鹅"永远有事干"

```ts
const IDLE_EVENTS = [
  GooseAnimEventName.IdleWalk,
  GooseAnimEventName.IdleGroom,
  GooseAnimEventName.IdleSpin,
  GooseAnimEventName.IdleMeditate,
  GooseAnimEventName.IdleMirror,
];
const IDLE_BUBBLE_INTERVAL = 60;   // 60s 弹一次 idle 气泡
const IDLE_SWITCH_INTERVAL = 30;   // 30s 换一种 idle 动作
```

兜底循环的存在感很强：

- **动画不重样**：5 种 idle 行为随机轮换，每 30s 切换
- **气泡不冷场**：每 60s 随机弹一句"发呆"类文案，让鹅看起来"有在思考"
- **不抢戏**：只要 `isPlayingPriority = true`，定时器就空跑不触发

这是系统"活物感"的来源 —— 即便玩家什么都不做，鹅也是一直在动的。

### 5.5. 5.5 占位符替换：动态文案

需求里有一条："你已经 {N} 天没来了"。Controller 做简单的字符串替换：

```ts
if (payload?.absentDays && text.includes('{N}')) {
  text = text.replace('{N}', String(payload.absentDays));
}
```

未来要加更多占位符（比如 `{eggCount}` 颗蛋）只需扩展这一处。

---

## 6. 事件链路的完整时序

下面用"用户首次进入游戏 + 喂满下蛋"两个例子把全链路走一遍。

### 6.1. 6.1 进入主页（自动评估）

```
GooseHomeApp 启动
  └─ BootService.run
       └─ onLoad 完成
            └─ GooseHomeApp._buildMainHome
                 └─ toastPresenter.buildBubblesOn(spineSlot)
                 └─ gooseAnimController.init(spineSlot, presenter)
                      └─ 注册 19 个事件监听
                      └─ 启动 idle 循环 (立即播一个 IdleWalk)
                 └─ GooseBehaviorTrigger.ins.evaluate(true /* 新用户 */)
                      ├─ 收集 ctx (feedPercent=0, foodAmount=0, absentDays=-1 ...)
                      ├─ _matchCondition 按优先级链走
                      │    └─ 命中 NEW_USER_FIRST_HOME
                      ├─ _dispatch 查 CONDITION_TO_EVENT → 'goose-anim:first-meet'
                      └─ oops.message.dispatch(FirstMeet, { _behaviorTexts? })
                           └─ GooseAnimController._onAnimEvent(FirstMeet scene)
                                ├─ isPlayingPriority = true
                                ├─ _playSpineOrFallback → setAnimation('welcome')
                                └─ setTimeout(10s) → 恢复 idle
```

### 6.2. 6.2 喂满下蛋（业务主动 dispatch + 自动评估）

```
玩家点"喂鹅粮"按钮
  └─ GooseHomeApp.handleFeed
       ├─ PlayerService.reload() (后端扣鹅粮、加饱食度)
       ├─ GooseService.feed() (本地玩法表现)
       └─ oops.message.dispatch(GooseAnimEventName.Feed, { foodAmount: 10 })
            └─ GooseAnimController._onAnimEvent(Feed scene)
                 ├─ isPlayingPriority = true
                 ├─ setAnimation('eat')        ← 即时反馈
                 └─ 3s 后恢复 idle

后端返回"饱食度=100% 触发下蛋"
  └─ ... (下蛋流程)
       ├─ 播放 LayEgg 动画 (走 GooseAnimEvent)
       ├─ 后端返回蛋类型='gold'
       └─ GooseBehaviorTrigger.ins.triggerEggResult('gold')
            └─ _dispatch → 'goose-anim:egg-gold'
                 └─ GooseAnimController._onAnimEvent(EggGold scene)
                      └─ setAnimation('layeggs_glod') + 🏆 气泡
```

---

## 7. 关键设计原则总结

### 7.1. 7.1 解耦三层，职责清晰

| 层 | 角色 | 不应做的事 |
|----|------|------------|
| 业务 | 调 dispatch | 不 import Controller、不直接播动画 |
| 决策 | 选场景+文案 | 不接触 spine、不操作 View |
| 表现 | 播放+气泡 | 不写 if-else 条件、不查业务 Service |

### 7.2. 7.2 配置驱动，新场景零代码

- 加新事件：`GooseAnimEventName` 加一行 + `GOOSE_ANIM_SCENES` 加一条
- 改文案：改 `bubbleTexts` 数组
- 改文案（远程）：后台 `behavior_text_cfg` 加一条
- 设计师交 spine：填 `spineAnim` 字段

**所有"动效内容"都被数据化**，业务迭代不依赖动效开发排期。

### 7.3. 7.3 降级策略贯穿始终

| 缺失的资源 | 降级方案 |
|-----------|---------|
| spine 动画名（`spineAnim: null`） | Toast 文本 + payload 关键值 |
| spine 动画名配置错（setAnimation 抛错） | 同上 |
| 后台 behavior_text_cfg | 回退到配置表 `bubbleTexts` |
| 后端 `lastLoginTime` | `absentDays = -1`，跳过回归类条件 |
| spine 节点本身 | 静默吞掉（`_getSkeleton` 返回 null） |

**没有"因为某个资源没到位就崩"这种事**。这套系统可以在 spine 完全没接的情况下端到端跑起来，验证业务逻辑。

### 7.4. 7.4 远程配置可热更新

`BazaarInfoUpdated` 事件触发 → 业务方调 `GooseBehaviorTrigger.refreshCfg()` → 清缓存 → 重新加载 `behavior_text_cfg` → 下次 dispatch 用新文案。

运营改文案不需要走发版，不需要走客户端审核。

### 7.5. 7.5 优雅的资源回收

Controller 持有：spine 节点引用、Presenter 引用、两个 setInterval、19 个 mitt 监听。

`dispose()` 必须做 4 件事：
1. `_unregisterAllEvents()` 遍历 `_handlers` Map 全部 off
2. `_stopIdleLoop()` clearInterval 两个定时器
3. 把 `spineSlot` / `toastPresenter` / `currentScene` 全部置 null
4. 留个 dispose 日志方便排查

任何一个泄漏都会在"反复进出主页"场景下被放大。

---

## 8. 演进方向

这套系统目前只覆盖"主页鹅"的 18 个场景，可以低成本扩展到：

- **送礼 / 换装 / 升级**：加事件名 + 加配置表条目 + 业务方 dispatch
- **音效**：在 Controller 收到事件时同步 `oops.audio.playEffect(scene.audioName)`
- **多角色**：把 `GooseAnimController` 抽象成 `RoleAnimController`，scene 增加 `role` 字段
- **A/B Test**：在 `behavior_text_cfg` 增加 `ab_group` 维度，按玩家 ID 分流返回不同文案
- **频次控制**：除了"每日一次"还要"每小时至多 3 次"，把 `_hasTriggeredToday` 升级成 `Map<key, [date, count]>`

最后一点心得：**好的反馈系统不是堆动画，而是让"动作"和"语义"解耦** —— 同样的 `exciting` 动画能演"下银蛋的开心"也能演"满血复活的兴奋"，关键是气泡文案和触发时机的精准匹配。配置表 + 远程文案 + 决策器三者各司其职，正是这种解耦让 18 个场景的迭代可以并行展开。

----

## 9. 新版更新

### 9.1. 新旧对比

#### 9.1.1. 旧版架构（PRIORITY_CONDITIONS 单链 12 条件）

```
GooseBehaviorTrigger.evaluate()
  └─ 按优先级链匹配 1 个条件
     └─ dispatch GooseAnimEventName.*
        └─ GooseAnimController 查 GOOSE_ANIM_SCENES 表
           ├─ 持续性 (spineLoop=true): 不停循环
           └─ 单次 (spineLoop=false): 播完调 onSingleAnimEnd → 重新 evaluate
                 └─ 兜底: idle 池 5 个动画 (30s 切动画 + 60s 弹气泡)
```

#### 9.1.2. 新版三类行为分组

| 维度 | 常驻 | 随机 | 反馈 |
|---|---|---|---|
| 触发 | 状态满足即循环 | 状态满足 + 冷却到了才播一次 | 动作触发时播一次 |
| 中断 | 被新常驻/反馈打断 | 播完就停 | 播完触发 onSingleAnimEnd |
| 冷却 | 持续 loop | 全局 3min（可配置） | 无 |
| 场景数 | 3 (饿了/深夜/默认) | 12 (条件 6 + 兜底 6) | 4 (换装/下金/下银/喂食) |

#### 9.1.3. 关键差异点（需求 vs 现状）

| 项 | 旧 | 新 |
|---|---|---|
| 饿了条件 | `foodAmount≥10 && feedPercent∈[1,79]` | `feedPercent<30%`（只看饱食度） |
| 等待喂食 | （合并在饿里） | 拆出：`feedPercent∈[31,99%]` → 随机播 pthunger |
| 深夜彩蛋 | 02:00-05:00 | **22:00-05:00**（延长到晚上 10 点） |
| 蛋多催兑换 | `totalEggs≥10`（金+银） | **`金蛋数量≥1`**（只看金） |
| 默认状态 | idle 池 5 个循环 | `stand`（有呼吸感的站着，常驻）+ 兜底日常 5 个随机 |
| 下蛋后 | feedback 链 layeggs→exciting | feedback 链 layeggs → **随机**播 exciting（3min 冷却） |
| 回归 | welcome 单动画 | dance（1-7天）/ love（≥7天）两个区分 |
| 换装 | 无 | 新增 `change_Zone` 反馈动画 |
| 冷却 | 无（持续性靠同 scene 去重） | 全局 `RANDOM_COOLDOWN_MS=180_000`（可配） |


### 9.2. 改造方案

#### 9.2.1. 数据模型 — `GooseAnimEvent.ts` 加 `behaviorType` 字段

```ts
export type BehaviorType = 'persistent' | 'random' | 'feedback';

interface GooseAnimSceneConfig {
  // ... 现有字段
  behaviorType: BehaviorType;   // ← 新增
}
```

每个 scene 配置打标：
- **persistent**：饿了(hunger) / 深夜彩蛋(sleepyloop) / 默认状态(stand)
- **random**：新用户(welcome) / 每日回归(dance) / ≥7天回归(love) / 等待喂食(pthunger) / 蛋多催兑换(gift) / 收蛋后欢呼(exciting) / 5 个兜底日常
- **feedback**：换装(change_Zone) / 下金蛋(layeggs_gold) / 下银蛋(layeggs_silver) / 进食(eat)

#### 9.2.2. `GooseBehaviorTrigger` 重构 — evaluate 改"分类评估"

```ts
evaluate(isNewUserFirstHome: false): void {
  // 1) 反馈：完全由调用方 dispatch（triggerFeed/triggerEggResult/triggerLayEggMoment/triggerCostumeChange），
  //    不在 evaluate 链里。这里只检测是否有"反馈后续要跟的随机"
  //    （下金/下银蛋反馈播完后，Game._installLayEggWatcher 调 _scheduleLayEggAftermathRandom）

  // 2) 常驻组：3 个互斥条件，按优先级匹配 1 个
  const persistent = this._matchPersistent();
  if (persistent) {
    this._dispatch(persistent);
    return;
  }

  // 3) 随机组：3 分钟冷却，命中条件立即播一次（条件型 6 个），
  //    否则从兜底日常池 5 个里随机选 1 个
  const random = this._matchRandomWithCooldown();
  this._dispatch(random);
}
```

#### 9.2.3. 常驻匹配（_matchPersistent）

按图 1 优先级 1>2>3：

```ts
private _matchPersistent(): TriggerConditionType | null {
  // 1. 深夜彩蛋：22:00-05:00（只在当天首次）
  if (this._isLateNightHour(ctx.hour) && !this._hasTriggeredToday(STORAGE_KEY_LATE_NIGHT))
    return TRIGGER_CONDITION.LOCAL_TIME_22_05;

  // 2. 饿了：饱食<30%（持续循环，无每日去重）
  if (ctx.feedPercent < 30)
    return TRIGGER_CONDITION.PERSISTENT_HUNGRY;

  // 3. 默认状态：stand（有呼吸感的站着）
  return TRIGGER_CONDITION.PERSISTENT_STAND;
}
```

#### 9.2.4. 随机匹配（_matchRandomWithCooldown）— 核心 3min 冷却

```ts
private _matchRandomWithCooldown(ctx): TriggerConditionType {
  // 条件型随机（按图 1 优先级 1>6>11>12>12>5）：
  // ① 新用户
  // ② 等待喂食（饱食 31-99%）
  // ③ 蛋多催兑换（金蛋≥1）
  // ④ 每日回归（1-7 天）
  // ⑤ 久别重逢（≥7 天）
  // ⑥ 收蛋后欢呼（下蛋后 5 分钟内）
  const conditionals = [
    { cond: NEW_USER, gate: () => ctx.isNewUser },
    { cond: HUNGRY_WAIT, gate: () => ctx.feedPercent >= 31 && ctx.feedPercent <= 99 },
    { cond: EGG_GIFT, gate: () => ctx.goldBalance >= 1 },
    { cond: RETURN_1_7, gate: () => ctx.absentDays >= 1 && ctx.absentDays < 7 && !_triggeredToday(LAST_ENTER) },
    { cond: RETURN_GE_7, gate: () => ctx.absentDays >= 7 && !_triggeredToday(LAST_ENTER) },
    { cond: LAY_EGG_AFTER, gate: () => Date.now() - ctx.lastLayEggTs < 5*60_000 && !_cooldownHit(EXCITING) },
  ];
  for (const { cond, gate } of conditionals) {
    if (gate() && !this._isCooldown(cond)) {
      this._markCooldown(cond);
      return cond;
    }
  }

  // 兜底日常池（5 个里随机选 1 个不重复的）
  const idlePool = [WALK, WALK_REVERSE, MEDITATION, CLEAN, HULA];
  const candidate = idlePool.find(c => !this._isCooldown(c)) ?? pickRandom(idlePool);
  this._markCooldown(candidate);
  return candidate;
}
```

**冷却存储**：`Map<trigger_condition, lastTriggerMs>` 存内存，**不需要持久化**（跨会话重置可接受）。

#### 9.2.5. Controller 改造 — 按 behaviorType 分流

```ts
private _onAnimEvent(scene, payload) {
  // 同 scene 去重保留（防 dispatch 风暴）

  switch (scene.behaviorType) {
    case 'persistent':
      this._stopRandomTimer();
      this._playPersistentLoop(scene);    // 持续循环，无 onSingleAnimEnd
      break;
    case 'random':
      this._playOnceWithBubble(scene);    // 单次播，气泡显示 scene.bubbleDuration
      // 播完调 onSingleAnimEnd → 重新 evaluate → 兜底日常 3min 后再随机
      break;
    case 'feedback':
      this._playOnceWithBubble(scene);    // 单次播
      // 播完调 onSingleAnimEnd，且如果是下蛋反馈，触发"下蛋后随机"
      if (scene.event === LayEggGold || scene.event === LayEggSilver) {
        this._pendingRandomAfterLayEgg = true;
      }
      break;
  }
}
```

**关键时序 — "下蛋后"随机**：

```
Game._installLayEggWatcher 流程：
1. layEgg API 成功
2. triggerFeedback('lay-egg-gold')  // 播 layeggs_gold 5s
3. wait 1.5s
4. (此时 Controller onSingleAnimEnd 回调内 detect pendingRandomAfterLayEgg=true)
   → 调 _markCooldown(EXCITING) 重置（保证下蛋后立即能播）
   → dispatch EggExciting random
5. wait 2.5s
6. open LayEggDialog
```

或者更简单：把"下蛋后"作为独立 trigger 入口 `triggerLayEggRandomAftermath()`，由 Game 显式调，Controller 不感知 pending。

#### 9.2.6. Idle 循环彻底改造

旧版 `IDLE_SWITCH_INTERVAL=30s` 定时器 + `IDLE_BUBBLE_INTERVAL=60s` **全部删除**。
新版随机动画自带冷却，3min 一次由 evaluate 自然驱动，不再需要定时器。

#### 9.2.7. 兼容性

- 旧事件名（`GooseAnimEventName.Hungry/Resting/...`）保留，新增 `EventName.*` 命名空间（如 `LayEggRandom`）
- 旧 `PRIORITY_CONDITIONS` 数组保留为注释历史，**新逻辑全用 `_matchPersistent` + `_matchRandomWithCooldown`**
- 旧 `bubbleLoopTimer`（持续性场景周期重弹气泡）保留 — 常驻也用得上

#### 9.2.8. 配套改动

| 文件 | 改动 |
|---|---|
| `GooseAnimEvent.ts` | GOOSE_ANIM_SCENES 加 `behaviorType` 字段；新增 9 个 spine（change_Zone/pthunger/stand/gift/dance/love/meditation/clean/hula） |
| `GooseBehaviorTrigger.ts` | evaluate 重写为 `_matchPersistent` + `_matchRandomWithCooldown`；加 cooldown Map；删 PRIORITY_CONDITIONS |
| `GooseAnimController.ts` | `_onAnimEvent` 按 behaviorType 分流；删 `_startIdleLoop`/`_stopIdleLoop` 定时器；删 IDLE_SWITCH_INTERVAL/IDLE_BUBBLE_INTERVAL |
| `GooseHomeApp.ts` | 评估入口 `onSingleAnimEnd` 不变；但 onSingleAnimEnd 回调的 `evaluate(false)` 现在会走"随机"路径（兜底日常） |
| `Game.ts` | `_installLayEggWatcher` 在 layeggs 反馈播完后调 `GooseBehaviorTrigger.ins.triggerLayEggRandomAftermath()` |
| `CostumePage.ts` | 换装时调 `GooseBehaviorTrigger.ins.triggerCostumeChange()`（dispatch change_Zone） |
| `env.ts` | 加 `RANDOM_COOLDOWN_MS: 180_000`（可配） |

#### 9.2.9. 测试

新增单测覆盖：
- `_matchPersistent`：3 个条件互斥（深夜 > 饿了 > 默认）
- `_matchRandomWithCooldown`：条件型 6 个优先级 + 冷却生效 + 兜底日常池不重复
- 下蛋后随机：反馈播完 → 立即可播（冷却豁免）
- behaviorType 路由：Controller 对 3 类型的处理差异

---

## 10. 风险

1. **"默认状态" vs "兜底日常"的关系**：图里默认状态是 `stand`（常驻有呼吸感的站着），兜底日常是 5 个 idle 类动作。意思是"无任何持续性状态时，鹅一直 stand 呼吸着，每 3min 随机做一个动作"
2. **冷却粒度**：按**动画维度**冷却（pthunger 播了 → 3min 内不再播 pthunger）还是按**条件维度**冷却（等待喂食条件触发了 → 3min 内不再触发"等待喂食"动作）？我倾向**动画维度**（避免 walk 跟 walk_reverse 互锁）。

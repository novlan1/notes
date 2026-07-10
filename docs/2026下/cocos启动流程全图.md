## 一、总览时序（按网络请求发出顺序）

```
时间轴 ──────────────────────────────────────────────────────────────────────►

GooseHomeApp.onLoad()
 │
 ├─ Game.bootstrap(this.node)  ← 幂等入口
 │   │
 │   ├─ [0] _installGlobalErrorHandlers()        ⬛ 纯同步
 │   ├─ [0.05] initEarlyDetector()               ⬛ wx.onShow 注册
 │   ├─ [0.1] initApi()                          ⬛ t-comm 网络层初始化
 │   │
 │   ├─ [0.02] preloadGroupWhenIdle(AuthBoot)    🟡 CDN 预热 5 张图（fire-and-forget）
 │   │
 │   ├─ [0.1] ServerTime.sync()                  🌐 GetTs ×1         ← 网络 #1
 │   ├─        syncFangshuaParams()              ⬛ 同步（读本地 loginInfo）
 │   ├─        ServerTime.startAutoSync()        ⬛ 设 5min 定时器
 │   │
 │   ├─ [★] PlayerService.ins.bootstrap()        🌐 GetPlayer ×1     ← 网络 #2 (fire-and-forget!)
 │   │        └─ _doBootstrap() → getPlayerInfo({})
 │   │
 │   ├─ oops.gui.init(rootNode)                  ⬛ 同步
 │   ├─ oops.storage.setUser('guest')            ⬛ 同步
 │   ├─ _registerUIs()                           ⬛ 同步（lazy factory）
 │   ├─ GooseService.ins.init()                  ⬛ 同步（本地玩法 load）
 │   │
 │   ├─ BazaarService.ins.fetchActInfo()         🌐 GetLottActInfo    ← 网络 #3 (fire-and-forget)
 │   ├─ _initWxShare()                           ⬛ 同步
 │   │
 │   ├─ AccountService.configure({...})          ⬛ 同步（注入回调）
 │   │   └─ .handleAppOnLaunch()                 ⬛ 同步（QQ 插件检查）
 │   │
 │   ├─ _installLayEggWatcher()                  ⬛ 同步（事件监听）
 │   ├─ _installDailySignInWatcher()             ⬛ 同步（事件监听）
 │   ├─ _installReportWatcher()                  🌐 home_page_exposure ← 上报 #1 (fire-and-forget)
 │   ├─ _installAccountSwitchWatcher()           ⬛ 同步（事件监听）
 │   │
 │   ├─ Director.EVENT_BEFORE_SCENE_LOADING hook ⬛ 同步
 │   │
 │   └─ oops.markReady() → dispatch AppLaunch   ⬛ 同步
 │
 ├─ WidgetManagerPatch.apply()                   ⬛ 同步
 ├─ ResolutionGuard.install()                    ⬛ 同步
 │
 ├─ await buildScene()                           ⬛ 同步（纯代码 UI 构建）
 │   └─ oops.gui.init(this.node)                 ⬛ 重建 layer 节点
 │
 ├─ _subscribeServiceEvents()                    ⬛ 同步
 ├─ _onStateChanged(...)                         ⬛ 同步
 ├─ _refreshEggLabels / _refreshMarketRedPoint   ⬛ 同步（从 BazaarService 缓存读）
 │
 ├─ [★★] BazaarService.ins.fetchInfo()           🌐 QueryExchangeInfo  ← 网络 #4 (fire-and-forget)
 │
 ├─ schedule(showIdleReaction, 5)                ⬛ 同步
 │
 └─ BootService.ins.run(this.node)               ⬛ 同步
     ├─ dispatch BootStarted
     ├─ GoodsDetailService.ins.init()            ⬛ 同步
     └─ dispatch BootCompleted
          │
          └─► GooseHomeApp._onBootCompleted()
               └─ void _gateBootFlow()
                    │
                    ├─ [★★★] await PlayerService.ins.bootstrap()  ← 复用 bootstrapPromise，不再重复请求!
                    │         （改造前：isUnauthorized() 裸调 getPlayerInfo → 第 2 次 GetPlayer ❌）
                    │
                    └─ _stepAuth()
                         │
                    ┌────┴────────────────────────────────────┐
                    │  无 uid → open AuthPage                 │  有 uid → _stepAdopt()
                    │   └─ 用户点登录                          │   ├─ PetService.refresh()  🌐 GetPetInfo
                    │     └─ AccountService.switchToWx/QQ     │   ├─ 无宠 → 播领养视频 → AdoptPage
                    │       └─ code2WxLogin/code2QQLogin      │   │   └─ 用户取名提交
                    │         └─ GetPlayer (loginMp)          │   │     └─ _afterAdopt → _stepGuide
                    │           └─ bootstrap({force:true})    │   └─ 有宠 → _stepGuide()
                    │             └─ 再次 GetPlayer(register) │         ├─ 未完成 → open GuidePage
                    │               └─ onLoginSuccess         │         └─ 已完成 → _afterGuide()
                    │                 └─ dispatch AuthAccepted│
                    │                   └─ _afterAuth         │
                    │                     └─ _stepAdopt       │
                    └─────────────────────────────────────────┘
```

---

## 二、`_afterGuide()` 触发的后续请求

```
_afterGuide()
 ├─ gameLayer.active = true                      ⬛ 主页显示
 ├─ showToast / showBubble                       ⬛ 纯本地
 │
 ├─ _checkAndUpdateBumpEntry()                   🌐 GetBumpConfig (via MainHomeBuilder.checkBumpActivity)
 ├─ _startBumpBackgroundScanIfAuthorized()       🟡 蓝牙 BLE（非网络，仅授权用户）
 │
 ├─ TaskService.ins.fetchTaskList()              🌐 QueryDynaTaskByActId  ← 网络 #5
 │
 ├─ ResManager.preloadGroupWhenIdle(HomeIdleHigh) 🟡 CDN 预热（idle 窗口后）
 │
 ├─ GooseBehaviorTrigger.ins.evaluate()          ⬛ 纯本地（读缓存）
 │
 └─ _checkAndUnequipExpiredCostumes()
     └─ PetService.refresh()                     🌐 GetPetInfo ×1（去重）
```

---

## 三、冷启动首屏网络请求清单（按发出顺序）

| # | 接口 | 触发位置 | 阻塞? | 备注 |
|---|------|----------|-------|------|
| 1 | `GetTs` | ServerTime.sync() | ❌ fire-and-forget | 时间校准 |
| 2 | `GetPlayer` | PlayerService.bootstrap() | ❌ fire-and-forget（但 _gateBootFlow await 它） | 玩家数据 |
| 3 | `GetLottActInfo` | BazaarService.fetchActInfo() | ❌ | 活动配置（规则/分享/行为文案） |
| 4 | `QueryExchangeInfo` | BazaarService.fetchInfo() | ❌ | 金银蛋余额 + 商品列表 |
| 5 | `GetRainbowConfig` | rainbow-config（被 fetchActInfo 内部触发） | ❌ | 七彩石远程配置 |
| 6 | `CommReport` | ReportService 上报 | ❌ | 曝光/活跃 |
| 7 | `GetPetInfo` | _stepAdopt → PetService.refresh() | ✅ 门控链路 | 宠物数据 |
| 8 | `QueryDynaTaskByActId` | _afterGuide → TaskService.fetchTaskList() | ❌ | 任务列表（红点） |
| 9 | `GetBumpConfig` | _afterGuide → _checkAndUpdateBumpEntry() | ❌ | 碰一碰入口显隐 |
| 10 | `GetPetInfo` | _afterGuide → _checkAndUnequipExpiredCostumes() | ❌ | 装扮过期检查 |

---

## 四、关键路径（影响首屏白屏时长）

```
[关键路径] = 用户看到主页的最短等待

GooseHomeApp.onLoad
  → buildScene()                           ~50ms（纯代码 UI，无 IO）
  → BootService.run()                      ~0ms（同步 dispatch）
  → _gateBootFlow()
      → await PlayerService.bootstrap()    ~200-400ms ← 🔴 网络瓶颈 #1
  → _stepAuth()
      → (已登录用户) _stepAdopt()
          → await PetService.refresh()     ~100-200ms ← 🔴 网络瓶颈 #2
      → _stepGuide()
          → _afterGuide()
              → gameLayer.active = true    ← 🎉 主页可见！

总计关键路径 ≈ 50 + max(GetPlayer, PetInfo串行) ≈ 350-600ms
```

---

## 五、优化建议

### 🔴 P0 — 已修复

| 问题 | 原因 | 修复 |
|------|------|------|
| GetPlayer 重复请求 ×2 | `_gateBootFlow` 调 `isUnauthorized()`（裸调 getPlayerInfo）绕过了 `bootstrapPromise` 去重 | ✅ 改用 `await PlayerService.ins.bootstrap()` 复用去重 Promise |

### 🟡 P1 — 可优化

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **GetPlayer 与 GetPetInfo 串行** | 门控链路 350-600ms（两个接口各 150-300ms 串行） | 把 `PetService.refresh()` 并入 `_doBootstrap` 内部用 `Promise.all` 并行，门控路径缩短 ~150ms |
| 2 | **BazaarService.fetchInfo() 在 buildScene 内同步触发** | 占 L142 位置，实际不阻塞但被 buildScene 进度覆盖；与 `_afterGuide` 无关联 | 移到 `Game.bootstrap()` 与 `fetchActInfo` 并行，提前 ~50ms |
| 3 | **_afterGuide 内 PetService.refresh() 再次调用** | `_checkAndUnequipExpiredCostumes` 第 368 行再 refresh 一次，理论上 `_stepAdopt` 刚拉过就有缓存 | 加 `PetService._fetchPromise` 去重（已有），确认无冗余 |
| 4 | **GetTs ×2** | 截图显示两次 `GetTs?tstamp=...` 完全相同的请求 | `ServerTime.sync()` 被调两次？检查是否有 `startAutoSync` 立即触发了一次 |
| 5 | **CommReport ×3** | 截图显示 3 次 CommReport（home_exposure + active + dailySignIn） | 正常，但可合并为单次 batch 上报减少连接数 |

### 🟢 P2 — 可清理

| # | 代码 | 说明 |
|---|------|------|
| 1 | `GooseHomeApp L141-143` `console.log('1111')` / `console.log('222')` | 调试残留，应删除 |
| 2 | `GooseHomeApp L147` `console.log('_refreshFeedAmountLabel')` | 调试残留，应删除 |
| 3 | `BootService L49` `console.log('[BootService] dispatching BootCompleted')` | 调试残留，改 `oops.log.logBusiness` 或删除 |
| 4 | `GooseHomeApp._gateBootFlow` L195-198 注释掉的 PetService.refresh 代码块 | 已确认不需要，删除注释 |
| 5 | `Game._reportWatcher` L634 `console.log('[onLoginSuccess]')` | 调试残留，改 `oops.log.logBusiness` |

### 🔵 P3 — 架构向（后续迭代）

| # | 方向 | 收益 |
|---|------|------|
| 1 | `PlayerService.bootstrap()` 内部并行 GetPlayer + GetPetInfo + GetBumpConfig | 门控链路 600ms → 300ms |
| 2 | `BootService` 已退化为纯 dispatcher，可内联到 `GooseHomeApp.onLoad` 删掉一层抽象 | 代码简化 |
| 3 | `BazaarService.fetchActInfo()` + `fetchInfo()` 合并为单次初始化调用 | 减少调用点，避免遗漏 |
| 4 | 首屏关键路径请求走 `wx.request` 并发上限（微信最多 10 并发），当前无冲突，未来加请求需关注 | 预防 |

---

## 六、各 Service 启动职责速查

| Service | 启动时机 | 触发方式 | 做了什么 |
|---------|----------|----------|----------|
| `PlayerService` | Game.bootstrap L162 | `bootstrap()` fire-and-forget | GetPlayer → 落 state → dispatch PlayerLoaded + LoginSuccess |
| `GooseService` | Game.bootstrap L178 | `init()` 同步 | 从 oops.storage 加载本地玩法数据 |
| `BazaarService` | Game.bootstrap L184 / GooseHomeApp L142 | `fetchActInfo()` + `fetchInfo()` | GetLottActInfo + QueryExchangeInfo |
| `BootService` | GooseHomeApp.onLoad L153 | `run(node)` 同步 | dispatch BootStarted + BootCompleted |
| `PetService` | _stepAdopt L233 | `refresh()` async | GetPetInfo → 落 pets → dispatch PetInfoLoaded |
| `TaskService` | _afterGuide L310 | `fetchTaskList()` async | QueryDynaTaskByActId → 落 list → dispatch TaskListUpdated |
| `BumpService` | _afterGuide L304 | `startBackgroundScan()` async | 蓝牙 BLE 广播+扫描（仅授权用户） |
| `CostumeSkinService` | _afterGuide L398 | `syncSavedKey()` 同步 | 装扮过期检查后同步本地 key |
| `AccountService` | Game.bootstrap L197 | `configure()` 同步 | 注入 QQ/微信切号回调 |
| `ServerTime` | Game.bootstrap L159 | `sync()` + `startAutoSync()` | GetTs → 校准时钟 |
| `ReportService` | Game.bootstrap L630 | `homePageExposure()` | 首屏曝光上报 |
| `GoodsDetailService` | BootService.run L48 | `init()` 同步 | 注册策略工厂 |

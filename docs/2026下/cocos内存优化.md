<!-- # 微信小游戏运行内存优化（2026-07-21） -->

## 1. 问题现象

用户反馈"多玩几次后运行内存不足"——反复进出碰一碰页面、集市等功能后，微信小游戏内存持续增长不释放，最终触发系统 OOM 或白屏。

## 2. 根因分析

通过全量代码审计，定位到 **5 类核心内存泄漏源**：

### 2.1. GPU 纹理泄漏（P0 - 最严重）

**文件**：`assets/scripts/core/Res.ts`

**问题**：`loadRemoteSpriteFrame` 每次调用都 `new Texture2D()` + `new SpriteFrame()`，即使同一张 CDN 图片。碰一碰页面每个气泡有 2-3 次 `loadRemoteSpriteFrame`（背景图 + 头像），反复进出页面后旧的 Texture2D 对象残留在 GPU 内存中。

**影响量化**：假设每次进碰一碰看到 5 个气泡 × 3 张图 = 15 张纹理（平均 200KB/张），进出 10 次 = 150 张 × 200KB = **30MB GPU 纹理泄漏**。

### 2.2. 节点/Tween 泄漏（P0）

**文件**：`assets/scripts/module/bump/view/BumpSelectPage.ts`

**问题**：
- `hide()` 只设 `node.active = false`，不销毁气泡子节点和停止 `repeatForever()` Tween
- 整个类**没有 `onDestroy()` 方法**——如果节点被直接 destroy，事件监听和定时器永远不被清理
- 每个气泡启动了 `tween(node).repeatForever().start()` 无限循环漂浮动画，hide 后 Tween 仍在跑

**影响**：每个气泡节点 ~50+ 个 cc.Node 子对象 + 闭包引用 + Texture 引用，hide 后全部残留。

### 2.3. Map/缓存无界增长（P1）

**文件**：`assets/scripts/module/bump/service/BumpService.ts`

**问题**：
- `_bgPendingDevices` Map：API 调用失败时 entry 永不删除，公共场所蓝牙设备多时持续增长
- `_nearbyPeerCache` Map：`getNearbyPeerCache()` 只过滤返回结果，**不从 Map 中删除过期条目**
- 没有容量上限

### 2.4. 定时器残留（P1）

**文件**：`BumpSelectPage.ts` / `GooseHomeApp.ts`

**问题**：
- BumpSelectPage 的 3 个定时器（`_searchingDotTimer` / `_broadcastTimer` / `_searchTimer`）只在 `hide()` 中清理，没有 `onDestroy()` 兜底
- GooseHomeApp 的 `schedule(showIdleReaction, 5)` 在 `onDestroy()` 中没有 `unscheduleAllCallbacks()`

### 2.5. 预加载资源永不释放（P2）

**文件**：`assets/scripts/core/ResManager.ts`

**问题**：预加载的 80+ 张 CDN 图只有"完成"标记，没有任何释放逻辑。低内存时无法主动回收。

---

## 3. 修复方案

### 3.1. Fix 1：CDN SpriteFrame 缓存（Res.ts）

```typescript
// 新增 _remoteSfCache: Map<string, SpriteFrame>
// loadRemoteSpriteFrame 命中缓存时直接复用，不再 new Texture2D
const cached = this._remoteSfCache.get(cacheKey);
if (cached && cached.isValid) return cached;

// 缓存上限 200 条，满时近似 LRU 淘汰最早 1/4
// 新增 releaseRemoteCache(prefix?) 手动释放接口
```

**收益**：同一张图多节点共享同一份 GPU 纹理，内存从 O(N×调用次数) 降到 O(N×唯一图片数)。

### 3.2. Fix 2：BumpSelectPage 生命周期修复

```typescript
// hide() 中新增：销毁所有气泡 + 停止 Tween + 清空 _peers
this._destroyAllBubbles();

// 新增 onDestroy() 兜底：
onDestroy(): void {
  this._unbindEvents();
  this._stopSearchTimeout();
  this._stopBroadcastCarousel();
  this._stopSearchingDots();
  this._destroyAllBubbles();
}

// _destroyAllBubbles：统一 stopAllByTarget + destroy + clear
private _destroyAllBubbles(): void {
  this._bubbleNodes.forEach((n) => {
    if (isValid(n)) {
      (tween as any).stopAllByTarget?.(n);
      n.destroy();
    }
  });
  this._bubbleNodes.clear();
  this._peers.length = 0;
}
```

**收益**：每次 hide 释放全部气泡节点 + GPU 纹理引用 + Tween 引用。下次 show 重建（成本低，CDN 图已被 SpriteFrame 缓存命中）。

### 3.3. Fix 3：BumpService Map 容量上限 + 惰性清理

```typescript
// _bgPendingDevices 上限 50 条
if (this._bgPendingDevices.size >= 50) { 淘汰最旧 10 条 }

// _nearbyPeerCache 上限 100 条
if (this._nearbyPeerCache.size >= 100) { 淘汰最旧 20 条 }

// getNearbyPeerCache 惰性删除过期条目
const expiredKeys: string[] = [];
this._nearbyPeerCache.forEach((entry, key) => {
  if (now - entry.lastSeenAt > ttl) expiredKeys.push(key);
});
for (const k of expiredKeys) this._nearbyPeerCache.delete(k);
```

### 3.4. Fix 4：GooseHomeApp 定时器兜底 + 低内存警告

```typescript
onDestroy() {
  this.unscheduleAllCallbacks(); // 兜底清理所有 schedule
  this._uninstallMemoryWarning();
}

// 注册微信 wx.onMemoryWarning 回调
private _installMemoryWarning(): void {
  wx.onMemoryWarning(() => {
    oops.res.releaseRemoteCache();          // 释放 CDN 图片缓存
    BumpService.ins.clearNearbyPeerCache();  // 清碰一碰设备缓存
  });
}
```

**收益**：系统发出低内存警告时主动释放可恢复的缓存，避免 OOM 被杀进程。

---

## 4. 变更文件

| 文件 | 改动 |
|------|------|
| `assets/scripts/core/Res.ts` | +58 行：SpriteFrame 缓存 + LRU 淘汰 + releaseRemoteCache API |
| `assets/scripts/module/bump/view/BumpSelectPage.ts` | +50 行：onDestroy 兜底 + hide 销毁气泡 + _destroyAllBubbles |
| `assets/scripts/module/bump/service/BumpService.ts` | +30 行：Map 容量上限 + 惰性过期清理 |
| `assets/scripts/GooseHomeApp.ts` | +34 行：unscheduleAllCallbacks + wx.onMemoryWarning |
| `assets/scripts/core/bluetooth/wx-adapter.ts` | +13 行：addService 重试（关联修复，非内存） |

## 5. 验证

- `pnpm test:unit`：54 passed / 2 failed（全 pre-existing：goose-behavior-trigger feed_lt_30）
- `read_lints`：0 新增 error（全部 pre-existing）
- 预期效果：反复进出碰一碰 10 次后内存增长从 ~30MB 降到 <5MB（SpriteFrame 缓存命中 + 节点即时销毁）

## 6. 设计原则

1. **共享 > 重建**：同一张 CDN 图的 SpriteFrame 全局共享，节点 destroy 不影响缓存
2. **hide = 释放节点，show = 重建**：对于"非常驻"页面（碰一碰），hide 时主动释放动态节点比 keep alive 更省内存
3. **容量有界**：所有 Map/缓存都必须有上限 + 淘汰策略，无界增长是微信小游戏内存杀手
4. **低内存降级**：利用 `wx.onMemoryWarning` 主动释放可恢复缓存，比被系统杀进程体验好
5. **onDestroy 是安全网**：即使 IUIView 模式主要依赖 show/hide，也必须有 onDestroy 兜底

## 7. 后续建议

1. **Bazaar/TaskListModal 等高频弹窗**：同样模式——hide 时销毁动态子节点
2. **ResManager 预加载策略**：考虑低内存时 reset 非活跃 PreloadGroup
3. **全局 SpriteFrame 缓存监控**：在 DebugEntry 添加 `oops.res.debugRemoteCacheSize()` 展示
4. **Texture 内存 profile**：用微信开发者工具的 Memory 面板验证修复效果

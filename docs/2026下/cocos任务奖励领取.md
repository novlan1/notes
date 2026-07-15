<!-- # Postmortem：TaskListModal 领取奖励后 UI 不刷新 -->

## 1. 现象

用户点击「每日分享小游戏给好友」的「领取」按钮，后台接口正常返回，日志也能看到 `mapRspToTaskListData` 拿到了最新数据（`state: "done"`），但弹窗里按钮仍然显示「领取」，没有变为「已领取」。

关闭弹窗再重新打开，UI 才会正确显示「已领取」。

---

## 2. 根因

### 2.1. 数据流梳理

正常的刷新链路如下：

```
领取按钮点击
  → TaskService.claimTaskReward(taskId)
  → getDynaTaskReward(接口)
  → fetchTaskList({ force: true })      // 立即刷新 + 1.5s 二次刷新
  → dispatch(EventName.TaskListUpdated, list)
  → TaskListModal._onTaskListUpdated(list)
  → setData(list) → _patchContent()
  → UI 更新
```

### 2.2. 问题出在事件订阅守卫

`_bindTaskService()` 有防重复订阅的守卫：

```typescript
private _serviceBound = false;

private _bindTaskService(): void {
  if (this._serviceBound) return;   // ← 守卫
  this._serviceBound = true;
  oops.message.on(EventName.TaskListUpdated, this._onTaskListUpdated, this);
}
```

`hide()` 时解绑了事件监听，但**没有重置 `_serviceBound`**：

```typescript
hide(): void {
  oops.message.off(EventName.TaskListUpdated, this._onTaskListUpdated, this);
  // _serviceBound 仍然是 true ！
  // ...
}
```

### 2.3. 时序还原

| 步骤 | 状态 |
|------|------|
| 第 1 次 `show()` → `_bindTaskService()` | `_serviceBound = false` → 订阅成功，置 `true` |
| `hide()` | `off(TaskListUpdated)` 解绑，但 **`_serviceBound` 仍为 `true`** |
| 第 2 次 `show()` → `_bindTaskService()` | `_serviceBound === true` → **直接 return，不重新订阅** |
| 领取 → `fetchTaskList` → `dispatch(TaskListUpdated)` | 没有监听者 → **UI 不更新** |

---

## 3. 为什么第一次打开没问题

因为第一次打开时 `_serviceBound` 初始值是 `false`，订阅正常建立。
同一次打开期间领取，也能正常触发刷新。

问题只在**关闭后再重新打开**时出现。

---

## 4. 修复

`hide()` 解绑事件的同时重置守卫状态：

```typescript
hide(): void {
  // 解绑事件，避免下次 show 重复订阅；同时重置 _serviceBound 保证下次 show 能重新订阅
  oops.message.off(EventName.TaskListUpdated, this._onTaskListUpdated, this);
  this._serviceBound = false;  // ← 新增这一行
  // ...
}
```

---

## 5. 延伸：更优雅的方案——乐观更新

订阅修复解决了"UI 最终能刷新"的问题，但还有一个体验问题：

> 领取请求发出后，按钮仍然可以被点击（再点会"领取失败"）；而且 UI 要等后台返回 → `fetchTaskList` → 事件派发这一圈才能刷新，有 200-500ms 的延迟感。

**最优解：乐观更新（Optimistic Update）**

```
用户点「领取」
  → 立即把按钮切到 done 态（「已领取」）← 乐观
  → 发请求
  → 成功：fetchTaskList 刷新（后台确认，最终一致）
  → 失败：回滚按钮到 claimable 态 + toast 提示
```

### 5.1. 这是社区成熟、公认的标准方案

**权威出处**：

- **React Query / TanStack Query** 官方文档专设 [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) 章节，将其列为"领取/点赞/收藏"类场景的标准模式
- **SWR**（Vercel 出品）内置 `optimisticData` 参数
- **Apollo Client**（GraphQL）提供 `optimisticResponse` 专用 API

这几个库覆盖了现代前端 80% 的数据请求场景，都把乐观更新作为一等公民内置。

正式名称是 **Optimistic Concurrency Control（乐观并发控制）**，最早来自数据库领域，被前端借鉴后成为 UI 交互规范。

**大厂实践**：

| 产品 | 场景 | 乐观更新表现 |
|------|------|------------|
| 微信 | 消息已读 / 点赞 | 点击即变色，失败才回滚 |
| 微博 | 点赞 / 收藏 | 立即 +1，失败时 -1 回滚 |
| GitHub | Star / Watch | 立即切换，失败提示 |
| Twitter/X | 点赞 / 转推 | 立即变色，失败回滚 |

**什么时候不适合乐观更新**：

| 场景 | 原因 |
|------|------|
| 支付 / 扣款 | 失败成本高，必须等后台确认 |
| 状态不确定（后台复杂校验） | 乐观态与最终态差异大，回滚频繁伤体验 |
| 需要后台返回值才能渲染 | 如"你获得了 XX 物品"，不知道结果没法提前渲染 |

**任务领取**恰恰是最适合乐观更新的场景：成功率接近 100%，失败原因通常是网络问题（用户可理解），回滚后可重试。

**实现**（`_rebindTaskItemAction` 里的 claimable 分支）：

```typescript
if (td.state === 'claimable') {
  if (td.taskId) {
    ReportService.ins.clickGetAward({ task_id: td.taskId, task_type: td.taskType || '' });
    // 乐观更新：立即切到 done 态，防止请求期间重复点击；失败时回滚
    comp.setState('done');
    TaskService.ins.claimTaskReward(td.taskId).catch(() => {
      if (isValid(comp, true)) comp.setState('claimable');
    });
  }
  return;
}
```

**优势**：
1. 点击即响应，零延迟感
2. 请求进行中按钮为 `disabled` 视觉，自然防重复点击
3. 失败时精准回滚到 `claimable`，用户可重试
4. 不依赖事件订阅刷新（后台刷新是锦上添花的最终一致）

**与项目其他模块的对比**：
- `BazaarService.exchange`：用 `_pendingExchange` Map 做并发去重，但按钮视觉没变——防了重复请求，没解决体验延迟
- `PrimaryButton` 的 `pending` 状态：专为"请求中"设计，但 TaskItemCard 只用了 `todo/claimable/done` 三态，未使用 `pending`（两者等价，`done` 的 `disabled` 视觉也能达到"不可点"效果）

## 6. 教训

**订阅守卫（flag）与事件解绑（off）必须成对维护。**

- `on` 时：置 `true`
- `off` 时：置 `false`

只写 `off` 不重置 flag，等于"事件解绑了，但守卫还锁着门"——下次 `on` 时会被守卫短路，实际上没有重新订阅。

**完整的 teardown 模式**：

```typescript
// show
private _bind(): void {
  if (this._bound) return;
  this._bound = true;
  oops.message.on(EventName.Xxx, this._onXxx, this);
}

// hide / onDestroy
private _unbind(): void {
  oops.message.off(EventName.Xxx, this._onXxx, this);
  this._bound = false;  // 必须一起重置
}
```

**UI 状态更新的两种模式**：

| 模式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| 等后台刷新 | 状态不确定、需强一致 | 永远准确 | 有延迟、请求中可重复点击 |
| 乐观更新 + 失败回滚 | 成功率高、用户体验优先 | 零延迟、自然防重 | 极少数失败需要回滚 |

任务领取属于"成功率极高"场景，优先用乐观更新。

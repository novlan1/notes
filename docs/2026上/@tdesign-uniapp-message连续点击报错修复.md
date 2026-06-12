# uniapp message 组件「连续点击就消失/无响应」修复说明

## 一、Bug 现象

连续点击触发 message 弹出时：
- 部分消息不到 1s 就消失（远早于 duration）
- 部分点击没反应
- 控制台无报错

## 二、根因

复用同一 message-item 的场景下（如 `single: true`，或同一容器复用 ref），组件中存在 **3 个 setTimeout 没有被正确清理**，导致旧定时器干扰新一轮展示：

| # | 定时器位置 | 用途 | 原代码缺陷 |
|---|-----------|------|-----------|
| 1 | `message-item.show` 中 `closeTimeoutContext` | duration 到期触发 hide | `resetData` 只把字段重置为 0，并未 `clearTimeout`，旧定时器仍在跑 |
| 2 | `message-item.hide` 中 `setTimeout(SHOW_DURATION)` | 400ms 后置 `visible=false` | 裸 setTimeout，没有句柄，无法清除 |
| 3 | `message.close` 中 `setTimeout(SHOW_DURATION)` | 400ms 后从 messageList 移除占位 | 裸 setTimeout，没有句柄，无法清除 |

新一轮 show 启动后，上述任一旧定时器到期都会把新消息「hide / visible=false / 占位移除」掉，造成闪退或无响应。

## 三、修复方案

围绕一个原则：**每个 setTimeout 都要有可被清除的句柄，并在下一轮 show 之前对称地清掉。**

### 1. `message-item.vue`

- `rawData` 增加 `hideTimeoutContext` 字段
- `hide()` 中把 `setTimeout` 句柄保存到 `hideTimeoutContext`
- `reset()` 中追加 `clearTimeout(hideTimeoutContext)`

→ 修复 #2

### 2. `message.vue`

- `created()` 中初始化 `removeMsgTimers = {}`，按 id 管理 close 的延迟移除句柄
- `close(id)` 用 `removeMsgTimers[id]` 替代裸 setTimeout，回调里 `delete` 自身
- `setMessage` 入口先 `clearTimeout(removeMsgTimers[id])` 取消同 id 的 pending 移除
- 复用分支（`setMessage` 的 else）和 `showMessageItem` 在 `resetData` 之前先调 `instance.reset()` 并把 `instance.onHide = null`

→ 修复 #1（通过显式 reset）和 #3（通过 map 管理）

## 四、对原有逻辑的影响

- **id 唯一的非复用场景**（每条消息独立组件实例）：新增的 clearTimeout 操作均为 no-op，行为完全等价
- **复用 instance 场景**：补齐了原本缺失的对称清理逻辑，时序正确
- 无 API 变更，无样式变更

## 五、变更文件

- `message-item.vue`：`rawData` / `hide` / `reset`
- `message.vue`：`created` / `setMessage` / `showMessageItem` / `close`

---

# 关于 `v-if="idx === 0"` 这段改动的解释

图片中红色（左）是改前，绿色（右）是改后。改动核心是：**给 v-for 里所有的 `<slot>` 转发都加了 `v-if="idx === 0"` 限制，只对第一条消息透传 slot。**

## 一、为什么要加这个限制？

### Vue 的 slot 机制限制

在 Vue 里，**父组件传进来的 slot 内容是「同一份 VNode」**，正常用法是只在子组件树里渲染**一次**。

而 message 容器的模板是这样的：

```vue
<t-message-item v-for="(item, idx) in messageList" :key="item.id">
  <template #icon>
    <slot name="icon" />   <!-- 这里把父组件的 icon slot 转发给每个 message-item -->
  </template>
  ...
</t-message-item>
```

当 `messageList` 里有多条消息时（连续点击调用 setMessage 会出现），`<slot name="icon" />` 会被渲染多次 —— 也就是**同一份 slot VNode 被复用到多个 message-item 实例**。

### 由此产生的两类问题

#### 1️⃣ 控制台警告 / 报错

- **`Duplicate slot name "icon" found`** —— 同一个父组件里出现多个同名 `<slot>` 转发节点
- **`Duplicate keys detected` / VNode 复用警告** —— slot 内的 DOM 节点带 key 时，多次复用会被 Vue 检测为重复 key
- **`Cannot read property xxx of null`** —— uni-app 在某些端（小程序、抖音）下 slot 节点引用被 hoisted，多实例同时引用同一节点会触发 null 异常

这就是你前面看到的"控制台报错"现象之一。

#### 2️⃣ 同名 slot 渲染异常

部分平台（尤其小程序端编译后）对一个父作用域内出现多个同名 slot 的处理是「最后一个生效」或「全部 fallback」，会出现 icon/content/link 渲染丢失或闪烁。

## 二、为什么是 `idx === 0` 而不是别的方案？

| 方案 | 评价 |
|------|------|
| ✅ **只在 `idx === 0` 渲染 slot** | 第一条消息拿到父级 slot 内容，后续消息不渲染 slot（它们只显示文本/icon prop 即可）。简单、零警告 |
| ❌ 直接删掉 slot 转发 | 会丢失 message 组件作为容器时父组件传 icon/content/link 的能力 |
| ❌ 用 `<slot v-bind="...">` 多份克隆 | Vue 本身不支持「克隆 slot VNode」，强行克隆会破坏 reactivity |
| ❌ 给每个 slot 用不同 name | 父组件不知道有几个 message，没法预先命名 |

**实际业务上**：message 的 icon/content/link slot 主要用于「单条消息高度自定义」的场景，连续多条同时存在时本就不合理（多条消息都长一样自定义内容没意义），所以**只让第一条吃到 slot 是符合直觉的取舍**。

## 三、和本轮 bug 修复的关系

这块改动**不是连续点击 bug 的主因**，但它解决了你当时观察到的：

> "控制台有报错"、"还有点警告，一起解决下"

中那部分**警告**——也就是 `Duplicate slot` / 同名 slot 之类的告警。修完之后控制台就只剩"消息消失"的功能 bug，从而更容易定位到真正的根因（定时器互踩）。

## 四、注释也说明了这一点

```vue
<!-- slot 仅透传给第一条消息，避免 v-for 中产生多个同名 slot 的警告 -->
```

注释直接点题：**避免 v-for 中产生多个同名 slot 的警告**。

## 总结

这是一处**附带的告警治理**，不影响功能：

- 触发条件：`messageList.length > 1`（连续点击/多条并存）
- 副作用：同名 slot 在 v-for 里被多次渲染 → Vue 警告 / 多端兼容异常
- 修复手段：`v-if="idx === 0"` 让 slot 转发只发生一次

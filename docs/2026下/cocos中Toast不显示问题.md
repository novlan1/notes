<!-- # Cocos 小游戏 Toast 不显示排查：不是层级问题，是父节点被隐藏了 -->

## 问题现象

在某页面中，昵称输入框为空时点击 OK 按钮，预期的 toast 提示"请输入 1~12 个字符的昵称"没有显示。

## 排查过程

### 1. 事件派发是否正常？

在 `AdoptPage.ts` 的 `_onAdopt()` 方法中，昵称为空时执行了：

```ts
oops.message.dispatch(EventName.ShowToast, `请输入 ${NICK_MIN}~${NICK_MAX} 个字符的昵称`);
```

`oops.message.dispatch` 是框架的事件总线，事件派发本身没有问题。

### 2. 事件监听是否正常？

在 `GooseHomeApp.ts` 中：

```ts
oops.message.on(EventName.ShowToast, this._onShowToast, this);
```

监听已注册，`_onShowToast` 也会被触发：

```ts
private _onShowToast = (msg: string) => {
    if (typeof msg === 'string' && msg) this.showToast(msg);
};
```

`showToast` 内部委托给了 `toastPresenter.showToast(text)`：

```ts
private showToast(text: string) {
    this.toastPresenter.showToast(text);
}
```

到这里链路都是通的——事件派发 → 监听 → toast 节点 `active = true`，全都执行了。

### 3. Toast 节点确实被激活了，为什么看不到？

关键在这里。`toastPresenter`（`ToastBubblePresenter`）管理的 toast 节点是挂在主页节点树 `gameLayer` 下面的。而在领养流程中，`gameLayer` 的初始状态是 `active = false`：

```ts
// _afterGuide 的最后一步才激活 gameLayer
private async _afterGuide() {
    oops.message.off(EventName.GuideFinished, this._afterGuide, this);
    if (this.gameLayer) this.gameLayer.active = true; // ← 这里才激活
    this.showToast('🦢 欢迎回到白鹅家园！');
    // ...
}
```

启动门控的流程顺序是：**授权页 → 领养页 → 引导页 → `_afterGuide()` → gameLayer.active = true**。领养页在引导页之前打开，此时 `gameLayer` 仍然是隐藏的。

所以结论是：toast 节点自身的 `active` 被设为了 `true`，但它的父节点 `gameLayer` 是 `active = false`，整棵子树不可见。

```
Canvas
├── gameLayer (active = false)  ← 这里隐藏了
│   ├── MainHome
│   ├── toastNode (active = true)  ← 白激活了，看不见
│   └── ...
├── System Layer
│   └── AdoptPage (active = true)  ← 当前可见
└── Tips Layer
    └── ToastTip  ← 这个层始终可用
```

## 根因

**不是 toast 层级太低，而是 toast 所在的父节点 `gameLayer` 在领养流程中被隐藏了。** 事件的发送、接收、toast 节点激活都正常，只是渲染被父节点挡住了。

## 修复方案

将 `_onShowToast` 中的 toast 实现从"主页级 toast"切换到"全局 ToastTip"。

`ToastTip` 将 toast 节点挂在独立的 `LayerType.Tips` 层，该层不受 `gameLayer` 显隐影响，在任何页面生命周期中都能正常渲染。

### 改动内容

**文件**：[GooseHomeApp.ts](/assets/scripts/GooseHomeApp.ts)

**1. 新增 import：**

```ts
import { ToastTip } from './core/render/ToastTip';
```

**2. 修改 `_onShowToast`：**

```diff
  private _onShowToast = (msg: string) => {
-   if (typeof msg === 'string' && msg) this.showToast(msg);
+   if (typeof msg === 'string' && msg) ToastTip.show(msg);
  };
```

## 经验总结

排查 Cocos Creator 中节点"不显示"的问题时，不要只看节点自身的 `active` 属性，还应该追溯整条父节点链。`node.active` 为 `true` 不代表节点可见——如果任意一个祖先节点 `active = false`，该节点都不会被渲染。

可以用 Cocos 编辑器的 **Node Tree** 面板快速检查：隐藏的节点及其子树会显示为灰色。

另外，对于全局轻提示（toast），应该始终挂在独立于业务页面树的专用层（如 `Tips` 层），避免被页面切换逻辑误伤。

## 涉及文件

- `AdoptPage.ts` — 领养页，昵称校验失败时派发 `ShowToast` 事件
- `GooseHomeApp.ts` — 主场景，监听 `ShowToast` 事件并桥接到 toast 组件
- `ToastTip.ts` — 全局 toast 组件，挂载在 `Tips` 层，不受页面显隐影响
- `ToastBubblePresenter.ts` — 主页 toast 组件，挂载在 `gameLayer` 下


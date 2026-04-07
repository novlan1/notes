# DCloud 插件市场验证码自动识别脚本

## 简介

一个油猴（Tampermonkey）用户脚本，配合本地 OCR 服务，实现 DCloud 插件市场（`ext.dcloud.net.cn`）验证码的**全自动识别、填入、提交和错误重试**。用户只需手动点击一次"下载插件并导入HBuilderX"，后续的验证码流程全部自动完成。

### 核心架构

```
油猴脚本（前端）  ←→  本地 OCR 服务（localhost:18099）
     ↓                        ↓
MutationObserver          ddddocr 识别引擎
监听 DOM 变化              图片 → 4位小写字母
```

### 自动化流程

```mermaid
flowchart TD
    A["用户手动点击<br/>下载插件并导入HBuilderX"] --> B[脚本记录用户行为]
    B --> C[验证码弹窗出现]
    C --> D[图片转 Base64]
    D --> E[调用本地 OCR 服务]
    E --> F{"识别结果有效?<br/>4位小写字母"}
    F -->|✅ 有效| G[自动填入输入框]
    G --> H[自动点击"提交"]
    H --> I{提交结果}
    I -->|成功 - 弹窗消失| J[释放锁 + 自动续点下载]
    J --> C
    I -->|失败 - 错误弹窗| K[自动点击"确认"]
    K --> L[自动换图重试]
    L --> D
    F -->|❌ 无效| M{重试 < 8次?}
    M -->|是| N[自动换图]
    N --> D
    M -->|否| O["停止自动提交<br/>填入结果供手动核实"]
```

---

## 迭代历程

### v2.0 — 基础版本

**起点**：已有一个能自动识别验证码并填入输入框的脚本，具备：
- 验证码图片转 Base64（canvas / fetch 两种方式）
- 调用本地 OCR 服务识别（`GM_xmlhttpRequest` 跨域请求）
- 识别结果格式校验（`/^[a-z]{4}$/`）
- 格式无效时自动换图重试（最多 5 次）
- Base64 面板展示 + 复制功能

### v3.0 — 自动点击下载 + 自动提交 + 拦截弹窗

**用户需求**：OCR 识别填入后，自动点击"提交"按钮；页面加载时自动点击"下载插件并导入HBuilderX"；拦截浏览器的 `hbuilderx://` 协议弹窗。

**新增**：
- `autoClickDownloadBtn()` — 页面加载后自动点击下载按钮
- `autoClickSubmitBtn()` — 识别成功后延迟 600ms 自动提交
- `interceptProtocolDialog()` — 覆盖 `document.createElement` 拦截 iframe 协议跳转

### v3.1 — 移除协议拦截

**问题**：覆盖 `document.createElement` 导致页面报 `TypeError: Cannot read properties of undefined (reading 'click')`，且浏览器原生协议弹窗（"要打开 HBuilderX 吗？"）JS 无法控制。

**修复**：删除整个 `interceptProtocolDialog()` 函数，协议弹窗由用户手动处理。

### v3.2 — 错误弹窗自动处理

**用户需求**：验证码错误时会弹出 Bootstrap 模态框（"请输入验证码!"），希望自动点击"确认"并重试。

**新增**：
- `observeErrorDialog()` — MutationObserver 监听 `.modal-dialog` 出现
- 检测弹窗内容包含"验证码/请输入/错误"等关键词
- 自动点击确认按钮 → 自动换图 → 重新 OCR（最多 5 次）

### v3.3 — 🔥 修复死循环

**问题**：两个独立的重试计数器（OCR 格式校验 5 次 + 错误弹窗 5 次）互不影响，形成 **5+5+5+5+...** 的无限循环。

**根因分析**：
```
OCR 识别无效 → 换图重试 5 次 → 耗尽后填入无效结果并提交
→ 错误弹窗 → 确认 → 换图重试 5 次 → 又填入并提交
→ 又弹错误弹窗 → ... 无限循环
```

**修复**：
- 统一为**一个全局重试计数器** `retryCount`，上限 `MAX_TOTAL_RETRY = 8`
- OCR 重试耗尽后**只填入不提交**，切断循环链
- 添加 `isProcessing` 全局处理锁，防止并发触发

### v3.4 — 移除自动下载

**用户需求**：不希望页面加载时自动点击下载按钮，改为手动触发。

**修复**：删除 `autoClickDownloadBtn()`、`observeDownloadBtn()` 及相关变量。

### v3.4.1 — 修复语法错误

**问题**：删除代码时两段注释被错误合并，`function observeErrorDialog()` 被吞进注释，导致 `SyntaxError`。

**修复**：恢复正确的函数声明。

### v3.5 — 🔥 修复竞态条件

**问题**：OCR 识别正确并填入后，在等待提交的 600ms 内（或提交后），验证码图片 `src` 可能变化，MutationObserver 触发新一轮 OCR，**覆盖了已正确填入的验证码**，导致永远提交错误。

**修复**：
- 新增 `isSubmitting` 提交等待锁 — 填入成功后立即上锁，阻止新的 OCR 处理
- MutationObserver 检测到 `src` 变化时，若 `isSubmitting` 为 true 则忽略
- `src` 变化增加 600ms 防抖
- 锁释放时机：错误弹窗出现 / 5 秒超时 / 手动换图

### v3.6 — 弹窗消失检测

**问题**：验证码正确提交成功后，弹窗直接消失（不弹错误弹窗），`isSubmitting` 锁只能等 5 秒超时释放，导致短时间内再次操作时 OCR 不触发。

**修复**：在 `observeErrorDialog` 中增加 `removedNodes` 监听，检测包含验证码元素的 DOM 被移除时立即释放所有锁。

### v3.7 — 用户触发后自动续点下载

**用户需求**：希望加回自动点击下载按钮的功能，但改为**跟随用户行为**：用户手动点击过一次后，后续自动持续点击；未点击过则不主动触发。

**新增**：
- `userClickedDownload` 标记 — 记录用户是否手动点击过下载按钮
- `observeDownloadBtn()` — 事件委托监听用户点击下载按钮
- `autoClickDownloadBtn()` — 查找并点击下载按钮
- 提交成功（弹窗消失）后，若用户曾点击过，延迟 1.5 秒自动续点

---

## 关键技术点

| 技术 | 用途 |
|------|------|
| `MutationObserver` | 监听验证码弹窗出现/消失、图片 src 变化、错误弹窗 |
| `GM_xmlhttpRequest` | 跨域调用本地 OCR 服务 |
| Canvas / Fetch | 图片转 Base64 |
| 原生 `HTMLInputElement.prototype.value` setter | 绕过框架限制填入输入框 |
| 全局状态锁（`isProcessing` / `isSubmitting`） | 防止竞态条件和并发冲突 |
| 统一重试计数器 | 防止死循环 |
| 防抖（`srcChangeTimer`） | 避免 src 频繁变化重复触发 |
| 用户行为跟踪（`userClickedDownload`） | 智能续点下载 |

# TDesign 小程序/UniApp Table 组件适配踩坑记录：从 mobile-vue 到跨端的 7 个问题与修复

## 前言

TDesign 的 Table 组件在 mobile-vue 版本中使用原生 `<table>` 元素实现，而在小程序和 UniApp 版本中，由于平台限制，改用 `<view>` + flex 布局模拟。这种底层布局方式的差异，导致了一系列在固定列、固定行、斑马纹等场景下的兼容性问题。

本文记录了在适配过程中遇到的 **7 个问题**，涵盖根因分析和修复方案。

---

## 一、布局差异：为什么小程序/UniApp 固定列需要 `tableContentWidth`？

### 问题描述

mobile-vue 版本中，只需要给列设置 `fixed: 'left'` 或 `fixed: 'right'`，表格就能自动产生横向滚动并固定列。但小程序/UniApp 版本中，必须额外传入 `table-content-width` 属性才能让固定列生效。

### 根因分析

| | mobile-vue | 小程序/UniApp |
|---|---|---|
| **布局方式** | 原生 `<table>` 元素 | `<view>` + flex 布局 |
| **列宽行为** | `<td>` 设置 `width` 后，table 自动撑开超出容器 | flex 子元素默认被压缩（`flex-shrink: 1`），不会超出容器 |
| **横向滚动** | 自动产生 | 必须给外层容器设置明确的 `width` 才能超出 |

原生 `<table>` 有天然的 `table-layout` 机制，当列总宽度超过容器宽度时，table 会自动撑开。而 flex 布局中，即使给每个 `<view>` 设置了 `width`，flex 容器也会将子元素压缩到容器宽度内。

### 修复方案

在 `table.vue` 和 `table.ts` 中，当有固定列且用户未手动指定 `tableContentWidth` 时，**自动根据所有列的 `width` 之和计算**：

```js
// 有固定列时，自动根据列宽之和计算 tableContentWidth
if (this.hasFixedColumn && this.columns && this.columns.length > 0) {
  const totalWidth = this.columns.reduce((sum, col) => {
    return sum + parseFloat(String(col.width || 80));
  }, 0);
  return `width: ${totalWidth}px`;
}
```

这样用户就不需要手动传入 `table-content-width` 了。

---

## 二、固定行 + 固定列：z-index 层级冲突导致文字重叠

### 问题描述

当表格同时启用固定行（`fixed-rows`）和固定列（`fixed: 'left'/'right'`）时，横向滚动会出现文字重叠——非固定行中的固定列单元格会覆盖固定行的内容。

### 根因分析

初始的 z-index 层级设置：
- 固定列单元格：`z-index: 30`
- 固定行：`z-index: 2`
- 固定表头：`z-index: 2`

固定行的 z-index（2）远低于固定列（30），导致横向滚动时，非固定行中的固定列单元格会"穿过"固定行显示在上方。

### 修复方案

重新设计 z-index 层级体系，经过多轮调整最终确定：

| 元素 | z-index | 说明 |
|------|---------|------|
| 固定列（左） | 30 | 基础层级 |
| 固定列（右） | 31 | 略高于左侧，确保右侧覆盖左侧 |
| 固定行（有固定列时） | 32 | 高于所有固定列 |
| 固定表头 | 33 | 最高层级，始终在最上方 |

```js
// 固定行的 z-index 需要高于固定列的 z-index
const fixedRowZIndex = hasFixedColumn ? 32 : 2;
rowStyle = `position: sticky; top: ${topOffset}px; z-index: ${fixedRowZIndex};`;
```

> **踩坑点**：第一轮修复时将固定行设为 31，但忽略了右侧固定列的 z-index 也是 31，导致仍然冲突。第二轮才发现需要提升到 32。

---

## 三、固定行位置错误：第一行固定到了表头位置

### 问题描述

设置 `fixed-rows="[1, 2]"` 后，第一行数据会 sticky 到滚动容器的最顶部（`top: 0`），与表头重叠。而 mobile-vue 中，第一行数据会固定在表头下方。

### 根因分析

原始代码中，固定顶部行的 `top` 值直接从 `0` 开始计算：

```js
rowStyle = `position: sticky; top: ${rowIndex * 41}px; z-index: 2;`;
```

第一行（`rowIndex = 0`）的 `top` 就是 `0px`，和表头的 `top: 0` 完全重叠。

### 修复方案

固定顶部行的 `top` 值需要加上表头的高度偏移：

```js
// 表头高度（固定顶部行需要偏移表头高度）
const headerHeight = (showHeader && (maxHeight || height)) ? 41 : 0;

// top 值 = 表头高度 + 前面固定行的累计高度
rowStyle = `position: sticky; top: ${headerHeight + rowIndex * 41}px; z-index: ${fixedRowZIndex};`;
```

后续通过 `nextTick` 中的 DOM 测量进一步精确计算实际高度。

---

## 四、滚动时文字穿透：固定行/固定列背景色缺失

### 问题描述

纵向滚动时，下方的数据行文字会"穿透"固定行显示出来；横向滚动时，非固定列的文字也会"穿透"固定列。

### 根因分析

固定行虽然设置了 `position: sticky`，但其内部的 `__td` 单元格没有设置背景色。CSS 中 `background-color` 默认是 `transparent`，所以滚动时下方内容会透过来。

固定列最初使用了 `background-color: inherit`，但父元素 `__tr` 本身也没有设置背景色，所以继承的仍然是透明色。

### 修复方案

为固定行和固定列的所有单元格显式设置不透明的背景色：

```less
// 固定行
&__row--fixed-top,
&__row--fixed-bottom {
  background-color: @bg-color-container;
  > .@{table-prefix}__td {
    background-color: @bg-color-container;
  }
  // 固定行中的固定列单元格也需要背景色
  > .@{table-prefix}__cell--fixed-left,
  > .@{table-prefix}__cell--fixed-right {
    background-color: @bg-color-container;
  }
}

// 固定列
&--column-fixed {
  .@{table-prefix}__cell--fixed-left,
  .@{table-prefix}__cell--fixed-right {
    background-color: @bg-color-container; // 从 inherit 改为显式值
  }
}
```

---

## 五、表头颜色不贯穿：固定列覆盖了表头背景色

### 问题描述

固定表头的背景色是灰色（`@bg-color-secondarycontainer`），但当列同时设置了 `fixed` 时，固定列的白色背景（`@bg-color-container`）会覆盖表头的灰色背景，导致表头颜色不一致。

### 根因分析

CSS 选择器优先级问题：

```less
// 表头中设置灰色背景
&__header--fixed .@{table-prefix}__cell--fixed-right {
  background-color: @bg-color-secondarycontainer; // 2个类选择器
}

// 固定列中设置白色背景（在文件中排在后面）
&--column-fixed .@{table-prefix}__cell--fixed-right {
  background-color: @bg-color-container; // 2个类选择器
}
```

两者优先级相同，但 `&--column-fixed` 在 CSS 文件中排在后面，后声明的会覆盖前面的。

### 修复方案

将表头固定列的灰色背景设置移到 `&--column-fixed` 内部，利用嵌套选择器提高优先级：

```less
&--column-fixed {
  // ...
  // 放在 column-fixed 内部确保优先级更高
  .@{table-prefix}__header--fixed {
    .@{table-prefix}__cell--fixed-left,
    .@{table-prefix}__cell--fixed-right {
      background-color: @bg-color-secondarycontainer;
    }
  }
}
```

---

## 六、右侧固定列缺少边框

### 问题描述

mobile-vue 版本中，右侧固定列始终有一条左边框作为视觉分隔线，但小程序/UniApp 版本没有。

### 修复方案

在 `&--column-fixed` 中为右侧固定列的第一个单元格添加始终显示的左边框：

```less
// 右侧固定列始终显示左边框（同步 mobile-vue）
.@{table-prefix}__cell--fixed-right-first {
  border-left: @table-fixed-cell-border-light;
}
```

---

## 七、斑马纹首行颜色不一致

### 问题描述

mobile-vue 中斑马纹的第一行数据（非表头）是灰色的，但小程序/UniApp 中第一行是白色的。

### 根因分析

这是整个适配过程中最隐蔽的一个问题，根因在于 **DOM 结构差异导致 `nth-child` 计数起点不同**。

**mobile-vue** 使用原生 `<table>` 标签：

```html
<table>
  <thead><tr>表头</tr></thead>     <!-- 整个 table 的第1个 tr (odd) -->
  <tbody>
    <tr>第1行数据</tr>              <!-- 整个 table 的第2个 tr (even) -->
    <tr>第2行数据</tr>              <!-- 整个 table 的第3个 tr (odd) -->
  </tbody>
</table>
```

mobile-vue 的斑马纹规则：
- **无固定表头时**：`tbody tr:nth-of-type(odd)` → 第1行灰色 ✅
- **有固定表头时**：`tbody tr:nth-of-type(even)` → 因为 `<thead>` 的 `<tr>` 占了 odd 位置，`<tbody>` 第1个 `<tr>` 在整个 table 中是 even → 第1行灰色 ✅

**小程序/UniApp** 使用 flex 布局，表头和数据行在**不同的容器**中：

```html
<view class="__header">表头</view>
<view class="__body">
  <view class="__tr">第1行数据</view>  <!-- __body 中的第1个 (odd) -->
  <view class="__tr">第2行数据</view>  <!-- __body 中的第2个 (even) -->
</view>
```

由于表头在独立的 `__header` 容器中，`__body` 中的 `__tr:nth-child` 从 1 开始独立计数，不受表头影响。因此：
- **无固定表头时**：`__tr:nth-child(odd)` → 第1行灰色 ✅
- **有固定表头时**：`__tr:nth-child(even)` → 第2行灰色 ❌

### 修复方案

由于小程序/UniApp 中表头和数据行在不同容器中，**无论是否有固定表头，都统一用 `odd` 着色**：

```less
// 斑马纹 — 统一用 odd 着色
&--striped {
  .@{table-prefix}__tr:nth-child(odd) {
    background-color: @table-stripe-bg-color;
    .@{table-prefix}__cell--fixed-left,
    .@{table-prefix}__cell--fixed-right {
      background-color: @table-stripe-bg-color;
    }
  }
}
```

同时修复固定行的斑马纹规则，也从 `even` 改为 `odd`。

---

## 修改文件汇总

| 文件 | 修改内容 |
|------|---------|
| `uniapp-components/table/table.vue` | 自动计算 `tableContentWidth`；固定行 `top` 值加上表头高度偏移；固定行 z-index 提升 |
| `components/table/table.ts` | 同上（小程序版） |
| `uniapp-components/table/table.less` | z-index 层级体系重建；固定行/固定列背景色；表头固定列优先级；右侧固定列边框；斑马纹 `odd` 统一 |
| `components/table/table.less` | 同上（小程序版） |

## 总结

从 mobile-vue 到小程序/UniApp 的 Table 组件适配，核心挑战在于**原生 `<table>` 元素与 flex 布局的根本差异**：

1. **布局机制不同**：`<table>` 自动撑开，flex 需要手动设置宽度
2. **DOM 结构不同**：`<thead>`/`<tbody>` 分离 vs 独立 `<view>` 容器，影响 `nth-child` 计数
3. **CSS 特性差异**：原生 table 的 `<td>` 天然支持多方向 sticky，flex 中需要额外处理 z-index 层级

这些差异看似微小，但在固定行、固定列、斑马纹等复杂场景组合下，会产生一系列连锁反应。关键是要理解底层布局机制的差异，而不是简单地"抄"mobile-vue 的 CSS 规则。

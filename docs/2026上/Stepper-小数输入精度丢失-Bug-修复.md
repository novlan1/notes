
<!-- # Skill 沉淀 -->

<!-- ## Stepper 小数输入精度丢失 Bug 修复 -->

### 📋 问题背景

**Issue**: [#4319](https://github.com/Tencent/tdesign-miniprogram/issues/4319)

**现象**：`t-stepper` 组件输入小数时，如果小数点后输入 `0`（如 `1.0`），会被直接格式化成没有小数点（变成 `1`）。

**涉及文件**：
- `packages/components/stepper/stepper.ts`（小程序原生版）
- `packages/uniapp-components/stepper/stepper.vue`（uniapp 版）

**涉及方法**：`handleInput`、`handleBlur`、`format`、`add`、`setValue`、`updateCurrentValue`

---

### 🔍 根因链路（6 层问题，逐层暴露）

> **核心教训**：数字 ↔ 字符串转换是精度丢失的根源，需要在整个数据流中追踪值的类型变化。修复一个点可能引入新问题，需要全场景验证。

#### 数据流总览

```
用户输入 → handleInput → filterIllegalChar → format → setValue → updateCurrentValue → 显示
按加减号 → add → setValue → format → updateCurrentValue → 显示
失焦     → handleBlur → filterIllegalChar → format → setValue → updateCurrentValue → 显示
```

#### 问题 ❶：handleInput 正则过度触发

**场景**：用户输入 `"1.0"`，被立即格式化成 `"1"`

**根因**：

```js
// 原代码
if (this.integer || /\.\d+/.test(formatted)) {
  this.setValue(formatted);
}
```

`/\.\d+/` 匹配 `"1.0"` 成功 → 触发 `setValue("1.0")` → `format` 中 `Number("1.0") = 1`，`getLen(1) = 0`，`toFixed(0) = "1"` → 小数点消失

**修复**：正则改为 `/\.\d*[1-9]/`，要求小数部分至少包含一个非零数字才触发 `setValue`

```js
if (this.integer || /\.\d*[1-9]/.test(formatted)) {
  this.setValue(formatted);
}
```

| 输入值 | 旧正则 `/\.\d+/` | 新正则 `/\.\d*[1-9]/` | 行为 |
|-------|----------|------------|------|
| `1.` | ❌ 不匹配 | ❌ 不匹配 | ✅ 保留，等待继续输入 |
| `1.0` | ✅ 匹配 → 被格式化为 `1` | ❌ 不匹配 | ✅ 保留，等待继续输入 |
| `1.00` | ✅ 匹配 → 被格式化为 `1` | ❌ 不匹配 | ✅ 保留，等待继续输入 |
| `1.05` | ✅ 匹配 | ✅ 匹配 | ✅ 正常格式化 |
| `1.5` | ✅ 匹配 | ✅ 匹配 | ✅ 正常格式化 |
| `5` | ❌ 不匹配 | ❌ 不匹配 | ✅ 不触发 setValue，blur 时统一处理 |

> **说明**：`integer=false` 且输入整数（如 `"5"`）时，正则不匹配，`setValue` 不会在 input 阶段调用。这是可接受的行为，因为 `handleBlur` 一定会调用 `setValue`，最终值和 change 事件不会丢失。无需额外加 `!formatted.includes('.')` 条件。

---

#### 问题 ❷：Vue 值回填失效

**场景**：`integer = true` 时，用户粘贴 `"3.5"` → 过滤后应显示 `"3"` 但 input 仍显示 `"3.5"`

**根因**：Vue 响应式系统中，`currentValue` 从 `3` 设回 `"3"` 时，Vue 认为值未变化，跳过 DOM 更新

**修复**：先清空再通过 `nextTick` 回填，强制触发视图更新

```js
const displayValue = this.integer ? newValue : formatted;
if (String(this.currentValue) === String(displayValue)) {
  this.updateCurrentValue('');
  nextTick().then(() => {
    this.updateCurrentValue(displayValue);
  });
} else {
  this.updateCurrentValue(displayValue);
}
```

> **注意**：小程序原生版不需要此修复，因为 `setData` 即使值相同也会强制更新视图。

---

#### 问题 ❸：format 中 getLen 的隐式类型转换

**场景**：blur 时 `"1.0"` 变成 `"1"`

**根因**：`format(value)` 中 `this.getLen(value)`，当 value 在 JS 运算中被隐式转为数字时，`Number("1.0") = 1`，`(1).toString() = "1"`，`getLen = 0`

```js
// 修复前
const len = Math.max(this.getLen(step), this.getLen(value));

// 修复后 —— 用 String(value) 确保字符串形式
const len = Math.max(this.getLen(step), this.getLen(String(value)));
```

同时 `handleBlur` 中需先 `filterIllegalChar` 再传给 `format`：

```js
// 修复前
handleBlur(e) {
  const { value: rawValue } = e.detail;
  const value = this.format(rawValue);
  ...
}

// 修复后
handleBlur(e) {
  const { value: rawValue } = e.detail;
  const formatted = this.filterIllegalChar(rawValue);
  const value = this.format(formatted);
  ...
}
```

---

#### 问题 ❹：add 方法返回数字丢失精度

**场景**：`currentValue = "3.0"`，按 `+` 号（step=1），结果显示 `4` 而非 `4.0`

**根因**：`add("3.0", 1)` 返回数字 `4`，`String(4) = "4"` 无小数位信息

```js
// 修复前
add(a, b) {
  const maxLen = Math.max(this.getLen(a), this.getLen(b));
  const base = 10 ** maxLen;
  return Math.round(a * base + b * base) / base; // 返回数字，丢失精度
}

// 修复后 —— 保留运算涉及的最大小数位数
add(a, b) {
  const maxLen = Math.max(this.getLen(a), this.getLen(b));
  const base = 10 ** maxLen;
  const result = Math.round(a * base + b * base) / base;
  return maxLen > 0 ? result.toFixed(maxLen) : result; // 返回字符串保留精度
}
```

---

#### 问题 ❺：setValue 中 Number() 转换丢失末尾0

**场景**：`format` 返回 `"4.0"`，但显示 `4`

**根因**：`setValue` 中 `Number("4.0") = 4`，然后用数字 `4` 更新显示值

```js
// 修复前
setValue(value) {
  const newValue = Number(this.format(value));
  this.updateCurrentValue(newValue); // Number("4.0") = 4 → 显示 4
}

// 修复后 —— 用字符串更新显示，数字仅用于 change 事件
setValue(value) {
  const formattedStr = this.format(value);      // "4.0"
  const newValue = Number(formattedStr);         // 4（用于 change 事件）
  this.updateCurrentValue(formattedStr);         // "4.0"（用于显示）
  if (this.preValue === newValue) return;
  this.preValue = newValue;
  this._trigger('change', { value: newValue });  // 对外传数字
}
```

---

#### 问题 ❻：updateCurrentValue 存储字符串导致模板渲染类型变化（仅小程序）

**场景**：修复问题❺后，`updateCurrentValue("88")` 存储字符串 `"88"`，模板渲染从 `value="{{88}}"` 变成 `value="88"`，导致单元测试快照不匹配

**根因**：问题❺的修复让 `setValue` 用 `formattedStr`（字符串）调用 `updateCurrentValue`，但小程序模板中 `value="{{88}}"` 和 `value="88"` 是不同的渲染结果——前者是数字绑定，后者是字符串

**修复**：在 `updateCurrentValue` 中做智能类型判断——当字符串转数字无信息丢失时用数字，否则保留字符串

```js
// 修复前（小程序版）
updateCurrentValue(value) {
  this.setData({ currentValue: value });
}

// 修复后
updateCurrentValue(value) {
  const numValue = Number(value);
  this.setData({
    // "88" → String(88)==="88" → 存数字 88 → value="{{88}}"
    // "1.0" → String(1)!=="1.0" → 存字符串 "1.0" → value="1.0"
    currentValue: String(numValue) === String(value) ? numValue : value,
  });
}
```

> **注意**：此问题仅影响小程序原生版。uniapp 版使用 Vue 的 `:value` 绑定，不区分数字和字符串的渲染差异，无需此修复。

---

### 📊 完整修复效果

| 步骤 | 修复前 | 修复后 |
|------|--------|--------|
| `add("3.0", 1)` | 返回 `4`（数字） | 返回 `"4.0"`（字符串） |
| `format("4.0")` → `getLen` | `getLen(4)` = 0 | `getLen(String("4.0"))` = 1 |
| `format` 返回 | `"4"` | `"4.0"` |
| `setValue` → 显示更新 | `Number("4.0")` = `4` | 直接用 `"4.0"` |
| **输入框显示** | **`4`** ❌ | **`4.0`** ✅ |

---

### 💡 通用经验总结

1. **数字↔字符串转换是精度丢失的核心原因**：`Number("1.0")=1`、`(1).toString()="1"`、`String(4)="4"` 这些隐式转换会在链路的每一环吃掉末尾的 `0`

2. **修一个点可能引入新 bug**：正则从 `/\.\d+/` → `/\.\d*[1-9]/` 修了末尾0的问题，却让整数输入不触发 `setValue`，必须全场景验证

3. **需要全链路追踪**：从 `handleInput` → `filterIllegalChar` → `format` → `setValue` → `add` → `updateCurrentValue`，每一步都可能是精度丢失的入口

4. **平台差异要注意**：
   - 小程序原生 `setData` 强制更新视图 vs Vue 响应式值相同时跳过更新
   - 小程序原生版和 uniapp 版的 API 差异（如 input type 绑定方式）

5. **显示值与数据值分离**：input 框的显示值应该用**字符串**（保留格式），对外 emit 的 change 事件值应该用**数字**（方便业务使用）

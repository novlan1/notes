## 分析结论

非 setup 的 `<script lang="ts">` 在 sourcemap 生成时会产生冲突。具体原因如下：

### 根本原因

当一个 `.vue` 文件使用 `<script lang="ts">`（非 setup）时，Vite 的处理链路是：

1. **`@vitejs/plugin-vue`** 先将 `.vue` 文件拆分为 template、script、style 三个虚拟模块
2. **template 部分**编译后会生成 render 函数，其 sourcemap 指向原始 `.vue` 文件
3. **script 部分**（`<script lang="ts">`）需要经过 **TypeScript 编译**，其 sourcemap 也指向原始 `.vue` 文件
4. 最终 rollup 在 `traceMappings()` 中合并 sourcemap 时，发现**同一个源文件（`index.vue`）对应了两份不同的 `sourcesContent`**——一份来自 template 的 transform，一份来自 script 的 TypeScript transform

关键代码在 rollup 的 `traceMappings()` 中（第 20113-20114 行）：

```js
else if (content != null && sourcesContent[sourceIndex] !== content) {
    return error(logConflictingSourcemapSources(filename));
}
```

当同一个 filename 被两个不同的 transform 链处理后，产生了不同的 `sourcesContent`，就会触发这个错误。

### 为什么 `<script setup lang="ts">` 不会报错？

`<script setup>` 的编译方式不同——setup script 会被 `@vitejs/plugin-vue` 在 SFC 编译阶段**一起处理**（template 和 script 合并编译），生成的是一个统一的 sourcemap，不会出现同一个源文件有多份不同 content 的情况。

### 为什么 pvp-next 不报错？

pvp-next 的 vue 文件全部使用的是 `<script>`（纯 JS，不带 `lang="ts"`），**不需要经过 TypeScript 编译这一步**，所以不会产生额外的 sourcemap transform 链，自然不会出现冲突。

### 对比总结

| 对比项 | val-match-next | pvp-next |
|--------|---------------|----------|
| script 类型 | `<script lang="ts">` (15个) + `<script setup lang="ts">` (41个) | `<script>` (纯 JS) |
| TS 编译 | 需要额外的 TS transform | 不需要 |
| sourcemap 冲突 | ✅ template + TS 两条链产生不同 content | ❌ 只有一条链 |

### 解决方案

有以下几种方式：

1. **方案一（最简单）**：在 `vite.config.ts` 中关闭 sourcemap
   ```ts
   buildOptions: { sourcemap: false }
   ```

2. **方案二（推荐，保留 sourcemap 功能）**：将报错的 `<script lang="ts">` 改为 `<script setup lang="ts">`，这样 SFC 编译器会统一处理 template 和 script 的 sourcemap


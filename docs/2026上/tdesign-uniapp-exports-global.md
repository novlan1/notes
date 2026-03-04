相关 issue： https://github.com/Tencent/tdesign-miniprogram/issues/4294。

---

## 1. 区别分析

### 1.1. 旧写法（简写）
```json
"./global": "./global.d.ts"
```

### 1.2. 新写法（条件导出）
```json
"./global": {
  "types": "./global.d.ts"
}
```

### 1.3. 为什么要改？

核心原因是**使用条件导出（Conditional Exports）来明确声明这个路径只导出类型定义**。

1. **语义更精确**：`"types"` 条件告诉 TypeScript 编译器，这个入口**只提供类型声明**，没有运行时代码。旧的简写方式没有区分"这是类型文件"还是"这是运行时文件"。

2. **TypeScript 的 `moduleResolution: "bundler"` / `"node16"` / `"nodenext"` 要求**：在较新的 `moduleResolution` 策略下，TypeScript 会按照 `exports` 中的条件匹配来解析模块。如果没有 `"types"` 条件，TS 可能会走 `"import"` 或 `"default"` 条件，导致找不到 `.d.ts` 文件或产生错误的解析。

3. **避免运行时误引用**：简写形式 `"./global": "./global.d.ts"` 意味着**任何**导入条件（`import`、`require`、`default`）都会解析到 `.d.ts` 文件。而 `.d.ts` 文件在运行时是不存在的（或不该被执行的），这可能导致打包工具（如 Webpack、Vite）尝试去加载一个类型声明文件，产生警告或错误。使用 `"types"` 条件后，只有 TypeScript 做类型检查时才会用到它，打包工具不会尝试加载它。

4. **符合 TypeScript 官方推荐**：TypeScript 4.7+ 的文档明确推荐在 `exports` 中使用 `"types"` 条件来声明类型入口，并且要求 **`"types"` 条件放在其他条件之前**。

### 1.4. 简单总结

| | 旧写法 | 新写法 |
|---|---|---|
| **语义** | 所有条件都解析到 `.d.ts` | 只有类型检查时解析到 `.d.ts` |
| **运行时** | 打包工具可能误加载 | 打包工具不会触及 |
| **TS 兼容性** | 旧 `moduleResolution` 可用 | 新 `moduleResolution` 策略下更可靠 |
| **推荐度** | TS 4.7 之前的做法 | TS 4.7+ 官方推荐 |


---------

既然已经有 exports global 了，还需要在 tsconfig.json 中配置吗？

这是一个很好的问题。即使 `package.json` 中已经配置了 `exports` 的 `"./global"` 条件导出，**在 `tsconfig.json` 中配置 `compilerOptions.types` 仍然是有必要的**，两者的作用不同：

## 2. 区别说明

### 2.1. `exports` 中的 `"./global"`

```json
"./global": {
  "types": "./global.d.ts"
}
```

这只是声明了 `@tdesign/uniapp/global` 这个**模块路径是可解析的**，即当你写：

```ts
import '@tdesign/uniapp/global';
```

TypeScript 能正确找到对应的 `.d.ts` 文件。但如果你**不写这行 import**，这个类型声明文件就不会生效。

### 2.2. `tsconfig.json` 中的 `compilerOptions.types`

```json
{
  "compilerOptions": {
    "types": ["@tdesign/uniapp/global"]
  }
}
```

这是告诉 TypeScript **自动加载**这个类型声明到全局作用域，**无需显式 import**。这对于全局组件类型声明（如 Vue 的 `GlobalComponents`）尤为重要。

## 3. 为什么全局组件提示需要这个配置？

TDesign 的 `global.d.ts` 通常是通过 `declare module 'vue'` 或 `declare module '@vue/runtime-core'` 来扩展 Vue 的全局组件类型：

```ts
declare module 'vue' {
  export interface GlobalComponents {
    TButton: typeof import('./components/button')['Button'];
    TInput: typeof import('./components/input')['Input'];
    // ...
  }
}
```

这种**模块增强（Module Augmentation）**要求该 `.d.ts` 文件被 TypeScript 编译器**实际加载**才能生效。而 `compilerOptions.types` 正是实现"自动加载"的方式。

## 4. 总结对比

| | `exports` 中的 `"./global"` | `tsconfig.json` 中的 `types` |
|---|---|---|
| **作用** | 声明模块路径可解析 | 自动加载类型到全局 |
| **是否需要 import** | 需要显式 import 才生效 | 不需要，自动生效 |
| **对全局组件提示的影响** | 仅提供路径映射 | **真正让全局类型声明生效** |

所以**这段文档是有必要的**。`exports` 解决的是"能不能找到"的问题，`tsconfig.json` 的 `types` 解决的是"自动不自动加载"的问题。用户如果不在 `tsconfig.json` 中配置，就无法在模板中获得 TDesign 组件的自动提示，除非他们在每个文件中都手动 `import '@tdesign/uniapp/global'`。


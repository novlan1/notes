## 1. isolatedModules

isolatedModules 是 TypeScript 配置中的一个重要选项，用于确保每个文件能够作为独立模块进行编译，不依赖其他模块的类型信息。以下是其核心含义和作用：

1. 基本定义

• 作用：当设置为 true 时，强制每个文件必须显式使用 import 或 export 语句，否则会被视为全局脚本文件而报错。这确保了文件在独立编译时（如通过 Babel 或 esbuild）的类型安全性和可移植性。

• 报错示例：若文件未包含模块化语句（如 export {}），会提示错误：

```
TS1208: Cannot compile under '--isolatedModules' because it is considered a global script file.。
```

2. 解决的问题

• Babel 兼容性：Babel 等工具在转译 TypeScript 时会移除类型，但无法分析跨文件的类型依赖。例如，若文件 b.ts 导出类型 Test 而未使用 export type，Babel 可能错误保留导出导致运行时错误。isolatedModules 强制使用 import/export type 明确类型依赖。

• 全局污染风险：未模块化的文件可能导致变量泄露到全局作用域，引发命名冲突。

3. 性能优化

• 构建效率：在 Angular 等框架中，启用 isolatedModules 可让打包工具（如 esbuild）直接处理 TypeScript 代码，跳过类型检查器，提升构建速度（如 Angular 18.2 实测构建时间减少 10%）。

• 枚举优化：打包工具可内联常量枚举（const enum），减少运行时开销。

4. 配置建议

• 推荐值：现代项目（尤其是使用 Babel 或 Vite 等工具时）建议设为 true。

• 关联配置：需配合 moduleResolution: "node" 或 "bundler"，并确保 target 和 module 为现代标准（如 esnext）。

5. 注意事项

• 全局声明文件：.d.ts 文件不受此限制，但普通 .ts 文件必须模块化。

• 显式类型导出：跨文件类型引用需使用 import type 或 export type 以避免运行时问题。

通过启用 isolatedModules，开发者可以更好地适配现代工具链，同时避免潜在的模块化问题和性能瓶颈。

## 2. verbatimModuleSyntax

verbatimModuleSyntax 是 TypeScript 5.0 引入的一个重要编译选项，用于精确控制模块导入/导出语句在编译输出中的保留行为。以下是其核心含义和作用：

1. 基本功能

• 原样保留模块语法：启用后（"verbatimModuleSyntax": true），TypeScript 会严格保留源代码中的模块语法结构，不再自动移除仅包含类型引用的导入（如 import type），确保输出代码与输入代码的模块结构一致。

• 显式类型标记：强制开发者使用 import type 或 export type 明确区分类型与值的导入/导出，避免传统编译中类型导入被意外移除的问题。

2. 解决的问题

• 构建工具兼容性：传统 TypeScript 编译会移除未用作值的类型导入，但像 Babel、Rolldown 等工具无法识别跨文件类型依赖，可能导致运行时错误。verbatimModuleSyntax 通过保留所有导入语句（包括类型导入）解决此问题。

• 副作用模块的保留：确保带有副作用的模块（如包含 console.log 的初始化代码）不会被错误移除，因为其导入语句会被完整保留。

3. 与旧选项的对比

• 替代 importsNotUsedAsValues：此选项已被废弃，verbatimModuleSyntax 提供了更清晰的语义。例如，旧选项的 "remove" 或 "preserve" 行为被统一为严格的原样保留逻辑。

• 与 isolatedModules 的关系：两者均用于模块安全，但 isolatedModules 确保文件独立编译，而 verbatimModuleSyntax 进一步控制语法保留细节。现代配置常同时启用它们。

4. 典型应用场景

• 现代构建工具链：与 Vite、esbuild 或 Rolldown 等工具配合时，需启用此选项以避免类型导入丢失。

• Node.js ESM 项目：原生 ESM 模块要求显式文件扩展名和精确的导入导出，verbatimModuleSyntax 能严格匹配此需求。

5. 配置示例

在 tsconfig.json 中启用：

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "module": "ESNext",
    "target": "es2022"
  }
}
```

此配置适用于现代前端或 Node.js 项目，尤其推荐与 "moduleResolution": "NodeNext" 或 "bundler" 搭配使用。

6. 注意事项

• 副作用代码：需确保无用的类型导入不会意外引入副作用模块，必要时通过代码分割或动态导入优化。

• 迁移成本：从旧选项切换时，需检查项目中所有类型导入是否已显式标记为 type。

通过启用 verbatimModuleSyntax，开发者可以更精准地控制模块系统的行为，提升代码的跨工具兼容性和运行时可靠性。

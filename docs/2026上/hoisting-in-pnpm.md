## pnpm 的 Hoisting（提升）

pnpm 的 **hoisting**（提升）是指将深层嵌套的依赖包"提升"到更高层级的 `node_modules` 目录中，使其能被更多包访问到的机制。

### 背景：pnpm 的严格隔离

pnpm 默认采用**严格的依赖隔离**策略：每个包只能访问自己在 `package.json` 中声明的依赖。这是通过符号链接（symlink）+ 硬链接实现的嵌套结构：

```
node_modules/
├── .pnpm/                          # 所有包的实际存储位置（扁平结构）
│   ├── @html-eslint+parser@0.24.1/
│   │   └── node_modules/
│   │       └── @html-eslint/parser  # 0.24.1 的实际文件
│   ├── @html-eslint+parser@0.59.0/
│   │   └── node_modules/
│   │       └── @html-eslint/parser  # 0.59.0 的实际文件
│   └── @tencent+eslint-config-light-vue3@1.0.14/
│       └── node_modules/
│           └── @html-eslint/
│               └── parser → ../../@html-eslint+parser@0.24.1/...  # 只能看到 0.24.1
└── @html-eslint/
    └── parser → .pnpm/@html-eslint+parser@0.59.0/...  # 根目录提升的是 0.59.0
```

### Hoisting 的含义

**Hoisting** 就是把某些包的符号链接放到根目录的 `node_modules/` 下，让所有包都能"看到"它。pnpm 有两种 hoisting 配置：

| 配置项 | 作用 | 默认值 |
|--------|------|--------|
| `hoist` | 将依赖提升到 `node_modules/.pnpm/node_modules/` 下（半公开） | `true` |
| `public-hoist-pattern` | 将依赖提升到根 `node_modules/` 下（完全公开） | `['*eslint*', '*prettier*']` |
| `shamefully-hoist` | 将**所有**依赖都提升到根目录（等同于 npm 的行为） | `false` |

### 和你遇到的问题的关系

在上一轮对话中，我们发现了这个问题：

```
# ESLint debug 输出：
Parser:  @html-eslint/parser@0.24.1   ← 从 @tencent/eslint-config-light-vue3 的上下文解析
Plugin:  @html-eslint/eslint-plugin@0.59.0  ← 被 hoist 到根目录，加载了你声明的高版本
```

这是因为：

1. **Plugin 被提升了** — pnpm 默认的 `public-hoist-pattern` 包含 `*eslint*`，所以 `@html-eslint/eslint-plugin@0.59.0` 被提升到了根 `node_modules/`，ESLint 加载 plugin 时找到了 0.59.0
2. **Parser 没被正确提升** — ESLint 加载 parser 时，是从 `@tencent/eslint-config-light-vue3/lib/html.js` 的路径上下文去 resolve `@html-eslint/parser` 的，pnpm 的隔离机制让它找到了 `@tencent/eslint-config-light-vue3` 自己依赖的 **0.24.1**，而不是你项目根目录声明的 0.59.0

### 总结

> **pnpm 的 hoisting = 把嵌套的依赖提升到更高层级，让更多包能访问到它。** 它是 pnpm 在"严格隔离"和"兼容性"之间的折中方案。你遇到的 ESLint 报错，正是因为 hoisting 机制导致 parser 和 plugin 被解析到了不同版本。

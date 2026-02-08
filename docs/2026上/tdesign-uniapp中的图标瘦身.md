## 1. 背景

随着 [tdesign-icons](https://tdesign.tencent.com/icons/) 图标的不断丰富，[@tdesign/uniapp](https://github.com/Tencent/tdesign-miniprogram/blob/develop/packages/uniapp-components/common/style/icons.less) 包的图标文件大小也不断变大。但是普通业务一般并不需要同时使用这么多图标，并且小程序等场景图标只能使用 `iconfont` 等，不支持动态加载，所以需要一种方式减包、瘦身。

## 2. 解决方案

不同于原生小程序，[@tdesign/uniapp](https://tdesign.tencent.com/uniapp/overview) 在上传前有构建一步，可以利用插件来减包。

可以使用[postcss-plugin-remove-selector](https://www.npmjs.com/package/@novlan/postcss-plugin-remove-selector?activeTab=readme) 来在构建时进行无用图标的删减。

点此查看[文档](https://www.npmjs.com/package/@novlan/postcss-plugin-remove-selector?activeTab=readme)。

## 3. 如何使用

安装

```bash
pnpm add @novlan/postcss-plugin-remove-selector -D
```

### 3.1. 简化模式（推荐）

通过 `mode` 指定预设，只需关注 `used`/`unused`，无需手动配置 `file` 和 `selectorPattern`：

```ts
import { defineConfig } from 'vite';
import { postcssPluginRemoveSelector } from '@novlan/postcss-plugin-remove-selector';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        postcssPluginRemoveSelector({
          mode: 'tdesign',
          used: ['home', 'chat', 'user', 'add', 'search', 'close'],
        }),
      ],
    },
  },
});
```

使用 `customUsed` / `customUnused` 可在预设基础上增量追加，不会覆盖预设中已有的列表：

```ts
postcssPluginRemoveSelector({
  mode: 'tdesign',
  // 在 tdesign 预设默认的 used 列表上，额外追加 'star' 和 'heart'
  customUsed: ['star', 'heart'],
  // 从结果中额外移除 'loading'
  customUnused: ['loading'],
})
```

### 3.2. 标准模式

通过 `list` 数组传入完整配置，适用于需要匹配多个文件的复杂场景：

```ts
import { defineConfig } from 'vite';
import { postcssPluginRemoveSelector } from '@novlan/postcss-plugin-remove-selector';
import {
  TDESIGN_ICON_REMOVE_SELECTOR
} from '@novlan/postcss-plugin-remove-selector/lib/tdesign-uniapp-icon';


export default defineConfig({
  css: {
    postcss: {
      plugins: [postcssPluginRemoveSelector(TDESIGN_ICON_REMOVE_SELECTOR)],
    },
  },
});
```

## 4. 类型

插件支持两种配置方式，传入 `SimpleOptions`（简化模式）或 `Options`（标准模式）均可。

### 4.1. SimpleOptions（简化模式）

| 属性 | 类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `'tdesign'` | 否 | 预设模式，设置后自动使用对应的 `file` 和 `selectorPattern` 默认值 |
| `file` | `RegExp \| string` | 否 | 文件匹配规则。使用 `mode` 时可省略 |
| `used` | `string[]` | 否 | 正在使用的图标名称列表，这些图标会被保留 |
| `unused` | `string[]` | 否 | 未使用的图标名称列表，这些图标会被移除 |
| `customUsed` | `string[]` | 否 | 增量追加到 `used` 列表（不覆盖预设或已有的 `used`） |
| `customUnused` | `string[]` | 否 | 增量追加到 `unused` 列表（不覆盖预设或已有的 `unused`） |
| `selectorPattern` | `RegExp` | 否 | 选择器匹配模式。使用 `mode` 时可省略 |
| `debug` | `boolean` | 否 | 是否开启调试模式 |

> `mode` 和 `file` 至少需要指定一个。当 `mode` 和 `file`/`selectorPattern` 同时指定时，`file`/`selectorPattern` 优先。

### 4.2. Options（标准模式）

| 属性 | 类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `list` | `FileConfig[]` | 是 | 配置列表 |
| `debug` | `boolean` | 否 | 是否开启调试模式 |

### 4.3. FileConfig

| 属性 | 类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `file` | `RegExp \| string` | 是 | 文件匹配规则，可以是字符串或正则表达式 |
| `used` | `string[]` | 否 | 正在使用的图标名称列表，这些图标会被保留 |
| `unused` | `string[]` | 否 | 未使用的图标名称列表，这些图标会被移除 |
| `customUsed` | `string[]` | 否 | 增量追加到 `used` 列表（不覆盖已有的 `used`） |
| `customUnused` | `string[]` | 否 | 增量追加到 `unused` 列表（不覆盖已有的 `unused`） |
| `selectorPattern` | `RegExp` | 否 | 选择器匹配模式，只处理匹配该模式的选择器 |

### 4.4. 内置预设

| mode | 说明 | 默认 file | 默认 selectorPattern |
| --- | --- | --- | --- |
| `tdesign` | TDesign UniApp 图标减包 | `/[@/]tdesign[/]uniapp[/]dist[/]icon[/]icon\.[css\|vue]/` | `/^\.t-icon-[\w-]+:before$/` |

## 5. 文档

1. [文档](https://www.npmjs.com/package/@novlan/postcss-plugin-remove-selector?activeTab=readme)
2. [更新日志](https://novlan1.github.io/plugins/changelog/postcss-plugin-remove-selector.html)
3. [示例项目](https://github.com/TDesignOteam/tdesign-uniapp-starter)

## 6. 效果

以 [tdesign-uniapp-starter](https://github.com/TDesignOteam/tdesign-uniapp-starter) 为例，使用此插件，可使小程序大小减少`138KB`，约`95.8%`。

使用前：

<img src="https://cdn.uwayfly.com/article/2026/2/own_mike_4w2yXDz3tMcaJ2nx.png" width="900">

使用后：

<img src="https://cdn.uwayfly.com/article/2026/2/own_mike_dsdB5TmAaedmkPr5.png" width="900">



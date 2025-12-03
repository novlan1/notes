
### 1. token 核心

> 颜色色板 => 全局语义token => 组件token

### 2. WXS

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_62aJQAxB8dp3b6j7.png" width="600" />

### 3. artwork

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_YerJ44De845RSASw.png" width="600" />

### 4. hard

The hard road might not lead to glory But the easy road definitely won't.

### 5. 类型声明

packages.json 中给每个组件声明类型，具体是在 exports 字段中：

```json
"exports": {
  "./*": "./*",
  "./navbar/navbar.vue": {
    "types": "./types/navbar.d.ts",
    "import": "./navbar/navbar.vue",
    "default": "./navbar/navbar.vue"
  },
  // ...
}
```

注意这里的顺序，必须是先 types 后 default/import，否则会报错：

```
node_modules/tdesign-uniapp/navbar/navbar.d.vue.ts”处有类型，但在遵守
package.json "exports" 时无法解析此结果。“tdesign-uniapp”库可能需要更新其
package.json 或键入
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_AyKiXpnM6kPxWhfa.png" width="600" />

同时也要注意加上下面这句，否则其他 css 文件这些无法导入。

```json
{
  "./*": "./*"
}
```

### 6. DefineComponent

```ts
export type DefineComponent<
PropsOrPropOptions = {},
RawBindings = {},
D = {},
C extends ComputedOptions = ComputedOptions,
M extends MethodOptions = MethodOptions,
Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
E extends EmitsOptions = {},
EE extends string = string,
PP = PublicProps,
Props = ResolveProps<PropsOrPropOptions, E>,
Defaults = ExtractDefaultPropTypes<PropsOrPropOptions>,
S extends SlotsType = {},
LC extends Record<string, Component> = {},
Directives extends Record<string, Directive> = {},
Exposed extends string = string,
Provide extends ComponentProvideOptions = ComponentProvideOptions,
MakeDefaultsOptional extends boolean = true,
TypeRefs extends Record<string, unknown> = {},
TypeEl extends Element = any>
```

解读如下：

1. PropsOrPropOptions- Props
2. RawBindings- Setup 返回值
3. D- Data
4. C- Computed
5. M- Methods
6. Mixin- Mixins
7. Extends- Extends
8. E- Emits
9. EE- Emits 选项（字符串）
10. PP- PublicProps
11. Props- 解析后的 Props
12. Defaults- 默认值类型
13. S- Slots（第12个参数！）
14. LC- 局部组件
15. Directives- 指令
16. Exposed- 暴露的属性
17. Provide- Provide
18. MakeDefaultsOptional- 是否可选默认值
19. TypeRefs- 类型引用
20. TypeEl- 元素类型

uniapp 中 CLI +Typescript 模板有点问题，slot 类型报错，解决方案：

1. 去掉 `env.d.ts` 中 `*.vue` 的类型

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_kirx5GczWXZdJRY5.png" width="600" />

2. `tsconfig.json` 指定 `"moduleResolution": "bundler"`

推荐后者。

### 7. nvue vs uvue

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_w2rj56ds3YeX8drQ.png" width="600" />

### 8. Fab

`fab` 组件 `draggable` 类型只能是 `[Boolean, String]`，不能是 `[String, Boolean]`，也就是 `Boolean` 在前，否则不能拖动。

文档：https://cn.vuejs.org/guide/components/props#boolean-casting

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_dhbEKKShhFjdAZjG.png" width="600" />

### 9. custom-style

`custom-style` 我认为是**重剑无锋**。

### 10. 大仓思辨

大仓模式虽好，但不适合所有项目。

1. 不同的子工程有不同的发布节奏，合并分支时机容易冲突
2. 不同的子工程有不同的权限要求

### 11. uniapp 中 app 开发

资料：https://uniapp.dcloud.net.cn/tutorial/run/installSimulator.html#run-app-android-emulator

### 12. 如何查看 udid

连接设备，xcode, command+shift+2

### 13. vscode config

```json
"editor.fontSize": 13,
"chat.editor.fontSize": 13,
"debug.console.fontSize": 13,
"window.zoomLevel": 0.4
```

### 14. yak shaking map

`yak-shaving-map`，剃毛路线图。`Yak shaving` 是编程领域的隐喻，指为完成一个任务而不得不先完成一系列琐碎前置任务的过程。直译保留原始意象，括号注释说明文化背景

Yak​​ 通常被直译为 ​​“牦牛”​​。

### 15. scaleToFill

- scaleToFill - 缩放填充
- ​aspectFill - 纵横填充​
- aspectFit - 纵横适应
- widthFix - 宽度自适应

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_FhGJXHsf4bZWCJF5.png" width="600" />

### 16. tdesign-miniprogram 样式文件

- `style/base = style/var + style/mixins`，大部分组件使用，`var` 和 `mixin` 都是用到才会编译，不用不会编译，不会增加体积
- `style/index = style/base + style/utilities`，个别组件引入
- `style/icons`，Icon 组件使用
- `style/theme/index.css`，业务使用

### 17. tdesign-uniapp 常用连接

- 二维码图片，https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/tdesign-uniapp/tdesign-uniapp-qrcodes.png
- 安卓包下载地址，https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/tdesign-uniapp/apk/tdesign-uniapp.apk

### 18. 组件库上限

交互和视觉设计决定了组件库的上限，组件库的交互一般都是业内共识了，所以基本就是视觉了，包括配色、大小。

### 19. styleIsolation

与页面、其他组件的影响。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_AKM2Afy7B8RhYwne.png" width="600" />

### 20. `default: undefined`

如何判断 `props` 是否被显式声明了 `default: undefined`?

可以用:

```ts
'default' in a;
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_RsnFj3ek8ZFJNfT4.png" width="376" />

### 21. 大仓

方案：

- packages
  - common
  - components
  - pro-components
  - tdesign-miniprogram
  - tdesign-miniprogram-chat
  - tdesign-uniapp
    - site
    - components
  - tdesign-uniapp-chat
    - site
    - components

以下废弃：

- packages
  - common
  - components
  - pro-components
  - tdesign-miniprogram
  - tdesign-miniprogram-chat
  - tdesign-uniapp
  - tdesign-uniapp-chat
  - tdesign-uniapp-site
  - tdesign-uniapp-chat-site

### 22. GitHub actions 执行基准

GitHub Actions 在 PR 时默认会创建一个"合并后的虚拟提交"来执行，既不是纯粹的源分支，也不是纯粹的目标分支。

`pull_request_target` 特殊，它是 GitHub Actions 中一个有风险但有时必要的事件类型，它与普通的 `pull_request` 有重要区别。

核心区别

普通 `pull_request` 事件：

- 执行环境：在 PR 的源分支上下文中运行
- 权限：有限权限，无法访问敏感 `secrets`（来自 `fork` 时）
- 安全：相对安全

`pull_request_target` 事件：

- 执行环境：在 PR 的目标分支上下文中运行
- 权限：拥有写仓库权限和完整 `secrets` 访问权
- 安全风险：高风险，可能被恶意 PR 利用

### 类型

全局搜索 `WechatMiniprogram`，不允许出现。

### 脚本

1. `pages` 脚本，处理 `pages.json` 生成
2. 清理脚本
    - `example` 中 `_tdesign, _tdesign-uniapp-chat, pages-more`
    - HX 中 `uni_modules/tdesign-uniapp, uni_modules/tdesign-uniapp-chat, pages-more, pages, components/`
3. `copy` 脚本
    - 基础组件复制到 `src/_tdesign`，HX 是 `uni_modules/tdesign-uniapp/components`
    - Chat 组件复制到 `src/_tdesign-uniapp-chat`，HX 是 `uni_modules/tdesign-uniapp-chat/components`
    - 示例（`_example`）复制到 `src/pages-more`，HX 一样
    <!-- - `common` 多复制一份到 `src/_tdesign-raw`，HX 是 `_tdesign-uniapp-raw`（现在其实没用了，之前是为了用 `less` 文件） -->
    - `less` （非示例中的）解析然后复制
    - 将 `example` 中 `src/pages` 和 `src/components` 复制到 HX 的 `pages` 和 `components` 下

### HBuilderX 中配置 alias

Vue3 中新建 `vite.config.js`

```ts
// vite.config.js
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'path';

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      'tdesign-uniapp': path.resolve(__dirname, './uni_modules/tdesign-uniapp/components'),
      'tdesign-uniapp-chat': path.resolve(__dirname, './uni_modules/tdesign-uniapp-chat/components'),
    },
  },
});
```

Vue2 中新建 `vue.config.js`

```ts
// vue.config.js
const path = require('path');

function resolve(dir) {
  return path.join(__dirname, dir);
}

module.exports = {
  chainWebpack: (config) => {
    config.resolve.alias
      .set('tdesign-uniapp', resolve('./uni_modules/tdesign-uniapp/components'))
      .set('tdesign-uniapp-chat', resolve('./uni_modules/tdesign-uniapp-chat/components'));
  },
};
```

Vue2 中不能在模板中使用 `?.` 可选链操作符。

Vue3 类型为 Array 的，需要加默认值。

```
Invalid prop: type check failed for prop "value". Expected Array, got Boolean with value false.
```

```ts
value: {
  type: Array,
  default: () => ([])
},
```

### SwipeCell

- `props.opened` 驱动 `state.opened`
- touchmove 等事件会改变 `state.opened`
- 监听 `state.opened`，执行 `onOpenedChange`

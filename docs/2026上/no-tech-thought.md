通过 scp 同步服务 nginx 配置，下载下来，改好，再上传，还有 git 记录。

-- 2026-01-30 08:04:38
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_bJM4BbiMH853QchF.png" width="800"/>

-- 2026-01-29 11:54:48
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_fNPQxPzGXmMyA4FX.png" width="800"/>

-- 2026-01-29 11:54:33
<br>

```sh
pip3 install lizard -i http://pypi.douban.com/simple --trusted-host pypi.douban.com
```
```sh
lizard  -x "**/node_modules/*"
```

python2 装这个版本 

```sh
pip install lizard==1.17.10
```

-- 2026-01-29 11:53:46
<br>

pandoraShowEntrance

-- 2026-01-29 11:49:32
<br>

css 尽量复用小程序端的

1. 小程序端和uniapp端样式部分差异小，相同部分远大于不同部分
2. css 难diff，一行一行的太分散，如果不复用的话，精确同步太费时间

既然要复用CSS

1. 其衍生出的文档中的 CSS 变量部分也要复用，或者生成变量的脚本复用
2. CSS 复制不是一次性工作，所以 uniapp 差异部分不要放在同一个文件里，单独拿出来或放到 vue 文件中

-- 2026-01-29 11:49:07
<br>

td-uniapp 样式处理

- 执行 notes/scripts/td/copy-less-files.js

-- 2026-01-29 11:48:18
<br>

不管分销转换产品、游戏还是其他维度，关键词TIP_STYLE_NAME可以代替任何东西，凡是需要编译时进行单独打包的都可以用这个。

-- 2026-01-29 11:44:17
<br>

```sh
grep "\[webHookData\]" /root/.pm2/logs/rd-platform-svr-out.log -A 200 -B 20

grep "\[nextSubProjectName\]" /root/.pm2/logs/rd-platform-svr-out.log -A 5 -B 5
```

-- 2026-01-29 11:41:41
<br>

pixui 中使用 vConsole 的卡点

- parentElement
- initCustomEvent
- css variables

```js
return new CustomEvent(type, {
    detail,
    bubbles,
    cancelable
  })
```


-- 2026-01-29 11:38:02
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_HGGZCNeWMmiQDBQ2.png" width="800"/>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_mart46DzByWDjDYs.png" width="800"/>

tsconfig.json用根目录的。

tdesign-miniprogram 依赖版本太低。

-- 2026-01-29 11:36:49
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_wPyZEkTCdwZ2hW5K.jpg" width="800"/>

-- 2026-01-29 11:36:10
<br>

https://image-1251917893.cos.ap-guangzhou.myqcloud.com/next-svr/files/2025/10/own_mike_kCJpK32ekenn6cdh.html

-- 2026-01-29 11:35:29
<br>

https://image-1251917893.file.myqcloud.com/igame/html/auto-scheme-mp.html?scheme=weixin%3A%2F%2Fdl%2Fbusiness%2F%3Fappid%3Dwx92e3eeeae1a636de%26path%3Dviews%2Fmatch-reward-claim%2Findex%26env_version%3Dtrial%26query%3DgameId%253D123

-- 2026-01-29 11:35:08
<br>

test

-- 2026-01-29 11:16:11
<br>


目前的构建包

包名|	作用
---|---
cherry-markdown.js<br/>cherry-markdown.min.js | 完整包，较大，包含cherry所有功能（工具栏、左侧编辑器、右侧预览器）
cherry-markdown.core.js	| 核心包，相比完整包，只少了mermaid功能，包大小小了50%以上（当然也可以在引入核心包后再传入mermaid，从而实现对mermaid的支持）
cherry-markdown.engine.core.js	| 解析引擎包，可以理解为只提供了将md解析成html的api

目标

在纯流式渲染的场景下，每个包都很大，希望再提供一个针对纯流式渲染场景的构建包，包里去掉：1、editor（编辑器组件，但可能要保留一个textarea）、toolbar（工具栏组件，包括顶部工具栏、侧边栏、悬浮目录）、mermaid（这个包太大了，引导用户自己引入就好了）

包名大概为：cherry-markdown.stream.js

确认排除的依赖：

- mermaid - 通过 rollup.stream.config.js 的 external 配置排除
- codemirror - 通过 rollup.stream.config.js 的 external 配置排除
- mathjax/katex - 没有打包进去，但在 Engine.js 中会动态加载（通过配置的 src 和 css）



-- 2026-01-28 17:13:37
<br>

tdesign-vue-next/chat 中 `chat-markdown` 用了 tdesign-web-components 中的 `chat-message/content/markdown-content`，后者又用了 cherry-markdown 中的 `dist/addons/cherry-code-block-mermaid-plugin` 和 `dist/cherry-markdown.core`，不止是 engine，是 core！

-- 2026-01-28 16:15:23
<br>

# `packages/cherry-markdown/src/core` 目录详解

## 📁 目录结构

```
core/
├── HookCenter.js          # 语法钩子注册中心
├── HooksConfig.js         # 默认钩子配置列表
├── SyntaxBase.js          # 行内语法基类
├── ParagraphBase.js       # 块级语法基类
├── SentenceBase.js        # 句子级钩子基类（已弃用）
└── hooks/                 # 具体语法钩子实现
    ├── 块级语法 (22个)
    └── 行内语法 (15个)
```

---

## 🎯 核心文件详解

### 1. HookCenter.js - 语法钩子注册中心

**作用**：管理所有 Markdown 语法钩子的注册、分类和优先级

```mermaid
flowchart TB
    subgraph HookCenter
        A[注册内置钩子] --> C[hookList]
        B[注册自定义钩子] --> C
        C --> D[sentence 行内钩子]
        C --> E[paragraph 块级钩子]
    end
```

**核心功能**：
| 方法 | 说明 |
|------|------|
| `registerInternalHooks()` | 注册系统内置的语法钩子 |
| `registerCustomHooks()` | 注册用户自定义的语法钩子 |
| `register()` | 实际注册一个钩子实例 |
| `getHookList()` | 获取所有钩子（按类型分组） |

**关键逻辑**：
```javascript
// 钩子分为两类
this.hookList = {
  sentence: [],  // 行内语法钩子（如加粗、斜体）
  paragraph: [], // 块级语法钩子（如标题、代码块）
};
```

**自定义钩子支持**：
- 可以指定 [`before`]()/[`after`]() 插入位置
- 可以设置 `force: true` 覆盖同名内置钩子

---

### 2. HooksConfig.js - 默认钩子配置

**作用**：定义所有内置语法钩子的**加载顺序**

**执行顺序规则**：
- [`beforeMakeHtml`]()：按数组顺序**正序**执行
- [`makeHtml`]()：按数组顺序**正序**执行
- [`afterMakeHtml`]()：按数组顺序**逆序**执行

**钩子加载顺序**：
```javascript
const hooksConfig = [
  // === 块级语法（先处理） ===
  FrontMatter,     // YAML 前置元数据
  CodeBlock,       // 代码块 ```
  InlineCode,      // 行内代码 `
  InlineMath,      // 行内公式 $
  MathBlock,       // 块级公式 $$
  AiFlowAutoClose, // AI 流式输出自动闭合
  HtmlBlock,       // HTML 块
  Footnote,        // 脚注 [^1]
  CommentReference,// 注释引用
  Transfer,        // 转义字符
  Br,              // 换行
  Table,           // 表格
  Toc,             // 目录
  Blockquote,      // 引用 >
  Header,          // 标题 #
  Hr,              // 水平线 ---
  List,            // 列表
  Detail,          // 折叠块 <details>
  Panel,           // 面板
  Paragraph,       // 普通段落

  // === 行内语法（后处理） ===
  Emoji,           // 表情 :smile:
  Image,           // 图片 ![]()
  Link,            // 链接 []()
  AutoLink,        // 自动链接
  Emphasis,        // 强调 *斜体* **粗体**
  BackgroundColor, // 背景色
  Color,           // 文字颜色
  Size,            // 字体大小
  Sub,             // 下标
  Sup,             // 上标
  Ruby,            // 注音
  Strikethrough,   // 删除线
  Underline,       // 下划线
  HighLight,       // 高亮
  Suggester,       // @ 提及
  Space,           // 连续空格
];
```

---

### 3. SyntaxBase.js - 行内语法基类

**作用**：所有**行内语法**钩子的基类（如加粗、斜体、链接）

**生命周期方法**：
```javascript
class SyntaxBase {
  // 在主渲染前预处理
  beforeMakeHtml(str) { return str; }

  // 核心渲染方法：Markdown → HTML
  makeHtml(str) { return str; }

  // 渲染后处理
  afterMakeHtml(str) { return str; }

  // 测试字符串是否匹配当前语法
  test(str) { return this.RULE.reg.test(str); }

  // 定义匹配规则（子类必须重写）
  rule(editorConfig) {
    return { begin: '', end: '', content: '', reg: new RegExp('') };
  }
}
```

**类型定义**：
```javascript
export const HOOKS_TYPE_LIST = {
  SEN: 'sentence',    // 行内语法
  PAR: 'paragraph',   // 块级语法
  DEFAULT: 'sentence',
};
```

---

### 4. ParagraphBase.js - 块级语法基类

**作用**：所有**块级语法**钩子的基类（如标题、代码块、表格）

**与 SyntaxBase 的区别**：
| 特性 | SyntaxBase | ParagraphBase |
|------|------------|---------------|
| 类型 | sentence | paragraph |
| 缓存机制 | ❌ | ✅ |
| 换行处理 | ❌ | ✅ |
| 行号计算 | ❌ | ✅ |

**缓存机制**：
```javascript
// 缓存用于提升性能，避免重复渲染
pushCache(str, sign, lineCount)  // 存入缓存
popCache(sign)                   // 取出缓存
restoreCache(html)               // 还原所有缓存
checkCache(wholeMatch, ...)      // 检查是否命中缓存
```

**缓存键格式**：
```
~~C${cacheCounter}I${sign}_L${lineCount}$
例如：~~C0Iabc123_L5$
```

**换行处理**：
```javascript
// 经典模式 vs 现代模式
this.classicBr = true;  // 一个换行被忽略，两个换行分段
this.classicBr = false; // 一个换行变<br>，两个换行分段
```

---

### 5. SentenceBase.js - 句子级基类（已弃用）

**作用**：早期版本的钩子基类，现已基本弃用

```javascript
class HookBase {
  getType() {
    const typeList = { 1: 'sentence', 2: 'paragraph', 3: 'page' };
    return typeList[this.HOOKTYPE] || 'sentence';
  }
}
```

---

## 📂 `hooks/` 子目录 - 具体语法实现

### 块级语法钩子（22个）

| 文件 | 钩子名 | 语法示例 | 说明 |
|------|--------|----------|------|
| Header.js | `header` | `# 标题` | 支持 ATX（#）和 Setext（===）两种风格 |
| CodeBlock.js | `codeBlock` | ` ```js ` | 支持语法高亮、行号、复制、展开、自定义渲染器 |
| Table.js | `table` | `\|a\|b\|` | 支持对齐、图表渲染（ECharts）|
| List.js | [`list`]() | `- item` | 支持有序、无序、任务列表、多种样式 |
| Blockquote.js | `blockquote` | `> 引用` | 引用块 |
| MathBlock.js | `mathBlock` | `$$ ... $$` | 块级数学公式（MathJax/KaTeX）|
| Footnote.js | `footnote` | `[^1]` | 脚注 |
| Toc.js | `toc` | `[[toc]]` | 自动生成目录 |
| Hr.js | `hr` | `---` | 水平分割线 |
| Br.js | [`br`]() | 换行 | 换行处理 |
| HtmlBlock.js | `htmlBlock` | `<div>` | HTML 块级元素 |
| FrontMatter.js | `frontMatter` | `---\nyaml\n---` | YAML 元数据 |
| Panel.js | `panel` | 自定义面板 | 信息/警告/错误面板 |
| Detail.js | `detail` | `<details>` | 可折叠内容 |
| Paragraph.js | `paragraph` | 普通文本 | 普通段落（兜底） |
| CommentReference.js | `commentReference` | `[ref]: url` | 全局引用定义 |
| Transfer.js | `transfer` | `\*` | 转义字符处理 |
| AiFlowAutoClose.js | `aiFlowAutoClose` | - | AI 流式输出自动闭合 |
| InlineCode.js | `inlineCode` | `` `code` `` | 行内代码（在块级处理）|
| InlineMath.js | `inlineMath` | `$x^2$` | 行内公式（在块级处理）|

### 行内语法钩子（15个）

| 文件 | 钩子名 | 语法示例 | 说明 |
|------|--------|----------|------|
| Emphasis.js | `fontEmphasis` | `**粗体**` `*斜体*` | 支持 * 和 _ 两种符号 |
| Image.js | `image` | `!alt` | 支持扩展属性、视频/音频 |
| Link.js | `link` | [`text`]() | 支持 target 属性 |
| AutoLink.js | `autoLink` | `https://...` | 自动识别 URL |
| Strikethrough.js | `strikethrough` | `~~删除~~` | 删除线 |
| Underline.js | `underline` | - | 下划线 |
| HighLight.js | `highLight` | `==高亮==` | 文字高亮 |
| Color.js | `color` | - | 文字颜色 |
| BackgroundColor.js | `backgroundColor` | - | 背景颜色 |
| Size.js | `size` | - | 字体大小 |
| Sub.js | `sub` | `H~2~O` | 下标 |
| Sup.js | `sup` | `X^2^` | 上标 |
| Ruby.js | `ruby` | - | 注音（ruby 标签）|
| Emoji.js | `emoji` | `:smile:` | 表情符号 |
| Suggester.js | `suggester` | `@user` | @ 提及/智能建议 |
| Space.js | `space` | 多个空格 | 连续空格保留 |
| SuggestList.js | - | - | Suggester 的辅助模块 |
| Emoji.config.js | - | - | Emoji 配置数据 |

---

## 🔄 语法解析流程

```mermaid
flowchart TB
    subgraph Input
        A[Markdown 源码]
    end

    subgraph "Engine 引擎"
        direction TB
        B1["1️⃣ paragraph hooks.beforeMakeHtml()<br/>块级预处理"]
        B2["2️⃣ paragraph hooks.makeHtml()<br/>块级渲染"]
        B3["3️⃣ sentence hooks.makeHtml()<br/>行内渲染"]
        B4["4️⃣ paragraph hooks.afterMakeHtml()<br/>块级后处理（逆序）"]
    end

    subgraph Output
        C[HTML 输出]
    end

    A --> B1 --> B2 --> B3 --> B4 --> C
```

---

## 🛠️ 如何创建自定义语法钩子

### 1. 行内语法示例

```javascript
import SyntaxBase from '@/core/SyntaxBase';

class MyInlineHook extends SyntaxBase {
  static HOOK_NAME = 'myInline';

  makeHtml(str) {
    return str.replace(/\[\[(.+?)\]\]/g, '<mark>$1</mark>');
  }

  rule() {
    return {
      begin: '\\[\\[',
      content: '(.+?)',
      end: '\\]\\]',
      reg: /\[\[(.+?)\]\]/g,
    };
  }
}
```

### 2. 块级语法示例

```javascript
import ParagraphBase from '@/core/ParagraphBase';

class MyBlockHook extends ParagraphBase {
  static HOOK_NAME = 'myBlock';

  constructor() {
    super({ needCache: true }); // 启用缓存
  }

  makeHtml(str, sentenceMakeFunc) {
    return str.replace(/:::(\w+)\n([\s\S]+?)\n:::/g, (match, type, content) => {
      const { html } = sentenceMakeFunc(content);
      return this.pushCache(`<div class="${type}">${html}</div>`, this.sign);
    });
  }
}
```

---

## 📊 核心类继承关系

```mermaid
classDiagram
    class SyntaxBase {
        +static HOOK_NAME
        +static HOOK_TYPE = "sentence"
        +RULE
        +beforeMakeHtml(str)
        +makeHtml(str)
        +afterMakeHtml(str)
        +test(str)
        +rule()
    }

    class ParagraphBase {
        +static HOOK_TYPE = "paragraph"
        +needCache
        +cache
        +pushCache()
        +popCache()
        +restoreCache()
        +getLineCount()
    }

    SyntaxBase <|-- ParagraphBase
    SyntaxBase <|-- Emphasis
    SyntaxBase <|-- Link
    SyntaxBase <|-- Image
    ParagraphBase <|-- Header
    ParagraphBase <|-- CodeBlock
    ParagraphBase <|-- Table
    ParagraphBase <|-- List
```

---

## 📝 总结

`core` 目录是 Cherry Markdown 的**语法解析核心**：

1. **HookCenter** - 统一管理所有语法钩子的注册和调度
2. **HooksConfig** - 定义语法处理的优先级顺序
3. **SyntaxBase** - 行内语法的基类（轻量、无缓存）
4. **ParagraphBase** - 块级语法的基类（支持缓存、行号计算）
5. **hooks/** - 37 个具体语法实现

**设计亮点**：
- 🔌 **插件化**：支持自定义语法扩展
- ⚡ **高性能**：块级语法支持缓存
- 🎯 **优先级**：通过配置数组控制处理顺序
- 🔄 **生命周期**：[`beforeMakeHtml`]() → [`makeHtml`]() → [`afterMakeHtml`]()



-- 2026-01-28 15:18:41
<br>

```mermaid
flowchart TB
    subgraph 用户输入
        A[Markdown 文本]
    end

    subgraph Editor
        B[CodeMirror]
    end

    subgraph Engine
        C[HookCenter]
        D[语法 Hooks]
        E[缓存]
    end

    subgraph Previewer
        F[HTML 渲染]
    end

    A --> B
    B --> |onChange| C
    C --> D
    D --> E
    E --> F

    subgraph Toolbar
        G[菜单操作]
    end

    G --> |insert| B
```

-- 2026-01-28 11:42:05
<br>

语法丰富、开箱即用、易于扩展且高性能的 Markdown 编辑器

-- 2026-01-28 09:52:13
<br>

方法永远可以做到不私密，如果存在私密的方法，那么可以拆分出不私密的方法和私密的变量。

真正私密的永远是配置信息、密钥等常量，所以上面的方式永远有效。

-- 2026-01-28 00:56:06
<br>

plugin-light-const 的定位：

1. 放配置信息、常量定义，比如 getCdnList
2. 有点私密，不方便放 t-comm 里
3. 如果是需要运行时和编译时都需要的函数，放到 t-comm 里，而不是 project-config-const 中

-- 2026-01-28 00:53:47
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_j6ns8mCznzykDD6C.jpeg" width="800"/>

-- 2026-01-27 20:51:48
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_h3GAYxppek365kMj.jpeg" width="800"/>

-- 2026-01-27 20:51:11
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_z7cBFHRmHpaCQAYi.png" width="800"/>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_pWbdCkR5hG83fPWr.png" width="800"/>

-- 2026-01-27 16:51:55
<br>

https://github.com/dcloudio/uni-app/issues/3793 这个评论不错，提到了 rpx 在uniapp H5 中的转换

-- 2026-01-27 11:27:01
<br>

小程序是去中心化的，用户创造、使用都是通过搜索、扫码、分享等形式，是自发的。

-- 2026-01-26 20:31:45
<br>

- 收入是产品的副产品，不是为了收入做产品，但是游戏好像是为了收入而做的。
- 做游戏的意义感是啥。
- mark: 钱给够
- 微信没有很多很多产品，比ieg更缺少锻炼
- 人不是培养的，而是筛选出来的
- 不能在一个地方待着。

-- 2026-01-26 18:01:01
<br>

要验证 PR 的改动（pkg.pr.new），或者 npm 包内容

1. 进入工程，`cd packages/tdesign-uniapp/example`
2. 去掉 `vite.config.ts` 中 `alias` 的配置
3. 装包，如 `pnpm i https://pkg.pr.new/Tencent/tdesign-miniprogram/tdesign-uniapp@4201`
4. 执行 `dev` 等命令，如 `npm run dev:h5`

-- 2026-01-26 17:59:42
<br>

demo 同步

一次性工作。

```mermaid
graph TD
pages --> demo
components["components(pull-down-list)"] --> demo
mixins --> demo
styles["style(app.less)"] --> demo
```

这部分是从 `vue3-cli` 同步到 `app/vue2-cli` 等目录中的。

```mermaid
graph TD
vue3-cli --> app
vue3-cli --> vue2-cli
```

需要监听的部分，主要是组件和示例，组件目标是 `_tdesign`，或者 `uni_modules/tdesign-uniapp` 下。

```mermaid
graph TD
uniapp-components --> _tdesign["_tdesign 或 uni_modules 下"]
uniapp-pro-components/chat --> _tdesign-chat["_tdesign-chat"]
_example --> pages-more

subgraph demo["demo"]
_tdesign
_tdesign-chat
pages-more
end
```

这部分是从 `uniapp-components` 等同步到 `vue3-cli/app/vue2-cli` 等目录中的。

```mermaid
graph TD
uniapp-components --> vue3-cli
uniapp-components --> app
uniapp-components --> vue2-cli

uniapp-chat-components --> vue3-cli
uniapp-chat-components --> app
uniapp-chat-components --> vue2-cli
```

每个项目独特的部分

```mermaid
graph TD
App.vue
main.ts
manifest.json
pages.json
```

-- 2026-01-26 15:35:00

小程序长按图片，保存图片没反应？

原因是没返回签名地址，比较坑的是没有提示。

- 错误的：https://gamelife-1251917893.igcdn.cn/hpmatch/hpmatch_F6dFij4NT8R5.jpg
- 正确的：https://gamelife-1251917893.igcdn.cn/hpmatch/hpmatch_F6dFij4NT8R5.jpg?q-sign-algorithm=sha1&q-ak=xx&q-sign-time=xx&q-key-time=xx&q-header-list=host&q-url-param-list=&q-signature=xx

-- 2026-01-26 15:05:00

- https://github.com/Tencent/tdesign-miniprogram/pull/4112/changes
- https://github.com/Tencent/tdesign-miniprogram/pull/4124/changes

这两个还要再看下

-- 2026-01-26 12:43:28
<br>

td-mini 同步 td-uniapp 的步骤：

1. 可选，在 td-mini 大仓下进行 build 脚本的改造，去掉 `jsmin/jsonmin/wxmlmin` 的使用
2. 执行 `npm run build`（或者 `npm run build -- --ignore-terser`），生成 `_example` 目录
3. 复制 `_example` 目录到 `mini-to-uni` 工程下，进行覆盖
4. 可选，删除之前的 `_example_uni`
5. `mini-to-uni` 工程下执行 `node ./bin/wtu -i ./_example` 进行 uniapp 组件生成
6. 手动 diff，结合 PR，Git 记录，更新 td-uniapp 组件库

-- 2026-01-26 12:31:56
<br>

`1.t-grid-item__content--left` 需要加上 `width: 100%;box-sizing: border-box;`，否则边框位置不对。

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_yp3AKExM7KJcsw3P.png" width="600"/>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_fsAZtkaXdnGTDWM6.png" width="600"/>

-- 2026-01-26 12:02:44
<br>

- 拉起链接 https://cdn.partner.esports.pubgmobile.com/os-pubgm/en/link.html?scheme=igame1320%3A%2F%2F%3Fmodule%3D1000096%26gameId%3Dafp5CYxaDf524MmUiETKmc%26teamId%3D199D4B3B%26from%3DteamDetailShare

- 配置地址 `game://?module=1000096`

-- 2026-01-26 11:06:55
<br>

地区选择那个，不能用 selectedIndex === optionIndex 判断当前是否选中，因为搜索框的存在，下拉框是会变的。

比如你选了泰国，selectedIndex 为 0，搜索了 马来西亚，由于 selectedIndex 没变，所以导致 马来西来依然高亮，用户会误解。

当然也可以在 searchValue 或者 options 改变的时候，更新下 selectedIndex。

-- 2026-01-26 10:20:19
<br>

要将所有的 :deep 改成 custom-style，工作量有点大，退而求其次，只在组件 less 中加 :deep，不加、不删、不改其他样式。有改动的，记录下来，比如 dialog.less 的改动如下：

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_iN8kjhBXpmwa4hyw.png" width="600" />

-- 2026-01-26 00:28:41
<br>

其实用 `:deep(xx)` 也是有兼容性问题的，Vue2 需要换，不如直接用 customStyle

-- 2026-01-25 23:13:45
<br>

packages/tdesign-uniapp/app/ 待删除

-- 2026-01-25 21:13:23
<br>

为什么小程序样式覆盖需要用 `:deep`，而 H5 不需要？

原因是 H5 中节点会合并，或者说会替换成真正的子组件节点，可以看到下面的 `uni-button` 有两个 `data-v-xx`，而小程序不是。

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_WH8KwtHMYMYjaRCF.png" width="600"/>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_SD2cwnRyY56zs3aF.png" width="600"/>


-- 2026-01-25 19:54:49
<br>

文档中单组件“更新日志”有问题，加载不出来

-- 2026-01-25 11:17:36
<br>

贡献指南；mini-to-uniapp commit

-- 2026-01-25 04:26:54
<br>

心如猛虎，细嗅蔷薇

-- 2026-01-25 04:24:01
<br>

td-uniapp 的难点，一是宏观，架构搭建、监听体系、更新策略，二是微观，又可分为实现原理和细节。实现上，对几十个组件了如指掌、如数家珍，不同端的兼容性、差异性有不同的处理策略，细节上，对每个组件的还原效果、深色模式、色值等效果对齐，抠每一处细节。

-- 2026-01-25 04:22:09
<br>

vue2+cli/vue3+cli/vue2+hx/vue3+hx 组件基础示例，vue3+cli/vue3+hx 社区模板；chat mr 合入；eslint问题；src/api合入


-- 2026-01-25 04:14:53
<br>

今日已同步 td-mini 最新改动 v1.12.2（2026-01-21）。不含 chat。

-- 2026-01-25 04:10:00
<br>

td-uniapp 中的示例页面，加上 demo-navbar 类名，就是白底黑色，否则就是透明底默认颜色。

```css
.demo-navbar {
  --td-navbar-bg-color: var(--td-bg-color-container);
  --td-navbar-color: var(--td-text-color-primary);
}
```

-- 2026-01-25 03:54:35
<br>

这个 issue 有意思，[https://github.com/Tencent/tdesign-miniprogram/issues/3986](https://github.com/Tencent/tdesign-miniprogram/issues/3986)。

```ts
export function getMonthByOffset(date, offset) {
  const _date = new Date(date);
  _date.setMonth(_date.getMonth() + offset);
  return _date;
}
```

`getMonthByOffset(value, n)`，如果 value + n 月那一天没有 dd, 则会自动进入下一个月，也就是value+n+1。比如 10月31日 + 1月，会被处理成 12月，正常应该是 11 月。

-- 2026-01-25 00:45:20
<br>

良心，有就是有，没有就是没有，不存在唤醒一说

-- 2026-01-24 20:01:55
<br>

发现问题、提出问题比解决问题更重要

-- 2026-01-24 20:01:04
<br>

孤独是人生常态，不被理解是人生常态，不被认可更是人生常态。

-- 2026-01-24 19:19:59
<br>

批量发布流程

```mermaid
graph TD
开始 --> 发布第一个 --主动调服务端接口--> 发布下一个
发布第一个 --蓝盾回调--> 更新发布状态
发布下一个 --主动调服务端接口--> 继续发布直到最后一个
```


-- 2026-01-20 22:28:38
<br>

批量发布的核心字段 batchUpload，1. server 传给流水线、流水线再回传给 server 2. 操作日志 operation 的 batchUpload 只做留存，无实际作用

-- 2026-01-20 22:24:41
<br>

操作记录 operation 的设计哲学应该是 1 有唯一的 pipelineId、pipelineRunId，且不应该变化 2. 不同类型的操作日志应该有统一的字段，类似于抽象类。

-- 2026-01-20 22:21:57
<br>

将 regionSelect 的 regionOptions 改为受控，当搜索时，之前的 selected 不在 regionOptions 时，就更新 selected。这样可以在 搜到一个值，不点选择，直接点外层确定也不会违反直觉。

search 输入框和 select 的回显用一个，即都是 input，这个之前的逻辑不变。

handleSelect 时，更新 searchValue 为选中的值，这个之前的逻辑不变。

展示 dropdown 时，清空 searchValue，来展示所有 regionOptions，这个之前的逻辑不变。


-- 2026-01-17 00:53:15
<br>

monorepo 仓库的每次提交都应该只改动一个子包的，让 commit 信息更聚焦，生成的 changelog 更易读。

-- 2026-01-15 01:01:13
<br>

没人认可，那就想办法自己扩大自己的影响力，多写文章，多写内容。

-- 2026-01-13 14:07:15
<br>

你一直在拖着，就是潜意识觉得它在等着你，其实不是，有些事，你现在不做，后面就没机会了。

-- 2026-01-12 03:05:08
<br>

活是核心活，事是核心事，人是边缘人。

-- 2026-01-11 14:11:16
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_W23JPrzb2DNskwP5.jpeg" width="600"/>

-- 2026-01-10 16:52:13
<br>

<img src="https://cdn.uwayfly.com/article/2026/1/own_mike_C4zB7wssYdeXkndW.jpeg" width="600"/>

-- 2026-01-10 16:51:16
<br>

不应该想着自己至关重要，而应该想着自己无足轻重。从这6年的12次绩效就能看出来了，额外的想法都是幻想。

-- 2026-01-09 19:00:35
<br>

不应该想着上班的时候只做工作，晚上再做开源，而且再尽可能提高效率，上班时做完所有能想到的事情，晚上还有其他学习任务，比如临时看到的好文章，主动搜的b站基础知识，新了解到的框架。

-- 2026-01-09 19:00:13
<br>

又虚伪，又觉自己公正，又菜，又觉自己掌控一切，感觉好恶心。

-- 2026-01-08 21:34:45
<br>

哪怕你写个Vue出来，哪怕你攻克了项目的难点，他一样能找1000个理由给你中低绩效。

-- 2026-01-04 08:30:04
<br>

绩效的本质是认可，跟产出多少没关系。对方认为你做得好你就做得好，认为你不行你做多少也没用。

-- 2026-01-04 08:28:24
<br>


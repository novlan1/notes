完整模拟小程序引擎

uni-app 设计的开发标准是：Vue.js的语法+小程序的API+条件编译扩展平台个性化能力。其中：

- Vue.js 的语法在微信小程序端，uni-app 是在 mpvue 的基础上增强实现的，在H5端则默认支持；
- 而小程序的API，其实包括三个部分：框架+组件（UI）+接口（API），这三部分在微信小程序端是内置支持的，而 uni-app 若要发布到H5平台，则需完整模拟实现小程序运行时环境。

如下是一个简易的小程序运行时框架，核心是一个响应的数据绑定系统。

-- 2025-12-28 18:48:43
<br>

cli vue2 td uniapp

- pnpm i less-loader -D
- 设置 alias
- 引入 theme，可以直接复制之前的 style/app.less

-- 2025-12-09 08:35:03
<br>

surge --project ./packages/site/dist --domain https://preview-pr-1-tdesign-uniapp.surge.sh

-- 2025-12-09 08:33:47
<br>

路由模式修改涉及的地方

- overview.md
- overview.en-US.md
- router.ts
- docs.config.ts

-- 2025-12-09 08:18:08
<br>

最初我们支持>>>组合器，以使选择器“更深入”。但是，由于这不是官方的CSS组合器，因此某些CSS预处理器（如SASS）在解析它时会遇到问题。
  我们后来改用了/deep/，它曾经是CSS中实际提出的新增功能（甚至在Chrome中原生支持），但后来被删除了。这给一些用户带来了困惑，因为他们担心/deep/在Vue SFC中使用会导致他们的代码在已删除该功能的浏览器中不受支持。但是，就像>>>一样，/deep/它仅被Vue的SFC编译器用作编译时提示来重写选择器，并在最终的CSS中被删除。
  为了避免因删除组合器而产生的混淆/deep/，我们引入了另一个自定义组合器，::v-deep这次更明确地表明这是一个特定于Vue的扩展，并使用伪元素语法，以便任何预处理器都应该能够解析它。
  出于兼容性原因，当前Vue2 SFC编译器仍支持深度组合器的先前版本，这又会让用户感到困惑。在v3中，我们不再支持>>>和/deep/。
  当我们在为v3开发新的SFC编译器时，我们注意到CSS伪元素实际上在语义上不是组合器。伪元素接受参数更符合惯用的CSS，因此我们也以::v-deep()这种方式进行工作。目前仍支持将作为组合器的::v-deep用法，但它被视为已弃用并会引发警告。
以上内容翻译自：https://github.com/vuejs/rfcs/blob/scoped-styles-changes/active-rfcs/0023-scoped-styles-changes.md#deep-selectors

参考：https://juejin.cn/post/7413669480624357386



-- 2025-12-09 08:15:02
<br>

＜img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/12/own_mike_2ybpxGdyw8xNGncE.png" ＞

uni-app设计的开发标准是：Vue.js的语法 + 小程序的API + 条件编译扩展平台个性化能力。其中：
Vue.js 的语法在微信小程序端，uni-app是在mpvue的基础上增强实现的，在H5端则默认支持；
而小程序的API，其实包括三个部分：框架 + 组件（UI）+ 接口（API），这三部分在微信小程序端是内置支持的，而uni-app若要发布到H5平台，则需完整模拟实现小程序运行时环境。

-- 2025-12-09 08:13:57
<br>

＜img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/12/own_mike_cZ7EmNfYk5yP6wT3.jpeg" ＞

为实现小程序、H5两端的完整跨端，uni-app在H5平台完整模拟实现了小程序的逻辑层和视图层。

-- 2025-12-09 08:12:25
<br>

input 设置为 readonly 后 click无法触发，是因为 uniapp的内置组件input使用了disabled，而不是 readonly。disabled 的 input 没有 click事件。

参考
https://github.com/dcloudio/uni-app/pull/5871
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled

关键点‌：

pointer-events: none; 确保input本身不会拦截点击事件。

点击事件绑定在外层view上，即使input禁用也能触发。

-- 2025-12-09 08:06:42
<br>

chat-list 新增消息时，页面元素抖动，加唯一key解决

-- 2025-12-09 08:05:01
<br>


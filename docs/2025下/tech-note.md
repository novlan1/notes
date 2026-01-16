怎样来实现流量削峰方案


削峰从本质上来说就是更多地延缓用户请求，以及层层过滤用户的访问需求，遵从”最后落地到数据库的请求数要尽量少"的原则。

1. 消息队列解决削峰

要对流量进行削峰，最容易想到的解决方案就是用消息队列来缓冲瞬时流量，把同步的直接调用转换成异步的间接推送，中间通过一个队列在一端承接瞬时的流量洪峰，在另一端平滑地将消息推送出去。


消息队列中间件主要解决应用耦合，异步消息，流量削锋等问题。常用消息队列系统：目前在生产环境，使用较多的消息队列有 ActiveMQ、RabbitMQ、ZeroMQ、Kafka、MetaMQ、RocketMQ 等。

在这里，消息队列就像“水库”一样，拦蓄上游的洪水，削减进入下游河道的洪峰流量，从而达到减免洪水灾害的目的。

-- 2025-12-29 08:33:57
<br>

Agent 两大派系：为什么有的能落地，有的永远只能 PPT？

Agent 现在分两派：

A. 工作流型 Agent—现实可用，能规模化落地它有 SOP（标准流程）：

输入 ＞ 处理 ＞ 输出

边界明确，有轨道可跑。可靠、可监控、结果可控。

适用场景：

- 客服机器人（固定问答流程）
- 代码审查（检查清单明确）
- 数据处理（ETL 流程标准化）
- 文档生成（模板＋规则）

为什么能落地？因为可靠性＞灵活性。

所以大厂能用的，都是这种。

B. 自主型 Agent—自由灵魂，现实灾难

目标模糊、行为难控、结果不可复现。今天帮你干活，明天给你整活。

适合展示，但绝不适合生产。现实问题：

- 今天帮你发邮件，明天给老板发了辞职信
- 今天帮你买东西，明天把你银行卡刷爆
- 今天帮你整理文件，明天把重要文档删了

核心原因：自由度越大，不确定性越大，风险越高。

这也是为什么创业公司喜欢吹自主 Agent，而工程团队只做工作流 Agent。

-- 2025-12-28 19:08:20
<br>

AI 做了工程师过去60%~80%的“体力活”。

但剩下的20%，是「经验＋思考＋判断＋产品理解」。

过去：

- 工程师负责 0-100

-- 2025-12-28 19:05:52
<br>

现在：

- AI负责0>80
- 工程师负责最难的 80-100

这个 20%，决定了：

- 产品能不能上线
- 用户会不会崩
- 公司能不能卖钱
- 项目会不会翻车

所以，“善后工程师"不是低端岗位，而是价值更高的岗位。
真正被 AI取代的，是那些：

- 跟着教程敲
- 不懂架构
- 不看边界
- 不做兜底
- 不懂产品逻辑
- 不理解业务场景

的30分工程师。

-- 2025-12-28 19:04:27
<br>

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

```bash
surge --project ./packages/site/dist --domain https://preview-pr-1-tdesign-uniapp.surge.sh
```

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

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/12/own_mike_2ybpxGdyw8xNGncE.png"  width="600" />

uni-app设计的开发标准是：**Vue.js 的语法 + 小程序的API + 条件编译扩展平台个性化能力**。其中：

Vue.js 的语法在微信小程序端，uni-app是在mpvue的基础上增强实现的，在H5端则默认支持；

而小程序的API，其实包括三个部分：**框架 + 组件（UI）+ 接口（API）**，这三部分在微信小程序端是内置支持的，而uni-app若要发布到H5平台，则需完整模拟实现小程序运行时环境。

-- 2025-12-09 08:13:57
<br>

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/12/own_mike_cZ7EmNfYk5yP6wT3.jpeg" width="600" />

为实现小程序、H5两端的完整跨端，uni-app在H5平台完整模拟实现了小程序的逻辑层和视图层。

-- 2025-12-09 08:12:25
<br>

input 设置为 readonly 后 click 无法触发，是因为 uniapp 的内置组件 input 使用了 disabled，而不是 readonly。disabled 的 input 没有 click 事件。

参考
- https://github.com/dcloudio/uni-app/pull/5871
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled

关键点‌：

`pointer-events: none;` 确保 input 本身不会拦截点击事件。

点击事件绑定在外层 view 上，即使 input 禁用也能触发。

-- 2025-12-09 08:06:42
<br>

chat-list 新增消息时，页面元素抖动，加唯一key解决

-- 2025-12-09 08:05:01
<br>


### 1. 开始

同步下和平赛场相关优化，包括工程、性能、用户体验等方面。

### 2. 工程

工程相关的包括提高代码质量、全量使用 `tailwindcss`、横版升级等。

#### 2.1. 代码质量

和平赛场很大一部分前端工作都交给了外部开发者，如何保证他们的代码质量是关键。

目前采取了以下手段：

1. 加强代码审查。代码提测前CR一次，合主干前再CR一次，复杂点的需求两三天就要CR一次，再复杂的不会交出去。这里的CR节奏与其他项目并不完全一样，其他项目可能只CR到主干一次，很多问题发现不了。和平赛场这里还是继续坚持更频繁的CR
2. Lint 工具加持。开发了 MR Lint 工具、全量 Lint 工具，引入了 `json-parse-try-catch`、`import/order`、`tailwindcss/classnames-order` 等规则，进一步保证了代码质量、代码统一性
3. 核心代码物理隔离。历史规律看，只有物理隔离才能保证代码稳定可靠，否则他们能一定会入侵他们可以接触到的代码（时间早晚问题），分分钟给你搞乱，而涉及大量文件的CR你可能根本关注不到。和平赛场的核心逻辑、核心组件都沉淀到 `Press Next` 中，`Press Next` 比业务库代码要求更严格（如 TS 开启严格模式），且有单独的CR和发布管理
4. 严格遵守开发、发布流程，即开发、测试、预发布、正式发布、现网验证等流程

通过以上方法，尽量让代码可控，避免发现问题太晚。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_TYfWdx43eNXsw2Gj.png" width="400">

<p></p>

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_n7Eiy2X4CX8AGYPY.png" width="406">

#### 2.2. tailwindcss

`tailwindcss` 是CSS原子化的工具。

为什么用 `tailwindcss`？[官网](https://tailwindcss.com/docs/styling-with-utility-classes#overview)给了几个理由：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_FNTGH3wH3Z4bWns5.png" width="600">

对于我们项目而言，还有更深层次的原因：

- 由于前端开发与UI开发分离，许多时候前端删掉了某些DOM结构，却不知道删掉对应的样式文件，造成性能问题
- 类名写的很乱，即便一个按钮也有无数种写法，难以维护。用 `tailwindcss` 之后，大部分情况下只有一个标准答案，会限制开发人员的“胡乱发挥”

对于有些人认为的 `tailwindcss` 会让模板变成很长，造成难以维护。我是这样看待的：

- 写的太少，不了解 `tailwindcss`，对于不熟的东西有天然的恐惧
- 没有规范，我这边的项目要求 `tailwindcss` 的类名一行一个，并增加 `ESLint` 的排序校验，保证所有人写出来的都一样
- 不懂数据驱动，如果发现完全一模一样的很长的类名，是不是忘记了 `v-for`

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_mWAxZ58BKndy5mD3.png" width="400">

个人对 `tailwindcss` 的理解：

1. 用工具帮开发者完成书写CSS，这个工具是无数测试用例、无数线上项目验证过的
2. 简单、高效，让简单的事情回归简单

社区内使用 `tailwindcss` 或者其他原子化 CSS 的项目很多，比如 `github`、`x.com`，证明了它的成熟性。

为什么不用 `unocss`？主要是考虑是社区生态和活跃度，`tailwindcss` 生态链更成熟。`unocss` 那点编译速度的提升不足以弥补它在生态的不足、以及生产环境的不确定性。

#### 2.3. 横版项目 Vue3 升级

横版项目之前还是 Vue2，并且还有一些其他问题：

- 大量冗余的CSS，性能差
- 大量全局样式，影响新增组件表现
- 大常量文件放到项目里，没有异步加载，性能差

这里优化成了 Vue3 + Typescript，并解决了上面的问题。`Typescript` 带来的质量提升是巨大的，体会不到的人可能是一直使用了隐式 `any`。

#### 2.4. 其他

1. 将 `press-gp-dialog`、`press-toast` 等组件的 `dom` 内嵌在 `global-component` 中，这样每个页面只需要注入一个全局组件即可。同时，在 `main.ts` 中增加了这些组件调用时的默认 `selector`。好处是，降低开发成本，减少犯错。
2. 开发了插件，检查循环依赖、子包引用主包等引用错误问题，避免潜在的错误

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_cwwwkYFk6FiGNArY.png" width="500">

### 3. 性能

竖版性能部分其实做了很多工作，不过都被不停增长的需求、不同增加的代码体积抵消了，首屏时间约为 `2200ms` 左右，在赛事、商家同等量级、同等复杂度的业务中算是较好的。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_8xeSdcGKWcr6zian.png" width="500">

横版由于升级了 Vue3，去掉了冗余样式，性能有比较大的提升，由 `3600ms+` 提升到了 `2200ms` 左右。

之前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_FERcTby3TP525WWJ.png" width="500">

现在：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_Ynwr8EX2Q4YwRamE.png" width="500">

竖版性能相关优化具体介绍下。

#### 3.1. tim 异步加载

##### 3.1.1. 实现原理

IM 内部使用 [tim-js-sdk](https://www.npmjs.com/package/tim-js-sdk) 和 [tim-wx-sdk](https://www.npmjs.com/package/tim-wx-sdk)，分别用于 H5 和小程序。

H5 和 微信小程序均优化成了异步加载。

H5 的异步加载是用了 `little-loader`。

微信小程序的异步加载是用了 [require.async](https://developers.weixin.qq.com/miniprogram/dev/reference/api/require.html) 语法，并采用 `rollup-plugin-copy` 将 `node_modules` 下的 `tim-wx-sdk` 拷贝到 `views/tim-wx` 分包中。具体步骤：

1. 分包注册
2. `require.async` 分包异步加载
3. 复制三方库对应文件到分包目录

##### 3.1.2. 效果

使用异步加载，微信小程序主包可以减小 `0.53M`。

之前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_eeaf3c34a53915efc7.png" width="600" />

异步加载之后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_df60c9e4640c7a3e07.png" width="600" />

使用异步加载，H5的体积可以减少 170 KB。

之前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_e25ee9a8e6bd7ef716.png" width="600" />

异步加载之后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_030febad99995c54f0.png" width="600" />

#### 3.2. 分享模板异步加载

##### 3.2.1. 当前痛点

1. 引入了`jsapi`，体积太大，文件太多，可读性、可维护性太差。本来是非常简单的东西，加载`sdk`、调用全局变量即可，现在变得非常麻烦
2. 类型缺失，使用、阅读、开发、调试困难
   - 多个全局对象 `shareObject`、`shareUiObject` 没有类型
   - 分享类别 `shareType` 没有类型，都是`1234`的魔法字符串
   - 对外的API，比如 `initShare` 没有类型
3. 最关键的一点，分享根本不是首屏所需资源，不是必要路径，完全可以异步加载

当前 `pmd` 体积:

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_1ee0e93a76cf00acf0.png" width="600">

把分享重定向到一个伪文件，即去掉分享后的 `pmd` 体积：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_43a0c42a4cb653343a.png" width="600">

可见分享模块的体积已经达到了 `97.49KB`，亟需优化。

光 `jsapi` 就有 `58.34KB`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_d45c10acbf304f3975.png" width="600">

##### 3.2.2. 优化思路

1. 去掉 `jsapi`
2. 补充类型提示
3. 封装异步加载逻辑，业务不关心

其他：

1. `Toast`， `Dialog` 改为外部传入，方便切换组件库
   - `Toast.show` => `showToast`
   - `Dialog.confirm` => `showConfirmDialog`
2. `toast` 和 `dialog` 文案支持自定义
3. `postGetMiniProgramOpenLink` 改为外部传入，可以充分自定义。传入的时候，就应该封装好参数，`share` 内部不关心。
4. `configWx` 改为外部传入，适应任意业务
5. 支持隐藏任意分享渠道，传入 `hideShareType` 参数即可，并把之前内部的账号判断移出 `share` 核心逻辑

##### 3.2.3. 效果

减少 `85KB`。

之前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_0ce48c3b497a47cc7b.png" width="600">

之后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_8f266681fa965b8410.png" width="600">

### 4. 用户体验

除了产品和其他人员提出的用户体验优化之外，前端主动优化了诸多用户体验部分。

#### 4.1. 登录优化

赛事即将开始时，平台会给参赛人员发携带比赛链接的短信。用户点击短信里的链接，会用浏览器打开。没有登录过或者登录失效时候，会展示登录框，点击其中的微信登录时，会弹一个二维码，用户需要截图并用微信扫码打开，步骤太多。

这里优化成了点击微信登录，就直接拉起小程序对应页面。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/2/own_mike_46a6960bf2b96d92d7.gif" width="300">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/2/own_mike_f6aec9336555447752.gif" width="300">

此外，之前是固定的 `scheme`，这里优化成弹出登录框时，判断当前 `url`，获取当前的页面、参数等信息，并动态拼接 `scheme`，注入到 `config` 中。让用户跳转到小程序后，打开的就是短信里的链接，无需再次点击。

下图是这一优化上线后，小程序的访问次数对比。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/3/own_mike_1a890f145f7c51545e.png" width="600">

#### 4.2. 页面切换增加切换效果

就是在页面切换时增加动画效果。左边是使用之前，右边是使用之后。使用后有切换动画，提升了流畅感。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/12/own_mike_2f9613b04c19a3c50f.gif" width="200">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/12/own_mike_1726c8e1bea10c9ff3.gif" width="200">

核心原理是借助了 `router` 的 `beforeEach` 和 `afterEach` 钩子，在路由跳转前后改变顶层类名，进而增加 `translateX` 相关动画。

#### 4.3. H5在PC端展示优化

背景是 H5 用电脑浏览器打开时，会变形，宽高都会被拉长。现在优化成了在 PC 打开时，依然保持 H5 的样式。

效果对比如下，之前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_phaTEJywawdnmr7F.png" width="500">

之后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/5/own_mike_ZZCnPHkYPs2wxMW7.png" width="500">

原理为，在 PC 端打开一个 `iframe`，其宽高是手机的尺寸，其路径是想要打开的页面路径。

当发现是在PC打开，且不在白名单内时，就跳转到 `/web-container?path=xxx` 的路由，`xxx` 就是之前的 `window.location.href`。

`web-container` 页面内是一个 `iframe`，会拿到页面的 `query.path`，将其作为 `iframe` 的 `src`。

当子应用页面跳转时，调用 `window.parent.history.replaceState`，更新 `query.path`，这样刷新页面，不会跳转到其他地方。

当发现是手机浏览器打开时，且当前是 `web-container` 模式，就 `router.replace` 到真正的页面，即去掉子应用。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/12/own_mike_6908e2b6ef5ea73567.png" width="500">

#### 4.4. 其他

1. 支持兜底路由（404页面重定向到首页）
2. 跳转二级页面时，携带已有的信息并展示。举例，从赛点列表到子赛事详情跳转时，会携带 Banner、活动名称等，并先展示出来，接口返回后，显示其他信息。这里不能放到 `url` 里，否则 `url` 过长，复制后用户体验差。并且需有容量控制，防止超出限制而报错。
3. 核心页面增加骨架屏

### 5. 总结

和平赛场采取了一系列措施，保证代码“长青”，并优化了性能和用户体验，后面会继续加强、持续优化。

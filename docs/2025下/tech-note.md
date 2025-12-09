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


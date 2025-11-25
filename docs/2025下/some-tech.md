在 React 函数组件中，每一次 UI 的变化，都是通过重新执行整个函数来完成的，这和传统的 Class 组件有很大区别：函数组件中并没有一个直接的方式在多次渲染之间维持一个状态。

---

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

https://github.com/Automattic/node-canvas/issues/1825

安装失败 node-pre-gyp install --fallback-to-build --update-binary

---

想拷贝目录里面的内容而不是目录本身，就用斜杠加个星号 `cp –R src/* target`，想拷贝目录本身，就啥也不带 `cp –R src target` 就行了。

前者会变成 `target/file1、target/file2`，后者会变成 `target/src`。

---

1. `$uri`
nginx 中的 `$uri` 记录的是执行一系列内部重定向操作后最终传递到后端服务器的 URL

包含请求的文件名和路径，不包含包含“?”或“#”等参数。

比如，完整URL链接：`http://www.alipay.com/alipay/index.html`，对应的 `$uri`：`/alipay/index.html`

2. `$request_uri`
`$request_uri` 记录的是当前请求的原始URL（包含参数），如果没有执行内部重定向操作，`request_uri` 去掉参数后的值和 `uri` 的值是一样的。在线上环境中排查问题是，如果在后端服务器中看到的请求和 Nginx 中存放的 `request_uri` 无法匹配，可以考虑去uri里边进行查找。

包含请求的文件名和路径及所有参数

比如，完整URL链接：`http://www.alipay.com/alipay/index.html`，`$request_uri`：`/alipay/index.html#参数`

---

依赖预构建有两个目的:

1. CommonJS 和 UMD 兼容性: 开发阶段中，Vite 的开发服务器将所有代码视为原生 ES 模块。因此，Vite 必须先将作为 CommonJS 或 UMD 发布的依赖项转换为 ESM。

当转换 CommonJS 依赖时，Vite 会执行智能导入分析，这样即使导出是动态分配的（如 React），按名导入也会符合预期效果：

```ts
// 符合预期
import React, { useState } from 'react'
```

2. 性能： Vite 将有许多内部模块的 ESM 依赖关系转换为单个模块，以提高后续页面加载性能。

一些包将它们的 ES 模块构建作为许多单独的文件相互导入。例如，lodash-es 有超过 600 个内置模块！当我们执行 import { debounce } from 'lodash-es' 时，浏览器同时发出 600 多个 HTTP 请求！尽管服务器在处理这些请求时没有问题，但大量的请求会在浏览器端造成网络拥塞，导致页面的加载速度相当慢。

通过预构建 `lodash-es` 成为一个模块，我们就只需要一个 HTTP 请求了！

---

定位兼容性问题，可以直接把 `vconsole` 放到 `index.html` 中，看看错误日志

```html
<script src="https://image-1251917893.file.myqcloud.com/igame/npm/vconsole%403.15.1/vconsole.min.js"></script>
<script>
  // VConsole will be exported to `window.VConsole` by default.
  var vConsole = new window.VConsole();
</script>
```

---

`globalThis` 的 `polyfill` 和其他变量不一样，它自己本身是顶级变量，每个上下文都需要单独 `polyfill`，更好的做法是不用它。

---

`input` 标签 ，`type="number"` 时，`value` 不能传递 `null`，否则会被 uni-app 过滤

---


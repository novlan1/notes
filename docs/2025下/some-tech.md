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

`0.56*100` 精度丢失，`56.00000000000001`

---

在 GitHub 上查看文件时，可以按 “y” 键将 URL 更新为指向所查看文件精确版本的永久链接。

---

Vue3 全局组件声明的时候，不能加 `as any`。

比如 `app.component('GlobalComponent', GlobalComponent as any);`

只能 `app.component('GlobalComponent', GlobalComponent);`

---

Eslint 配置上 `parserOptions.project`，就会很慢。

参考：https://github.com/typescript-eslint/typescript-eslint/issues/1828#issuecomment-607213862

---

nginx 403，可能是由于启动用户和 nginx 工作用户不一致所致

参考：https://cloud.tencent.com/developer/article/1949092

---

玩游戏是进入心流最快的方式。

---

在 `src` 目录下找到包含 `@tencent/press-ui` 的文件，并打印文件名

```bash
grep -rl @tencent/press-ui src/
```

---

```bash
git clean -df
```

删除工作目录树中未跟踪的文件

---

- ifconfig，查看内网 IP 等信息
- curl ifconfig.me，查看外网 IP 信息
- date，查看系统时间
- cal，在终端中查看日历

- uptime，查看系统已经运行了多久，当前有几个用户等信息
- cat 文件路名，显示文件内容（属于打印语句）
- cat -n 文件名，显示文件，并每一行内容都编号

- env，查看所有系统变量
- export，查看所有系统变量
- netstat -tlunp，查看当前运行的服务，同时可以查看到：运行的程序已使用端口情况

- last，显示最近登录的帐户及时间
- lastlog，显示系统所有用户各自在最近登录的记录，如果没有登录过的用户会显示 从未登陆过

- df -h，自动以合适的磁盘容量单位查看磁盘大小和使用空间
- du -sh /opt，查看 opt 这个文件夹大小
- du -sh ./*，查看当前目录下所有文件夹大小
- du -sh /opt/setups/，显示 /opt/setups/ 目录所占硬盘空间大小（s 表示 –summarize 仅显示总计，即当前目录的大小。h 表示 –human-readable 以 KB，MB，GB 为单位，提高信息的可读性）

---

vim 删除所有内容

使用 `dd` 命令，`dd` 命令用于删除当前行。如果你想删除所有内容，可以结合使用范围命令。

1. 首先，移动到文件的开始处，可以使用 `gg` 命令。
2. 然后，使用 `dG` 命令删除从当前行到文件末尾的所有内容。

或者，你也可以这样做：`ggdG`

---

vim 显示行号

- `:set nu` 或 `:set number`

vim 显示不行号

- `:set nonu` 或 `:set nonumber`

---

独立分包模式（无需加载主包，性能更优）

- 一个子应用一个独立分包，不影响主包大小

普通分包模式

- 一个子应用一个普通分包，不影响主包大小

多分包模式

- 一个子应用可以有多个分包，分包目录外的会影响主包大小

主子应用公共插件

- 公共插件须在主包引入，从而影响主包大小


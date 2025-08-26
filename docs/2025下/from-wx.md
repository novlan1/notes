## 1. 笔记

- 可移植性好，比如 `markdown` 这种统一的格式
- 有历史记录，删除后可找回，比如放 `git` 上管理

## 2. CSRF

### 2.1. Cookie主要的一些特性

1. 发送HTTP请求时，浏览器默认自动携带本次请求域名的 `Cookie`（不管是通过什么方式，在什么页面发送的HTTP请求）
2. 读写 `Cookie` 有跨域限制(作用域，`Domain`，`Path`)
3. 生命周期(会话or持久)

### 2.2. CSRF的攻击过程

登录态 Cookie 的 Key 是浏览器默认自动携带的，Key 通常是会话 Cookie，只要浏览器不关闭，Key 一直存在。

所以只要用户A曾经登录过相册网站(这里用 `www.photo.com` 举例)，浏览器没有关闭，用户在没有关闭的浏览器打开一个黑客网页(这里用 `www.hacker.com`)，黑客页面发送HTTP请求到 `www.photo.com` 的后台会默认带上 `www.photo.com` 的登录态 Cookie，也就能模拟用户A做一些增删改等敏感操作。Get 和 Post 都一样，这就是CSRF攻击原理。

### 2.3. 读操作能否被攻击到？

上面说的增删改都是写操作，会对后台数据产生负面影响，所以是能被攻击的。另外一种读操作，是具有幂等性，不会对后台数据产生负面影响，能否被攻击到？读操作也可能是敏感数据，举个例子，比如 `www.photo.com` 上的私密相册数据能否被 `www.hacker.com` 页面拿到？这就涉及到前端跨域知识点了，默认大部分情况是拿不到，这里列举两种特殊情是可以拿到的：

- 如果后台返回的数据是 JSONP 格式的，这种只能是 Get 操作，是能被黑客页面拿到的。
- 如果后台是通过 CORS 处理跨域，没有对请求头的 Origin 做白名单限制，ACAO 响应头是`*`或者包括黑客页面，包括`Get/Post/Del`等操作，也是能被黑客页面拿到的。

除了这两种特殊情况，读操作都是不能被攻击到的，因为浏览器跨域限制是天然的安全的。

### 2.4. Token 方案防御 CSRF

上面讲到 Cookie 的一些特性的第二条，读写 Cookie 有跨域限制(作用域，Domain，Path)，所以我们可以用这个特性来区分是自己页面还是黑客页面。只要页面能读（或者写）`www.photo.com` 域名 Cookie，就证明是自己的页面。懂了原理，方案就很简单，比如服务器通过 `cookie` 下发一个 `token`，`token` 值是随机数，页面发请求的时候从 `cookie` 取出 `token` 通过HTTP请求参数传给后台，后台比对参数里的 `token` 和 `cookie` 里的 `token` 是否一致，如果一致就证明是自己页面发的请求，如果不一致就返回失败。防CSRF的方案就是这么简单，这种方法能够100%防CSRF。

### 2.5. Token是前台生产还是后台生产？

上面例子是后台生成传到前台的，大家发现其实后台并没有存这个 token，所以原理上前后台生成都可以，只要保证随机性。如果前端生成 token 然后写到 Cookie 里，然后HTTP请求参数也带上 token，后端逻辑一样比对参数里的token和cookie里的token是否一致，如果一致就证明是自己页面发的请求，如果不一致就返回失败。这就是Cookie读和写的差别，只要能读写自己域名的Cookie就是自己页面。

### 2.6. Token放在HTTP参数里的哪里？

放在URL的querystring里，Post请求的Data里或者HTTP请求头里，这三种方式都可以，只是有一点点细微的差别。如果querystring里，可能会影响Get请求的缓存效果，因为重新登录之后token会变，url也就变了，之前的缓存就失效了。如果放在HTTP请求头里，就需要使用fetch或者XHR发请求，这样会变成复杂请求，跨域情况需要多一次Option预检请求，对性能多少有一点点影响。

### 2.7. Cookie的SameSite属性可以么？

不好用，SameSite设计的目的貌似就是防CSRF，但是我觉得不好用，SameSite有三个值Strict/Lax/None，设置的太严格，会影响自己业务的体验，设置的太松没有效果，就算最严格Strict模式，也防不了我上面提到写操作用Get请求，UGC页面有自定义照片的情况。并且还有小部分老浏览器不支持，最终其实还是Token方案好用。

### 2.8. Cookie的HTTPOnly属性可以么？

不行，HTTPOnly表示这个Cookie只能是HTTP请求可以读写，js没有读写权限，浏览器还是会默认带上，所以登录态校验是通过的。如果设置了HTTPOnly还有副作用，上面说的Token方案就用不了了。

### 2.9. 验证码可以么？

不行，验证码是用来防机器暴力攻击的，验证码是用来确认敏感操作是自然人发送还是机器自动发送。这里举个图片验证码的例子，大概原理是前端通过img标签展示图片验证码给用户看(图片字母经过噪音处理的)，这个图片HTTP请求也会设置一个cookie如codeID=xxx(加密的),用户在输入框输入图片中展示的字母，敏感操作的HTTP请求通过参数把用户输入的code传给后台，后台拿到用户输入的code和cookie里的codeID(通常需要通过id查数据库)做比较，如果一致就通过。这种验证码系统能够防机器攻击，但是防不了CSRF，黑客同样可以在黑客的页面展示验证码给用户，通过诱导用户输入验证码完成攻击操作，只能是提高了CSRF攻击成功的门槛，但是只要黑客页面诱导信息劲爆还是有很大部分用户会上当的。因为用户不知道输入验证码后会产生什么影响。

题外话，验证码我在一些资料上看到说可以用来防CSRF，我个人觉得是不行的，包括手机验证码都不行，详细情况大家可以研究各种验证码的实现原理。我猜到有人可能有不同意见，非要构造一种能防CSRF的验证码技术上也是可行的。

## 3. K8S

用户 => 请求 => ingress => service => pod

1. `deployment` 包含了整个k8s的部署信息，字段包括 `containers`，`image`，`imagePullSecrets`
2. `ingress` 字段包括 `existLbId（clb id）`，`tls.secretName`
3. `service` 字段包括 `ports`（又包括 `name`，`port`，`protocol`，`targetPort`，`nodePort`）

## 4. Node

Node ＞ Pod ＞ 容器

## 5. powerlevel10k

powerlevel10k 主题配置

自定义配置命令： `p10k configure`

参考：https://www.haoyep.com/posts/zsh-config-oh-my-zsh/

## 6. Eslint 总是报错

```
TypeError: services.getTypeAtLocation is not a function
```

查看源码，是 `typescript-eslint` 的包相关，但是包里已经有导出了。

解决：删除 `node_modules`，重新 `pnpm i`，猜测有 `eslint` 缓存。

## 7. `~/.gitconfig` 配置

```bash
[user]
  name = novlan1
  email = 1576271227@qq.com
[includeIf "gitdir:~/Documents/git-woa/"]
  path = ~/.gitconfig-work
[pull]
  rebase = false
[init]
  defaultBranch = master
```

## 8. Vue3 中的 water

`vue3` 中使用 `water.foo(this)`，`foo` 中 `water = this`，这时 `water` 就不再是响应式了。

## 9. React 中 onTouchMove

React 中 `onTouchMove` 事件无法 `preventDefault`，因为默认是 `passive`。

解决办法是不用 `onTouchMove`，而是创建一个 `ref`，监听 `ref.current` 的 `touchmove` 事件。

参考：https://stackoverflow.com/questions/63663025/react-onwheel-handler-cant-preventdefault-because-its-a-passive-event-listener

## 10. :host

1. :root 和 :host 的区别？

- ​​`:root​`​ 用于全局样式，定义 CSS 变量，影响整个文档。
- ​​`:host​​` 用于 Web Components，定义组件自身的默认样式，不影响外部 DOM。

2. `<html>` 和 :root 有什么区别？​

- `html` 是元素选择器（优先级 0,0,1），而 `:root` 是伪类选择器（优先级 0,1,0）。
- `:root` 的优先级更高，适合定义全局变量。

3. :host 能访问 :root 定义的变量吗？​

可以！​​ Shadow DOM 仍然能访问外部的 `:root` 变量。

```scss
/* 全局 CSS */
:root {
  --main-color: blue;
}

/* Shadow DOM 内部 */
:host {
  color: var(--main-color); /* 可以使用全局变量 */
}
```

4. 为什么 :host 的样式有时不生效？​

- 可能是 ​​Shadow DOM 的隔离机制​​ 导致外部样式无法穿透。
- 可以尝试用 `:host-context()` 或 `::part()` 解决。

## 11. t-comm 标题

t-comm 文档中“引入”的标题，不能写 `###`，而要写 `<h3>`，前者会生成toc，后者不会。

## 12. picker-plus

问题：`picker-plus` 中点击确定，回调中的值不正确

原因：

1. `picker` 中有多列 `column`，`column` 在 `created` 的时候执行 `this[PARENT].children.push(this)`
2. 如果 `picker` 不销毁，`children` 也不重置，就会导致 `children` 跟实际的 `columns` 不匹配，会有额外的数据。

规避：

对于业务中来说，如果 `columns` 不同，就应该用不同的 `picker`，或者用 `v-if`，主动销毁 `picker`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_4QTkhRZYJ3BD4p6p.jpg" width="600"   />

## 13. CSS 中 box-shadow

语法：
`box-shadow: offset-x offset-y blur-radius spread-radius color inset;`

`inset` 可以出现在任何位置。`offset-x` 和 `offset-y` 必填。

1. 当给出两个、三个或四个 `<length>` 值时。

- 如果只给出两个值，那么这两个值将会被当作 `<offset-x><offset-y>` 来解释。
- 如果给出了第三个值，那么第三个值将会被当作 `<blur-radius>` 解释。
- 如果给出了第四个值，那么第四个值将会被当作 `<spread-radius>` 来解释。

2. 可选，inset关键字。
3. 可选，`<color>`值。

- `inset`： 如果没有指定inset，默认阴影在边框外，即阴影向外扩散。
- `offset-x/offset-y`： `<offset-x>` 设置水平偏移量，正值阴影则位于元素右边，负值阴影则位于元素左边。 `<offset-y>` 设置垂直偏移量，正值阴影则位于元素下方，负值阴影则位于元素上方。
- `blur-radius`：值越大，模糊面积越大，阴影就越大越淡。不能为负值。默认为 0，此时阴影边缘锐利。
- `spread-radius`： 取正值时，阴影扩大；取负值时，阴影收缩。默认为 0，此时阴影与元素同样大。

## 14. cp -n

`cp -n` 是 Linux/Unix 系统中 `cp` 命令的一个选项，用于避免覆盖已存在的目标文件。

```bash
cp -r -n cdn-hok-match/hok-match/* cdn-hok-match/hok-match-en
```

## 15. 端口说明（port、targetPort、nodePort 的区别）

在 Kubernetes 中，port、targetPort 和 nodePort 都是用于配置服务端口的属性，但它们的作用和使用场景有所不同。

1. port 是 Service 的端口，这是客户端访问服务时使用的端口号。Kubernetes Service 会在这个端口上监听，并将流量转发到后端 Pod 的 targetPort。例如，如果 port 设置为 9006，当客户端访问 my-service 服务时，会通过 9006 端口进行访问。

2. targetPort 是后端 Pod 的端口，这是实际运行服务的容器内的端口。Service 会将接收到的流量转发到后端 Pod 上这个端口。比如，如果 targetPort 设置为 9006，Kubernetes 会将 my-service 服务收到的流量转发到所有符合选择器的 Pod 的 9006 端口。

3. nodePort 是每个节点上的固定端口，这是一个在每个节点上开放的端口，使得可以从集群外部通过 `<节点IP>:<nodePort>` 访问服务。通常在 Service 类型为 NodePort 或 LoadBalancer 时使用。假设 nodePort 设置为 30006，这会在每个节点上开放 30006 端口，外部流量可以通过 <节点IP>:30006 访问服务。

下面是一个具体的例子，展示了如何在 Kubernetes 中配置和使用 port、targetPort 和 nodePort。假设我们有一个 Service 配置，且存在以下 IP 地址：

Kubernetes 中的 Service 实际上也是一个服务对象，一般来说它有一个内部的 IP 地址（headless service “无头服务”除外），这个 IP 地址在集群内部可以访问。

- 一个 Node 的 IP 地址是 192.168.1.1
- Service 的 ClusterIP 是 10.96.0.2
- 一个 Pod 的 IP 地址是 10.244.1.3

```
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: NodePort
  ports:
    - port: 9006
      targetPort: 9376
      nodePort: 30006
  selector:
    app: MyApp
```

- port: 9006：客户端在集群内部通过 my-service 服务名称和 9006 端口访问服务。
- targetPort: 9376：实际运行服务的 Pod 内部监听的端口。
- nodePort: 30006：在每个节点上开放的固定端口，允许从集群外部通过 <节点IP>:30006 访问服务。

工作流程

集群内部访问，`curl http://my-service:9006`

1. 集群内部的客户端访问 Service 时，使用 Service 名称 my-service 和端口 9006，例如：http://my-service:9006。
2. Kubernetes 会将流量发送到 Service 的 ClusterIP 10.96.0.2:9006。
3. Service 接收到流量后，会将其转发到符合选择器的 Pod 的 targetPort，即 10.244.1.3:9376。

集群外部访问，`curl http://192.168.1.1:30006`

1. 外部客户端访问 Service 时，通过节点 IP 192.168.1.1 和 nodePort 30006，例如：`http://192.168.1.1:30006`。
2. 流量进入节点 192.168.1.1:30006 后，Kubernetes 会将其转发到 Service 的 port，即 10.96.0.2:9006。
3. Service 接收到流量后，会将其转发到符合选择器的 Pod 的 targetPort，即 10.244.1.3:9376。

此命令将流量发送到节点 `192.168.1.1:30006`，然后 Kubernetes 将流量转发到 Service 的 `port 10.96.0.2:9006`，最终转发到pod。

## 16. Ingress

service 适用于「四层路由负载」，ingress 适用于「七层路由负载」。

用户首先定义 Ingress 资源，指定哪些外部请求应被路由到哪些内部服务。Ingress 资源本身只是定义了流量路由的规则，实际的流量转发则由 Ingress 控制器实现。Ingress 控制器是 Kubernetes 中的一个特殊组件，它会读取 Ingress 资源的定义，并根据这些定义动态配置自己的代理规则，管理底层的代理服务器，如 Nginx、Traefik 或 HAProxy 等。

Ingress 的主要功能包括：

-  基于 URL 路径或主机名路由请求。
- 处理 HTTPS 流量的 SSL/TLS 终结。
- 将外部请求路由到内部服务的反向代理功能。
- 在多个后端 Pod 之间均匀分配流量的负载均衡。
- 支持配置重定向、URL 重写和基于请求头的路由等自定义规则。

## 17. Deployment

Deployment 用于部署应用程序，并且用声明的方式升级应用程序。其中，Deployment 由 `ReplicaSet(1:N)` 组成，并且由 ReplicaSet 来创建和管理 Pod。

## 18. Service

1. 为什么需要服务(Service)

- `pod` 是短暂的, 随时都可能被销毁。
- 新的 `pod` 创建之前不能确定该 `pod` 分配的 `ip`
- 水平伸缩也就以为着多个 `pod` 可能提供相同的服务，客户端不想也不关心每个 `pod` 的 `ip`, 相反，客户端期望通过一个单一的 `ip` 地址进行访问多个 `pod`.

服务是一种为一组功能相同的 `pod` 提供单一不变的接入点的资源。当服务存在时，该服务的 `ip` 地址和端口（创建服务的时候，通过 `ports[n].port和ports[n].targetPort` 指定了服务端口到 `pod` 端口的映射）不会改变。客户端通过 `ip` 和 `port` 与服务建立连接，然后这些连接会被路由到提供该服务的某个 `pod` 上(通过负载均衡)。

2. 集群内部pod间通信
服务的后端可能不止有一个 pod, 服务通过标签选择器来指定哪些 pod 属于同一个组，然后连接到服务的客户端连接，服务会通过负载均衡路由到某个后端 pod。

3. 集群内部服务暴露给外部客户端

如果集群外部客户端需要访问集群内部的服务，则可以通过如下几种方式：

- NodePort类型服务
- LoadBalancer类型服务
- 通过Ingress暴露服务（通过一个IP地址公开多个服务）

## 19. Pod

1. 为什么需要pod

前边已经提到，容器被设计为每个容器只运行一个进程，那么多个进程就不能聚集在一个单独的容器，但是容器之间是彼此完全隔离的，多个进程分布在对应的多个容器中，进程之间无法做到资源共享（比如，前边提到到生产者/消费进程，他们通过共享内存和信号量来通信，但是如果生产者进程和消费者进程分布在两个容器中，则IPC是相互隔离的，导致无法通信）。所以我们需要一种更高级的结构来将容器绑定在一起，并且将它们作为一个单元进行管理(即：多个容器间共享某些资源)，这就是为什么需要pod的根本原理。

2. 了解pod

- 可以把 pod 看作一个独立的机器，一个 pod 中可以运行一个或者多个容器，这些容器之间共享相同的ip和port空间。
- 一个pod的所有容器都运行在同一个 worker node 中，一个 pod 不会跨越两个 worker node.
- 由于大多数容器的文件系统来自于容器镜像，所以每个容器的文件系统与其他容器是完全隔离的，但是可以试用 Volume 在容器间共享文件目录。
- pod 是短暂的， 他们随时的会启动或者关闭。也就是这如果某个 pod 被销毁之后，重新创建的pod的ip可能会变化。

3. Label

标签是一个可以附加到资源的任意 key-value 对（一个标签就是一个 `key/value` 对，每个资源可以拥有多个标签）， 然后通过 Selector (即标签选择器)来选择具有确切标签的资源。

4. ReplicaSet

前边我们通过手工创建了 dnsutil-pod, 如果 dsnutils-pod 由于 worker node 节点失败， 那么该 pod 也会消失，并且不会被新的替换。或者如果我们想创建 n 个 dnsutil-pod，只能通过手工创建吗？答案是：ReplicaSet (即副本控制器)

ReplicaSet 是一种 k8s 资源，通过它可以保持 pod 始终按照期望的副本数量运行。如果某个 pod 因为任何原因消失，则 ReplicaSet 会注意到缺少了的 pod，并且创建新的 pod 替代它。ReplicaSet 是一种期望式声明方式，我们只需要告诉它我期望的副本数量，而不用告诉它怎么做。

## 20. 容器

1. 虚拟机和容器的区别

每个虚拟机运行在自己的 Linux 内核上(每个VM可以安装不同版本的 linux 系统)，而容器都是调用同一个宿主机内核。

2. 容器技术和docker的关系

- docker用于将应用容器化。
- docker是容器技术的一个分支，rkt也是一个运行容器的平台，可以作为docker的替代方案。

3. k8s 和 docker 的关系

docker 是 k8s 最初唯一支持的容器类型，但是现在k8s也开始支持 rkt 以及其他的容器类型，不应该错误的认为 k8s 是一个专门为 docker 容器设计的容器编排系统。

4. 为什么多个容器比单个容器中包含多个进程要好

容器之所以被设计为单个容器只运行一个进程（除非进程本身产生子进程），是因为如果单个容器中运行多个不相关的进程，那么开发人员需要保持这些所有进程都运行OK, 并且管理他们的日志等（比如，两个进程，其中一个生产者进程，一个消费者进程，如果消费者进程crash之后，我们需要考虑该进程重启的机制）。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_kezRn8EibyFmH5Ns.jpg" width="600" />

## 21. Tailwind CSS 与 UnoCSS

1. Tailwind CSS 是一个 CSS 框架（Library），提供了预定义的实用类（Utility Classes）。开发者可以通过组合这些类快速构建 UI。

2. UnoCSS 更像是一个原子 CSS 引擎（Engine），其核心是按需（on-demand）生成 CSS 的机制。通过 Preset 配置，它可以模仿 Tailwind CSS 的行为，同时也能实现其他不同的风格。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_8kySPmsEjxhEyxpe.jpg" width="380" />

## 22. 重构

**在重构一个屎山项目时，最重要的指标就是如何保证下一次重构不会很快到来**。

所以**重构的技术方案中必须要包含如何让代码“保鲜”的方法，否则重构结束后，换一拨人维护几个来回，整个代码仓库又会迅速劣化成屎山**。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_3iWnazMYJEmBhxBa.jpg" width="300" />

## 23. 意义

一个小提示，在公司里，老板们让你做的，对你的评价，以及希望你进步的方向，最大受益人是老板而不是你。如果你打算在公司里做到退休,可以按照老板们的要求做。但是如果你发现你做的这些事情对你离开公司后没有任何帮助，你就得审思一下这些事情有没有意义。得把平台的成功和自己的成功分开来。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_d5naXmZckpYMaaMT.jpg" width="300" />

## 24. 连不上办公网怎么办

打开目录：`/Library/Preferences/SystemConfiguration/`

删除 `.plist` 后缀的文件

```
com.apple.airport.preferences.plist
com.apple.network.identification.plist
com.apple.wifi.message-tracer.plist
NetworkInterfaces.plist
preferences.plist
```

重启电脑，然后再在IOA重新配置 T-WiFi 看看

## 25. PR

1. PR（Pull Request）如果给其它项目提交合并代码的请求时，就说会提交一个PR。

2. WIP（Work In Progress ）如果你要做一个很大的改动，可以在完成部分的情况下先提交，但说明WIP，方便项目维护人员知道你还在 Work，同时他们可以先审核已经完成的。

3. PTAL(Please Take A Look):请求项目维护人员进行 code review。

4. TBR(To Be Reviewed)提示这些代码要进行审核。

5. TL(Too Long)/DR(Didn’t Read): 太长了，懒得看。

6. LGTM(Looks Good To Me):通常是 code review 的时候回复的，即审核通过的意思。

7. SGTM(Sounds Good To Me):跟 LGTM 同义。

8. AFAIK(As Far As I Know):据我所知。

9. CC(Carbon Copy):抄送。

## 26. TextEllipsis

TextEllipsis 组件核心

1. H5下在 `body` 下动态生成 Dom（暂称为 `container`），该DOM是不可见的，可以设置为 `fixed`，`zIndex` 和 `top` 巨低，其他样式属性和组件文本一样。具体是通过  window.getComputedStyle(this.$refs.root) 拿到 `offsetHeight`、`lineHeight`、`padding` 等值，然后设置到 `container` 上， `container.style.setProperty(name, originStyle.getPropertyValue(name))`

2. 通过上面的值判断是否需要收起，最大可展示高度 `maxHeight` 计算公式为 `(rows + 0.5) * lineHeight + paddingTop + paddingBottom`，如果 `maxHeight` 小于 `offsetHeight`，说明需要收起

3. 省略位置的计算是通过二分法得到的，每次二分都会将当前结果加上 `expandText`（展开），插入到 `container` 的 `innerHtml` 和 `innerText` 中，这样可以获取最新的 `offsetHeight`，然后再通过第2步的公式比较

4. 直到满足条件，即找到精确的省略位置，让文字正好占满 `rows` 行

小程序核心

1. 无法动态生成 DOM，需要在组件内部先手动预埋一个 DOM
2. 预埋的 DOM 的 `offsetHeight`、`lineHeight` 属性的获取是异步的，意味着二分法获取精确省略位置的步骤也都要变成异步

3. 二分法中改变 `innerText/innerHtml` 的行为，在小程序下只能变成修改 DOM 内的文本变量
4. 由于小程序文本布局和 H5 不完全相同，可能导致最后的展示效果超过了 rows 行。这里的解决办法是设置 `adjustString`，防止超行

5. 小程序下不支持 `action Slot`。因为小程序不支持操作 `html`，所以二分法中无法将 `slot` 的 `html` 插入到 `container` 的 `innerHTML` 中，也就拿不到 slot 的具体宽度，从而找不到精确的省略位置

## 27. Signature

Signature 组件的核心是 `touchmove` 的时候，获取 `touch` 的 `x` 和 `y`，然后画在 `canvas` 上。

## 28. Barrage

Barrage 弹幕组件核心

1. 根据数据动态生成 `items`，遍历 `items`，生成 dom
2. 动画用了 `animation`，而不是 `transition`，从 `translateX(110%)`，到 `translateX(var(--move-distance))`
3. 其中 CSS 变量 `--move-distance` 是从JS中获取外层宽度，然后设置到 `rootStyle` 中

H5 和小程序实现的不同

1. H5 可以先生成 item 的 dom，然后插入到 wrapRef 的里面，再获取其 offsetHeight，然后设置 item 的 top 值。top 值保证弹幕分层，不挤在一起。
2. 小程序不能动态生成 dom，采用的方案是 v-for 遍历 items 数组。因为无法动态计算高度值，需要父组件额外传入 itemHeight。

## 29. RollingText

RollingText 组件

1. 核心是每列都生成一堆数字（figureArr），动画就是改变每列的 `translateY`，从0 到一个很小的负值（`translatePx`），或者从 `translatePx` 到 `0`，前者是向上，后者是向下。

2. `translatePx` 就是负的单个数字的 `height * （figureArr.length - 1`

3. `figureArr` 的生成，`start - 9`, 两次 `0 - 9`，`0 - target`

4. 此外，每个数字的动画间隔，即 delay 为 `.2s`

## 30. copy-webpack-plugin

uni-app 项目使用 pnpm 后，业务需要安装 `copy-webpack-plugin`，否则会找不到，导致版本判断失败，`options.patterns` 格式传递错误

```
ValidationError: Invalid options object. Copy Plugin has been initialized using an options object that does not match the API schema.
 - options.patterns should be a non-empty array.
    at validate (/data/landun/workspace/node_modules/copy-webpack-plugin/node_modules/schema-utils/dist/validate.js:158:11)
    at new CopyPlugin (/data/landun/workspace/node_modules/copy-webpack-plugin/dist/index.js:171:5)
    at /data/landun/workspace/node_modules/@dcloudio/vue-cli-plugin-uni/lib/configure-webpack.js:199:20
```

## 31. PullDownRefresh

PullDownRefresh 组件

onTouchMove 中，也就是下拉过程中可能产生两种状态：

1. `pulling` 下拉
2. `loosing` 下拉距离大于 `loadingBarHeight`

onTouchEnd 中，会判断 status 是否为 loosing，如果是则会进入 refresh 方法

`refresh` 中，会将 `distance` 置为 `loadingBarHeight`，状态置为 `loading`，然后生成一个唯一的 `timer`，利用 `Promise.race`，判断 `timer` 和 `onRefresh` 哪个返回的早，如果是 `onRefresh`, 则状态置为 `success`，否则代表超时，则恢复 `status` 为 `normal`

## 32. PullDownRefresh

PullDownRefresh 组件

tdesign-mobile-vue 实现不同，`status` 不直接设置，而是根据 `value/distance/loadingBarHeight/afterLoading` 等值计算而来

## 33. Color Picker

颜色选择器组件，切换 `saturation` 后，不能用 `update`，否则可能会在边界处都重置为`0，0，0`，即黑色，因为 `tinycolor` 中黑色只有一个点，而 `hsv` 中是一些线

## 34. 非 uni-app 项目模拟 windowTop

设置：

```js
document.documentElement.style.setProperty('--window-top', '44px');
```

取值：

```js
const style = document.documentElement.style;
parseInt((style.getPropertyValue('--window-top').match(/\d+/) || ['0'])[0])
```

`windowTop` 使用到的地方

1. `getBoundingClient()` 中的 `top` 和 `bottom`
2. `touch`事件中的 `pageY` `clientY`
3. `windowHeight`

## 35. @import

uni-app 会把 `uni.scss` 放到业务每个 `scss` 前面，所以 `@import` 改成 `@use`，会报错 `‘@use rules must be written before any other rules’`

`legacy-js-api` 的警告，也是因为uni-app中使用了 `nodesass` 的 `renderSync`

## 36. Vue3 跨端

1. 大坑，`$router.push({name})`，会有缓存，用 `uni.navigateTo` 没有

2. 小程序 vue3 不能使用 `component.$scope?.setData(props)`

3. 不能动态引用 `()=import('')`，qq小程序的组件打包不会生成 `qq.createComponent`，而是 `export default`

4. `template` 中 `:key` 位置错误，会导致编译失败

5. `location.search` 可能拿不到 `query`，比如 `#/?xxx=xxx`，这种不合法的 `query`

6. vue3 app 上拿不到 `projectMixin` 上的变量

7. 子组件中如果要抛出 `input` 和 `search` 事件，必须要声明 `emits`

## 37. 响应式

之前的模拟响应式用的是 `New Vue({ data() {}, computed: {} })`，比如

```ts
const $location = new Vue({
  data() {
    return {
      host: '',
      origin: '',
      hostname: '',
      pathname: '',
      protocol: 'https:',
    };
  },
  computed: {
    href: {
      set(this: any, newVal) {
        this.$router.push({ name: 'webview', query: { url: newVal } });
      },
      get() {
        return getCurUrl() || getDefaultUrl() || '';
      },
    },
  },
  methods: {
    reload() {
      refreshCurrentPage();
    },
  },
});
```

现在改成 `reactive` + `computed`，比如

```ts
const $location = reactive({
  host: '',
  origin: '',
  hostname: '',
  pathname: '',
  protocol: 'https:',

  href: computed({
    set(this: any, newVal) {
      uni.navigateTo({ url: `/views/webview?url=${newVal}` });
    },
    get() {
      return getCurUrl() || getDefaultUrl() || '';
    },
  }),

  reload() {
    refreshCurrentPage();
  },
});
```

之前的 `methods`，现在也都是 `reactive` 的一份子


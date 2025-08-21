## 1. CSRF

### 1.1. Cookie主要的一些特性

1. 发送HTTP请求时，浏览器默认自动携带本次请求域名的Cookie（不管是通过什么方式，在什么页面发送的HTTP请求）
2. 读写Cookie有跨域限制(作用域，Domain，Path)
3. 生命周期(会话or持久)

### 1.2. CSRF的攻击过程

登录态Cookie的Key是浏览器默认自动携带的，Key通常是会话Cookie，只要浏览器不关闭，Key一直存在。
所以只要用户A曾经登录过相册网站(这里用www.photo.com举例)，浏览器没有关闭，用户在没有关闭的浏览器打开一个黑客网页(这里用www.hacker.com)，黑客页面发送HTTP请求到www.photo.com的后台会默认带上www.photo.com的登录态Cookie，也就能模拟用户A做一些增删改等敏感操作。Get和Post都一样，这就是CSRF攻击原理。

### 1.3. 读操作能否被攻击到？

上面说的增删改都是写操作，会对后台数据产生负面影响，所以是能被攻击的。另外一种读操作，是具有幂等性，不会对后台数据产生负面影响，能否被攻击到？读操作也可能是敏感数据，举个例子，比如www.photo.com上的私密相册数据能否被www.hacker.com页面拿到？这就涉及到前端跨域知识点了，默认大部分情况是拿不到，这里列举两种特殊情是可以拿到的：

* 如果后台返回的数据是JSONP格式的，这种只能是Get操作，是能被黑客页面拿到的。
* 如果后台是通过CORS处理跨域，没有对请求头的Origin做白名单限制，ACAO响应头是*或者包括黑客页面，包括Get/Post/Del等操作，也是能被黑客页面拿到的。

除了这两种特殊情况，读操作都是不能被攻击到的，因为浏览器跨域限制是天然的安全的。

### 1.4. Token 方案防御 CSRF

上面讲到Cookie的一些特性的第二条，读写Cookie有跨域限制(作用域，Domain，Path)，所以我们可以用这个特性来区分是自己页面还是黑客页面。只要页面能读（或者写）www.photo.com域名Cookie，就证明是自己的页面。懂了原理，方案就很简单，比如服务器通过cookie下发一个token，token值是随机数，页面发请求的时候从cookie取出token通过HTTP请求参数传给后台，后台比对参数里的token和cookie里的token是否一致，如果一致就证明是自己页面发的请求，如果不一致就返回失败。防CSRF的方案就是这么简单，这种方法能够100%防CSRF。

### 1.5. Token是前台生产还是后台生产？

上面例子是后台生成传到前台的，大家发现其实后台并没有存这个token，所以原理上前后台生成都可以，只要保证随机性。如果前端生成token然后写到Cookie里，然后HTTP请求参数也带上token，后端逻辑一样比对参数里的token和cookie里的token是否一致，如果一致就证明是自己页面发的请求，如果不一致就返回失败。这就是Cookie读和写的差别，只要能读写自己域名的Cookie就是自己页面。

### 1.6. Token放在HTTP参数里的哪里？

放在URL的querystring里，Post请求的Data里或者HTTP请求头里，这三种方式都可以，只是有一点点细微的差别。如果querystring里，可能会影响Get请求的缓存效果，因为重新登录之后token会变，url也就变了，之前的缓存就失效了。如果放在HTTP请求头里，就需要使用fetch或者XHR发请求，这样会变成复杂请求，跨域情况需要多一次Option预检请求，对性能多少有一点点影响。

### 1.7. Cookie的SameSite属性可以么？

不好用，SameSite设计的目的貌似就是防CSRF，但是我觉得不好用，SameSite有三个值Strict/Lax/None，设置的太严格，会影响自己业务的体验，设置的太松没有效果，就算最严格Strict模式，也防不了我上面提到写操作用Get请求，UGC页面有自定义照片的情况。并且还有小部分老浏览器不支持，最终其实还是Token方案好用。

### 1.8. Cookie的HTTPOnly属性可以么？

不行，HTTPOnly表示这个Cookie只能是HTTP请求可以读写，js没有读写权限，浏览器还是会默认带上，所以登录态校验是通过的。如果设置了HTTPOnly还有副作用，上面说的Token方案就用不了了。

### 1.9. 验证码可以么？

不行，验证码是用来防机器暴力攻击的，验证码是用来确认敏感操作是自然人发送还是机器自动发送。这里举个图片验证码的例子，大概原理是前端通过img标签展示图片验证码给用户看(图片字母经过噪音处理的)，这个图片HTTP请求也会设置一个cookie如codeID=xxx(加密的),用户在输入框输入图片中展示的字母，敏感操作的HTTP请求通过参数把用户输入的code传给后台，后台拿到用户输入的code和cookie里的codeID(通常需要通过id查数据库)做比较，如果一致就通过。这种验证码系统能够防机器攻击，但是防不了CSRF，黑客同样可以在黑客的页面展示验证码给用户，通过诱导用户输入验证码完成攻击操作，只能是提高了CSRF攻击成功的门槛，但是只要黑客页面诱导信息劲爆还是有很大部分用户会上当的。因为用户不知道输入验证码后会产生什么影响。

题外话，验证码我在一些资料上看到说可以用来防CSRF，我个人觉得是不行的，包括手机验证码都不行，详细情况大家可以研究各种验证码的实现原理。我猜到有人可能有不同意见，非要构造一种能防CSRF的验证码技术上也是可行的。

## 2. K8S

用户 => 请求 => ingress => service => pod

1. `deployment` 包含了整个k8s的部署信息，字段包括 `containers`，`image`，`imagePullSecrets`
2. `ingress` 字段包括 `existLbId（clb id）`，`tls.secretName`
3. `service` 字段包括 `ports`（又包括 `name`，`port`，`protocol`，`targetPort`，`nodePort`）

## 3. Node

Node ＞ Pod ＞ 容器

## 4. powerlevel10k

powerlevel10k 主题配置

自定义配置命令： `p10k configure`

参考：https://www.haoyep.com/posts/zsh-config-oh-my-zsh/

## 5. Eslint 总是报错

```
TypeError: services.getTypeAtLocation is not a function
```

查看源码，是 `typescript-eslint` 的包相关，但是包里已经有导出了。

解决：删除 `node_modules`，重新 `pnpm i`，猜测有 `eslint` 缓存。

## 6. `~/.gitconfig` 配置

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

## 7. Vue3 中的 water

`vue3` 中使用 `water.foo(this)`，`foo` 中 `water = this`，这时 `water` 就不再是响应式了。

## 8. React 中 onTouchMove

React 中 `onTouchMove` 事件无法 `preventDefault`，因为默认是 `passive`。

解决办法是不用 `onTouchMove`，而是创建一个 `ref`，监听 `ref.current` 的 `touchmove` 事件。

参考：https://stackoverflow.com/questions/63663025/react-onwheel-handler-cant-preventdefault-because-its-a-passive-event-listener

## 9. :host

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

## 10. t-comm 标题

t-comm 文档中“引入”的标题，不能写 `###`，而要写 `<h3>`，前者会生成toc，后者不会。

## 11. picker-plus

问题：`picker-plus` 中点击确定，回调中的值不正确

原因：

1. `picker` 中有多列 `column`，`column` 在 `created` 的时候执行 `this[PARENT].children.push(this)`
2. 如果 `picker` 不销毁，`children` 也不重置，就会导致 `children` 跟实际的 `columns` 不匹配，会有额外的数据。

规避：

对于业务中来说，如果 `columns` 不同，就应该用不同的 `picker`，或者用 `v-if`，主动销毁 `picker`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/8/own_mike_4QTkhRZYJ3BD4p6p.jpg" width="600"   />

## 12. CSS 中 box-shadow

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

## 13. cp -n

`cp -n` 是 Linux/Unix 系统中 `cp` 命令的一个选项，用于避免覆盖已存在的目标文件。

```bash
cp -r -n cdn-hok-match/hok-match/* cdn-hok-match/hok-match-en
```

## 14. 端口说明（port、targetPort、nodePort 的区别）

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

## 15. Ingress

service 适用于「四层路由负载」，ingress 适用于「七层路由负载」。

用户首先定义 Ingress 资源，指定哪些外部请求应被路由到哪些内部服务。Ingress 资源本身只是定义了流量路由的规则，实际的流量转发则由 Ingress 控制器实现。Ingress 控制器是 Kubernetes 中的一个特殊组件，它会读取 Ingress 资源的定义，并根据这些定义动态配置自己的代理规则，管理底层的代理服务器，如 Nginx、Traefik 或 HAProxy 等。

Ingress 的主要功能包括：

-  基于 URL 路径或主机名路由请求。
- 处理 HTTPS 流量的 SSL/TLS 终结。
- 将外部请求路由到内部服务的反向代理功能。
- 在多个后端 Pod 之间均匀分配流量的负载均衡。
- 支持配置重定向、URL 重写和基于请求头的路由等自定义规则。

## 16. Deployment

Deployment 用于部署应用程序，并且用声明的方式升级应用程序。其中，Deployment 由 ReplicaSet(1:N) 组成，并且由 ReplicaSet 来创建和管理Pod。

## 17. Service

1. 为什么需要服务(Service)

- pod是短暂的, 随时都可能被销毁。
- 新的pod创建之前不能确定该pod分配的ip
- 水平伸缩也就以为着多个pod可能提供相同的服务，客户端不想也不关心每个pod的ip, 相反，客户端期望通过一个单一的ip地址进行访问多个pod.

服务是一种为一组功能相同的pod提供单一不变的接入点的资源。当服务存在时，该服务的ip地址和端口（创建服务的时候，通过ports[n].port和ports[n].targetPort 指定了服务端口到pod端口的映射）不会改变。客户端通过ip和port与服务建立连接，然后这些连接会被路由到提供该服务的某个pod上(通过负载均衡)。

2. 集群内部pod间通信
服务的后端可能不止有一个pod, 服务通过标签选择器来指定哪些pod属于同一个组，然后连接到服务的客户端连接，服务会通过负载均衡路由到某个后端pod。

3. 集群内部服务暴露给外部客户端

如果集群外部客户端需要访问集群内部的服务，则可以通过如下几种方式：

- NodePort类型服务
- LoadBalancer类型服务
- 通过Ingress暴露服务（通过一个IP地址公开多个服务）

## 18. Pod

1. 为什么需要pod

前边已经提到，容器被设计为每个容器只运行一个进程，那么多个进程就不能聚集在一个单独的容器，但是容器之间是彼此完全隔离的，多个进程分布在对应的多个容器中，进程之间无法做到资源共享（比如，前边提到到生产者/消费进程，他们通过共享内存和信号量来通信，但是如果生产者进程和消费者进程分布在两个容器中，则IPC是相互隔离的，导致无法通信）。所以我们需要一种更高级的结构来将容器绑定在一起，并且将它们作为一个单元进行管理(即：多个容器间共享某些资源)，这就是为什么需要pod的根本原理。

2. 了解pod

- 可以把pod看作一个独立的机器，一个pod中可以运行一个或者多个容器，这些容器之间共享相同的ip和port空间。
- 一个pod的所有容器都运行在同一个woker node中，一个pod不会跨越两个worker node.
- 由于大多数容器的文件系统来自于容器镜像，所以每个容器的文件系统与其他容器是完全隔离的，但是可以试用Volume在容器间共享文件目录。
- pod是短暂的， 他们随时的会启动或者关闭。也就是这如果某个pod被销毁之后，重新创建的pod的ip可能会变化。

3. Label

标签是一个可以附加到资源的任意key-value对（一个标签就是一个key/value对，每个资源可以拥有多个标签）， 然后通过Selector(即标签选择器)来选择具有确切标签的资源。

4. ReplicaSet

前边我们通过手工创建了dnsutil-pod, 如果dsnutils-pod由于worker node节点失败， 那么该pod也会消失，并且不会被新的替换。或者如果我们想创建n个dnsutil-pod，只能通过手工创建吗？答案是：ReplicaSet(即副本控制器)
ReplicaSet是一种k8s资源，通过它可以保持pod始终按照期望的副本数量运行。如果某个pod因为任何原因消失，则ReplicaSet会注意到缺少了的pod,并且创建新的pod替代它。ReplicaSet是一种期望式声明方式，我们只需要告诉它我期望的副本数量，而不用告诉它怎么做。

## 19. 容器

1. 虚拟机和容器的区别

每个虚拟机运行在自己的 Linux 内核上(每个VM可以安装不同版本的 linux 系统)，而容器都是调用同一个宿主机内核。

2. 容器技术和docker的关系

- docker用于将应用容器化。
- docker是容器技术的一个分支，rkt也是一个运行容器的平台，可以作为docker的替代方案。

3. k8s 和 docker 的关系

docker 是 k8s 最初唯一支持的容器类型，但是现在k8s也开始支持 rkt 以及其他的容器类型，不应该错误的认为 k8s 是一个专门为 docker 容器设计的容器编排系统。

4. 为什么多个容器比单个容器中包含多个进程要好

容器之所以被设计为单个容器只运行一个进程（除非进程本身产生子进程），是因为如果单个容器中运行多个不相关的进程，那么开发人员需要保持这些所有进程都运行OK, 并且管理他们的日志等（比如，两个进程，其中一个生产者进程，一个消费者进程，如果消费者进程crash之后，我们需要考虑该进程重启的机制）。


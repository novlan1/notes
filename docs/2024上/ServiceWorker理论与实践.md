### 1. 开始

Service Worker 本质上也是浏览器缓存资源用的，只不过他不仅仅是 `cache`，也是通过 `worker` 的方式来进一步优化。Service Worker 基于 h5 的 web worker，所以绝对不会阻碍当前 js 线程的执行，sw 最重要的工作原理就是

- 后台线程：独立于当前网页线程；
- 网络代理：在网页发起请求时代理，来缓存文件——因为 Service Worker 中涉及到请求拦截，出于对安全问题的考虑，所以必须使用 HTTPS 协议来保障安全

注意点：

- Service worker 运行在 worker 上下文，因此它不能访问 DOM。相对于驱动应用的主 JavaScript 线程，它运行在其他线程中，所以不会造成阻塞。它**设计为完全异步**，同步API（如 XHR 和 localStorage）不能在 service worker 中使用。
- 不同于普通 Worker，Service Worker 是一个**浏览器中的进程而不是浏览器内核下的线程**（Service Worker是走的另外的线程,可以理解为在浏览器背后默默运行的一个线程,或者说是独立于当前页面的一段运行在浏览器后台进程里的脚本。）因此它在被注册安装之后，**能够被在多个页面中使用，也不会因为页面的关闭而被销毁**。
- 出于对安全问题的考虑，Service Worker **只能被使用在 https 或者本地的 localhost 环境**下。

### 2. Service Worker的使用

#### 2.1. register

要使用 Service worker，首先需要注册一个 sw，通知浏览器为该页面分配一块内存，然后 sw 就会进入安装阶段。

```ts
navigator.serviceWorker.register(path,object）
```

- path: service worker 文件的路径，请注意：这个文件路径是相对于 Origin ，而不是当前 JS 文件的目录的
- object： Serivce Worker 的配置项，可选填，其中比较重要的是 scope 属性，它是 Service Worker 控制的内容的子目录

```js
"serviceWorker" in navigator && window.addEventListener("load",()=>{
  var e = location.pathname.match(/\/news\/[a-z]{1,}\//)[0] + "article-sw.js?v=hash";
  navigator.serviceWorker.register(e).then((n)=> {
    n.onupdatefound = function() {
      var e = n.installing;
      e.onstatechange = function() {
        switch (e.state) {
          case "installed":
            navigator.serviceWorker.controller ? console.log("New or updated content is available.") : console.log("Content is now available offline!");
            break;
          case "redundant":
            console.error("The installing service worker became redundant.")
        }
      }
    }
  }).
  catch(function(e) {
    console.error("Error during service worker registration:", e)
  })
})
```

前面提到过，由于 sw 会监听和代理所有的请求，所以 sw 的作用域就显得额外的重要了，比如说我们只想监听我们专题页的所有请求，就在注册时指定路径：`navigator.serviceWorker.register('/topics/sw.js')`;这样就只会对 `topics/` 下面的路径进行优化。

#### 2.2. installing

注册完 Service Worker 之后，浏览器会为我们自动安装它，因此我们就可以在 Service Worker 文件中监听它的 `install` 事件了。

```js
//service worker安装成功后开始缓存所需的资源
var CACHE_PREFIX = 'cms-sw-cache';
var CACHE_VERSION = '0.0.20';
var CACHE_NAME = CACHE_PREFIX+'-'+CACHE_VERSION;
var allAssets = [
    './main.css'
];
self.addEventListener('install', (event)=> {
    //调试时跳过等待过程
    self.skipWaiting();

    // Perform install steps
    //首先 event.waitUntil 你可以理解为 new Promise，
    //它接受的实际参数只能是一个 promise，因为,caches 和 cache.addAll 返回的都是 Promise，
    //这里就是一个串行的异步加载，当所有加载都成功时，那么 SW 就可以下一步。
    //另外，event.waitUntil 还有另外一个重要好处，它可以用来延长一个事件作用的时间，
    //这里特别针对于我们 SW 来说，比如我们使用 caches.open 是用来打开指定的缓存，但开启的时候，
    //并不是一下就能调用成功，也有可能有一定延迟，由于系统会随时睡眠 SW，所以，为了防止执行中断，
    //就需要使用 event.waitUntil 进行捕获。另外，event.waitUntil 会监听所有的异步 promise
    //如果其中一个 promise 是 reject 状态，那么该次 event 是失败的。这就导致，我们的 SW 开启失败。
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(function(cache) {
          console.log('[SW]: Opened cache');
          return cache.addAll(allAssets);
        })
    );
}
```

安装时，sw 就开始缓存文件了，会检查所有文件的缓存状态，如果都已经缓存了，则安装成功，进入下一阶段。

#### 2.3. activated

同样的，Service Worker 在安装完成后会被激活，所以我们也可监听 `activate` 事件。这时，我们可以在 Chrome 的开发者工具中看到我们注册的 Service Worker。

如果是第一次加载 sw，在安装后，会直接进入 `activated` 阶段，而如果sw进行更新，情况就会显得复杂一些。流程如下：

- 首先老的 sw 为A，新的 sw 版本为B。
- B 进入 install 阶段，而 A 还处于工作状态，所以 B 进入 `waiting` 阶段。只有等到 A 被 `terminated` 后，B 才能正常替换A的工作。

这个 `terminated` 的时机有如下几种方式：

1. 关闭浏览器一段时间；
2. 手动清除 Service Worker；
3. 在sw安装时直接跳过waiting阶段

然后就进入了 `activated` 阶段，激活 sw 工作。

`activated` 阶段可以做很多有意义的事情，比如更新存储在 cache 中的 key 和 value：

```js
var CACHE_PREFIX = 'cms-sw-cache';
var CACHE_VERSION = '0.0.20';
/**
 * 找出对应的其他key并进行删除操作
 * @returns {*}
 */
function deleteOldCaches() {
    return caches.keys().then(function (keys) {
        var all = keys.map(function (key) {
            if (key.indexOf(CACHE_PREFIX) !== -1 && key.indexOf(CACHE_VERSION) === -1){
                console.log('[SW]: Delete cache:' + key);
                return caches.delete(key);
            }
        });
        return Promise.all(all);
    });
}
//sw激活阶段,说明上一sw已失效
self.addEventListener('activate', function(event) {
    event.waitUntil(
        // 遍历 caches 里所有缓存的 keys 值
        caches.keys().then(deleteOldCaches)
    );
});
```

#### 2.4. idle

这个空闲状态一般是不可见的，这种一般说明sw的事情都处理完毕了，然后处于闲置状态了。

浏览器会周期性的轮询，去释放处于 `idle` 的 sw 占用的资源。

#### 2.5. fetch

该阶段是 sw 最为关键的一个阶段，用于拦截代理所有指定的请求，并进行对应的操作。

所有的缓存部分，都是在该阶段，这里举一个简单的例子：

```js
//监听浏览器的所有fetch请求，对已经缓存的资源使用本地缓存回复
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                //该fetch请求已经缓存
                if (response) {
                    return response;
                }
                return fetch(event.request);
                }
            )
    );
});
```

Service Worker 生命周期图

<img src="https://cdn.uwayfly.com/article/2024/5/own_mike_1cd3e000315251ce4d.png" width="600" />

### 3. 缓存策略

#### 3.1. Stale-While-Revalidate

倾向于当存在缓存文件时，尽可能快地利用缓存返回响应。当无缓存存在时这种策略就会失效，网络请求只用于更新缓存。

这种 Strategies 适用于对实时数据要求不高的应用。

#### 3.2. Cache First （缓存不行了就走网络）

当要请求的资源在缓存中存在时，**会优先使用缓存中的文件而不发起网络请求**。而**如果请求的资源缓存中不存在时 Serevice Worker 会发起网络请求**，并缓存该请求返回的结果，作为下一次发起相同请求时的回应。

#### 3.3. Network First（网络不行了就走缓存）

如果你的应用需要频繁的网络请求，Network first 将是一个理想的方案。**如果网络可用，那么应用中的每个请求将通过网络请求，并保存为缓存，一旦网络不可用，就会使用缓存中的内容**。

#### 3.4. Network Only

不对请求进行缓存，只使用网络请求的资源。这种 Strategies 的应用场景一般是想要对网络请求进行特殊的控制。

#### 3.5. Cache Only

不走网络请求，资源仅从缓存中获取。这是一种在 Workbox 中不太常见的 Strategies。除非应用已经做了很好的预缓存。

### 4. workbox-webpack-plugin 配置

```js
new WorkboxPlugin.GenerateSW({
  cacheId: 'webpack-pwa', // 设置前缀
  skipWaiting: true,
  clientsClaim: true, // Service Worker 被激活后使其立即获得页面控制权
  swDest: './service-worker1910301545.js', // 输出 Service worker 文件
  // globPatterns: ['**/*.{html,js,css,png.jpg}'], // 匹配的文件
  globIgnores: ['service-worker1910301545.js'], // 忽略的文件
}
```

### 5. 业务

要注意：

1. 之前所有 `js` 都上云，然后删掉 `dist` 下的 `js` 文件，而 `service-worker` 必须在同域下，所以需要针对它放开
2. `html` 不能缓存，注意在配置文件中排除
3. 要有一键降级方案，如果线上有问题，可以通过远程改配置，取消掉所有的 `service-worker` 缓存
4. `workbox` 文件默认会单独打包，造成上云镜像越来越大，需要修改成 `inline`

参考：

- workbox-webpack-plugin文档：<https://developer.chrome.com/docs/workbox/modules/workbox-webpack-plugin?hl=zh-cn>
- 文章： <https://cloud.tencent.com/developer/article/1841684>


## 全局消息

是否显示一个全局消息弹窗，取决于4个因素：

1. 是否有新消息进来，没有不显示
2. 用户是否点击了x，点击后不显示
3. props中传入的是否显示，有些页面不需要显示
4. 未读消息总数是否大于0，这个因素不考虑的话，消息框会先闪烁后消失

```ts
 realIsShowMsg() {
  const { hasRobotNewMsg, showRobotMsg, isShowMsg } = this;
  return hasRobotNewMsg && showRobotMsg && isShowMsg;
},
```

## 消息传递流程

普通页面(比如 message-center) mixin-mounted，监听 uid，登录 tim，监听回调，给到 vuex

header 从 vuex 中取，去到其他页面，还是从 vuex 中取，不影响。不要直接引入 IMHandler，要解耦

## tim-js-sdk 登录失败

在 iOS15 和 iOS16 上，`tim-js-sdk`压缩有问题，所以不会开启压缩。

如果某些自研浏览器在上述版本下的`userAgent`不正确，比如本来系统是 iOS16，`userAgent`却给出了12，那么`tim-js-sdk`就会压缩，导致登录失败。

解决办法，就是强制指定`userAgent`。

```ts
// 修改ua
navigator.__defineGetter__('userAgent', function () {
  return 'My custom user agent';
});
```

## Dev 机器中文乱码

（1）打开系统配置文件：

```bash
vi /etc/profile
```

在文件末尾添加：

```bash
export LANG="zh_CN.UTF-8"
```

（2）执行以下命令立即生效：

```bash
source /etc/profile
```

（3）使用`echo $LANG`命令打印环境变量，可以看到已设置为`zh_CN.UTF-8`

## Vue Router 的 history 模式

Vue Router 在 history 模式下提示 `Uncaught SyntaxError: Unexpected token ＞`

- vue-cli3.0下：在`vue.config`里设置`publicPath: '/'`

- vue-cli2.x下：在`config/index`里设置`assetsPublicPath: '/'`

参考：https://blog.csdn.net/qq_35559000/article/details/117824321

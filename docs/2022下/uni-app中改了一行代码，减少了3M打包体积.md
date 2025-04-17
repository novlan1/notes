## 1. 背景

[上次](https://juejin.cn/post/7128666060592513061)经过分包和移动组件等方式，将uni-app打包产物成功上传，但是还存在一些问题，其中一个就是主包太大。



<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uniapp-after-subpackage-2.png" width="300">

并且随着项目不断进行，打包产物越来越大，目前几乎是踩线上传：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.0.png" width="380">

可以看到主包已经达到了2M，总包体积为 9.09M。

## 2. 方案

通过webpack包分析，发现一些小程序中没使用的包，也被打进了vendor.js中。其中最大的是vant，有30K+。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-vendor-node_modules.png" width="500">


排查了一下，发现这个库是在 location 这个公共文件中有引用：

```ts
import Dialog from 'vant/lib/dialog';
import 'vant/lib/dialog/style';

Dialog.confirm({
  title: 'xx',
  message: 'xxx',
}).then(() => {
  resolve(true);
})
  .catch(() => {
    resolve(false);
  });
```


如何让它在小程序中不使用vant组件呢？

我们可以建一个跨平台的dialog组件，当编译环境为小程序的时候，去引用uni-app或者微信小程序的方法。

```js
function Dialog({
  title = '',
  message = '',
  content = '',
}) {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title,
      content: message || content,
      success(res = {}) {
        if (res.confirm) {
          resolve();
        } else if (res.cancel) {
          reject();
        }
      },
    });
  });
}
Dialog.confirm = Dialog;
export default Dialog;
```

然后在 location.ts 中使用这个跨平台组件：

```ts
import Dialog from 'src/common/widget/vant/dialog';
```

再次打包，发现有额外收获，除了vendor.js体积减小后，其他组件体积也有减少，总体较竟然减少了3M，现在体积为6.09M：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.1.png" width="300">

分析一下原因，uni-app对css的打包方法不像js一样，即使有复用，也还是打包到对应的wxss文件。而js的话会抽离到vendor.js中。

我们上面除了修改 vant/dialog 的引用路径外，也去掉了之前引用的 css 文件，由于之前有很多组件在使用这个文件，所以去掉vant/scss后，就可以减少很多打包体积。

对我们的启发是：
1. 组件中不要引用不必要的css
2. 公共代码要引用关系清晰，要使用跨平台组件

## 3. 扩展

类似地，没被使用但被打包还有vue-router、vue-lazyload等，用类似的方法对它们进行了替换，替换后的打包分析如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.3.png" width="380">


可以看到主包大小再一次减少了40K。
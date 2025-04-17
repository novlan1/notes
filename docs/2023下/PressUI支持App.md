## 1. 开始

Press UI 已经支持了普通 Vue 项目和 Vue3 等，现在需要支持下 App，即 `iOS` 和 `Android` 平台。

本质上还是一些语法的兼容，这里采用的方法依然是 Press UI 当 `Submodule`，然后做一些工具和语法的适配。这里主要记录下遇到的问题。

## 2. 整体流程

先利用 `@vue/cli` 创建工程，文档[在这里](https://uniapp.dcloud.net.cn/quickstart-cli.html#%E5%88%9B%E5%BB%BAuni-app)。

```bash
vue create -p dcloudio/uni-preset-vue my-project
```

注意不要用 HBuilderX 建，后期迁移很麻烦。

建完工程后，在 HBuilderX 中运行，选择运行 => 运行到手机或模拟器。为什么这里要用 HBuilderX 呢，因为 VScode 调试 App 会麻烦很多，HBuilderX 已经打通了 App 编译、打包的一些步骤。



## 3. 遇到的问题

### 3.1. MacOS 配置adb

工欲善其事，必先利其器。兼容 App 需要先下载 Xcode 和配置 `adb` 等。

先下载 Android Studio，然后配置环境变量。

```bash
vim ~/.bash_profile
```

然后输入下面内容，`ANDROID_HOME` 即为 SDK 位置。

```bash
# Android Sdk

export ANDROID_HOME=/Users/yang/Library/Android/sdk
export PATH=${PATH}:${ANDROID_HOME}/tools
export PATH=${PATH}:${ANDROID_HOME}/platform-tools
export PATH=${PATH}:${ANDROID_HOME}/tools/bin
export PATH=${PATH}:${ANDROID_HOME}/emulator
export ANDROID_SDK=${ANDROID_HOME}
export ANDROID_NDK=${ANDROID_HOME}/ndk-bundle
```

终端输入 `source ~/.bash_profile`，使环境变量生效。

然后输入 `adb devices` 或 `adb version`，可以检查是否配置成功。

另外，在手机上开启USB调试，才能在 `adb devices` 中看到设备。

参考：
- https://blog.csdn.net/xiaoyue_/article/details/132020304
- https://www.jianshu.com/p/744fc5946627

### 3.2. iOS 打包

iOS 打包需要证书，包括证书密码、证书profile文件、密钥证书。

打包后会生成 ipa 文件。可以将这个文件上传到 devcloud，然后用“归档构件“插件，生成二维码。

上传命令示例：

```bash
set -ex

# 文件路径
FILE=/Users/yang/Downloads/press-ui.ipa
# 目标
TARGET_PATH=/data/workspace/p-30ff30b405b24a228b4fa22cb05b7db3/src

scp -P 36000 -r $FILE root@my:$TARGET_PATH
```


### 3.3. VScode支持 nvue 文件高亮显示

只需要将 `nvue` 文件当成 `vue` 文件处理即可。

设置中搜文件，找到`Associations`，`key` 填 `*.nvue`， `value` 填 `vue`。

并去掉 `Vetur` 对 `Script/Style/Template` 的校验。

参考：https://blog.51cto.com/gblfy/5652539

### 3.4. sass 报错，可选参数需在必需参数之后

```bash
assError: required parameters must precede optional parameters
        on line 229 of ../../../../../../Users/yang/Documents/git-woa/press-ui-app/press-ui-app/packages/base/mixin.scss
>> @mixin halfBorder($color: $color-gray-3, $borderRadius) {
```

```scss
@mixin halfBorder($color: $color-gray-3, $borderRadius) {}

// 可简单改为：
@mixin halfBorder($color: $color-gray-3, $borderRadius: 1px) {}
```

### 3.5. TS配置

HBuilderX 可以有自己的`tsconfig.json`，需注意不能配置为 `noEmit: true`

```bash
Error: TypeScript emitted no output for
```


### 3.6. 偶现错误

```bash
reportJSException >>>> exception function:createInstanceContext, exception:JavaScript execute error!Uncaught ReferenceError: uni is not defined
 at ./node_modules/.pnpm/@dcloudio+vue-cli-plugin-uni@2.0.2-3081220230817001/node_modules/@dcloudio/vue-cli-plugin-uni/packages/uni-cloud/dist/index.js (pages/tabBar/component/component.js.nvue:13855:21)
 at __webpack_require__ (pages/tabBar/component/component.js.nvue:21443:41)
```

这个应该是 HBuilderX 自己的问题，一个解决办法是，在 VScode 中执行 `npm run dev:h5`，然后 HBuilderX 会自动重新编译，这时候报错会消除。

### 3.7. 组件上的方法

函数式调用组件时，需要在组件外获取组件内方法，之前采用方法是判断环境是否为 H5，其和小程序的策略不同：

```ts
// #ifdef H5
dialog.setData(newOptions);
promise = dialog.showDialog(options);
// #endif

// #ifndef H5
dialog.$vm.setData(newOptions);
promise = dialog.$vm.showDialog(options);
// #endif
```

在 App 端，其和 H5 表现一致，也就是 `setData` 在 `dialog` 上，不在 `dialog.$vm` 上。这里改造如下：

```ts
export function setData(dialog, data, func = 'setData') {
  const setData = dialog.$vm?.[func] || dialog[func];
  if (typeof setData === 'function') {
    return setData(data);
  }
}

```

需要优先使用 `dialog.$vm` 的方法

```ts
const setData = dialog[func] || dialog.$vm[func];
```


### 3.8. 链接协议

App 端不支持省略 `http` 协议，也就是不能：

```ts
export default {
  data() {
    icon: {
      normal: '//mike-1255355338.cos.ap-guangzhou.myqcloud.com/press%2Fimg%2Fuser-inactive.png',
      active: '//mike-1255355338.cos.ap-guangzhou.myqcloud.com/press%2Fimg%2Fuser-active.png',
    },
  }
}
```

链接补充上 `https:` 即可。

### 3.9. key

遇到下面的报错，调试了很久，网上查到的资料要么是动态引用、要么是变量为空未兼容，但是 Press UI 并不存在这些情况。

```bash
Not found -1;-1,1,0,2;-1;-1,1,0,2,2,3-1;undefined at view.umd.min.js:1
```

最后，发现是下面语法的问题：

```html
<div
  v-for="(item, index) of list"
  :key="item.index"
>
</div>
```

改成 `:key="index"` 即可解决。

这个问题的坑点在于，报错信息极其隐晦，很难定位真正有问题的地方。

### 3.10. onPageScroll

Press UI 中还在使用 page 的滚动的组件只有 press-sticky 了，在 APP 端 onPageScroll 目前并未生效。

## 4. 体验

目前 Press UI 组件已兼容 App，可扫码下面二维码下载安装，体验安卓版本。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/press/apk/press-ui-apk-main.png" width="200px"/>

iOS 证书制作要花钱，等有钱了再说～

目前 Press UI 支持的产品矩阵如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/10/own_mike_13f3281f0a188e0fbd.png" width="600">

## 5. 原理

从上面解决的问题可以看到，Press UI 兼容 App 所做的的适配相对比较少，其实是 uni-app 底层已经适配好了。

>在 App 端，如果使用 vue 页面，则使用 webview 渲染；如果使用 nvue 页面(native vue 的缩写)，则使用原生渲染。

`nvue` 的 `css` 写法受限，Press UI 的组件均为 `vue` 类型。


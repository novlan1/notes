## 1. 开始

介绍一款基于 `uni-app` 的跨端组件库——[press-ui](https://novlan1.github.io/press-ui/)，也可用于普通H5项目。API 与 `vant` 一致，可以看作是 `uni-app` 版本的 vant。



为什么不用`uni-ui`或者`uview`等组件库呢？有两个原因：

1. 我们项目是从H5项目转成`uni-app`项目的，项目比较大，改动成本高。
2. `uni-ui`、`uview`这些库的API易用性较差，与`vant`相比差距大。

<img src="https://cdn.uwayfly.com/press%2Fimg%2Fpress-ui-demo-screenshot.png" width="300" >


## 2. 介绍

### 2.1. 基础介绍

1. 70+ 基础组件，覆盖移动端主流场景
2. 支持基于`uni-app`的H5、微信小程序、QQ小程序
3. 支持普通H5项目
4. 零外部依赖，不依赖三方 npm 包
5. 提供丰富的中英文文档和组件示例
6. 支持主题定制，内置 600+ 个主题变量
7. 支持国际化，内置 16+ 种语言包


文档地址：[https://novlan1.github.io/press-ui/](https://novlan1.github.io/press-ui/)

<img src="https://cdn.uwayfly.com/press%2Fimg%2Fpress-ui-doc-screenshot.png" width="800" >


三端示例体验地址：

<img src="https://cdn.uwayfly.com/press/qrcode/press-ui-demo-qrcode-3.png" width="700">


### 2.2. 解决痛点


`press-ui`主要解决了以下痛点：

1. 可支持包含`vant`的H5项目平滑迁移至`uni-app`项目，只需要改下引用地址和组件名称。
2. 丰富的组件类型，以及易用的API，让`uni-app`开发变得简单。
3. 支持国际化、主题定制等，组件灵活性更强


同时，将项目中业务组件沉淀到`press-ui`中，有以下好处：


- 增强可维护性，提升开发效率
  - 通过整理代码，合并属性，分离业务逻辑等，让组件变纯粹，增强可维护性，进而提升效率
- 减少业务和组件的耦合，降低各自复杂度，并减少bug
- 封装核心逻辑，控制变化
  - 不用担心外部合作人员改乱代码，以及解决冲突时的覆盖问题
- UI问题定位简单
  - 三端代码同时发布，以及多种类型的示例，覆盖面全，容易发现ui问题，以及三端表现不一致问题
- 可提升性能
  - 通过自定义队伍数等变量，定位性能瓶颈，并解决性能问题
- 提高可复用性，可应用到其他项目
- 技术沉淀，技术积累，不断打磨组件细节


### 2.3. 应用场景

`press-ui`可应用于`uni-app`项目，或者普通的H5项目，目前已应用在王者赛宝、HoK Club、赛宝pro等项目中。

<img src="https://cdn.uwayfly.com/article/2023/4/pvp-esports-screenshort.png" width="300">


<img src="https://cdn.uwayfly.com/article/2023/4/hok-club-screenshot.png" width="300">


## 3. 如何使用

### 3.1. 用于uni-app项目


1. 安装npm包


```bash
npm i press-ui
```


2. 在页面中正常引入并使用

比如 `message-detail` 组件：

```html
<template>
  <PressMessageDetail />
</template>
```

```ts
<script>
import PressMessageDetail from 'press-ui/press-message-detail/press-message-detail.vue'

export default {
  components: {
    PressMessageDetail,
  }
}
</script>
```

3. 配置`vue.config.js`

注意，需要在`vue.config.js`中配置下 `transpileDependencies`：

```js
module.exports = {
  transpileDependencies: ['press-ui'],
}
```

### 3.2. 用于普通H5项目


`press-ui` 比普通的组件只是多了条件编译，所以加一个支持条件编译的`loader`就可以解决了，`loader`代码地址在[这里](https://github.com/novlan1/uni-plugin-light/tree/master/loader/ifdef-loader)。


`loader`使用方法如下：

1. 安装 npm 包：

```bash
npm i uni-plugin-light -D
```

2. 在 `vue.config.js` 中添加如下设置：

```js
const LOADER_IFDEF = 'uni-plugin-light/lib/loader/ifdef-loader';

module.export = {
  chainWebpack(config) {
    config.module
      .rule('ifdef-loader')
      // 根据项目实际配置文件类型
      .test(/press-ui.*(\.vue|\.ts|\.js|\.css|\.scss)$/)
      .use(LOADER_IFDEF)
      .loader(LOADER_IFDEF)
      .options({
        context: { H5: true },
        type: ['css', 'js', 'html'],
      })
      .end();
  }
}
```

## 4. 共建

`press-ui` 项目地址在[这里](https://github.com/novlan1/press-ui)，文档在[这里](https://novlan1.github.io/press-ui/)。


### 4.1. 后续规划

`press-ui`后续规划包括：

- 支持`Android`、`iOS`
- 优化构建流程和开发体验
- 减小`npm`包大小
- 对外开源


### 4.2. 共建


欢迎体验、试用、共建，可以加入群聊，二维码过期可以私聊加入。

<img src="https://cdn.uwayfly.com/press/img/chat-group/caht-group-20230425.png" width="300">


## 5. 技术细节

### 5.1. 项目结构

`press-ui` 的项目结构如下：

```bash
- docs            # 文档地址
- plugin          # [demo]工程用到的插件
- script          # 脚本
- src
  - common        # [demo]公共内容
  - packages      # 对外发布的包内容
  - pages         # [demo]页面内容
  - static        # [demo]静态内容
  - App.vue       # [demo]应用入口
  - main.js
  - pages.json
```

组件库除了组件外，还有文档、示例、工程化配置等部分。为了维护起来方便，我将示例、文档、组件都放在一个文件夹里，所以一个标准的组件文件夹目录如下：

```bash
- press-button
  - demo.vue            # 组件示例
  - press-button.vue    # 组件
  - README.md           # 组件中文文档
  - README.en-US.md     # 组件英文文档
```

`src/packages`下就是由这些组件文件夹和一些公共文件构成。

上面的组织结构并不能直接用，还需要把`README.md`移动到`docs`中，把`demo.vue`移动到`src/pages`中。这里我写了脚本用来监听这些文件变动，发生变动后就把它们拷贝到需要的位置上，命令为`npm run dispatch`。


### 5.2. 监听文件变化

监听用的是`gulp`，这里有个比较重要的属性`delay`，允许在执行任务之前等待许多更改，比如删除文件夹这种操作。`delay`只支持这种方式：

```ts
function watchPackages(cb) {
  gulp.watch('./src/packages/**/*', { delay: 200 }, cb);
}
```

不支持这样使用：

```ts
const { watch } = require('gulp');

const watcher = watch(['input/*.js']);

watcher.on('change', function(path, stats) {
  console.log(`File ${path} was changed`);
});

watcher.on('add', function(path, stats) {
  console.log(`File ${path} was added`);
});

watcher.on('unlink', function(path, stats) {
  console.log(`File ${path} was removed`);
});

watcher.close();
```

参考：https://www.gulpjs.com.cn/docs/api/watch/


### 5.3. 组件来源

`press-ui`的组件并不都是从零开始写的，而是来源于`vant`和项目自身沉淀的组件。

对于`vant`组件转化，实现方式如下：

1. 转化小程序版本的`vant`，即`vant-weapp`
2. 将`wxml/wxss/js/json`转为`vue`文件，即`uni-app`编译的逆操作
3. API 替换为`uni-app`的通用类型
4. 条件编译处理 API 差异部分


这样做的好处是，可以大大提升组件编写效率，且 API 保持与`vant`一致，从而方便用户由`h5`项目平滑迁移到`uni-app`项目。

对于项目中沉淀的组件，需与业务完全解耦后沉淀，并且需要具有一定的通用性或复杂度。为什么呢，这样可以让`press-ui`更稳定，减少变化，发挥`press-ui`的作用。


### 5.4. 组件质量

如何评价一个组件呢，可以从下面几个维度：

- 通用性，好的组件一定是通用的，即满足多种场景需求，表现上看就是有很多`props`、`slot`，开发者想怎样用就怎样用
- 兼容性，可在低端机、横竖屏、大小屏等不同场景，都有良好的展示、交互效果
- 性能，可满足数据量大等场景



对于业务组件，通用性强的前提是，与业务充分解耦，如何做到呢？

- 不能存在业务状态码，多重判断逻辑应该前置完成
- 关注点分离，关注组件自身，而非业务
- 一个衡量标准是业务更新迭代，业务组件却一直稳定
- 能用函数调用的，就用函数调用，为什么呢？因为`js`比`html`更灵活，灵活意味着通用型更强



### 5.5. BEM

关于[BEM](https://getbem.com/)可以参考这篇[文章](https://juejin.cn/post/7102980936232337445/)。

笔者对项目中之前的组件，全部进行了BEM改造，以`press-dialog`为例，改造前：

<img src="https://cdn.uwayfly.com/article/2022/12/press_dialog_before_bem.pic.jpg">

改造后：

<img src="https://cdn.uwayfly.com/article/2022/12/press_dialog_after_bem.pic.jpg" >


可以看出，可读性大幅增强。

### 5.6. 新组件一键接入


新增组件只需要执行命令：

```bash
npm run new:comp
```

然后交互式的输入组件英文名、中文名等内容即可。

为了维护方便，内部会有一个`component-config.json`文件，保存了所有的组件信息，包括名称、类型等。文档和示例的路由配置都是从这个文件生成。

这样的好处是要删除一个组件时，只要改变这个配置文件，然后执行`npm run gen:config`即可，同理，对于组件名称变动、类型变动也是一样的。



这个配置文件相当于一个收口，可以很方便的管理文档和示例。


```ts
function main() {
  writeDocSidebar();
  writeDemoIndexConfig();
  writeDemoPagesJson();
  writeDemoTitleI18n();
}
```


可以看出，这个配置主要驱动了：

- 文档的`sidebar`
- 示例的首页列表
- 示例的`pages.json`
- 示例的`i18n`配置

### 5.7. 类名兼容

`press-ui`的类名前缀统一为`press-`，而`vant`的类名前缀为`van-`，对于老项目，`press-ui`提供了一种兼容方案，允许不改动之前的样式文件。

使用方式为，给组件添加一个属性：`extra-class-prefix="van-"`。

### 5.8. API平滑升级方案

组件API，可分为`props`和`event`。`event`的话直接多`emit`新的就好了，`props`的话需要先判断新旧`prop`的值是否为默认值。

>如果哪一个不等则使用那一个，新`prop`优先级大于旧`prop`。如果都相等，就用新`prop`的值。

注意，这里的相等不能是简单的`===`，需要考虑引用类型。

此外，还要考虑取子属性的场景，比如`this.a.b.c`。

```ts
export function getPropOrData({
  isFunctionMode,
  functionModeData,
  allProps,
  propsKeyMap = {},
  context,
  key,
}: {
  isFunctionMode: boolean;
  functionModeData: Record<string, any>;
  allProps: PropType;
  propsKeyMap: Record<string, string>;
  context: any;
  key: string;
}) {
  if (!isFunctionMode) {
    const oldKey = propsKeyMap[key];
    // 存在旧的key
    if (oldKey) {
      const oldDefaultValue = getDefaultValue(allProps, oldKey);
      const newDefaultValue = getDefaultValue(allProps, key);

      if (!isObjectEqual(context[key], newDefaultValue)) {
        return findObjectDeepValue(context, key);
      }
      if (!isObjectEqual(context[oldKey], oldDefaultValue)) {
        return findObjectDeepValue(context, oldKey);
      }
      return findObjectDeepValue(context, key);
    }
    return findObjectDeepValue(context, key);
  }
  return findObjectDeepValue(functionModeData, key);
}


function findObjectDeepValue(obj: Record<string, any>, key: string) {
  const list = key.split('.');
  let cur = obj;
  for (let i = 0; i < list.length;i++) {
    cur = cur[list[i]];
    if (!cur) return;
  }
  return cur;
}
```


### 5.9. children循环引用

循环引用的对象不要放在`data/computed`中，直接在`created`中声明，比如`press-tabs`中的`children`。

### 5.10. 跨组件通信

`vant-weapp`用的是`reletion`，`press-ui`用的是`provide/inject`，也可以用`eventBus`。




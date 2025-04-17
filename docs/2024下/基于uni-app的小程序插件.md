## 1. 工程适配

介绍下基于 uni-app 的小程序插件的设计思想、使用方法、适配工作、性能优化等。

### 1.1. 设计原则

简单易用，一套代码既能独立发布，又能当小程序插件。独立发布包含了 uni-app 支持的所有端，包括 H5、微信小程序、QQ 小程序等。所以目标是 n+1 端，额外的 1 就是小程序插件。

### 1.2. 使用方法

在环境变量 `.env.local` 中新增 `VUE_APP_MP_PLUGIN = pluginRoot`。`pluginRoot` 会被当作插件目录名称。

启动命令如下：

```bash
# 开发
npm run dev:mp-plugin 
# 发布
npm run build:mp-plugin
```

然后在小程序开发者工具打开 `dist/dev/mp-weixin` 或者 `dist/build/mp-weixin` 进行调试、预览、上传等。

### 1.3. 适配工作

包含以下几部分

1. 命令兼容
2. playground 自动生成
3. 路径修复

#### 1.3.1. 命令兼容

默认 uni-app 脚手架不提供小程序插件编译命令，但提供了[相关文档](https://zh.uniapp.dcloud.io/tutorial/mp-weixin-plugin-dev.html)。

在结合我们项目过程中，踩了一些坑，这里记录下。主要是业务库为 monorepo 模式，由环境变量决定启动哪个子工程。为了启动小程序插件，以及兼容使用 npm，修改了 env.js 的逻辑，增加了环境变量中是否有小程序插件名称的判断，如果有则将其附在命令后面。


```js
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const { spawnSync } = require('child_process');
const os = require('os');
const platform = os.platform();
const myEnv = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(myEnv);

// 执行真实的命令
const realArgv = process.argv.slice(2);
let command = 'npm';
if (platform === 'win32') {
  command = 'npm.cmd';
}
const otherArgv = ['run', ...realArgv]

// 根据环境变量中是否有 VUE_APP_MP_PLUGIN 插件名称以及命令关键词，决定是否添加插件参数
if (process.env.VUE_APP_MP_PLUGIN && realArgv[1] === 'mp-wx-plugin') {
  otherArgv.push(...['--', '--plugin', process.env.VUE_APP_MP_PLUGIN])
}

spawnSync(command, otherArgv, { stdio: 'inherit' });
```

注意 `--plugin` 前面必须有 `--`。


`package.json` 增加命令如下：

```json
"dev:mp-plugin": "npm run env dev:custom mp-wx-plugin --plugin",
"build:mp-plugin": "npm run env build:custom mp-wx-plugin --plugin"
```

以及文档中提到的 uni-app 自定义命令

```json
"uni-app": {
  "scripts": {
    "mp-wx-plugin": {
      "title": "微信小程序插件",
      "env": {
        "UNI_PLATFORM": "mp-weixin"
      },
      "define": {
        "MP-WX-PLUGIN": true
      }
    }
  }
}
```

#### 1.3.2. playground 自动生成

插件开发过程中需要一个小程序用来调试，具体可参见[官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/plugin/development.html)，我这里暂且称之为 `playground`。

默认情况下，在 uni-app 工程开发小程序插件时，每次都要将产物复制到另一个地方，然后用开发者工具打开，才能调试。这种效率过于低下，于是写了一个插件，可以在 dev 和 build 模式下都自动生成 `playground`。

原理是在模板的子工程目录下，提前放一个 `mp-plugin-public` 的文件，里面包括 `doc/miniprogram/project.config.json` 这些 `playground` 的必要东西。然后在 `compiler.hooks.done` 生命周期中（也可以用其他类似钩子），复制该目录到插件产物的上一层，然后打开该层目录，就可以自动调试了，无需手动拷贝。

为什么要将 `mp-plugin-public` 放到子工程下呢，是考虑到每个子工程是单独的一个插件，有不同的名称、文档、示例。

为什么要命名为 `mp-plugin-public` 呢，是将其类比成了 H5 下的 `public` 目录，在打包过程中不会编译，只会复制。


#### 1.3.3. 路径修复

由于我们项目的结构有点深，`src/project/subProject`，以及引用了外层公共模块，比如 `src/component`，`src/local-logic` 等。uni-app 在编译这种层级项目时，会生成错误的引用路径，需要编译插件修复。

1. 引入公共模块错误

举例来说，比如一个 `js` 文件中引用了 `../common/runtime.js`，插件需要从当前文件往上找 `common/runtime.js` 文件，找到了就返回正确的相对路径，并进行替换。替换结果可能为 `../../../common/runtime.js`。

另外，node_modules 下的引入路径也有问题，问题截图如下，也需要用类似方法修复。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_59464c49f1f4d685d6.png" width="600">


2. 使用了绝对路径

参考下图，里面包含了错误的绝对路径，需要替换为正确的 `moduleId`。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_c3b9a672306f979192.png" width="600">


3. getApp 找不到

此外，低版本的 `uni-app` 在编译小程序插件时候，还会使用 `getApp`，由于插件并不支持这个API，所以会报错，可以升级到最新版本解决。


## 2. 性能

小程序插件本质和小程序一样，先从优化小程序包体积开始。

先贴下最开始的包体积，方便对比。最开始总包 1.92MB。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_bd34e66ccf679453ac.png" width="500">


### 2.1. 分类

小程序包可以分为公共部分和业务部分，公共部分又可分为第三方的和我们项目组的。

第三方公共包括：

- uni-app 相关
  - uni-mp-weixin/dist/index.js 
  - vue-cli-plugin-uni/mp-runtime.esm.js
  - uni-i18n
- Press UI
- crypto、md5
- weapp-qrcode
- qs
- 其他


项目组公共包括：

- pmd-npm
  - startApp
  - report
  - login
  - tools
  - ...
- press-plus
- src/api

业务部分就是剩下的了，包括所有业务组件和业务逻辑。

优化不同部分内容的影响是不同的。对第三方库的优化，对影响所有使用它的项目，是影响力最大的。对项目组公共部分的优化，会影响项目组所有业务。对业务的优化，就只会影响当前业务了。

就这个项目而言，三方库体积并不大，最大的是业务和项目组公共部分。

### 2.2. 减包思想

减包主要分下面几种情况：

- 完全运行不到的代码
- 重复代码
- 可以用更简单方式替换的代码

完全运行不到的代码，比如 `uni-i18n` 的大部分逻辑、缺少条件编译的 H5 逻辑。

重复代码常见的有两段逻辑相似，或者引入了同一个包的两个版本。

可以用更简单方式替换的代码，比如用小程序原生上报代替 `aegis`、用原生 `swiper` 代替 `press-swiper`、自己写 `btoa` 代替 `js-base64` 中的 `encode` 等。

## 3. 优化点

下面每条优化我都给出对比效果，以及其他项目也想要使用时，可以采用的方法。

### 3.1. press-ui

press-ui 是核心组件库，虽然它可以减少的空间并不大，但是会对所有项目产生影响。

优化前有 51KB，通过按需加载，条件编译去掉H5环境的方法等，缩小到了 43KB。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_039c8690b63b5ed991.png" width="500">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_eead7e4ae02154b544.png" width="500">


又发现打包的 CSS 中有一些没有用到的公共样式，比如 ellipsis, hairline 等，通过按需引入，又减少了 20KB。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_7d36e4a17dcd3a6e7d.png" width="500">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_90a1a4de5db1f3e04e.png" width="500">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_738d650545621823df.png" width="500">

其他项目想要用的话，直接升级最新版本 `press-ui` 即可。

另外 `press-icon-plus` 打包了所有的图标，但实际只用了其中一两个，这里可以用 `postcss` 插件将多余的图标去掉，省掉 11KB。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_a93e2ff3f43d41ae1e.png" width="500">


其他项目想要用的话，可以使用 `plugin-light` 中的 `remove-selector` 插件。


### 3.2. api 子仓库

尽管 `src/api` 已经做到了按需加载，只打包所需的接口，而不是所有接口，但依然有 25KB 的体积，这里一起优化下，直接使用调用 `post`，这部分体积可以直接降为 0。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_5d6ebcc7a781562fa8.png" width="500">


其他项目想要使用的话，需要自己修改代码。

--- 分割线

后面想了一下，`src/api` 这个库还是还有必要的，typescript 类型检查不可少。分析了一下为什么能占这么多体积，发现其引用了并非是按需加载的包，而是 `all-in-one` 的文件，而且即使是按需加载的包也有很多重复方法，这里我提取了一下。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_46c11f85cfb1f84211.png" width="500">

### 3.3. swiper

业务使用了 `press-swiper`，来实现了一个较为美观的`swiper`。我研究了一番，直接用原生实现了。

核心原理如下：

1. 通过 `next-margin`，`previous-margin`， 实现 `swiper-item` 不再撑满全屏
2. 通过 `getSystemInfo` 获取 `windowWidth`，减去 `wrapMargin`、`imageWidth` 等值，动态计算 `next-margin` 和 `previous-margin`
3. 监听 `transition` 事件，获取 `event.detail.dx`，计算当前` swiper-item`，并赋值，实现滑动切换 `swiper`

贴一下核心代码，备忘下。

```html
<!-- #ifndef H5 -->
<swiper
  v-if="mSwiperInit"
  ref="zSwiper"
  v-model="mGameTaskList"
  :options="ZSwiperOptions"
  :current="mCurrentSelectedTab"
  :next-margin="nextMargin"
  :previous-margin="nextMargin"
  @transition="onSwiperTransition"
  @animationfinish="onSwiperTransitionFInish"
  @touchstart="onTouchStart"
  @touchmove="onTouchMove"
  @touchend="onTouchEnd"
>
  <swiper-item
    v-for="(item,index) in mGameTaskList"
    :key="index"
  >
    <div
      class="task-type-item"
      :class="{
        'task-type-item--active': mCurrentSelectedTab === index
      }"
      @click.stop="changeSelectedGame(index, true)"
    >
      <img
        class="task-type-img"
        :src="tinyImage(item.icon)"
      >
    </div>
  </swiper-item>
</swiper>
<!-- #endif -->
```


```ts
methods: {
  onSwiperTransition(e) {
    const { dx } = e.detail;
    if (!this.manualMoving) return;
    movingDx = dx;
  },
  onSwiperTransitionFInish() {},
  onTouchStart() {
    this.clearTimer();
    this.manualMoving = true;
    this.movingCurrent = this.mCurrentSelectedTab;
    movingDx = 0;
  },
  onTouchMove() {},
  onTouchEnd() {
    this.manualMoving = false;

    let current;
    if (movingDx > 0) {
      current = Math.min(this.movingCurrent + Math.round(movingDx / 60), this.mGameTaskList.length - 1);
    } else {
      current = Math.max(this.movingCurrent +  Math.round(movingDx / 60), 0);
    }
    this.changeSelectedGame(current);

    this.startTimer();
  },
  getSwiperDomWidth() {
    const that = this;

    return new Promise((resolve) => {
      wx.getSystemInfo({
        success(res) {
          const clientWidth = res.windowWidth;
          const ratio = 750 / clientWidth;
          const wrapWidth = clientWidth - Math.floor(32 / ratio) * 2 - Math.floor(20 / ratio) * 2;

          const nextMargin = (wrapWidth - Math.floor(104 / ratio) - Math.floor(16 / ratio) * 2) / 2;
          that.nextMargin = `${nextMargin}px`;

          resolve();
        },
      });
    });
  },
}
```

这样优化后，发现切换 `swiper-item` 更加平滑，并直接省掉了 `176KB` 的大小。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_540e35e2212afd174d.png" width="500">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_bdd6a42f8069e60029.png" width="500">

效果如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_2014d9c6eb9f6f272b.gif" width="375">


其他项目想要使用的话，可以使用封装好的方法。

### 3.4. uni-i18n

这个库是 uni-app 内部用来实现国际化的，业务没有用到，写了一个 `loader` 把它去掉了（只暴露了一个假的函数，返回最小需要的对象），可以省掉 7.5KB 的大小。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_cc1bc0dc96109135bd.png" width="500">

其他项目想要使用的话，可以给 `plugin-light` 的 `getUniVueConfig` 传入

```ts
replaceLibraryLoaderOptions: {
  replaceContentList: [
    {
      path: 'uni-i18n.es.js',
      content: () => 'export function initVueI18n() {return {t:()=>{}}}',
    },
  ],
},
```

也可以直接使用 `replaceLibraryLoader`，传入相同参数。

### 3.5. js-base64

业务主要用到了这个库的 `encode` 方法，其实就是 `window.btoa`，这个自己实现下小程序端的就行了。

从引用关系看，`js-base64` 引入了 `buffer.js`，`buffer.js` 又引入了其他的工具函数，所以去掉 `js-base64` 可以优化出比预期较多的体积，实际大概 25.89KB。

之前 JS 总体积：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_1aa7454104cc5e6542.png" width="500">


去掉 `js-base64` 后的 JS 总体积：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_4c73a0420f2de42cc5.png" width="500">

`buffer.js` 体积：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_02514049b673f9a00c.png" width="500">

`buffer.js` 引用的子模块：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_c58b5ef0d8ad6031f1.png" width="500">

其他项目想要使用的话，手动替换 `encode/decode` 到 `t-comm` 或者 `pmd-tools` 中的方法。

### 3.6. pmd

#### 3.6.1. pmd-vue

- `launchapp/base.ts` 中都是 H5 的拉起方法，用条件编译去掉

- 去掉 `initReport`，因为没有 `aegis` 了，这个引用也就没意义了

- 去掉 `initFilter`，没有用到

- 去掉 `initMixin`，使用工具方法


#### 3.6.2. pmd-tools

- `env/user-agent.ts` 小程序中用不到，用关键词编译方法去掉

- `validate/index.ts` 中只用到了 `getType` 方法，把它单独拿出来引用

- `dialog-displayer/index.ts` 小程序中用不到，用关键词编译方法去掉

- `time` 模块太大，用到的其中几个方法，把它们单独提出来，单独引用

#### 3.6.3. pmd-report

`tcss` 已废弃，直接去掉


其他项目想用的话，手动替换。

### 3.7. scoped

突然意识到小程序根本不需要 `scoped`，默认情况下，小程序组件样式就是只能作用于自己。于是写了个 `loader`，在小程序下去掉了所有 `scoped`，减少了 47KB。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_28e1864b844799c811.png" width="500">

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_bfad98a1eb69e896e3.png" width="500">


其他项目想用的话，使用 `plugin-light` 中的 `removeScopedLoader`。

### 3.8. 最新进度

当前总包 1.512 MB

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_d34295e3ea4044dedc.png" width="500">


## 4. Vue3

### 4.1. 包体积

尝试用 Vue3 改写了项目，包体积能降到 900KB。

看了下，之所以能降这么多，除了 `uni-app` 运行时变小外，`js` 文件的运行时也缩减了很多。`Vue2.x` 用的 `webpack` 运行时那一套，熟悉的关键词是 `webpackJsonP`，而 `Vue3.x` 用的是 `Vite`，到了小程序这，转化成了小程序原生的 `require`。就这一点，就能降不少，因为 JS 模块太多了。

下面记录下 Vue3 升级中的一些问题和解决办法。

### 4.2. Vue2 中的 $set

`Vue.set` 和 `this.$set` 区别

说明：两者都是实现向实例对象中添加响应式属性，触发视图更新，两者原理和用法基本相同，都是使用 set,一个绑定在 vue 的构造函数身上，一个绑定在vue的原型身上。

1. `vue.set()`，将 set 函数绑定在 Vue 构造函数中，设置实例创建之后添加的新的响应式属性，且触发视图更新，但是不允许添加根级响应式属性，只可以向嵌套对象添加响应式属性。

用法： `Vue.set(object, propertyName, value)`

```ts
import { set } from '../observer/index'
Vue.set = set
```

2. `this.$set()`**将 set 函数绑定在 vue 原型上，**只能设置实例创建后存在的数据（数据已经在 data 中）

用法： `this.$set(object, propertyName, value)`

第一个参数是要添加的对象，第二个是需要添加的属性名key（需要要用引号包裹起来),第三个是需要添加的值)

```ts
import { set } from '../observer/index'
Vue.prototype.$set = set
```

### 4.3. Maximum recursive updates exceeded

出现了死循环，报错如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_abb7c22e5de1650fee.png" width="500">

```
Maximum recursive updates exceeded. This means you have a reactive effect 
that is mutating its own dependencies vendor.j5: 3. and thus recursively 
triggering itself. Possible sources include component template, render 
function, updated hook or watcher source
```

最后发现是 `watch` 使用的不合理，原先代码抽象如下（选项式API）：

```ts
props: {
  task: {
    type: Object,
  }
},
data () {
  return {
    mTaskInfo: {},
  }
},
watch: {
  task(value) {
    this.mTaskInfo = value;
  }
}
```

上面代码在 `Vue2.x` 时候也是不对的，完全可以用 `computed`。只不是 `Vue2.x` 的时候传递的是对象，并不是代理，所以不会出现死循环。

而 `Vue3.x` 中传入的这个 `task` 是代理对象，执行 `this.mTaskInfo = value` 的时候，等于把 `mTaskInfo` 和 `task` 划上了等号，一旦对 `mTaskInfo` 的属性赋值，都会导致 `task` 也跟着变，从而死循环。

测试了一下，选项式API中 `data` 的属性，如果是基础类型可以获取到原始类型，如果是对象和数组则是代理。`computed` 中返回的则始终是原始值。

### 4.4. H5标签转化

vue3 不会在 `img/div/span` 这些 H5 标签转化的产物中加额外类名了，比如 `_img/_div/_span`，之前是

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_7223075d1382090f18.png" width="360">

现在是

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/8/own_mike_a07d3a1975fd25f5ae.png" width="360">

需要自己改成

```scss
img, 
image {

}
```

更正规的做法是不要使用标签选择器，统一使用类名选择器。


还有一种批量处理方法，就是找到对应关系，用 `postcss` 插件批量转化。

```
span => label
img => image
i => view
p => view
```

用插件的优点就是很快，缺点是：

1. 不精确，多个web标签都对应 view，可能会导致与 Web 端表现不一致
2. 有心智负担，无法做到可见即所得，不利于后期维护

## 5. Vue3 转化 Tips

为方便其他子工程迁移，贴下转化的基础步骤。


### 5.1. 框架级别

1. 复制 `main.ts`
2. 删掉 `index.html` 中的 `VUE_APP_INDEX_CSS_HASH`
3. 在 `index.html` 增加 `main.ts` 中的引入

```html
<script type="module" src="/main.ts"></script>
```

4. `manifest.json` 中 `vueVersion` 改成 3

5. `pmd-merchant-ui` 替换，`pmd-merchant-ui/src/tip-comp-dialog-prompt/css` => `@tencent/press-plus/press-act-prompt-dialog/css`


### 5.2. 业务级别



1. `app.$set` 和 `this.$set` 用 `press-ui` 中的 `setAdapter` 替换。

```ts
import { setAdapter } from '@tencent/press-ui/common/vue3/set';
```

2. `router.push`， `router.replace` 在小程序下，用原生方法实现。

3. 样式文件中的 `*` 选择器去掉，小程序不支持

4. 生命周期替换

5. 引入类型，需要加 `type`

```ts
import type { XXType } from 'xx';
```

6. Vant 组件改成 Press UI 组件，常见的包括 List/Tab/Swiper 等。


## 6. 赛事转化

转化步骤：

1. 拷贝文件
2. 运行 `npm run dev`, 改一些问题
3. 运行 `npm run build` 改编译问题
4. 再运行 `npm run dev` 改运行时问题

先执行 `npm run dev` 是因为 `Vite` 按需加载，能较快看到成果，心里有底。

再执行 `npm run build` 是因为 `build` 模式能看到所有编译问题，方便快速定位和解决。

最后运行 `npm run dev` 就是查漏补缺，把每个页面的运行时都检查一遍。

编译问题：

1. 路径移动，需与之前项目融合，所以要改动引入路径部分
2. 业务大量使用了 Vuex，去掉有风险，也引入 `4.x` 版本的 Vuex
3. `template` 内的 key 需要写在 `template` 标签上
4. `vue-qrcode` 库替换成 press-ui 中的 `qrcode`
5. `vant/lib` 库的动态引入，用条件编译包裹
6. `@ttt/pmd-api` 替换成 `src/api`
7. 增加必须的 `mixin`，比如 `share-mixin`

运行时问题：

1. 业务大量使用了 `$router`，需要改成 `uni.navigateTo` 等
2. 空的 `template` 标签会产生 `fragment`，导致白屏
3. 对 `img/span/i` 等标签进行转换，可以用插件，用插件的优劣见上面。
4. 在页面中，对 `global-component` 等组件进行手动注入

## 7. 冰山之下

上层业务改动其实只是冰山之上，做了一些对普通开发者无感知的工程相关工作，是冰山之下，这里介绍下。

1. 脚手架
2. 通用Vite配置
3. H5发布
4. 小程序CI
5. 合包流失线
6. 统一的代码规范
7. 组件库和工具库的兼容

### 7.1. 通用 Vite 配置

通用 Vite 配置兼容项目底层库，让业务无缝升级 Vue3，具体包括以下内容。

#### 7.1.1. 插件支持

1. 支持条件编译
2. 支持关键词跨平台文件编译
3. 支持关键词跨平台样式编译
4. 支持 `rem` 转 `rpx`
5. 支持小程序下转化 `v-lazy` 指令
6. 支持小程序下去掉 Vue 指令
7. 支持构建产物分析
8. 支持 QQ 小程序下中 `globalThis polyFill`
9. 支持输出版本信息
10. 支持输出不兼容语法的警告信息
11. 支持动态修改 `vue.runtime.js`，解决编译问题

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/9/own_mike_ba280fde6f7614a7a2.png" width="500">

#### 7.1.2. 插件修复 uni-app 内部问题

1. 修复 uni-app 中自带 `useRem` 函数带来的样式适配问题

uni-app Vue2 版本的 H5 会把 `rpx` 转成 `px`，在 Vue3 版本中，会把 `rpx` 转成 `rem`，且算法与我们业务不一样，并且即使你没用 `rpx`，他也会在 `html` 挂上他计算出来的 `font-size`，这个必须去掉。查看源码，其实就是这个 `useRem` 函数，这里写了插件用 `AST` 去掉。

至于 Vue2 版本中是如何将 `rpx` 转成 `px` 的，可以看 `node_modules/@dcloudio/vue-cli-plugin-uni/packages/postcss/index.js` 文件，其是一个 `postcss` 插件，会把 `rpx` 先转成 `%?${num}?%` 这种格式，然后在 `styleLoader` 中将符合该正则的字符串通过 `upx2px` 转成 `px`。

2. 修复 uni-app 中 `monorepo` 仓库下打包路径问题

uni-app 运行时生成的引用路径错误，查看源码发现是 `packages/uni-cli-shared/src/utils.ts` 中的问题:

```ts
export function normalizeMiniProgramFilename(
  filename: string,
  inputDir?: string
) {
  if (!inputDir || !path.isAbsolute(filename)) {
    return normalizeNodeModules(filename)
  }
  return normalizeNodeModules(path.relative(inputDir, filename))
}
```

这里举个例子，`filename` 为 `/Users/yang/Documents/git-woa/guandan-match/node_modules/@tencent/press-ui/press-info/press-info.vue`，`inputDir` 为 `./src/project/guandan-match` 时，`path.relative` 生成的路径就会带上 `../`，这里背后的逻辑是 `inputDir` 和 `node_modules` 必须是同一级。


uni-app 社区也有其他人遇到了相同问题，参见：

- https://ask.dcloud.net.cn/question/152306
- https://github.com/dcloudio/uni-app/issues/3049

如何解决呢？

尝试了覆盖 `rollupOptions`，发现不够，采用的是脚本改源码 + 插件修改 `rollupOptions.output.chunkFileNames`。

1. 修复 uni-app QQ小程序打包后 `appId` 错误问题

这个解决办法就是用插件将 `manifest.json` 中正确的 `appId` 复制到产物中。

4. 修复 uni-app 小程序下样式文件变化无法重新编译的问题

小程序开发时，独立的 `sass` 文件改动后并不会重新编译，用一个全新的示例工程也不可以。看了下源码，uni-app 是用 `import('vite').then({build}=>{})` 这种方式来启动的。

解决办法是利用 `gulp.watch`，监听 `./src/**/*.scss` 文件，然后修改下 `main.ts`，然后这样就能重新编译了。同时加上了 `debounce`。

#### 7.1.3. 配置支持

1. 支持根据环境变量修改 `manifest` 中 `h5.router.base`，实现业务上云
2. 支持小程序下劫持 `window`, `location`, `localStorage` 等变量
3. 支持 `src` 等开头的 `alias`
4. 支持 H5 下三方库设置外链

对 `window/location/localStorage` 等变量的劫持并不能用之前的方式，之前是通过 `new Vue`，然后将那些变量的属性当作 `Vue` 的 `data、computed、method` 等。在 Vue3 中，则需要改成 `reactive` 实现响应式。

举个例子，对于 `cookie`，Vue2 的劫持是：

```js
const $document = new Vue({
  data() {
    return {
      location: $location,
      body: $body,
    };
  },
  computed: {
    cookie: {
      set(newVal) {
        $localStorage.setItem('uni-app-cookie', newVal);
      },
      get() {
        return $localStorage.getItem('uni-app-cookie') || '';
      },
    },
  },
  methods: {
    querySelector() {},
  },
});
(globalThis as unknown as GlobalThis).$document = $document;
```

Vue3 下是

```ts
const $document = reactive({
  location: $location,
  body: $body,

  cookie: computed({
    set(newVal) {
      $localStorage.setItem('uni-app-cookie', newVal);
    },
    get() {
      return $localStorage.getItem('uni-app-cookie') || '';
    },
  }),
  querySelector() {},
});
```

```ts
// vite.config.ts

{
  define: {
    document: 'globalThis.$document',
  }
}
```


### 7.2. 脚手架

实现 **uni-app + Vue3 项目、普通 Vue3 项目**的脚手架及模版搭建，可以一键创建新的工程、子工程，并接入了研发平台。

开发者一键创建后，只需安装依赖、配置环境变量两步，就可以进入业务开发，体验与 Vue2 工程一致，无需进行工程配置、Eslint配置等，无额外心智负担。

### 7.3. CI

对 **H5发布、小程序CI、合包流水线**做了改造，均支持 Vue3 项目，普通开发者无感知。

- H5发布同样支持 `history` 模式 和 `hash` 模式，编译速度更快
- 小程序CI同样支持微信和QQ双端，支持包大小记录、消息通知、错误提醒等
- 合包流水线支持其他子工程扩展，有一定通用性

### 7.4. 代码规范

样式规范无需变化，至于 `Eslint` 规范，发布了 `eslint-config-light-vue3`，更适合 `Vue3` 项目，并已对齐公司规范。

### 7.5. 组件库和工具库

组件库和工具库同时支持 Vue2 和 Vue3，这一点尤为重要，只有底层组件和工具都支持了，上层业务升级时才有底气。

Press UI 组件库支持 `2*(n+1)` 端，`2` 指的是 Vue2 + Vue3，`n` 指的是 uni-app 支持的 H5、各种小程序、APP等，`1` 指的是非 uni-app 的 H5。

工欲善其事，必先利其器。Press UI 组件库其实就是“利好的器”。


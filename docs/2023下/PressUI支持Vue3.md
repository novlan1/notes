## 1. 开始

Press UI 是一套基于 [uni-app](https://uniapp.dcloud.net.cn/) 的组件库，是项目内孵化的，但并不与任何业务绑定的底层组件库。

目前 Press UI 主要有三方面功能：

- 基础组件，提供与 [Vant](https://vant-contrib.gitee.io/vant/v2/#/zh-CN/) 相同API的组件，比如 Button、Picker 等共60多个
- 业务组件，在基础组件上搭建的、业务中沉淀的组件，目前有10多个
- 核心逻辑，包含路由寻址、IM模块封装等

下图是示例二维码，分别为H5、微信小程序、QQ小程序，以及非uni-app环境的普通H5项目。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_826bfef42386729465.png" width="600">

Press UI 是基于 Vue2 版本的 uni-app 搭建的，目前在使用的几个项目也都是 Vue2。但前端日新月异，Vue3 更快、性能更好，Press UI 如何兼容 Vue3 呢？

在兼容 Vue3 前，要先理解 uni-app 和 Vue 的关系。

uni-app是基于 vue 的，尽管有一些源码的魔改，但整体的响应机制、模版解析、语法都依赖 Vue。所以一个 Vue2 版本的组件库，要适配 Vue3，必然要修改一些语法，才可以达到兼容的目的。

## 2. 条件编译

在上一篇 Press UI 兼容普通 Vue 项目的时候，提到了条件编译是跨平台的核心。

其实兼容 Vue3 也可以用条件编译，且[uni-app](https://uniapp.dcloud.net.cn/tutorial/platform.html#preprocessor)已经支持了。

条件编译比`if else`的运行时判断有更小的包体积，性能更好。

```ts
// #ifndef VUE3
console.log('Vue2')
// #endif

// #ifdef VUE3
console.log('Vue3')
// #endif
```

## 3. 构建工具

Vue3 版本的 `uni-app` 构建工具是 `vite`，速度更快。

Press UI 工程依赖一些自定义的 `vue-cli`（`webpack`）的插件，它们都要重新实现一下 `vite` 版本的，比如：

- 转化v-lazy
- 转化rem

目前这些插件也已经沉淀到了 `uni-plugin-light` 中。

## 4. script语法兼容

下面是兼容 Vue3 时的遇到的语法转化问题，这里记录下。


### 4.1. Vue语法转换

| 2.x 全局 API               | 3.x 实例 API (app)                         |
| -------------------------- | ------------------------------------------ |
| Vue.config                 | app.config                                 |
| Vue.config.productionTip   | 移除                                       |
| Vue.config.ignoredElements | app.config.compilerOptions.isCustomElement |
| Vue.component              | app.component                              |
| Vue.directive              | app.directive                              |
| Vue.mixin                  | app.mixin                                  |
| Vue.use                    | app.use                                    |
| Vue.prototype              | app.config.globalProperties                |
| Vue.extend                 | 移除（Vue.createApp）                      |



参考：https://v3-migration.vuejs.org/zh/breaking-changes/global-api.html


### 4.2. 移除`$on`、`$off`等eventBus的api

press-ui中只有一处使用，且可以移除。

参考：https://v3-migration.vuejs.org/zh/breaking-changes/events-api.html



### 4.3. $set废弃

Vue3 废弃了`$set`，如果还使用会报错，所以需要兼容下。

```ts
dialog.set = (...args: any[]) => {
  if (typeof dialog.$set === 'function') {
    dialog.$set(dialog, ...args);
  } else {
    dialog[args[0]] = args[1];
  }
};
```

参考：https://blog.csdn.net/weixin_44255044/article/details/120161235


### 4.4. $children废弃

Vue3 中已废弃 `$children`，需要改成 `$refs`。

Press UI 中可函数调用的组件，都是用的 `$children`，都需兼容使用 ref 的场景。

同时，使用 Press UI 的开发者，在预埋组件的时候，需要埋 ref，而不是 id。

之前：

```html
<press-popup
  :id="PRESS_PICKER_ID"
  mode="functional"
>
 xxx
</press-popup>
```


现在：

```html
<press-popup
  :ref="PRESS_PICKER_ID"
  mode="functional"
>
  xxx
</press-popup>
```


参考：https://v3-migration.vuejs.org/zh/breaking-changes/children.html


### 4.5. nextTick

Vue3 兼容如下：

```ts
export function nextTick(cb?: any) {
  // #ifndef VUE3
  Vue.nextTick(cb);
  // #endif

  // #ifdef VUE3
  vue3NextTick(cb);
  // #endif
}
```


### 4.6. provide、inject

Vue3 兼容如下：


```ts
export function toProvideThis(key) {
  return {
    // #ifndef VUE3
    provide() {
      return {
        [key]: this,
      };
    },
    // #endif

    // #ifdef VUE3
    setup() {
      const instance = getCurrentInstance() as any;
      provide(key, instance.ctx);
      return instance;
    },
    // #endif
  };
}


export function toInject(key) {
  return {
    // #ifndef VUE3
    inject: {
      [key]: {
        default: null,
      },
    },
    // #endif

    // #ifdef VUE3
    setup() {
      const value = inject(key);
      return { [key]: value };
    },
    // #endif
  };
}
```

### 4.7. emits

Vue3 现在提供了一个`emits`选项，类似于现有`props`选项，可用于定义组件可以向其父对象发出的事件。

强烈建议使用`emits`记录每个组件发出的所有事件。

>注意，emits 选项会影响一个监听器被解析为组件事件监听器，还是原生 DOM 事件监听器。被声明为组件事件的监听器不会被透传到组件的根元素上，且将从组件的 $attrs 对象中移除。

简单来说就是，没在子组件`emits`中声明，但在父组件用到的监听器，就会把这些当作**子组件根元素的原生事件监听器**。

同时，Vue3 也废弃了 `.native` 修饰符。

实际开发中，遇到一个案例。`press-swipe-cell`中如果没将`click`在`emits`暴露，父组件的`@click`事件有时会触发两次，多出来的那一次就是在根节点上的事件。


参考：

1. https://cn.vuejs.org/api/options-state.html#emits
2. https://zh.uniapp.dcloud.io/tutorial/migration-to-vue3.html#%E4%BA%8B%E4%BB%B6%E7%9A%84%E9%80%82%E9%85%8D

### 4.8. 生命周期兼容

- destroyed 修改为 unmounted
- beforeDestroy 修改为 beforeUnmount

Press UI 采用的是两种写法共存。


### 4.9. scroll-view 的 scroll 事件

`Vue2` 要从 `scroll-view` 中获得 `scrollTop`，需要 `event.detail.scrollTop`

`Vue3` 需要 `event.target.scrollTop`

```ts
onScroll(e) {
  this.scrollTop = e.target.scrollTop ?? e.detail.scrollTop;
},
```

## 5. template语法兼容

### 5.1. 空的template

不要用空的template，

- 在 Vue.js 2.x 中，`<template>`没有特定指令的元素无效
- 在 Vue.js 3.x 中，`<template>`没有特定指令的元素按`<template>`原样渲染元素

```html
<template>
  <!-- ✓ GOOD -->
  <template v-if="foo">...</template>
  <template v-else-if="bar">...</template>
  <template v-else>...</template>
  <template v-for="e in list">...</template>
  <template v-slot>...</template>

  <!-- ✗ BAD -->
  <template>...</template>
  <template />
</template>
```

还有一个偷懒的办法，加上`v-if="true"`：


```html
<template v-if="true"></template>
```

参考：https://eslint.vuejs.org/rules/no-lone-template.html


### 5.2. slot使用

Vue2 中的`slot="xxx"`语法，需要转成 `v-slot:xxx`，或者`#xxx`

比如：

```html
<PressIconPlus
  slot="button"
  name="setting-o"
  size="22px"
/>
```

在 Vue3 中需要改成：

```html
<template #button>
  <PressIconPlus
    name="setting-o"
    size="22px"
  />
</template>
```

这个 Vue2 也是支持的。


### 5.3. 注释不要作为template中第一个元素

在 Vue3 中注释也作为一种特殊的元素，如果第一个元素是注释，`this.$el`就会指向它，如果代码里用到了`el`的属性或方法，比如`querySelector`就会报错。

举例如下：

```html
<template>
  <!-- Some Comments Here -->
  <div>xxx</div>
</template>
```

此时在 Vue3 中打印下，就会看到`#text的一个元素`。可以改成：

```html
<template>
  <div>
    <!-- Some Comments Here -->
    xxx
  </div>
</template>
```

### 5.4. v-model

Vue3 的 v-model 相对 Vue2 来说 ，有了较大的改变。可以使用多 model,相应语法也有变化。

用于自定义组件时，Vue3 的 `v-model` `prop` 和事件默认名称已更改 `props.value` 修改为 `props.modelValue`，`event.value` 修改为 `update:modelValue`。

Press UI 的适配方法是先引入通用适配器，然后少量改动组件。

```ts
export const vModelMixin = {
  props: {
    // #ifndef VUE3
    value: {
      type: [String, Boolean],
      default: '',
    },
    // #endif
    // #ifdef VUE3
    modelValue: {
      type: [String, Boolean],
      default: '',
    },
    // #endif
  },
  computed: {
    realModelValue() {
      let result = '';

      // #ifndef VUE3
      // @ts-ignore
      result = this.value;
      // #endif

      // #ifdef VUE3
      // @ts-ignore
      result = this.modelValue;
      // #endif
      return result;
    },
  },
  methods: {
    emitModelValue(this: any, value) {
      // #ifndef VUE3
      this.$emit('input', value);
      // #endif

      // #ifdef VUE3
      this.$emit('update:modelValue', value);
      // #endif
    },
  },

};
```

组件改动：

- 使用 `value` 的地方改成 `realModelValue`
- 抛出 `input` 事件改成 `this.emitModelValue(value)`

Press UI 中适配了 `v-model` 的的组件有：


- press-list
- press-message-board
- press-field


参考：
1. https://zh.uniapp.dcloud.io/tutorial/migration-to-vue3.html#v-model-%E7%9A%84%E9%80%82%E9%85%8D
2. https://v3-migration.vuejs.org/zh/breaking-changes/v-model.html


### 5.5. 移除.sync

Vue3 已经移除了 .sync 语法，可以直接用 v-model:title 的方式。Press UI 中如何兼容呢？

对于这种已经废弃的语法，Press UI 只能取二者的交集，也即是最普通的方式实现。

之前：

```html
<ComponentA
  :show.sync="showAddressPopup"
/>
```

现在：

```html
<ComponentA
  :show="showAddressPopup"
  @update:show="value => showAddressPopup = value"
/>aw
```


## 6. 工程适配


### 6.1. sass

不再默认支持sass，需要手动安装 sass-loader、sass

```bash
pnpm i sass-loader sass -D
```

参考：https://juejin.cn/post/7219225476707090490


### 6.2. 设置publicPath

vue2 设置路径：

- manifest.json -> h5 -> publicPath

vue3 设置路径：

- manifest.json -> h5 -> router -> base


### 6.3. importsNotUsedAsValues报错

Vue3 `tsconfig.json` 报错：

```
Option 'importsNotUsedAsValues' is deprecated and will stop functioning
in TypeScript 5.5. Specify compilerOption '"ignoreDeprecations": "5.0"'
to silence this error.
```

这个报错是因为 TypeScript 4.9 版本中引入了一个新的编译选项`importsNotUsedAsValues`，用于检查导入语句是否被使用。但是这个选项在 TypeScript 4.9 版本中只是一个实验性的特性，它的行为可能会发生变化或被移除。因此，在 TypeScript 4.9 版本中，这个选项默认是开启的，但是在 TypeScript 5.0 版本中，它已经被标记为过时，并且在 TypeScript 5.5 版本中将被移除。

解决办法，`tsconfig.json`中添加以下属性：

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "5.0",
    ....
  }
}
```

参考：
1. https://frontend.devrank.cn/traffic-information/7225569798384732215
2. https://stackoverflow.com/questions/75449286/how-to-fix-flag-importsnotusedasvalues-is-deprecated-and-will-stop-functionin


### 6.4. tree-shaking

Vue3 在 H5 平台发行时，会默认开启 `tree-shaking`，仅打包明确使用的api，比如`uni.request()`这种使用方式，而动态调用的方式不识别。

```ts
const method='request';
uni[method]()`
```

如果要关闭 `tree-shaking`，可以在 `manifest.json` 中配置：

```json
"h5": {
  "optimization": {
      "treeShaking": {
        "enable": false
    }
  }
}
```

其实，个人感觉这种 `tree-shaking` 有很大隐患，太过隐晦，很容易踩坑。

参考： https://ask.dcloud.net.cn/question/142426

## 7. 效果

下图是适配 Vue3 的示例：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/9/own_mike_ccae70ddaae15082b8.png" width="300">

## 8. 总结

总结一下 Press UI 是如何支持 Vue3 的。

- 将 Press UI 作为 submodule，搭建 Press UI V3 工程，进行调试和验证
- 编写适配代码，同时兼容 Vue2 和 Vue3 语法
- 对于某些相同API，但 Vue2 和 Vue3 表现不一致的，也进行兼容
- 利用条件编译，减少代码冗余，减少代码体积
- 编写 Vite 相关插件，支持 Press UI 工程

其实 Press UI 适配 Vue3 的大部分工作就是做一些适配器，从上面遇到的问题可以看出，Vue3 相对 Vue2，大部分 `template` 语法是向下兼容的，但 `script` 语法大部分是 `breaking` 的。

之前总有人问，可不可以实现一个兼容 Vue2 和 Vue3 的组件库，经过上面的实践证明，是可行的。


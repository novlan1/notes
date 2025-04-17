## 1. 开始

[Press UI](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui/) 近期迁入了活动组件，这里记录下遇到的问题、解决方法以及一些思考。

何为活动组件？这里指的是展示类的某业务组件。

## 2. 样式

样式处理是迁移的重点。关于样式，要处理以下几点：

1. 如何在示例工程中**动态切换样式**，使得开发者、使用者都方便调试
2. 如何**动态隐藏 `@TIP_STYLE_NAME` 引入的样式，**满足同一页面同一组件在不同位置有不同表现
3. 如何让组件在拥有默认样式的同时，又可以随时去掉
4. 如何改造之前的写法到 BEM

下面一个个说。

### 2.1. 动态切换样式

要做到运行时动态切换样式，样式文件一定是打包进去的，可以是一个外链形式，也可以直接打到一起。

这里是示例工程，就直接打包到一起了。

本质是**条件式动态引入样式**。页面切换参数后，给 `body` 更改 `class`，组件 `Scss` 中监听此 `class`，然后引入不同样式。

这里用了 `loader`，是因为样式类型特别多。崇尚刀耕火种的，也可以自己写。

插入内容示例如下：

```scss
body.press-act-award-dialog--type-pvp {
  @import "./css/pvp.scss";
}

body.press-act-award-dialog--type-gp {
  @import "./css/gp.scss";
}
```


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/11/own_mike_4c2a77c7fa33d7f435.png" width="500"/>

小程序内稍有不同：

1. 不支持在 `scss` 中条件式动态引入外部 `scss`，只能在 Vue 文件中引入
2. 不能在 `body(page)` 上动态添加类名，只能在页面内部添加
3. `@font-face` 在 `@import` 动态引入后，会存在嵌套，导致报错
4. Vue 文件中动态引入的 `scss`，如果引入其他相对路径的文件，比如 `svg`，会存在引用地址错误

所以在小程序中要动态切换样式时，会不得已在 `loader` 或 `plugin` 中，额外删除或替换掉部分内容。

这里会产生一个问题，要不要在 H5 和小程序端采用相同的方式，也就是 H5 是否使用阉割的方法？

我的选择是不要阉割，H5 应该始终保持**高的语法灵活性、功能完备性**，不能因为是跨平台项目就去阉割。简单来说，**尽量保持统一性，并追求“渐进式增强”**。

### 2.2. 动态隐藏 @TIP_STYLE_NAME 样式

之前通过 `@TIP_STYLE_NAME` 引入的样式，可以通过传入 `hideTipStyle` 来隐藏。

Press UI 通过在**组件顶部加类名**（注意不是结构），以及样式中控制，比如：

```html
<div
  v-if="show"
  :class="[getActClass('cover'), {
    'press-act--hidden-tip': hideTipStyle,
  }, 'press-act']"
>
</div>
```

```scss
.press-act:not(.press-act--hidden-tip) {

  .press__btn--small-primary {
    display: inline-block;
  }
}
```

需要注意：

1. 样式加了一级后，优先级会变，可能会造成局部异常
2. 之前的顶部类名要兼容，可在对应的样式文件中搜索 `[^&].tip-comp-cover`，替换为 `&.tip-comp-cover`
3. `@import` 语句不能写在非顶部，也就是包裹起来的部分，否则父组件可能引用不到变量，可以全局搜 `\n@`，找到后移到顶部


### 2.3. 支持隐藏默认样式

设置 `hideBaseStyle` 为 `true` 后，组件内在 `body` 上添加 `{component}--hidden` 的类名，组件样式据此判断是否加载默认样式。

```scss
body:not(.press-act-explain-dialog--hidden) {
  @import "./css/pvp-vertical.scss";
}
```

### 2.4. BEM 改造

**想清楚为什么做比怎么做更重要**。

BEM 好处有：

1. 见名知义，也就是结构和状态一看便知，可读性高
2. **可读性高就意味着易维护**

BEM 改造中需要注意：

1. 组件库公共样式中，改造后的类名应全局保持一致
2. 要兼容旧的写法，默认使用新写法
3. 只有 `Vue` 文件需要写两套类名，`Scss` 文件不需要，因为加了 `scoped` 后， `Scss` 文件不会作用到外部

具体实现的话，不能纯手工替换，**效率低是其次，更危险的是容易出错**。

这里采用**脚本+人工**的方式。脚本用来提取类名以及替换，人工定义新类名，并 `CR` 脚本替换后的代码。

主要步骤：

1. 脚本提取 `Vue` 文件类名，生成列表
2. 人工给出新旧类名对应关系，尽量一一对应，不要一对多或者多对一，并注意公共样式类名
3. 脚本修改 `Vue` 文件，用统一方法替换旧类名，注意这里是向后兼容写法
4. 脚本修改 `Scss` 文件，替换旧类名
5. 检查代码，检查示例工程，提交


映射表示例如下：

```ts
export const TIP_CLASS_MAP = {
  benefit: 'tip-act-welfare-item',
  top: 'tip-act-welfare-top',

  'shop-icon': 'tip-act-welfare-shop-icon',
  'shop-name': 'tip-act-welfare-shop',
  'shop-desc': 'tip-act-welfare-range',
}
```

类名获取核心函数如下，优先新类名，支持旧类名：

```ts
export function getActClass(useTipClass, tipClassMap, args) {
  const list = getClassList(args);

  const tipClasses = list.map(item => (item ? tipClassMap[item] || '' : ''));
  const pressClasses = list.map((item) => {
    const reg = new RegExp(`^${PREFIX}`);
    if (!item) {
      return '';
    }
    if (reg.test(item)) {
      return item;
    }
    return `${PREFIX}${item}`;
  });

  if (!useTipClass) {
    return pressClasses.join(' ');
  }

  return [...pressClasses, ...tipClasses].join(' ');
}
```


## 3. 其他

### 3.1. TIP_STYLE_NAME

对于老的关键词编译，Press UI 本次并未改动，依然可以加载一种或多种游戏的样式。

不过，这里没有用 `@TIP_STYLE_NAME` 关键词判断是否需要动态切换样式，而是引入了新的 `base.scss`，下面说下为什么不用老的关键词。

`@TIP_STYLE_NAME` 其实是**蹩脚的设计**，组件内使用它后，意味着**必须搭配一个 `loader` 处理**，而 `base.scss` 是真实存在的文件，无需引入任何额外工具。另外一些活动组件也没有引入 `@TIP_STYLE_NAME`。

**多游戏的样式替换，完全可以用条件编译**，之前文章也有写。


### 3.2. 组件沉淀规范

1. 文档 props 字段为横杠写法，不能为驼峰

正确写法：

| 参数           | 说明             | 类型      | 默认值  |
| -------------- | ---------------- | --------- | ------- |
| show-pic       | 是否显示图片     | _boolean_ | `false` |
| props-data     | 弹窗数据         | _Object_  | -       |
| show-close-btn | 是否显示关闭图标 | _boolean_ | `true`  |

错误写法：

| 参数         | 说明             | 类型      | 默认值  |
| ------------ | ---------------- | --------- | ------- |
| showPic      | 是否显示图片     | _boolean_ | `false` |
| propsData    | 弹窗数据         | _Object_  | -       |
| showCloseBtn | 是否显示关闭图标 | _boolean_ | `true`  |


2. 文档 props 默认值

`string/array/object`，默认为空/空数组/空对象时，一律写为`-`，不要写 `''`/`[]`/`{}`，冗余且没意义。

3. 复杂对象 props

必须注明每个字段的类型，如下：

```ts
type IPropsData = {
  dialogClass?: string; // 弹窗额外类名
  storePic?: string; // 商户图片
  storeName?: string; // 商户名称

  title?: string;
  content: string;
  subContent?: string // 额外说明文案
  isGold?: boolean; // subContent 是否添加 -gold 类名

  btnText?: string; // 确认按钮文案
  cancelBtnText?: string; // 取消按钮文案
  btnClass?: string; // 确认按钮额外类名
  cancelBtnClass?: string; // 取消按钮额外类名

  hasHook?: boolean; // 是否有对勾Dom
}
```

### 3.3. 文档与示例通信

示例页面切换样式类型后，通过 `postMessage` 通知文档更改横竖屏，达到更好的展示效果。

自定义参数中的 Picker，会判断页面高度，自动更改横竖屏类型。


## 4. 打包

Press UI 组件的使用方式一直都是源码方式，也就是在 `vue.config.js` 中添加 `transpileDependencies` 配置，现在支持了将组件打包成 `js` 文件，方便在普通 H5 项目中使用。下面记录下实现方式、遇到的问题及解决办法。

实现上参考了 element-ui 和 vant 的打包，支持每个组件单独打包，以及所有组件打包到一起（all in one），并支持按需加载。

遇到的问题如下：

### 4.1. font-face

`@font-face` 中的 `url` 需要加引号，如果不加的话，在 `scss` `中没问题，css` 中引入会失败。

### 4.2. icon 乱码

伪类 `content` 中的内容在编码后会变成乱码，尽管在 `html` 中可以正常显示，但是在 `css` 文件中都是无法预览、无法修改的。

这个问题困扰了挺多人，一些人说是 `dart-scss` 的问题，换成 `node-scss` 可以解决。这里我直接将这部分 `icon` 用 `css` 实现了，不用 `scss`，也解决了这个问题。

参考：

- https://webpack.docschina.org/loaders/sass-loader/#sassoptions
- https://github.com/PanJiaChen/vue-element-admin/issues/3526


### 4.3. css 相关的loader

`style-loader` 的作用是在 `html` 中插入 `style` 标签，单组件分别打包时，也就是和 `MiniCssExtractPlugin.loader` 搭配时不需要，如果使用会报错：

```bash
window is not defined
# or
document is not defined
```


参考：

- https://github.com/webpack-contrib/style-loader/issues/461

## 1. Press Plus

[Press Plus](https://novlan1.github.io/press-plus-demo/) 是从 [Press UI](https://novlan1.github.io/press-ui/h5/) 中剥离的业务组件部分，为什么要分离呢，有下面几点考虑。

1. 基础组件库已十分稳定，业务组件库频繁改动，并且越来越多，存在影响基础组件的风险
2. 持续维护包含大量组件，且高质量的组件库比较累，分离后，`Press UI` 继续追求 `100` 分，`Press Plus` 追求 `95` 分
3. 从用户角度看，使用者如果只用基础组件，完全没必要下载业务组件，而且后续业务组件越来越多，包体积也会越来越大

### 1.1. 形式

`Press Plus` 能否放到 `Press UI` 大工程里，以 `monorepo` 形式组织呢？

不可以，权限要隔离，`Press UI` 是核心组件库，而 `Press Plus` 后续会逐步放开，允许更多人参与。

`Press Plus` 能否以 `submodule` 的形式放到 `Press UI` 工程里呢？

也是不行的，`Press UI` 是 `Press Plus` 的 `npm` 依赖，如果又以 `submodule` 的形式引入，会增加项目复杂度，难以维护。

### 1.2. 重复代码

重复代码太多是设计不合理的体现。`Press Plus` 和 `Press UI` 有大量重复代码，包括文档、脚本，如何解决呢？

1. 通用的逻辑做成 CLI 命令
2. 脚本同步代码
3. 配置驱动，不同的地方，单独放到配置文件夹下

### 1.3. 标准

`Press Plus` 相比 `Press UI`，会在以下几个方面降低标准：

1. 根据业务自身需要，进行 `Vue3` 的适配
2. 根据业务自身需要，进行非 `uni-app` 环境的适配
3. 根据业务自身需要，进行**国际化支持**

上述几点在 `Press UI` 中是全量支持的。

`Press Plus` 和 `Press UI` 都必须遵守的规范包括：

1. 严格的代码规范
2. BEM 规范，且类名需以 `press` 开头
3. 详尽的文档、丰富的示例

### 1.4. 过渡

业务组件过渡注意事项：

- 业务侧需尽快将业务组件的引入路径，改为 `Press Plus`
- `Press UI` **在下个大版本前，都不会删除现有的业务组件**，确保业务侧升级 `Press UI` 时，无大量改动
- 业务组件的更新，要在 `Press Plus` 中进行，`Press UI` 不再维护、新增业务组件


## 2. Element Light

缺个 PC 组件库，由于组内大部分项目都是 Vue 的，所以基于 `Element UI` 搭建了 [Element Light](https://h5.igame.qq.com/pmd-mobile.support.element-light.element-light/#/zh-CN)，旨在沉淀更多业务组件、二次封装基础组件。

这里介绍下如何搭建的，以及遇到的问题和解决办法。

### 2.1. 为什么做

为什么要做 `element-light` 呢，直接放在 `component` 子仓库不就行吗？

放在 `component` 子仓库存在以下问题：

1. 文档缺失，对开发者不友好
2. 无在线示例，无法查看效果
3. 与业务项目存在耦合，有些组件甚至依赖项目的 `mixin` 中的变量

为什么不放到 `press-ui` (一个跨平台的移动端组件库)中？

1. `element-light` 和 `press-ui` 二者使用场景有明显不同，一个是移动端，一个是 PC 端
2. `press-ui` 示例是移动端的小窗口，`element-light` 示例需要浏览器整个窗口，改造有成本，且并不美观
3. `press-ui` 严格控制外部依赖，基础组件零外部依赖，而 `element-light` 会引用大量第三方库
4. `press-ui` 是跨平台项目，如果把 `element-light` 组件放入，其他端必须用条件编译去掉，太多冗余代码


### 2.2. 问题

#### 2.2.1. sass 版本

`element-ui` 仍使用 `node-sass`，由于`gyp`经常安装失败，这里改成了 `sass`。

```json
{
  "sass": "^1.50.1",
  "sass-loader": "^7.3.1",
}
```


#### 2.2.2. 组件互相引用

组件内互相引用的话，不能使用相对路径，这样会在打包时，把子组件也打进去。比如:

```ts
import ElCard from '../../card/src/main';

export default {
  component: {
    ElCard,
  }
}
```

需要改成从 `element-ui/packages` 中引入，即：

```ts
import ElCard from 'element-ui/packages/card';
```

打包的时候，会把 `element-ui` 当作 `externals` 排除出去。

#### 2.2.3. 引入三方库

引入的三方库都不会打包进去，比如 `echarts`，所以需要在 `dependencies` 或 `peerDependencies` 声明。

这样有个好处是，业务组件沉淀的时候可以放心引入三方库，不会增加包体积，以及不会有打包格式问题。

#### 2.2.4. 打包配置修改

打包的 `externals` 需要修改，否则还是会寻找 `element-ui`。之前是：

```ts
Object.keys(Components).forEach(function(key) {
  externals[`element-ui/packages/${key}`] = `element-ui/lib/${key}`;
});

externals['element-ui/src/locale'] = 'element-ui/lib/locale';
utilsList.forEach(function(file) {
  file = path.basename(file, '.js');
  externals[`element-ui/src/utils/${file}`] = `element-ui/lib/utils/${file}`;
});
mixinsList.forEach(function(file) {
  file = path.basename(file, '.js');
  externals[`element-ui/src/mixins/${file}`] = `element-ui/lib/mixins/${file}`;
});
transitionList.forEach(function(file) {
  file = path.basename(file, '.js');
  externals[`element-ui/src/transitions/${file}`] = `element-ui/lib/transitions/${file}`;
});
```

更新为：

```ts
function addExternalsForLightAndUI(externals, key, value) {
  externals[`element-ui/${key}`] = value;
  externals[`element-light/${key}`] = value;
}

Object.keys(Components).forEach(function(key) {
  addExternalsForLightAndUI(externals, `packages/${key}`, `element-light/lib/${key}`);
});
addExternalsForLightAndUI(externals, 'src/locale', 'element-light/lib/locale');
// ...
```

以及 `output.filename` 和 `package.json` 中的 `main` 都改为 `'element-light.common.js'`。

并增加 `element-light` 的 `alias` 配置。

```ts
exports.alias = {
  main: path.resolve(__dirname, '../src'),
  packages: path.resolve(__dirname, '../packages'),
  examples: path.resolve(__dirname, '../examples'),
  'element-ui': path.resolve(__dirname, '../'),
  // 新增
  'element-light': path.resolve(__dirname, '../')
};
```

### 2.3. 其他

#### 2.3.1. markdown 中字符串太长

字符串太长没有换行，可以这样加：

```markdown
<code style="word-break: break-all;">https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js</code>
```

#### 2.3.2. 依赖注入

沉淀图片上传时，可以将上传接口当成参数传递进来，组件只需要关心这个方法的返回，父组件不需要关心子组件，只需要接收参数，并发送请求，返回一个特定的 Promise 即可。

本质上，这是依赖注入的思想，`press-ui`、`t-comm` 都有大量使用。

#### 2.3.3. 不定动态slot多层传递

看这个小标题就知道有多复杂，`element-light` 沉淀了 `table-plus` 组件，该组件有大量 `slot`，包括具名插槽：

```ts
<slot
  :scope="scope"
  :index="scope.$index"
  :row-data="scope.row"
  :table-field="item"
  name="custom"
/>

<slot
  name="pagination"
>
</slot>
```

以及根据传入 `slotName` 的动态插槽：

```html
<slot
  v-if="item.slotName"
  :scope="scope"
  :name="item.slotName"
/>
```

还有没指定 `slotName`，根据索引值的动态插槽：

```html
<slot
  v-else-if="item.isSlot"
  :scope="scope"
  :name="`${scope.$index}-${cIndex}`"
/>
```

现在的问题是，如何实现一个中间组件，它引入 `element-light` 中的 `table-plus`，同时上层业务不改动？

简单来说就是，**不确定数量、不确定名称的 `slot` 的多级传递**。

`element-light` 是这样实现的，过滤出 `columnData` 中指定 `slotName` 的列，并获取 `tableData` 的数量以及 `columnData` 的数量，也就是行数和列数，构造这些动态名称，传递给动态插槽。

```html
<template
  v-for="(item) of innerSlotList"
  #[item]="scopeA"
>
  <slot
    :name="item"
    :scope="scopeA.scope"
    :index="scopeA.index"
    :row-data="scopeA.rowData"
    :table-field="scopeA.tableField"
  />
</template>
```

```ts
function getTableColumnSlots(lines, columns) {
  const res = [];
  for (let i = 0; i < lines; i++) {
    for (let j = 0;j < columns;j++) {
      res.push(`${i}-${j}`);
    }
  }
  return res;
}

export default {
  props: {
    ...TablePlus.props,
    slotList: {
      type: Array,
      default: () => ([]),
    },
  },
  computed: {
    innerSlotList() {
      const { columnData, slotList, tableData } = this;
      const slots = columnData.filter(item => item.slotName).map(item => item.slotName);
      const res = [
        ...slotList,
        ...slots,
        ...getTableColumnSlots(tableData.length, columnData.length),
      ];

      return res;
    },
  },
};
</script>
```

其实这种方式完全得益于 Vue 语法自身的灵活性，组件的一切都可以由外界传入，可以一边指定名称，一边指定里面的内容。


## 3. 版本控制

有时，组件库的一些更新是需要测试和验证的，需要发 `alpha` 或 `beta` 版本，那么一个问题是，当用户执行 `npm i press-plus@latest` 时，会装上 `alpha` 版本或者 `beta` 版本吗？

答案是可能会，取决于**发布时是否添加标签**。

`npm install xxx@latest` 的 `latest` 是一个发布标签，而类似 `1.0.0-beta.0` 中的 `beta` 是版本标识，如果你想发布一个测试版本，不希望普通用户下载，只希望测试人员安装，则需要在 `npm publish` 指定标签，比如 `npm publish --tag beta`，不指定的话，这个 `tag` 就是 `latest`。

```bash
npm publish --tag beta
```

可以通过 `npm view press-ui` 或者 `npm dist-tag ls press-ui` 命令查看 `npm` 包有哪些发布标签，及对应的版本。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/12/own_mike_eb54cab8d8f8b35a4b.png" width="600" />

此外，还可以通过 `npm dist-tag add <package-spec (with version)> [<tag>]` 或者 `npm dist-tag rm <package-spec> <tag>` 对发布标签进行增删改。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/12/own_mike_bb5f9176ff021178a2.png" width="500" />

参考：
- https://docs.npmjs.com/cli/v10/commands/npm-dist-tag
- https://github.com/iuap-design/blog/issues/248
- https://juejin.cn/post/7133175128988319775


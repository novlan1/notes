
由于vue-router中的scrollBehavior只在history模式中有效，需要自己实现记录滚动位置，当返回的时候，恢复原来的位置。

### 1. 实现前提

路由组件需要被`<keep-alive>`包裹，即缓存组件实例，不将其销毁。

### 2. 基本实现

1、在每个路由页面的beforeRouteLeave记录滚动位置即scrollTop

2、当回退时，activate的生命周期中调用scrollTo方法，滚动到之前的位置。

### 3. 优化

如果在每个路由页面写的话，代码有些冗余，因此尽量抽出公共部分，写最少的代码，方便后续维护。

### 4. 优化实现

1、在滚动的父元素上添加指定的class（拥有不为0的scrollTop）

```html
<div
  class="keep-position-wrap"
>
  <ul>
    <li>...</li>
    ...
  </ul>
</div>
```

2、在路由元信息添加标志位，表明该页面需要记录滚动位置

```js
const routeMap = [{
  path: '/index/merchant',
  name: 'index_merchant',
  meta: {
    title: '商家福利',
    keepPosition: true, // 表示该页面需要记录滚动位置
  },
  component: () => import('@/views/index/merchant'),
  },
]
```

3、在全局的afterEach中读取滚动元素的scrollTop，并保存在from.meta中，由于组件内部可以通过this.$route获取路由信息，也就能拿到scrollTop。

```js
router.afterEach((to, from) => {
  const keepPositionWrap = document.querySelector('.keep-position-wrap');
  if (from.meta && from.meta.keepPosition && keepPositionWrap) {
    const { scrollTop } = keepPositionWrap;
    from.meta.$scrollTop = scrollTop;
  }
});
```

4、将activate生命周期放到mixin中，拿到scrollTop，并滚动到scrollTop。

```js
activated() {
  const keepPositionWrap = document.querySelector('.keep-position-wrap');
  if (keepPositionWrap
    && this.$route
    && this.$route.meta
    && this.$route.meta.keepPosition
    && this.$route.meta.$scrollTop
  ) {
    keepPositionWrap.scrollTo(0, this.$route.meta.$scrollTop);
  }
}
```

对于我们项目组来说，要实现记录位置，只需要做两点：

1. 在滚动的父元素上添加class：`keep-position-wrap`
2. 在路由元信息中添加：`keepPosition: true`

参考：

1. https://router.vuejs.org/zh/guide/advanced/scroll-behavior.html
2. https://www.cnblogs.com/mmzuo-798/p/12901425.html

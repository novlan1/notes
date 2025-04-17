



## 1. 开始


项目要在多个页面上加自定义导航栏，还要有渐变效果，就是随着页面上滑，导航栏透明度由0逐渐变为1。这里面有几个基本点需要注意下。


## 2. page的样式

page 不能是`height: 100%`，可以设置`height: auto`，这样才可以触发 onPageScroll。

## 3. onPageScroll


只有 page 才有 onPageScroll 事件。试验发现，mixin 和页面内都写了 onPageScroll 的话，都会触发。

如果把它放在 mixin 中，写成下面这样，可能会有问题：

```ts
data() {
  return {
    pageScrollTop: 0,
  };
},
onPageScroll({ scrollTop }) {
  this.pageScrollTop = scrollTop || 0;
},
```

因为自定义导航栏不一定要在页面级组件上，很多页面都是写在子组件里，而 mixin 是各个组件各自维护了一份data，所以无法传递。这也是Vue组件和小程序组件的不同之处。

解决方法有多个：
- 将 onPageScroll 写在页面级组件上，然后获取到 scrollTop 后传给子组件，这种方法太麻烦
- onPageScroll 依然写在 mixin 中，保存 scrollTop 到 vuex 的 state 中，然后在页面或者组件中获取这个 state


## 4. 性能问题


这里面还有两个性能相关的点要注意下：

1. 只有页面级组件或者个别组件需要用的数据，不要放在 mixin 的 data/computed 中。因为 mixin 是所有组件的混入，并且 uni-app 中所有 data 和 computed 都会作为渲染依赖（不管用没用到），可能会引起很多性能开销。
2. onPageScroll 中不要做复杂逻辑，不要频繁调用 setData，在 uni-app 中就是不要频繁更新 data。因为小程序是双线程通信，逻辑层更改数据要先到 native层，再传到渲染层，中间可能还有 JSON.stringify 等操作。



## 5. 方案

综上，目前采用的方案是：

- mixin中，监听 onPageScroll，因为这个在只会在当前页面触发，子组件会被忽略，所以写在这里并不影响性能。

- vuex 中保存 pageScrollTop、mpHeaderHeight，及一个衍生变量 mpHeaderBg。

- 然后，需要使用 mpHeaderBg 的页面，去引用 vuex 中的变量。

- 如果想要在一个新页面加上渐变导航，只需要引用 vuex 中的 mpHeaderBg 即可。


## 6. 代码

```vue
// 某个页面
<template>
  <MatchHeaderMp
    :header-bg="mpHeaderBg"
  />
</template>
<script>
computed: {
  mpHeaderBg() {
    // getMpHeaderBg 方法来自于 mixin
    return this.getMpHeaderBg();
  },
}
</script>
```

```js
// mixin
export const uniSystemInfoMixin = {
  data() {
    return {
      // page-meta上设置的根标签字体大小
      mixinRootFontSize: 50,
    };
  },
  mounted() {
    // 设置根字体大小
    this.onSetFontSize();
  },
  onPageScroll({ scrollTop }) {
    const mpHeaderHeight = this.$store.state.wxHeader.mpHeaderHeight || 44;
    const pageScrollTop =  this.$store.getters.['wxHeader/pageScrollTop'] || 44;
    const parsedScrollTop = scrollTop > mpHeaderHeight ? mpHeaderHeight : scrollTop;

    // 如果滑动值大于 mpHeaderHeight，就不再更新 data
    if (parsedScrollTop === mpHeaderHeight && pageScrollTop === mpHeaderHeight) {
      return;
    }
    this.$store.commit('wxHeader/setPageScrollTop', parsedScrollTop);
  },
  beforeDestroy() {
    if (this.mpType === 'page') {
      this.$store.commit('wxHeader/setPageScrollTop', 0);
    }
  },
  methods: {
    getMpHeaderBg() {
      const pageScrollTop = this.getMpPageScrollTop();
      const mpHeaderHeight = this.$store.state.wxHeader.mpHeaderHeight || 44;
      return `rgba(255, 255, 255, ${Math.min(1, pageScrollTop / mpHeaderHeight)})`;
    },
    getMpPageScrollTop() {
      const curPageName = this.getCurPageName();
      const pageScrollTopMap = this.$store.state.wxHeader.pageScrollTopMap || {};
      return pageScrollTopMap[curPageName] || 0;
    },
    getCurPageName() {
      const pages = getCurrentPages();
      return pages[pages.length - 1].route;
    },
    onSetFontSize() {
      // 宽度 375 时（iphone6），rootFontSize为50，则一份为 375/50=7.5
      const screenNumber = 7.5;
      const that = this ;

      if (that.mpType === 'page') {
        // 窗体改变大小触发事件
        uni.onWindowResize((res) => {
          if (res.size.windowWidth) {
            that.mixinRootFontSize = parseFloat(res.size.windowWidth) / screenNumber;
          }
        });

        // 打开获取屏幕大小
        uni.getSystemInfo({
          success(res) {
            const fontsize = res.screenWidth / screenNumber;
            that.mixinRootFontSize = fontsize;
            const mpHeaderHeight = res.statusBarHeight + 44;
            that.$store.commit('wxHeader/setMpHeaderHeight', mpHeaderHeight);
          },
        });
    }
    },
  },
};
```


```js
// store/modules/wx-header.js
const wxHeaderStore = {
  namespaced: true,
  state: () => ({
    // 存放多个页面的pageScrollTop
    pageScrollTopMap: {},
    // 状态栏高度
    mpHeaderHeight: 44,
  }),
  mutations: {
    setPageScrollTop(state, pageScrollTop = 0) {
      const curPageName = getCurPageName();
      state.pageScrollTopMap = {
        ...state.pageScrollTopMap,
        [curPageName]: pageScrollTop,
      };
    },
    setMpHeaderHeight(state, mpHeaderHeight) {
      state.mpHeaderHeight = mpHeaderHeight;
    },
  },
};
```



## 7. 注意事项


1. 不要多个页面共享同一个变量，会存在多个页面互相影响的可能。
2. 小程序重新进入某个页面，都会重新回到顶部，包括`page`和所有`scroll view`，所以要在`beforeDestroy`中重置`pageScrollTop`。

































## 1. 抽取子组件后，页面异常卡顿

处理数据一定要放在父组件中，如果放在子组件中，会非常卡，日志显示createNode达到5000多个。

<img src="https://cdn.uwayfly.com/article/2025/4/own_mike_0024d288830b3cb3ca.png" width="900">

优化后：

<img src="https://cdn.uwayfly.com/article/2025/4/own_mike_06ec09070431539b0a.png" width="900">

实际处理非常简单，就是请求回接口后，在父组件进行数据的处理，比如格式化日期等。

排查历程：排除了ul-li因素，key格式，this.$set，datalist => obj.list 减少data的赋值

注：经大佬指出，是vue子组件的更新机制，但是web和native的性能差别较大， 建议在官网文档中指出。

## 2. `<p>{{汉字}}</p>`没有任何报错，加载不出来

类似的还有 `:title="汉字"`，问题的关键是不提示任何报错，极其不友好。

注：如前所述，问题的关键是Native没有任何报错，直接白屏，而web上有提示，并且页面其他部分正常。

## 3. keep-alive保留了组件，hippy的路由参数变化，也不触发mounted

解决方法：既然mounted不会触发，就在activated中去再次请求数据。

注：与Hippy无关，是Vue-router机制。

## 4. 分享截图中，背景色为异常的黑色，正常页面为白色

解决：在shot-view上加上background-color: #fff

注：此为业务相关，不通用；background不生效

## 5. 分享截图中，用shot-view包裹住截图的部分，导致页面卡顿

在shot-view元素加上 `position:relative;flex:1;`

注：此为业务相关，不通用

## 6. 如何让Hippy的ul元素兼容H5？

为什么要兼容H5呢？

为了只写一套代码，而Hippy中ul的@loadMore和@endReached事件，H5显然不支持。

如何兼容？

写一个全局组件，判断当前环境，如果是Hippy环境，就用Hippy原生的ul，否则就用vant的list。

具体实现中，要注意数据的传递，van-list和hippy的ul需要的props不同。

index.hippy.vue

```html
<template>
  <ul
    :class="uClass"
    :numberOfRows="dataLength"
    @loadMore="loadMore"
    @endReached="loadMore"
  >
    <slot />
  </ul>
</template>
```

index.h5.vue

```html
<template>
  <van-list
    @load="loadMore"
  >
    <slot />
    <div
      v-if="finished"
      :style="loadingH5Style"
    >
      没有更多了
    </div>
    <div
      v-if="loading && dataLength"
      :style="loadingH5Style"
    >
      加载中...
    </div>
  </van-list>
</template>
```

## 7. 如何用hippy提供的animation实现vue的loading？

Vue结构：

```html
<template>
  <div class="loading-wrap">
    <div class="loading-circle-wrap">
      <animation
        v-for="(item, index) of new Array(circleNumbers)"
        :key="index"
        playing
        :actions="actions[index] || {}"
      >
        <span class="circle" />
      </animation>
    </div>
    <p class="title">
      正在加载...
    </p>
  </div>
</template>
```

Vue逻辑：

```ts
function getActions(circleNumbers) {
  const actions = [];
  const unitDelay = 220;

  for (let i = 0; i < circleNumbers; i++) {
    actions.push({
      opacity: {
        startValue: 0,
        toValue: 1,
        duration: circleNumbers * unitDelay,
        delay: unitDelay * i,
        repeatCount: -1,
      },
    });
  }
  return actions;
}

export default {
  mounted() {
    this.onGetActions();
  },
  methods: {
    onGetActions() {
      const { circleNumbers } =  this;
      const actions = getActions(circleNumbers);
      this.actions = actions;
    },
  },
}
```

CSS：

```css
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.loading-circle-wrap {
  display: flex;
  flex-direction: row;
}
.circle {
  background-color: gray;
  height: 0.16rem;
  width: 0.16rem;
  border-radius: 0.08rem;
  margin-right: 10px;
  opacity: 1;
}
.title {
  font-size: 0.28rem;
}
```

同样地，由于animation元素只能在原生上使用，web上要用其他方案，就比较简单了。

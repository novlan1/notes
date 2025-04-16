## 一、开始

这是一篇简单的学习笔记。

## 二、结构

先看下pull-refresh组件的HTML结构：

```jsx
<div ref={root} class={bem()}>
  <div
    class={bem('track')}
    style={trackStyle}
    onTouchstart={onTouchStart}
    onTouchmove={onTouchMove}
    onTouchend={onTouchEnd}
    onTouchcancel={onTouchEnd}
  >
    <div class={bem('head')} style={getHeadStyle()}>
      {renderStatus()}
    </div>
    {slots.default?.()}
  </div>
</div>
```

可以看到下拉刷新的本质是对touch事件的监听，Vant这里是对class为track的元素的监听。

其中 renderStatus() 是 pulling、loosing、loading、success 这些状态的体现，就是一个div文本或者Loading组件：

```tsx
const renderStatus = () => {
  const { status, distance } = state;

  if (slots[status]) {
    return slots[status]!({ distance });
  }

  const nodes: JSX.Element[] = [];

  if (TEXT_STATUS.includes(status)) {
    nodes.push(<div class={bem('text')}>{getStatusText()}</div>);
  }
  if (status === 'loading') {
    nodes.push(
      <Loading
        v-slots={{ default: getStatusText }}
        class={bem('loading')}
      />
    );
  }

  return nodes;
};
```

## 三、下拉状态

看一下下拉状态的流转：

```
normal => pulling => losing => loading => success => normal...
```

假设触发下拉刷新的距离(pulling-distance)为M，头部占位距离(head-height)为N，动画时长(animation-duration)为D。状态流转解释如下：


- normal，原始位置
- pulling，下拉过程中下拉距离小于M的部分
- losing，下拉过程中下拉距离大于M的部分，松手前
- loading，松手后至数据加载完毕前，立即触发refresh事件，distance会被马上设置为N
- success，数据加载完毕后，下拉元素归位前，这部分存在时长为动画时长D。
- normal，动画运行完，归位

具体实现如下：

```ts
type PullRefreshStatus =
  | 'normal'
  | 'loading'
  | 'loosing'
  | 'pulling'
  | 'success';

const state = reactive({
  status: 'normal' as PullRefreshStatus,
  distance: 0,
  duration: 0,
});

const setStatus = (distance: number, isLoading?: boolean) => {
  const pullDistance = +(props.pullDistance || props.headHeight);
  state.distance = distance;

  if (isLoading) {
    state.status = 'loading';
  } else if (distance === 0) {
    state.status = 'normal';
  } else if (distance < pullDistance) {
    state.status = 'pulling';
  } else {
    state.status = 'loosing';
  }
};
```

在 onTouchMove 中会调用 setStatus 进行状态的流转：

```ts
const onTouchMove = (e: TouchEvent) => {
  if (!isTouchable()) {
    return;
  }
  const { deltaY } = touch;
  if (deltaY.value >= 0) {
    e.preventDefault();
    setStatus(ease(deltaY.value, PULL_DISTANCE));
  }
  touch.move(e);
};
```

在 onTouchEnd 中，会触发 refresh 事件：

```ts
const onTouchEnd = () => {
  state.duration = ANIMATION_DURATION;
  if (state.status === 'loosing') {
    emit('update:modelValue', true);
    nextTick(() => emit('refresh'));
  } else {
    setStatus(0);
  }
};
```



## 四、动画处理

在 onTouchStart 中，会将 state.duration 设置为0，这个数值会作为动画的持续时间。

这么做是为了在下拉的过程中不要有延迟，也就是animation-duration仅对松手释放、元素归位有效。

```ts
const onTouchStart = (e: TouchEvent) => {
  if (isTouchable()) {
    state.duration = 0;
    touch.start(e);
  }
};
```


下拉过程中，并不是向下拉多少，元素就向下位移多少，而是加了压缩，下拉越多，压缩比例越大。这样用户体验会好一点，而且几乎所有的APP都是这么做的。实现方式如下：

```ts
const ease = (distance: number) => {
  const pullDistance = +(props.pullDistance || props.headHeight);

  if (distance > pullDistance) {
    if (distance < pullDistance * 2) {
      distance = pullDistance + (distance - pullDistance) / 2;
    } else {
      distance = pullDistance * 1.5 + (distance - pullDistance * 2) / 4;
    }
  }

  return Math.round(distance);
};
```

## 五、样式

最后看下样式的实现。track 元素是`position: relative`，head 元素（就是“释放即可刷新...”等状态）是`position:absolute; transform: translateY(-100%)`。

```less
.van-pull-refresh {
  overflow: hidden;

  &__track {
    position: relative;
    height: 100%;
    transition-property: transform;
  }

  &__head {
    position: absolute;
    left: 0;
    width: 100%;
    height: var(--van-pull-refresh-head-height);
    overflow: hidden;
    color: var(--van-pull-refresh-head-text-color);
    font-size: var(--van-pull-refresh-head-font-size);
    line-height: var(--van-pull-refresh-head-height);
    text-align: center;
    transform: translateY(-100%);
  }
}
```

track 元素的下拉距离动画是写入行内的：

```js
const trackStyle = {
  transitionDuration: `${state.duration}ms`,
  transform: state.distance
    ? `translate3d(0,${state.distance}px, 0)`
    : '',
};
```

## 六、useTouch的实现

是利用的`event.touches[0].clientY/clientX`，来获取的`deltaY`，即拖动了多少。

```ts
export function useTouch() {
  const startX = ref(0);
  const startY = ref(0);
  const deltaX = ref(0);
  const deltaY = ref(0);
  const offsetX = ref(0);
  const offsetY = ref(0);
  const direction = ref<Direction>('');

  const isVertical = () => direction.value === 'vertical';
  const isHorizontal = () => direction.value === 'horizontal';

  const reset = () => {
    deltaX.value = 0;
    deltaY.value = 0;
    offsetX.value = 0;
    offsetY.value = 0;
    direction.value = '';
  };

  const start = ((event: TouchEvent) => {
    reset();
    startX.value = event.touches[0].clientX;
    startY.value = event.touches[0].clientY;
  }) as EventListener;

  const move = ((event: TouchEvent) => {
    const touch = event.touches[0];
    // safari back will set clientX to negative number
    deltaX.value = touch.clientX < 0 ? 0 : touch.clientX - startX.value;
    deltaY.value = touch.clientY - startY.value;
    offsetX.value = Math.abs(deltaX.value);
    offsetY.value = Math.abs(deltaY.value);

    // lock direction when distance is greater than a certain value
    const LOCK_DIRECTION_DISTANCE = 10;
    if (
      !direction.value ||
      (offsetX.value < LOCK_DIRECTION_DISTANCE &&
        offsetY.value < LOCK_DIRECTION_DISTANCE)
    ) {
      direction.value = getDirection(offsetX.value, offsetY.value);
    }
  }) as EventListener;

  return {
    move,
    start,
    reset,
    startX,
    startY,
    deltaX,
    deltaY,
    offsetX,
    offsetY,
    direction,
    isVertical,
    isHorizontal,
  };
}
```

复习下基础知识，鼠标事件属性：

- event.clientX、event.clientY
  - 鼠标相对于浏览器窗口可视区域的X，Y坐标（窗口坐标），可视区域不包括工具栏和滚动条。IE事件和标准事件都定义了这2个属性

- event.pageX、event.pageY
  - 类似于event.clientX、event.clientY，但它们使用的是文档坐标而非窗口坐标。这2个属性不是标准属性，但得到了广泛支持。IE事件中没有这2个属性。

  - event.clientX /event.clientY是目标点距离浏览器可视范围的X轴/Y轴坐标
  - event.pageX /event.pageY 是目标点距离document最左上角的X轴/Y轴坐标
  - 也就是body滚动的时候event.pageY比event.clientY大


- event.offsetX、event.offsetY
  - 鼠标相对于事件源元素（srcElement）的X,Y坐标，只有IE事件有这2个属性，标准事件没有对应的属性。

- event.screenX、event.screenY
  - 鼠标相对于用户显示器屏幕左上角的X,Y坐标。标准事件和IE事件都定义了这2个属性

HTMLElement属性：

- offsetLeft, offsetTop
  - offsetLeft从字面意思上理解，就是以父元素作为参照点（父元素的定位不能是static），当前元素相对于父元素左边的偏移量。
  - 那么offsetTop就是以父元素为参照物，当前元素相对于父元素上边的偏移量。
  - 如果没有父元素那么参照点就是body。
  - 这里要注意一点，如果当前定位元素本身是固定定位(position:fixed;)，那么就别费心找爹了，返回的是当前元素与可视窗口的距离。
- clientLeft、clientTop
  - 表示内容区域的左上角相对于整个元素左上角的位置（包括边框）。(取决于边框的像数值？)
- scrollLeft、scrollTop 
  元素滚动的距离大小

- offsetWidth、offsetHeight
  - 整个元素的尺寸，包括滚动条的宽度（包括元素高度、内边距和边框，不包括外边距）
- clientWidth、clientHeight
内容区域的宽高，不包括边框宽度值。包括滚动条的宽度（包括元素高度、内边距，不包括边框和外边距）
- scrollWidth、scrollHeight
  整个内容区域的宽度(包括需拉动滚动条隐藏起来的那些部分) `scrollWidth = scrollTop+clientWidth`


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/clientX-offsetX.png" width="500">


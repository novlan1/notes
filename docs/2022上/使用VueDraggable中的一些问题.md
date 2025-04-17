## 一、VueDraggable没有交换功能

[VueDraggle](https://github.com/SortableJS/Vue.Draggable)的issue中关于swap的有很多，比如#1089、#1014、#993、#466等，作者看起来无意解决这个问题（至少是Vue2版本）。

有一些开发者提了PR但并未被采纳，看到一个[PR](https://github.com/SortableJS/Vue.Draggable/pull/817/files)写的不错，在本地运行了一下，能实现自己的需求。已经发布到[vue-swap-draggable](https://www.npmjs.com/package/vue-swap-draggable)中。


## 二、autoScroll在拖动元素不可见时不生效

因为滚动区域并非全屏，上面有title，下面有button，总会存在拖动着的元素被遮挡的情况，当被遮挡时，自动滚动不会生效。

通过查看源码发现，这个问题的根源在于被遮挡时，找不到正确的scrollEl。正常情况下可以找到滚动的元素(通过getWindowScrollingElement)，但是一旦拖动的元素跑出界外，就拿不到了，所以要通过scroll传入正确的scrollParent。

知道了原因后，解决就很简单了，`:scroll="scrollParent"`，`scrollParent`在`mounted`时赋值`document.querySelector('#scheScrollParent')`就行了。

```js
function autoScroll() {
  // ...
  scrollEl = options.scroll;
  scrollCustomFn = options.scrollFn;

  if (scrollEl === true) {
    scrollEl = getParentAutoScrollElement(rootEl, true);
  }
}

function getWindowScrollingElement() {
  let scrollingElement = document.scrollingElement;

  if (scrollingElement) {
    return scrollingElement
  } else {
    return document.documentElement
  }
}
```

另外，这里有个计算单位移动距离的vy和vx：

```js
let vx = canScrollX && (Math.abs(right - x) <= sens && (scrollPosX + width) < scrollWidth) - (Math.abs(left - x) <= sens && !!scrollPosX);
let vy = canScrollY && (Math.abs(bottom - y) <= sens && (scrollPosY + height) < scrollHeight) - (Math.abs(top - y) <= sens && !!scrollPosY);
```

这里的top是`scrollEl.getBoundingClient()`的top，y是`touchEvent.touches[0]`的y。

如果向上移动，vy应是-1，但是如果top和y的差值过大，则不会触发移动，比如底部button很高，拖动到最底部是触发不了的。向下移动也是一样。

一个解决方法是将scrollSens设为较高的值，另一个方法是重新vy和vx的逻辑：

```js
if (canScrollY && y <= top) {
  vy = -1
} else if (canScrollY && y >= bottom && scrollPosY + height < scrollHeight ) {
  vy = 1
}
```

上面改动已经发布到[better-sortable](https://www.npmjs.com/package/better-sortable)中。
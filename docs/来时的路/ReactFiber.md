
## 一、React架构


React15架构可以分为两层：

- Reconciler（协调器），负责找出变化的组件
- Renderer（渲染器），负责将变化的组件渲染到页面上


在React中可以通过this.setState、this.forceUpdate、ReactDOM.render等API触发更新。每当有更新发生时，Reconciler会做如下工作：

1. 调用函数组件或class组件的render方法，将返回的JSX转化为虚拟DOM
2. 将虚拟DOM和上次更新时的虚拟DOM对比
3. 通过对比找出本次更新中变化的虚拟DOM
4. 通知Renderer将变化的虚拟DOM渲染到页面上

由于React支持跨平台，所以不同平台有不同的Renderer。在浏览器环境渲染的Renderer是ReactDOM。除此之外，还有：

- ReactNative 渲染器，渲染App原生组件
- ReactTest 渲染器，渲染出纯Js对象用于测试
- ReactArt 渲染器，渲染到Canvas, SVG 或 VML (IE8)

在每次更新发生时，Renderer接到Reconciler通知，将变化的组件渲染在当前宿主环境。

React15架构中，在Reconciler时，mount的组件会调用mountComponent，update的组件会调用updateComponent。这两个方法都会递归更新子组件。

递归更新的缺点是，一旦更新开始，中途就无法中断。JS引擎和页面渲染引擎是在同一个渲染线程之内，两者是互斥关系。如果在某个阶段执行任务特别长，时间已经明显超过了16ms，那么就会阻塞页面的渲染，从而出现卡顿现象。

React16之后将递归的无法中断的更新重构为异步的可中断更新。React16架构可以分为三层：

- Scheduler（调度器），调度任务的优先级，高优任务优先进入Reconciler
- Reconciler（协调器），负责找出变化的组件
- Renderer（渲染器），负责将变化的组件渲染到页面上


为什么Vue不需要使用Fiber？

- Vue 是基于 template 和 watcher 的组件级更新，把每个更新任务分割得足够小，不需要使用到 Fiber 架构，将任务进行更细粒度的拆分。
- React 是不管在哪里调用 setState，都是从根节点开始更新的，更新任务还是很大，需要使用到 Fiber 将大任务分割为多个小任务，可以中断和恢复，不阻塞主进程执行高优先级的任务。


## 二、Fiber

Fiber 可以理解为是一个执行单元，也可以理解为是一种数据结构。


Fiber 可以被理解为划分一个个更小的执行单元，它是把一个大任务拆分为了很多个小块任务，一个小块任务的执行必须是一次完成的，不能出现暂停，但是一个小块任务执行完后可以移交控制权给浏览器去响应用户。

React 向浏览器请求调度，浏览器在一帧中如果还有空闲时间，会去判断是否存在待执行任务，不存在就直接将控制权交给浏览器，如果存在就会执行对应的任务，执行完成后会判断是否还有时间，有时间且有待执行任务则会继续执行下一个任务，否则就会将控制权交给浏览器。


Fiber 还可以理解为是一种数据结构，React Fiber 就是采用链表实现的。每个 Virtual DOM 都可以表示为一个 fiber，每个节点都是一个 fiber。一个 fiber包括了 child（第一个子节点）、sibling（兄弟节点）、return（父节点）等属性



## 三、requestIdleCallback

requestIdleCallback 是一个实验中的新API，这个API调用方式如下:

```js
var handle = window.requestIdleCallback(callback[, options])

Window.cancelIdleCallback(handle) 
```

requestIdleCallback接收一个回调，这个回调会在浏览器空闲时调用，每次调用会传入一个IdleDeadline，可以拿到当前还空余多久，options可以传入参数最多等多久，等到了时间浏览器还不空就强制执行了。使用这个API可以解决任务调度的问题，让浏览器在空闲时才计算diff并渲染。



## 四、Fiber执行原理

从根节点开始渲染和调度的过程可以分为两个阶段：render 阶段、commit 阶段。

- render 阶段：这个阶段是可中断的，会找出所有节点的变更
- commit 阶段：这个阶段是不可中断的，会执行所有的变更

render阶段中，会将虚拟DOM树转化为Fiber tree，以虚拟dom节点为维度对任务进行拆分，即一个虚拟dom节点对应一个任务，最后产出的结果是effect list，从中可以知道哪些节点更新、哪些节点增加、哪些节点删除了。


遍历Fiber tree的时候从根节点出发，先找子元素，如果子元素存在，直接返回，如果没有子元素了就找兄弟元素，找完所有的兄弟元素后再返回父元素，然后再找这个父元素的兄弟元素。整个遍历过程其实是后序遍历。比如下图从div1开始遍历的话，遍历的顺序就应该是div1 -> div2 -> div3 -> p2 -> div2 -> p1 -> div1。

<img src="http://doc.uwayfly.com/react-fiber.png" width="380">

```js
const performUnitOfWork = (Fiber) => {
  beginWork(Fiber)
  if (Fiber.child) {
    return Fiber.child
  }
  while (Fiber) {
    completeUnitWork(Fiber)
    if (Fiber.sibling) {
      return Fiber.sibling
    }
    Fiber = Fiber.return
  }
}

const workloop = (nextUnitOfWork) => {
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (!nextUnitOfWork) {
    console.log('reconciliation阶段结束')
  }
}

workloop(rootFiber)
```

commit 阶段需要将上阶段计算出来的需要处理的副作用一次性执行，此阶段不能暂停，否则会出现UI更新不连续的现象。此阶段需要根据effect list，将所有更新都 commit 到DOM树上。




## 五、相关资料

1. [手写React核心原理，再也不怕面试官问我react原理](https://juejin.cn/post/6898292945867571207)
2. [手写React的Fiber架构，深入理解其原理](https://juejin.cn/post/6844904197008130062)
3. [走进React Fiber的世界](https://juejin.cn/post/6943896410987659277)


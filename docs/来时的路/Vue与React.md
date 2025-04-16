## 一、开始

Vue和React的对比是老生常谈的话题。本质的区别是数据驱动的区别，我这里只是记录简单的几项，感兴趣的可以查看文章最后的相关资料。


## 二、对比

### 1. 核心思想

React是函数式编程的思想，组件多使用JSX的语法，HTML、CSS全都融进JS中，JSX语法相对比较灵活。

Vue组件多用SFC单文件（single-file components）编写，很像HTML+JS+CSS，Vue提供了v-for、v-if、v-model等指令方便开发，开发Vue应用就像开发经典的Web应用，结构、表现、行为分离。

上述差异的一个重要原因是React背靠Facebook，提出一个新的理念、改变用户习惯、向外推广都不是大问题。而Vue一开始是由尤大一个人开发的，需要足够易用、简单、灵活才能够有更多人用。



### 2. 数据驱动


数据驱动上，Vue的响应式是Object.defineProperty/Proxy加观察者模式实现的，数据发生变化时，不会像React一样比较整棵树，而是更新状态变化了的组件实例。

React中如果某个组件的状态发生改变，React会把此组件和此组件之后的所有后代组件重新渲染。React会通过Diff算法比较两次的虚拟DOM，最后patch到真实的DOM上。如果组件树过大，Diff算法开销大，页面会出现卡顿。为此，React通过Fiber优化Diff算法，此外，还可以通过shouldComponentUpdate、pureComponent提升性能。

### 3. Diff算法

这里说的Diff指的是新旧节点类型相同的情况，对于类型不同的节点会直接替换。

React的Diff算法本质上是暴力比较法，会经历两轮遍历，第一轮遍历：处理更新的节点。第二轮遍历：处理剩下的不属于更新的节点。

Vue2的Diff算法采用双端比较，就是头头比较、尾尾比较、头尾比价、尾头比较，找出可以复用的元素，在对比的过程中指针会向内靠拢。

Vue3的Diff算法用了LIS（最长递增子序列）的思想，也就是找到不需要移动的节点，原地复用，对于新增/删除/移动的节点进行操作。

### 4. 主要优化方向

这里只是自己的理解，Vue在数据变化时已经能控制组件更新的最小范围，所以要做的是在组件中提取更细的范围，也就是编译优化，包括静态节点提升、标记动态节点。

React的主要优化方向在Diff算法中，也就是现在的Fiber，因为更新范围大，性能瓶颈更明显。

### 5. 组件化

组件化上，Vue多用SFC，React多用JSX语法。


### 6. 生态

构建工具上，Vue -> Vue-CLI，React -> Create-React-App。还有一些其他生态上的区别：

| 类型     | React                          | Vue                          |
| -------- | ------------------------------ | ---------------------------- |
| 路由     | react-router、react-router-dom | vue-router                   |
| 状态管理 | redux                          | vuex                         |
| UI库     | antd                           | elementUI、iview             |
| 脚手架   | Create React APP               | vue-cli、vite                |
| SSR工具  | next.js                        | nuxt                         |
| 跨端框架 | react-native、taro             | uni-app、weex                |
| 移动端UI | antd-mobile                    | mint-ui、vux、Vonic、cube-ui |

还有一些生命周期函数、数据传递的差异，比较简单，就不贴了。


其实对比React和Vue的意义不大，还不如单独深入某一个框架的某一个部分来得深刻。另外，它们在生产环境下的页面性能差别不大，想用什么框架纯粹是个人喜好问题。



## 三、手写Diff算法

如果是暴力的Diff算法，遍历两次树，然后标记出需要更新的节点，再操作dom，则时间复杂度为O(n^3)。Vue是边比较边更新dom，时间复杂度为O(n)。

需要注意的一点是，`el.insertBefore`在插入新节点的同时，也会在原来的位置删除。下面的代码已经上传到[这个仓库](https://github.com/novlan1/test-diff)。

### 1. Vue2

```js
function domDiff(el, oldChildren, newChildren) {
  // 老的开始索引
  let oldStartIndex = 0;
  // 老的开始节点
  let oldStartVnode = oldChildren[0];
  // 老的结束索引
  let oldEndIndex = oldChildren.length - 1;
  // 老的结束节点
  let oldEndVnode = oldChildren[oldEndIndex];

  // 新的开始索引
  let newStartIndex = 0;
  // 新的开始节点
  let newStartVnode = newChildren[0];
  // 新的结束索引
  let newEndIndex = newChildren.length - 1;
  // 新的结束节点
  let newEndVnode = newChildren[newEndIndex];

  // 根据老的节点，构造一个map，其value是oldChildren的下标
  let oldNodeMap = oldChildren.reduce((acc, item, index) => {
    acc[item.key] = index;
    return acc;
  }, {});

  // 双指针对比，从两端向中间遍历，当指针交叉的时候，就是对比完成了
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 指针移动的时候，可能元素已经被移走了，那就跳过这一项
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex];
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex];
    } else if (isSameVnode(oldStartVnode, newStartVnode)) {
      // 头头比较，如果相同就移动头指针
      oldStartVnode = oldChildren[++oldStartIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      // 尾尾比较，如果相同，移动尾指针
      oldEndVnode = oldChildren[--oldEndIndex];
      newEndVnode = newChildren[--newEndIndex];
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      /**
       * 头尾比较
       * 
       * a b
       * b a
       * 
       * 将旧的头节点(a)的真实DOM，插入到旧的尾节点(b)的下一个节点之前
       */
      el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
      oldStartVnode = oldChildren[++oldStartIndex];
      newEndVnode = newChildren[--newEndIndex];
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      /**
       * 尾头比较
       * 
       * a b c d
       * d b a c
       * 
       * 将旧的尾节点(d) 插入到 旧的头节点(a)的前面
       */
      el.insertBefore(oldEndVnode.el, oldStartVnode.el);
      oldEndVnode = oldChildren[--oldEndIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else {
      /**
       * 头头、尾尾、头尾、尾头都不相等
       */
      let moveIndex = oldNodeMap[newStartVnode.key];
      if (moveIndex === undefined) {
        /**
         * a b c
         * d
         * 
         * 找不到索引， 是新的节点，直接在旧的头节点前面插入创建的节点
         */
        // 
        el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
      } else {
        /**
         * a b c d
         * b d a c
         * 
         * 找到了索引，将找到的节点(b) 移动到旧的头节点(a)之前，同时将找到的位置置空
         */
        // 
        let moveVnode = oldChildren[moveIndex];
        el.insertBefore(moveVnode.el, oldStartVnode.el);
        // 将已经移动的节点标记为undefine
        oldChildren[moveIndex] = undefined;
      }
      newStartVnode = newChildren[++newStartIndex];
    }
  }

  if (oldStartIndex > oldEndIndex) {
    /**
     * 新的节点多，那么就将多的插入进去即可
     * 
     * a b c
     * d e f a b c
     * 
     * 一直是尾尾相同，尾节点都一直减1，直到 oldStartIndex=0，oldEndIndex=-1，newStartIndex=0，newEndIndex=2
     * 将多出的节点def(下标0-2)，不断添加到旧节点的前面
     */
    let anchor =
      newChildren[newEndIndex + 1] === null
        ? null
        : newChildren[newEndIndex + 1].el;

    for (let i = newStartIndex; i <= newEndIndex; i++) {
      el.insertBefore(createElm(newChildren[i]), anchor);
    }
  }

  if (newStartIndex > newEndIndex) {
    /**
     * 老的节点多，直接删除
     * 
     * a b c d e f
     * d e f
     * 
     * 一直都是尾尾相同，直到 newStartIndex=0，newEndIndex=-1, oldStartIndex=0, oldEndIndex=2
     * 将多出的节点abc(下标0-2)删除
     */
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      let child = oldChildren[i];
      child && el.removeChild(child.el);
    }
  }
}
```


### 2. React

```js
function reactDiff(parent, prevChildren, nextChildren) {
  let lastIndex = 0;
  for (let i = 0; i < nextChildren.length; i++) {
    const nextChild = nextChildren[i];
    let find = false;
    for (let j = 0; j < prevChildren.length; j++) {
      const prevChild = prevChildren[j];
      if (nextChild.key === prevChild.key) {
        find = true;
        // patch(prevChild, nextChild, parent)
        if (j < lastIndex) {
          // 移动到前一个节点的后面
          const refNode = nextChildren[i - 1].el.nextSibling;
          parent.insertBefore(nextChild.el, refNode);
        } else {
          // 不需要移动节点，记录当前位置，与之后的节点进行对比
          lastIndex = j;
        }
        break;
      }
    }
    if (!find) {
      /**
       * 遍历过程中，如果无法复用，插入新节点
       *
       * a b d
       * a b c d
       */
      const refNode = i <= 0
        ? prevChildren[0].el
        : nextChildren[i - 1].el.nextSibling;

      parent.insertBefore(createElm(nextChild), refNode);
      // mount(nextChild, parent, refNode);
    }
  }
  for (let i = 0; i < prevChildren.length; i++) {
    const prevChild = prevChildren[i];
    const { key } = prevChild;
    const has = nextChildren.find(item => item.key === key);
    /**
     * a b c d
     * a b d
     *
     * 第一轮遍历结束后，对于多余的节点，直接删除
     */
    if (!has) parent.removeChild(prevChild.el);
  }
}
```


## 四、相关资料



1. [vue与react的个人体会](https://juejin.cn/post/7012797091135094814)
2. [关于Vue和React的一些对比及个人思考（上）](https://juejin.cn/post/6844904040564785159)
3. [关于Vue和React的一些对比及个人思考（中）](https://juejin.cn/post/6844904052812169229)
4. [React、Vue2、Vue3的三种Diff算法](https://juejin.cn/post/6919376064833667080)
5. [Vue 和 React 的优点分别是什么？](https://www.zhihu.com/question/301860721)
6. [Vue3 Compiler 优化细节，如何手写高性能渲染函数](https://zhuanlan.zhihu.com/p/150732926)
7. [React Fiber很难？六个问题助你理解 React Fiber](https://juejin.cn/post/6984949525928476703)
8. [React、Vue2、Vue3的三种Diff算法](https://juejin.cn/post/6919376064833667080)
9. [手写简化版的 vue3 diff 算法](https://juejin.cn/post/6962783046009356295)
10. [react和vue diff算法解析与对比](https://juejin.cn/post/6978370715573714952)
11. [React、Vue2、Vue3的三种Diff算法](https://juejin.cn/post/6919376064833667080)
12. [深入浅出虚拟 DOM 和 Diff 算法，及 Vue2 与 Vue3 中的区别](https://juejin.cn/post/7010594233253888013)
13. [label语句](https://www.cnblogs.com/YAN-HUA/p/11343359.html)
14. [vue diff算法](https://zhuanlan.zhihu.com/p/364299339)




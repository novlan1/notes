# 之前的笔记

张一鸣：**有时候大家的认知和事实会差很远很远，比如，2012年的时候没人看好移动互联网。**

代码不会背叛你，运动、肌肉也不会背叛你，但是打游戏会。你越强，却给你匹配更强的对手和更菜的队友，感觉像是遭到了背叛。

**简单不等于容易，把复杂的东西做简单，不代表它就容易**。

会沉淀、封装就能超过80%的前端开发者了。

<br>
<br>

---

<br>
<br>

**只有质量好，才能走得快**。

对于研发团队来说，做债务治理要投入人力，一定会和产品经理做需求的欲望有冲突。但只有质量好才能走得快，产研的目标是一致的，这是技术管理者的职责，需要和产品经理沟通对齐好。

<br>
<br>

---

<br>
<br>

对框架理解越深，解决问题的速度越快，熟悉原理的人可能一分钟就解决了，不熟悉的可能需要一星期。

<br>
<br>

---

<br>
<br>

`cardInfo`、`cardCustom` 的获取只能从card组件中获取，不能提升到子活动详情中，因为“我的”页面也要用这个组件，如果提升，两个都要提升，逻辑重复。

可以通过 `ebus`，监听 `cardInfo`、`cardCustom` 的变化，一旦变化，就广播出去，子活动详情中，记录它们的值，并根据数据对 `button` 做展示。

<br>
<br>

---

<br>
<br>

乘以 `0.25` 就是除以 `4`，看到 `pr-1.28` 就想到 `1.28*0.25`，即 `1.28 / 4 = 0.32rem`

<br>
<br>

---

<br>
<br>

状态码可以复用，对原始数据进行解析，得到的状态码一定是唯一的。如果横竖版一定要分开，可以在横版的组件中单独加判断，即组合判断。

状态码的复用，可以减少大量重复逻辑。

<br>
<br>

---

<br>
<br>

(pixui?) 没有 `localStorage`，没有 `globalThis`，没有 `Array.prototype.includes`（`aegis` 中有用），没有 `Array.prototype.flatMap`

`globalThis` 的 `polyfill` 和其他变量不一样，它自己本身是顶级变量，每个上下文都需要单独 `polyfill`，更好的做法是不用它。

<br>
<br>

---

<br>
<br>

`calendar` 支持 `switchMode`，就是可以在头部快速切换年月。

这个功能要维护一个 `currentMonth`，数组，理论上只有一项。之前下面遍历的是 `months`，现在要判断 `switchMode`，不为 `none` 时，要遍历 `currentMonth`。

<br>
<br>

---

<br>
<br>

slider 点击时获取detla的核心逻辑，e.clienX - line.left，e的类型是 MouseEvent | Touch

range类型时，点击line，需要判断当前移动的是左边还是右边，判断公式为 点击处与两点距离的绝对值，哪个小，就说明哪个近，就移动哪个。 distanceLeft = Math.abs(e.clientX - leftDot.left); distanceRight = Math.abs(rightDot.left - e.clientX);

<br>
<br>

---

<br>
<br>

nvm 指定默认的node版本

`nvm alias default <version>`  如： `nvm alias default 20`

<br>
<br>

---

<br>
<br>

Hooks 只能在函数组件的顶级作用域使用。

所谓顶层作用域，就是 Hooks 不能在循环、条件判断或者嵌套函数内执行，而必须是在顶层。同时 Hooks 在组件的多次渲染之间，必须按顺序被执行。因为在 React 组件内部，其实是维护了一个对应组件的固定 Hooks 执行列表的，以便在多次渲染之间保持 Hooks 的状态，并做对比。

所以 Hooks 的这个规则可以总结为两点：第一，所有 Hook 必须要被执行到。第二，必须按顺序执行。

<br>
<br>

---

<br>
<br>-

在 React 函数组件中，每一次 UI 的变化，都是通过重新执行整个函数来完成的，这和传统的 Class 组件有很大区别：函数组件中并没有一个直接的方式在多次渲染之间维持一个状态。

<br>
<br>

---

<br>
<br>-



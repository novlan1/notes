## 1. 背景

小程序无法动态引入组件，必须要页面或组件内预先写好，也就是预埋。

之前我们函数式调用通用 dialog，往往是这样：

```ts
import CommTipsDialog from 'xx/path/comm-tips-dialog';

CommTipsDialog.show({
  title: '提示',
  content: err.err_msg || err.err_desc || err.msg,
  confirmText: '我知道了',
  cancelText: '',
}).then(() => {
})
  .catch(() => {

  });
```

上面方式其实是，参考了Vant的Dialog函数式调用的方案，针对我们业务做了些交互和样式上的调整，核心逻辑如下：


```js
function initInstance() {
  if (instance) {
    instance.$destroy();
  }

  const dialogId = 'xxx';
  const oldDialog = document.getElementById(dialogId);
  if (oldDialog) {
    document.body.removeChild(oldDialog);
  }
  const dialogRootDiv = document.createElement('div');
  dialogRootDiv.id = dialogId;

  document.body.appendChild(dialogRootDiv);
  instance = new (Vue.extend(VueDialog))({
    el: dialogRootDiv,
  });
}

function Dialog(options) {
  if (!instance || !isInDocument(instance.$el)) {
    initInstance();
  }
  Object.assign(instance, Dialog.currentOptions, options);
}

Dialog.show = (options) => {
  Dialog({
    ...options,
  });
  return instance.showDialog().then((val) => {
    instance = null;
    return Promise.resolve(val);
  })
    .catch((err) => {
      instance = null;
      return Promise.reject(err);
    });
};
```

可以看到关键是调用了 `document.body.appendChild` 将弹窗挂载在DOM上，然后返回了实例的Promise，所以调用方就可以链式调用。

## 2. 适配

小程序要想这样做，需要改造下面几个部分：
1. 弹窗关闭后不能再调用 $destroy，否则下次无法唤起
2. 更改传递 options 的方式，否则会报不能修改 props 的错误
3. 预先把组件放到页面根元素下


下面是上述几点的适配方案：

第1点比较简单，关闭时判断下当前环境，如果是小程序，则仅隐藏，不销毁。

第2点，有两个解决方案，一是再嵌套一层 inner.vue 子组件，二是改造传参方式。 因为既然我们能拿到组件实例 instance，和它上面的方法 showDialog，直接在调用此方法时传入就可以了，然后把之前的 props 改成 data。

第3点，也有两个解决方案，一是手写，不过项目越大，工作量越大，也容易出错，二是写个loader，在编译前动态插入全局组件，目前采用的是第二种方案。并且可在config.js 下 injectComponents 中配置要注入的组件，如：

```js
injectComponents: [ // 注入哪些公共组件
  {
    name: 'CommDialog', // 组件名称
    id: 'comm-tips-dialog', 
  },
],
```

后续接入其他全局组件，也十分方便。

对比下 h5 项目，其实我们改造的第3点，就是 App.vue 中的内容。
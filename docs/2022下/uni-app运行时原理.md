## 1. 初始化

### 1.1. app.js

app.js中直接引用了3个文件：

```ts
require('./common/runtime.js')
require('./common/vendor.js')
require('./common/main.js')
```

`runtime.js`中就是`__webpack_require__`一些相关定义，和普通的h5项目的运行时没什么差别。不懂webpack运行时的可以看[这篇文章](https://juejin.cn/post/7054740249678708750)。


`main.js`中主要是项目main.js的编译产物。


### 1.2. vendor.js

`vendor.js`中包括`uni-app`中运行时代码、公共js文件等。


vendor.js中导出了 createPage、createComponent 等方法，是运行时的关键。我们写的组件比如xxx.vue会被编译成4个文件：

- xxx.wxml
- xxx.wxss
- xxx.json
- xxx.js

其中`xxx.js`主要是 script部分 的编译产物，它里面会引用 createPage 或 createComponent 方法，将 vue 配置转为小程序的配置，其实就很像Vant-weapp中的 VantComponent。

```js
const MPPage = Page;
const MPComponent = Component;

if (!MPPage.__$wrappered) {
  MPPage.__$wrappered = true;
  Page = function (options = {}) {
    initHook('onLoad', options);
    return MPPage(options)
  };
  Page.after = MPPage.after;

  Component = function (options = {}) {
    initHook('created', options);
    return MPComponent(options)
  };
}

function initHook (name, options, isComponent) {
  const oldHook = options[name];
  if (!oldHook) {
    options[name] = function () {
      initTriggerEvent(this);
    };
  } else {
    options[name] = function (...args) {
      initTriggerEvent(this);
      return oldHook.apply(this, args)
    };
  }
}

function initTriggerEvent (mpInstance) {
  const oldTriggerEvent = mpInstance.triggerEvent;
  const newTriggerEvent = function (event, ...args) {
    return oldTriggerEvent.apply(mpInstance, [customize(event), ...args])
  };
  try {
    // 京东小程序 triggerEvent 为只读
    mpInstance.triggerEvent = newTriggerEvent;
  } catch (error) {
    mpInstance._triggerEvent = newTriggerEvent;
  }
}
```

上面是 uni-app 代理了 Page 和 Component 方法，分别处理了 onLoad 和 created 两个钩子函数，猜测是处理不同平台的参数，并合并用户手动添加的方法。


下面就是 uni-app 主要暴露的两个方法，createPage 和 createComponent。

```js
function createPage (vuePageOptions) {
  {
    return Component(parsePage(vuePageOptions))
  }
}

function createComponent (vueOptions) {
  {
    return Component(parseComponent(vueOptions))
  }
}
```

可以看到 createPage 和 createComponent 都是调用了小程序的 Component 去生成组件。parsePage 和 parseComponent 就是处理 Vue文件 的配置，将其转为小程序需要的参数。

```js
function parsePage (vuePageOptions) {
  return parseBasePage(vuePageOptions, {
    isPage,
    initRelation
  })
}

function parseComponent (vueComponentOptions) {
  return parseBaseComponent(vueComponentOptions, {
    isPage,
    initRelation
  })
}
```

### 1.3. parseBaseComponent

parseBaseComponent 是转化参数的核心，主要有：

- 调用 initVueComponent，也就是 Vue.extend 初始化一个Vue实例
- 初始化 options、data、behaviors、properties等
- 在 attached 中，处理VueId，初始化父子关系，调用 `this.$vm.$mount()` 来触发首次 setData
- 在 ready 中，调用 mounted 和 onReady 方法。
- 提供两个方法： _l 和 _e
- 声明了 pageLifetimes


```ts
function initVueComponent (Vue, vueOptions) {
  vueOptions = vueOptions.default || vueOptions;
  let VueComponent;
  if (isFn(vueOptions)) {
    VueComponent = vueOptions;
  } else {
    VueComponent = Vue.extend(vueOptions);
  }
  vueOptions = VueComponent.options;
  return [VueComponent, vueOptions]
}

function parseBaseComponent (vueComponentOptions, {
  isPage,
  initRelation
} = {}) {
  const [VueComponent, vueOptions] = initVueComponent(vue__WEBPACK_IMPORTED_MODULE_1__["default"], vueComponentOptions);

  const options = {
    multipleSlots: true,
    foo1GlobalClass: true,
    ...(vueOptions.options || {})
  };

  {
    // 微信 multipleSlots 部分情况有 bug，导致内容顺序错乱 如 u-list，提供覆盖选项
    if (vueOptions['mp-weixin'] && vueOptions['mp-weixin'].options) {
      Object.assign(options, vueOptions['mp-weixin'].options);
    }
  }

  const componentOptions = {
    options,
    data: initData(vueOptions, vue__WEBPACK_IMPORTED_MODULE_1__["default"].prototype),
    behaviors: initBehaviors(vueOptions, initBehavior),
    properties: initProperties(vueOptions.props, false, vueOptions.__file),
    lifetimes: {
      attached () {
        const properties = this.properties;

        const options = {
          mpType: isPage.call(this) ? 'page' : 'component',
          mpInstance: this,
          propsData: properties
        };

        initVueIds(properties.vueId, this);

        // 处理父子关系
        initRelation.call(this, {
          vuePid: this._$vuePid,
          vueOptions: options
        });

        // 初始化 vue 实例
        this.$vm = new VueComponent(options);

        // 处理$slots,$scopedSlots（暂不支持动态变化$slots）
        initSlots(this.$vm, properties.vueSlots);

        // 触发首次 setData
        this.$vm.$mount();
      },
      ready () {
        // 当组件 props 默认值为 true，初始化时传入 false 会导致 created,ready 触发, 但 attached 不触发
        // https://developers.weixin.qq.com/community/develop/doc/00066ae2844cc0f8eb883e2a557800
        if (this.$vm) {
          this.$vm._isMounted = true;
          this.$vm.__call_hook('mounted');
          this.$vm.__call_hook('onReady');
        }
      },
      detached () {
        this.$vm && this.$vm.$destroy();
      }
    },
    pageLifetimes: {
      show (args) {
        this.$vm && this.$vm.__call_hook('onPageShow', args);
      },
      hide () {
        this.$vm && this.$vm.__call_hook('onPageHide');
      },
      resize (size) {
        this.$vm && this.$vm.__call_hook('onPageResize', size);
      }
    },
    methods: {
      __l: handleLink,
      __e: handleEvent
    }
  };
  // externalClasses
  if (vueOptions.externalClasses) {
    componentOptions.externalClasses = vueOptions.externalClasses;
  }

  if (Array.isArray(vueOptions.wxsCallMethods)) {
    vueOptions.wxsCallMethods.forEach(callMethod => {
      componentOptions.methods[callMethod] = function (args) {
        return this.$vm[callMethod](args)
      };
    });
  }

  if (isPage) {
    return componentOptions
  }
  return [componentOptions, VueComponent]
}
```

Vue.extend 中会调用 initState、initData、observe 等方法，收集依赖。

`this.$vm.$mount()` 执行vue实例的mount，但是vue的template已经打包在了wxml中，所以不会触发render函数。

uni-app 改造了 patch 方法，会复制所有 data 和 computed，对比之前的data，和最新的mpData，然后触发小程序的 setData 方法。

```ts
var patch = function(oldVnode, vnode) {
  var data = Object.create(null);
  try {
    data = cloneWithData(this);
  } catch (err) {
    console.error(err);
  }
  data.__webviewId__ = mpInstance.data.__webviewId__;
  var mpData = Object.create(null);
  Object.keys(data).forEach(function (key) { //仅同步 data 中有的数据
    mpData[key] = mpInstance.data[key];
  });

  // ...
  mpInstance.setData(diffData, function () {
    this$1.__next_tick_pending = false;
    flushCallbacks$1(this$1);
  });
}
```



## 2. 页面交互

对于下面这个例子：

```html
<template>
  <div @click="foo1(); foo2(2)" @touchstart="foo3($event)">{{ num }}</div>
</template>
```

会被转化成：

```html
<view 
    data-event-opts="{{
        [
            ['tap',[['foo1'],['foo2',[2]]]],
            ['touchstart',[['foo3',['$event']]]]
        ]
    }}"
    bindtap="__e" 
    bindtouchstart="__e"
    class="_div">
    {{num}}
</view>
```

data-event-opts是一个二维数组，每个子数组代表一个事件类型。子数组有两个值，第一个表示事件类型名称，第二个表示触发事件函数的个数。事件函数又是一个数组，第一个值表述事件函数名称，第二个是参数个数。

`['tap',[['foo1'],['foo2',[2]]]]`表示事件类型为tap，触发函数有两个，一个为foo1函数且无参数，一个为foo2且参数为2。

`['touchstart',[['foo3',['$event']]]]`表示事件类型为 touchstart，触发函数有一个为foo3，参数为$event对象。



```ts

function handleEvent (event) {
  event = wrapper$1(event);

  // [['tap',[['handle',[1,2,a]],['handle1',[1,2,a]]]]]
  const dataset = (event.currentTarget || event.target).dataset;
  if (!dataset) {
    return console.warn('事件信息不存在')
  }
  const eventOpts = dataset.eventOpts || dataset['event-opts']; // 支付宝 web-view 组件 dataset 非驼峰
  if (!eventOpts) {
    return console.warn('事件信息不存在')
  }

  // [['handle',[1,2,a]],['handle1',[1,2,a]]]
  const eventType = event.type;

  const ret = [];

  eventOpts.forEach(eventOpt => {
    let type = eventOpt[0];
    const eventsArray = eventOpt[1];

    const isCustom = type.charAt(0) === CUSTOM;
    type = isCustom ? type.slice(1) : type;
    const isOnce = type.charAt(0) === ONCE;
    type = isOnce ? type.slice(1) : type;

    if (eventsArray && isMatchEventType(eventType, type)) {
      eventsArray.forEach(eventArray => {
        const methodName = eventArray[0];
        if (methodName) {
          let handlerCtx = this.$vm;
          if (handlerCtx.$options.generic) { // mp-weixin,mp-toutiao 抽象节点模拟 scoped slots
            handlerCtx = getContextVm(handlerCtx) || handlerCtx;
          }
          if (methodName === '$emit') {
            handlerCtx.$emit.apply(handlerCtx,
              processEventArgs(
                this.$vm,
                event,
                eventArray[1],
                eventArray[2],
                isCustom,
                methodName
              ));
            return
          }
          const handler = handlerCtx[methodName];
          if (!isFn(handler)) {
            throw new Error(` _vm.${methodName} is not a function`)
          }
          if (isOnce) {
            if (handler.once) {
              return
            }
            handler.once = true;
          }
          let params = processEventArgs(
            this.$vm,
            event,
            eventArray[1],
            eventArray[2],
            isCustom,
            methodName
          );
          params = Array.isArray(params) ? params : [];
          // 参数尾部增加原始事件对象用于复杂表达式内获取额外数据
          if (/=\s*\S+\.eventParams\s*\|\|\s*\S+\[['"]event-params['"]\]/.test(handler.toString())) {
            // eslint-disable-next-line no-sparse-arrays
            params = params.concat([, , , , , , , , , , event]);
          }
          ret.push(handler.apply(handlerCtx, params));
        }
      });
    }
  });

  if (
    eventType === 'input' &&
    ret.length === 1 &&
    typeof ret[0] !== 'undefined'
  ) {
    return ret[0]
  }
}
```

从上面我们知道`__e`对应的就是 handleEvent，handleEvent 处理流程如下：

1. 拿到点击元素上的 data-event-opts 属性:`[['tap',[['foo1'],['foo2',[2]]]]`,`['touchstart',[['foo3',['$event']]]]]`
2. 根据点击类型获取相应数组，比如 bindTap 就取`['tap',[['foo1'],['foo2',[2]]]]`，bindtouchstart 就取`['touchstart',[['foo3',['$event']]]]`
3. 依次调用相应事件类型的函数，并传入参数，比如 tap 调用`this.foo1();this.foo2(2)`

## 3. 对比Vue

Vue 初次渲染过程
- 解析模板为render函数（或在开发环境已完成，vue-loader）
- 触发响应式，监听getter、setter
- 执行render函数，生成vnode
- patch(vnode)

更新过程

- 修改data，触发setter
- 重新执行render函数，生成newVnode
- patch(vnode,newVnode)

Uni-app初次渲染过程
- Vue.extend 初始化实例、收集依赖
- 调用 $mount
- 调用 patch
- 调用 setData，交给小程序处理

更新过程
- 修改data，触发 setter
- 触发 Vue.prototype._update 方法
- 调用 patch
- 调用 setData，交给小程序处理



<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-mp-structure.png" width="500">

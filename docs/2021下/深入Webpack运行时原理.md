## 1. 开始

`webpack`打包产物可分为两种，一种是项目代码，一种是支持其运行的代码，前者可称为`module chunk`，后者可称为`runtime chunk`，即运行时代码。本文分析下`webpack`的运行时原理。

其实`webpack`的运行时代码是十分类似跑一个NodeJS项目，`webpack`打包并没有将所有代码不分青红皂白的放在一起，而是模块化管理，其中一个原因是作用域的隔离，下面就来分析下`webpack`如何实现打包产物的模块化的。
## 2. 运行时分析

`webpack`进行如下配置，可以得到分离的`runtime chunk`。

```js
optimization: {
  minimize: false,
  runtimeChunk: {name: 'runtime'}
},
```

### 2.1. `__webpack_require__`

`__webpack_require__`类似`NodeJS`中的`require`方法，作用是加载并执行某个模块。

```js
function __webpack_require__(moduleId) {
  // 1.首先会检查模块缓存
  // Check if module is in cache
  if(installedModules[moduleId]) {
    return installedModules[moduleId].exports;
  }
   // 2. 缓存不存在时，创建并缓存一个新的模块对象，类似Node中的new Module操作
  // Create a new module (and put it into the cache)
  var module = installedModules[moduleId] = {
    i: moduleId,
    l: false,
    exports: {}
  };

  // 3. 执行模块，类似于Node中的：
  // result = compiledWrapper.call(this.exports, this.exports, require, this, filename, dirname);
  // module是当前模块对象，module.exports是导出内容，默认为空对象
  // Execute the module function
  modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

  // Flag the module as loaded
  module.l = true;

  // 4. 返回该module的输出
  // Return the exports of the module
  return module.exports;
}
```


### 2.2. 如何解决前端的同步依赖

当我们已经获取了模块内容后（但模块还未执行），我们就将其暂存在`modules`对象中，键就是`webpack`的`moduleId`。等到需要使用`__webpack_require__`引用模块时，发现缓存中没有，则从`modules`对象中取出暂存的模块并执行。


### 2.3. `module chunk`

看下`module chunk`的模式：

```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{
  "0147":
  (function(module, exports, __webpack_require__) {

  // Imports
  var ___CSS_LOADER_API_IMPORT___ = __webpack_require__("24fb");
  exports = ___CSS_LOADER_API_IMPORT___(false);
  // Module
  exports.push([module.i, ".naruto-match .tip-toc-serviceimg[data-v-9a483a34]{-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}.naruto-match .tip-toc-servicebox[data-v-9a483a34]{background:none}.tip-toc-dialog-close-top[data-v-9a483a34]{z-index:1000}", ""]);
  // Exports
  module.exports = exports;


  }),
},[["b3af","runtime","chunk-libs"]]]);
```


这里的`.push()`方法参数为一个数组，包含三个元素：
1. 第一个元素是一个数组，`["main"]`表示该`js`文件所包含的所有`chunk`的`id`（可理解为，`webpack`中`module`组成`chunk`，`chunk`又组成`file`）；
2. 第二个元素是一个对象，键是各个模块的id，值则是一个被`function`包装后的模块；
3. 第三个元素也是一个数组，其又是由多个数组组成。第一个元素`["b3af","runtime","chunk-libs"]`表示，希望自动执行`moduleId`为`b3af`的这个模块，但是该模块需要`chunkId`为`runtime`和`chunk-libs`的`chunk`已经加载后才能执行；

执行某些模块需要保证一些`chunk`已经加载是因为，该模块所依赖的其他模块可能并不在当前`chunk`中，而`webpack`在编译期会通过依赖分析自动将依赖模块的所属`chunkId`注入到此处。


### 2.4. `webpackJsonpCallback`

`window["webpackJsonp"]`上的`.push()`方法已经被修改为了`webpackJsonpCallback()`方法，它的作用是：
1. 注册`chunk`
2. 注册`chunk`中的所有`module`
3. 执行某个`module`

```js
function webpackJsonpCallback(data) {
  var chunkIds = data[0];
  var moreModules = data[1];
  var executeModules = data[2];

  // add "moreModules" to the modules object,
  // then flag all "chunkIds" as loaded and fire callback
  var moduleId, chunkId, i = 0, resolves = [];
   // webpack会在installChunks中存储chunk的载入状态，据此判断chunk是否加载完毕
  for(;i < chunkIds.length; i++) {
    chunkId = chunkIds[i];
    if(installedChunks[chunkId]) {
      resolves.push(installedChunks[chunkId][0]);
    }
    installedChunks[chunkId] = 0;
  }

  // 注意，这里会进行“注册”，将模块暂存入内存中
  // 将module chunk中第二个数组元素包含的 module 方法注册到 modules 对象里
  for(moduleId in moreModules) {
    if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
      modules[moduleId] = moreModules[moduleId];
    }
  }
  if(parentJsonpFunction) parentJsonpFunction(data);

  while(resolves.length) {
    resolves.shift()();
  }

  // add entry modules from loaded chunk to deferred list
  deferredModules.push.apply(deferredModules, executeModules || []);

  // run deferred modules when all chunks ready
  return checkDeferredModules();
};
```

### 2.5. `checkDeferredModules`

`deferredModules`是一个二维数组，每一项的第一个元素是希望加载的模块，其他元素是前置依赖的`chunk`，比如`[["b3af","runtime","chunk-libs"]]`。

`checkDeferredModules`作用是检查前置依赖的`chunk`是否被加载，如果都已经加载过，则通过`__webpack_require__`执行某个模块。


```js
function checkDeferredModules() {
  var result;
  for(var i = 0; i < deferredModules.length; i++) {
    var deferredModule = deferredModules[i];
    var fulfilled = true;
    for(var j = 1; j < deferredModule.length; j++) {
      var depId = deferredModule[j];
      if(installedChunks[depId] !== 0) fulfilled = false;
    }
    if(fulfilled) {
      deferredModules.splice(i--, 1);
      result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
    }
  }
  return result;
}
```

### 2.6. `__webpack_require__.d`

`__webpack_require__.d`是一个辅助函数，作用是导出`exports`内容，其实就是给`exports`这个对象赋值属性。

```js
__webpack_require__.d = function(exports, name, getter) {
  if(!__webpack_require__.o(exports, name)) {
    Object.defineProperty(exports, name, { enumerable: true, get: getter });
  }
};
```

## 3. 例子

看一个`webpack`的`v4`真实打包产物：

`index.html`中：

```html
<div id='app'></div>
<script type="text/javascript" src="js/runtime.10e826ac.js"></script>
<script type="text/javascript" src="js/chunk-libs.1bf59ba5.js"></script>
<script type="text/javascript" src="js/main.e350e9f9.js"></script></body>
```

`runtime chunk`代码如下：

```js
(function(modules) { // webpackBootstrap
  // install a JSONP callback for chunk loading
  function webpackJsonpCallback(data) {
    // 上面贴过
  };
  function checkDeferredModules() {
    // 上面贴过
  }

  // The module cache
  var installedModules = {};

  // object to store loaded and loading chunks
  // undefined = chunk not loaded, null = chunk preloaded/prefetched
  // Promise = chunk loading, 0 = chunk loaded
  var installedChunks = {
    "runtime": 0
  };

  var deferredModules = [];

  // script path function
  function jsonpScriptSrc(chunkId) {
    return __webpack_require__.p + "js/" + ({"chunk-comm~31712516":"chunk-comm~31712516"}[chunkId]||chunkId) + "." + {"chunk-2d0e1f83":"161b1f0a","chunk-32959a3e":"8e45f171","chunk-356c6014":"59d16be0","chunk-4fd39d75":"d8a1fef5","chunk-7861d4a2":"bb95f4aa","chunk-7edb9355":"b044a27e","chunk-c8c18dc8":"a6e840a3","chunk-comm~31712516":"b8e68ca0","chunk-0711a072":"83c0224c","chunk-3c7481d4":"c4f2bdf3","chunk-47a37948":"fe974b7e","chunk-76bd3e2e":"69f55220","chunk-32731d79":"748aae20","chunk-0be819f4":"eb9c8578","chunk-dccb7944":"dbfaff9e","chunk-daf62ed6":"46aaa93a","chunk-fd805560":"87393259","chunk-e78f441e":"8fa51f1b"}[chunkId] + ".js"
  }

  // The require function
  function __webpack_require__(moduleId) {
    // 上面贴过
  }

  // This file contains only the entry chunk.
  // The chunk loading function for additional chunks
  __webpack_require__.e = function requireEnsure(chunkId) {
    // 后面会讲
  };

  // 指向modules，即所有模块的集合
  // expose the modules object (__webpack_modules__)
  __webpack_require__.m = modules;

  // 指向installedModules，c为cache的意思，也就是缓存模块。
  // expose the module cache
  __webpack_require__.c = installedModules;

  // define getter function for harmony exports
  __webpack_require__.d = function(exports, name, getter) {
    if(!__webpack_require__.o(exports, name)) {
      Object.defineProperty(exports, name, { enumerable: true, get: getter });
    }
  };

  // 定义模块为ES模块，添加__esModule属性
  // define __esModule on exports
  __webpack_require__.r = function(exports) {
    if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    }
    Object.defineProperty(exports, '__esModule', { value: true });
  };

  // create a fake namespace object
  // mode & 1: value is a module id, require it
  // mode & 2: merge all properties of value into the ns
  // mode & 4: return value when already ns object
  // mode & 8|1: behave like require
  __webpack_require__.t = function(value, mode) {
    if(mode & 1) value = __webpack_require__(value);
    if(mode & 8) return value;
    if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
    var ns = Object.create(null);
    __webpack_require__.r(ns);
    Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
    return ns;
  };

  // 兼容ES模块和其他模块
  // getDefaultExport function for compatibility with non-harmony modules
  __webpack_require__.n = function(module) {
    var getter = module && module.__esModule ?
      function getDefault() { return module['default']; } :
      function getModuleExports() { return module; };
    __webpack_require__.d(getter, 'a', getter);
    return getter;
  };

  // 判断对象属性是否存在
  // Object.prototype.hasOwnProperty.call
  __webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

  // 当前文件的url，`public path`，用于拼接url获取模块完整地址
  // __webpack_public_path__
  __webpack_require__.p = "";

  // 打印错误，抛出错误
  // on error function for async loading
  __webpack_require__.oe = function(err) { console.error(err); throw err; };

  var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
  var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
  jsonpArray.push = webpackJsonpCallback;
  jsonpArray = jsonpArray.slice();
  for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
  var parentJsonpFunction = oldJsonpFunction;


  // run deferred modules from other chunks
  checkDeferredModules();
})
([]);
```

1. 先加载`runtime.js`，由于其是自执行函数，会在全局注册`webpackJsonpCallback`、`checkDeferredModules`、`installedModules`、`installedChunks`、`deferredModules`、`__webpack_require__``、__webpack_require__.e`、` window["webpackJsonp"]`及其`push`方法，然后执行了`checkDeferredModules`方法，由于此时`deferredModules`为空数组，所以并没有影响。


2. 加载`chunk-libs.js`文件，其内容为

```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["chunk-libs"],{
  "fdbc": (function(module, exports, __webpack_require__) { }),
  "00d8": (function(module, exports, __webpack_require__) { }),
  // ...
}]);
```

也就是执行`webpackJsonpCallback`方法，其中，执行`installedChunks[chunk-libs] = 0`，注册`fdbc`、`00d8`等模块到`modules`中。执行`checkDeferredModules`，但是`deferredModules`为空数组，所以也没影响。

3. 加载`main.js`文件，其内容为：

```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{
  "b3af":
  (function(module, exports, __webpack_require__) {
    var persist_data = __webpack_require__("0a10");
    clearPersist: persist_data["a"],
    // ...

  }),

  "0a10":
  (function(module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.d(__webpack_exports__, "a", function() { return clearPersist; });
    function clearPersist() {console.log('==')}
  }),
},[["b3af","runtime","chunk-libs"]]]);
```


再次执行`webpackJsonpCallback`方法，在`installedChunks`中添加`'main'`，注册`b3af`、`afa0`等模块到`modules`中，在`deferredModules`中增加`[["b3af","runtime","chunk-libs"]]`。执行`checkDeferredModules`，由于`installedChunks`中的`"runtime"`,`"chunk-libs"`值都为`0`，会执行`__webpack_require__('b3af')`。
4. 进入`__webpack_require__('b3af')`，会触发该模块的执行，`b3af`中通过`var persist_data = __webpack_require__("0a10")`方式引用其他模块。
5. `0a10`通过`__webpack_require__.d(__webpack_exports__, "a", function() { return clearPersist; })`导出模块，其实就是将`module.export`的`b`属性指定一个`getter`函数，当其他模块再次通过`__webpack_require__`加载0a10时，直接返回`installedModules['b3af'].exports`。



## 4. 异步加载

### 4.1. 代码转换

`vue-router`设置`component: ()=>import('test.vue')`，会被转为：

```js
component: function component() {
  return __webpack_require__.e("chunk-c8c18dc8").then(__webpack_require__.bind(null, "2d60"));
},
```

另一个例子：

```js
import('./test.js').then(mod => {
    console.log(mod);
});
```

会被转为：

```js
__webpack_require__.e("home-1")
  .then(__webpack_require__.bind(null, "module-home-3"))
  .then(mod => {
      console.log(mod);
  });
```

上面的`"home-1"`就表示：包含`./test.js`模块的`chunk`的`chunkId`为`"home-1"`。

`webpack`首先通过`__webpack_require__.e`加载指定`chunk`的`script`文件（`module chunk`），该方法返回一个`promise`，当`script`加载并执行完成后`resolve`该`promise`。`webpack`打包时会保证异步依赖的所有模块（比如`module-home-3`），都已包含在该`module chunk`（比如`home-1`）或当前上下文中。


既然`module chunk`已经执行，那么表明异步依赖已经就绪，于是在`then`方法中执行`__webpack_require__`引用`test.js`模块（`webpack`编译后`moduleId`为`module-home-3`）并返回。这样在第二个`then`方法中就可以正常使用该模块了。


### 4.2. `__webpack_require__.e`

```js
__webpack_require__.e = function requireEnsure(chunkId) {
  var promises = [];


  // JSONP chunk loading for javascript

  var installedChunkData = installedChunks[chunkId];
  // 判断该chunk是否已经被加载，0表示已加载。
  if(installedChunkData !== 0) { // 0 means "already installed".

    // chunk不为null和undefined，则为Promise，表示加载中，继续等待
    // a Promise means "currently loading".
    if(installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      // 这里installChunk的数据格式：从左到右三个元素分别为resolve、reject、promise
      // setup Promise in chunk cache
      var promise = new Promise(function(resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push(installedChunkData[2] = promise);

      // 下面代码主要是根据chunkId加载对应的script脚本
      // start chunk loading
      var script = document.createElement('script');
      var onScriptComplete;

      script.charset = 'utf-8';
      script.timeout = 120;
      if (__webpack_require__.nc) {
        script.setAttribute("nonce", __webpack_require__.nc);
      }
      // jsonpScriptSrc方法会根据传入的chunkId返回对应的文件路径
      script.src = jsonpScriptSrc(chunkId);

      onScriptComplete = function (event) {
        // avoid mem leaks in IE.
        script.onerror = script.onload = null;
        clearTimeout(timeout);
        var chunk = installedChunks[chunkId];
        if(chunk !== 0) {
          if(chunk) {
            var errorType = event && (event.type === 'load' ? 'missing' : event.type);
            var realSrc = event && event.target && event.target.src;
            var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
            error.type = errorType;
            error.request = realSrc;
            chunk[1](error);
          }
          installedChunks[chunkId] = undefined;
        }
      };
      var timeout = setTimeout(function(){
        onScriptComplete({ type: 'timeout', target: script });
      }, 120000);
      script.onerror = script.onload = onScriptComplete;
      document.head.appendChild(script);
    }
  }
  return Promise.all(promises);
};
```

`installChunk`中的状态：
- `undefined`：`chunk`未进行加载
- `null`：`chunk preloaded/prefetched`
- `[resolve, reject, Promise]`：`chunk`正在加载中
- `0`：`chunk`加载完毕

该方法首先会根据`chunkId`在`installChunks`中的状态，判断该`chunk`是否正在加载或已经被加载。如果没有则会创建一个`promise`，将其保存在`installChunks`中，并通过`jsonpScriptSrc()`方法获取文件路径，通过`sciript`标签加载，最后返回该`promise`。

>当一个普通的脚本被浏览器下载完毕后，会先执行该脚本，然后触发`onload`事件。

也即是加载完`chunk-c8c18dc8`后，会先执行`webpackJsonpCallback`，然后再执行`onScriptComplete`中的内容。

该`Promise`的`resolve`方法在`webpackJsonpCallback`被执行，也就是依赖的`chunk`被加载完成，这里是`chunk-c8c18dc8`。然后就可以通过`__webpack_require__.bind(null, "2d60")`执行其中的`2d60`这个`module`。





### 4.3. `jsonpScriptSrc`

`jsonpScriptSrc`是个工具函数，会根据传入的`chunkId`返回对应的文件名称，比如`chunk-c8c18dc8`对应的文件名是`chunk-c8c18dc8.a6e840a3.js`，`chunk-comm~31712516`对应的文件名是`chunk-comm~31712516.b8e68ca0.js`。

```js
// script path function
function jsonpScriptSrc(chunkId) {
  return __webpack_require__.p + "js/" + ({"chunk-comm~31712516":"chunk-comm~31712516"}[chunkId]||chunkId) + "." + {"chunk-2d0e1f83":"161b1f0a","chunk-32959a3e":"8e45f171","chunk-356c6014":"59d16be0","chunk-4fd39d75":"d8a1fef5","chunk-7861d4a2":"bb95f4aa","chunk-7edb9355":"b044a27e","chunk-c8c18dc8":"a6e840a3","chunk-comm~31712516":"b8e68ca0","chunk-0711a072":"83c0224c","chunk-3c7481d4":"c4f2bdf3","chunk-47a37948":"fe974b7e","chunk-76bd3e2e":"69f55220","chunk-32731d79":"748aae20","chunk-0be819f4":"eb9c8578","chunk-dccb7944":"dbfaff9e","chunk-daf62ed6":"46aaa93a","chunk-fd805560":"87393259","chunk-e78f441e":"8fa51f1b"}[chunkId] + ".js"
}
```

## 5. 流程图

<img src="http://doc.uwayfly.com/webpack-runtime.png" width="900">


## 6. 简写说明

挂载在`__webpack_require__`的一些方法：

```ts
// 入口模块的ID
__webpack_require__.s = the module id of the entry point

//模块缓存对象 {} id:{ exports /id/loaded}
__webpack_require__.c = the module cache

// 所有构建生成的模块 []
__webpack_require__.m = the module functions

// 公共路径，为所有资源指定一个基础路径
__webpack_require__.p = the bundle public path
// 
__webpack_require__.i = the identity function used for harmony imports

// 异步模块加载函数，如果没有再缓存模块中 则用jsonscriptsrc 加载  
__webpack_require__.e = the chunk ensure function

// 设定getter 辅助函数而已
__webpack_require__.d = the exported property define getter function

// 辅助函数而已 Object.prototype.hasOwnProperty.call
__webpack_require__.o = Object.prototype.hasOwnProperty.call

// 给exports设定attr __esModule
__webpack_require__.r = define compatibility on export

// 用于取值，伪造namespace
__webpack_require__.t = create a fake namespace object

// 用于兼容性取值（esmodule 取default， 非esmodule 直接返回module)
__webpack_require__.n = compatibility get default export

// hash
__webpack_require__.h = the webpack hash

// 
__webpack_require__.w = an object containing all installed WebAssembly.Instance export objects keyed by module id

// 异步加载失败处理函数 辅助函数而已
__webpack_require__.oe = the uncaught error handler for the webpack runtime

// 表明脚本需要安全加载 CSP策略
__webpack_require__.nc = the script nonce
```

## 7. 总结

本文分析了`webpack`的打包产物，讲解了运行时的模块加载机制，以及异步加载的实现原理。

核心是先注册最开始的chunk、module，但不会立即执行，而是等到需要的module被加载后才执行，这样的好处是，不会因为某个chunk文件加载速度慢而导致报错。

上面是`webpack`对普通的JS模块的运行机制，对于CSS模块的运行原理，也就是`css-loader`、`style-loader`做了什么，可以参考[下篇文章](https://juejin.cn/post/7054739510680092686/)。



[toc]

## 1. 分包设置注意事项

pages.json 用的分包一定要用到，不要root写了，path是空，或者path不全，因为没写全的会被放到主包内，会在包分析中失败。

另外，假设 views/A 只是 views/B 的一个子组件，不要在 pages.json 中声明一个分包 root 为 views/A。


## 2. main.js不要引用router

因为这会导致所有js都会打包到主包里的 common/main.js 中


## 3. loader上下文



loader 中，可以用 this.resourcePath 获取文件路径，文档地址[在这里](https://www.webpackjs.com/api/loaders/)。其他可能会用到的包括：

- this.context，模块所在的目录
- this.loaders，所有 loader 组成的数组
- this.emitFile，产生一个文件

## 4. 一个组件被import两次，对应的js就会编译错误

啥时候一个组件会被 import 两次呢，动态加载，比如`() => import('./xxx.comp')`



## 5. path-to-regexp库使用时，keys不能是const

示例代码：

```ts
import pathToRegexp from 'path-to-regexp';

// eslint-disable-next-line prefer-const
let keys = [];
const regexp = pathToRegexp(item, keys);
const match = path.match(regexp);
```

## 6. 微信小程序体验版数据加载不了，打开调试模式下才行

检查下面几项：域名已经备案、https已经配置、ssl证书在1.2以上版本、小程序后台已经配置服务器域名

## 7. npm包打包错误

src/project/user/pages.json这种形式的项目，如果引用npm包的组件会打包错误，原因是里面使用的路径是绝对路径，示例如下：

```ts
//# sourceMappingURL=../../../../Documents/node-modules/@ttt/press-ui/press-icon/press-icon.js.map
;(global["webpackJsonp"] = global["webpackJsonp"] || []).push([
    '../../node-modules/@ttt/press-ui/press-icon/press-icon-create-component',
    {
        '../../node-modules/@ttt/press-ui/press-icon/press-icon-create-component':(function(module, exports, __webpack_require__){
            __webpack_require__('1')['createComponent'](__webpack_require__("/Users/mike/Documents/web/src/node-modules/@ttt/press-ui/press-icon/press-icon"))
        })
    },
    [['../../node-modules/@ttt/press-ui/press-icon/press-icon-create-component']]
]);
```

需要将`__webpack_require__("/Users/mike/Documents/web/src/node-modules/@ttt/press-ui/press-icon/press-icon")`替换为`__webpack_require__("123")`

其中的 123 是文件内部的组件模块。这里一开始犯了个错误，用`Object.keys[0]`的方式来获取对象的第一个`key`，其实是有问题的。

>js对象key为数字时，其元素会自动排序

如下例：

```ts
const obj = { 2: 2, 0: 0 }
console.log(Object.keys(obj))
// 0 2

for (let item in obj) console.log(item)
// 0 2
```

那如何找到真正的模块名吗？通过对比发现，`dev`环境下真正的`key`对应的模块中都有`a["default"]=b.exports`，`prod`环境下真正的key对应的模块中都有`__webpack_exports__["default"\]=(component.exports)`，这样通过正则就可以找到对应的`key`了

```ts
export function findKey(obj) {
  const prodReg = /\w\["default"\]\s*=\s*\w\.exports/;
  const devReg = /__webpack_exports__\["default"\]\s*=\s*\(component\.exports\)/;

  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj) {
    const content = obj[key];
    if (prodReg.test(content) || devReg.test(content)) {
      return key;
    }
  }
  throw new Error('没找到对应的key，无法替换绝对路径');
}
```

## 8. publicPath

uni-app 打包的 publicPath 需要写到 manifest 中，写到 `vue.config.js` 中无效


```json
{
  "h5": {
    "router": {
      "mode": "hash",
      "base": ""
    },
    "publicPath": "./"
  },
}
```


## 9. 支持typescript

`uni-app`的`Vue2`版本要想支持`typescript`，只需要安装：

```json
"@vue/cli-plugin-typescript": "~4.5.19",
```

以及配置下`tsconfig.json`。

## 10. 扩展新平台

比如支持国际化，可以在`package.json`配置：

```json
{
"uni-app": {
    "scripts": {
      "overseas": {
        "title": "海外版",
        "browser": "",
        "env": {
          "UNI_PLATFORM": "h5",
          "VUE_APP_I18N": "overseas"
        },
        "define": {
          "OVERSEAS": true
        }
      }
    }
  }
}
```

然后代码中条件编译可以这么写：


```html
<!-- #ifndef OVERSEAS -->
<text class="text">
  {{ $t('连击') }}
</text>
<!-- #endif -->
```

构建时候这样执行：

```bash
sudo npm run env dev:custom overseas
```


参考：https://uniapp.dcloud.net.cn/collocation/package.html


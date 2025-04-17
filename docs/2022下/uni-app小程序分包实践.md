## 1. 开始


uniapp是一个跨端开发框架。最近在使用它将vue项目转成小程序项目，由于项目比较大，不分包的话无法预览、无法上传等。


## 2. 分包

### 2.1. vue-cli插件

uniapp微信小程序端的启动命令如下：

```bash
 "dev:mp-weixin": "NET_ENV=test cross-env NODE_ENV=development UNI_PLATFORM=mp-weixin vue-cli-service uni-build --watch",
```

主要就是后面的 uni-build，这个是在`@dcloudio/vue-cli-plugin-uni`定义的命令，它是vue-cli的一个插件。

```js
// index.js
module.exports = (api, options) => {
  initServeCommand(api, options)

  initBuildCommand(api, options)

  // ...
}
```

`initBuildCommand`中就是注册了 `uni-build` 命令，基本是对webpack配置的一些修改，这里主要看下split-chunk的逻辑。

### 2.2. splitChunk

```ts
if (!webpackConfig.optimization) {
  webpackConfig.optimization = {}
}
// disable noEmitOnErrors
webpackConfig.optimization.noEmitOnErrors = false

webpackConfig.optimization.runtimeChunk = {
  name: 'common/runtime'
}

webpackConfig.optimization.splitChunks = require('../split-chunks')()
```


如果没有分包设置，splitChunk就是把其他非vue、nvue、main.js等文件等打到common/vendor中。

```ts
if (!process.env.UNI_OPT_SUBPACKAGES) {
  return {
    chunks (chunk) { // 防止 node_modules 内 vue 组件被 split
      return chunk.name.indexOf('node-modules') !== 0
    },
    cacheGroups: {
      default: false,
      vendors: false,
      commons: {
        test (module) {
          if (module.type === 'css/mini-extract') {
            return false
          }
          if (module.resource && (
            module.resource.indexOf('.vue') !== -1 ||
              module.resource.indexOf('.nvue') !== -1 ||
              normalizePath(module.resource).indexOf(mainPath) === 0 // main.js
          )) {
            return false
          }
          return true
        },
        minChunks: 1,
        name: 'common/vendor',
        chunks: 'all'
      }
    }
  }
}
```

如果有分包设置，cacheGroups内容会变成下面：

```ts
Object.keys(process.UNI_SUBPACKAGES).forEach(root => {
  (function (root) {
    cacheGroups[root + '/commons'] = {
      test (module, chunks) {
        if (!baseTest(module)) {
          return false
        }
        const matchSubPackages = findSubPackages(chunks)
        if (
          matchSubPackages.size === 1 &&
          matchSubPackages.has(root + '/') &&
          !hasMainPackage(chunks) &&
          !hasMainPackageComponent(module, matchSubPackages.values().next().value)
        ) {
          if (process.env.UNI_OPT_TRACE) {
            console.log(root, module.resource, chunks.map(chunk => chunk.name))
          }
          return true
        }
      },
      minSize: 0,
      minChunks: 1,
      name: normalizePath(path.join(root, 'common/vendor')),
      chunks: 'all'
    }
  })(root)
})
```


唯一变化的就是让只有一个分包使用的文件，放到分包内部的common/vendor中。

minSize为0，即文件再小也会被处理，minChunks为1，即只要它被一个文件引用就会处理。

总之，就是让所有只有一个分包使用的文件都放到对应的common/vendor中。

findSubPackages 作用是找到使用这些chunks的分包集合，normalSubPackageRoots 就是分包的root，比如`views/sche`、`views/match`等。

```ts
const findSubPackages = function (chunks) {
  return chunks.reduce((pkgs, item) => {
    const name = normalizePath(item.name)
    const pkgRoot = normalSubPackageRoots.find(root => name.indexOf(root) === 0)
    pkgRoot && pkgs.add(pkgRoot)
    return pkgs
  }, new Set())
}
```

hasMainPackage 作用是判断 chunks 是否被主包使用，只要找到一个 chunk，它的名字中不包含任何一个分包的名称。

```ts
const hasMainPackage = function (chunks) {
  return chunks.find(item => !subPackageRoots.find(root => item.name.indexOf(root) === 0))
}
```

hasMainPackageComponent 作用是判断组件是否被主包使用。

```ts
const hasMainPackageComponent = function (module, subPackageRoot) {
  if (module.resource && module.reasons) {
    for (let index = 0; index < module.reasons.length; index++) {
      const m = module.reasons[index]

      if (m.module && m.module.resource) {
        const resource = normalizePath(m.module.resource)
        if (
          resource.indexOf('.vue') !== -1 ||
          resource.indexOf('.nvue') !== -1
        ) {
          if (resource.indexOf(subPackageRoot) === -1) {
            if (process.env.UNI_OPT_TRACE) {
              console.log('move module to main chunk:', module.resource,
                'from', subPackageRoot, 'for component in main package:', resource)
            }

            // 独立分包除外
            const independentRoot = independentSubpackageRoots.find(root => resource.indexOf(root) >= 0)
            if (!independentRoot) {
              return true
            }
          }
        } else {
          return hasMainPackageComponent(m.module, subPackageRoot)
        }
      }
    }
  }
  return false
}
```

上面就是uniapp在有分包的情况下的一些配置，这只是理论部分，对于我们项目来说，主要是解决两个问题，一个是common/vendor太大，另一个就是分包后的local-component/local-logic等还在分包的外面会被打到主包中。

### 2.3. 分包实践

目前小程序分包大小有以下限制：

1. 整个小程序所有分包大小不超过 20M
2. 单个分包/主包大小不能超过 2M

分包后，小程序项目由 1 个主包 + 多个分包组成：

1. 主包：一般只包含项目的启动页面或 TabBar 页面、以及所有分包都需要用到的一些公共资源
2. 分包：只包含和当前分包有关的页面和私有资源


如何实现分包自动化：

1. 根据配置驱动的原则，在项目`config.js`中声明`subPackageRoots`，每一项对应小程序`pages.json`中`subPackages`的`root`
2. 生成新`uniapp`项目的时候，根据上面的配置以及`pages`，将`uniapp`需要的`subPackages`字段拼接，并重新写回到`pages.json`中

这样就实现了基本的分包自动化，但是还不够，因为local-component、local-logic等文件还在分包的外面，它们会被打到主包内，使包大小依然超标。

有一个优化手段是，将那些只有一个分包使用的组件移动到分包内部，这样就可以分摊主包的大小。

如何知道一个组件被哪些分包使用、以及是否被主包使用呢？

我们可以借助`@dcloudio/uni-cli-shared/lib/cache`这个包，它会在uniapp运行时被调用，通过它的`getJsonFileMap`方法，可以拿到每个组件的`usingComponents`信息，其实就是依赖关系。

接下来我们处理下这个数据，生成所有组件递归引用关系，找到属于一个分包的组件，然后将其移动到对应的分包内。


此外，还有个问题是common/vendor.js过大，uniapp对它的处理原则是，如果1个库或方法，有两个以上分包在使用，或者主包在使用，就将其放到主包的vendor.js中。

其中，`tim-js-sdk`、`nes-tim`等包体积都超过了500k，它们一定要放到分包中，来减小主包的大小。


小结下：
1. config.js中声明subPackageRoots
2. transfer-tools自动生成pages.json的subPackages字段
3. webpack插件移动外层组件到对应分包中
4. 分析vendor，重新分包


### 2.4. 效果对比

优化前效果

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uniapp-before-subpackage-2.png" width="300">


优化后：


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uniapp-after-subpackage-2.png" width="300">



## 3. 其他

其他相关优化还有很多，下篇再介绍。
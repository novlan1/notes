[toc]

## 1. 背景

uni-app对JS文件的打包策略有提升空间，对于多个分包使用的JS会放到主包中，这会让主包变得特别大。因此需要将只有分包使用的JS文件转移到分包中，下面介绍下这个 webpack 插件的实现。这个插件不是我写的，这里仅是分享下我的理解。


## 2. 实现原理

对于JS文件，有以下几种情况：
1. 主包js => 一个分包在用，uni已经处理好了，会被打包到分包中，不用处理
2. 主包js => 多个分包在用，uni把js已经放到主包，需要清除uni的副作用，把主包的删了，然后放到各个分包去
3. 主包js => 主包组件 => 分包页面，uni判断只要主包组件在使用，就放到主包，需要将这个文件迁移到分包里
4. 主包js => 主包组件 => 主包页面，不用处理

本插件处理的是第二种情况。

实现的话，分两步，先在`compilation.hooks.optimizeChunksAdvanced`钩子中收集需要移动的文件，然后在`compilation.hooks.optimizeChunkModules`钩子中移动打包文件。


## 3. 实现代码

如何收集要移动的文件呢，可以从 `compilation.modules` 过滤出vue文件，就是一个个module，然后获取这些 module 的 chunks，找到这些 chunks 对应的分包，如果有分包在使用，但是主包没在使用，就把它放入 moveFiles 中。


```js
compilation.hooks.optimizeChunksAdvanced.tap('SplitUtilPlugin', () => {
  const waitDisposeModules = compilation.modules.filter(module => baseTest(module));
  waitDisposeModules.forEach((module) => {
    const chunks = module.getChunks();
    const matchSubPackages = findSubPackages(chunks);
    const isMain = hasMainPackage(chunks);
    // 有分包在使用，但是主包没有使用，包含了上面的情况2
    if (matchSubPackages.size > 0 && !isMain) {
      this.moveFiles.set(module, {
        name: module.resource,
        pkgSet: matchSubPackages,
      });
    }
  });
});
```

找到chunks对应的分包：

```ts
const subPackageRoots = Object.keys(process.UNI_SUBPACKAGES).map(root => `${root}/`);
const findSubPackages = function (chunks) {
  return chunks.reduce((pkgs, item) => {
    const name = normalizePath(item.name);
    const pkgRoot = subPackageRoots.find(root => name.indexOf(root) === 0);
    pkgRoot && pkgs.add(pkgRoot);
    return pkgs;
  }, new Set());
};
```

判断chunks是否有主包在使用，就是判断是否是所有用它的包都是分包：

```ts
const hasMainPackage = function (chunks) {
  return chunks.find(item =>
    !subPackageRoots.find(root => item.name.indexOf(root) === 0));
};
```

如何移动 module 呢？遍历 modules，如果某个 module 存在于 moveFiles 中，调用 module.getChunks 获取它的所有 chunks，如果只有 common/vendor 中包含这个 module，说明这个需要被放到分包中，并将 common/vendor 中的移除。



这里面有几个核心API：

- GraphHelpers.disconnectChunkAndModule(chunk, module)，将一个 module 从 chunk 中移除
- GraphHelpers.connectChunkAndModule(chunk, module)，将一个 module 放入 chunk 中
- compilation.addChunkInGroup(chunkName)，创建一个新 chunkGroup



```ts
compilation.hooks.optimizeChunkModules.tap('SplitUtilPlugin', (chunks, modules) => {
  modules.forEach((module) => {
    if (this.moveFiles.has(module)) {
      const mainChunks = module.getChunks();
      // 如果不存在主包的common/vendor中，说明已经被uni放入分包了，就不需要做任何处理
      if (mainChunks.length === 1 && mainChunks[0].name === VENDER_PATH) {
        const mainChunk = mainChunks[0];
        const moveFileInfo = this.moveFiles.get(module);
        const chunkNames = [];
        moveFileInfo.pkgSet.forEach((value) => {
          chunkNames.push(normalizePath(path.join(value, VENDER_PATH)));
        });
        chunkNames.forEach((chunkName) => {
          let pkgChunk = findNameChunk(chunks, chunkName);
          if (!pkgChunk) {
            // 新建一个chunk
            const group = compilation.addChunkInGroup(chunkName);
            pkgChunk = group.chunks[0];
          }
          // 从之前chunk移除，也就是common/vendor
          GraphHelpers.connectChunkAndModule(pkgChunk, module);
        });
        // 添加到分包chunk中
        GraphHelpers.disconnectChunkAndModule(mainChunk, module);
      }
    }
  });
});
```

findNameChunk就是从chunks中根据名字找到对应的chunk：

```ts
const findNameChunk = function (chunks, name) {
  return chunks.find(chunk => chunk.name === name);
};
```


## 4. 效果

JS分发到分包之前，主包大小为 2.48M：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.4.png" width="380">

优化后，主包大小为 1.97M，减小了 0.51M：


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.5.png" width="380">



## 5. 小结

1. optimizeChunksAdvanced 钩子中寻找需要处理的 module，以及该 module 对应的分包。
2. optimizeChunkModules 钩子中从 common/vendor 移除之前的 module，然后移动到分包的 chunk 中。

---


后面有一些优化，这里记录下。

增加了自动分析JS依赖的功能，也就是对于一个JS文件，可以判断有哪些分包使用，这样就可以处理上面讲的第3种情况了，也就是
>主包js => 主包组件 => 分包页面

只需要配置需要移动的JS文件列表，就可以自动移JS。



## 6. 附录

### 6.1. Compiler Hooks

构建器实例的生命周期可以分为 3 个阶段：
- 初始化阶段
- 构建过程阶段
- 产物生成阶段。

下面我们就来大致介绍下这些不同阶段的 Hooks，文档地址在这里：https://www.webpackjs.com/api/compiler-hooks/

#### 6.1.1. 初始化阶段

- environment、afterEnvironment：在创建完 compiler 实例且执行了配置内定义的插件的 apply 方法后触发。
- entryOption、afterPlugins、afterResolvers：在 WebpackOptionsApply.js 中，这 3 个 Hooks 分别在执行 EntryOptions 插件和其他 Webpack 内置插件，以及解析了 resolver 配置后触发。

#### 6.1.2. 构建过程阶段

- normalModuleFactory、contextModuleFactory：在两类模块工厂创建后触发。
- beforeRun、run、watchRun、beforeCompile、compile、thisCompilation、compilation、make、afterCompile：在运行构建过程中触发。

#### 6.1.3. 产物生成阶段

- shouldEmit、emit、assetEmitted、afterEmit：在构建完成后，处理产物的过程中触发。
- failed、done：在达到最终结果状态时触发。

### 6.2. Compilation Hooks

构建过程实例的生命周期我们分为两个阶段，文档地址在这里：https://www.webpackjs.com/api/compilation-hooks/

#### 6.2.1. 构建阶段

- addEntry、failedEntry、succeedEntry：在添加入口和添加入口结束时触发（Webpack 5 中移除）。
- buildModule、rebuildModule、finishRebuildingModule、failedModule、succeedModule：在构建单个模块时触发。
- finishModules：在所有模块构建完成后触发。

#### 6.2.2. 优化阶段

优化阶段在 seal 函数中共有 12 个主要的处理过程，每个过程都暴露了相应的 Hooks，分别如下:

- seal、needAdditionalSeal、unseal、afterSeal：分别在 seal 函数的起始和结束的位置触发。
- optimizeDependencies、afterOptimizeDependencies：触发优化依赖的插件执行，例如FlagDependencyUsagePlugin。
- beforeChunks、afterChunks：分别在生成 Chunks 的过程的前后触发。
- optimize：在生成 chunks 之后，开始执行优化处理的阶段触发。
- optimizeModule、afterOptimizeModule：在优化模块过程的前后触发。
- optimizeChunks、afterOptimizeChunks：在优化 Chunk 过程的前后触发，用于 Tree Shaking。
- optimizeTree、afterOptimizeTree：在优化模块和 Chunk 树过程的前后触发。
- optimizeChunkModules、afterOptimizeChunkModules：在优化 ChunkModules 的过程前后触发，例如 ModuleConcatenationPlugin，利用这一 Hook 来做Scope Hoisting的优化。
- shouldRecord、recordModules、recordChunks、recordHash：在 shouldRecord 返回为 true 的情况下，依次触发 recordModules、recordChunks、recordHash。
- reviveModules、beforeModuleIds、moduleIds、optimizeModuleIds、afterOptimizeModuleIds：在生成模块 Id 过程的前后触发。
- reviveChunks、beforeChunkIds、optimizeChunkIds、afterOptimizeChunkIds：在生成 Chunk id 过程的前后触发。
- beforeHash、afterHash：在生成模块与 Chunk 的 hash 过程的前后触发。
- beforeModuleAssets、moduleAsset：在生成模块产物数据过程的前后触发。
- shouldGenerateChunkAssets、beforeChunkAssets、chunkAsset：在创建 Chunk 产物数据过程的前后触发。
- additionalAssets、optimizeChunkAssets、afterOptimizeChunkAssets、optimizeAssets、afterOptimizeAssets：在优化产物过程的前后触发，例如在 TerserPlugin 的压缩代码插件的执行过程中，就用到了 optimizeChunkAssets。




## 1. 方案

这里主要是对组件分发插件的优化，之前插件是在`compiler.hooks.done`这个钩子上进行操作的，包括读取文件、修改引用、写入文件。

其实可以在其他钩子中操作asset，也就是在输出文件之前就处理好，总结起来就一句话，在内存中操作总比IO快。

实际编码中，是在`compiler.hooks.emit`钩子中操作，通过`compilation.assets`，拿到待输出的资源。

`assets`是资源的对象，key 是文件相对路径，value 是个对象，有 source/info/size 等属性，其中，source是函数，返回的就是文件内容。

通过增删改 assets 就可以操作输出资源了。

```ts
apply(compiler) {
  compiler.hooks.emit.tap('moveComponentPlugin', (compilation) => {
    const { assets } = compilation;
    const {
      parsedReplaceRefList,
      movingComponents,
    } = analyzeComponent(this.options);

    this.copyComponents(assets, movingComponents);
    this.modifyRef(assets, parsedReplaceRefList);
    this.deleteComponents(assets, movingComponents);
  });
}
```

类似的，还有其他插件直接操作文件的，都可以改成这种方式。

## 2. 效果

如何对比改进前后的打包时间呢？可以写个插件，但更简单的是在执行命令前打印一下时间戳，在执行命令后再打印下时间戳就可以了。

改进前：

- 插件执行时间：1661170044696 - 1661169849984 = 194712，约**195s**

- 打包总时间：1661170047149 - 1661169773593 = 273556，约**274s**

改进后：

- 插件执行时间：1661169591728 - 1661169589082 = 2646，约**3s**

- 打包总时间：1661169594229 - 1661169521873 = 72356，约**72s**


对比下，**改进后的插件执行时间减少了192s，打包总时间减少了202s，总体上效率提升了3倍**。

另外说下，这个改进的其他两个好处：
1. 可以在本地开发时也使用此插件，不再会因为修改了一行代码而等几分钟
2. 也可以`build:mp`和`dev:mp`两个命令同时运行，不会因为都操作同一处的公共文件而产生异常

## 3. 总结

1. 选对操作的钩子，这个例子中是从原来的`compiler.hooks.done`钩子变成`compiler.hooks.emit`钩子。
2. 尽量不要操作编译后产物，这个例子操作的是assets，主要是基本的增删改。
3. 尽量避免O(N^2)的算法，可以提前处理好数据，降低时间复杂度。
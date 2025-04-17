[toc]

## 1. 开始

前一阵，uni-app小程序主包大小快超2M了，并且已经用了一些优化手段，比如把主包没用的组件移动到分包中，以及移动了一些JS文件。这里JS移动的过程是不完备的，需要手动指定其对应的分包，于是亟需一个插件，可以自动获取使用某JS文件的分包列表。

## 2. 实现

### 2.1. 收集依赖

插件整体分为两步，第一步是在 `compiler.hooks.normalModuleFactory - normalModuleFactory.hooks.afterResolve`中去收集依赖。

- `result.resourceResolveData.path` 为当前加载的文件路径
- `result.resourceResolveData.context.issuer` 为引用当前文件的父文件

```ts
compiler.hooks.normalModuleFactory.tap(this.pluginName, (nmf) => {
  nmf.hooks.afterResolve.tap(this.pluginName, (result) => {
    const { resourceResolveData } = result;
    const {
      context: {
        issuer,
      },
      path,
    } = resourceResolveData;

    const parent = issuer ? getRelativePath(issuer) : ROOT_NAME;
    const child = getRelativePath(path);

    if (this.depsMap[parent]) {
      this.depsMap[parent].add(child);
    } else {
      this.depsMap[parent] = new Set([child]);
    }

    if (this.reverseDepsMap[child]) {
      this.reverseDepsMap[child].add(parent);
    } else {
      this.reverseDepsMap[child] = new Set([parent]);
    }
  });
});
```

### 2.2. 处理依赖

经过上步，获取到了一个原始的依赖关系，还需要进一步处理才可以使用。处理的方式有两种：

- 递归获取每个文件的父文件，层层嵌套，可命名为 `nestedDeps`
- 拉平依赖关系，只有一层，也就是一个文件的所有父文件都在一个列表里，可命名为 `flattenedDeps`

举个例子来说，对于下面的`deps`

```ts
{
  a: ['b'],
  b: ['g', 'a'],
  g: ['p'],
};
```

`nestedDeps`结果为：

```ts
[
  {
    name: 'a',
    children: [
      {
        name: 'b',
        children: [
          {
            name: 'g',
            children: [
              {
                name: 'p',
                children: [],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'b',
    children: [
      {
        name: 'g',
        children: [
          {
            name: 'p',
            children: [],
          },
        ],
      },
    ],
  },
  {
    name: 'g',
    children: [
      {
        name: 'p',
        children: [],
      },
    ],
  },
]
```


`flattenedDeps`结果为：

```ts
{
  a: ['b', 'g', 'p'],
  b: ['g', 'p'],
  g: ['p'],
}
```

这里的需求是用`flattenedDeps`，来获取使用一个JS文件的分包列表。

`nestedDeps`的用处是什么呢？它可以用来进行依赖的可视化分析，比如用`echarts`做一个树状图。这里我也试验了下，代码比较简单，直接改下官网Demo的数据源即可。但是我们项目太大了，写入文件时有100多万行，IDE直接卡住了。这里的一个优化是过滤出自己需要的，感兴趣的同学可以自己试试。


此外，处理依赖的时候要注意循环引用、依赖自身等情况，以及可以缓存一些处理结果，遇到处理过的，直接返回。


```ts
let rawChild = storeMap[child] || [];

if (rawChild.indexOf(child) > -1) {
  console.log(`[DEP] 存在循环引用 ${child} 子元素包含自己`);
  rawChild = rawChild.filter(item => item !== child);
}

if (parentList) {
  rawChild = rawChild.filter((item) => {
    if (parentList && parentList.indexOf(item) > -1) {
      console.log(`[DEP] 存在循环引用 ${child} 子元素引用了祖先元素 ${item}`);
    }
    return parentList.indexOf(item) <= -1;
  });
}
```

## 3. 应用

拿到所有文件对应的父文件、祖先文件后，就可以获取到使用一个js文件的分包列表。这样就不用手动书写配置文件，避免了遗漏，提高了可维护性。

另外这个插件也可以独立出来，用来可视化分析、查看依赖关系等。


## 1. 背景

介绍下uni-app打包的另一个优化手段，将只有分包使用的组件移动到分包中，因为uni-app默认策略是不处理组件，开发者写到哪里就打包到哪里。

如果改原始项目工作量大，容易改错，也破坏了项目的基本架构。所以需要一个插件能够在编译时动态将分包组件移动到分包中。


## 2. 实现方式

移动分包组件，这里的组件分两种：

- 分包直接使用的组件
- 组件中引用的子组件，及其子子组件等



另外，使用情况也分两种：

1. 组件只有一个分包使用
2. 组件有多个分包在使用

贴一张图，方便理解：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-components.png" width="900">

- 第1层是包级别，包括主包、分包1、分包2、分包3
- 第2层主要是页面直接引用的组件级别，包括组件A-G
- 第3层是子子组件，包括组件a-h

另外，同一级的组件也可能存在引用关系，比如组件B引用组件A，组件d引用组件c等。


第1种情况比较简单，不管是页面组件还是子子组件，只要只有一个分包使用，就可以将这个组件移动到分包内，然后替换这个组件的引用地址即可。

上面例子中属于这种情况的组件包括：
- 第2层的组件D、E、G
- 第3层的组件h

实际编码中，可以通过 getJsonFileMap 拿到组件map，就是所有组件和对应的usingComponents，需要先遍历这个map，生成所有组件递归引用关系。然后根据页面拉平，就是列举所有页面需要的所有子组件、子子组件。之后逆向判断一个组件被那些页面引用，也就是被哪些分包使用。


第2种情况就相对复杂，引用关系不能全局替换，因为组件被移动到了多个分包内，需要在移动后的分包内进行引用关系替换。

因为多个分包共用同一个组件，所以操作的步骤应该是：复制组件到分包 => 修改引用 => 删除原组件


## 3. 核心代码

生成组件的相互引用关系

```ts
for (const name of jsonFileMap.keys()) {
  const jsonObj = JSON.parse(jsonFileMap.get(name));
  let { usingComponents = {} } = jsonObj;
  const { genericComponents = [] } = jsonObj;
  // 格式化slot相关组件
  const parsedGeneric = formatComponentPath(genericComponents, name) || {};
  usingComponents = {
    ...parsedGeneric,
    ...usingComponents,
  };
  usingComponentsMap[name] = handleUsingComponents(usingComponents);
  if (!usingComponents || !pageSet.has(name)) {
    continue;
  }
}
```

处理 usingComponents，路径去掉前面的`/`，即`/../../components/xx`转为`../../components/xx`。


```ts
function handleUsingComponents(usingComponents = {}) {
  return Object.keys(usingComponents).reduce((acc, item) => {
    const compPath = usingComponents[item].slice(1);
    acc[compPath] = {};
    return acc;
  }, {});
}
```

最后生成的 usingComponentsMap 格式如下：

```json
"views/xxx": {
  "views/xxx/xxx": {},
  "views/xxx/xxx/xxx: {
    "../../local-component/xxx": {},
    "../../local-component/xxx": {},
    "../../local-component/ui/uuu": {}
  },
  "../../local-component/ui/xxx": {
    "../../local-component/ui/xxx/xxx": {}
  },
}
```

构建组件所有引用关系，这样就可以拿到一个页面的子子子子...组件了：

```ts
function genComponentMap(usingComponentsMap) {
  Object.keys(usingComponentsMap).map((page) => {
    const compObj = usingComponentsMap[page];
    Object.keys(compObj).map((comp) => {
      if (usingComponentsMap[comp]) {
        compObj[comp] = usingComponentsMap[comp];
      }
    });
  });
}
```

拉平上述组件关系：


```ts
function flattenUsingComponentMap(map) {
  const res = {};
  function cursive(obj = {}, list = []) {
    Object.keys(obj).map((key) => {
      const value = map[key];
      if (value) {
        list.push(...Object.keys(value));
        cursive(value, list);
      }
    });
  }
  Object.keys(map).map((key) => {
    const temp = [];
    const value = map[key];

    if (value) {
      temp.push(...Object.keys(value));
    }
    cursive(value, temp);
    res[key] = temp;
  });
  return res;
}
```

拉平后的数据如下：


```ts
{
   "views/xxx": [
    "../../local-component/xxx",
    "../../local-component/yyy",
    "../../local-component/ui/zzz",
    "../../component/ui/zzz",
   ]
}
```


获取使用一个组件的所有分包：

```ts
function handleComponentMap(map, pageSet) {
  const res = {};
  for (const name of Object.keys(map)) {
    if (!pageSet.has(name)) {
      continue;
    }
    const value = map[name] || [];
    for (const key of value) {
      if (!res[key]) {
        res[key] = new Set();
      }
      res[key].add(name);
    }
  }
  return res;
}
```


其中 pageSet 就是所有的页面集合，形如：

```ts
[
  "views/index/a",
  "packages/views/b",
  "views/c",
]
```

接下来就是处理 allUsingComponentMap，移动组件、修改引用关系：

```ts
Object.keys(allUsingComponentMap).forEach((componentName) => {
  const subPackages = findSubPackages([...allUsingComponentMap[componentName]]);
  subPackages.forEach((subPackage) => {
    if (subPackage && componentName.indexOf(subPackage) !== 0) {
      // ...
    }
  });
});
```





## 4. 优化

为了让插件更加灵活，可以适应不同项目，提供了几个配置选项：
- 最大分包使用数目 maxUseTimes
   - 对一个组件，如果使用它的分包多于 maxUseTimes 时，就不再处理
  
- 禁止移动的组件列表 disableList
   - 如果 disableList 中包含组件的路径和名称匹配到了，就不再处理




## 5. 效果

不使用本插件时，包依赖分析如下，主包大小为 3.54M：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.7.png" width="380">


只移动仅有一个分包使用的组件时，包依赖分析如下，主包大小为 1.96M：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.8.png" width="380">


移动所有只有分包使用的组件式，包分析如下，主包大小为 1.37M：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/8/uni-app-bundle-week-2.6.png" width="380">


可以看到效果是显著的，主包大小减小了 2.17M。

值得注意的是，如果组件有多个分包在使用，将它们都移动到分包内，会大幅增加总包的大小。这里需要根据实际情况，取个折中的值，来保证主包和总包都不要太大。



## 6. 注意事项

1. 引用关系替换


引用关系替换时，要注意全部替换，否则会报错 component 找不到，即：

```ts
// 可以
source = source.replaceAll(`${item[0]}`, `${item[1]}`);

// 不可以
// source = source.replaceAll(`${item[0]}'`, `${item[1]}'`);
// source = source.replaceAll(`${item[0]}"`, `${item[1]}"`);

```

因为uni-app打包时会生成额外的代码，比如`../../local-component/ui/xx-create-component`，`xx-create-component`是声明了一个module，其内部就是调用createComponent。这种js也要替换，否则会产生异常。

贴一下源码，方便查看：

```ts
(global["webpackJsonp"] = global["webpackJsonp"] || []).push([
    '../../views/match/local-component-xxx-create-component',
    {
        '../../views/match/local-component-xxx-create-component':(function(module, exports, __webpack_require__){
            __webpack_require__('543d')['createComponent'](__webpack_require__("f2a9"))
        })
    },
    [['../../views/match/local-component-xxx-create-component']]
]);
```





2. 父子组件


disableList 这个参数要小心使用，如果一个组件被强制留在了主包内，那么它的子组件也必须在主包内，否则会产生异常。


3. windows系统与mac系统兼容

引用关系替换需要注意平台兼容性，`path.sep`可以获取不同平台的分隔符，`mac`是`/`，windows是`\\`，第一个反斜杠是转义。

```ts
const sourceRef = path.resolve(target.replace(outputDir, ''), fileName);
// 错误


const sourceRef = path.join(target.replace(outputDir, ''), fileName)
      .split(path.sep)
      .join('/');
// 正常
```
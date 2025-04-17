## 1. 开始

有人在 `github` 上提了 [issue](https://github.com/Tencent/tdesign-miniprogram/issues/2840)，说 `Cascader` 在4级地址下卡顿明显。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_f816e0f537c5e292a0.png" width="700"/>

## 2. 解决

看了下代码，`CasCader` 组件会接收 `options` 参数，大致结构如下：

```ts
Array<{ label: string; value: string; children?: Array<IOptions>}>
```

内部有个 `items`，会在渲染层循环，生成 `Cascader` 待选择的列表，比如4级地址，`items` 就有4项。

问题就出在 `items` 的 `setData` 上，原来的代码会在 `select` 时，把 `item.children` 一起设置，这其实是没有必要的，渲染层根本用不到。**而且这个 `children` 数据量巨大，而且会嵌套，`children` 里面还有 `children`，导致 `setData` 能达到好几兆**。

此外，取值 `item` 的时候，完全可以从原始数据 `options` 上，根据 `selectedIndexes` 和 `level` 获取。

直接看代码：

```ts
type KeysType = TdCascaderProps['keys']['value'];

function parseOptions(options: OptionsType, keys: KeysType) {
  const label = keys?.label ?? 'label';
  const value = keys?.value ?? 'value';

  return options.map((item) => {
    return {
      [label]: item[label],
      [value]: item[value],
    };
  });
}
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_f3d4bd1f53b29f1c66.png" width="800" />

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_94b325272bbeb25cbe.png" width="800" />

## 3. 效果

优化前：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_90136e5a2f9582c59f.gif" width="399" />

优化后：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_733b0e9743fe66dc10.gif" width="399" />

## 4. 进一步优化

进一步优化了两个方面:

1. 将 `options` 设为纯数据字段
2. `handleSelect` 时切片更新 `items`，就是更新 `items` 的某一列，而不是一起更新。


第 1 个就是新增了 `pureDataPattern`，如下：

```ts
options: WechatMiniprogram.Component.ComponentOptions = {
  multipleSlots: true,
  // 新增
  pureDataPattern: /^options$/,
};
```

第 2 个，我把 `options` 和 `selectedIndexes` 的监听分开，因为 `options` 变化依然需要全量更新 `items`，而 `selectedIndexes` 变化并不需要。

`handleSelect` 时只需要更新 `items[level + 1]` 即可。直接看代码。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_9396b3f80bb20f18f8.png" width="800" />

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/6/own_mike_c626f7f26692a2063b.png" width="800" />

## 5. 总结

核心就两步，**一是 `setData` 的时候少更新一点，二是取的时候稍微不那么方便一点**。仔细想一想，是不是其他业务的性能优化也是异曲同工？

详细代码见[PR](https://github.com/Tencent/tdesign-miniprogram/pull/2866)。

## 6. 后记

本来我都把这篇文章删了，后来看到《团队分拆了，项目怎么办》中提到了这个 `issue`，呵呵，不想多说了。

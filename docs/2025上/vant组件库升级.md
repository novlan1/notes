## 1. 开始

一些项目需要从 `vant@2` 升级到 `vant@4`，记录下差异。

## 2. picker

回调参数更新：

```diff
onConfirm(v) {
-  console.log(v.key);
+  console.log(v.selectedOptions[0].key);
}
```


## 3. popup

是否展示由 `v-model` 改为 `v-model:show`

```diff
<van popup
-  v-model="show"
+  v-model:show="show"
>
</van-popup>
```

## 4. toast

函数式调用的需要手动引入样式，无法通过 `auto-import` 自动引入。

```ts
import 'vant/lib/toast/index.css';
```

## 5. dialog

是否展示由 `v-model` 改为 `v-model:show`

```diff
<van-dialog
-  v-model="show"
+  v-model:show="show"
>
</van-dialog>
```

## 6. action-sheet

是否展示由 `v-model` 改为 `v-model:show`

```diff
<van-action-sheet
-  v-model="show"
+  v-model:show="show"
>
</van-action-sheet>
```

## 7. tabs

```diff
<van-tabs
-  v-model="curTab"
+  v-model:active="curTab"
>
</van-tabs>
```

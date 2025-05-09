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

columns 默认数据结构：

```ts
Array<{
  text: string;
  value: any;
}>
```

如需更改，需传入 `columns-field-names`，如

```ts
:columns-field-names="{ text: 'text', value: 'key', children: 'children' }"
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

## 8. 其他

### 8.1. `.native` 修饰符被废弃

Vue 3 中，`.native` 修饰符已被废弃，以下是关键区别和迁移建议：

- ​​Vue 2​​：`.native` 用于监听组件根元素的原生事件（如 `@click.native`），因为自定义组件的 `v-on` 默认只能监听子组件通过 `$emit` 触发的事件。
- ​Vue 3​​：移除了 `.native`，改为通过 `emits` 选项显式声明组件事件。未在 `emits` 中定义的事件会被视为原生事件，自动绑定到根元素。

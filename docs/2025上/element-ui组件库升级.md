## 1. 开始

`element-ui` 组件库升级为 `element-plus`，记录下差异。

## 2. el-dialog 组件​

### 2.1. 是否显示

- Element-UI​​ 使用 `:visible.sync` 进行双向绑定
​​- Element-Plus​​ 改用 `v-model` 或 `:model-value`

```diff
<el-dialog
-  :visible.sync="dialogVisible"
+  v-model="dialogVisible"
>
</el-dialog>
```

### 2.2. padding

element-plus 中 el-dialog 中默认有 `padding`，去除方法：

```css
.el-dialog {
  --el-dialog-padding-primary: 0;
}
```

### 2.3. footer

用 footer 插槽，才有 `.el-dialog__footer` 元素，之前写的样式才能生效。

```diff
<el-dialog>
-  <div slot="footer">
-  </div>
+  <template #footer>
+    <!-- 这里的内容会渲染到 .el-dialog__footer -->
+  </template>
</el-dialog>
```


### 2.4. custom-class

`custom-class` 已废弃，直接使用 `class`。

## 3. el-table 插槽语法​

- Element-UI​​ 使用 `slot-scope`
​​- Element-Plus​​ 改用 `#default`

```diff
<template
-  slot-scope="scope"
+  #default="scope"
>

</template>
```

## 4. el-icon 使用方式​

- ​​Element-UI​​ 使用 class 引入图标
- Element-Plus​​ 改用 `<el-icon>` 组件

```diff
-  <i class="el-icon-edit"></i>
+  <el-icon><Edit /></el-icon>
```

业务中常用的有：

之前：

```ts
<i
  class="el-icon-plus"
/>
```

```ts
import { Plus as ElIconPlus } from '@element-plus/icons-vue';
```

现在：

```html
<el-icon>
  <ElIconPlus />
</el-icon>
```

## 5. el-select

element-plus 中 el-select 边框去除方法

```css
:root .el-select {
  --el-select-width: 184px;

  &__wrapper,
  &__wrapper.is-hovering,
  &__wrapper.is-focused {
    box-shadow: none;
  }
}
```

## 6. el-checkbox

`element-ui` 中的 `checkbox` 没有默认高度，`element-plus` 中的 `.el-checkbox` 有默认高度为 32px。

这一点会对后面绝对定位的图标产生影响。

```diff
.icon-question {
-  top: 4px;
+  top: 9px;
}
```

## 7. el-button

`type="text"` 已被废弃，可替换成 `link & type="primary"`。

```diff
<el-button
-  type="text"
+  link
+  type="primary"
>
  button
</el-button>
```

参考：[button](https://element-plus.org/zh-CN/component/button.html#%E9%93%BE%E6%8E%A5%E6%8C%89%E9%92%AE)


### 1. token 核心

> 颜色色板 => 全局语义token => 组件token

### 2. WXS

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_62aJQAxB8dp3b6j7.png" width="600" />

### 3. artwork

<img src="https://cdn.uwayfly.com/article/2025/10/own_mike_YerJ44De845RSASw.png" width="600" />

### 4. hard

The hard road might not lead to glory But the easy road definitely won't.

### 5. 类型声明

packages.json 中给每个组件声明类型，具体是在 exports 字段中：

```json
"exports": {
  "./*": "./*",
  "./navbar/navbar.vue": {
    "types": "./types/navbar.d.ts",
    "import": "./navbar/navbar.vue",
    "default": "./navbar/navbar.vue"
  },
  // ...
}
```

注意这里的顺序，必须是先 types 后 default/import，否则会报错：

```
node_modules/tdesign-uniapp/navbar/navbar.d.vue.ts”处有类型，但在遵守
package.json "exports" 时无法解析此结果。“tdesign-uniapp”库可能需要更新其
package.json 或键入
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_AyKiXpnM6kPxWhfa.png" width="600" />

同时也要注意加上下面这句，否则其他 css 文件这些无法导入。

```json
{
  "./*": "./*"
}
```

### 6. DefineComponent

```ts
export type DefineComponent<
PropsOrPropOptions = {},
RawBindings = {},
D = {},
C extends ComputedOptions = ComputedOptions,
M extends MethodOptions = MethodOptions,
Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
E extends EmitsOptions = {},
EE extends string = string,
PP = PublicProps,
Props = ResolveProps<PropsOrPropOptions, E>,
Defaults = ExtractDefaultPropTypes<PropsOrPropOptions>,
S extends SlotsType = {},
LC extends Record<string, Component> = {},
Directives extends Record<string, Directive> = {},
Exposed extends string = string,
Provide extends ComponentProvideOptions = ComponentProvideOptions,
MakeDefaultsOptional extends boolean = true,
TypeRefs extends Record<string, unknown> = {},
TypeEl extends Element = any>
```

解读如下：

1. PropsOrPropOptions- Props
2. RawBindings- Setup 返回值
3. D- Data
4. C- Computed
5. M- Methods
6. Mixin- Mixins
7. Extends- Extends
8. E- Emits
9. EE- Emits 选项（字符串）
10. PP- PublicProps
11. Props- 解析后的 Props
12. Defaults- 默认值类型
13. S- Slots（第12个参数！）
14. LC- 局部组件
15. Directives- 指令
16. Exposed- 暴露的属性
17. Provide- Provide
18. MakeDefaultsOptional- 是否可选默认值
19. TypeRefs- 类型引用
20. TypeEl- 元素类型

uniapp 中 CLI +Typescript 模板有点问题，slot 类型报错，解决方案：

1. 去掉 `env.d.ts` 中 `*.vue` 的类型

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_kirx5GczWXZdJRY5.png" width="600" />

2. `tsconfig.json` 指定 `"moduleResolution": "bundler"`

推荐后者。

### 7. nvue vs uvue

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_w2rj56ds3YeX8drQ.png" width="600" />

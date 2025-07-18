## 1. h 函数

在 Vue 3 中，`h` 函数是用于创建 **虚拟 DOM 节点（VNode）** 的核心工具，其名称来源于 "hyperscript"（即 "生成 HTML 的脚本" 的缩写）。它是 `createVNode` 的别名，用于以编程方式描述 UI 结构，是 Vue 渲染系统的底层实现之一。以下是其核心要点：

1. **基本定义与作用**
   `h` 函数通过 JavaScript 对象描述 DOM 结构，生成虚拟节点（VNode），这些节点会被 Vue 的渲染器高效地转换为实际 DOM。它支持动态创建 HTML 元素、组件或复杂嵌套结构，适用于模板语法无法满足灵活性的场景。

2. **语法与参数**
   其完整签名为 `h(type, props, children)`：
   - **type**：可以是 HTML 标签名（如 `'div'`）、组件对象或函数式组件。
   - **props**：可选属性对象，包含类名、样式、事件（如 `onClick`）等。
   - **children**：子节点，可以是字符串、数组（多个子节点）或其他 VNode。

3. **与模板和 JSX 的关系**
   - **模板编译**：Vue 的模板最终会被编译为 `h` 函数的调用。例如，`<div>{{ message }}</div>` 会转换为 `h('div', {}, message)`。
   - **JSX 支持**：JSX 语法在 Vue 中会被 Babel 转换为 `h` 函数调用，例如 `<div class="container">` 等价于 `h('div', { class: 'container' })`。

4. **使用场景**
   - **动态渲染**：根据条件或数据动态生成节点（如条件分支、循环列表）。
   - **高阶组件**：开发需要灵活控制渲染逻辑的组件（如自定义渲染函数、插件）。
   - **性能优化**：绕过模板编译，直接生成更高效的渲染逻辑。

5. **与 Vue 2 的区别**
   在 Vue 2 中，类似功能通过 `createElement` 实现，且作为渲染函数的参数传入。Vue 3 的 `h` 需显式从 `'vue'` 导入，并支持更灵活的 Composition API 集成。

总结来说，`h` 函数是 Vue 3 响应式渲染的核心工具，提供了比模板更底层的控制能力，适用于需要动态或复杂逻辑的 UI 构建场景。

## 2. jsx中嵌套h函数

在 Vue 3 的 JSX 语法中嵌套 `h` 函数是一种混合使用 JSX 和渲染函数的技巧，通常用于处理动态渲染逻辑或需要更精细控制 VNode 的场景。以下是关键要点和示例：

---

### 2.1. **JSX 与 `h` 函数的本质关系**
- **JSX 是语法糖**：Vue 的 JSX 最终会被编译为 `h` 函数（即 `createVNode`）的调用。例如：
  ```jsx
  const jsxNode = <div class="container">Hello</div>;
  // 编译后等价于：
  const hNode = h('div', { class: 'container' }, 'Hello');
  ```


- **嵌套 `h` 的场景**：当 JSX 无法直接表达复杂逻辑（如动态生成组件类型或插槽内容）时，可以显式调用 `h` 函数嵌入到 JSX 中。

---

### 2.2. **嵌套 `h` 的常见用法**
#### 2.2.1. **动态组件渲染**
在 JSX 中动态选择组件类型时，`h` 函数比 JSX 标签更灵活：
```jsx
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';

export default {
  setup() {
    const dynamicComponent = ref('ComponentA');
    return () => (
      <div>
        {h(dynamicComponent.value, { prop: 'value' })}
      </div>
    );
  }
};
```


#### 2.2.2. **复杂插槽内容**
JSX 中嵌套 `h` 可以精确控制插槽的渲染逻辑：
```jsx
import Card from './Card.vue';

export default {
  setup() {
    return () => (
      <Card>
        {{
          header: () => h('h1', 'Custom Header'),
          default: () => <p>JSX Content</p>,
          footer: () => h('small', 'Footer')
        }}
      </Card>
    );
  }
};
```


#### 2.2.3. **条件渲染高阶组件**
当需要根据条件返回不同的 VNode 结构时：
```jsx
export default {
  setup() {
    const isAdmin = ref(true);
    return () => (
      <div>
        {isAdmin.value
          ? h(AdminPanel, { permissions: 'all' })
          : <UserPanel />
        }
      </div>
    );
  }
};
```


---

### 2.3. **注意事项**
- **性能影响**：过度嵌套 `h` 可能增加代码复杂度，建议仅在必要时使用（如动态组件、自定义渲染逻辑）。
- **类型支持**：在 TypeScript 中，需确保 `h` 函数的参数类型与 JSX 标签类型兼容。
- **插件配置**：使用 JSX 需在 Vite 或 Webpack 中配置 `@vitejs/plugin-vue-jsx` 或 `@vue/babel-plugin-jsx`。

---

### 2.4. **总结**
JSX 嵌套 `h` 函数适用于需要结合 JSX 的简洁性和 `h` 函数的动态能力的场景，例如：
- 动态组件类型切换；
- 复杂插槽的编程式控制；
- 条件渲染高阶组件。

对于大多数简单场景，纯 JSX 语法更直观；而复杂逻辑中混合使用 `h` 能提供更大灵活性。

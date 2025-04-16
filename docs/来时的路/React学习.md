## 1. 开始

用 React 比较少，学习记录下。

## 2. React

### 2.1. 在 Vue 中实现 useState

useState 如果放到 Vue 中，可以这样实现

```ts
import { ref } from 'vue';

export function useState(value) {
  const inner = ref(value);

  const changeInner = (newVal) => {
    inner.value = newVal;
  };
  return [
    inner,
    changeInner
  ];
}
```

引入并使用如下。

和 React 的 `useState` 区别是，在模板中不用加 `.value`，在脚本中需要加。

```html
<div
  @click.stop="setMock(mock+1)"
>
  {{ mock }}
</div>
```

```ts
import { useState } from './useState';
const [mock, setMock] = useState(0);
```


### 2.2. PullDownRefresh

#### 2.2.1. 原理

实现了 TDesign 中 `Mobile React` 端 和 `Mobile Vue` 端的对齐。组件的核心逻辑如下。

`onTouchMove` 中，也就是下拉过程中可能产生两种状态：

- `pulling`，下拉
- `loosing`，下拉距离大于 `loadingBarHeight`

`onTouchEnd` 中，会判断 `status` 是否为 `loosing`

- 如果是则会进入 `refresh` 方法
- 否则设置 `status` 为 `normal`，`distance` 恢复为 0。`distance` 控制真实的下拉距离，用 `transform` 实现。

`refresh` 中

- 会将 `distance` 置为 `loadingBarHeight`
- 状态置为 `loading`
- 然后生成一个唯一的 timer，利用 `Promise.race`，判断 `timer` 和 `onRefresh` 哪个返回的早，如果是 `onRefresh`, 则状态置为 `success`，否则代表超时，则恢复 `status` 为 `normal`。
- `success` 或者超时之后，都会在 `300ms` 后，重置 `status`、`distance`

Vue 实现不同，`status` 不直接设置，而是根据 `value/distance/loadingBarHeight/afterLoading` 等值计算而来。

#### 2.2.2. useTouch

`useTouch` 是可以判断滑动距离的 `hook`，Vue 实现了一套，通过“翻译”它到 React，可以了解 React 和 Vue 的语法差异。


```ts
import { ref } from 'vue';

export function useTouch() {
  const startX = ref(0);
  const startY = ref(0);
  const diffX = ref(0);
  const diffY = ref(0);
  const start = (event: TouchEvent) => {
    const { clientX, clientY } = event.touches[0];
    startX.value = clientX;
    startY.value = clientY;
    diffY.value = 0;
    diffX.value = 0;
  };
  const move = (event: TouchEvent) => {
    const { clientX, clientY } = event.touches[0];
    diffY.value = clientY - startY.value;
    diffX.value = clientX - startX.value;
  };
  return {
    startX,
    startY,
    diffX,
    diffY,
    start,
    move,
  };
}
```

React 版本的 `useTouch`，就是把 `ref` 变量改成 `useState`，设置的地方去掉 `.value`，改成用 `setXxx`。

```ts
export function useTouch() {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [diffX, setDiffX] = useState(0);
  const [diffY, setDiffY] = useState(0);
  const start = (event: React.TouchEvent) => {
    const { clientX, clientY } = event.touches[0];
    setStartX(clientX);
    setStartY(clientY);

    setDiffX(0);
    setDiffY(0);
  };
  const move = (event: React.TouchEvent) => {
    const { clientX, clientY } = event.touches[0];
    setDiffY(clientY - startY);
    setDiffX(clientX - startX);
  };
  return {
    startX,
    startY,
    diffX,
    diffY,
    start,
    move,
  };
}
```

### 2.3. React 中实现 computed

使用 useMemo 可以实现。

```ts
const trackStyle = computed(() => {
  return {
    transform: `translate3d(0, ${distance.value}px, 0)`,
  };
});
```

在 React 中

```ts
const trackStyle = useMemo(
  () => ({
    transform: `translate3d(0, ${distance}px, 0)`,
  }),
  [distance],
);
```

### 2.4. React 中 实现 watch

利用的是 `useEffect`，下面的代码没有实际使用，只做学习用。

利用 `useRef` 实现 `oldValue` 的缓存。

```ts
type Callback<T> = (prev?: T) => void;

function useWatch<T>(dep: T, callback: Callback<T>) {
  const prev = useRef<T>();

  useEffect(() => {
    callback(prev.current)
    prev.current = dep;
  }, [dep])
}
```

使用方法:

```ts
useWatch(xxx, (oldXxx) => {
  console.log(xxx);
  console.log(oldXxx);
});
```


`useEffect` 在组件初始化的时候就会执行，而 `watch` 默认不会。可以在内部增加标志位，实现 `immediate`。

```ts
function useWatch<T>(dep: T, callback: Callback<T>, { immediate = false}) {
  const prev = useRef<T>();
  const inited = useRef(false);

  useEffect(() => {
    const exec = () => callback(prev.current);

    if (inited.current) {
      // 非第一次
      exec()
    } else {
      if (immediate) {
        exec();
      }
    }

    inited.current = true;
    prev.current = dep;
  }, [dep])
}
```

要实现的 `stop` 的话，需要在内部再声明一个 `useRef` 变量，然后返回一个方法，其逻辑为 `stop.current = true`。`useWatch` 先判断 `stop.current`，如果为 `true`，则直接返回。





### 2.5. ReactDom.render


这个方法在 `ts` 和 `tsx` 中的类型是不同的，像下面的写法只能在 `tsx` 中写，否则会报错。

```tsx
ReactDOM.render(<Drawer {...drawerProps} /> , div);
```

如果使用了 `ts` 文件，报错内容是：

```
“Drawer”表示值，但在此处用作类型。是否指“类型 Drawer”
```


### 2.6. 函数式调用组件后改变属性

1. 用 `forwardRef` 将 `ref` 转发
2. 用 `useImperativeHandle` 指定暴露哪些方法
3. 组件内部不要直接使用 `props`，将其转化成内部变量再实用，方便 `plugin` 模式



```ts
const [state, setState] = useSetState<DrawerProps>({ isPlugin: false, ...props });
```

`useSetState` 可以将 `props` 转为 `state`。


```ts
/**
 * 管理 object 类型 state 的 Hooks，用法与 class 组件的 this.setState 基本一致。
 * @param initialState
 * @returns [state, setMergeState]
 */
const useSetState = <T extends object>(
  initialState: T = {} as T,
): [T, (patch: Partial<T> | ((prevState: T) => Partial<T>)) => void] => {
  const [state, setState] = useState<T>(initialState);

  const setMergeState = useCallback((patch) => {
    setState((prevState) => ({ ...prevState, ...(isFunction(patch) ? patch(prevState) : patch) }));
  }, []);

  return [state, setMergeState];
};

export default useSetState;
```

`useImperativeHandle` 的使用：

```ts
useImperativeHandle(ref, () => ({
  show() {
    setState({ visible: true });
  },
  hide() {
    setState({ visible: false });
  },
  destroy() {
    setState({ visible: false, destroyOnClose: true });
  },
  update(newOptions) {
    setState((prevState) => ({ ...prevState, ...newOptions }));
  },
}));
```

### 2.7. hooks 学习

#### 2.7.1. useDefaultProps

TDesign 中用来实现默认 `Props` 的 `hook`。

就是判断每一个 `prop` 是否为 `undefined`，如果是，则赋值为 `defaultProps` 的值。

```ts
import { useMemo } from 'react';

// defaultProps 将于 18.3.0 废弃，故需实现 hook 在组件内部兼容
// https://github.com/facebook/react/pull/16210
export default function useDefaultProps<T>(originalProps: T, defaultProps: Record<PropertyKey, any>): T {
  return useMemo<T>(() => {
    const props = Object.assign({}, originalProps);
    Object.keys(defaultProps).forEach((key) => {
      // https://github.com/facebook/react/blob/main/packages/react/src/jsx/ReactJSXElement.js#L719-L722
      if (props[key] === undefined) {
        props[key] = defaultProps[key];
      }
    });
    return props;
  }, [originalProps, defaultProps]);
}
```

#### 2.7.2. useDefault

受控模式和非受控模式的统一处理。

受控模式就是 `value` 不等于 `undefined`，将返回 `value` 和 `onChange`。

非受控模式就是 `value` 未定义，使用 `defaultValue`，更新的时候通同时执行 `setInternalValue`、`onChange`。

```ts
import { useState } from 'react';
import noop from './noop';

export interface ChangeHandler<T, P extends any[]> {
  (value: T, ...args: P);
}

export default function useDefault<T, P extends any[]>(
  value: T,
  defaultValue: T,
  onChange: ChangeHandler<T, P>,
): [T, ChangeHandler<T, P>] {
  // 无论是否受控，都要 useState，因为 Hooks 是无条件的
  const [internalValue, setInternalValue] = useState<T>(defaultValue);

  // 受控模式
  if (typeof value !== 'undefined') {
    return [value, onChange || noop];
  }

  // 非受控模式
  return [
    internalValue,
    (newValue, ...args) => {
      setInternalValue(newValue);
      if (typeof onChange === 'function') {
        onChange(newValue, ...args);
      }
    },
  ];
}
```

## 3. Web Components

OMI 是一个开发 WebComponents 的框架

### 3.1. Web Components

Web Components包括以下三个主要技术：

- Custom Elements：允许开发者创建自定义的HTML元素，并定义它们的行为。
- Shadow DOM：为自定义元素提供封装的DOM结构，使其与主文档隔离，避免样式和脚本的冲突。
- HTML Templates：提供一种创建HTML模板的方法，这些模板可以在运行时被克隆和填充，提高渲染性能。

比如不使用任何框架实现一个自定义元素：


```tsx
class MyElement extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const div = document.createElement('div');
    div.textContent = 'Hello, Shadow DOM!';
    shadowRoot.appendChild(div);
  }
}

customElements.define('my-element', MyElement);

```

在这个例子中，我们创建了一个自定义元素`my-element`，并在其内部创建了一个 Shadow DOM。当浏览器遇到`<my-element>`标签时，会自动创建一个MyElement实例，并将其附加到文档中。`<my-element>`是框架无关的，任何框架都可以使用该元素。


其中 OMI 框架使用了其中两种：Custom Elements 和 Shadow DOM，而 HTML Templates 则由编程体验更好 JSX 语法来代替来实现。

```ts
import { tag, Component, h } from 'omi'

@tag('my-element')
class MyElement extends Component {
  render() {
    return <div>Hello, Shadow DOM!</div>
  }
}
```

### 3.2. Constructable Stylesheets

Constructable Stylesheets 是 Web Components 的黄金搭档。在使用 Shadow DOM 时创建和分布可重复使用的样式的一种方式，既降低了尺寸，还能提高性能。

<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b6e82c801f440878fbd8ebe7c5a5a34~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=1874&h=1430&s=141304&e=png&b=fbf5f4" width="800" />

这个 API 主要包含以下几个部分：

- CSSStyleSheet 类：这个类代表一个样式表。
- adoptedStyleSheets 属性：这个属性存在于 Document 和 ShadowRoot 对象上。

我们可以通过 `new CSSStyleSheet()` 来创建一个新的样式表，然后通过 `sheet.replace(text)` 或者 `sheet.replaceSync(text)` 来设置样式表的内容。这里的 `text` 是一个包含 CSS 代码的字符串。

然后通过 `document.adoptedStyleSheets = [sheet1, sheet2, ...]` 或者 `shadowRoot.adoptedStyleSheets = [sheet1, sheet2, ...]` 来应用样式表。这里的 `sheet1, sheet2, ...` 是 CSSStyleSheet 对象。

使用 `Constructable Stylesheets`，我们可以在 JavaScript 中创建和管理样式表，然后在需要的地方动态地应用样式表。这样，我们就可以复用样式，而且只需要加载一次样式代码，从而提高性能。

例如，我们可以创建一个样式表，然后在多个 Shadow DOM 中应用这个样式表，这里举一个不使用 OMI 框架原生使用 Constructable Stylesheets 的例子:

```tsx
const sheet = new CSSStyleSheet();
sheet.replaceSync('p { color: red; }');

customElements.define('my-element', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
  }
  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet];
    this.shadowRoot.innerHTML = '<p>Hello, world!</p>';
  }
});
```

在这个例子中，我们创建了一个样式表 sheet，然后在 my-element 组件的 Shadow DOM 中应用了这个样式表。无论我们创建了多少个 my-element 组件，样式表的代码都只需要加载一次。


### 3.3. omi

#### 3.3.1. ?raw

vite 中可用这种方式加载字符串

#### 3.3.2. props

`render` 函数接收 `props`

`static defaultProps` 来设置默认值，使用 `static propTypes` 来设置类型:

也可以合并到 `static props` 一起定义

#### 3.3.3. css

```ts
static css = 'h1 { color: red }'
```

也可以是数组

```ts
static css = [style, 'h3 { color: red; }']
```

#### 3.3.4. 事件

和 React 一样

```tsx
class x {
  onClick = (evt) => {
    alert('Hello Omi!')
  }

  render() {
    return (
      <h1 onClick={this.onClick}></h1>
    )
  }
}
```

通过 `fire` 触发事件，对应 Vue 中的 `emit`

```ts
onClick = event => {
  this.fire('my-event', { name: 'yang' })
}

render() {
  return (
    <h1 onClick={this.onClick}></h1>
  )
}
```

外层使用者绑定事件，通过 event.detail 拿到参数

```tsx
<my-element onMyEvent={(event) => alert(event.detail.name)}></my-element>
```

或者通过 addEventListener

```ts
myElement.addEventListener('my-event', () => {})
```

#### 3.3.5. slot

`slot` 不能和 `static isLightDom = true` 同时使用，否则子元素样式失效，可以使用 `props.children`。

### 3.4. Ref

想在 JS 中获取元素

```ts
onClick = () => {
  console.log(this.myRef)
}

render() {
  return (
    <h1 ref={e => { this.myRef = e}}></h1>
  )
}
```

提前赋值


```ts
onClick = () => {
  console.log(this.myRef)
}

myRef = e => this.myRef = e;

render() {
  return (
    <h1 ref={this.myRef}></h1>
  )
}
```

createRef 方法

```ts
onClick = () => {
  console.log(this.myRef.current)
}

myRef = createRef()

render() {
  return (
    <h1 ref={this.myRef}></h1>
  )
}
```



#### 3.4.1. provide/inject

```ts
innerValue = signal([]);
provide = {
  name: 'yang',
  value: innerValue, // 不要传递 innerValue.value，会丢失响应式
}
```

```ts
inject = ['name']
render() {
  return (
    <h1>{this.injection.name}</h1>
  )
}
```


#### 3.4.2. 接口多继承

实现类型的时候会用到接口多继承，比如

```ts
export interface PopupProps extends TdPopupProps, StyledProps {
  expandAnimation?: boolean;
  updateScrollTop?: (content: HTMLElement) => void;
}
```

#### 3.4.3. computed 无法响应式更新

不要使用 computed，而是使用 get 方法，否则无法监听 props 的变化


```ts
// 正确的
get currentPos() {
  const { value, min, rangeDiff } = this.props;
  const result = `${(((value.value as number) - min) / rangeDiff) * 100}%`;
  return result;
}

// 错误的
currentPos = computed(() => {
  const { value, min, rangeDiff } = this.props;
  const result = `${(((value.value as number) - min) / rangeDiff) * 100}%`;
  return result;
});
```

### 3.5. 组件

tdesign-web-components 正用 omi 搭建。

#### 3.5.1. collapse

由 Collapse 和 CollapsePanel 两个组件构成，CollapsePanel 是前者的插槽内容。CollapsePanel 由 `header、body` 构成，`header` 由 `left/content/right` 构成。


动画用了 `omi-transition`，给它提了个[PR](https://github.com/Tencent/omi/pull/891)，加上了 `beforeEnter`, `enter` 等方法的 `dom` 参数。


`t-fake-arrow`，注意这个箭头的动画，不要加 `isActive` 的 `class`，容易造成动画旋转角度出问题。



#### 3.5.2. slider

先拆出 `slider-button`、`slider-mark`。

`slider` 中的刻度是 `slider-stops`，刻度和标记一一对应，也就是 `stops` 和 `mark` 内的元素都是 `markList` 循环而来。

有个 `slider-button` 不对齐的问题，原因是 `t-tooltip` 是 `shadow dom`，需要将其设置为 `height: 100%`。


#### 3.5.3. popup

内部使用了 `@popperjs/core`。


#### 3.5.4. dialog


##### 3.5.4.1. 闪烁问题

遇到一个问题，打开后先快速消失，然后出现。问题原因在于 `enter-from` 动画的时候，没有归位，加上以下代码后正常：

```scss
&__vue {
  &-enter-from {
    .@{prefix}-dialog {
      transform: scale(0);
      opacity: 0;
    }
    .@{prefix}-dialog__mask {
      opacity: 0;
    }
  }
}
```

##### 3.5.4.2. 点击处放大

Dialog 的动画效果是从鼠标点击的地方，进行放大、缩小，如何实现呢？

原理就是监听鼠标点击事件，拿到当前点击的位置，然后当弹窗展示的时候，改变弹窗的 `transformOrigin` 属性。

获取鼠标位置：

```ts
let mousePosition: { x: number; y: number } | null;
const getClickPosition = (e: MouseEvent) => {
  mousePosition = {
    x: e.clientX,
    y: e.clientY,
  };
  setTimeout(() => {
    mousePosition = null;
  }, 100);
};

if (typeof window !== 'undefined' && window.document && window.document.documentElement) {
  document.documentElement.addEventListener('click', getClickPosition, true);
}
```

改变弹窗的 `style.transformOrigin` ：

```ts
@bind
beforeEnter() {
  const target = this.dialogRef.current as HTMLElement;
  if (!target || !mousePosition) {
    return
  }
  target.style.transformOrigin = `${mousePosition.x - target.offsetLeft}px ${
    mousePosition.y - target.offsetTop
  }px`;
}
```

参考：

1. https://juejin.cn/post/7298248624701358090
2. https://juejin.cn/post/6844904078653276167
3. https://www.jianshu.com/p/32f786f25cb2



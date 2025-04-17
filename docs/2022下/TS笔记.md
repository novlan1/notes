
## 1. TS是否会增加工作量


下面引用某个回答：

>TS 是 JS 的超集。用 TS 开发相比于 JS，增加了多少工作量完全是可选的。你完全可以配置一份很宽松的 `tsconfig.json`，使得 TS 开发不会增加工作量。当然此时从类型系统中获得的收益也就变少了。

>而且即使你不用 TS 开发，也已经享受到了 TS 社区的贡献了——在你编写 JS 时的语法提示全是 `d.ts` 的功劳。

使用 typescript，个人觉得有三点好处：

1. 提高效率，主要是类型提示的功劳
2. 开发时少犯错误，比如不会传错参数
3. 改动时能及时发现错误，比如改动了一个类型，编译时可发现与之关联的其他地方的问题

上面第2点是强调的是“写”代码，第3点强调的是“改”代码，包括改自己的代码和改别人的代码。

写代码一般只占20%的时间，80%的时间是在迭代和维护。改代码的时候经常担心改动一处，引起其他地方的异常，牵一发而动全身。typescript 可以在编译阶段及时发现这种错误，让错误及早暴露，减少线上错误。

比如，个人在用 typescript 改写基础库时发现了以下问题。

### 1.1. 引用路径问题


```ts
// network/post/request-hippy.ts 这个文件之前是：
import { showToast } from 'src/common/widget/toast';

// 实际应该为：
import Toast from 'src/common/widget/toast';
const { showToast } = Toast;
```

即使你在 TS 文件中全是用的 `any`，这种路径问题也可以发现，但换成 JS 文件就不可以。

这种路径错误提示，以及类型提示，可以让我们大胆的对项目进行重构，提升改代码的信心。

### 1.2. 未判空

```ts
jumpToPage(url) {
  if (window.app.env.isLolApp) {
  } else if (self != top) {
    // top对象可能为 "null"，需要写的更严谨
    top.location.href = url;
  } else {}
}

// 改为：
jumpToPage(url) {
  if (window.app.env.isLolApp) {
  } else if (self != top && top) {
    top.location.href = url;
  } else {}
}
```

### 1.3. 参数问题

发现参数类型问题：

```ts
closeIFrame() {
  // sessionStorage.setItem的第二个参数应是字符串类型
  window.sessionStorage.setItem('tip_is_act_pop_closed', true);
}

// 改为：
closeIFrame() {
  // sessionStorage.setItem的第二个参数应是字符串类型
  window.sessionStorage.setItem('tip_is_act_pop_closed', 'true');
}
```

还可以及时发现废弃属性，修改有问题的代码。避免改动一处代码，却漏了与之关联的地方。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/5/own_mike_1e84a1843ce1524907.png" width="500">


## 2. 在js文件中进行ts检查

项目的`config.js`在`webpack`编译时也需要，所以暂时不能改成 `ts`，如何让它接受`ts`类型约束，增加代码健壮性，以及避免无序扩张呢？

`ts` 中的 `@ts-check` 可以在 `js` 文件中进行类型检查，并且是以注释形式，非侵入式，可以安全的在 `js` 项目中使用。

首先，需要在 `js` 文件头部加上 `// @ts-check`。

这样定义对象类型：

```js
/**
 * @typedef {Object} SpecialType - creates a new type named 'SpecialType'
 * @property {string} prop1 - a string property of SpecialType
 * @property {number} prop2 - a number property of SpecialType
 * @property {number=} prop3 - an optional number property of SpecialType
 * @prop {number} [prop4] - an optional number property of SpecialType
 * @prop {number} [prop5=42] - an optional number property of SpecialType with default
 */

/** @type {SpecialType} */
const specialTypeObject = {};
specialTypeObject.prop3 = 2;
```


也可以使用导入类型从其他文件导入声明：


```js
// @filename: types.d.ts
export type Pet = {
  name: string,
};

// @filename: main.js
/**
 * @param {import("./types").Pet} p
 */
function walk(p) {
  console.log(`Walking ${p.name}...`);
}
```

导入类型可以在类型别名声明中使用：

```js
/**
 * @typedef {import("../../common/types/config").ConfigType} ConfigType
 */


/**
 * @type {ConfigType}
 */
const config = {
  // ...
};
```

参考：

- https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html
- https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#type




下面讲一下 TS 基本的使用。

## 3. interface VS type

### 3.1. 相同点

#### 3.1.1. 都可以描述一个对象或者函数

```ts
// interface
interface User {
  name: string
  age: number
}

interface SetUser {
  (name: string, age: number): void;
}


// type
type User = {
  name: string
  age: number
};

type SetUser = (name: string, age: number)=> void;
```

#### 3.1.2. 都允许拓展（extends）

`interface` 和 `type` 都可以拓展，并且两者并不是相互独立的，也就是说 `interface` 可以 `extends type`, `type` 也可以 `extends interface`。 虽然效果差不多，但是两者语法不同。

```ts
// interface extends interface
interface Name {
  name: string;
}
interface User extends Name {
  age: number;
}


// type extends type
type Name = {
  name: string;
}
type User = Name & { age: number  };


// interface extends type
type Name = {
  name: string;
}
interface User extends Name {
  age: number;
}


// type extends interface
interface Name {
  name: string;
}
type User = Name & {
  age: number;
}
```


### 3.2. 不同点

#### 3.2.1. type 可以而 interface 不行

`type` 可以声明基本类型别名，联合类型，元组等类型

```ts
// 基本类型别名
type Name = string

// 联合类型
interface Dog {
    wong();
}
interface Cat {
    miao();
}

type Pet = Dog | Cat

// 具体定义数组每个位置的类型
type PetList = [Dog, Pet]
```


`type` 语句中还可以使用 `typeof` 获取实例的 类型进行赋值

```ts
// 当你想获取一个变量的类型时，使用 typeof
let div = document.createElement('div');
type B = typeof div
```

其他骚操作

```ts
type StringOrNumber = string | number;
type Text = string | { text: string };
type NameLookup = Dictionary<string, Person>;
type Callback<T> = (data: T) => void;
type Pair<T> = [T, T];
type Coordinates = Pair<number>;
type Tree<T> = T | { left: Tree<T>, right: Tree<T> };
```

#### 3.2.2. interface 可以而 type 不行

`interface` 能够声明合并

```ts
interface User {
  name: string
  age: number
}

interface User {
  sex: string
}

/*
User 接口为 {
  name: string
  age: number
  sex: string
}
*/
```



总结下，主要有两点区别：
- `interface` 右边只能是 `data shapes`,而 `type` 右边涵盖的范围更大，还可以是联合类型（`A |Ｂ`） 、基本类型、交叉类型（`Ａ＆B`）、元组等，也可以使用 `typeof` 、`keyof`。
- `interface` 支持声明合并，`type` 不支持声明合并。



## 4. 联合类型、交叉类型

### 4.1. 联合类型 Union types

联合类型表示取值可以为多种类型中的一种，使用 `|` 分割每个类型。

```ts
let a: number | string | boolean;
a = 100;
a = 'young';
a = true;


// 函数中使用：
const test = (info: string | number) => {
  // ...
}
```


约束取值

```ts
const num: 1 | 2 = 1;
type isMan = true | false;
type EventNames = 'click' | 'scroll' | 'mousemove';
```

以上`1 | 2`, `true | false`, `'click' | 'scroll' | 'mousemove'`被称为字面量类型，分别为数字、布尔、字符串字面量类型，可以用来约束取值只能是其中几个值中的一个。


### 4.2. 交叉类型 Intersection types

交叉类型是将多个类型合并为一个类型，使用 `&` 定义交叉类型。

可以将多个接口类型合并成一个类型，实现等同于接口继承的效果

```ts
interface A {
  name: string;
  age: number;
}

interface B {
  name: string;
  height: string;
}

type Person =  A & B;  // 相当于求并集
let person: Person = { name: 'json', age: 18, height: '66'};
```

注意：

- 原子类型可以合并吗？
如果仅仅把基本类型、字面量类型、函数类型等原子类型合并成交叉类型，是没有任何用处的。因为任何类型都不能满足同时属于多种原子类型。

```ts
type Useless = string & number;  // 就是个never
```

- 合并的接口类型存在同名属性是什么效果？
如果同名属性的类型兼容，比如一个是`number`，另一个是`number`的子类型、数字字面量类型，合并后属性的类型就是两者中的子类型。

```ts
interface A {
  name: string;
  age: number;
  id: number;
}

interface B {
  name: string;
  height: string;
  id: string;
}

type Person =  A & B;
let person: Person = { name: 'xman', age: 18, height: '60kg', id: 1};
// 不能将类型“number”分配给类型“never”
```

以上代码提示 `id` 属性值出现类型错误。

```ts
interface A {
  name: string;
  age: number;
  id: number;
}


interface B {
  name: string;
  height: string;
  id: 1;  // 数字字面量类型为1
}

type Person =  A & B;
let person: Person = { name: 'xman', age: 18, height: '60kg', id: 1};
```

以上代码中`interface B`的`name`属性的类型就是数字字面量类型1，因此我们不能把任何非1之外的值赋值为`id`属性；

下面看下同名属性非基本数据类型的合并情况：

```ts
interface A {
  info: {
    name: string
  }
}

interface B {
  info: {
    age: number
  }
}

interface C {
  info: {
    bool: boolean
  }
}

type ABC = A & B & C;
let abc: ABC = {
  info: {
    name: 'xman',
    age: 18,
    bool: true
  }
}


// 编译成功，结果如下：
var abc = {
  info: {
    name: 'xman',
    age: 18,
    bool: true
  }
};
```

## 5. 运算符

### 5.1. 非空断言运算符 !

这个运算符可以用在变量名或者函数名之后，用来强调对应的元素是非 `null | undefined` 的

```ts
function onClick(callback?: () => void) {
  callback!();		// 参数是可选入参，加了这个感叹号!之后，TS编译不报错
}
```

你可以查看编译后的 ES5 代码，居然没有做任何防空判断。

```ts
function onClick(callback) {
  callback();
}
```

这个符号的场景，特别适用于我们已经明确知道不会返回空值的场景，从而减少冗余的代码判断，如 `React` 的 `Ref`。

```ts
function Demo(): JSX.Elememt {
  const divRef = useRef<HTMLDivElement>();
  useEffect(() => {
    divRef.current!.scrollIntoView();	 // 当组件Mount后才会触发useEffect，故current一定是有值的
  }, []);
  return <div ref={divRef}>Demo</div>
}
```

### 5.2. 空值合并运算符 ??、可选链操作符 ?.

这两个比较简单，JS中也有。


## 6. 操作符


### 6.1. 获取类型的键 keyof

`keyof` 可以获取一个类型所有键值，返回一个联合类型，如下：

```ts
type Person = {
  name: string;
  age: number;
}
type PersonKey = keyof Person;  // PersonKey得到的类型为 'name' | 'age'
```

`keyof` 的一个典型用途是限制访问对象的 `key` 合法化，因为 `any` 做索引是不被接受的。

```ts
function getValue (p: Person, k: keyof Person) {
  return p[k];  // 如果k不如此定义，则无法以p[k]的代码格式通过编译
}
```

总结起来 keyof 的语法格式如下：

```ts
类型 = keyof 类型
```


### 6.2. 获取实例的类型 typeof

`typeof` 是获取一个对象/实例的类型，如下：

```ts
const me: Person = { name: 'json', age: 16 };
type P = typeof me;  // { name: string, age: number | undefined }
const you: typeof me = { name: 'java', age: 69 }  // 可以通过编译
```


`typeof` 只能用在具体的对象上，这与 `js` 中的 `typeof` 是一致的，并且它会根据左侧值自动决定应该执行哪种行为。

```ts
const typestr = typeof me;   // typestr的值为"object"
```

`typeof` 可以和 `keyof` 一起使用(因为 `typeof` 是返回一个类型)，如下：

```ts
type PersonKey = keyof typeof me;   // 'name' | 'age'
```

总结起来 `typeof` 的语法格式如下：

```ts
类型 = typeof 实例对象
```

### 6.3. 遍历属性 in

`in` 只能用在类型的定义中，可以对枚举类型进行遍历，如下：

```ts
// 这个类型可以将任何类型的键值转化成number类型
type TypeToNumber<T> = {
  [key in keyof T]: number
}
```

比如：

```ts
const obj: TypeToNumber<Person> = { name: 10, age: 10 }
```



## 7. 泛型推断 infer

`infer` 的中文是“推断”的意思，一般是搭配上面的泛型条件语句使用的，所谓推断，**就是你不用预先指定在泛型列表中，在运行时会自动判断**，不过你得先预定义好整体的结构。举个例子

```ts
type Foo<T> = T extends { t: infer Test } ? Test: string
```

首选看 `extends` 后面的内容，`{ t: infer Test }` 可以看成是一个包含t属性的类型定义，这个 `t` 属性的 `value` 类型通过 `infer` 进行推断后会赋值给 `Test` 类型，如果泛型实际参数符合 `{ t: infer Test }` 的定义那么返回的就是 `Test` 类型，否则默认给缺省的 `string` 类型。

举个例子加深下理解：

```ts
type One = Foo<number>  // string，因为number不是一个包含t的对象类型
type Two = Foo<{t: boolean}>  // boolean，因为泛型参数匹配上了，使用了infer对应的type
type Three = Foo<{a: number, t: () => void}> // () => void，泛型定义是参数的子集，同样适配
```

`infer` 用来`对满足的泛型类型进行子类型的抽取`，有很多高级的泛型工具也巧妙的使用了这个方法。


## 8. 枚举

ts 中枚举既是值，又是类型。

### 8.1. 基本使用

基本使用如下：

```ts
enum Direction {
  Up,
  Down,
  Left,
  Right
}

console.log(Direction.Up)        // 0
console.log(Direction.Down)      // 1
console.log(Direction.Left)      // 2
console.log(Direction.Right)     // 3

console.log(Direction[0])      // Up
console.log(Direction[1])      // Down
console.log(Direction[2])      // Left
console.log(Direction[3])      // Right
```

数字从0开始递增，并且可以**反向映射**。

也可以**手动赋值**：

```ts
// 这样就从1开始递增了
enum ItemStatus {
    Buy = 1,
    Send,
    Receive
}

console.log(ItemStatus['Buy'])      // 1
console.log(ItemStatus['Send'])     // 2
console.log(ItemStatus['Receive'])  // 3
```

还可以使用**字符串枚举**

```ts
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const value = 'UP'
if (value === Direction.Up) {
  // do something
}
```

### 8.2. 常量枚举

```ts
const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const value = 'UP'
if (value === Direction.Up) {
    // do something
}
```

编译后会去掉枚举的对象，上面会编译为：

```ts
const value = 'UP';
if (value === 'UP' /* Up */) {
    // do something
}
```
并且不可以使用以下语法：

```ts
Object.values(Direction)
```


### 8.3. 用对象模拟枚举

```ts
const ColorEnum = {
  Green: 'GreenValue',
  /** 蓝色 */
  Blue: 'BlueValue',
  /** 红色 */
  Red: 'RedValue',
} as const

// 轻松抽取key
type ColorEnumKeys = keyof typeof ColorEnum
// "Green" | "Blue" | "Red"

// 轻松抽取value
type ColorEnumValues = (typeof ColorEnum)[keyof typeof ColorEnum]
// "GreenValue" | "BlueValue" | "RedValue"
```

### 8.4. 反向映射原理

直接看编译后的代码：

```ts
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 6] = "Up";
    Direction[Direction["Down"] = 7] = "Down";
    Direction[Direction["Left"] = 8] = "Left";
    Direction[Direction["Right"] = 9] = "Right";
})(Direction || (Direction = {}));
```

比如上面的例子，`Direction`的一个枚举项对应了两个属性：`Direction['Up'] = 6， Direction[6] = 'Up'`


参考：

- https://juejin.cn/post/7205875448567808059
- https://juejin.cn/post/7066203227758755871

## 9. extends

`extends` 在TS中有下面几种用途：

- 表示继承/拓展
- 泛型约束
- 分配

### 9.1. 继承

```ts
class Animal {
  kind = 'animal'
  constructor(kind){
    this.kind = kind;
  }
  sayHello(){
    console.log(`Hello, I am a ${this.kind}!`);
  }
}

class Dog extends Animal {
  constructor(kind){
    super(kind)
  }
  bark(){
    console.log('wang wang')
  }
}

const dog = new Dog('dog');
dog.name; //  => 'dog'
dog.sayHello(); // => Hello, I am a dog!
```

在 `ts` 里，`extends` 除了可以像 `js` 继承值，还可以继承/扩展类型：


```ts
 interface Animal {
   kind: string;
 }

 interface Dog extends Animal {
   bark(): void;
 }
 // Dog => { name: string; bark(): void }
 ```

### 9.2. 泛型约束

在书写泛型的时候，我们往往需要对类型参数作一定的限制，比如希望传入的参数都有 `name` 属性的数组我们可以这么写：

```ts
function getCNames<T extends { name: string }>(entities: T[]):string[] {
  return entities.map(entity => entity.name)
}
```

`T` 泛型做参数类型，一般都是加`extends`限制下参数的，不然想传啥就传啥，不就等于`any`了。

函数，元组，对象，`extends {}` 都是 `true`。


### 9.3. 条件类型与高阶类型


`extends` 还有一大用途就是用来判断一个类型是不是可以分配给另一个类型，这在写高级类型的时候非常有用



```ts
T extends U ? X : Y
```

其实可以和父子类型关联起来，如果 T 是 U 的子类型，那么结果为 X，否则结果为 Y


举个例子：

```ts
type Human = {
  name: string;
  occupation: string;
}
type Duck = {
  name: string;
}
type Bool = Duck extends Human ? 'yes' : 'no'; // Bool => 'no'
type Bool2 = Human extends Duck ? 'yes' : 'no'; // Bool2 => 'yes'
```


当 T 是联合类型时，叫做分布式条件类型（`Distributive conditional types`）。

也就是说当 T 为 `"A" | "B"` 时， 会拆分成 `("A" extends U ? X : Y) | ("B" extends U ? X : Y)`


举个例子：

```ts
type Diff<T, U> = T extends U ? never : T;

let demo: Diff<"a" | "b" | "d", "d" | "f">;
// result: "a" | "b"
```


- `"a"` 不是 `"d" | "f"` 的子集，取 `"a"`
- `"b"` 不是 `"d" | "f"` 的子集，取` "b"`
- `"d"` 是 `"d" | "f"` 的子集，取 `never`

最后得出结果 `"a" | "b"`


## 10. 内置别名

### 10.1. Partial/Required/Readonly

- `Partial<Type>` – 所有属性变成可选
- `Required<Type>` – 所有属性变成必选
- `Readonly<Type>` – 所有属性变成只读

下面定义中的 P 可以当成 `Property`，T 可以当成 `Type`，K 可以当成 `Key`。


```ts
/**
 * Make all properties in T optional
 */
type Partial<T> = {
    [P in keyof T]?: T[P];
};

/**
 * Make all properties in T required
 */
type Required<T> = {
    [P in keyof T]-?: T[P];
};

/**
 * Make all properties in T readonly
 */
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
```

### 10.2. Pick/Omit

`Pick` 和 `Omit` 分别是删除和保留 `Map` 的一部分。


- `Pick<Type, Keys>` 从`Type`中挑出一些`Keys`
- `Omit<Type, Keys>` 从`Type`中排除一些`Keys`


```ts
/**
 * From T, pick a set of properties whose keys are in the union K
 */
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

/**
 * Construct a type with the properties of T except for those in type K.
 */
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```


`Omit` 如果不用 `Pick`、`Exclude` 来实现:


```ts
type MyOmit<T, K extends keyof T> = {
 [P in keyof T as P extends K ? never : P]: T[P]
}
```

`Pick` 举例：

```ts
type Animal = {
  name: string,
  category: string,
  age: number,
  eat: () => number
}

const bird: Pick<Animal, "name" | "age"> = { name: 'bird', age: 1 }
```


`Omit` 与 `Pick` 得到的结果完全相反，一个是取非结果，一个取交结果。

`Omit` 在定义中，第一步先从 T 的 `key` 中去掉与 K 重叠的 `key`，接着使用 `Pick` 把 T 类型和剩余的 `key` 组合起来即可。

`Omit` 举例：


```ts
const OmitAnimal:Omit<Animal, 'name'|'age'> = {
  category: 'lion',
  eat: () => { console.log('eat') }
}
```

`vue` 源码中使用 Pick 举例：

```ts
type InferPropType<T> = [T] extends [null]
  ? any // null & true would fail to infer
  : [T] extends [{ type: null | true }]
  ? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
  : [T] extends [ObjectConstructor | { type: ObjectConstructor }]
  ? Record<string, any>
  : [T] extends [BooleanConstructor | { type: BooleanConstructor }]
  ? boolean
  : [T] extends [DateConstructor | { type: DateConstructor }]
  ? Date
  : [T] extends [(infer U)[] | { type: (infer U)[] }]
  ? U extends DateConstructor
    ? Date | InferPropType<U>
    : InferPropType<U>
  : [T] extends [Prop<infer V, infer D>]
  ? unknown extends V
    ? IfAny<V, V, D>
    : V
  : T

export type ExtractPropTypes<O> = {
  [K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>
} & {
  [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>
}
```

`ExtractPropTypes` 可以获取`prop`类型，这里要分开 `RequiredKeys` 和 `OptionalKeys`，是为了获取 `?` 符号，也就是是否可选。

文档地址[在这里](https://vuejs.org/api/utility-types.html#extractproptypes)，使用举例：

```ts
const propsOptions = {
  foo: String,
  bar: Boolean,
  baz: {
    type: Number,
    required: true
  },
  qux: {
    type: Number,
    default: 1
  }
} as const

type Props = ExtractPropTypes<typeof propsOptions>
// {
//   foo?: string,
//   bar: boolean,
//   baz: number,
//   qux: number
// }
```


### 10.3. Extract/Exclude

- `Extract<Type, Union>` 从联合类型 `Type` 中挑出 `Union` 的子类型
- `Exclude<Type, ExcludedUnion>` 从联合类型 `Type` 中排除 `Union` 的子类型

`Extract` 和 `Exclude` 分别是保留和删除 `Set` 的一部分。

```ts
/**
 * Exclude from T those types that are assignable to U
 */
type Exclude<T, U> = T extends U ? never : T;

/**
 * Extract from T those types that are assignable to U
 */
type Extract<T, U> = T extends U ? T : never;
```

举例：

```ts
type T1 = Exclude<"a" | "b" | "c", "a" | "b">;   // "c"
type T2 = Exclude<string | number | (() => void), Function>; // string | number
```

```ts
type T1 = Extract<"a" | "b" | "c", "a" | "b">;   // "a"|"b"
type T2 = Extract<string | number | (() => void), Function>; // () => void
```


`vue` 源码中 `OptionalKeys` 的定义就使用了 `Exclude`，上面 `ExtractPropTypes` 用到了 `RequiredKeys` 和 `OptionalKeys`。

```ts
type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends
    | { required: true }
    | { default: any }
    | BooleanConstructor
    | { type: BooleanConstructor }
    ? K
    : never
}[keyof T]

type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>
```



### 10.4. Record


- `Record<key type, value type>`

作用: 定义一个对象的 `key` 和 `value` 类型


```ts
/**
 * Construct a type with a set of properties K of type T
 */
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```


举例：

```ts
const obj: Record<string, string> = {
  'name': 'LiLei',
  'tag': '打工人'
}
```

另一个例子：

```ts
type Page = 'home' | 'about' | 'contract';

interface PageInfo  {
  title: string
}

export const nav: Record<Page, PageInfo> = {
  about: { title: '' },
  home: { title: '' },
  contract: { title: '' },
};
```

特殊情况：

- `Record<string, never>` 空对象

- `Record<string, unknown>` 任意对象



`vue` 源码中用到 `Record` 的地方就多了，比如下面这个 `emptyObject` 的定义：

```ts
export const emptyObject: Record<string, any> = Object.freeze({})
```


这个 `emptyObject` 会在很多地方作为默认对象，比如：

```ts
const attrs = parentVnode.data.attrs || emptyObject
if (vm._attrsProxy) {
  if (
    syncSetupProxy(
      vm._attrsProxy,
      attrs,
      (prevVNode.data && prevVNode.data.attrs) || emptyObject,
      vm,
      '$attrs'
    )
  ) {
    needsForceUpdate = true
  }
}
listeners = listeners || emptyObject
```


### 10.5. NonNullable


- `NonNullable<Type>` - 排除空值


```ts
/**
 * Exclude null and undefined from T
 */
type NonNullable<T> = T extends null | undefined ? never : T;
```

举例：

```ts
type T0 = NonNullable<string | number | null>;
// string | number


type T1 = NonNullable<string[] | null | undefined>;
// string[]
```

`vue` 源码中使用 `NonNullable` 的地方有 `isDef` 的定义：

```ts
export function isDef<T>(v: T): v is NonNullable<T> {
  return v !== undefined && v !== null
}
```

上面的 `v is NonNullable<T>` 会收窄 `v` 的类型为非空类型，方便后面使用。

类型谓词 `is` 是实现类型保护的方式之一，可以参考：

- https://segmentfault.com/a/1190000022052209
- https://www.jianshu.com/p/af2ab3bac90d


### 10.6. ReturnType/InstanceType

- `ReturnType<Type>` 推断返回类型
- `InstanceType<Type>` 推断构造函数返回类型


```ts
/**
 * Obtain the return type of a function type
 */
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

/**
 * Obtain the return type of a constructor function type
 */
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;
```

`ReturnType` 可以稍微简化成下面的样子：

```ts
type ReturnType<T extends func> = T extends () => infer R ? R: any;
```

举例：

```ts
function foo(x: string | number): string | number { /*..*/ }

type FooType = ReturnType<foo>;  // string | number
```

`vue` 源码中 `VueConstructor` 的 `util.warn` 类型就是用了 `InstanceType`：

```ts
export interface VueConstructor<V extends Vue = Vue> {
  // ...
  util: {
    warn(msg: string, vm?: InstanceType<VueConstructor>): void
  }
}
```



### 10.7. Parameters/ConstructorParameters

- `Parameters<Type>` 推导函数参数
- `ConstructorParameters<Type>` 推导构造函数参数

```ts
/**
 * Obtain the parameters of a function type in a tuple
 */
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Obtain the parameters of a constructor function type in a tuple
 */
type ConstructorParameters<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer P) => any ? P : never;
```

举例：

```ts
type T1 = ConstructorParameters<ErrorConstructor>;
// [message?: string | undefined, options?: ErrorOptions | undefined]

type T2 = ConstructorParameters<FunctionConstructor>;
// string[]

type T3 = ConstructorParameters<RegExpConstructor>;
// [pattern: string | RegExp, flags?: string | undefined]

type T4 = ConstructorParameters<any>;
// unknown[]
```



## 11. unknown

TypeScript 3.0 引入了新的 `unknown` 类型，它是 `any` 类型对应的安全类型。

`unknown` 和 `any` 的主要区别是 `unknown` 类型会更加严格：在对 `unknown` 类型的值执行大多数操作之前，我们必须进行某种形式的检查。而在对 `any` 类型的值执行操作之前，我们不必进行任何检查。


在 TypeScript 中，任何类型都可以被归为 `any` 类型。这让 `any` 类型成为了类型系统的 顶级类型 (也被称作 **全局超级类型**)。


就像所有类型都可以被归为 `any`，所有类型也都可以被归为 `unknown`。这使得 `unknown` 成为 TypeScript 类型系统的另一种顶级类型（另一种是 `any`）。


任何类型都能赋值为 `unknown`：

```ts
let value: unknown;

value = true;             // OK
value = 42;               // OK
value = "Hello World";    // OK
value = [];               // OK
value = {};               // OK
value = Math.random;      // OK
value = null;             // OK
value = undefined;        // OK
value = new TypeError();  // OK
value = Symbol("type");   // OK
```

对 value 变量的所有赋值都被认为是类型正确的。

当我们尝试将类型为 unknown 的值赋值给其他类型的变量时会发生什么？

```ts
let value: unknown;

let value1: unknown = value;   // OK
let value2: any = value;       // OK
let value3: boolean = value;   // Error
let value4: number = value;    // Error
let value5: string = value;    // Error
let value6: object = value;    // Error
let value7: any[] = value;     // Error
let value8: Function = value;  // Error

value.foo.bar;  // Error
value.trim();   // Error
value();        // Error
new value();    // Error
value[0][1];    // Error
```

`unknown` 类型只能被赋值给 `any` 类型和 `unknown` 类型本身。直观的说，这是有道理的：只有能够保存任意类型值的容器才能保存 `unknown` 类型的值。毕竟我们不知道变量 `value` 中存储了什么类型的值。

TypeScript 不允许我们对类型为 `unknown` 的值执行任意操作。相反，我们必须首先执行某种类型检查以缩小我们正在使用的值的类型范围，比如 `typeof` 运算符，`instanceof` 运算符，或者类型断言。


### 11.1. 联合类型中的 unknown 类型

在联合类型中，`unknown` 类型会吸收任何类型。这就意味着如果任一组成类型是 `unknown`，联合类型也会相当于 `unknown`：

```ts
type UnionType1 = unknown | null;       // unknown
type UnionType2 = unknown | undefined;  // unknown
type UnionType3 = unknown | string;     // unknown
type UnionType4 = unknown | number[];   // unknown
```

这条规则的一个意外是 any 类型。如果至少一种组成类型是 any，联合类型会相当于 any：

```ts
type UnionType5 = unknown | any;  // any
```

所以为什么 `unknown` 可以吸收任何类型（`any` 类型除外）？让我们来想想 `unknown | string` 这个例子。这个类型可以表示任何 `unknown` 类型或者 `string` 类型的值。就像我们之前了解到的，所有类型的值都可以被定义为 `unknown` 类型，其中也包括了所有的 string 类型，因此，`unknown | string` 就是表示和 `unknown` 类型本身相同的值集。因此，编译器可以将联合类型简化为 `unknown` 类型。

### 11.2. 交叉类型中的 unknown 类型

在交叉类型中，任何类型都可以吸收 `unknown` 类型。这意味着将任何类型与 `unknown` 相交不会改变结果类型：

```ts
type IntersectionType1 = unknown & null;       // null
type IntersectionType2 = unknown & undefined;  // undefined
type IntersectionType3 = unknown & string;     // string
type IntersectionType4 = unknown & number[];   // number[]
type IntersectionType5 = unknown & any;        // any
```

让我们回顾一下 `IntersectionType3：unknown & string` 类型表示所有可以被同时赋值给 unknown 和 string 类型的值。由于每种类型都可以赋值给 unknown 类型，所以在交叉类型中包含 unknown 不会改变结果。我们将只剩下 string 类型。


### 11.3. unknown 可以使用的运算符

`unknown` 类型的值不能用作大多数运算符的操作数。这是因为如果我们不知道我们正在使用的值的类型，大多数运算符不太可能产生有意义的结果。

你可以在类型为 `unknown` 的值上使用的运算符只有四个相等和不等运算符：

- ===
- ==
- !==
- !=

```ts
function fn(x: unknown) {
  x === 5;
  x == 5;
  x !== 10;
  x != 10;
  x >= 0; // Error
  x + 1; // Error
  x * 2; // Error
  -x; // Error
  +x; // Error
}
```

如果要对类型为 `unknown` 的值使用任何其他运算符，则必须先指定类型（或使用类型断言强制编译器信任你）。


### 11.4. 实际例子

`vue` 源码中 `unknown` 使用地方很多，比如 `isRef`：

```ts
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
  dep?: Dep
  [RefFlag]: true
}
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && (r as Ref).__v_isRef === true)
}
```

这里还用到了重载和类型谓词`is`，`isDef` 返回值是一个类型判定 (`type predicate`)，这意味着 `isRef` 可以被用作类型守卫：


```ts
let foo: unknown
if (isRef(foo)) {
  // foo 的类型被收窄为了 Ref<unknown>
  foo.value
}
```

## 12. never

`typescript` 的 `never` 类型代表永不存在的值的类型，它只能被赋值为 `never`。

`never` 属于 `Bottom type`，与 `any`、`unknown` 相对。



### 12.1. 与 void 的区别


在 TS 中 `void` 至少包含了以下几个子类型：

- undefined
- null

例如下面的实例：

```ts
// strictNullChecks = false 时
const v: void // 等同于 undefined | null

// strictNullChecks = true 时
const v: void // 等同于 undefined
```

### 12.2. 完全无返回值

而 `never` 是完全没有返回值的类型，只有一种情况会如此：代码阻断。

那么当执行 `throw new Error`、`return process.exit(1)`、`while(true){}` 时都满足此条件：


```ts
function error(message: string): never {
    throw new Error(message);
}
```

如果函数的返回值类型是 never 意味的此函数必须不能被顺利完整执行，而发生中断行为。



### 12.3. 所有类型的子类型

`never` 是所有类型的子类型，因此可以理解为：所有的函数的返回值都包含 `never` 类型：

```ts
function fun(s: string): number {
  if (s == 'a') return 1;
  if (s == 'b') return 2;
  throw new Error;
}
// 等同于 fun(s: string): number | never
```

只要不是单独申明为 `never` 类型，都会被隐藏起来，因此下面的声明中也会忽略 `never`：

```ts
type Temp = 1 | 'a' | never
// 得到
// type Temp = 1 | 'a'

Type ne = never
// 得到
// type ne = never
```


### 12.4. 联合类型与交叉类型


由于 `never` 是任何类型的子类型，任意类型与 `never` 联合不受影响：

```ts
type T1 = number | never;   // number
type T2 = string | never;   // string
```

任意类型与 `never` 交叉都得到 `never`：

```ts
type T1 = number & never;   // never
type T2 = string & never;   // never
```


### 12.5. 判断 isNever

```ts
// a is true
type a = never extends never ? true : false;

// b is never
type isNever<T> = T extends never ? true : false
type b = isNever<never>
```


因为 `never` 是一个特殊的联合类型，它没有任何一个成员，而根据 [Distributive Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)，联合类型作为泛型传入后，会分开计算和合起来，例如：

```ts
// c = isNever<string> | isNever<number>
type c = isNever<string | number>
```

因此当输入 `never` 时，因为他一个成员都没有，自然也不需要计算了，直接返回 `never`。

不想使用 `Distributive Conditional Types` 时，可以在泛型前后加上括号即可:


```ts
type ToArrayNonDist<Type> = [Type] extends [any] ? Type[] : never;

// 'StrArrOrNumArr' is no longer a union.
// type StrArrOrNumArr = (string | number)[]
type StrArrOrNumArr = ToArrayNonDist<string | number>;
```

判断 `IsNever`:

```ts
type IsNever<T> = [T] extends [never] ? true : false;
```


## 13. 逆变、协变、双向协变、不变


关于协变、逆变、父子类型，这里有篇很好的[文章](https://juejin.cn/post/7019565189624250404)。

将基础类型叫做`T`，复合类型叫做`Comp<T>`：

- 协变 (Covariant)：表示`Comp<T>`类型兼容和T的一致，允许子类型转换为父类型。
- 逆变 (Contravariant)：表示`Comp<T>`类型兼容和T相反。允许父类型转换为子类型。
- 双向协变 (Bivariant)：表示`Comp<T>`类型双向兼容。
- 不变 (Invariant)：表示`Comp<T>`双向都不兼容。

### 13.1. 父子类型

- 在类型系统中，属性更多的类型是子类型。
- 在集合论中，属性更少的集合是子集。
- 父类型比子类型更宽泛，涵盖的范围更广，而子类型比父类型更具体
- 子类型一定可以赋值给父类型


在联合类型中需要注意父子类型的关系，因为确实有点「反直觉」。`'a' | 'b' | 'c'` 乍一看比 `'a' | 'b' ` 的属性更多，那么 `'a' | 'b' | 'c'` 是 `'a' | 'b'`  的子类型吗？其实正相反，`'a' | 'b' | 'c'` 是  `'a' | 'b'`  的父类型，因为前者包含的范围更广，而后者则更具体。
​
```ts
type Parent = "a" | "b" | "c";
type Child = "a" | "b";

let parent: Parent;
let child: Child;

// 兼容
parent = child

// 不兼容，因为 parent 可能为 c，而 c 无法 assign 给 "a" | "b"
child = parent
```


### 13.2. 协变

举例：

```ts
interface SuperType {
    base: string;
}
interface SubType extends SuperType {
    addition: string;
};
```

子类型的值可以赋值给父类型，也就是多的可以赋值给少的：

```ts
// subtype compatibility
let superType: SuperType = { base: 'base' };
let subType: SubType = { base: 'myBase', addition: 'myAddition' };
superType = subType;

// subType = superType; // 报错：类型 "SuperType" 中缺少属性 "addition"，但类型 "SubType" 中需要该属性。


// Covariant
type Covariant<T> = T[];
let coSuperType: Covariant<SuperType> = [];
let coSubType: Covariant<SubType> = [];
coSuperType = coSubType;
```

再举个例子：


```ts
interface Animal {
  age: number
}

interface Dog extends Animal {
  bark(): void
}

let animal: Animal = { age: 12 };

let dog: Dog = {
  age: 12,
  bark: () => {
  }
};

// 兼容，能赋值成功，这就是一个协变
animal = dog

// 不兼容，会抛出类型错误：Property 'bark' is missing in type 'Animal' but required in type 'Dog'
dog = animal
```

在上面的代码中，`dog` 能够赋值给 `animal`。根据鸭子类型理论，只要一个类型包含 `age`，我就可以认为它是一个和 `Animal` 兼容的类型。因此 `dog` 可以成功赋值给 `animal`，而对于多出来的 `bark()` 方法，可以忽略不计。
​
反过来，`animal` 却不能赋值给 `dog`。因为 `dog` 要求的是 `Dog` 类型， 必须包含 `age` 和 `bark`，而 `Animal` 不满足这个条件。



### 13.3. 逆变

```ts
// Contravariant --strictFunctionTypes true
type Contravariant<T> = (p: T) => void;
let contraSuperType: Contravariant<SuperType> = function(p) {}
let contraSubType: Contravariant<SubType> = function(p) {}
contraSubType = contraSuperType;
```

再举个例子：


```ts
let visitAnimal = (animal: Animal): Animal => {
  console.log(animal.age);
  return {
    age: 12,
  };
};

let visitDog = (dog: Dog): Animal => {
  console.log(dog.age);
  dog.bark();
  return {
    age: 20,
  };
};

// 兼容
visitDog = visitAnimal;
// 不兼容, 会抛出类型错误
visitAnimal = visitDog;
```

改写一下更好理解：

```ts
// before
visitDog = visitAnimal

// after
visitDog = (dog: Dog): Animal => {
  // 入参 dog 满足 visitAnimal 入参需要的 Animal 类型
  const animal = visitAnimal(dog);
  return animal;
}
```

反过来则不行：

```ts
// before
visitAnimal = visitDog

// after
visitAnimal = (animal: Animal): Dog => {
  // 入参 animal 不满足 visitDog 入参要求的 Dog 类型，没有bark方法，内部会报错
  const animal = visitDog(animal);
  return animal;
}
```


### 13.4. 双向协变



```ts
// Bivariant --strictFunctionTypes false
type Bivariant<T> = (p: T) => void;
let biSuperType: Bivariant<SuperType> = function(p) {}
let biSubType: Bivariant<SubType> = function(p) {}
// both are ok
biSubType = biSuperType;
biSuperType = biSubType;
```


### 13.5. 不变

```ts
// Invariant --strictFunctionTypes true
type Invariant<T> = { a: Covariant<T>, b: Contravariant<T> };
let inSuperType: Invariant<SuperType> = { a: coSuperType, b: contraSuperType }
let inSubType: Invariant<SubType> = { a: coSubType, b: contraSubType }
// both are not ok
inSubType = inSuperType;
inSuperType = inSubType;
```




## 14. 其他


### 14.1. ScriptHost

TS配置文件中`lib`有个选项是 `ScriptHost`，它的含义是 `APIs for the Windows Script Hosting System`

参考: https://www.typescriptlang.org/tsconfig


### 14.2. allowJS

`tsconfig.json`的`allowJS`设置为`true`，否则 JS 文件中引用 TS 文件没有方法类型智能提示，包括 vue 文件中的 script 部分。


### 14.3. exclude


`exclude`只是告诉Typescript这不是你的源代码，不要去转译和检查它。但是 Typescript 还是会去`node_modules`中查找第三方库的声明文件，这个行为也可以通过`types` 或 `typesRoots` 选项配置。

如果不想让 Typescript 检查第三方库的声明文件，可以设置 `skipLibCheck`

`--skipLibCheck boolean`，`false` 忽略所有的声明文件（ `*.d.ts`）的类型检查。


### 14.4. declare

在 `declare` 的最广为人知的用处就是给第三方js库来做类型定义，让 `typescript` 明白 `js` 引入的用法，但是还有一些用法例如:

1. 可以将我们写入在分散在各个ts文件中的定义，给统一的放到一个 `myProject.d.ts` 中，这样做的好处就是如果我们的后端是`nodejs`写的，那么可以做到前后端数据共用格式。

在`.d.ts`文件中，如果我们没有使用了`import || export`，然后这时候如果我们定义

`declare interface A{...}`这时候这个这个`interface`就是全局的，我们在用它的时候不需要`import`就可以直接使用。

同理对于`namespace`也是一样的，例如`declare namespace responseTypes{......}`，这样用的时候也可以直接使用`responseTypes.a`来用

反之一旦里面用了`import || export了`，那么我们的`declare type..`前面也要加上`export`，不然用不了。

但是如果我们实在想定义成全局的，可以用

```ts
declare global {
  namespace Express {
  }
}
```

2. 第二种用法就是如果我们想去改变第三方库中的类型定义，那么我们可以通过`declare`的类型融合，比如在`Express`中，里面暴露出来了`Express.Request`的全局变量，然后如果我们自己再定义一个全局的 `namespace Express{ interface Request:{{ name:string }}`，这样就可以做到类型的融合，将第三方库中的`Request`类型给改写掉，这个功能在我们写中间件的时候比较有用，我们就可以改写`request`里面的类型定义。


### 14.5. TS文件用rollup打包时报错`Typescript error "Cannot write file ... because it would overwrite input file"`




需要保证打包后的目录，排除在`ts`编译的目录之外。


```json
// tsconfig.json
{
  "include": [
    "src", // 不要写 "./**/*"
  ],
}
```


或者设置`allowJS`为`false`.

参考：https://stackoverflow.com/questions/42609768/typescript-error-cannot-write-file-because-it-would-overwrite-input-file

## 15. 参考资料

- [理清 TypeScript 的 interface 与 type 的区别](https://juejin.cn/post/7093132160747438117)
- [Typescript 中的 interface 和 type 到底有什么区别](https://juejin.cn/post/6844903749501059085)
- [TypeScript基础之联合类型、交叉类型、类型别名](https://juejin.cn/post/7106080500577468429)
- [Typescript中的extends关键字](https://blog.csdn.net/qq_34998786/article/details/120300361)
- [Typescript 声明文件加载机制以及在不同场景下的正确使用方式](https://zhuanlan.zhihu.com/p/133344957)

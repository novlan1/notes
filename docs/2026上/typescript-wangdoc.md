:::info 作者

novlan1

2026.1.3

:::

# Typescript 教程笔记

## 1. any 类型

`TypeScript` 有两个"顶层类型"（`any`和`unknown`），但是"底层类型"只有`never`唯一一个。

## 2. 类型系统

`JavaScript` 语言（注意，不是 `TypeScript`）将值分成8种类型。

* `boolean`
* `string`
* `number`
* `bigint`
* `symbol`
* `object`
* `undefined`
* `null`

`TypeScript` 继承了 `JavaScript` 的类型设计，以上8种类型可以看作 `TypeScript` 的基本类型。

注意，上面所有类型的名称都是小写字母，首字母大写的`Number`、`String`、`Boolean`等在 `JavaScript` 语言中都是内置对象，而不是类型名称。

另外，`undefined` 和 `null` 既可以作为值，也可以作为类型，取决于在哪里使用它们。



`JavaScript` 的8种类型之中，`undefined`和`null`其实是两个特殊值，`object`属于复合类型，剩下的五种属于原始类型（primitive value），代表最基本的、不可再分的值。

* `boolean`
* `string`
* `number`
* `bigint`
* `symbol`

上面这五种原始类型的值，都有对应的包装对象（wrapper object）。所谓"包装对象"，指的是这些值在需要时，会自动产生的对象。

```ts
'hello'.charAt(1) // 'e'
```

上面示例中，字符串`hello`执行了`charAt()`方法。但是，在 `JavaScript` 语言中，只有对象才有方法，原始类型的值本身没有方法。这行代码之所以可以运行，就是因为在调用方法时，字符串会自动转为包装对象，`charAt()`方法其实是定义在包装对象上。

这样的设计大大方便了字符串处理，省去了将原始类型的值手动转成对象实例的麻烦。

五种包装对象之中，`symbol` 类型和 `bigint` 类型无法直接获取它们的包装对象（即`Symbol()`和`BigInt()`不能作为构造函数使用），但是剩下三种可以。

* `Boolean()`
* `String()`
* `Number()`

以上三个构造函数，执行后可以直接获取某个原始类型值的包装对象。

```ts
const s = new String('hello');
typeof s // 'object'
s.charAt(1) // 'e'
```

上面示例中，`s`就是字符串`hello`的包装对象，`typeof`运算符返回`object`，不是`string`，但是本质上它还是字符串，可以使用所有的字符串方法。

注意，`String()`只有当作构造函数使用时（即带有`new`命令调用），才会返回包装对象。如果当作普通函数使用（不带有`new`命令），返回就是一个普通字符串。其他两个构造函数`Number()`和`Boolean()`也是如此。

### 2.1. 包装对象类型与字面量类型

由于包装对象的存在，导致每一个原始类型的值都有包装对象和字面量两种情况。

```ts
'hello' // 字面量
new String('hello') // 包装对象
```

上面示例中，第一行是字面量，第二行是包装对象，它们都是字符串。
为了区分这两种情况，`TypeScript` 对五种原始类型分别提供了大写和小写两种类型。

* `Boolean` 和 `boolean`
* `String` 和 `string`
* `Number` 和 `number`
* `BigInt` 和 `bigint`
* `Symbol` 和 `symbol`

其中，大写类型同时包含包装对象和字面量两种情况，小写类型只包含字面量，不包含包装对象。

```ts
const s1:String = 'hello'; // 正确
const s2:String = new String('hello'); // 正确

const s3:string = 'hello'; // 正确
const s4:string = new String('hello'); // 报错
```

上面示例中，`String`类型可以赋值为字符串的字面量，也可以赋值为包装对象。但是，`string`类型只能赋值为字面量，赋值为包装对象就会报错。

建议只使用小写类型，不使用大写类型。因为绝大部分使用原始类型的场合，都是使用字面量，不使用包装对象。而且，`TypeScript` 把很多内置方法的参数，定义成小写类型，使用大写类型会报错。

```ts
const n1:number = 1;
const n2:Number = 1;

Math.abs(n1) // 1
Math.abs(n2) // 报错
```

上面示例中，`Math.abs()`方法的参数类型被定义成小写的`number`，传入大写的`Number`类型就会报错。

上一小节说过，`Symbol()`和`BigInt()`这两个函数不能当作构造函数使用，所以没有办法直接获得 `symbol` 类型和 `bigint` 类型的包装对象，除非使用下面的写法。但是，它们没有使用场景，因此`Symbol`和`BigInt`这两个类型虽然存在，但是完全没有使用的理由。

```ts
let a = Object(Symbol());
let b = Object(BigInt());
```

上面示例中，得到的就是 `Symbol` 和 `BigInt` 的包装对象，但是没有使用的意义。

注意，目前在 `TypeScript` 里面，`symbol`和`Symbol`两种写法没有差异，`bigint`和`BigInt`也是如此，不知道是否属于官方的疏忽。建议始终使用小写的`symbol`和`bigint`，不使用大写的`Symbol`和`BigInt`。

## 3. 数组

`TypeScript` 允许使用方括号读取数组成员的类型。

```ts
type Names = string[];
type Name = Names[0]; // string
```

上面示例中，类型`Names`是字符串数组，那么`Names[0]`返回的类型就是`string`。
由于数组成员的索引类型都是`number`，所以读取成员类型也可以写成下面这样。

```ts
type Names = string[];
type Name = Names[number]; // string
```

上面示例中，`Names[number]`表示数组`Names`所有数值索引的成员类型，所以返回`string`。

`TypeScript` 将`readonly number[]`与`number[]`视为两种不一样的类型，后者是前者的子类型。

这是因为只读数组没有`pop()`、`push()`之类会改变原数组的方法，所以`number[]`的方法数量要多于`readonly number[]`，这意味着`number[]`其实是`readonly number[]`的子类型。

我们知道，子类型继承了父类型的所有特征，并加上了自己的特征，所以子类型`number[]`可以用于所有使用父类型的场合，反过来就不行。

```ts
let a1:number[] = [0, 1];
let a2:readonly number[] = a1; // 正确

a1 = a2; // 报错
```

上面示例中，子类型`number[]`可以赋值给父类型`readonly number[]`，但是反过来就会报错。

## 4. 元组

元组类型的写法，与上一章的数组有一个重大差异。数组的成员类型写在方括号外面（`number[]`），元组的成员类型是写在方括号里面（`[number]`）。`TypeScript` 的区分方法就是，成员类型写在方括号里面的就是元组，写在外面的就是数组。

```ts
// 数组
let a:number[] = [1];

// 元组
let t:[number] = [1];
```

使用扩展运算符（`...`），可以表示不限成员数量的元组。

```ts
type NamedNums = [
  string,
  ...number[]
];

const a:NamedNums = ['A', 1, 2];
const b:NamedNums = ['B', 1, 2, 3];
```

## 5. 函数类型

`never`类型不同于`void`类型。前者表示函数没有执行结束，不可能有返回值；后者表示函数正常执行结束，但是不返回值，或者说返回`undefined`。

构造函数的类型写法，就是在参数列表前面加上`new`命令。

```ts
class Animal {
  numLegs:number = 4;
}

type AnimalConstructor = new () => Animal;

function create(c:AnimalConstructor):Animal {
  return new c();
}

const a = create(Animal);
```

上面示例中，类型`AnimalConstructor`就是一个构造函数，而函数`create()`需要传入一个构造函数。在 `JavaScript` 中，类（`class`）本质上是构造函数，所以`Animal`这个类可以传入`create()`。

构造函数还有另一种类型写法，就是采用对象形式。

```ts
type F = {
  new (s:string): object;
};
```

上面示例中，类型 `F` 就是一个构造函数。类型写成一个可执行对象的形式，并且在参数列表前面要加上`new`命令。

某些函数既是构造函数，又可以当作普通函数使用，比如`Date()`。这时，类型声明可以写成下面这样。

```ts
type F = {
  new (s:string): object;
  (n?:number): number;
}
```

上面示例中，`F` 既可以当作普通函数执行，也可以当作构造函数使用。

## 6. 对象类型

### 6.1. 严格字面量检查

如果对象使用字面量表示，会触发 `TypeScript` 的严格字面量检查（strict object literal checking）。如果字面量的结构跟类型定义的不一样（比如多出了未定义的属性），就会报错。

```ts
const point:{
  x:number;
  y:number;
} = {
  x: 1,
  y: 1,
  z: 1 // 报错
};
```

上面示例中，等号右边是一个对象的字面量，这时会触发严格字面量检查。只要有类型声明中不存在的属性（本例是`z`），就会导致报错。

如果等号右边不是字面量，而是一个变量，根据结构类型原则，是不会报错的。

```ts
const myPoint = {
  x: 1,
  y: 1,
  z: 1
};

const point:{
  x:number;
  y:number;
} = myPoint; // 正确
```

上面示例中，等号右边是一个变量，就不会触发严格字面量检查，从而不报错。

`TypeScript` 对字面量进行严格检查的目的，主要是防止拼写错误。一般来说，字面量大多数来自手写，容易出现拼写错误，或者误用 `API`。

```ts
type Options = {
  title:string;
  darkMode?:boolean;
};

const obj:Options = {
  title: '我的网页',
  darkmode: true, // 报错
};
```

上面示例中，属性`darkMode`拼写错了，成了`darkmode`。如果没有严格字面量规则，就不会报错，因为`darkMode`是可选属性，根据结构类型原则，任何对象只要有`title`属性，都认为符合`Options`类型。

规避严格字面量检查，可以使用中间变量。

```ts
let myOptions = {
  title: '我的网页',
  darkmode: true,
};

const obj:Options = myOptions;
```

上面示例中，创建了一个中间变量`myOptions`，就不会触发严格字面量规则，因为这时变量`obj`的赋值，不属于直接字面量赋值。

如果你确认字面量没有错误，也可以使用类型断言规避严格字面量检查。

```ts
const obj:Options = {
  title: '我的网页',
  darkmode: true,
} as Options;
```

上面示例使用类型断言`as Options`，告诉编译器，字面量符合 `Options` 类型，就能规避这条规则。

如果允许字面量有多余属性，可以像下面这样在类型里面定义一个通用属性。

```ts
let x: {
  foo: number,
  [x: string]: any
};

x = { foo: 1, baz: 2 };  // Ok
```

上面示例中，变量`x`的类型声明里面，有一个属性的字符串索引（`[x: string]`），导致任何字符串属性名都是合法的。

由于严格字面量检查，字面量对象传入函数必须很小心，不能有多余的属性。

```ts
interface Point {
  x: number;
  y: number;
}

function computeDistance(point: Point) { /*...*/ }

computeDistance({ x: 1, y: 2, z: 3 }); // 报错
computeDistance({x: 1, y: 2}); // 正确
```

上面示例中，对象字面量传入函数`computeDistance()`时，不能有多余的属性，否则就通不过严格字面量检查。

编译器选项`suppressExcessPropertyErrors`，可以关闭多余属性检查。下面是它在 `tsconfig.json` 文件里面的写法。

```ts
{
  "compilerOptions": {
    "suppressExcessPropertyErrors": true
  }
}
```

## 7. 类型断言

类型断言的使用前提是，值的实际类型与断言的类型必须满足一个条件。

```ts
expr as T
```

上面代码中，`expr`是实际的值，`T`是类型断言，它们必须满足下面的条件：`expr`是`T`的子类型，或者`T`是`expr`的子类型。

也就是说，类型断言要求实际的类型与断言的类型兼容，实际类型可以断言为一个更加宽泛的类型（父类型），也可以断言为一个更加精确的类型（子类型），但不能断言为一个完全无关的类型。

但是，如果真的要断言成一个完全无关的类型，也是可以做到的。那就是连续进行两次类型断言，先断言成 `unknown` 类型或 `any` 类型，然后再断言为目标类型。因为`any`类型和`unknown`类型是所有其他类型的父类型，所以可以作为两种完全无关的类型的中介。

非空断言还可以用于赋值断言。`TypeScript` 有一个编译设置，要求类的属性必须初始化（即有初始值），如果不对属性赋值就会报错。

```ts
class Point {
  x:number; // 报错
  y:number; // 报错

  constructor(x:number, y:number) {
    // ...
  }
}
```

上面示例中，属性`x`和`y`会报错，因为 `TypeScript` 认为它们没有初始化。

这时就可以使用非空断言，表示这两个属性肯定会有值，这样就不会报错了。

```ts
class Point {
  x!:number; // 正确
  y!:number; // 正确

  constructor(x:number, y:number) {
    // ...
  }
}
```

另外，非空断言只有在打开编译选项`strictNullChecks`时才有意义。如果不打开这个选项，编译器就不会检查某个变量是否可能为`undefined`或`null`。

断言函数与类型保护函数（type guard）是两种不同的函数。它们的区别是，断言函数不返回值，而类型保护函数总是返回一个布尔值。

```ts
function isString(
  value:unknown
):value is string {
  return typeof value === 'string';
}
```

上面示例就是一个类型保护函数`isString()`，作用是检查参数`value`是否为字符串。如果是的，返回`true`，否则返回`false`。该函数的返回值类型是`value is string`，其中的`is`是一个类型运算符，如果左侧的值符合右侧的类型，则返回`true`，否则返回`false`。

如果要断言某个参数保证为真（即不等于`false`、`undefined`和`null`），`TypeScript` 提供了断言函数的一种简写形式。

```ts
function assert(x:unknown):asserts x {
  // ...
}
```

上面示例中，函数`assert()`的断言部分，`asserts x`省略了谓语和宾语，表示参数`x`保证为真（`true`）。

## 8. 模块

任何包含 `import` 或 `export` 语句的文件，就是一个模块（module）。相应地，如果文件不包含 `export` 语句，就是一个全局的脚本文件。

模块本身就是一个作用域，不属于全局作用域。模块内部的变量、函数、类只在内部可见，对于模块外部是不可见的。暴露给外部的接口，必须用 `export` 命令声明；如果其他文件要使用模块的接口，必须用 `import` 命令来输入。

如果一个文件不包含 `export` 语句，但是希望把它当作一个模块（即内部变量对外不可见），可以在脚本头部添加一行语句。

```ts
export {};
```

上面这行语句不产生任何实际作用，但会让当前文件被当作模块处理，所有它的代码都变成了内部代码。

### 8.1. `importsNotUsedAsValues` 编译设置

`TypeScript` 特有的输入类型（`type`）的 `import` 语句，编译成 `JavaScript` 时怎么处理呢？

`TypeScript` 提供了`importsNotUsedAsValues`编译设置项，有三个可能的值。

（1）`remove`：这是默认值，自动删除输入类型的 `import` 语句。

（2）`preserve`：保留输入类型的 `import` 语句。

（3）`error`：保留输入类型的 `import` 语句（与`preserve`相同），但是必须写成`import type`的形式，否则报错。

请看示例，下面是一个输入类型的 `import` 语句。

```ts
import { TypeA } from './a';
```

上面示例中，`TypeA`是一个类型。

`remove`的编译结果会将该语句删掉。

`preserve`的编译结果会保留该语句，但会删掉其中涉及类型的部分。

```ts
import './a';
```

上面就是`preserve`的编译结果，可以看到编译后的`import`语句不从`a.js`输入任何接口（包括类型），但是会引发`a.js`的执行，因此会保留`a.js`里面的副作用。

`error`的编译结果与`preserve`相同，但在编译过程中会报错，因为它要求输入类型的`import`语句必须写成`import type` 的形式。原始语句改成下面的形式，就不会报错。

```ts
import type { TypeA } from './a';
```

## 9. namespace


`namespace` 用来建立一个容器，内部的所有变量和函数，都必须在这个容器里面使用。

```ts
namespace Utils {
  function isString(value:any) {
    return typeof value === 'string';
  }

  // 正确
  isString('yes');
}

Utils.isString('no'); // 报错
```

上面示例中，命名空间`Utils`里面定义了一个函数`isString()`，它只能在`Utils`里面使用，如果用于外部就会报错。
如果要在命名空间以外使用内部成员，就必须为该成员加上`export`前缀，表示对外输出该成员。

```ts
namespace Utility {
  export function log(msg:string) {
    console.log(msg);
  }
  export function error(msg:string) {
    console.error(msg);
  }
}

Utility.log('Call me');
Utility.error('maybe!');
```

上面示例中，只要加上`export`前缀，就可以在命名空间外部使用内部成员。

编译出来的 `JavaScript` 代码如下。

```ts
var Utility;

(function (Utility) {
  function log(msg) {
    console.log(msg);
  }
  Utility.log = log;
  function error(msg) {
    console.error(msg);
  }
  Utility.error = error;
})(Utility || (Utility = {}));
```

上面代码中，命名空间`Utility`变成了 `JavaScript` 的一个对象，凡是`export`的内部成员，都成了该对象的属性。

这就是说，`namespace` 会变成一个值，保留在编译后的代码中。这一点要小心，它不是纯的类型代码。

## 10. 装饰器

存取器装饰器用来装饰类的存取器（accessor）。所谓“存取器”指的是某个属性的取值器（getter）和存值器（setter）。

## 11. declare 关键字

`declare` 关键字用来告诉编译器，某个类型是存在的，可以在当前文件中使用。
它的主要作用，就是让当前文件可以使用其他文件声明的类型。举例来说，自己的脚本使用外部库定义的函数，编译器会因为不知道外部函数的类型定义而报错，这时就可以在自己的脚本里面使用`declare`关键字，告诉编译器外部函数的类型。这样的话，编译单个脚本就不会因为使用了外部类型而报错。

`declare` 关键字可以描述以下类型。

* 变量（`const`、`let`、`var` 命令声明）
* `type` 或者 `interface` 命令声明的类型
* `class`
* `enum`
* 函数（`function`）
* 模块（`module`）
* 命名空间（`namespace`）

`declare` 关键字的重要特点是，它只是通知编译器某个类型是存在的，不用给出具体实现。比如，只描述函数的类型，不给出函数的实现，如果不使用`declare`，这是做不到的。

`declare` 只能用来描述已经存在的变量和数据结构，不能用来声明新的变量和数据结构。另外，所有 `declare` 语句都不会出现在编译后的文件里面。

## 12. 类型声明文件

类型声明文件里面，变量的类型描述必须使用`declare`命令，否则会报错，因为变量声明语句是值相关代码。

```ts
declare let foo:string;
```

`interface` 类型有没有`declare`都可以，因为 `interface` 是完全的类型代码。

```ts
interface Foo {} // 正确
declare interface Foo {} // 正确
```


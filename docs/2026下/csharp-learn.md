## 1. 静态/动态类型

静态类型：编译阶段就检查类型；动态类型：运行代码的时候才检查类型。

```csharp
int num = 10;
num = "abc"; // ❌ 编译直接报错，启动都跑不起来
```

```js
let num = 10;
num = "abc"; // ✅ 正常运行，不会提前报错
```

## 2. 强类型/弱类型

强类型 / 弱类型，描述的是变量能不能随意进行类型隐式转换。

```js
let a = 10;
let b = "20";
console.log(a + b); // "1020" 数字自动转字符串
console.log(a - b); // -10 字符串自动转数字
```

```csharp
int num = 10;
string str = "20";
// num + str; // ❌ 编译报错，不能直接相加
int res = num + int.Parse(str); // ✅ 必须手动转换
```

4 种组合现实案例

1. 静态强类型：**C#、Java**
   编译就查类型 + 不允许随意隐式转换
2. 动态弱类型：原生 **JavaScript**
   运行时查类型 + 大量自动隐式转换
3. 动态强类型：**Python**
   **运行时检查类型，但是不会自动跨类型运算**
4. 静态弱类型：**TypeScript**（严格来说偏静态弱类型）
   编译检查类型，但 ts 兼容 js 大量隐式转换规则

```python
a = 10
b = "20"
# a + b 直接报错，不会自动拼接/转换
```

## 3. using

using = 引入命名空间，相当于 JS 的 import

```csharp
using System;

Console.WriteLine("Hello World!");
```

如果不写 `using System;`，你就得完整写：

```csharp
System.Console.WriteLine("hello");
```

很多人混淆 using 和 namespace

- namespace：自己定义代码的文件夹（归类自己的代码）
- using：去别人文件夹拿代码

```csharp
// 自己创建命名空间
namespace Demo
{
    public class Student{}
}

// 引用别人的命名空间
using Demo;
Student s = new Student();
```

## 4. const vs readonly


- 使用 `const` 时可确保那些在整个应用生命周期中不会改变的值，如数学常数(π, e)等。这种常量在编译时已经确定，不需要通过运行时计算或初始化。
- `readonly` 更适合于那些需要在运行时基于某些条件初始化但在整个生命周期中保持不变的值。例如，一个从配置文件中读取的常量值。


- 如果需要更高的灵活性（例如从配置文件中读取值），`readonly` 是更好的选择。否则，如果值是不可更改的编译时间常量，则应使用 `const`。
- 不要混淆 `const` 的默认静态性质和 `readonly` 字段可以是实例字段这一点。

下面扩展一些它们的具体用法和一些细节。

### 4.1. 1) `const` 修饰符

- `const` 只能修饰基本数据类型（比如 `int`，`float`，`double`，`char`，`bool` 等）以及字符串（`string`）。
- 在编译时常量值必须确定，所以你不能在运行时动态地生成这些常量。
- `const` 字段在定义时就必须初始化，而且一旦定义，不能再修改它的值。
- 由于是编译时常量，编译器会将这些常量的值直接嵌入到使用它的代码中，所以修改常量的值时，需要重新编译所有依赖该常量的代码。

举例：

```csharp
public class Constants
{
    public const int MaxValue = 100;
    public const string Greeting = "Hello, world!";
}
```

### 4.2. 2) `readonly` 修饰符

- `readonly` 可以修饰任何数据类型，包括复杂类型（比如对象、数组、集合等）。
- 与 `const` 不同的是，`readonly` 字段可以在运行时动态地初始化，这意味着你可以在构造函数中赋值。
- `readonly` 字段可以是实例字段，也可以是静态字段（`static`）。
- 初始化后，`readonly` 字段的值不能再修改。

```csharp
public class MyClass
{
    public readonly int ReadOnlyField;
    public static readonly string StaticReadOnlyField;

    public MyClass(int value)
    {
        ReadOnlyField = value; // 运行时初始化
    }

    static MyClass()
    {
        StaticReadOnlyField = "Initialized"; // 静态字段运行时初始化
    }
}
```

> 顺带补充（JS视角重点区分）：
> JS `const` ≠ C# `const`！
> JS const 只是禁止变量重定向，对象内部属性依旧可改；
> C# const 编译期常量，readonly运行时只读。

## 5. struct vs class

### 5.1. 核心区别表格

|对比维度|struct 结构|class 类|
| ---- | ---- | ---- |
|类型本质|**值类型**|**引用类型**|
|内存位置|默认栈上（局部变量）；装箱后堆上|堆上分配|
|赋值传递|完整拷贝**值副本**，修改副本不影响原对象|拷贝**引用地址**，多个变量指向同一个对象|
|继承体系|❌ 不能继承、不能作为基类；仅可实现接口|✅ 支持单继承、多态，可做基类|
|无参构造|自带隐式无参构造，**禁止自定义无参构造函数**|可自由定义无参/有参构造函数|
|内存回收|作用域结束自动释放，**不受GC管控**|依靠GC垃圾回收释放内存|
|装箱拆箱|赋值object会触发装箱(boxing)/拆箱(unboxing)，有性能开销|不存在装箱拆箱|
|适用场景|轻量、小型固定数据（Point、Color），推荐做成**不可变数据**|复杂对象、需要继承/多态、体量较大的数据模型|

### 5.2. 关键知识点提炼

1. **拷贝行为（最容易踩坑）**

```csharp
// struct 值拷贝
Point p1 = new Point(1,2);
Point p2 = p1;
p2.X = 100; // p1 不受影响

// class 引用拷贝
User u1 = new User();
User u2 = u1;
u2.Name = "test"; // u1 的数据同步改变
```

2. **构造函数限制**

- struct：永远存在默认无参构造，不能手动写 `struct(){}`；只能定义带参数构造函数，构造函数**必须给所有字段赋值**。
- class：无强制要求，可自定义任意构造函数。

3. **性能取舍**

✅ 适合struct：体积很小、频繁创建销毁、不需要继承；
⚠️ 不适合struct：结构体很大、频繁作为方法参数传递（大量复制开销）、频繁装箱。

4. **最佳实践**

> 业务中优先把struct设计为**不可变**：字段/属性使用readonly，构造函数一次性赋值，实例创建后不能修改（如Point、Vector）。

### 5.3. 快速选择口诀

轻量数据、无需继承 → struct
复杂模型、需要继承多态、体量较大 → class

### 5.4. 补充面试高频考点

Q：struct能不能new？
A：可以。`var p = new Point()` 调用默认无参构造，字段赋默认值；值类型也可以不new直接声明，但字段会未初始化。

Q：struct可以实现接口吗？
A：✅ 可以；但是struct值类型转接口时，**会发生装箱**。

## 6. 接口

在 C# 中使用接口主要分为几个步骤：定义接口、实现接口和使用接口。

1) 定义接口：使用 `interface` 关键字来定义接口。接口通常只包含方法、属性、事件和索引器的声明，而不包含任何实现。
2) 实现接口：一个类或结构可以通过使用 `:` 符号来实现一个或多个接口。实现一个接口意味着这个类或结构需要提供接口中声明的所有方法和属性的具体实现。
3) 使用接口：通过接口变量来调用实现类中的方法和属性，可以实现多态。

```csharp
// 定义接口
public interface IShape
{
    void Draw();
}

// 实现接口的类
public class Circle : IShape
{
    public void Draw()
    {
        Console.WriteLine("Drawing a Circle");
    }
}

public class Square : IShape
{
    public void Draw()
    {
        Console.WriteLine("Drawing a Square");
    }
}

// 使用接口
public class Program
{
    static void Main(string[] args)
    {
        IShape myCircle = new Circle();
        myCircle.Draw();

        IShape mySquare = new Square();
        mySquare.Draw();
    }
}
```

## 可变参数列表 params

在 C# 中，可变参数列表是通过 `params` 关键字来实现的。使用可变参数列表允许你向方法传递不定数量的参数。当使用 `params` 关键字时，必须遵循以下规则：

1. `params` 关键字只能用于一个方法的最后一个参数。
2. `params` 参数必须是一个类型一致的一维数组。

```csharp
public void PrintNumbers(params int[] numbers)
{
    foreach (int number in numbers)
    {
        Console.WriteLine(number);
    }
}

// 调用方法时，你可以传递任意数量的整数
PrintNumbers(1, 2, 3, 4, 5);
PrintNumbers(10);
PrintNumbers(); // 也可以不传递任何参数
```

## 枚举

定义枚举

```csharp
public enum Weekday
{
    Sunday,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday
}
```

使用

```csharp
using System;

public class Program
{
    public static void Main()
    {
        Weekday today = Weekday.Monday;
        printDay(today);
    }

    public static void printDay(Weekday day)
    {
        switch (day)
        {
            case Weekday.Sunday:
                Console.WriteLine("Today is Sunday.");
                break;
            case Weekday.Monday:
                Console.WriteLine("Today is Monday.");
                break;
            case Weekday.Tuesday:
                Console.WriteLine("Today is Tuesday.");
                break;
            case Weekday.Wednesday:
                Console.WriteLine("Today is Wednesday.");
                break;
            case Weekday.Thursday:
                Console.WriteLine("Today is Thursday.");
                break;
            case Weekday.Friday:
                Console.WriteLine("Today is Friday.");
                break;
            case Weekday.Saturday:
                Console.WriteLine("Today is Saturday.");
                break;
        }
    }
}
```

枚举在 C# 中是一个值类型，它底层使用的是整型（默认是 int）。这意味着每个枚举成员都有与之关联的整数值。我们可以显式地指定这些整数值，或者让它们默认从零开始的连续整数。看看这个扩展的例子：

```csharp
public enum HttpStatusCode
{
    OK = 200,
    Created = 201,
    Accepted = 202,
    NoContent = 204,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404
}
```

在这个例子中，`HttpStatusCode` 枚举的每个成员都有一个明确的整数值，这代表了 HTTP 标准状态码。

此外，你还可以结合使用 `Enum.Parse` 方法，从字符串值中解析出对应的枚举值：

```csharp
string statusString = "Created";
HttpStatusCode statusCode = (HttpStatusCode)Enum.Parse(typeof(HttpStatusCode), statusString);
Console.WriteLine((int)statusCode); // 输出：201
```

## 访问修饰符

C# 中的访问修饰符决定了类成员（比如方法、属性、字段等）的可访问范围。主要的访问修饰符有：`public`、`private`、`protected`、`internal` 和 `protected internal`。它们的区别如下：

1）`public`：公开的，所有代码都可以访问。无论是类内、同一个程序集，还是其他程序集，任何代码都能访问它。
2）`private`：私有的，只有在同一个类内部（包括嵌套类）才能访问。类外部无法直接访问它。
3）`protected`：受保护的，只有在同一个类内部及其子类中才能访问。不同程序集内的子类也可以访问。
4）`internal`：内部的，只有在同一个程序集内（assembly）可以访问。不同程序集的代码无法访问它。
5）`protected internal`：受保护的内部成员，它可以在同一个程序集内的任何代码中访问，同时也可以在不同程序集的子类中访问。

### 进一步思考

1）default：如果不显式指定访问修饰符，默认的修饰符是什么？对于类成员是 private，而对于顶级类是 internal。

2）访问修饰符的组合：有些修饰符可以一起使用，比如 `protected internal`，意义是“在同一个程序集内或子类中可访问”，这种组合修饰符的使用场景是什么？

**使用场景**：

我们有一个基础类库（A程序集），里面写了一个基类，既要让本程序集里的其他类自由调用它的成员，又要允许别的程序集（B程序集）里派生的子类重写、访问该成员，这时就适合用`protected internal`。

简单来说：同程序集随便访问，跨程序集只有子类能访问。

3）封装性的重要性：使用访问修饰符来实现数据的封装和模块化，能够保护对象的内部状态，对错误和意外改动形成有效的防护。

**三合一极简总结**

- internal：只给本项目内部使用
- protected：只给子类使用
- protected internal：本项目所有人可用 + 外面项目的子类可用

问：protected internal = protected + internal，必须同时满足？

- 答：❌错误，是逻辑或，满足其一即可。

程序集 LibA:

```csharp
public class Base
{
    protected internal void Func(){}
}
```

- LibA 内部随便一个类，直接调用 Func() ✔（同程序集）
- 新建程序集 LibB，写子类继承 Base

```csharp
class Son : Base
{
    void Demo()
    {
        Func(); // ✔ 子类，跨程序集也能访问
    }
}
```

- LibB 中普通类，不继承 Base，尝试调用 Func () ❌（既不同程序集，又不是子类

## this

除了基本用法，这里还可以拓展一些关于 `this` 关键字的细节和高级用法：

### 1）实例方法内的字段访问

- `this` 常用于在实例方法中明确引用当前对象的成员变量，避免在方法内部局部变量与成员变量同名时产生混淆。例如：

```csharp
public class Example
{
    private int value;
    public void SetValue(int value)
    {
        this.value = value; // this.value 指的是类的成员变量，而 value 是方法参数
    }
}
```

### 2）构造函数重载简化代码

- 在一个类中可以有多个构造函数，有时候我们需要在一个构造函数中调用另一个构造函数，这时就可以用 `this` 关键字。例如：

```csharp
public class Sample
{
    private int x;
    private int y;

    public Sample(int x, int y)
    {
        this.x = x;
        this.y = y;
    }

    public Sample(int x) : this(x, 0)
    {

    }
}
```

上面的代码中，第二个构造函数通过 `this` 关键字调用第一个构造函数，避免了代码重复。

### 3）用于索引器

- 当一个类需要提供基于索引的访问方式时，可以使用索引器，而索引器的定义需要用到 `this` 关键字：

```csharp
public class IndexerExample
{
    private string[] data = new string[10];

    public string this[int index]
    {
        get { return data[index]; }
        set { data[index] = value; }
    }
}
```

### 4）扩展方法的调用

- 虽然扩展方法是在静态类中定义的，但它们是作为实例方法来使用的，调用扩展方法时可以显式地使用 `this` 关键字：

```csharp
public static class StringExtensions
{
    public static int WordCount(this string str)
    {
        return str.Split(new char[] { ' ', '.', '?' }, StringSplitOptions.RemoveEmptyEntries).Length;
    }
}

public class Test
{
    public void Demo()
    {
        string text = "Hello world!";
        int count = text.WordCount(); // 调用扩展方法，也可以写成 this.WordCount()
    }
}
```

### 要点区分

1. 实例中 `this`：代表**当前类实例对象**，**不能在static静态方法中使用**；
2. 构造器 `:this()`：只能放在构造函数**第一行**，不能互相循环调用；
3. 索引器 `public T this[int index]`：C# 索引器固定使用 this 声明；
4. 扩展方法参数 `this string str`：**只是语法标记**，这个this和实例this不是同一个东西！

## break/continue/goto

在 C# 中，`break`、`continue` 和 `goto` 语句都是用于控制程序流的跳转语句。它们的作用分别是：

1）`break`：用于立即退出当前的循环或 switch 语句，跳出循环后，程序会从循环后面的一行代码继续执行。
2）`continue`：用于跳过当前循环的剩余部分，立即进入下一次循环的迭代。
3）`goto`：用于无条件地跳转到程序中指定的标签位置。标签是一行代码前的标识符，后跟冒号。

简单的例子：

```csharp
for (int i = 0; i < 10; i++)
{
    if (i == 4) break;        // 演示 break
    if (i == 2) continue;     // 演示 continue
    Console.WriteLine(i);
}

label:
Console.WriteLine("This is a label.");

goto label;                   // 演示 goto
```

这些控制语句虽然功能强大，但也带来了一些潜在问题和使用上的注意事项：

1）`break` 的扩展：

- 在多层嵌套循环中，`break` 只会跳出最近的一层循环。如果需要跳出多层循环，通常会通过设置标志或使用 `goto`。
- `break` 不仅可以用于循环，同样适用于 switch 语句。在 switch 中，`break` 用于终止一个 case 的执行，避免程序继续执行后续的 case。

2）`continue` 的扩展：

- `continue` 主要用于循环。对于 `for` 循环，`continue` 会跳过当前循环到增量表达式部分；对于 `while` 和 `do-while` 循环，`continue` 会重新评估循环条件。
- 使用 `continue` 时，要避免造成死循环的情况。例如，如果没有正确更新循环变量，可能会导致程序进入无尽的循环。

3）`goto` 的扩展：

- `goto` 被称为“无条件跳转”，因为一旦执行 `goto` 语句，程序会直接跳转到指定的标签位置，不论中间的代码如何。
- `goto` 经常被认为是“有害的”，因为它容易使代码结构复杂化，难以理解和维护。现代编程中，通常推荐使用更高层次的控制结构（如函数、方法和类）来实现程序跳转。

## 预处理器指令

在 C# 中，预处理器指令 `#if` 和 `#endif` 用于实现条件编译。条件编译允许我们根据特定的编译条件来包含或排除部分代码，这对调试、平台特定代码或者版本控制非常有用。

简单来说，当满足 `#if` 指令中的条件时，编译器才会编译其中包含的代码块，否则会跳过该代码块。这让我们可以灵活地控制代码的编译过程。

### 示例

```csharp
#define DEBUG

public class Program
{
    public static void Main()
    {
        Console.WriteLine("Starting Application");

#if DEBUG
        Console.WriteLine("Debug mode is enabled.");
#endif

        Console.WriteLine("Ending Application");
    }
}
```

在这个例子中，如果我们定义了 `DEBUG`（通过 `#define` 或者项目属性设置），代码会输出调试信息。如果没定义，代码会直接跳过调试信息的输出。

### 其他预处理器指令

在 C# 中，除了 `#if` 和 `#endif` 之外，还有其他一些预处理器指令非常有用：

1）`#else` 和 `#elif`：与 `#if` 配合使用，可以实现更复杂的条件判断。

```csharp
#define DEBUG

public class Program
{
    public static void Main()
    {
#if DEBUG
        Console.WriteLine("Debug mode is enabled.");
#else
        Console.WriteLine("Debug mode is not enabled.");
#endif
    }
}
```

2) `#define` 和 `#undef`：用于定义和取消定义符号。

```csharp
#define DEBUG
#undef DEBUG
```

1) `#region` 和 `#endregion`：用于代码折叠和分区，增强代码可读性。

```csharp
#region MainRegion
// Your code here
#endregion
```

4) `#error` 和 `#warning`：用于在编译时生成错误或警告信息，以提醒开发者注意特定问题。

```csharp
#if !DEBUG
#error "You must define DEBUG before compiling"
#endif
```

## region/endregion

在 C# 中，`#region` 和 `#endregion` 是条件编译指令，用于定义代码的一个可折叠区域。这些指令在代码中起到标记和分隔的作用，便于代码的组织与维护。

作用如下：
1）增强代码可读性：它们可以将代码的某个部分折叠起来，使得复杂的代码更易于阅读和导航。
2）便于代码管理：开发人员可以使用这些指令将相似功能或用途的代码块分组，方便以后定位和修改。

例如：

```csharp
#region 数据访问层
// 数据库连接代码
// 数据库查询代码
#endregion

#region 业务逻辑层
// 业务逻辑相关代码
#endregion
```

⚠️ **关键考点**

`#region / #endregion` **不会参与编译**，编译器会直接忽略这一组指令，不会生成任何IL代码；

它仅仅是IDE（VS/Rider）提供的编辑器功能，只影响代码视图折叠，不影响程序运行。

## 隐式类型转换、显式类型转换

在 C# 中，隐式类型转换和显式类型转换主要区别在于：

1）隐式类型转换：由编译器自动完成，不需要显式指定。通常用于不会导致数据丢失的转换，比如从较小容量类型转换为较大容量类型，比如 `int` 转换为 `long`。

2）显式类型转换：需要在代码中明确指定，因为这种转换可能会引起数据丢失或抛出异常，比如从 `double` 转换为 `int`。实现这种转换时，必须使用强制转换语法 `(type)`，例如 `(int)3.14`。


### 隐式类型转换

隐式类型转换是安全的，编译器可以保证转换不会导致数据丢失。这种转换发生在源类型能够被目标类型覆盖的情况下。常见的例子包括：

1）从 `int` 到 `long`：

```csharp
int i = 123;
long l = i;  // 隐式转换
```

2）从 `float` 到 `double`：

```csharp
float f = 123.45F;
double d = f;  // 隐式转换
```

隐式转换的特性使得这些转换操作简单直观，没有意外的风险。

### 显式类型转换

显式类型转换必须通过添加类型转换运算符来明确被转换的目标类型。常见的使用场景包括：

1）从 `double` 到 `int`：

```csharp
double d = 123.45;
int i = (int)d;  // 显式转换
```

值得注意的是，上面的转换会丢失小数部分，`i` 的值变成了 `123`。

2）从更大的数据类型到更小的数据类型：

```csharp
long l = 123456789;
int i = (int)l;  // 显式转换，可能导致数据丢失
```

有时候显式类型转换在转换过程中的确会导致数据的丢失或者引发运行时错误，所以使用时须特别小心。

## C# 和 .NET 版本

- C# 8.0 → .NET Core 3.1
- C# 9.0 → .NET 5
- C# 10 → .NET 6
- C# 11 → .NET 7
- C# 12 → .NET 8
- C# 13 → .NET 9
- C# 14 → .NET 10

## System.Object

在 C# 中，`System.Object` 是所有类的基类，是所有类型最终的祖先类。它为所有对象提供基本功能，比如对象比较、对象字符串表示和对象生命周期控制。

### 1) System.Object 的重要性

- `System.Object` 定义了许多通用方法，所有 C# 对象都继承了这些方法。比如常见的 `ToString()`、`Equals()` 和 `GetHashCode()` 方法。
- 当你定义自己的类时，即使没有显式地继承 `Object`，你的类仍然会默认地继承自 `Object`。

### 2) 基本方法

- **ToString()**：返回对象的字符串表示。默认实现是返回对象的完全限定名，可以在子类中重写这个方法以提供更有意义的信息。
- **Equals(Object obj)**：判断两个对象是否相等。默认实现是比较对象的引用，相同的引用返回 `true`，否则返回 `false`。可以在子类中重写这个方法以提供自定义的比较逻辑。
- **GetHashCode()**：返回对象的哈希码，通常与 `Equals()` 方法配合使用。子类在重写 `Equals()` 时，通常也需要重写 `GetHashCode()` 以保证相同的对象有相同的哈希码。
- **GetType()**：返回当前实例的 `Type` 对象。这个方法是无法重写的，能够在运行时获取对象的类型信息。

### 3) Object 在面向对象编程中的作用

- 提供共同接口：通过 `Object` 类，C# 保证所有对象具有一组通用的方法，使得不同类型的对象之间能够进行某些基本的交互。
- 多态和泛型的基础：因为所有类型都继承自 `Object`，可以使用 `Object` 类型的变量来引用任何类型的对象，从而实现多态和泛型编程。
- 允许非类型化集合：例如，老版本的 C# 中的 `ArrayList`，可以把任何对象存储在 `Object` 类型的集合中。

### 4) 实例扩展

- 假设我们有一个简单的 `Person` 类，`Person` 类需要重写一些 `Object` 的方法。

```csharp
public class Person
{
    public string Name { get; set; }
    public int Age { get; set; }

    public override string ToString()
    {
        return $"{Name}, Age: {Age}";
    }

    public override bool Equals(object obj)
    {
        if (obj == null || GetType() != obj.GetType())
            return false;

        Person person = (Person)obj;
        return (Name == person.Name) && (Age == person.Age);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Name, Age);
    }
}
```

## 匿名函数

在 C# 中，匿名函数是一种没有显式命名的函数，可以在需要使用的时候定义并立即使用。匿名函数通常用于内联表达式，是一个便捷工具，能让代码更加简洁并且容易管理。匿名函数主要包括两类：匿名方法和 Lambda 表达式。

### 1）匿名方法

```csharp
delegate int Del(int i);

Del myDelegate = delegate(int x)
{
    return x * x;
};

Console.WriteLine(myDelegate(5)); // 输出 25
```

### 2）Lambda 表达式

```csharp
Func<int, int> square = x => x * x;

Console.WriteLine(square(5)); // 输出 25
```

### 精简总结

1. **匿名方法**：`delegate(参数){方法体}`，C#2.0 推出；
2. **Lambda表达式**：`参数 => 表达式/代码块`，C#3.0 推出，是匿名方法的简化写法；
3. 两者本质：都是用来实例化委托；
4. Lambda 优势：语法更简短，配合 `Func`/`Action` 泛型委托，日常开发主流；
5. 相同点：都可以捕获外部变量（闭包）。

### 补充区分

- `Action`：无返回值委托
- `Func<T>`：带返回值委托

## 闭包

**闭包：匿名方法 / Lambda 可以捕获方法外部作用域的局部变量、参数，在委托执行时访问这些变量。**

> 重点：捕获的是**变量本身**，不是捕获变量当时的值。

### 经典示例 & 大坑

```csharp
List<Action> actions = new List<Action>();
for (int i = 0; i < 3; i++)
{
    actions.Add(() => Console.WriteLine(i));
}
// 执行所有委托
foreach (var act in actions)
    act();
```

✅ 输出结果：

```
3
3
3
```

#### 原理

1. `for`循环里**只有一个变量i**，Lambda捕获的是这个变量；
2. 循环结束后 `i=3`；
3. 延迟执行委托时，读取的是变量**当前最新值**，不是循环那一刻快照。

#### 解决方案（循环内新建局部变量，每次循环独立副本）

```csharp
List<Action> actions = new List<Action>();
for (int i = 0; i < 3; i++)
{
    int temp = i; // 每次循环生成新局部变量
    actions.Add(() => Console.WriteLine(temp));
}
foreach (var act in actions)
    act();
// 输出：0 1 2
```

> ⚠️补充：`foreach` 在 C#5 / C#7.3 前后行为不一样，.NET Core 新版foreach已经修复，不再出现该问题，for循环永远存在这个陷阱。

### 可捕获哪些变量

✅ 可以捕获：
1. 外部方法局部变量
2. 方法入参
❌ **不能捕获：ref / out 参数**

### 四、变量生命周期提升（重要底层考点）

正常局部变量：方法执行完毕就销毁。
如果被Lambda捕获：
编译器自动把变量打包到**生成的闭包类**中，变量生命周期延长，**直到委托被垃圾回收**。
👉 风险：容易造成**内存泄漏**（长时间持有委托，外部资源无法释放）。

#### 匿名方法 VS Lambda 捕获差异（简单了解）

两者捕获规则几乎一致；

语法区别：

```csharp
// 匿名方法（C#2.0）
Del d = delegate(int x){ Console.WriteLine(x); };
// Lambda（C#3.0，推荐）
Del d = x => Console.WriteLine(x);
```

### 问答题汇总

#### 1）什么是闭包？

Lambda/匿名方法能够访问其定义所在外部作用域的局部变量；编译器生成闭包类保存变量，延长变量生命周期。

#### 2）for循环闭包为什么全部输出同一个值？

for循环迭代变量在循环外定义，全程只有**同一个变量实例**，lambda捕获变量引用，延迟执行读取最终值。

#### 3）闭包会带来什么问题？

1. 循环捕获变量导致意外结果；
2. 延长局部变量生命周期，引发内存泄漏；
3. 多线程场景下，捕获变量存在线程安全竞争。

### 拓展：闭包中的可变捕获演示

```csharp
int num = 10;
Action act = () =>
{
    num = 99;
    Console.WriteLine(num);
};
num = 50;
act(); // 输出 99
```
执行委托时修改外部变量，外部也能感知变化，再次证明捕获的是**变量引用**，不是值快照。

### 一句话背诵总结

闭包捕获**变量引用而非值快照**；被捕获变量生命周期延长；for循环迭代变量陷阱是面试最高频考题。

如果你想要，我可以给你整理一套闭包相关**面试口头标准答案**，直接背用来面试作答。

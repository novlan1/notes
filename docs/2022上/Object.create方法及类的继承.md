## 一、开始

本文讲解 Object.create 方法的概念、实现原理，以及如何用它实现继承。


## 二、概念

`Object.create()` 方法可以创建一个新对象，使用现有的对象来提供新创建的对象的 `__proto__`。 


`Object.create` 和 `New Object` 的区别如下：


### 1. 创建对象的方式不同

`new Object()` 通过构造函数来创建对象, 添加的属性是在自身实例下。

`Object.create()` 是 ES6 创建对象的另一种方式，可以理解为继承一个对象, 添加的属性是在原型下。


```js
// new Object() 方式创建
var a = {  rep : 'apple' }
var b = new Object(a)
console.log(b) // {rep: "apple"}
console.log(b.__proto__) // {}
console.log(b.rep) // apple

// Object.create() 方式创建
var c = Object.create(a)
console.log(c)  // {}
console.log(c.__proto__) // {rep: "apple"}
console.log(c.rep) // apple
```


### 2. 创建对象属性的性质不同

`Object.create()` 用第二个参数来创建非空对象的属性描述符默认是为 `false` 的，而构造函数或字面量方法创建的对象属性的描述符默认为 `true`。

```js
// 创建一个以另一个空对象为原型,且拥有一个属性p的对象
o = Object.create({}, { p: { value: 42 } })

// 省略了的属性特性默认为false,所以属性p是不可写,不可枚举,不可配置的:
o.p = 24
o.p
//42

o.q = 12
for (var prop in o) {
   console.log(prop)
}
//"q"

delete o.p
//false
```

这个不同是比较的 `Object.create` 的第二个参数与 `new Object` 的第一个参数。

### 3. 创建空对象时不同


当用构造函数或对象字面量方法创建空对象时，对象时有原型属性的，即有 `__proto__`;

当用 `Object.create()` 方法创建空对象时，对象是没有原型属性的。


```js
console.log(new Object()) // 有__proto__ 

console.log(Object.create(null)) // 没有 __proto__
```


## 三、动手实现


`Object.create` 的实现原理是：

1. 创建一个空的构造函数
2. 将传入的对象作为其原型
3. 用该构造函数创建新的对象，并返回



代码大致如下，此处没有考虑参数的兼容性问题：

```js
Object.cteate = function(proto) {
  function F() {}
  F.prototype = proto
  return new F()
}
```

## 四、类的继承


### 1. 寄生组合式继承

参考[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/create)，我们用ES5语法实现类的继承。代码如下：

```js
function Parent() {
}
function Child() {
  Parent.call(this)
}

Child.prototype = Object.create(Parent.prototype)
Child.prototype.constructor = Child
```

这种方法称为寄生组合式继承。
- 寄生式继承的思路：在创建对象的函数中直接吸收其他对象的功能，然后对其进行扩展并返回。
- 构造函数的目的是为了复制属性，`Parent.call(this, name)` 肯定不能少
- `Child.prototype = new Parent()` 的目的是为了获取到父类原型对象(`prototype`)上的方法，基于这个目的，有没有别的方法可以做到 在**不需要实例化父类构造函数**的情况下，也能**得到父类原型对象上的方法**呢？ 当然可以，我们可以采用寄生式继承来得到父类原型对象上的方法。
- 那么使用 `Object.create` 的原型链是什么样的呢？其实很简单：
  `SubType.prototype.__ proto __ = SuperType.protype`
  也就是说，**子类的原型相当于是父类原型的一个实例**，这不就是实现了两者的链接了吗？

下面看下其他方式的不足。

### 2. 单纯的构造函数继承 `Parent.call(this)`

```js
function Parent() {
  this.name = 'parent'
}
Parent.prototype.say = function() {}

function Child() {
  Parent.call(this)
  this.type = 'child'
}
console.log(new Child().say()) // 报错
```



只用 `Parent.call(this)` 的缺点是，**原型链上的属性并没被继承**。

### 3. 单纯的原型链继承 `Child.prototype = new Parent()`

```js
function Parent() {
  this.name = 'parent'
  this.play = [1, 2, 3]
}
function Child() {
  this.type = 'child'
}
Child.prototype = new Parent()


const s1 = new Child()
const s2 = new Child()

console.log(s1.play, s2.play) //  [1, 2, 3]  [1, 2, 3] 
s1.play.push(4)
console.log(s1.play, s2.play)  // [1, 2, 3, 4] [1, 2, 3, 4]
```

使用 `Child.prototype = new Parent()` 的缺点是，**子类实例的引用类型是公用的**，修改一个实例会引起另一个实例的改变。


### 4. 构造函数继承和原型继承的简单叠加

```js
function Parent(){
  console.log('____')
  this.play = [1, 2, 3]
}
function Child() {
  Parent.call(this)
}

Child.prototype = new Parent()
const s1 = new Child()
const s2 = new Child()
console.log(s1.play, s2.play)
s1.play.push(4)
console.log(s1.play, s2.play)
```

简单的组合方式是，上述两种的相加。缺点是**父级构造函数执行了两次**。


### 5. `Child.prototype = Parent.prototype`


```js
function Parent() {
  
}
function Child() {
  Parent.call(this)
}

Child.prototype = Parent.prototype

const s = new Child()
console.log(s.constructor) // Parent
```


`Child.prototype = Parent.prototype` 的缺点是：
- 无法区分一个实例是哪个原型对象创建的。若强行使用过 `Child.prototype.constructor = Child`，会使得父类对象的 `contructor` 属性也是 `Child`，显然错误。
- 并且，当我们想要在子对象原型中扩展一些属性以便之后继续继承的话，父对象的原型也会被改写，因为这里的原型对象实例始终只有一个，这也是这种继承方式的缺点。



## 五、相关资料

1. [Object.create()](https://www.jianshu.com/p/28d85bebe599)
2. [Object.create() - MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
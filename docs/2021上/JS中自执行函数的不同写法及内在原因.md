常见的自执行函数的写法有以下几种：

```js
// 函数前添加感叹号
!function(){alert('123')}() // true

// 函数声明用括号包起来
(function(){alert('123')})() // true

// 括号位置放在最外层
(function(){alert('123')}()) // true
```

但是如果直接在函数声明后面加小括号，如下面的方式，解析器无法理解，就会报错。

```js
function a(){alert('123')}() // SyntaxError: unexpected_token
```

因为这样的代码混淆了函数声明和函数调用，以这种方式声明的函数`a`，就应该以`a()`的方式调用。

但是括号则不同，它将一个函数声明转化成了一个表达式，解析器不再以函数声明的方式处理函数a，而是作为一个函数表达式处理，也因此只有在程序执行到函数a时它才能被访问。

所以，**任何消除函数声明和函数表达式间歧义的方法**，都可以被解析器正确识别。比如：

```js
var i = function(){return 10}(); // undefined
1 && function(){return true}(); // true
1, function(){alert('123')}(); // undefined


!function(){alert('123')}() // true
+function(){alert('123')}() // NaN
-function(){alert('123')}() // NaN
~function(){alert('123')}() // -1


void function(){alert('123')}() // undefined
new function(){alert('123')}() // Object
delete function(){alert('123')}() // true
```

性能上，括号和加减号的方式相对更好，推荐使用。

参考：[function与感叹号](https://swordair.com/function-and-exclamation-mark/)
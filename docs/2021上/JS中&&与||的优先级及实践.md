## 1. 优先级

&& (逻辑与) 优先级高于||（逻辑或）

## 2. 逻辑与 &&

a && b ,如果 a 为 true，直接返回b，而不管b为true或者false 。

如果 a 为false，那么直接返回a。

```javascript
const a = 1 && 2 && 3; // 3 // 因为1 && 2，1为真，返回2；2 && 3， 2为真，返回3。
const b = 0 && 1 && 2; // 0
const c = 1 && 0 && 2; // 0
```

## 3. 逻辑或 ||

“||”运算遇到true就返回。

例如：a || b ,如果 a 为false，直接返回b，而不管b为true或者false 。

如果 a 为true，直接返回a，而不会继续往下执行。

```javascript
const a = 0 || 1 || 2; // 1
const b = 1 || 0 || 3; // 1
```

## 4. 一起使用

**return a && b || c**

1. 如果 a 是 false 则肯定返回 c；
2. 如果 a 是 true，b 是 true，则返回b；
3. 如果 a 是 true，b是false，返回c

```javascript
const a = 3 && 0 || 2;  // 2
const b = 3 && 4 || 0; // 4
const c = 0 && null || 4; // 4
```

**return a || b && c**

1. 根据优先级相当于先算 b && c ，然后和a 相或；
2. 如果a是true，则返回a，不论是b或c；
3. 如果a是false，b是false，返回b，
4. 如果a是false，b是true，返回c；

```javascript
const b = 3 || 0 && 2; // 3
const c = 0 || 2 && 3; // 3
const d = 0 || '' && 3; // ''
```

## 5. 应用

要取一个特别深的对象属性，比如 router.history.current.path，安全的取值方式之一是

```javascript
const relativePath = router && router.history && router.history.current && router.history.current.path || '';
```

因为 && 优先级大于 ||，当 router.history.current.path 存在时，返回该值，当该值不存在时返回 '';

这种写法的好处是不用 if 进行很深的判断，也不用加小括号包住前面的一堆。

## 6. 参考资料

- https://www.jb51.net/article/90189.htm
- https://www.cnblogs.com/abi-blog/p/5282779.html

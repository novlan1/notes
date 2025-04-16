## 1. 第一周

### 1.1. js 修改userAgent的方式

```js
navigator.userAgent = '' // 不管用
Object.assion(navigator, {userAgent: ''}) // 报错，不可redefine
```

方法：Object.defineProperty()
 
### 1.2. jest修改location.search报错 ：Not implemented: navigation (except hash changes)

应该同样采用`Object.defineProperty`的方式，同理，修改document也用劫持方式。
但可以直接修改hash，即`window.location.hash = ''`

### 1.3. 如何模拟setTimeout/setInterval，如何测试防抖？

相关API：`jest.useFakeTimer();  jest.runAllTimers();  jest.useRealTimers();`
还有`sinon.useFakeTimer().tick()`方式等模拟时间流逝
 
### 1.4. 如何模拟script和image的onload、onerror、onreadystatechange等方法

还是用`Obejct.defineProperty`的方式，操作对象不同：image是 `Image.prototype，script`是 `HTMLScriptElement.prototype`。

### 1.5. 测试报告5x、E、I分别是什么意思？

- 5x表示在测试中这条语句执行了 5 次；
- E是测试用例没有测试if条件为false时的情况(`else path not taken`)；
- I是测试用例没有测试if条件为true时的情况(`if path not taken`)；


## 2. 第二周

### 2.1. 如何测试手机摇动事件？

方法：用`eventEmitter`的on事件劫持`window.addEventListener`，而从可以通过event.emit事件来手动触发

### 2.2. mock用户模块和第三方模块的注意点

1. mock用户模块，需要指定，比如`jest.mock('utils/loader')`；
2. mock第三方也就是node_modules模块，不需要指定，只需要在node_modules同级目录下新建__mocks__文件夹，包含要mock的模块，比如`axios/vant`

### 2.3. comm库mock了axios，业务库执行单测时，如果有业务库A文件引用了comm库的B文件，而B文件又引用了axios，就会自动使用comm库的mock的axios，且报错信息有误导，不易排查

方法：业务库的单测中，要手动解除mock，即`jest.unmock('axios')`

### 2.4. vuex只有加上namespaced：true后，才能用login/getLoginInfo这种形式


### 2.5. 如何手动触发浏览器的事件，如cilck、touchmove等 ？

```js
const evObj = document.createEvent('Events');
evObj.initEvent(type, false, false);
okBtn.dispatchEvent(evObj);
```

### 2.6. Object.defineProperty如何定义嵌套结构，比如location.href劫持set

1. 先定义location => `Object.defineProperty(window, location, {})`
2. 再定义location.href => `Object.defineProperty(location, href, {})`

## 3. 第三周

### 3.1. vue-test-utils的setData不会改变引用地址

如果组件内两个变量已经指向了同一地址，setData的方式无法让其不相等，可以用`wrapper.vm.tempSelectRole = {}`改变值

### 3.2. 测试logic的最佳实践

要测试对某接口不同返回结果的处理，mock的网络框架，不要放在__mocks__中，因为接口过多，会让这个文件爆炸，难以维护。

可以采用`jest.mock('logic/api/post',() => ({}))`的方式进行动态模拟，把需要模拟的接口返回值、url、times放到一个map中，根据调用次数返回不同结果。

好处是：

1. 数据据和逻辑分离，容易维护
2. 可以抽取、封装公用逻辑

思路来源于官网API（代码如下），但是此例无法根据参数判断

```js
const myMockFn = jest
  .fn()
  .mockReturnValue('default')
  .mockReturnValueOnce('first call')
  .mockReturnValueOnce('second call');

// 'first call', 'second call', 'default', 'default'
console.log(myMockFn(), myMockFn(), myMockFn(), myMockFn());
```

### 3.3 测试函数抛出异常

```js
test('throws on octopus', () => {
  expect(() => {
    drinkFlavor('octopus');
  }).toThrow();
});
```

### 3.4 toEqual可以对比对象 数组, toBe不可以，一般测试对象的几个属性的话，可以用toMatchObject


参考：

1. [去抖动功能的Jest单元测试(Jest unit test for a debounce function)](https://www.it1352.com/1068940.html)
2. [你如何使用Jest来测试img.onerror(How do you use Jest to test img.onerror)](https://www.it1352.com/1472892.html)
3. [JS中手动触发事件的方法](https://www.cnblogs.com/jiangxiaobo/p/5830200.html)

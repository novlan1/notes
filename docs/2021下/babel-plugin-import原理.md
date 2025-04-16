## 一、babel-plugin-import 原理

主要有3步：

1. 在`importDeclaration`节点处，收集依赖，就是获取`import { Button } from 'antd'`中的`Button`
2. 在`CallExpression`等节点处，判断该组件是否使用
3. 对于使用的UI组件，通过`addSideEffect/addNamed/addDefault`等方式增加额外的`css`导入语句。

## 二、babel-plugin-component


`babel-plugin-component`是`fork`的`babel-plugin-import`项目，二者原理、使用方式基本相同。

## 三、相关资料

1. [简单实现 babel-plugin-import 插件](https://juejin.cn/post/6905708824703795214)
2. [babel-plugin-component 和 babel-plugin-import区别](https://segmentfault.com/q/1010000022005673)


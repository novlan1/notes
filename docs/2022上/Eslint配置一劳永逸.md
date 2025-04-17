Eslint配置无非就是那几个选项，如果每次新建一个项目，都从0开始配置的话太麻烦，现在借助`eslint`的`extend`特性，可大大减少时间。

其实`@TTT/eslint-config-TTT`自己就是一个`extend`，但是它只提供了对JS的配置，如果项目中包含`ts/vue/react`等，还需要额外的依赖安装、配置。

此外，之前项目中有这种写法：

```js
// .eslintrc.js
module.exports = {
  extends: [
    '@TTT/eslint-config-TTT', '@TTT/eslint-config-TTT/ts'
  ],
};
```

这种写法的问题是，对JS文件也运用了ts的规则，比如`@typescript-eslint/prefer-optional-chain`等规则。对一个JS/TS混写的老项目，如果按照上面的配置，会有大量需要改写的内容。

优化方法就是借助`overrides`配置，该属性可以为某种类型的文件，进行额外的配置，比如：


```js
overrides: [
  {
    files: ['*.ts'],
    extends: ['./base.js', './ts.js'],
  },
]
```

对于vue/react文件，也是是类似的配置。

```js
overrides: [
  {
    files: ['*.jsx'],
    extends: ['./react.js', './base.js'],
  },
  {
    files: ['*.tsx'],
    extends: ['./react.js', './base.js', './ts.js'],
  },
  {
    files: ['*.vue'],
    extends: ['./base.js', './vue.js'],
  },
]
```

然后将上述配置发布到`npm`，使用的时候就很简单了：

```js
// .eslintrc.js
module.exports = {
  extends: ['xxx'],
};
```



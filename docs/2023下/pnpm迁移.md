## 1. 开始

`pnpm`意为`performant npm`，即性能更佳的`npm`。在时间和空间上，`pnpm`都有极大提升，快、更节省空间。另外，还顺便解决了幽灵依赖的问题。

社区主流库都迁移了`pnpm`，比如[vue](https://github.com/vuejs/core/pull/4766)、[vitejs](https://github.com/vitejs/vite/pull/5060)、[element-plus](https://github.com/element-plus/element-plus)。


## 2. 原理

`pnpm`通过软硬链接的方式存放依赖，`node_modules`下的第一层文件，指向`node_modules/.pnpm`中，而`node_modules/.pnpm`中的包，又以硬链接的方式指向全局`store`。

## 3. pnpm迁移

下面是项目迁移`pnpm`的步骤。

### 3.1. 安装pnpm

注意`node14`版本只能使用`pnpm7`及以下，参见[官网说明](https://pnpm.io/installation#compatibility)。

```bash
npm i pnpm -g
```

### 3.2. 生成pnpm-lock.yaml


使用项目中的`package-lock.json`文件生成`pnpm-lock.yaml`文件。

```bash
pnpm import
```

### 3.3. 删除node_modules


```bash
sudo rm -rf node_modules
```


### 3.4. 使用pnpm安装依赖


```bash
pnpm i
```


### 3.5. 解决幽灵依赖

幽灵依赖就是没有在`package.json`中，但是项目中，或者引用的包中使用到的依赖。

我们项目的幽灵依赖包括：

- vue-loader
- @types/jest
- js-base64
- tim-upload-plugin
- vue-plugin-load-script
- ...


## 4. 遇到的问题

### 4.1. loader-utils

`html-webpack-plugin`版本不能是`v0.x`版本，需要升级到`v1.x`，否则会因为`loader-utils`版本问题而报错：

```
Syntax Error: TypeError: loaderUtils.getOptions is not a function


 @ ./src/project/tgs/main.js 14:0-35 221:13-16
 @ multi ./node_modules/.pnpm/webpack-dev-server@3.11.3_webpack@4.46.0/node_modules/webpack-dev-server/client?https://192.168.1.17:443&sockPath=/sockjs-node (webpack)/hot/dev-server.js ./src/project/tgs/main.js
```

也不能是3，只能是1或者2。

### 4.2. PostCSS

报错：

```
Syntax Error: Error: PostCSS plugin autoprefixer requires PostCSS 8.
```

解决办法：

```bash
pnpm i autoprefixer@8.0.0 -D
```

```bash
pnpm i webpack@4.46
```

### 4.3. eslint解析Vue组件失败

报错：

```
invalid ecmaVersion
```

解决办法：

```js
// .eslintrc.js
parserOptions: {
  ecmaVersion: 12,
},
```

### 4.4. EISDIR: illegal operation

之前通过`npm`安装的包要删除之后，再执行`pnpm install`，否则会报错：

```
 EISDIR  EISDIR: illegal operation on a directory, read

```

### 4.5. miniprogram-ci

小程序的CI工具用pnpm的时候有问题，问了相关开发人员，目前并不支持。

https://developers.weixin.qq.com/community/develop/doc/000e284b7d4bc09b194d0748356800



### 4.6. vue-loader版本

`vue-loader`需要安装15版本，否则会报错：

```
Syntax Error: Error: @vitejs/plugin-vue requires vue (>=3.2.13) or @vue/compiler-sfc to be present in the dependency tree.
```

参考[这里](https://stackoverflow.com/questions/64117281/error-vue-loader-requires-vue-compiler-sfc-to-be-present-in-the-dependency-tr)


### 4.7. file-type

报错：

```
Error [ERR_REQUIRE_ESM]: Must use import to load ES Module
```

解决：

```bash
npm i file-type@16.5.3
```


参考：https://github.com/sindresorhus/file-type/issues/535


### 4.8. vue-jest

vue-jest@3.0.7版本安装失败，需要按照 vue-jest@4。

## 5. 效果对比


其实我们的流水线已经做了优化，会对比`package.json`的依赖是否相同，若不同才执行`npm install`。

但问题是多个分支使用的是同一条流水线，而不同分支上的依赖很有可能不同，比如`press-ui`就处于持续迭代阶段，所以用`pnpm`优化还是有必要的。

全量安装的话，能节省`90s`左右，之前耗时：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_c1021396214509dde6.png" width="300">

现在：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2023/8/own_mike_7669daf7aa9fbb14dc.png" width="300">


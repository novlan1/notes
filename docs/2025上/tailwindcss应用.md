## 1. Vue3 uni-app 项目

`vite.config.ts`

```ts
import tailwindcss from 'tailwindcss';

import uniTailwind from '@uni-helper/vite-plugin-uni-tailwind';

export default defineConfig(){
  return {
    plugins: [
      uniTailwind(),
    ],
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
        ],
      },
    },
  }
}
```

`tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,tsx,vue}',
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    // 不需要 preflight，因为preflight主要是给 h5 的，小程序使用的独特的标签，导致preflight不起作用。
    // 如果你要同时开发小程序和 h5 端，你应该使用环境变量来控制它
    preflight: false,
  },
  plugins: [],
};
```

`App.vue`

```html
<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
</style>
```

## 2. Vue2 uni-app 项目

`vue.config.js`

```js
const { TailwindPlugin } = require('@ttt/webpack-plugin-tailwind');


module.exports = {
  configureWebpack: {
    plugins: [
      new TailwindPlugin(),
    ],
  },
}
```

`tailwind.config.js`


```js
module.exports = {
  content: ['./public/index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // darkMode: 'media',
  // separator: '__', // 兼容小程序，将 : 替换成 __
  theme: {
    // 兼容小程序，将默认配置里带 .和/ 清除
    // 如果有些属性你没有用到，请在 corePlugins 里禁用
    extend: {},
    // fontSize: {},
    // height: {},
    // inset: {},
    // screens: {},
    // spacing: {},
    // translate: {},
    // width: {},
  },
  variants: {},
  plugins: [],
  corePlugins: {
    // 兼容小程序，将带有 * 选择器的插件禁用
    preflight: false,
    // space: false,
    // divideColor: false,
    // divideOpacity: false,
    // divideStyle: false,
    // divideWidth: false,
  },
};
```

`postcss.config.js`

```js
module.exports = {
  plugins: [
    require('tailwindcss')({ config: './tailwind.config.js' }),
  ],
};
```

`App.vue`

```html
<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
</style>
```


## 3. Vue2 项目

Vue2 项目不支持 `postcss8` ？所以需要指定安装 `postcss7` 的版本。

```bash
npm install tailwindcss@npm:@tailwindcss/postcss7-compat @tailwindcss/postcss7-compat postcss@^7 autoprefixer@^9
```

在终端中输入代码 `npx tailwindcss init` 生成一个空的配置文件。也可以生成一个包含所有默认配置的配置文件 `npx tailwindcss init -fill`。

```bash
npx tailwindcss init # 空的
npx tailwindcss init -fill # 包含默认的
```

在项目的根目录下创建 `postcss.config.js` 文件

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

在 `main.js` 中添加以下代码

```js
import "tailwindcss/tailwind.css"
```

## 4. Vue3 项目

安装依赖

```bash
pnpm install -D tailwindcss postcss autoprefixer
```

`tailwind.config.js` 可以使用 `@type`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

新建 `src/styles/tailwind.css`


```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.ts` 中引入 `tailwindcss`

```ts
import "./styles/tailwind.css";
```

## 5. 其他

`VSCode` 插件 `Tailwind CSS IntelliSense`

名词解释：

- preflight，预设的基础样式，原本含义是“飞行前检查”，[示例](https://unpkg.com/tailwindcss@2.2.19/dist/base.css)

当在 CSS 中包含 `@tailwind base` 时，Tailwind 会自动注入 preflight。

## 6. 参考

1. [https://juejin.cn/post/7091578341194465317](https://juejin.cn/post/7091578341194465317)
2. [https://blog.csdn.net/zqd_java/article/details/136568490](https://blog.csdn.net/zqd_java/article/details/136568490)
3. [https://blog.csdn.net/amiaoyaofeixiang/article/details/134395717](https://blog.csdn.net/amiaoyaofeixiang/article/details/134395717)

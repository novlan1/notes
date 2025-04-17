## 1. vscode 插件

提效工具：`Tailwind CSS IntelliSense`

## 2. `pr-[.28rem]`

小程序中不能使用 `pr-[.28rem]` 这种，可以使用 `pr-1.12`，同时在`tailwind.config.js` 中配置下 `theme.extend.padding = {1.12: '.28rem'}`。

原因是`uni-app`会把`class`中的`[.`解析成`\[\`放到`wxss`中，导致编译错误。

小技巧：乘以`.25`就是除以 `4`，看到 `pr-1.28` 就想到 `1.28*0.25`，即 `1.28 / 4 = .32rem`

## 3. bg-url

`background-image` 在 `html` 中书写的时候不能带引号。下面是错误的

```html
class="
  bg-[url('https://image-1251917893.file.myqcloud.com/tip-project/pubg/pubg-match/manager-business-card/manager-card-select.png')]
"
```

下面是正确的

```html
class="
  bg-[url(https://image-1251917893.file.myqcloud.com/tip-project/pubg/pubg-match/manager-business-card/manager-card-select.png)]
"
```

带引号的类名，如果同时存在动态类名，在小程序下会编译不通过。

## 4. 动态类名

以下动态类名会丢失小数点：

```html
:class="[index === active ? 'w-11.2 h-6.4' : 'w-9.6 h-5.44']"
```

可以改成对象形式，而不是数组：

```html
:class="{'w-11.2 h-6.4': index === active, 'w-9.6 h-5.44': index !== active}"
```

## 5. box-shadow

`rgba`的颜色值中间不能加空格，不能用小数点的`rem`，下面是错误的：

```html
:class="{ 'shadow-[0_0.08rem_0.08rem_rgba(0, 0, 0, 0.16)]': index === active }"
```

下面是正确的

```html
:class="{ 'shadow-[0_4px_4px_rgba(0,0,0,0.16)]': index === active }"
```


持续更新...


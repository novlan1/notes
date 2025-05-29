
### 1. vscode 插件

提效工具：`Tailwind CSS IntelliSense`

### 2. `pr-[.28rem]`

小程序中不能使用 `pr-[.28rem]` 这种，可以使用 `pr-1.12`，同时在`tailwind.config.js` 中配置下 `theme.extend.padding = {1.12: '.28rem'}`。

原因是`uni-app`会把`class`中的`[.`解析成`\[\`放到`wxss`中，导致编译错误。

小技巧：乘以`.25`就是除以 `4`，看到 `pr-1.28` 就想到 `1.28*0.25`，即 `1.28 / 4 = .32rem`

### 3. bg-url

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

### 4. 动态类名

以下动态类名会丢失小数点：

```html
:class="[index === active ? 'w-11.2 h-6.4' : 'w-9.6 h-5.44']"
```

可以改成对象形式，而不是数组：

```html
:class="{'w-11.2 h-6.4': index === active, 'w-9.6 h-5.44': index !== active}"
```

### 5. box-shadow

`rgba` 的颜色值中间不能加空格，不能用小数点的 `rem`，下面是错误的：

```html
:class="{ 'shadow-[0_0.08rem_0.08rem_rgba(0, 0, 0, 0.16)]': index === active }"
```

下面是正确的

```html
:class="{ 'shadow-[0_4px_4px_rgba(0,0,0,0.16)]': index === active }"
```

### 6. border

设置 `border-bottom`:

```css
a {
  border-bottom: .02rem solid rgba(255, 255, 255, .10);
}
```

设置如下：

```html
<div class="
  border-0
  border-solid
  border-b-[rgba(255,255,255,.10)]
  border-b-0.08
">
</div>
```

需要设置一个 `border-0`，否则其他方向的边框也会有，不符合预期。另外，`tailwindcss` 中没有 `border-b-solid`。

### 7. 安全区

```html
pb-[calc(env(safe-area-inset-bottom)+70px)]
```

### 8. icon

涉及`icon`图标大小等会有权重问题，可以加`!`。

### 9. 剪裁

```html
[clip-path:polygon(0_0,100%_0,100%_100%,20%_100%)]
```


### 笔记

一些比较生僻的原子化样式

```html
<!-- 字体加粗font-来做的，不是text- -->
<div class="font-bold">font-</div>
<!-- 行高用leading- -->
<div class="leading-[32px] bg-[red]">line-height</div>
<!-- 字间距用tracking- -->
<div class="tracking-[10px]">tracking</div>
<!-- 单行溢出省略号用truncate -->
<div class="truncate w-[108px]">我们是明天的太阳，祖国的花朵，其实是牛马</div>
<!-- 多行省略号用line-clamp- -->
<div class="line-clamp-2 w-[108px]">我们是明天的太阳，祖国的花朵，其实是牛马</div>
```

一些使用上有一定技巧的原子化样式

```html
<!-- 二色渐变 -->
<div class="h-[30px] bg-gradient-to-r from-cyan-500 to-blue-500"></div>
<!-- 三色渐变 -->
<div class="h-[30px] bg-gradient-to-r from-[green] from-10% via-[red] via-50% to-[yellow] to-90%"></div>
<!-- 鼠标hover,按下样式 -->
<div class="w-full h-[30px] bg-[red] hover:bg-[green] active:bg-[yellow]"></div>
<!-- 父级鼠标hover,按下，子孙元素样式 -->
<div class="w-full h-[60px] flex items-center group bg-[green]">
  <div class="w-full h-[30px] bg-[red] group-hover:bg-[green] group-active:bg-[blue]"></div>
</div>
<!-- 对于自定义背景图得用bg-[url()],背景尺寸的得需要使用bg-[length宽_高] -->
<div class="w-[100px] h-[100px] bg-[url('https://placehold.jp/999999/ff4400/300x300.png?text=EXAMPLE')] bg-[length:100px_100px]"></div>
```

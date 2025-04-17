### 1. 基本元素

通过组件可以研究色彩。

Color Picker 组件最核心的两个部分是 `slider` 和 `saturation` 选择器，前者对应色彩模型中的 `Hue`, 后者对应 `Saturation` 和 `Value`。


[Hue](https://zh.wikipedia.org/wiki/%E8%89%B2%E7%9B%B8) 为色相，描述具体颜色，取值范围为 `0-360`，0和360都是红色。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_64ad49690b81f5ba56.png" width="600" />


[Saturation](https://zh.wikipedia.org/wiki/%E8%89%B2%E5%BA%A6) 为饱和度，又称色度或彩度，表示颜色接近光谱色的程度，取值范围为 `0-100%`。饱和度高低会影响色彩的明艳程度，如大红就比玫红更红，这就是说大红的饱和度要高。黑色、白色以及灰色是“色度=0”的颜色，这一点可以通过拖拽 `saturation` 面板，并观察下方值来验证。直白点理解，假设你有一种红色颜料和水，水加的越多，红色会越淡（饱和度低）；水加的少，红色就会浓（饱和度高）。


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_111a978ddc7a3ee69e.jpeg" width="500" />

Photoshop 中调节色度的效果；左上角为原始影像(来自维基百科)。

[Value](https://zh.wikipedia.org/wiki/%E6%98%8E%E5%BA%A6) 为明度，颜色的明亮程度，取值范围位 `0-100%`。明度是与同样亮的白色物体相比，某物的亮的程度。现实生活中素描作品就是明度的艺术，素描作品没有任何饱和度和色相属性。但通过明度却能将事物的细节展露无遗。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_47abdd52422894cc4f.png" width="500" />

### 2. RGB 颜色模型

[RGB 颜色模型](https://zh.wikipedia.org/wiki/%E4%B8%89%E5%8E%9F%E8%89%B2%E5%85%89%E6%A8%A1%E5%BC%8F)是我们熟知的颜色模型，通过三原色（红绿蓝）以不同的比例相加，可以得到各种色彩。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_69f6b5d8ba716f2550.png" width="500">

RGB颜色模型映射到一个立方体上。水平的x轴代表红色，向左增加。y轴代表蓝色，向右下方向增加。竖直的z轴代表绿色，向上增加。原点代表黑色，遮挡在立方体背面。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_f59184f97dbe3a502b.png" width="500" />

### 3. HSV 和 HSL 颜色模型

[HSL 和 HSV](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4) 都是将 RGB 色彩模型中的点表示在**圆柱坐标系**中的方法。这两种表示法试图做到比基于笛卡尔坐标系几何结构的 RGB 模型更加直观。

- HSL 即色相、饱和度、亮度（英语：Hue, Saturation, Lightness）。

- HSV 即色相、饱和度、明度（英语：Hue, Saturation, Value），又称 HSB，其中 B 即英语：Brightness。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_717fc64a95eb23b92c.png" width="600"/>

HSL（`a~d`）和HSV（`e~h`）。上半部分（a、e）：两者的3D模型截面。下半部分：将模型中三个参数的其中之一固定为常量，其它两个参数的图像。


### 4. HSV 和 HSL 的不同


在原理和表现上，HSL 和 HSV 中的 H（色相） 完全一致，但二者的 S（饱和度）不一样， L 和 V （明度 ）也不一样：

- HSV 中的 **S 控制纯色中混入白色的量**，值越大，白色越少，颜色越纯；
- HSV 中的 **V 控制纯色中混入黑色的量**，值越大，黑色越少，明度越高
- HSL 中的 **S 和黑白没有关系，饱和度不控制颜色中混入黑白的多寡**；
- HSL 中的 **L 控制纯色中的混入的黑白两种颜色**。

二者在数学上都是圆柱，但 HSV（色相、饱和度、明度）在概念上可以被认为是颜色的**倒圆锥体**（**黑点在下顶点，白色在上底面圆心**），HSL在概念上表示了一个**双圆锥体和圆球体**（**白色在上顶点，黑色在下顶点，最大横切面的圆心是半程灰色**）。注意尽管在 HSL 和 HSV 中“色相”指称相同的性质，它们的“饱和度”的定义是明显不同的。

下图是HSV:

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_f5a3cbffbc8b7a1660.jpeg" width="300"/>

下两图是HSL:

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_a69812784a87e5a400.png" width="300" />


实际应用场景上，拾色器大多用的是 HSV 模式，比如 Photoshop 和各类的前端组件。

看 Photoshop 的 HSV 颜色模型拾色器，如下图所示，HSV 的 V（明度）控制纯色中混入黑色的量，越往上，值越大，**黑色越少，颜色明度越高**。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_e54f05793756ea5bae.png" width="500" />

HSV 的 S（饱和度）控制纯色中混入白色的量，越往右，值越大，**白色越少，颜色纯度越高**。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_5c13fbc7cdc9c3c3f4.png" width="500" />


接下来看 Affinity Designer 的 HSL 颜色模型拾色器。如下图所示，Y 轴明度轴，从下至上，混入的黑色逐渐减少，**直到 50% 位置处完全没有黑色，也没有白色，纯度达到最高**。继续往上走，纯色混入的白色逐渐增加，**到达最高点变为纯白色，明度最高**。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_2a0f0bf052c7672d8f.png" width="500" />


RGB 模式更适合用于工业，HSV 和 HSL 更直观，符合直觉。

我们看到的试色器就是 HSV 圆锥一半的横截面，只不过黑色由一个点扩展成了一条线。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_92cf1a3e43e3e61813.png" width="500" />

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2024/10/own_mike_f2b500cc3a89932a2a.png" width="500" />

### 5. Press UI

[Press UI 组件库](https://h5.igame.qq.com/pmd-mobile.support.press-ui.press-ui/)已实现 Color Picker 组件，支持 `2*(n+1)` 端，即 Vue2 + Vue3，uni-app、非 uni-app。

### 6. 参考

- https://www.w3schools.com/colors/colors_hsl.asp
- https://zhuanlan.zhihu.com/p/67930839
- https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4
- https://blog.csdn.net/u010712012/article/details/85240100



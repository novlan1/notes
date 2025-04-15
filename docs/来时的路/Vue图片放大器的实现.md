介绍一个Vue的图片放大器插件v-image-preview，主要是利用了对图片transfrom和背景色的transition。

先看效果



实现的注意点：

要实现原地放大，就要拿到原来img标签的left和top，因为以后还要归位，以及它的naturalWidth、naturalHeight.

给图片设定基准宽度，然后设定transform比例，才能做到回归原来位置的效果

具体代码可参考：https://github.com/novlan1/v-image-preview

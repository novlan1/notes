## 异步拦截器

支持异步拦截器。改动较大，保险起见，不在原地修改，新建了v2。

支持异步拦截器后，可以支持以下内容：

- 可以选择微信/QQ登录，等待用户选择，然后发起请求
- 其他业务场景，如异步处理请求参数

## 微信/QQ选择

QQ内支持打开微信小程序，并支持切换QQ/微信登录。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_Xk6JWtGSyQZnmfin.jpg" width="300">

以和平赛场为例，支持情况如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/6/own_mike_ZYsdcknsmAAezzKH.png" width="600">

其他微信小程序想在QQ内打开时使用QQ登录，可以参考[这篇文档](https://doc.w.qq.com/doc/w3_AQQARgb8AOsUIV9oM3SQTG0ERPg9D?scode=AJEAIQdfAAoJXvYs45AcMAiQYjAHA)。

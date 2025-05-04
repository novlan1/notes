history 模式本地开发嵌套路由白屏解决，在`.env.local` 中增加配置 `VUE_APP_PUBLICPATH = /` 即可

如果设置为空字符串 (`''`) 或是相对路径 (`'./'`)，所有的资源都会被当成相对路径。嵌套路由比如 `/user/a`，会找 `user/xxx-js`，而不是 `xxx-js`

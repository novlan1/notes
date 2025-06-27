# HoK 商户赛国际化方案

介绍 HoK 商户赛国际化整体方案。整体原则：**通用、简单、自动化**。

## 1. 开始

分为几个模块，业务、组件库、component、后台等。

## 2. 业务

业务整体使用 `ti18n` 平台，主要作用：

1. 管理词条，包括上传、修改、下载
2. 发布词条到COS（CDN）

HoK 商户赛有个特点：

- url 中携带 `i18n` 关键字
- 页面中无需动态切换语言

所以这里采取：

- 先加载 `i18n` 文件，再调用 `createApp`，好处是一些非响应式的部分也能国际化

## 3. 组件库

组件库有自己的 `i18n` 方案，底层还是尝试调用 `window.app.$t`，否则用默认值。

## 4. component

`component` 使用 `pmd-tools` 的 `$t` 方法，底层一样尝试调用 `window.app.$t`，否则用默认值。

## 5. 后台

前端拿到当前语言，注入一个 `cookie`，传到后台，后台自己做 `i18n` 词条的管理。

## 6. 图片等静态资源

下面讨论的是涉及 `i18n` 的图片、脚本等资源。

### 6.1. 上传

UI开发将静态资源上传到一个单独仓库的某目录下。

- hok-match # 中文
- hok-match-en # 英文
- hok-match-ms # 马来语
- hok-match-id # 印尼语

四个目录相同的资源只用上传到`hok-match`中，不同的资源需要各自上传。

流水线会自动上传资源并刷新CDN。

### 6.2. js/ts/vue中使用

调用一个通用的方法，实现原理：

```ts
export function gImg(url) {
  const { lang } = checkI18n();

  let isI18n = false;
  if (lang && lang !== 'zh') {
    isI18n = true;
  }

  const ePath = isI18n
    ? `hok-match-${lang}`
    : 'hok-match';

  let cdnUrl = isI18n
    ? 'https://cdn.xxx.com/'
    : 'https://image-xxx.myqcloud.com/';

  return `${cdnUrl}${ePath}/${url}`;
}
```

### 6.3. scss中使用

调用一个 `mixin`。

```scss
@mixin bgUrl($picDist) {
  // 默认中文
  background-image: url('https://image-xxx.myqcloud.com/hok-match/' + $picDist);
  // 英文
  @at-root .lang-en & {
    background-image: url('https://cdn.xxx.com/hok-match-en/' + $picDist);
  }
  // 印尼语
  @at-root .lang-id & {
    background-image: url('https://cdn.xxx.com/hok-match-id/' + $picDist);
  }
  // 马来语
  @at-root .lang-ms & {
    background-image: url('https://cdn.xxx.com/hok-match-ms/' + $picDist);
  }
}
```

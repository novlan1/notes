# TDesign UniApp 大仓

## 架构

设计思路为，内部闭环，减少对现有子包影响，不入侵、不修改小程序部分。

```bash
.
├── packages/
│   ├── ...
│   ├── tdesign-uniapp/            # UNIAPP
│   │   ├── components/            # 组件
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   └── ...
│   │   ├── site/                  # 文档
│   │   ├── example/               # 示例
│   │   └── app/                   # APP
│   └── tdesign-uniapp-chat/       # CHAT
│       ├── components/            # 组件
│       │   ├── chat-list/
│       │   └── ...
│       └── site/                  # 文档
├── ...
└── package.json
```

## 开发 TDesign UniApp

开发文档和 H5

```bash
pnpm run uniapp -- dev
```

只启动 H5

```bash
pnpm run uniapp -- dev:h5
```

只启动文档

```bash
pnpm run uniapp -- site:dev
```

开发小程序

```bash
# 微信小程序
pnpm run uniapp -- dev:mp-weixin

# 支付宝小程序
pnpm run uniapp -- dev:mp-alipay

# 其他类似
```

微信小程序产物路径如下，其他小程序类似

```bash
packages/tdesign-uniapp/example/dist/dev/mp-weixin
```

开发 APP

1. `tdesign-miniprogram` 项目下执行 `pnpm run uniapp -- watch`
2. 打开 HBuilderX，导入 `packages/tdesign-uniapp/app` 项目
3. 运行，具体可参考 [uni-app](https://uniapp.dcloud.net.cn/tutorial/run/installSimulator.html) 文档

## 开发 TDesign UniApp Chat

TDesign UniApp Chat 和 TDesign UniApp 共用示例，文档独立。

开发文档命令：

```bash
pnpm run uniapp:chat -- site:dev
```

# 个人笔记

## 命令

```bash
# 依赖安装
pnpm install

# 开发
pnpm run docs:dev

# 打包
pnpm run docs:build

# 检查是否有未注册在 sidebar.json 的文档
pnpm run check
```

## 注意事项

- 不可出现未闭合的标签，否则打包异常
- 不可出现预期以外的双大括号，如 `{{foo}}`，否则打包异常
- 执行 `ESlint` 相关命令时，需先注释掉 `package.json` 中的 `"type": "module"`。

## TDesign

```sh
# vue2-hx 打包产物复制到 docs 分支，并 git push
npm run td:hx:vue2

# vue3-hx 打包产物复制到 docs 分支，并 git push
npm run td:hx:vue3

# starter 相关项目安装最新依赖
npm run td:deps

# starter 相关项目安装某次 PR 依赖（pkg.pr.new/）
npm run td:deps --pr 1
```

@tdesign/uniapp 发布 checklist

1. tdesign-uniapp-starter, tdesign-uniapp-starter-apply，tdesign-uniapp-starter-vue2-cli
    - 更新构建无问题
    - H5 需要发到 `github pages`，点开看看
    - 小程序需要发到开发者工具，点开看看
2. tdesign-uniapp-starter-vue3-hx, tdesign-uniapp-starter-vue2-hx
    - tdesign-uniapp-starter-vue3-hx 需要执行 `npm run init`，进行 `replace-alias`
    - 更新构建无问题
    - H5 需要在 HX 中构建，然后 `notes` 下执行 `npm run td:hx:vue2` 和 `npm run td:hx:vue`
    - H5 发布到 `github pages`，点开看看

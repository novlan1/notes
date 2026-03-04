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
npm run td:hx -- --vue2

# vue3-hx 打包产物复制到 docs 分支，并 git push
npm run td:hx -- --vue3

# starter 相关项目安装最新依赖
npm run td:deps

# starter 相关项目安装某次 PR 依赖（pkg.pr.new/）
npm run td:deps --pr 1
```

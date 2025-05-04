# 个人笔记

命令

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

注意事项

- 不可出现未闭合的标签，否则打包异常
- 不可出现预期以外的双大括号，如 `{{foo}}`，否则打包异常
- 执行 `ESlint` 相关命令时，需先注释掉 `package.json` 中的 `"type": "module"`。

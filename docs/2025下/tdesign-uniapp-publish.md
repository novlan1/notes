# TDesign UniApp 发布

## 发布 NPM

NPM 发布走流水线。

发布流程 https://docs.qq.com/doc/DSHhoc2tYa0xFU0pJ

产物路径：

```bash
# tdesign-uniapp
packages/tdesign-uniapp/npm_dist/

# tdesign-uniapp-chat
packages/tdesign-uniapp-chat/npm_dist/
```

## 发布插件

插件发布手动执行。

CHANGELOG 注意事项：

1. 不要用 🐞 🚧 这种图片，否则更新日志完全无法显示
2. 多个标题要换行，即第二个以及后面的 `####`
3. 最好用 `####`，不要用 `###`，否则会跟插件市场自己的标题同级

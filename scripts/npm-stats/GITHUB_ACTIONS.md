# GitHub Actions 配置指南

本文档说明如何配置 GitHub Actions 来自动运行 NPM 下载量统计脚本。

## 📋 工作流说明

工作流文件位置：`.github/workflows/npm-stats.yml`

### 触发条件

1. **定时触发**：每天早上 9:00（北京时间）自动执行
   - Cron 表达式：`0 1 * * *`（UTC 时间 01:00，即北京时间 09:00）
   
2. **手动触发**：可以在 GitHub Actions 页面手动运行

### 工作流程

1. 检出代码
2. 设置 Node.js 环境（版本 20）
3. 安装 pnpm
4. 安装项目依赖
5. 运行统计脚本
6. 发送结果到企业微信

## 🔧 配置步骤

### 第一步：添加 GitHub Secret

1. 打开 GitHub 仓库页面
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮
5. 添加以下密钥：
   - **Name**：`WX_ROBOT_KEY`
   - **Value**：你的企业微信机器人 Webhook Key（例如：`d7ac7b67-0960-4b15-a407-6d682ba77247`）
6. 点击 **Add secret** 保存

### 第二步：启用 GitHub Actions

1. 确保仓库的 Actions 功能已启用
2. 进入 **Actions** 页面
3. 如果是第一次使用，可能需要点击 "I understand my workflows, go ahead and enable them"

### 第三步：验证配置

提交代码后，工作流会自动生效。你可以：

1. 等待定时任务自动执行（每天早上 9 点）
2. 或者手动触发测试：
   - 进入 **Actions** 页面
   - 选择 **NPM Download Statistics** 工作流
   - 点击 **Run workflow** 按钮
   - 选择分支（通常是 `master` 或 `main`）
   - 点击绿色的 **Run workflow** 按钮

## 📊 查看执行结果

### 查看运行日志

1. 进入 **Actions** 页面
2. 点击具体的工作流运行记录
3. 查看每个步骤的执行日志
4. 如果成功，会在日志中看到 "✅ 消息发送成功！"

### 查看企业微信消息

如果配置正确，统计报告会自动发送到企业微信群。

## ⚙️ 自定义配置

### 修改执行时间

编辑 `.github/workflows/npm-stats.yml` 文件中的 cron 表达式：

```yaml
schedule:
  - cron: '0 1 * * *'  # UTC 时间 01:00，即北京时间 09:00
```

常用时间示例：
- 每天早上 9:00（北京时间）：`0 1 * * *`
- 每天中午 12:00（北京时间）：`0 4 * * *`
- 每天晚上 18:00（北京时间）：`0 10 * * *`
- 每周一早上 9:00（北京时间）：`0 1 * * 1`

### 修改统计的包列表

编辑 `scripts/npm-stats/npm-download-stats.js` 文件中的 `PACKAGES` 数组。

### 添加多个机器人

如果需要发送到多个企业微信群：

1. 在 GitHub Secrets 中添加多个 Key（如 `WX_ROBOT_KEY_1`、`WX_ROBOT_KEY_2`）
2. 修改脚本支持多个机器人

## 🐛 故障排查

### 问题 1：工作流没有自动执行

**可能原因**：
- GitHub Actions 未启用
- 仓库长期未活动（GitHub 会自动禁用）
- Cron 表达式错误

**解决方法**：
- 检查 Actions 是否启用
- 手动触发一次工作流
- 验证 cron 表达式是否正确

### 问题 2：消息发送失败

**可能原因**：
- `WX_ROBOT_KEY` 未配置或配置错误
- 机器人 Key 已过期
- 网络问题

**解决方法**：
- 检查 GitHub Secret 配置
- 重新获取机器人 Key
- 查看 Actions 日志中的错误信息

### 问题 3：依赖安装失败

**可能原因**：
- `package.json` 中的依赖版本问题
- npm 源访问问题

**解决方法**：
- 检查 `package.json` 配置
- 在工作流中添加 npm 源配置

## 📝 注意事项

1. **GitHub Actions 免费额度**：
   - 公开仓库：无限制
   - 私有仓库：每月 2000 分钟免费额度
   
2. **Cron 执行时间**：
   - GitHub Actions 的 cron 可能有几分钟的延迟
   - 使用 UTC 时间，需要转换为本地时间
   
3. **安全性**：
   - 不要在代码中硬编码机器人 Key
   - 使用 GitHub Secrets 存储敏感信息
   
4. **调试建议**：
   - 先手动触发测试
   - 查看完整的执行日志
   - 确认所有依赖都已正确安装

## 🎯 最佳实践

1. **定期检查**：定期查看 Actions 执行情况，确保正常运行
2. **日志监控**：如果连续失败，及时查看日志并修复
3. **版本管理**：保持依赖版本稳定，避免频繁更新
4. **备份方案**：可以同时配置本地 cron 作为备份

## 📚 相关资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Cron 表达式生成器](https://crontab.guru/)
- [企业微信机器人文档](https://developer.work.weixin.qq.com/document/path/91770)

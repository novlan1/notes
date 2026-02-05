# NPM 下载量统计脚本

这个脚本用于统计指定 npm 包的下载量，并通过企业微信机器人发送统计报告。

## 功能特性

- ✅ 统计每日（昨日）下载量
- ✅ 统计每周（近7天）下载量
- ✅ 统计每月（近30天）下载量
- ✅ 自动生成 Markdown 格式的统计报告
- ✅ 通过企业微信机器人发送报告
- ✅ 支持多个 npm 包同时统计
- ✅ 自动排序和趋势分析

## 使用方法

### 1. 配置环境变量

在运行脚本前，需要设置企业微信机器人的 Key：

```bash
export WX_ROBOT_KEY="your-robot-key-here"
```

或者在 `.env` 文件中配置：

```bash
WX_ROBOT_KEY=your-robot-key-here
```

### 2. 运行脚本

```bash
# 直接运行
node scripts/npm-stats/npm-download-stats.js

# 或者添加到 package.json 的 scripts 中
npm run stats
```

### 3. 定时任务

#### 方式一：使用 GitHub Actions（推荐）

项目已配置 GitHub Actions 工作流（`.github/workflows/npm-stats.yml`），会自动执行以下任务：

- **自动执行**：每天早上 9:00（北京时间）自动运行
- **手动触发**：在 GitHub Actions 页面可以手动触发运行
- **配置方法**：
  1. 在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加密钥
  2. 添加名为 `WX_ROBOT_KEY` 的 Secret，值为企业微信机器人的 Key
  3. 提交代码后，工作流会自动生效

**手动触发方式**：
1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "NPM Download Statistics" 工作流
3. 点击 "Run workflow" 按钮

#### 方式二：使用本地 Cron

可以使用 cron 或其他定时任务工具定期运行脚本：

```bash
# 每天早上 9 点执行
0 9 * * * cd /path/to/notes && node scripts/npm-stats/npm-download-stats.js
```

## 配置说明

### 修改统计的包列表

编辑 `npm-download-stats.js` 文件中的 `PACKAGES` 数组：

```javascript
const PACKAGES = [
  'press-ui',
  't-comm',
  'tdesign-uniapp',
  // 添加更多包...
];
```

### 企业微信机器人配置

1. 在企业微信群中添加机器人
2. 获取机器人的 Webhook Key
3. 设置环境变量 `WX_ROBOT_KEY`

## 报告示例

脚本会生成如下格式的报告：

```markdown
# NPM 下载量统计报告

> 统计时间：2026/02/05

## 📊 昨日下载量

| 包名 | 下载量 |
|------|--------|
| press-ui | 1,234 |
| t-comm | 567 |
| tdesign-uniapp | 890 |
| **总计** | **2,691** |

## 📈 近7天下载量

| 包名 | 下载量 |
|------|--------|
| press-ui | 8,640 |
| t-comm | 3,969 |
| tdesign-uniapp | 6,230 |
| **总计** | **18,839** |

## 📅 近30天下载量

| 包名 | 下载量 |
|------|--------|
| press-ui | 37,020 |
| t-comm | 17,010 |
| tdesign-uniapp | 26,700 |
| **总计** | **80,730** |

## 📊 趋势分析

- 昨日总下载量：2,691
- 近7天日均下载量：2,691
- 近30天日均下载量：2,691

🏆 **本月下载量冠军**：press-ui（37,020 次）
```

## 注意事项

1. NPM API 有速率限制，建议不要频繁调用
2. 如果未配置企业微信机器人 Key，报告会输出到控制台
3. 脚本会自动处理网络错误，失败的包下载量会显示为 0
4. 统计数据来自 NPM 官方 API，可能有延迟

## 依赖说明

- `https`: Node.js 内置模块，用于发起 HTTP 请求
- `t-comm`: 用于发送企业微信消息的工具库

## 故障排查

### 问题：消息发送失败

- 检查 `WX_ROBOT_KEY` 是否正确配置
- 检查网络连接是否正常
- 查看控制台输出的错误信息

### 问题：下载量显示为 0

- 检查包名是否正确
- 检查 NPM API 是否可访问
- 可能是该包在统计时间段内确实没有下载量

## 扩展功能

可以根据需要扩展以下功能：

1. 添加更多统计维度（如按版本统计）
2. 生成图表（使用 Chart.js 等库）
3. 保存历史数据到数据库
4. 添加同比、环比分析
5. 支持多个机器人同时发送

<!-- # COS 流：Git 与 COS 双向同步技术方案 -->

> 静态资源散落在各个 COS Bucket 里，没有版本记录、不能 Code Review、误删了也回滚不了——这是我们团队曾经面临的日常。为了解决这些问题，我们设计了一套名为 COS 流 的方案：以 Git 仓库为中心，打通 Git 与 COS 的双向同步链路，让管理静态资源像管理代码一样——有版本、可审查、能回滚。本文将介绍 COS 流的核心功能、实现原理与架构设计，以及它如何以「配置驱动」的思路，支撑起覆盖海内外 6+ 个 CDN 域名、16 种语言的全球化资源管理体系。

## 一、背景与痛点

在我们业务中，大量的静态资源（图标、字体、图片等）托管在腾讯云 COS（对象存储）上，并通过 CDN 加速分发。这些资源分布在多个 COS Bucket 中，覆盖海内外多个域名。

在日常开发中，我们遇到了以下痛点：

1. **资源管理困难**：COS 文件散落在各个 Bucket 中，缺乏统一的版本管理和变更追踪。
2. **协作效率低**：多人协作上传资源时，容易出现覆盖冲突，且无法进行 Code Review。
3. **无法回滚**：COS 本身不具备完善的版本控制能力，误操作后难以快速回退。
4. **图片质量参差不齐**：缺乏统一的图片压缩和质量控制流程。

## 二、方案概览——COS 流

**COS 流** 是一套以 **Git 仓库为中心**的 COS 资源管理方案，实现了 Git 与 COS 的**双向同步**：

```mermaid
graph LR
    A["开发者本地<br/>(Git Repo)"] -->|Git Push| B["Git 仓库<br/>(cos repo)"]
    B -->|自动同步| C["COS 存储<br/>(Bucket)"]
    C -->|"定时拉取 (pull-cos)"| B
```

核心理念：**用 Git 管 COS，像管代码一样管理静态资源**。

## 三、核心功能

### 3.1 Git → COS：推送同步

开发者将资源文件提交到 Git 仓库后，CI/CD 流水线自动将变更同步到对应的 COS Bucket。

- 仓库目录结构直接映射 COS 域名和路径
- 提交即发布，支持 Code Review

仓库目录结构如下：

```
cos/
├── .cos/
│   └── sync.config.js          # 同步配置文件
├── cdn.esports.x.com/     # 对应国内 COS Bucket
│   └── esports/
├── cdn.nes.x.com/         # 对应海外 COS Bucket
│   ├── h-match-en/
│   ├── h-match-ja/
│   ├── h-match-ko-HR/
│   ├── h-match-zh-CN/
│   ├── h-match-zh-HK/
│   └── ... (17 种语言)
├── cdn.p.esports.x.com/
│   ├── os-x/                    # X 赛事前端资源
│   │   ├── zh/                  # 中文（源语言）
│   │   ├── en/                  # 配置驱动自动同步
│   │   ├── de/
│   │   ├── fr/
│   │   └── ... (16 种语言)
│   ├── pmd-font/
│   └── pmd-icon/
├── image-x/            # 通用图片 Bucket
│   ├── general-match/
│   ├── pmd-icon/
│   ├── pmd-font/
│   └── igame/npm/
└── script/
    ├── compress/index.mjs       # 图片自动压缩
    └── link/index.js            # CDN 链接生成工具
```

### 3.2 COS → Git：反向拉取（pull-cos）

这是 COS 流中最核心的能力之一，由 `pull-cos.js` 实现。

**它解决的问题**：某些场景下（如运营后台上传、第三方工具写入），资源会直接写入 COS，而不经过 Git。`pull-cos` 脚本定时将 COS 中的增量文件拉取到 Git 仓库，确保 Git 仓库始终是资源的**唯一真实来源（Single Source of Truth）**。

### 3.3 图片自动压缩

利用 Git Hooks（husky + lint-staged），在提交图片时自动触发 TinyPNG 压缩：

```js
// package.json
"lint-staged": {
  "*.{png,jpg,jpeg}": "node script/compress/index.mjs"
}
```

压缩脚本的核心逻辑：
- 跳过小于 1KB 的文件（无需压缩）
- 使用 TinyPNG API 进行有损压缩
- 压缩后自动 `git add`，确保提交的是压缩后的版本
- 输出压缩率日志，方便追踪

### 3.4 海外多语言目录自动同步

COS 流通过**配置驱动**实现了海外多语言目录的自动同步。

以 X 赛事为例，前端只需将中文版本（`os-x/zh`）的资源部署一次，系统会根据 CDN 配置自动将资源同步到其他语言目录（`os-x/en`、`os-x/de`、`os-x/fr` 等）。整个过程完全在远程通过配置完成：

```json
// Rainbow 配置中心 - CDN 配置示例
{
  "bucket": "cdn-esports-1320306881",
  "region": "ap-singapore",
  "secretId": "x",
  "secretKey": "x",
  "cdnPrefix": "https://cdn.esports.t.com",
  "domainDir": "cdn.esports.t.com",
  "teo": {
    "zoneId": "zone-x"
  }
}
```

通过这样的配置，每个 COS Bucket 对应一个 CDN 域名和地域（region），流水线根据配置自动完成多语言资源的分发：

```
cdn.p.esports.x.com/os-x/
├── zh/          # 源语言（前端发布写入）
├── en/          # 配置驱动自动同步
├── de/
├── es/
├── fr/
├── id/
├── ms/
├── pt-BR/
├── ru/
├── th/
├── tr/
├── ur/
├── uz/
├── vi/
├── zh-HK/
└── zh-TW/       # 共 16 种语言
```

类似地，`cdn.nes.xglobal.com` 下的 `h-match-en`、`h-match-ja`、`h-match-ko-HR` 等 14 种语言目录，也是通过配置驱动完成多语言同步的。

**核心优势**：
- **零代码扩展**：新增语言只需在配置中添加对应的目录映射，无需修改任何代码
- **全球就近加速**：通过 `region` 配置（如 `ap-singapore`）实现海外资源就近存储和分发
- **统一管理**：所有多语言资源的同步配置集中在 Rainbow 配置中心，修改即时生效

### 3.5 CDN 链接生成工具

开发者提交资源后，可以快速获取 CDN/COS 地址：

```bash
# 输入文件路径，自动生成链接
node script/link/index.js image-x/pmd-icon/logo.png

# 输出:
# 文件: image-x/pmd-icon/logo.png
# CDN 地址: https://xxx.cdn.com/pmd-icon/logo.png
# COS 地址: https://image-x.cos.ap-guangzhou.myqcloud.com/pmd-icon/logo.png
```

## 四、pull-cos 实现原理

`pull-cos.js` 是 COS 流中**反向同步**的核心脚本，由蓝盾流水线定时执行。下面详细解析其实现原理。

### 4.1 整体流程

```mermaid
flowchart TD
    A[开始] --> B[从 Rainbow 获取密钥配置]
    B --> C[Clone Git 仓库到工作区]
    C --> D[读取 sync.config.js 配置]
    D --> E[遍历所有 COS 域名目录]
    E --> F{还有下一个目录?}
    F -->|是| G[匹配 CDN 信息]
    G --> H[按前缀列出 Bucket 文件]
    H --> I[逐个下载到 Git 工作区]
    I --> F
    F -->|否| J{有新文件?}
    J -->|是| K[Git Commit & Push]
    J -->|否| L[结束]
    K --> L
```

### 4.2 核心步骤解析

#### 步骤一：安全获取密钥

通过 **Rainbow 配置中心** SDK 动态获取各 COS Bucket 的密钥和 Git 仓库 Token，避免硬编码敏感信息：

```js
async function getCdnInfo() {
  const resp = await fetchRainbowConfigFromSdk({
    secretInfo: {
      appId: '...',
      userId: '...',
      secretKey: '...',
      envName: 'Default',
      groupName: 'secret',
    },
    key: 'cdn_info',
    sdk: require('@t/rainbow-node-sdk'),
  });
  // 返回 cdnList（各 Bucket 信息）和 gitWoaToken
}
```

密钥集中管理在 Rainbow 上，修改配置无需改代码、无需重新部署。

#### 步骤二：配置驱动的同步范围

通过 `.cos/sync.config.js` 配置需要同步的目录和前缀：

```js
module.exports = {
  getBucketLitPrefixList: {
    'cdn.esports.t.com': ['pmd-icon/', 'pmd-font/'],
    'cdn.nes.xglobal.com': ['pmd-icon/', 'pmd-font/'],
    'cdn.p.esports.x.com': ['pmd-icon/', 'pmd-font/'],
    'image-x': ['general-match/', 'pmd-icon/', 'pmd-font/', 'white/', 'igame/npm/'],
    // ...
  },
};
```

**扩展性**：新增 Bucket 或同步路径，只需修改配置文件，无需改动代码逻辑。

#### 步骤三：遍历与下载

对每个域名目录，脚本执行以下操作：

1. 根据域名在 CDN 列表中匹配对应的 Bucket 信息（secretId/secretKey/bucket/region）
2. 按配置的前缀调用 `getCosBucket` 列出文件列表
3. 逐个调用 `downloadCosObject` 下载文件到 Git 工作区对应路径
4. 自动创建不存在的目录结构

```js
async function pullOneCosObjects({ dir, cdnList, syncConfig }) {
  const cdnInfo = cdnList.find(item => item.domainDir === dir);
  const prefixList = syncConfig[dir];

  for (const prefix of prefixList) {
    const info = await getCosBucket({ ...cdnInfo, prefix });
    for (const content of info.Contents) {
      await downloadCosObject({ ...cdnInfo, key: content.Key, output: filePath });
    }
  }
}
```

#### 步骤四：自动提交

下载完成后，如果有新文件，自动 commit 并 push：

```js
function pushToGit(gitWoaToken) {
  doCommand('git add . && git commit -m "chore: pull cos [ignoreSyncToCos]"');
  doCommand(`git push https://private:${gitWoaToken}@git.woa.com/${repo}.git`);
}
```

> 注意 commit message 中包含 `[ignoreSyncToCos]` 标记，避免 Git → COS 的正向同步流水线被误触发，防止"同步循环"。

## 五、架构设计亮点

### 5.1 支持海内外多域名

COS 流天然支持多域名、多 Bucket 的海内外资源管理：

- 🇨🇳 国内：`cdn.esports.t.com`、`cdn.dfpcevos.igame.t.com`
- 🌍 海外：`cdn.nes.xglobal.com`（包含 h-match 的 14 种语言构建产物）
- 🎮 X：`cdn.p.esports.x.com`（`os-x/` 下覆盖 16 种语言目录）
- 🏠 网吧：`download.ecafe.game`

每个域名对应仓库中的一个顶层目录，结构清晰，互不干扰。

同时，COS 流通过 Rainbow 配置中心的 CDN 配置（bucket、region、domainDir 等），实现多语言资源的配置驱动分发——`os-x/zh` 自动同步到 16 种语言目录，`h-match` 构建出 14 种语言版本，全程无需修改代码（详见 3.4 节）。

### 5.2 高度可扩展

**"配置 > 代码"** 是核心设计原则：

| 扩展场景 | 操作方式 |
|---------|---------|
| 新增 COS Bucket | Rainbow 添加 CDN 配置 + `sync.config.js` 添加目录映射 |
| 新增同步前缀 | 仅修改 `sync.config.js` |
| 新增语言/地区 | 在对应目录下新建文件夹即可 |
| 调整压缩策略 | 修改 `script/compress/index.mjs` |

代码逻辑完全不需要变动，所有扩展都通过配置完成。

### 5.3 易维护

1. **密钥零硬编码**：所有敏感信息存储在 Rainbow 配置中心，统一管理、动态获取。
2. **依赖收敛**：核心工具函数封装在 `@t/t-comm` 中（`getCosBucket`、`downloadCosObject`、`fetchRainbowConfigFromSdk`、`execCommand`），脚本本身只负责编排逻辑。
3. **日志完善**：每个关键步骤都有日志输出，便于排查问题。
4. **防循环机制**：`[ignoreSyncToCos]` 标记避免双向同步死循环。
5. **流水线驱动**：由蓝盾流水线定时执行，无需人工干预。

## 六、价值总结

### 对团队的价值

| 维度 | 改善 |
|------|------|
| **版本管理** | COS 资源拥有完整的 Git 历史，支持 diff、blame、回滚 |
| **协作效率** | 资源变更走 MR 流程，支持 Code Review，避免覆盖冲突 |
| **质量保障** | 图片提交自动压缩，节省带宽和加载时间 |
| **运维成本** | 配置化管理，新增 Bucket 无需写代码 |
| **安全合规** | 密钥集中管理，Git 操作可审计 |

### 对业务的价值

1. **覆盖广**：统一管理国内外 6+ 个 CDN 域名的静态资源，支撑电竞赛事全球化运营。
2. **响应快**：开发者 Git Push 即可发布资源，链路简洁高效。
3. **可追溯**：每次资源变更都有 Git 记录，出问题时可秒级定位和回滚。
4. **降本增效**：自动压缩图片，实测平均压缩率 50%+，显著降低 CDN 流量成本。

## 七、总结

COS 流通过将 Git 作为 COS 资源管理的中枢，巧妙地解决了静态资源管理中版本控制、协作、质量、安全等多方面的痛点。其核心设计思路——**配置驱动、双向同步、流水线自动化**——使得方案在支持海内外多域名的同时，保持了高度的可扩展性和易维护性。

无论是新增一个 Bucket、扩展一种语言，还是调整压缩策略，都只需简单的配置修改，真正做到了**一次建设、持续复用**。

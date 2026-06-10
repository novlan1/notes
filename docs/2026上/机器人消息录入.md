```mermaid
sequenceDiagram
    participant User as 用户(企微群)
    participant Router as robot-knowledge-entry
    participant Parser as 消息解析器
    participant ConfigMatcher as 配置匹配器
    participant AI as AI Agent (claude)
    participant iWiki as iWiki API
    participant Robot as 企微机器人(webhook)

    User->>Router: 发送知识消息(@机器人)

    rect rgb(255, 248, 230)
        Note over Router,Parser: 消息解析(支持多种消息类型)
        Router->>Parser: 判断 msgtype
        alt mixed_message (图文混排)
            Parser->>Parser: parseMixedMessage()<br/>按原始顺序解析 text/image/file/video
            Parser-->>Router: {markdown(图文混排), textOnly, attachmentInfo}
        else image / file / video (单附件)
            Parser->>Parser: singleAttachmentToMarkdown()
            Parser-->>Router: {markdown, typeName}
        else text (纯文本)
            Parser-->>Router: {markdown, textOnly}
        end
    end

    Router-->>User: 立即返回空响应(5s限制)
    Router->>Robot: 推送"正在处理知识录入..."

    rect rgb(255, 240, 245)
        Note over Router,ConfigMatcher: 多机器人配置匹配
        Router->>ConfigMatcher: getConfigByWebhookKey(webhookUrl)
        ConfigMatcher->>ConfigMatcher: extractWebhookKey()<br/>从URL提取 ?key=xxx
        alt key 匹配成功
            ConfigMatcher->>ConfigMatcher: webhookKeyMap[key]
            ConfigMatcher-->>Router: {spacekey, robotDocParentId, paasid, paasTokenEnvName}
        else key 未匹配
            ConfigMatcher-->>Router: 使用第一个配置作为默认值(打印警告)
        end
    end

    Router->>Router: parseUserSpecifiedTitle(textOnly)<br/>检查是否指定标题

    rect rgb(240, 255, 240)
        Note over Router,AI: AI 智能提取
        Router->>AI: extractKnowledgeByAI(fullMarkdown, staffname, hasAttachments)
        Note right of AI: 提取标题/整理内容(保留图片Markdown)/生成标签
        AI-->>Router: {title, content, tags}
        Note over Router: 用户指定标题 > AI 提取标题
    end

    Router->>Router: 构建 KnowledgeEntry 条目

    rect rgb(230, 245, 255)
        Note over Router,iWiki: 发布到 iWiki(使用匹配的配置)
        Router->>iWiki: createIwikiDoc({spacekey, parentid, title, body, paasId, paasToken})
        Note right of iWiki: 通过 OA 网关<br/>api.sgw.woa.com/ebus/iwiki
        iWiki-->>Router: {code, data: {id, docid}}
        Router->>Router: 拼接文档链接 https://iwiki.woa.com/p/{id}
    end

    alt 发布成功
        Router->>Robot: 推送录入成功(标题/内容/附件/录入人/时间/iwiki链接)
        Robot-->>User: ✅ 知识录入成功！🔗 iwiki链接
    else 发布失败
        Router->>Robot: 推送错误消息
        Robot-->>User: ❌ 知识录入失败
    end
```

流程说明

1. **接收消息** → 用户在企微群中 @机器人 发送碎片化知识
2. **立即响应** → 先返回空响应满足企微 5s 限制，同时推送"正在处理"提示
3. **标题解析** → `parseUserSpecifiedTitle()` 检查用户是否用 `标题：xxx` 等格式指定了标题
4. **AI 提取** → 调用 `@tencent-ai/agent-sdk` 的 `query` 方法，让 AI 提取标题、整理内容、生成标签
5. **标题优先级** → 用户显式指定的标题 > AI 自动提取的标题
6. **发布到 iWiki**（蓝色高亮区域）：
   - 调用 `createIwikiDoc` API，通过 OA 网关 `api.sgw.woa.com/ebus/iwiki` 创建文档
   - 指定 `spacekey: 'robotKnot'`、`parentid` 父文档 ID、`bodymode: 'md'`
   - 获取返回的文档 `id`，拼接出 `https://iwiki.woa.com/p/{id}` 链接
7. **回复用户** → 通过 webhook 推送录入成功消息，包含标题、内容、录入人、时间和 **iwiki 文档链接**

多机器人配置映射关系

```mermaid
graph LR
    subgraph "企微群机器人"
        A["机器人A<br/>webhook key:<br/>d55cd1c9-..."]
        B["机器人B<br/>webhook key:<br/>a6d0ea4a-..."]
        C["机器人N<br/>webhook key: ..."]
    end

    subgraph "配置匹配 webhookKeyMap"
        M["extractWebhookKey()<br/>从 URL 提取 key"]
    end

    subgraph "iWiki 空间"
        W1["robotKnot 空间<br/>parentId: 4018268622"]
        W2["IGameFrontDevPlat 空间<br/>parentId: 4018270476"]
        W3["... 更多空间"]
    end

    A -->|webhookUrl| M
    B -->|webhookUrl| M
    C -->|webhookUrl| M
    M -->|"key=d55cd1c9..."| W1
    M -->|"key=a6d0ea4a..."| W2
    M -->|"key=新增..."| W3
```

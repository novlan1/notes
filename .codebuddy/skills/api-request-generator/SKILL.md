---
name: api-request-generator
description: 根据 Protobuf 协议生成 TypeScript 请求接口代码。当用户需要创建 API 请求方法、封装网络请求、使用 src/api 目录下的协议文件生成请求代码时触发此技能。适用于：(1) 根据 Proto URL 生成请求代码 (2) 根据 API 路径生成请求代码 (3) 根据 import 路径生成请求代码 (4) 批量生成多个请求方法。
---

# API Request Generator

## Overview

此技能用于基于 `src/api` 目录下的 Protobuf 协议文件，生成符合团队规范的 TypeScript 请求接口代码。

## 代码生成规范

### 标准格式

生成的请求方法必须遵循以下格式：

```ts
import { SetCyclePartitionTeamNumClient } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/SetCyclePartitionTeamNum.http';
import { type SetCycleParitionTeamNumReq, type SetCycleParitionTeamNumRsp } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/SetCyclePartitionTeamNum';

export function setCyclePartitionTeamNum(data: SetCycleParitionTeamNumReq): Promise<SetCycleParitionTeamNumRsp> {
  return SetCyclePartitionTeamNumClient.SetCyclePartitionTeamNum(data).then(res => res[0]);
}
```

### 关键规则

1. **Client 导入**：从带 `.http` 后缀的文件导入 Client
   - 路径格式：`src/api/.../XxxMethod.http`
   
2. **类型导入**：从不带 `.http` 后缀的同名文件导入类型
   - 使用 `type` 关键字导入：`import { type XxxReq, type XxxRsp }`
   - 同时导入请求类型 (`XxxReq`) 和响应类型 (`XxxRsp`)

3. **函数命名**：
   - 函数名为 `.http` 文件中导出方法名的首字母小写形式
   - 例如：`SetCyclePartitionTeamNum` → `setCyclePartitionTeamNum`

4. **返回值处理**：
   - 调用 Client 方法后使用 `.then(res => res[0])` 提取响应数据

## 工作流程

### 步骤 1：确定协议文件位置

根据用户提供的信息确定协议文件路径：

- **Proto URL**：`https://git.woa.com/itrpcprotocol/.../xxx.proto`
- **API 路径**：`/package.path/MethodName`
- **Import 路径**：`src/api/git.woa.com/itrpcprotocol/.../XXX`

<!-- ### 步骤 2：使用 MCP 工具获取协议

调用 `pb2code` MCP 工具获取最新的协议定义：

```
工具：pb2code
参数：
  - input: 协议 URL 或路径
  - requestName: 请求方法名称（可选）
``` -->

### 步骤 2：生成请求代码

根据协议文件信息生成符合规范的请求代码：

1. 确定 Client 导入路径（带 `.http` 后缀）
2. 确定类型导入路径（不带 `.http` 后缀）
3. 提取请求类型名和响应类型名
4. 生成函数名（方法名首字母小写）
5. 组装完整的请求方法代码

## 示例

### 示例 1：单个请求方法

用户输入：
> 帮我生成 QueryRecommendGameList 的请求方法

生成代码：
```ts
import { QueryRecommendGameListClient } from 'src/api/git.woa.com/itrpcprotocol/netbar/wb/wb_cgi/wb_cgi/QueryRecommendGameList.http';
import { type QueryRecommendGameListReq, type QueryRecommendGameListRsp } from 'src/api/git.woa.com/itrpcprotocol/netbar/wb/wb_cgi/wb_cgi/QueryRecommendGameList';

export function queryRecommendGameList(data: QueryRecommendGameListReq): Promise<QueryRecommendGameListRsp> {
  return QueryRecommendGameListClient.QueryRecommendGameList(data).then(res => res[0]);
}
```

### 示例 2：从 Proto URL 生成

用户输入：
> 根据 https://git.woa.com/itrpcprotocol/pc_esports/cgi_esports/blob/master/cadmin/cadmin.proto 生成 GetMatchList 请求

生成代码：
```ts
import { GetMatchListClient } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/GetMatchList.http';
import { type GetMatchListReq, type GetMatchListRsp } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/GetMatchList';

export function getMatchList(data: GetMatchListReq): Promise<GetMatchListRsp> {
  return GetMatchListClient.GetMatchList(data).then(res => res[0]);
}
```

## 注意事项

1. **始终使用 MCP 工具**：获取协议时必须调用 `pb2code` MCP 工具，确保协议是最新版本
2. **类型准确性**：请求和响应类型名称需要与协议文件中定义的一致
3. **路径正确性**：确保导入路径与项目中实际的文件路径匹配
4. **命名转换**：方法名首字母小写转换时注意保持其他字符不变

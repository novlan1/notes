使用 `src/api` 时，应该使用下面的格式生成请求方法。

```ts
import { SetCyclePartitionTeamNumClient } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/SetCyclePartitionTeamNum.http';
import { type SetCycleParitionTeamNumReq, type SetCycleParitionTeamNumRsp } from 'src/api/git.woa.com/itrpcprotocol/pc_esports/cgi_esports/cadmin/cadmin/SetCyclePartitionTeamNum';

export function setCyclePartitionTeamNum(data: SetCycleParitionTeamNumReq): Promise<SetCycleParitionTeamNumRsp> {
  return SetCyclePartitionTeamNumClient.SetCyclePartitionTeamNum(data).then(res => res[0]);
}
```

说明如下

1. 从 `src/api` 中带 `xxx.http` 的文件中引入具体的方法
2. 从不带 `xxx.http` 的文件中引入类型
3. 同时引入 `xxxReq` 和 `xxxRsp` 类型
4. 生成的请求函数的函数名，应该为 `xxx.http` 中导出的名称首字母小写

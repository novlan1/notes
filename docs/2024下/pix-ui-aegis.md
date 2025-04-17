## pix-ui 业务上报

核心逻辑暂时未沉淀，放在了 match-pix-ui 中。

### 设计思想

在入口文件（`main.tsx`）中引入、传入参数、初始化，封装上报方法，给业务使用。

### 初始化

初始化在 `main.tsx` 中：

```ts
import { AegisReport } from '../logic/report/aegis/index';


const AEGIS_KEY = 'SDK-abc';
AegisReport.init({
  aegisKey: AEGIS_KEY,
});
```

### 上报

示例如下：

```ts
import { AegisReport } from '../logic/report/aegis/index';


export async function reportCorePixUI() {
  // https://iwiki.a.com/p/4009876587
  await AegisReport.report?.({
    msg: 'appEnv',
    appId: GameletAPI.getAppID(),
    appKey: GameletAPI.getAppKey(),
    appName: GameletAPI.getAppName(),
  });

  await AegisReport.report?.({
    msg: 'GameletAPI',
    appId: GameletAPI.getAppID(),
    appKey: GameletAPI.getAppKey(),
    appName: GameletAPI.getAppName(),
    appVersion: GameletAPI.getAppVersion(),
    runtimeEnv: GameletAPI.getRuntimeEnv(),
    canUsePlatformAPI: GameletAPI.canUsePlatformAPI(),
    getIsProductEnvironment: GameletAPI.getIsProductEnvironment(),
    getPlatformDesc: GameletAPI.getPlatformDesc(),
    userdata: JSON.stringify(await GameletAPI.getUserData()),
    openArgs: GameletAPI.getOpenArgs(),
  });
}
```

上报文档可参考 https://iwiki.a.com/p/4009876587



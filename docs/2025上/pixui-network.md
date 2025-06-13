将 `pixui` 网路框架与 `pmd` 中的统一，好处是：

1. 方便维护，统一管理
2. 可以使用 `src/api` 子仓库

细节：

1. `webpack` 编译包含 `node_modules/pmd` 部分
2. `getConfig/setConfig` 都走 `pmd` 通用的，不走两份
3. `login/isTestEnv/isBrowser` 等走自己的，放到 `pmd-tools` 里
4. `packages/network/src/request/base/tipRequest.ts` 中 `this.doSend(param)` 用的还是 `param`，不是处理后的数据，意味着返回新对象没用，得改变旧对象
5. `mockLoginParams` 从环境变量中拿
6. `pixui` 项目之前 `typescript` 版本太低（3+），需升级到 5+

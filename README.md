# 个人笔记

## 命令

```bash
# 依赖安装
pnpm install

# 开发
pnpm run docs:dev

# 打包
pnpm run docs:build

# one 子项目（Vue3 应用，位于 one/ 目录，详见文末）
pnpm run one:install   # 安装 one 依赖
pnpm run one:dev       # 本地开发
pnpm run one:build     # 构建（内部会先合并数据）

# 检查是否有未注册在 sidebar.json 的文档
pnpm run check
```

## 注意事项

- 不可出现未闭合的标签，否则打包异常
- 不可出现预期以外的双大括号，如 `{{foo}}`，否则打包异常
- 执行 `ESlint` 相关命令时，需先注释掉 `package.json` 中的 `"type": "module"`。

## TDesign

```sh
# vue2-hx 打包产物复制到 docs 分支，并 git push
npm run td:hx:vue2

# vue3-hx 打包产物复制到 docs 分支，并 git push
npm run td:hx:vue3

# starter 相关项目安装最新依赖
npm run td:deps

# starter 相关项目安装某次 PR 依赖（pkg.pr.new/）
npm run td:deps --pr 1
```

@tdesign/uniapp 发布 checklist

1. 同步，有一次性同步，也可以实时同步
2. 构建
3. 验证

具体就是

1. tdesign-uniapp-starter, tdesign-uniapp-starter-apply，tdesign-uniapp-starter-vue2-cli
    - vue2-cli 可能需要同步 uniapp 中的 `pages.json`
    - 更新构建无问题
    - H5 需要发到 `github pages`，点开看看
    - tdesign-uniapp-starter-vue2-cli 需要执行 `npm run init`，进行引入路径修复
    - 小程序需要发到开发者工具，点开看看
    - tdesign-uniapp-starter 除了 push 到组织下外，还要 push 到个人账户下
2. tdesign-uniapp-starter-vue3-hx, tdesign-uniapp-starter-vue2-hx
    - 可能都需要同步 uniapp 中的 `pages.json`
    - tdesign-uniapp-starter-vue3-hx 需要执行 `npm run init`，进行 `replace-alias`
    - 更新构建无问题
    - H5 需要在 HX 中构建，然后 `notes` 下执行 `npm run td:hx:vue2` 和 `npm run td:hx:vue`
    - H5 发布到 `github pages`，点开看看
    - Vue3 hx 需要主仓库的 dist 文件（`npm run uniapp -- run release:prepare`），vue2 hx等不需要

<u>类型检查</u>

```bash
pnpm uniapp type-check
```

## 子项目：one（ONE·一个）

`one/` 是一个 Vue3 + Vite 子应用，抓取并展示「ONE·一个」的每日图文。

原为独立仓库 `novlan1/one`，已并入本仓（本仓 `.git` 1.5G < one 3.5G，故以本仓为底）。
线上地址随之变为 <https://novlan1.github.io/notes/one/>（构建 `base` 为 `/notes/one/`）。

### 数据策略（重要）

| 文件 | 说明 | 入库 |
|---|---|---|
| `one/src/logic/config/one-data.json` | 完整数据，`src/logic/one/get-data.ts` 直接 import，约 1.4MB / 5100 期 | ✅ 入库，fetch 后整体重写提交 |

> 体积：每有更新就整体重写这 1.4MB，约 **456MB/年**。
> 旧仓库 `.git` 涨到 3.5G 的主因是历史图片（`public/images/` 4582 张共 1.8G，占 69.9%），
> `one-data.json` 只占 24%（496 个版本 622MB）。图片没有迁移过来，
> 所以本仓只会有 json 这一项的增长。

命令：

```bash
pnpm run one:dev       # 开发
pnpm run one:build     # 构建（直接 vite build，无合并步骤）
pnpm run one:fetch     # 抓取最新一期 → 读改写 one-data.json
```

### 部署

`.github/workflows/build-demo.yml` 统一构建两个项目：

1. 构建 notes（仓库根）→ `.vitepress/dist`
2. 构建 one（`one/`）→ `one/dist`
3. 合并：`cp -r one/dist .vitepress/dist/one`
4. 整体部署到 Pages → `/notes/`（文档站）+ `/notes/one/`（应用）

数据更新由 `.github/workflows/one-fetch.yml` 每天 UTC 1:00（北京 9:00）定时抓取，
提交增量文件后自动触发上面的构建部署。

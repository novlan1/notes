# 📘 TDesign 新增 API 属性 SOP（跨机器可复用）

下面是一份**自包含、可复制到任意机器执行**的标准操作手册。复制走后照着做就行，不依赖本机环境状态。

---

## 0. 前置条件（一次性环境准备）

| 项 | 要求 | 安装命令 |
|---|---|---|
| Node.js | ≥ 18 | nvm/官网 |
| sqlite3 CLI | 任意版本 | macOS: `brew install sqlite`；Ubuntu: `apt install sqlite3` |
| 仓库 1 | `tdesign-api` | `git clone http://git.woa.com/tdesign/tdesign-api.git` |
| 仓库 2 | `tdesign-miniprogram` | `git clone http://git.woa.com/tdesign/tdesign-miniprogram.git` |
| 目录结构 | 两仓库必须**位于同一父目录**下（脚本通过 `path.resolve(cwd,'../')` 跨仓库写文件） | 例：`~/code/tdesign-api`、`~/code/tdesign-miniprogram` |
| 依赖安装 | 两仓库各自 `npm install` 一次 | — |

---

## 1. 概念地图（理解后才能精准操作）

```
┌─────────────────────────────────────────────────────────┐
│ tdesign-api 仓库（API 元数据中枢）                         │
│                                                         │
│  db/TDesign.db (SQLite)  ◄── 唯一真实数据源               │
│         ▲                                               │
│         │ HTTP 16001                                     │
│         │                                                │
│  packages/server (Koa)  ◄── 可视化平台 + download.js      │
│         ▲                          的数据源               │
│         │                                                │
│  packages/scripts/api.json  ◄── api:download 拉下的快照   │
│         │                                                │
│  packages/scripts/index.js  ──► 读 api.json 生成代码      │
└─────────┬───────────────────────────────────────────────┘
          │ finalProject 模式：写到 ../tdesign-miniprogram/
          ▼
┌─────────────────────────────────────────────────────────┐
│ tdesign-miniprogram 仓库（最终代码）                       │
│  packages/uniapp-components/<comp>/                     │
│   ├── props.ts    ← 自动生成                             │
│   ├── type.ts     ← 自动生成                             │
│   ├── README.md   ← 自动生成                             │
│   ├── README.en-US.md ← 自动生成                         │
│   └── <comp>.vue  ← 手改实现，使用/透传新属性              │
└─────────────────────────────────────────────────────────┘
```

**核心结论**：可视化平台只是 SQLite 的 GUI。**只要直接改 SQLite，效果完全等价。**

---

## 2. SQLite 编码字典（`t_api` 表）

| 字段 | 编码方式 | 取值 |
|---|---|---|
| `platform_framework` | **位掩码** | 1=Vue(PC), 2=React(PC), 4=Angular(PC), 8=Vue(Mobile), 16=React(Mobile), 32=Angular(Mobile), 64=Miniprogram, 128=UniApp。多平台相加（如全 Mobile = 8+16+64+128 = 216） |
| `field_type` | **单值** | 1=String, 2=Number, 4=Boolean, 8=Object, 16=Array, 32=Function, 64=Date |
| `field_category` | **单值** | 1=Props, 2=Events, 3=Slots, 4=Functions, 5=ReturnValue |
| `component` | 字符串 | 大驼峰，如 `ActionSheet`，**不带 `t-` 前缀** |
| `id` | 主键 | 用秒级 unix 时间戳：`date +%s` 或 `Math.floor(Date.now()/1000)` |
| `readonly` | tinyint | 固定填 `1`（表示锁定不让平台用户改） |
| 其他常用 | — | `field_default_value`='true'/'false'/具体值, `field_required`=0, `deprecated`=0 |

> 字段 `field_type_text` / `platform_framework_text` 在 SQLite 中**不存在**，是 server 导出时根据 map.json 翻译加上去的，所以 INSERT 时不用关心。

---

## 3. SOP 三步走

### Step 1 ▸ 在 `tdesign-api` 中插入 SQLite

```bash
cd <path-to>/tdesign-api

# 用变量明确语义（请按实际填写）
PROP_NAME="preventScrollThrough"
COMPONENT="ActionSheet"
PF_MASK=128                 # 仅 UniApp
TYPE_CODE=4                 # Boolean
DEFAULT_VAL="true"
DESC_ZH="防止滚动穿透，即不允许点击和滚动"
NEW_ID=$(date +%s)

sqlite3 db/TDesign.db "INSERT INTO t_api (
  id, platform_framework, component, field_category, field_name,
  field_type, field_default_value, field_enum, field_desc_zh, field_desc_en,
  field_required, event_input, create_time, update_time, event_output,
  custom_field_type, syntactic_sugar, readonly, html_attribute, trigger_elements,
  deprecated, version, test_description, support_default_value
) VALUES (
  $NEW_ID, $PF_MASK, '$COMPONENT', 1, '$PROP_NAME',
  $TYPE_CODE, '$DEFAULT_VAL', '', '$DESC_ZH', NULL,
  0, '', datetime('now','localtime'), datetime('now','localtime'), NULL,
  NULL, NULL, 1, 0, '',
  0, '', NULL, 0
);"

# 验证
sqlite3 db/TDesign.db "SELECT id, component, field_name, platform_framework, field_type, field_default_value FROM t_api WHERE component='$COMPONENT' AND field_name='$PROP_NAME';" -header
```

> 如果是事件 / 插槽，把 `field_category` 改成 2/3；如果有 `field_enum`、`custom_field_type`，按 api.json 里同类样例填写。

### Step 2 ▸ 启动 server + 跑生成脚本

```bash
# 终端 A：启动 API server（监听 127.0.0.1:16001，download.js 依赖它）
cd <path-to>/tdesign-api
npm run server

# 终端 B：跑生成
cd <path-to>/tdesign-api/packages/scripts
npm run api:docs <Component> "<Framework>" finalProject

# Framework 取值：
# Vue(PC) | VueNext(PC) | React(PC) | Angular(PC) |
# Vue(Mobile) | React(Mobile) | Miniprogram | UniApp
```

脚本会自动：
1. `api:download` → 通过 16001 拉最新 api.json（已包含你刚插入的记录）
2. 生成 4 个文件到 `<path-to>/tdesign-api/packages/tdesign-miniprogram/packages/<packageDir>/<comp>/`
   - 其中 `<packageDir>` 是 `components` / `pro-components` / `uniapp-components` / `uniapp-pro-components` 之一

> ⚠️ 注意路径：`tdesign-api` 通过 `path.resolve(cwd,'../')` 取到 `tdesign-api/packages/`，再寻找名为 `tdesign-miniprogram` 的子目录。所以生成的文件落在 `tdesign-api/packages/tdesign-miniprogram/...`，**不是**真正的 mp 仓库。

### Step 3 ▸ 同步到 `tdesign-miniprogram` + 改实现

```bash
# 假设两仓库同父目录
cd <path-to>/tdesign-api

PACKAGE_DIR="uniapp-components"   # or components / uniapp-pro-components / pro-components
COMP_DIR="action-sheet"           # 短横线命名

# 拷贝 4 个生成产物
cp packages/tdesign-miniprogram/packages/$PACKAGE_DIR/$COMP_DIR/{props.ts,type.ts,README.md,README.en-US.md} \
   ../tdesign-miniprogram/packages/$PACKAGE_DIR/$COMP_DIR/

# diff 确认（应为空 = 一致）
diff -r packages/tdesign-miniprogram/packages/$PACKAGE_DIR/$COMP_DIR/ \
        ../tdesign-miniprogram/packages/$PACKAGE_DIR/$COMP_DIR/
```

然后**手动编辑实现文件**（脚本只生成 props/type/README，不动 .vue/.ts 实现）：
- `<comp>.vue` 中：用 `props.xxx` 透传 / 使用新属性
- 如有指令式调用（`show()`），同步更新默认 options

---

## 4. 兜底方案（无法启动 server / 无 sqlite3 CLI）

如果环境受限**不能**走标准流程，可以纯手改 9 个文件，但**事后必须补 SQLite**，否则下次别人跑脚本会把你的手改全部覆盖：

| # | 文件 | 内容 |
|---|---|---|
| 1 | `tdesign-api/packages/products/tdesign-miniprogram/packages/<pkg>/<comp>/props.ts` | 加 prop |
| 2 | 同上 `type.ts` | 加字段 |
| 3 | 同上 `README.md` | 加表格行（kebab-case） |
| 4 | 同上 `README.en-US.md` | 加表格行 |
| 5–8 | `tdesign-miniprogram/packages/<pkg>/<comp>/` 下同名 4 个文件 | 同步 |
| 9 | `tdesign-miniprogram/packages/<pkg>/<comp>/<comp>.vue` 或 `.ts` | 实现透传/逻辑 |
| **10（必做）** | 回到任一台有 sqlite3 的机器，按 Step 1 补一条 INSERT | 防回滚 |

---

## 5. 校验清单（执行完跑一遍）

```bash
cd <path-to>/tdesign-miniprogram

# 1. 类型/Props/文档都包含新属性
grep -rn "<propName>" packages/<pkg>/<comp>/

# 2. lint 通过（产物不报错）
cd packages/<pkg> && npm run lint -- packages/<comp>/  # 视各包脚本而定

# 3. 类型检查通过
npx tsc --noEmit -p packages/<pkg>/tsconfig.json
```

---

## 6. 排错速查

| 现象 | 原因 | 解决 |
|---|---|---|
| `npm run api:download` 报 ECONNREFUSED 16001 | server 没起 | 终端 A 跑 `npm run server` |
| 平台/产物里看不到新属性 | 只改了 api.json 没改 SQLite，被 download 覆盖 | 回到 Step 1 改 SQLite |
| 生成的 README 写"|平台框架| -- |"是空的 | platform_framework 位掩码错 | 重新计算：mobile 全平台 = 216，仅 UniApp = 128 |
| 生成路径找不到 mp 仓库 | 两仓库不在同一父目录 | 重新放置目录或改用兜底方案 |
| `field_type_text` 显示 Unknown | field_type 编码错 | Boolean=4，Object=8，参考 §2 字典 |

---

## 7. 一行总结

> **改 SQLite → 起 server → 跑 `api:docs` → 拷贝产物 → 改实现**。把 SQLite 当数据库的"主键源"，永远不要绕开它直接改 api.json，否则下次同步会被洗回去。

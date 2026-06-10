<!-- # TDesign E2E —— 一套配置驱动、可扩展的端到端测试框架 -->
<!-- 引言: 配置驱动，零代码测试，高度可维护性，AI 工具辅助生成配置 -->

## 1. 项目背景

[TDesign](https://tdesign.tencent.com/) 是腾讯开源的企业级设计体系，覆盖了 Vue Next、UniApp、小程序、Mobile Vue 等多个技术栈，其官网承载着大量组件文档页面。随着站点规模增长，一个核心风险始终存在——**页面发布后白屏**或**关键元素丢失**。手工巡检不现实，传统的单元测试又覆盖不到真实浏览器的渲染链路。

[tdesign-e2e-test](https://github.com/TDesignOteam/tdesign-e2e-test) 正是为解决这一问题而设计的：基于 **Puppeteer + Jest**，通过 **纯配置驱动** 的方式，让开发者只需编写 JSON 风格的配置对象，即可自动生成完整的 E2E 测试用例，**零测试代码编写**。

---

## 2. 整体架构

项目采用 **"配置层 → 引擎层 → 工具层"** 三层架构，各层职责清晰、互不耦合：

```mermaid
graph TB
    subgraph 配置层["📂 配置层 (tests/config/)"]
        types["types.ts<br/>类型定义"]
        modules["modules/<br/>模块化配置"]
        entry["pages.config.ts<br/>配置汇总入口"]
        modules --> entry
        types -.-> modules
    end

    subgraph 引擎层["⚙️ 引擎层 (tests/)"]
        spec["tdesign.spec.ts<br/>测试引擎<br/>自动遍历配置 → 生成用例"]
    end

    subgraph 工具层["🔧 工具层 (tests/utils/)"]
        helpers["helpers.ts<br/>白屏检测 / 元素检测<br/>Shadow DOM 穿透<br/>操作执行器"]
    end

    subgraph CI["🚀 CI/CD"]
        workflow["GitHub Actions<br/>定时 + Push 触发"]
        notify["scripts/notify.ts<br/>企业微信机器人通知"]
        workflow --> notify
    end

    entry --> spec
    spec --> helpers
    spec --> CI
```

### 2.1. 配置层：声明式描述"测什么"

配置层是用户唯一需要关注的部分。核心类型 `PageConfig` 定义了一个测试用例的完整描述：

```typescript
interface PageConfig {
  name: string;                // 用例名称
  url: string;                 // 目标页面
  whiteScreenCheck?: boolean;  // 是否白屏检测
  expectedSelectors?: string[];// 期望存在的元素
  actions?: PageAction[];      // 操作序列（点击/悬浮/导航/滚动/输入）
  afterActionCheck?: AfterActionCheck; // 操作后校验
  viewport?: { width; height };// 自定义视口
  skip?: boolean;              // 跳过标记
}
```

使用者只需填写配置对象，**不需要编写任何 `test()`、`expect()` 代码**。框架会自动将每条配置映射为一个独立的 Jest 测试用例。

### 2.2. 引擎层：自动化遍历 + 用例生成

`tdesign.spec.ts` 是整个框架的"心脏"，核心逻辑仅约 120 行，但完成了以下工作：

1. **启动浏览器**：`beforeAll` 中初始化 Puppeteer，CI 环境自动切换 headless 模式
2. **遍历配置、生成用例**：`for (const pageConfig of pagesConfig)` 循环，为每条配置动态生成 `test()`
3. **标准化测试流程**：每个用例按统一管线执行——设置视口 → 注册错误收集 → 访问页面 → 等待网络空闲 → 白屏检测 → 元素检测 → 执行操作 → 操作后校验
4. **资源管理**：每个用例独立开启/关闭 Page，`afterAll` 中关闭浏览器，杜绝内存泄漏

这种设计让引擎层成为"不可变的骨架"——**新增测试用例永远不需要修改引擎代码**。

### 2.3. 工具层：对抗 Web Components 的深度穿透

TDesign 官网大量使用了 Web Components + Shadow DOM（如 `<td-header>`、`<td-doc-layout>`），传统的 `document.querySelector` 无法穿透 Shadow DOM 边界。

`helpers.ts` 中实现了一套 **递归穿透 Shadow DOM 的选择器引擎**，这是整个项目最有技术含量的部分：

```
deepQuerySelector(page, selector)
│
├── 普通选择器 ".TDesign-header"
│   └── 递归遍历所有 ShadowRoot + Slot 分发内容
│
└── 穿透组合选择器 "td-header >>> .TDesign-header-nav"
    └── 按 ">>>" 分段，逐层进入 Shadow DOM
```

此外，`waitForVisible()` 实现了轮询等待机制，不仅检查元素存在，还验证其真实可见性（`getBoundingClientRect` + `getComputedStyle`），避免 `display:none` 或零尺寸元素的误判。

**白屏检测** 采用 4 层递进策略：

| 层级 | 检测项 | 目的 |
|------|--------|------|
| 1 | `body.children.length > 0` | 排除完全空白页 |
| 2 | `body.innerHTML.length > 50` | 排除仅有空标签壳 |
| 3 | 递归穿透 Shadow DOM 找可见内容 | 排除 Web Components 内部白屏 |
| 4 | 检查 SPA 根挂载点 + 自定义元素 | 排除框架未挂载 |

四层策略相互补充，既能检测传统 SPA 白屏，也能覆盖 Web Components 场景。

---

## 3. 灵活的配置方式

### 3.1. 五种操作类型覆盖主流交互

框架内置了 5 种操作类型，通过组合使用可以模拟几乎所有用户交互场景：

| 类型 | 用途 | 关键参数 |
|------|------|----------|
| `click` | 点击元素，支持自动等待导航 | `selector` |
| `hover` | 鼠标悬浮，验证浮层/下拉菜单 | `selector` |
| `navigate` | SPA 路由跳转 | `targetUrl` |
| `scroll` | 页面滚动，测试懒加载 | `scrollY` |
| `input` | 文本输入，测试搜索/表单 | `selector` + `inputValue` |

操作支持 `waitBefore` / `waitAfter` 精细控制时序，也支持链式组合——先滚动、再点击、再输入，一气呵成。

### 3.2. Shadow DOM 穿透选择器

针对 Web Components，框架设计了直观的 `>>>` 穿透语法：

```typescript
// 先找到 <td-header>，进入其 Shadow DOM，再找 .TDesign-header-nav
selector: 'td-header >>> .TDesign-header-nav'
```

普通选择器则自动递归穿透所有层级的 Shadow DOM，开发者无需关心元素在哪一层。

### 3.3. 操作后校验

每条配置可以附带 `afterActionCheck`，在操作执行后自动验证：

- **白屏检测**：操作后页面是否正常渲染
- **元素检测**：操作后目标元素是否出现
- **URL 校验**：通过正则匹配验证跳转是否正确

---

## 4. 可扩展性设计

### 4.1. 模块化拆分

配置按 TDesign 子站拆分为独立模块，存放在 `tests/config/modules/` 目录下：

```
modules/
├── index.ts           ← 统一导出
├── home.ts            ← 官网首页
├── uniapp.ts          ← UniApp
├── miniprogram.ts     ← 小程序
├── vue-next.ts        ← Vue Next (桌面端)
└── mobile-vue.ts      ← Mobile Vue (移动端)
```

`pages.config.ts` 作为汇总入口，通过展开运算符合并所有模块：

```typescript
const config: PageConfig[] = [
  ...homePages,
  ...uniappPages,
  ...miniprogramPages,
  ...vueNextPages,
  ...mobileVuePages,
];
```

### 4.2. 新增模块只需 3 步

以新增 React 模块为例：

1. **创建** `modules/react.ts`，导出 `PageConfig[]` 数组
2. **注册** 在 `modules/index.ts` 中添加一行 `export`
3. **合并** 在 `pages.config.ts` 中展开 `...reactPages`

整个过程不需要修改引擎代码、不需要新建测试文件、不需要改动 CI 配置。

### 4.3. 新增操作类型

如果未来需要支持新的交互（如拖拽、长按），只需：

1. 在 `PageAction.type` 联合类型中新增枚举值
2. 在 `helpers.ts` 的 `executeActions` 中新增 `case` 分支

引擎层和配置层完全不受影响，体现了 **开闭原则（OCP）**。

---

## 5. 易维护性

### 5.1. TypeScript 全链路类型安全

从配置定义到引擎消费，全程 TypeScript 强类型。`PageConfig` 接口确保：

- 拼错字段名 → 编译报错
- 遗漏必填字段 → 编译报错
- `action.type` 传入未知值 → 编译报错

类型系统充当了"活文档"，开发者阅读接口定义即可理解所有配置项。

### 5.2. 配置与代码完全解耦

这是项目最核心的设计理念：**测试逻辑是稳定的框架代码，测试内容是可变的配置数据**。

- 新增页面？→ 只改配置
- 页面改版？→ 只改选择器
- 新增检测维度？→ 只改工具函数

三个变更方向互不干扰，团队中不同角色可以并行工作。

### 5.3. 自动化 CI/CD + 告警闭环

项目集成了 [GitHub Actions 工作流](https://github.com/TDesignOteam/tdesign-e2e-test/actions)，实现了完整的自动化闭环：

```mermaid
graph LR
    A["⏰ 定时触发<br/>每 10 分钟"] --> B["🧪 执行 E2E 测试"]
    C["📦 master Push"] --> B
    D["🖱️ 手动触发"] --> B
    B -->|通过| E["✅ 上传测试报告"]
    B -->|失败| F["📤 企业微信通知<br/>失败用例 + Actions 链接"]
    F --> E
```

`notify.ts` 通知脚本会自动解析 Jest JSON 输出，提取失败用例的名称和错误信息，格式化为 Markdown 消息推送到企业微信，包含直达 Actions 日志的链接。

### 5.4. 容错设计

框架在多处做了容错处理，保证单个用例失败不会拖垮整个测试：

- `networkIdle` 超时不阻塞测试（`.catch(() => {})`）
- 导航超时静默处理（适应 SPA 无导航场景）
- 每个用例独立开启/关闭 Page，`finally` 块确保资源释放
- 控制台错误仅记录告警，不直接判定失败
- `skip` 标记支持临时跳过不稳定用例

---

## 6. 🔍 核心检测流程

### 6.1. 白屏检测流程

白屏检测通过 4 层递进策略判断页面是否正常渲染，任一层检测失败即判定为白屏：

```mermaid
flowchart TD
    Start(["开始白屏检测"]) --> Step1{"1️⃣ body.children.length > 0？"}

    Step1 -->|❌ 无子元素| Fail1["❌ 判定白屏<br>页面 body 没有子元素"]
    Step1 -->|✅ 有子元素| Step2{"2️⃣ body.innerHTML.length > 50？"}

    Step2 -->|❌ 内容过短| Fail2["❌ 判定白屏<br>页面内容长度过短"]
    Step2 -->|✅ 内容充足| Step3{"3️⃣ 存在可见内容？<br>递归穿透 Shadow DOM 检查：<br>文字 / 图片 / canvas / svg / video"}

    Step3 -->|❌ 无可见内容| Fail3["❌ 判定白屏<br>页面没有可见内容"]
    Step3 -->|✅ 有可见内容| Step4{"4️⃣ 存在应用根挂载点？<br>#app / #root / #__nuxt / #__next<br>或 Web Components 自定义元素"}

    Step4 -->|❌ 无挂载点| Fail4["❌ 判定白屏<br>找不到应用根挂载点"]
    Step4 -->|✅ 有挂载点| Pass(["✅ 白屏检测通过"])

    style Fail1 fill:#ffcccc,stroke:#cc0000
    style Fail2 fill:#ffcccc,stroke:#cc0000
    style Fail3 fill:#ffcccc,stroke:#cc0000
    style Fail4 fill:#ffcccc,stroke:#cc0000
    style Pass fill:#ccffcc,stroke:#009900
```

### 6.2. 元素丢失检测流程

元素检测支持 Shadow DOM 穿透查找，通过轮询等待机制确保元素可见：

```mermaid
flowchart TD
    Start(["开始元素丢失检测<br>expectedSelectors 列表"]) --> Loop{"遍历每个 selector"}

    Loop --> WaitVisible["waitForVisible<br>超时时间：10s，轮询间隔：300ms"]

    WaitVisible --> DeepQuery["deepQuerySelector<br>递归穿透 Shadow DOM 查找元素"]

    DeepQuery --> Found{"元素存在？"}
    Found -->|❌ 未找到| Retry{"是否超时？"}
    Retry -->|未超时| Sleep["等待 300ms"] --> DeepQuery
    Retry -->|已超时 10s| Fail["❌ 检测失败<br>期望元素不存在或不可见"]

    Found -->|✅ 找到| CheckVisible{"元素可见？<br>rect.width > 0<br>rect.height > 0<br>visibility ≠ hidden<br>display ≠ none<br>opacity ≠ 0"}

    CheckVisible -->|❌ 不可见| Retry
    CheckVisible -->|✅ 可见| Next{"还有下一个 selector？"}

    Next -->|是| Loop
    Next -->|否| Pass(["✅ 所有元素检测通过"])

    style Fail fill:#ffcccc,stroke:#cc0000
    style Pass fill:#ccffcc,stroke:#009900
```

### 6.3. 执行操作序列流程

操作序列按配置顺序逐一执行，支持 5 种操作类型和时序控制：

```mermaid
flowchart TD
    Start(["开始执行操作序列<br>actions 列表"]) --> Loop{"遍历每个 action"}

    Loop --> WaitBefore{"waitBefore > 0？"}
    WaitBefore -->|是| DelayBefore["⏳ 等待 waitBefore 毫秒"] --> Switch
    WaitBefore -->|否| Switch

    Switch{"action.type"} -->|click| Click
    Switch -->|hover| Hover
    Switch -->|navigate| Navigate
    Switch -->|scroll| Scroll
    Switch -->|input| Input

    subgraph Click ["🖱️ click 操作"]
        C1["waitForVisible 等待元素可见"] --> C2["deepQuerySelector 穿透查找"]
        C2 --> C3["scrollIntoView 滚动到视口"]
        C3 --> C4["计算元素中心坐标"]
        C4 --> C5["page.mouse.click 真实鼠标点击"]
        C5 --> C6{"是 a 标签 / 有 href？"}
        C6 -->|是| C7["等待导航完成 + 网络空闲"]
        C6 -->|否| C8["等待 1s 渲染"]
    end

    subgraph Hover ["🎯 hover 操作"]
        H1["waitForVisible 等待元素可见"] --> H2["deepQuerySelector 穿透查找"]
        H2 --> H3["获取元素中心坐标"]
        H3 --> H4["page.mouse.move 移动鼠标"]
    end

    subgraph Navigate ["🔀 navigate 操作"]
        N1["page.goto targetUrl"]
        N1 --> N2["等待 domcontentloaded"]
    end

    subgraph Scroll ["📜 scroll 操作"]
        S1["window.scrollBy<br>滚动 scrollY 像素（默认 500）"]
    end

    subgraph Input ["⌨️ input 操作"]
        I1["waitForVisible 等待元素可见"] --> I2["deepQuerySelector 穿透查找"]
        I2 --> I3["focus 聚焦 + 清空内容"]
        I3 --> I4["page.keyboard.type 逐字输入"]
    end

    C7 --> WaitAfter
    C8 --> WaitAfter
    H4 --> WaitAfter
    N2 --> WaitAfter
    S1 --> WaitAfter
    I4 --> WaitAfter

    WaitAfter{"waitAfter > 0？"}
    WaitAfter -->|是| DelayAfter["⏳ 等待 waitAfter 毫秒"] --> Next
    WaitAfter -->|否| Next

    Next{"还有下一个 action？"}
    Next -->|是| Loop
    Next -->|否| CheckAfter{"afterActionCheck？"}

    CheckAfter -->|是| AfterCheck
    CheckAfter -->|否| Pass(["✅ 操作序列执行完毕"])

    subgraph AfterCheck ["🔍 操作后检查"]
        AC1{"whiteScreenCheck？"} -->|是| AC2["执行白屏检测"]
        AC1 -->|否| AC3
        AC2 --> AC3{"expectedSelectors？"}
        AC3 -->|是| AC4["执行元素丢失检测"]
        AC3 -->|否| AC5
        AC4 --> AC5{"expectedUrlPattern？"}
        AC5 -->|是| AC6["正则匹配当前 URL"]
        AC5 -->|否| AC7(["✅ 操作后检查通过"])
        AC6 --> AC7
    end

    style Pass fill:#ccffcc,stroke:#009900
```

## 7. 技术亮点总结

| 亮点 | 说明 |
|------|------|
| **配置驱动，零代码测试** | 使用者只写配置对象，框架自动生成测试用例 |
| **Shadow DOM 深度穿透** | 递归遍历 + `>>>` 穿透语法，完美适配 Web Components |
| **4 层白屏检测策略** | DOM 结构 + 内容长度 + 可见性 + SPA 挂载点，多维度交叉验证 |
| **模块化配置架构** | 按子站拆分，新增模块 3 步完成，零耦合 |
| **全链路 TypeScript** | 配置到执行全程类型安全，拼错即报错 |
| **自动化告警闭环** | 定时巡检 → 失败检测 → 企业微信推送 → Actions 日志溯源 |
| **容错隔离设计** | 单用例失败不扩散，资源自动回收，超时静默降级 |

---

## 8. 适用场景

- **组件库官网巡检**：防止发布后白屏、关键文档元素丢失
- **多框架站点监控**：一套框架覆盖 Vue / UniApp / 小程序 / 移动端等所有子站
- **Web Components 场景**：内置 Shadow DOM 穿透，开箱即用
- **团队协作**：配置与代码分离，产品/QA 也能编写测试配置

这套框架的设计哲学是：**把测试的复杂性封装进框架，把测试的简单性交还给用户**。开发者只需要回答"测哪个页面、检查什么元素、执行什么操作"，剩下的一切——浏览器管理、Shadow DOM 穿透、白屏判定、CI 调度、失败告警——全部由框架接管。

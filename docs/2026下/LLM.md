# 大模型参数

## 1. 名词先看懂

- **7B = 7 Billion = 70亿参数**
- **100B = 1000亿参数**
业内B = 十亿；所以常见叫法：7B、13B、34B、70B大模型。

## 2. 核心一句话：模型参数 = 一堆浮点数

> 参数本质就是**浮点数**（小数，比如 0.234、1.56）

- FP32（32位浮点数）：**4字节 / 每个参数**
- FP16 / BF16（16位浮点）：**2字节 / 每个参数**

### 计算演示（PPT里7B模型28G来源）

70亿参数 × 4字节(FP32)
$$7\times10^9 \times 4 = 28\times10^9 \text{字节} ≈ \boldsymbol{28GB}$$
✅ 这就是PPT写的：**70亿*4字节≈28G**

> 补充：
如果用FP16（2字节）存放7B模型，体积就只有约14GB。
现在本地跑模型常用量化：**GGUF Q4_K_M、Q5_K_M**，进一步压缩体积，占用显存更小。

## 3. 形象理解

**7B大模型 = 70亿个小数构成的巨大数字表格**
Transformer网络里所有权重矩阵全部由这些数字组成；
训练过程，就是不断调整这几十亿个小数；
推理过程，就是拿着输入文本，和这堆数字做海量矩阵运算，算出下一个字。

## 4. 拓展几个新手高频疑问

### ① 参数越多一定越强？

不一定。
同等架构、同等训练数据前提下，参数越大能力越强；
但劣质数据、落后架构，超大参数模型效果也可能很差。

### ② 为什么本地跑7B模型常常需要16G/24G显卡？

原始FP32权重28G，推理时还要额外占用显存存放上下文、激活值，所以直接跑原版需要很高显存；
量化（压缩精度）之后才能在消费级显卡运行。

### ③ 区分两个概念

- **参数量（权重weight）**：保存好的模型文件大小，静态；
- **推理显存占用**：运行模型时显卡占用，动态，和上下文长度、batch大小相关。

## 5. 术语对照表

| 标识 | 全称 | 大小 |
| ---- | ---- | ---- |
| FP32 | 32位浮点 | 4字节/参数 |
| FP16/BF16 | 16位浮点 | 2字节/参数 |
| INT8 | 8位整型 | 1字节/参数 |
| INT4 | 4位整型（量化） | 0.5字节/参数 |

举个例子：7B模型

- FP32：≈28GB
- FP16：≈14GB
- INT4量化：≈3.5GB

# Python 虚拟环境

好的！你的第2周目录下有 3 个平行的项目（第1~3章），每个都是 `llmops-api`（Flask + Injector 项目）。

## 创建 Python 虚拟环境

选择一个项目目录（比如从第1章开始），在终端中执行：

### 方式一：标准 venv（推荐）

```bash
# 1. 进入项目目录
cd "/Users/guowangyang/Downloads/代码+PDF课件+电子书/第2周资料/第2周/第1章 后端Python环境搭建与项目配置/llmops-api"

# 2. 创建虚拟环境（名字叫 .venv）
python3 -m venv .venv

# 3. 激活虚拟环境
source .venv/bin/activate

# 4. 安装依赖
pip install -r requirements.txt
```

### 方式二：三个项目共用一个虚拟环境

如果三个项目依赖差不多，也可以在"第2周"外层建一个共用的：

```bash
cd "/Users/guowangyang/Downloads/代码+PDF课件+电子书/第2周资料/第2周"
python3 -m venv .venv
source .venv/bin/activate
pip install -r "第1章 后端Python环境搭建与项目配置/llmops-api/requirements.txt"
```

---

## 常用命令速查

| 操作 | 命令 |
|------|------|
| 激活环境 | `source .venv/bin/activate` |
| 退出环境 | `deactivate` |
| 查看已安装包 | `pip list` |
| 安装新包 | `pip install 包名` |
| 删除环境 | `rm -rf .venv` |

---

## 需要注意

1. **requirements.txt 很精简**，只有 `Flask==3.0.2` + `injector==0.21.0`。后续章节如果用到 LangChain、openai 等库，可能需要手动 `pip install` 补充。

2. **macOS 用户**：系统自带 Python 3，如果提示 `python3: command not found`，先安装 Homebrew 版 Python：`brew install python@3.12`。

3. **终端提示符变化**：激活后终端前面会出现 `(.venv)` 前缀，说明虚拟环境已生效。

## Python 虚拟环境常用命令大全

### 一、判断当前在哪个虚拟环境

| 命令 | 说明 |
|------|------|
| `which python` | 看 python 路径，虚拟环境下会指向 `.venv/bin/python` |
| `which pip` | 同上，看 pip 路径 |
| `echo $VIRTUAL_ENV` | 最直接，打印当前虚拟环境根目录，没激活就是空 |
| `python -c "import sys; print(sys.prefix)"` | Python 内部视角，打印解释器安装前缀 |
| `pip -V` | 简写，看 pip 版本和路径 |

**示例输出对比：**

```bash
# 虚拟环境已激活时
$ which python
/Users/guowangyang/Downloads/.../llmops-api/.venv/bin/python

$ echo $VIRTUAL_ENV
/Users/guowangyang/Downloads/.../llmops-api/.venv

# 没激活（系统 Python）
$ which python
/usr/bin/python3               # 或 /opt/homebrew/bin/python3

$ echo $VIRTUAL_ENV
                               # 空
```

---

### 二、检查当前目录有没有虚拟环境

```bash
# 看看有没有 .venv 文件夹（最常见命名）
ls -la .venv

# 或者搜常见的虚拟环境目录名
ls -d .venv venv env .env 2>/dev/null

# 递归在当前目录及子目录找（比较大，慎用）
find . -maxdepth 3 -name "pyvenv.cfg" 2>/dev/null
```

`pyvenv.cfg` 是 venv 的标志文件，找到它就说明那个目录是个虚拟环境。

---

### 三、创建 / 激活 / 退出

```bash
# 创建（python3 或指定版本）
python3 -m venv .venv                    # 用当前默认 Python3
python3.11 -m venv .venv                 # 显式指定 3.11
python3 -m venv .venv --system-site-packages  # 可访问系统全局包（不推荐）

# 激活
source .venv/bin/activate                # macOS / Linux
.venv\Scripts\activate                   # Windows CMD
.venv\Scripts\Activate.ps1               # Windows PowerShell

# 退出
deactivate
```

---

### 四、查看虚拟环境内部信息

```bash
# 查看虚拟环境基于哪个 Python 版本创建的
cat .venv/pyvenv.cfg

# 查看虚拟环境内安装的 Python 版本
.venv/bin/python --version

# 列出所有已安装的包及版本
pip list
pip list --format=freeze                 # 紧凑格式，适合写入 requirements.txt

# 查看某个包的具体信息
pip show flask

# 检查依赖冲突
pip check

# 导出当前环境依赖到文件
pip freeze > requirements.txt
```

---

### 五、清理 / 重建

```bash
# 退出当前环境
deactivate

# 删除虚拟环境（就是一个文件夹，放心删）
rm -rf .venv

# 重新创建干净的
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 清理 pip 缓存（磁盘不够时用）
pip cache purge
```

---

### 六、快速写进 shell 配置（一劳永逸）

把下面函数写入 `~/.zshrc`，以后 `cd` 进项目目录自动提示是否激活：

```bash
# 加到 ~/.zshrc 末尾
venv_info() {
  if [ -n "$VIRTUAL_ENV" ]; then
    echo "🐍 ($(basename "$VIRTUAL_ENV"))"
  fi
}
# 然后把 $(venv_info) 加到你的 PROMPT 或 RPROMPT 中
```

或者更简单，用 **direnv** 工具（`brew install direnv`），在项目目录下建 `.envrc` 写入 `source .venv/bin/activate`，`cd` 进去自动激活。

---

### 七、你这个项目快速检查

```bash
cd "/Users/guowangyang/Downloads/代码+PDF课件+电子书/第2周资料/第2周"

# 看看有没有现成的虚拟环境
ls -d */llmops-api/.venv 2>/dev/null
ls -d .venv 2>/dev/null
```

如果都没有输出，说明还没创建，参考上一条消息的步骤创建即可。


## 两个命令

### 1. 杀端口命令

```bash
lsof -ti:5000 | xargs kill -9
```

拆解：`lsof -ti:5000` 查出占用 5000 端口的进程 PID → `xargs kill -9` 强制杀进程。

---

### 2. `app.http.app:app` 是什么意思

这是 Flask 的**应用定位语法**：`模块路径:变量名`

```
app.http.app  :  app
│              │   │
│              │   └── Python 变量名（app = Http(...)）
│              └── 分隔符
└── 模块路径 = 文件 app/http/app.py
```

对应到文件就是：
一目了然：

```
llmops-api/                          ← 项目根目录
├── app/
│   └── http/
│       └── app.py                   ← 文件位置
│           └── 第 25 行: app = Http(...) ← 变量名
│
└── 执行命令时:
    FLASK_APP=app.http.app:app flask run
                │              │
                │              └── 第 33 行 if __name__ == ... 没有用了
                │                  flask run 会把 app 对象传给 wsgi server
                └── 文件路径 app/http/app.py

    项目根目录启动，Python 自动把 llmops-api/ 加到搜索路径
    所以 from config import ... / from internal import ... 都能找到
```

简单说：**只要保证在 `llmops-api/` 目录下执行 `flask run`，它就能找到 `app/http/app.py` 里那个叫 `app` 的变量。**


# 启动项目

报错原因找到了：`python app/http/app.py` 执行时，Python 把 `app/http/` 加到了 `sys.path`，而 `config` 包在**项目根目录**，所以找不到。

三种解决方案：

## 方案 1：用 Flask CLI（推荐）

`flask run` 启动成功 ✓

## 方案 2：用 `python -m`（从项目根目录运行）

```bash
cd "第2周资料/第2周代码/第1章-后端Python环境搭建与项目配置/llmops-api"
# -m = module 模式
python -m app.http.app
```

`-m` 会把**当前目录**加到 `sys.path`，所以 `from config import Config` 就能找到了。

## 方案 3：加 `PYTHONPATH`（不推荐，知道就行）

```bash
cd "第2周资料/第2周代码/第1章-后端Python环境搭建与项目配置/llmops-api"
PYTHONPATH=. python app/http/app.py
```

---

## 推荐：用方案 1

```bash
cd "第2周资料/第2周代码/第1章-后端Python环境搭建与项目配置/llmops-api"
FLASK_APP=app.http.app:app flask run --debug
```

服务跑起来后访问 `http://127.0.0.1:5000`，可以试：

- `GET /ping` → 故意 500（测试异常处理用）
- `POST /app/completion` → 调 OpenAI（需要先配 `.env` 里的 key）

# sys.path 是什么

就是你运行 Python 时，**Python 去哪里找 `import` 的模块**的清单。

一个例子：

```python
import sys
print(sys.path)
# 输出类似：
# ['/项目/llmops-api',           ← 当前目录（-m 模式时）
#  '/Library/.../python3.13',    ← 标准库
#  '/site-packages']             ← pip 安装的包

from config import Config   # Python 挨个去上面目录找 config/
```

Python 收到 `from config import Config` 时会：

```
找 config/ → sys.path[0] /llmops-api/config/  命中 ✓ → 导入
找不到 → sys.path[1]  → sys.path[2] → ...
全部找不到 → ModuleNotFoundError 💥
```

所以 `sys.path[0]` 设错了，整个项目的 `import` 全炸。这就是之前你需要指定 `FLASK_APP` 的原因——让 Python 从正确的位置开始找模块。

# python -m 是什么

两者完全不同：

## `python -m app.http.app` ✅ 正确

```
-m = module 模式
```

Python 把**当前目录** `(llmops-api/)` 加到 `sys.path`，然后找模块 `app.http.app` → `app/http/app.py`。

```
sys.path[0] = llmops-api/     ← 项目根目录
              ├── config/      ← 能找到 ✓
              ├── internal/    ← 能找到 ✓
              └── pkg/         ← 能找到 ✓
```

## `python app/http/app.py` ❌ 报错

```
没有 -m，直接给文件路径
```

Python 把**文件所在目录** `(app/http/)` 加到 `sys.path`，然后执行 `app.py`。

```
sys.path[0] = app/http/       ← 不是项目根
              │
              ├── config/      ← app/http/config/ 不存在 ✗
              ├── internal/    ← app/http/internal/ 不存在 ✗
              └── pkg/         ← 不存在 ✗
```

这就是你之前 `ModuleNotFoundError: No module named 'config'` 的根因。

## 一句话总结

| 命令 | `sys.path[0]` | import 能工作 |
|------|--------------|:--:|
| `python -m app.http.app` | 项目根目录 | ✅ |
| `python app/http/app.py` | `app/http/` | ❌ |
| `flask run` + `FLASK_APP=app.http.app:app` | 项目根目录 | ✅ |

## colima

```bash
brew services start colima
```

## postgre

postgre 可视化工具

```bash
brew install --cask pgadmin4
```

安装完成后，启动：

```bash
open /Applications/pgAdmin\ 4.app
```

界面汉化（可选）

- 左下角 ⚙️ Preferences（首选项）
- → Miscellaneous（杂项）
- → Language 选择 Chinese (Simplified)
- 保存 → 刷新页面立刻变成中文。

```bash
# 判断1：Homebrew安装？
brew services list | grep postgres

# 判断2：Postgres.app安装？
ls /Applications/Postgres.app
```

- 如果 brew 命令看到 `postgresql@xx started` → Brew 版本
- 如果 `/Applications` 存在 `Postgres.app` → PostgresApp

## 启动真实项目 docker

Colima 本质是 Docker 守护进程的替代品（在轻量 VM 里跑 containerd + Docker daemon），而 `docker-compose` 只是调用守护进程的客户端。所以**启动命令和用 Docker Desktop 完全一样**，只要 Colima 在运行即可。

## 启动步骤

**1. 先启动 Colima（提供 Docker 守护进程）**
```bash
colima start
```
首次或资源吃紧时可显式分配资源（这个 compose 有 postgres/redis/weaviate/api 等 7 个服务，建议多给点）：
```bash
colima start --cpu 4 --memory 8 --disk 60
```
> 如果之前已经 start 过，先 `colima delete` 再带参数 start，或 `colima stop && colima start` 无法直接改配置。

**2. 确认 docker 能连上**
```bash
docker info        # 能输出说明守护进程已就绪
docker-compose version   # 或 docker compose version
```
若报 `Cannot connect to the Docker daemon`，说明 Colima 没起或环境变量没设好，重跑 `colima start` 即可（Colima 会自动注入 `DOCKER_HOST`）。

**3. 启动项目（和 README 一致）**
```bash
cd /Users/guowangyang/Downloads/imooc-llmops/docker
docker-compose up -d        # 若装的是 v2 插件，用 docker compose up -d
```
首次会拉取 postgres/redis/weaviate/nginx 基础镜像，**并构建** `llmops-ui:0.1.0` 和 `llmops-api:0.1.0` 两个镜像（需要联网拉 Node/Python 基础镜像，耗时几分钟）。

**4. 查看状态**
```bash
docker-compose ps
docker-compose logs -f llmops-api   # 看后端启动/迁移日志
```

- UI：`http://localhost:3000`
- API：`http://localhost:5001`
- Nginx：`http://localhost（80/443`

## 常见坑

- **`docker-compose` 命令找不到**：新装环境通常只有 `docker compose`（v2 子命令），把命令换成 `docker compose up -d` 即可。
- **Apple Silicon（M 系列）**：postgres/redis/weaviate 都是多架构镜像，Colima 会自动用 Rosetta 跑 amd64，一般无感；若 build 卡在拉镜像，确保 Colima 版本较新。
- **挂载目录权限**：compose 里用 bind mount `./volumes/...`（如 `./volumes/db/data`、`./volumes/app/storage`）。首次 `up` 时 Docker 会自动创建这些目录（属主为 root），通常无碍；若 API 容器写 storage 报权限错，手动 `sudo chmod -R 777 docker/volumes` 兜底。
- **停服/清理**：`docker-compose down`（保留数据卷）；要彻底清数据加 `-v`（会删 postgres/redis/weaviate 数据）。

一句话：**`colima start` 之后，其余步骤和你装了 Docker Desktop 时一模一样。**

# 推导式

# Python 推导式（Comprehension）
## 一、一句话定义
推导式是 Python 简洁语法，**一行代码快速生成容器（列表/字典/集合/生成器）**，替代简单 `for` 循环，可读性更高。
一共 4 种：
1. 列表推导式 `[]`
2. 字典推导式 `{key:val}`
3. 集合推导式 `{}`
4. 生成器推导式 `()`

## 二、基础通用模板
```python
# 基础格式
[表达式 for 变量 in 可迭代对象 if 条件]
```
等价普通循环：
```python
res = []
for 变量 in 可迭代对象:
    if 条件:
        res.append(表达式)
```

---

## 1. 列表推导式 `[ ]`
最常用
```python
# 示例1：1~10平方
nums = [i**2 for i in range(1,11)]
print(nums)
# [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

# 示例2：带if筛选，只保留偶数
evens = [i for i in range(1,11) if i % 2 == 0]
print(evens)

# 示例3：多重循环（尽量少用，容易乱）
pairs = [(x,y) for x in [1,2] for y in [3,4]]
print(pairs)
```

## 2. 集合推导式 `{ }`
自动去重
```python
data = [1,1,2,2,3]
s = {x*2 for x in data}
print(s)  # {2,4,6}
```

## 3. 字典推导式 `{k:v}`
必须 **键:值** 形式
```python
words = ["apple", "banana"]
# key:单词，value:单词长度
word_len = {w: len(w) for w in words}
print(word_len)  # {'apple': 5, 'banana': 6}

# 字典键值互换
origin = {"a":1, "b":2}
swap = {v: k for k, v in origin.items()}
```

## 4. 生成器推导式 `( )`
⚠️ **不会一次性生成全部数据，惰性求值，节省内存！**
```python
gen = (i**2 for i in range(1000000))
# gen 是生成器，不是列表，迭代时才逐个计算
```
> 大数据场景优先用 `()`，不要用 `[]`

---

## 三、和普通 for 循环对比
普通写法：
```python
lst = []
for i in range(5):
    lst.append(i*10)
```
列表推导式一行搞定：
```python
lst = [i*10 for i in range(5)]
```

## 四、重要规范（避坑）
1. **不要写极其复杂的推导式**
多层循环、多重if嵌套建议改用普通for，可读性崩盘。
2. 推导式**尽量只做一件事**，不要在里面写复杂函数调用、异常逻辑。
3. `[]` 一次性占用内存；`()` 生成器惰性加载，海量数据首选。
4. 推导式**没有else不能随便乱放**
✅ `[x for x in arr if x>0]`
如果需要if-else，写在前面：
```python
# 偶数乘2，奇数不变
res = [x*2 if x%2==0 else x for x in range(6)]
```

## 五、通俗总结
推导式 = **简化版循环语法糖**
用来快速造出列表、集合、字典；
追求简洁，但不能过度滥用牺牲可读性。

# 注释

提问：为什么 Python 没有像 C 那样的块注释语法？

回答：这是 Guido 有意为之的设计决策。他认为 `/* */` 这种块注释容易嵌套出错，而且会让人写又长又臭的注释。Python 哲学是代码应该自解释，注释越少越好。用 `#` 逼着你一行行写，反而能让注释更精炼。三引号虽然能包多行，但它本质是字符串不是注释，这个区分是刻意的。

# main 函数

为什么不强制要求 main 函数

- Python 的设计哲学是 "简单直接"。写个 10 行的数据处理脚本，非要套一个 main 函数的壳子，纯属多此一举。但项目一大，几千行代码散落一地，没有统一入口就会乱成一锅粥。
- 所以 Python 把选择权交给开发者：小脚本随便写，正经项目老老实实使用 main。

# Iterable vs Iterator

## 一、最简定义
1. **Iterable（可迭代对象）**
实现了 `__iter__()` 方法的对象；**可以被遍历**。
常见：`list`、`str`、`tuple`、`dict`、`set`。

2. **Iterator（迭代器）**
实现了 `__next__()` + `__iter__()` 两个方法的对象；**可以逐个产出元素，记住遍历位置**。

> 核心口诀：
✅ **Iterator 一定是 Iterable**
❌ **Iterable 不一定是 Iterator**

## 二、两个魔法方法
- `obj.__iter__()`：返回一个 **iterator**
- `obj.__next__()`：返回下一个元素；没有元素时抛出 `StopIteration`

## 三、直观代码演示
### 1）列表 list → Iterable（不是迭代器）
```python
lst = [1,2,3]
# lst 是可迭代对象，但不是迭代器
print(hasattr(lst, "__iter__"))   # True
print(hasattr(lst, "__next__"))  # False

# 通过 iter() 从可迭代对象生成迭代器
it = iter(lst)
print(hasattr(it, "__iter__"))   # True
print(hasattr(it, "__next__"))  # True

# 使用 next() 获取元素
print(next(it)) # 1
print(next(it)) # 2
print(next(it)) # 3
# next(it) → StopIteration
```

## 四、关键差异表格
| 特性 | Iterable 可迭代对象 | Iterator 迭代器 |
|------|--------------------|----------------|
| 拥有方法 | `__iter__` | `__iter__` + `__next__` |
| 保存状态 | ❌ 不记录遍历位置 | ✅ 记住当前遍历位置 |
| 多次遍历 | ✅ 可以重复for循环 | ❌ 遍历完成后耗尽，不能复用 |
| 例子 | list, str, dict, set | iter(list)、生成器 |

### 迭代器耗尽示例（高频考点）
```python
lst = [1,2,3]
it = iter(lst)

print(list(it)) # [1,2,3] 全部取出
print(list(it)) # [] 迭代器已经空了！

# 但原始列表不受影响，可以再次生成迭代器
print(list(lst)) # [1,2,3]
```

## 五、for循环底层原理
```python
for x in obj:
    pass
```
等价流程：
1. 调用 `iter(obj)` → 获取迭代器
2. 循环调用 `next(迭代器)`
3. 捕获 `StopIteration` 异常，结束循环

👉 所以：**能放进for循环的都必须是Iterable**

## 六、生成器补充
生成器（generator）**属于 Iterator**，自带 `__next__`，惰性求值。
```python
gen = (x for x in range(5))
print(hasattr(gen, "__next__")) # True
```

## 七、一句话总结
- **Iterable：能拿来迭代的“容器”（列表、字符串）**
- **Iterator：负责逐个取出容器元素、带指针的“取货员”，一次性消耗**






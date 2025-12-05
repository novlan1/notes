# 圈复杂度

## 什么是代码圈复杂度

也许大家对到底是什么使得程序变得更复杂或更简单有直观的感觉。研究人员已经总结出一些衡量复杂度的方法，最著名的可能就是 Tom McCabe 的方法了，该方法通过计算子程序中的“决策点（decision points）”的数量来衡量复杂度。以下给出了一种用于计算决策点的方法：

1. 从1开始，一直往下通过程序
2. 一但遇到以下关键字，或者其它同类的词，就加1：if，while，repeat，for，and，or
3. 给case语句中的每一种情况都加1

下面举一个例子：

```js
if（（（status = success） and done） or
（not done and （numLines >=maxLines ））） then…
```

在这段代码中，从1算起，遇到if得2，and得3，or得4，and得5。加起来，这段代码里总共包含了5个决策点。

简单的说，代码圈复杂度是用来衡量一个函数判定结构复杂程度的指标。函数的复杂度在很大程度上决定了理解程序所需要花费的精力。很多年前，已经有专家对复杂度的危险提出警告：“有能力的程序员会充分的认识到自己的大脑容量是多么的有限，所以，他会非常谦卑的处理编程任务”。这并不是说我们得增加自己的脑容量才能应对巨大的复杂度，还有一种方法是尽可能的采取措施来降低复杂度。

同时，虽然高复杂度的函数不一定就会出错，但相比低复杂度的函数来说，可读性比较差，存在缺陷风险会比较高，而且难于测试和维护，用例难以全面覆盖，增加新人熟悉业务难度，在新增功能、定位问题和修复Bug时，所耗费的人力成会很高。

使用圈复杂度检查工具，相当于给代码安装了指示器，提醒我们哪些程序方法存在高复杂度的风险。圈复杂度可以成为编码及重构的重要参考指标，指导撰写可读性高的代码。

## 复杂度多少算正常

复杂度数值的高与低，没有一个所谓的硬性标准，业界普遍认为，复杂度为10及以下的函数可读性好，容易测试，且存在缺陷风险几率较低。

|圈复杂度|代码状况|可测性|维护成本|
|---|---|---|---|
|1-10|清晰、结构化|高|低|
|11-20|复杂|中|中|
|21-30|非常复杂|低|高|
|>30|不可读|不可测|非常高|

10个以上节点作为复杂度上限并不是绝对的，应该把节点数量当做是一个警示，该警示说明某个子程序可能需要重新设计了。

## lizard

[lizard](https://pypi.org/project/lizard/) 是一个好用的工具，CodeCC 也是采用的这个。

名称解释

|名称|说明|
|---|---|
|NLOC|函数的非注释代码行数|
|CCN|圈复杂度|
|token|函数中的 token 数量（关键字、标识符等）|
|PARAM|函数的参数个数|
|function_name|函数名|
|start_line|函数起始行号|
|end_line|函数结束行号|
|file_path|文件路径|

安装

```bash
pip install lizard
```

分析复杂度

```bash
lizard
```

输出 html 格式

```bash
lizard --html > report.html
```

输出 csv 格式

```bash
lizard --csv > report.csv
```

过滤文件

```bash
lizard -x one-file.js
```

过滤目录

```bash
lizard -x "./.vitepress/*"
```

排序

```bash
# 按照复杂度降序
lizard -s cyclomatic_complexity
```

参考：

- https://kaelzhang81.github.io/2017/06/18/%E8%AF%A6%E8%A7%A3%E5%9C%88%E5%A4%8D%E6%9D%82%E5%BA%A6/

## pyenv

安装 pyenv

```bash
curl https://pyenv.run | bash

# or
git clone https://github.com/pyenv/pyenv.git ~/.pyenv
```

添加环境变量

```bash
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init --path)"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
source ~/.bashrc
```

安装 python 版本

```bash
# 查看可安装的Python版本
pyenv install --list

# 安装指定版本（例如Python 3.9.5）
pyenv install 3.9.5

# 查看已安装的版本
pyenv versions

# 设置全局Python版本
pyenv global 3.9.5

# 验证Python版本
python --version
```

常用命令

```bash
# 查看所有可安装版本
pyenv install --list | grep -v "^\s*$"

# 安装特定版本
pyenv install 3.8.10

# 设置局部版本（在当前目录生效）
pyenv local 3.8.10

# 重置版本
pyenv global system  # 使用系统Python
pyenv local --unset  # 取消局部设置

# 卸载Python版本
pyenv uninstall 3.8.10

# 更新pyenv
pyenv update
```

SSL 警告

```
WARNING: Disabling truststore since ssl support is missing
```

意思是，Python 编译时缺少 SSL 支持，导致无法通过 HTTPS 安全下载包。


手动编译安装 OpenSSL

```bash
# 如果 yum 确实无法使用，手动编译安装
cd /tmp

# 下载 OpenSSL 源码
wget https://www.openssl.org/source/openssl-1.1.1w.tar.gz
# 如果上述链接失效，使用备用链接
wget https://github.com/openssl/openssl/archive/refs/tags/OpenSSL_1_1_1w.tar.gz

# 解压
tar -xzf openssl-1.1.1w.tar.gz
cd openssl-1.1.1w

# 配置、编译、安装
./config --prefix=/usr/local/openssl --openssldir=/usr/local/openssl shared zlib
make
sudo make install

# 设置环境变量
echo 'export PATH=/usr/local/openssl/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/openssl/lib:$LD_LIBRARY_PATH' >> ~/.bashrc
echo 'export PKG_CONFIG_PATH=/usr/local/openssl/lib/pkgconfig:$PKG_CONFIG_PATH' >> ~/.bashrc
source ~/.bashrc

# 验证安装
/usr/local/openssl/bin/openssl version
```


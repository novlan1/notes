<!-- # SSH 免密登录方案对比：sshpass vs ssh-agent -->

## 背景

在日常开发中，我们经常需要通过 SSH 登录远程服务器，每次手动输入密码既繁琐又低效。本文对比两种常见的 SSH 免密登录方案，帮助你根据实际场景选择合适的方式。

- **方案一：sshpass** — 将密码直接传给 SSH 命令，实现自动输入密码
- **方案二：SSH 密钥认证 + ssh-agent** — 通过公私钥对认证，配合 ssh-agent 管理私钥

## 方案一：sshpass

### 原理

`sshpass` 是一个非交互式 SSH 密码提供工具，它通过环境变量、文件或命令行参数将密码传递给 SSH，从而跳过手动输入密码的步骤。

### 详细操作步骤

#### 1. 安装 sshpass

```bash
# macOS（通过 Homebrew）
brew install hudochenkov/sshpass/sshpass

# Ubuntu / Debian
sudo apt-get install sshpass

# CentOS / RHEL
sudo yum install sshpass
```

> ⚠️ macOS 上官方 Homebrew 已移除 sshpass（认为不安全），需要通过第三方 tap 安装。

#### 2. 基本用法

**方式 A：命令行直接传密码（不推荐）**

```bash
sshpass -p 'your_password' ssh user@remote_host
```

> ⚠️ 密码会出现在进程列表和 shell 历史记录中，**非常不安全**。

**方式 B：通过文件传密码（推荐）**

```bash
# 1. 创建密码文件
echo 'your_password' > ~/.ssh/.server_pass

# 2. 设置严格权限（仅本人可读）
chmod 600 ~/.ssh/.server_pass

# 3. 使用密码文件登录
sshpass -f ~/.ssh/.server_pass ssh user@remote_host
```

**方式 C：通过环境变量传密码**

```bash
# 设置环境变量
export SSHPASS='your_password'

# 使用环境变量登录
sshpass -e ssh user@remote_host
```

#### 3. 封装为别名/脚本（日常使用）

在 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
# 方式一：别名
alias login-dev="sshpass -f ~/.ssh/.server_pass ssh user@192.168.1.100"

# 方式二：函数（支持参数）
loginGroup() {
  local host=$1
  sshpass -f ~/.ssh/.server_pass ssh user@"$host"
}
```

使配置生效：

```bash
source ~/.zshrc
```

使用：

```bash
# 别名方式
login-dev

# 函数方式
loginGroup 192.168.1.100
```

#### 4. 配合 SCP 传输文件

```bash
# 上传文件到远程服务器
sshpass -f ~/.ssh/.server_pass scp local_file.txt user@remote_host:/path/to/dest/

# 从远程服务器下载文件
sshpass -f ~/.ssh/.server_pass scp user@remote_host:/path/to/file.txt ./
```

### sshpass 小结

| 项目 | 说明 |
|------|------|
| 是否需要输密码 | ❌ 不需要（密码已预存） |
| 安全性 | ⚠️ 较低，密码以明文存储在文件或环境变量中 |
| 适用场景 | 临时脚本、开发环境、CI/CD 自动化 |
| 远程服务器配置 | 无需任何配置 |

---

## 方案二：SSH 密钥认证 + ssh-agent

### 原理

通过 **非对称加密** 实现认证：

1. 本地生成一对密钥（公钥 + 私钥）
2. 将**公钥**放到远程服务器的 `~/.ssh/authorized_keys`
3. 登录时，服务器用公钥加密一个随机数发给客户端，客户端用私钥解密后返回，验证通过即可登录
4. 如果私钥设置了 passphrase，可以用 `ssh-agent` 缓存解密后的私钥，避免每次输入

### 详细操作步骤

#### 1. 生成 SSH 密钥对

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

交互过程：

```text
Generating public/private ed25519 key pair.
Enter file in which to save the key (/Users/you/.ssh/id_ed25519): 回车（使用默认路径）
Enter passphrase (empty for no passphrase): 回车（不设密码）或输入密码短语
Enter same passphrase again: 回车或再次输入
```

> 💡 **关于 passphrase**：
> - 如果**不设 passphrase**（直接回车），后续登录完全免密，最方便
> - 如果**设了 passphrase**，每次使用私钥都需要输入，可以用 `ssh-agent` 缓存来避免重复输入

生成的文件：

```text
~/.ssh/id_ed25519       ← 私钥（绝对不能泄露！）
~/.ssh/id_ed25519.pub   ← 公钥（可以放心传到服务器）
```

#### 2. 将公钥复制到远程服务器

**方式 A：使用 ssh-copy-id（推荐）**

```bash
ssh-copy-id user@remote_host
```

这一步需要输入一次远程服务器的密码，之后就不需要了。

**方式 B：手动复制**

```bash
# 1. 查看公钥内容
cat ~/.ssh/id_ed25519.pub

# 2. 登录远程服务器
ssh user@remote_host

# 3. 在远程服务器上操作
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 4. 将公钥内容追加到 authorized_keys
echo "粘贴你的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### 3. 测试免密登录

```bash
ssh user@remote_host
```

如果不再提示输入密码，说明配置成功 ✅

#### 4. 配置 ssh-agent（如果设了 passphrase）

如果你在生成密钥时设置了 passphrase，每次 SSH 登录时都会提示输入。可以用 `ssh-agent` 缓存：

```bash
# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加私钥到 agent（这一步需要输入一次 passphrase）
ssh-add ~/.ssh/id_ed25519
```

之后在当前终端 session 内，SSH 登录不再需要输入 passphrase。

**macOS 永久缓存（推荐）：**

在 `~/.ssh/config` 中添加：

```text
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

然后执行：

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

这样即使重启终端或电脑，也不需要重新输入 passphrase。

#### 5. 配置别名简化登录

在 `~/.ssh/config` 中添加：

```text
Host dev-server
  HostName 192.168.1.100
  User your_username
  IdentityFile ~/.ssh/id_ed25519
```

使用：

```bash
ssh dev-server
```

#### 6. 配合 SCP 传输文件

配置好密钥后，SCP 也自动免密：

```bash
# 上传
scp local_file.txt dev-server:/path/to/dest/

# 下载
scp dev-server:/path/to/file.txt ./
```

### SSH 密钥认证小结

| 项目 | 说明 |
|------|------|
| 是否需要输密码 | ❌ 不需要（不设 passphrase 时），或首次 ssh-add 后不需要 |
| 安全性 | ✅ 高，基于非对称加密，私钥不离开本地 |
| 适用场景 | 所有场景，业界标准做法 |
| 远程服务器配置 | 需要将公钥添加到服务器 |

---

## 两种方案对比

| 对比项 | 方案一：sshpass | 方案二：SSH 密钥认证 |
|--------|----------------|---------------------|
| **安全性** | ⚠️ 低 — 密码明文存储 | ✅ 高 — 非对称加密 |
| **配置复杂度** | 简单 — 安装即用 | 中等 — 需要生成密钥、分发公钥 |
| **远程服务器改动** | 无需改动 | 需要添加公钥 |
| **是否需要输密码** | 不需要 | 不需要（不设 passphrase），或仅首次 |
| **密码变更影响** | 需要同步更新密码文件 | 无影响 |
| **多服务器管理** | 每台服务器需存密码 | 一对密钥可用于多台服务器 |
| **适用场景** | 临时脚本、CI/CD、无法配置密钥的场景 | 日常开发、生产环境、长期使用 |
| **行业认可度** | 不推荐用于生产 | ✅ 业界标准做法 |
| **跨平台支持** | 需额外安装 | SSH 内置支持 |

## 建议

- **日常开发、长期使用** → 优先选择 **方案二（SSH 密钥认证）**，安全、标准、一劳永逸
- **临时自动化脚本、无法配置密钥的服务器** → 可以用 **方案一（sshpass）** 应急
- **生产环境** → **必须使用方案二**，切勿使用 sshpass
- **方案二中不设 passphrase** 是最省事的做法，如果你的电脑本身有足够的安全防护（如磁盘加密、锁屏密码），不设 passphrase 是完全可以接受的

---

## 常见问题排查

### 问题一：`no mutual signature algorithm` — RSA 密钥被服务器拒绝

#### 现象

配置了 RSA 密钥认证，但仍然无法免密登录，使用 `ssh -vvv` 调试后看到：

```text
debug1: Offering public key: /Users/you/.ssh/id_rsa RSA SHA256:xxxxx
debug1: send_pubkey_test: no mutual signature algorithm
```

关键日志就是 **`send_pubkey_test: no mutual signature algorithm`**，意思是客户端和服务器之间找不到双方都支持的签名算法。

#### 原因

你的密钥是 **RSA** 类型（`id_rsa`），使用的签名算法是 `ssh-rsa`（基于 SHA-1）。从 **OpenSSH 8.8**（2021-09）开始，服务端**默认禁用了 `ssh-rsa` 签名算法**，因为 SHA-1 已经被认为不安全。

所以虽然你的公钥已经放到了服务器上，但服务器拒绝接受 SHA-1 签名的认证请求，握手直接失败。

#### 解决方案（三选一）

**方案 A：✅ 推荐 — 生成 ed25519 密钥替代 RSA**

这是最好的解决办法，ed25519 更安全、性能更好：

```bash
# 生成新密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 把公钥传到服务器
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@remote_host
```

之后就能正常密钥登录了。

**方案 B：临时兼容 — 客户端允许 ssh-rsa 算法**

在 `~/.ssh/config` 中给目标服务器加配置：

```text
Host 目标服务器IP或别名
    HostkeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
```

这样现有的 `id_rsa` 就能继续用，但**不推荐长期使用**，因为 SHA-1 不安全。

**方案 C：服务器端修改（需要 root 权限）**

在服务器的 `/etc/ssh/sshd_config` 中添加：

```bash
PubkeyAcceptedAlgorithms +ssh-rsa
```

然后重启 sshd：

```bash
sudo systemctl restart sshd
```

#### 方案对比

| 方案 | 安全性 | 难度 | 推荐度 |
|------|--------|------|--------|
| 生成 ed25519 密钥 | ⭐⭐⭐ 最强 | 简单 | ✅ 强烈推荐 |
| 客户端加 ssh-rsa 兼容 | ⭐ SHA-1 不安全 | 最简单 | ⚠️ 临时过渡 |
| 服务器端开放 ssh-rsa | ⭐ SHA-1 不安全 | 需要 root | ❌ 不建议 |

> 💡 **一句话总结**：如果你看到 `no mutual signature algorithm`，说明你的 RSA 密钥用的 SHA-1 签名被新版 SSH 服务器拒绝了。换 ed25519 密钥即可解决。

---

### 问题二：公钥已配置但仍然要求输入密码

#### 现象

已经执行了 `ssh-copy-id`，公钥也确认在服务器的 `~/.ssh/authorized_keys` 中，但登录时仍然提示输入密码。

#### 排查步骤

**1. 检查远程服务器的文件权限**

这是最常见的原因。SSH 对文件权限要求非常严格：

```bash
# 登录服务器后检查
ls -la ~ | grep .ssh
ls -la ~/.ssh/
```

正确的权限应该是：

```text
~              → 755 或 700（不能有 group/other 的写权限）
~/.ssh/        → 700
~/.ssh/authorized_keys → 600
```

修复：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod go-w ~
```

**2. 检查服务器 sshd 配置**

确认 `/etc/ssh/sshd_config` 中密钥认证是开启的：

```bash
# 查看关键配置
grep -E "^(PubkeyAuthentication|AuthorizedKeysFile)" /etc/ssh/sshd_config
```

应确保：

```text
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

如果修改了配置，需要重启 sshd：

```bash
sudo systemctl restart sshd
```

**3. 检查 SELinux（CentOS/RHEL）**

如果服务器启用了 SELinux，可能会阻止 SSH 读取 `authorized_keys`：

```bash
# 检查 SELinux 状态
getenforce

# 恢复 .ssh 目录的安全上下文
restorecon -Rv ~/.ssh
```

**4. 使用 `-vvv` 调试**

最有效的排查手段：

```bash
ssh -vvv user@remote_host
```

重点关注以下关键字：
- `Offering public key` → 客户端正在尝试这个密钥
- `Server accepts key` → 服务器接受了密钥 ✅
- `no mutual signature algorithm` → 签名算法不匹配（见问题一）
- `Trying private key` → 密钥文件不存在或无法使用

---

### 问题三：`ssh-copy-id` 报错 `Permission denied`

#### 现象

执行 `ssh-copy-id user@host` 时直接报 `Permission denied`，无法输入密码。

#### 原因

服务器可能禁用了密码登录（`PasswordAuthentication no`），而你还没有其他方式登录。

#### 解决

需要通过其他方式（如控制台、跳板机）登录服务器，手动添加公钥：

```bash
# 在本地查看公钥
cat ~/.ssh/id_ed25519.pub

# 通过其他方式登录服务器后，手动添加
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "你的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

### 问题四：多个密钥文件时 SSH 使用了错误的密钥

#### 现象

本地有多个密钥文件（如 `id_rsa`、`id_ed25519`、`id_work` 等），SSH 没有用你期望的那个密钥去认证。

#### 解决

在 `~/.ssh/config` 中为每个主机指定密钥：

```text
# 公司服务器 - 使用工作密钥
Host work-server
    HostName 10.0.0.100
    User deploy
    IdentityFile ~/.ssh/id_work
    IdentitiesOnly yes

# 个人服务器 - 使用个人密钥
Host my-server
    HostName 1.2.3.4
    User root
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

> 💡 `IdentitiesOnly yes` 的作用是**只使用指定的密钥**，防止 SSH 自动尝试 agent 中的其他密钥。

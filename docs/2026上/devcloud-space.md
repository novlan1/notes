## 1. 定位

```bash
# 直接找根分区下的大文件（>100MB）
find / -xdev -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -k5 -rh | head -20
```

| 文件路径 | 大小 | 日期 |
|---------|------|------|
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 2.1G | 9月 20 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 2.1G | 9月 19 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/pack-x.pack` | 2.1G | 11月 14 12:14 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 1.9G | 9月 18 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 1.9G | 9月 15 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 1.7G | 9月 14 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 1.5G | 9月 13 2025 |
| `/root/g/check-lint/pmd-mobile__pmd-h5__frontend-cloud/.git/objects/pack/pack-x.pack` | 1.5G | 4月 27 11:31 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_x` | 1014M | 9月 12 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_mk0rpT` | 915M | 9月 8 2025 |
| `/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_y2DAV8` | 889M | 9月 10 2025 |
| `/root/g/check-lint/pmd-mobile__pmd-h5__frontend-sourcemap/.git/objects/pack/pack-8c5dbcfd6a8681662643109932134fb5e6024eb1.pack` | 764M | 4月 27 13:52 |
| `/root/.pm2/logs/rd-platform-svr-out.log` | 709M | 5月 4 22:12 |
| `/root/g/check-lint/pmd-mobile__match__dzs-match/.git/objects/pack/pack-89039d1f7e0eab7b75ec289bcb11b4383977618d.pack` | 620M | 2月 17 2025 |
| `/root/.pm2/logs/next-svr-v2-out.log` | 548M | 5月 5 00:06 |
| `/root/g/check-lint/pmd-mobile__netbar__uniapp-dist/.git/objects/pack/pack-x.pack` | 415M | 4月 27 13:38 |
| `/usr/lib/debug/usr/lib/modules/5.4.241-1-tlinux4-0017.12/vmlinux` | 355M | 8月 2 2024 |
| `/root/.local/share/pnpm/store/v3/files/a0/ac38c490...b888f-exec` | 285M | 4月 27 11:19 |
| `/root/g/check-lint/pmd-mobile__support__rd-platform-web/node_modules/.pnpm/puppeteer@11.0.0/node_modules/puppeteer/.local-chromium/linux-901912/chrome-linux/chrome` | 285M | 4月 27 11:19 |
| `/root/.local/share/pnpm/store/v3/files/72/c8de54f1...68334-exec` | 240M | 1月 7 2025 |

## 2. 分析

这些是构建机根分区 `/` 下的大文件，按类别分析如下：

### 2.1. 🔴 Git 临时 pack 文件（最大元凶，约 14.5G）

```
/root/g/check-lint/pmd-mobile__convert-cross/.git/objects/pack/tmp_pack_*
```

| 文件 | 大小 | 日期 |
|------|------|------|
| `tmp_pack_dEdoC4` | 2.1G | 2025-09-20 |
| `tmp_pack_tLiygl` | 2.1G | 2025-09-19 |
| `tmp_pack_qakG0F` | 1.9G | 2025-09-18 |
| `tmp_pack_8XEMR6` | 1.9G | 2025-09-15 |
| `tmp_pack_0mS8wc` | 1.7G | 2025-09-14 |
| `tmp_pack_0R2ixG` | 1.5G | 2025-09-13 |
| `tmp_pack_pKd6mk` | 1014M | 2025-09-12 |
| `tmp_pack_mk0rpT` | 915M | 2025-09-08 |
| `tmp_pack_y2DAV8` | 889M | 2025-09-10 |

**这些是 `git fetch/clone` 中断后残留的临时文件，完全无用，可以安全删除。** 它们是 git 在传输 pack 数据时的中间产物，正常完成后会自动清理，但中断（如超时、磁盘满）后就残留了。

### 2.2. 🟡 Git 正式 pack 文件（约 7.5G）

```
pack-3a4f09b97528420516be50939f17a54ccaa34160.pack  2.1G  (convert-cross)
pack-925e2ace669637b5720f28759aac62b9b9eacecd.pack  1.5G  (frontend-cloud)
pack-8c5dbcfd6a8681662643109932134fb5e6024eb1.pack  764M  (frontend-sourcemap)
pack-89039d1f7e0eab7b75ec289bcb11b4383977618d.pack  620M  (dzs-match)
pack-3ad4e8c118527a04248d9fb5f9122352bb5845b7.pack  415M  (uniapp-dist)
```

这些是正式的 git 仓库数据。如果这些仓库不再需要做 lint 检查，可以整个删掉对应目录。

### 2.3. 🟡 PM2 日志文件（约 1.3G）

```
/root/.pm2/logs/rd-platform-svr-out.log   709M
/root/.pm2/logs/next-svr-v2-out.log       548M
```

**PM2 日志没有做 rotate，持续增长。** 可以安全清空或截断。

### 2.4. 🟢 系统/工具文件（约 1.2G，不建议删）

```
/usr/lib/debug/.../vmlinux                355M  (内核调试符号)
pnpm store 中的 chromium                   285M × 2
```

---

### 2.5. 推荐清理命令

```bash
# 1. 删除所有 git 临时 pack 文件（最安全，释放约 14.5G）
find /root/g/check-lint -name "tmp_pack_*" -type f -delete

# 2. 清空 PM2 日志（释放约 1.3G）
> /root/.pm2/logs/rd-platform-svr-out.log
> /root/.pm2/logs/next-svr-v2-out.log

# 3. 如果 convert-cross 仓库不需要了，直接删掉（释放约 2.1G 正式 pack + 已删的 tmp）
rm -rf /root/g/check-lint/pmd-mobile__convert-cross

# 4. 配置 PM2 日志轮转（防止再次膨胀）
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 3
```

### 2.6. 预计释放空间

| 操作 | 释放空间 |
|------|----------|
| 删 `tmp_pack_*` | ~14.5G |
| 清空 PM2 日志 | ~1.3G |
| 删 convert-cross 整个目录 | 额外 ~2.1G |
| **合计** | **~17.9G** |

---

**优先执行第 1 步**（删 `tmp_pack_*`），这是最安全且收益最大的操作，能立即释放约 14.5G 空间。

## 3. /tmp 不能设置软链接到 /data/tmp

是的，你说得对。把 `/tmp` 设置软连接到 `/data/tmp` 的方案**在这个场景下不可行**。

### 3.1. 问题分析

从错误堆栈来看：

```
java.nio.file.NoSuchFileException: /tmp/git-credential-3917703232258049666
    at ...UnixFileSystemProvider.createDirectory(...)
    at java.nio.file.Files.createDirectory(Files.java:674)
    at java.nio.file.TempFileHelper.create(TempFileHelper.java:136)
```

Java 的 `Files.createDirectory` 要求**父目录必须存在**。它在 `/tmp` 下创建临时目录时，如果 `/tmp` 是一个软连接指向 `/data/tmp`，但 `/data/tmp` 这个目录**不存在或权限不对**，就会抛出 `NoSuchFileException`。

### 3.2. 为什么软连接方案有问题

1. **构建环境每次可能重置**：蓝盾流水线的构建机（尤其是公共构建机/Docker构建机），每次构建可能是全新容器，你之前创建的软连接和 `/data/tmp` 目录不会保留。

2. **时序问题**：Git 插件在流水线最早期执行（拉代码阶段），此时你还没有机会执行脚本去创建 `/data/tmp` 目录或设置软连接。

3. **权限问题**：即使是私有构建机，修改 `/tmp` 软连接可能影响其他系统服务。

## 4. 回退 /tmp 软链接

把 `/tmp` 软连接回退到正常目录的操作如下：

### 4.1. 回退步骤

```bash
# 1. 删除软连接
rm -f /tmp

# 2. 重新创建真实的 /tmp 目录
mkdir /tmp

# 3. 设置正确的权限（sticky bit）
chmod 1777 /tmp
```

### 4.2. 说明

- `/tmp` 的标准权限是 `1777`（即 `drwxrwxrwt`），其中 `1` 是 sticky bit，防止用户删除他人的临时文件
- 执行完后，`/tmp` 就恢复为根分区上的真实目录了
- 如果当前有进程在使用 `/tmp`，建议先确认没有关键进程在写入

### 4.3. 验证

```bash
# 确认不再是软连接
ls -ld /tmp
# 应该输出类似：drwxrwxrwt 10 root root 4096 May 5 08:50 /tmp
```


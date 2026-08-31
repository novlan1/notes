# -*- coding: utf-8 -*-
"""清理 6.redis.md：删除网页抓取的页面 chrome、清理 markdown 转义残留、重构标题层级。

用法：
    python3 scripts/clean-redis-md.py
"""
import re

path = 'docs/2026下/6.redis.md'

with open(path, encoding='utf-8') as f:
    text = f.read()

# 1. 统一行尾 CRLF -> LF
text = text.replace('\r\n', '\n').replace('\r', '\n')

# 2. 状态机：删除每题头部的 chrome 块，题目标题提升为 ## 二级标题
lines = text.split('\n')
out = []
i = 0
n = len(lines)

while i < n:
    line = lines[i]
    s = line.strip()

    # 空标题 "#"（网页残留）删除
    if s == '#':
        i += 1
        continue

    # 题目标题：形如 "651\. Redis 主从复制的实现原理是什么？"
    if re.match(r'^\d+\\\.\s', line):
        # 清理标题转义 + 末尾 NBSP/空格，提升为二级标题
        title = line.replace('\\', '').replace('\u00a0', '').rstrip()
        out.append('## ' + title)
        out.append('')
        i += 1
        # 跳过标题之后到正文开始之间的所有 chrome
        while i < n:
            s2 = lines[i].strip()
            if s2.startswith('## 回答重点') or s2.startswith('> 回答时'):
                break
            i += 1
        continue

    out.append(line)
    i += 1

result = '\n'.join(out)

# 3. 标题层级降级（从深到浅，避免冲突），代码块内的行不动
final_lines = []
in_code = False
for line in result.split('\n'):
    stripped = line.strip()
    if stripped.startswith('```'):
        in_code = not in_code
        final_lines.append(line)
        continue
    if in_code:
        final_lines.append(line)
        continue
    # 三级标题 -> 四级（### 子节，如 "### Redis 主从架构"）
    if re.match(r'^### ', line):
        line = '#' + line
    # 三个特定二级标题 -> 三级（题目已占用 ## 层级）
    elif re.match(r'^## (回答重点|扩展知识|面试官追问)', line):
        line = '#' + line
    # 注意：#### 提问 保持四级不变，这样 "### 面试官追问" 后面跟 "#### 提问" 不跳级
    final_lines.append(line)
result = '\n'.join(final_lines)

# 4. 清理 markdown 转义残留
#    第 1 步：双反斜杠 -> 单反斜杠（"转义的反斜杠"恢复，如 \\0 -> \0、\\> -> \>）
result = result.replace('\\\\', '\\')
#    第 2 步：单反斜杠 + markdown 标点 -> 标点（去掉转义反斜杠）
result = re.sub(r'\\([_*{}\[\]()#+\-.!>`])', r'\1', result)

# 5. 清理 NBSP 残留
result = result.replace('\u00a0', '')

# 6. 压缩连续空行（3 个及以上 -> 2 个）
result = re.sub(r'\n{3,}', '\n\n', result)

# 7. 去掉开头多余空行，末尾补换行
result = result.lstrip('\n').rstrip('\n') + '\n'

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)

print('done')

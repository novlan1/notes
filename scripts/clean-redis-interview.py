# -*- coding: utf-8 -*-
"""处理 6.redis.md：
1. 去掉面试相关字眼（面试官/面试/追问/提问），当成知识点
2. mianshiya 文字超链接换成文档内部锚点链接（匹配不到题目的去掉链接保留文字）

用法：
    python3 scripts/clean-redis-interview.py
"""
import re

path = 'docs/2026下/6.redis.md'
with open(path, encoding='utf-8') as f:
    text = f.read()


# ============ 锚点生成 ============
def slugify(title: str) -> str:
    s = title.lower()
    # 去掉标点，保留字母/数字/中文/空格/连字符
    s = re.sub(r'[^\w\s-]', '', s, flags=re.UNICODE)
    s = re.sub(r'\s+', '-', s)
    return s.strip('-')


# ============ 收集题目标题 -> 新编号 ============
# 标题格式：## N. 标题文本
titles = {}  # 标题文本(无编号) -> 新编号
for m in re.finditer(r'^## (\d+)\.\s+(.+)$', text, flags=re.M):
    titles[m.group(2)] = m.group(1)


# ============ 手动映射（模糊匹配的特殊情况）============
manual_map = {
    'redis 的内存淘汰策略有哪些？': 'Redis 中有哪些内存淘汰策略？',
    'Redis 的过期策略': 'Redis 数据过期后的删除策略是什么？',
    'redis 如何实现分布式锁': 'Redis 中如何实现分布式锁？',
    'Redisson 分布式锁的原理': '说说 Redisson 分布式锁的原理?',
    'Redis 的 Ziplist 和 Quicklist': 'Redis 中的 Ziplist 和 Quicklist 数据结构的特点是什么？',
    'Redis 持久化机制': 'Redis 的持久化机制有哪些？',
    'Redis Hash': 'Redis 的 hash 是什么？',
}


def normalize(s: str) -> str:
    return s.lower().strip().rstrip('？?。.：:')


def match_title(text_clean: str):
    """匹配链接文本（去掉编号前缀后）到题目标题，返回标题文本或 None。"""
    # 0. 手动映射
    if text_clean in manual_map:
        return manual_map[text_clean]
    # 1. 精确匹配（大小写不敏感 + 去末尾标点）
    norm = normalize(text_clean)
    if not norm:
        return None
    for title in titles:
        if normalize(title) == norm:
            return title
    # 2. 前缀匹配（双向）
    for title in titles:
        tn = normalize(title)
        if tn and (tn.startswith(norm) or norm.startswith(tn)):
            return title
    return None


# ============ 链接替换 ============
unmatched = []


def replace_link(m):
    link_text = m.group(1)
    url = m.group(2)
    if 'mianshiya.com' not in url:
        return m.group(0)

    # 提取旧编号前缀
    num_match = re.match(r'^(\d+)\.\s*(.+)$', link_text)
    if num_match:
        old_num = num_match.group(1)
        text_clean = num_match.group(2)
    else:
        old_num = None
        text_clean = link_text

    title = match_title(text_clean)
    if title:
        new_num = titles[title]
        anchor = slugify(f'{new_num}. {title}')
        if old_num:
            new_text = f'{new_num}. {text_clean}'
        else:
            new_text = link_text
        return f'[{new_text}](#{anchor})'
    else:
        unmatched.append(link_text)
        # 去掉链接，保留文字
        return link_text


text = re.sub(
    r'\[([^\]]+)\]\((https://www\.mianshiya\.com/[^)]+)\)',
    replace_link,
    text,
)


# ============ 标题替换（面试字眼 + 问答形式）============
text = text.replace('面试官追问', '常见问题')
text = text.replace('提问：', '')
text = text.replace('关联面试题', '相关题目')
text = text.replace('面试加分点：', '补充：')
text = text.replace('相关面试题', '相关题目')
text = text.replace('回答重点', '核心要点')

# ============ 正文替换（面试字眼 + 问答形式）============
text = text.replace('是让你在面试中表现出你不仅知道', '能体现出你不仅知道')
text = text.replace(
    '面试官可能会细问 Hashtable 相关的知识点。',
    'Hashtable 相关知识点也值得深入了解。',
)
text = text.replace('面试鸭的《', '《')
text = text.replace('面试鸭《', '《')
text = text.replace('》这题中', '》中')
text = text.replace('》这题', '》')
# 时间轮那句（mianshiya 外链推荐，链接已去掉）
text = text.replace('。关于时间轮的面试题解析可查看：时间轮。', '。')
# 行首的"回答："前缀去掉（问答形式 -> 知识点）
text = re.sub(r'^回答：', '', text, flags=re.M)
# 答题技巧提示去掉
text = text.replace('> 回答时，先说最核心的缓存，再根据数据结构展开说特色功能。\n\n', '')


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('=== 未匹配（已去掉链接保留文字）===')
for u in sorted(set(unmatched)):
    print(' -', u)
print('\n未匹配种类数:', len(set(unmatched)))

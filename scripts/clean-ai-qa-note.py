# -*- coding: utf-8 -*-
"""整理 docs/2026下/14.raw.md：OCR 截图流水账 -> 按主题分章的结构化 Markdown。"""
import io
import re
import sys

SRC = '/tmp/14.raw.md.bak'  # 原始 OCR 流水账备份（整理后已改名为 14.AI问答笔记.md）

# ---------- 1. 主题分组：块起始行 -> (主题序号, 规范化标题) ----------
# 主题顺序即输出章节顺序
TOPICS = [
    'Go 语言',
    'Python',
    '机器学习与算法',
    'Redis 与缓存',
    '云原生与容器（K8s / Docker）',
    '分布式与消息队列',
    '前端与工程实践',
    '其他（读音 / 杂项）',
]

# (start_line, end_line, topic_index, title)  行号为 1-based 闭区间
BLOCKS = [
    (3, 28, 0, 'Goroutine 读音'),
    (30, 134, 0, '函数参数拆解（Go 方法接收者）'),
    (136, 295, 0, 'rune 含义（Go vs JS）'),
    (3656, 3833, 0, 'Go 语言类型特性'),
    (15137, 15363, 0, 'Go 接口方法集：T 与 *T'),
    (15365, 15958, 0, 'Go 抢占式调度与 M / P / G'),
    (16099, 16267, 0, 'Go struct + 方法（对比 JS 对象）'),
    (16269, 16316, 0, 'Go 版本及更新周期'),

    (1972, 2125, 1, 'Python 生成器与迭代器区别'),
    (2127, 3020, 1, 'Python 生成器与迭代器（续）'),
    (3022, 3181, 1, '矩阵转置（zip(*matrix)）'),
    (3509, 3654, 1, 'Python 与 Go 的多线程'),
    (11307, 11692, 1, '鸭子类型与抽象基类'),
    (11694, 12180, 1, '字符串大小写与常用方法'),
    (12182, 12268, 1, 'Python 面试题（64/93）'),
    (12270, 12507, 1, 'range 用法'),
    (12509, 13351, 1, 'Python 解释型语言理解与对比'),
    (13353, 13392, 1, '字符串方法（续）'),
    (13394, 13609, 1, '字典与序列操作'),
    (13611, 13867, 1, 'dict.keys() / list()'),
    (13935, 14910, 1, '用户输入与 or 短路'),

    (297, 955, 2, '1×1 卷积核工作原理'),
    (4822, 5659, 2, 'Boosting 含义'),
    (8174, 8225, 2, '切比雪夫距离'),
    (10304, 10331, 2, '梯度下降相关符号与读法'),
    (10333, 10494, 2, '梯度下降法解释'),
    (10496, 11135, 2, '信息熵与交叉熵公式'),
    (11137, 11305, 2, '损失函数理解与种类'),

    (957, 1336, 3, 'Redis PSync 与主从复制'),
    (1338, 1742, 3, '缓存相关问题及应对'),
    (14912, 15009, 3, 'ioredis 介绍'),
    (15011, 15135, 3, 'AOF / RDB 全称与区别'),

    (5661, 6333, 4, 'Affinity 含义（K8s 亲和性）'),
    (6335, 6746, 4, 'Sidecar 模式含义'),
    (6748, 7884, 4, 'etcd 读音及 K8s 相关'),
    (7886, 8172, 4, 'Alpine 镜像的含义'),
    (8227, 8405, 4, 'Swarm 含义'),
    (8407, 10302, 4, 'Docker 面试题'),
    (15960, 16000, 4, 'daemon 含义'),
    (16002, 16097, 4, 'Docker 查看镜像及时间'),

    (1744, 1850, 5, 'Broker 本来含义'),
    (1852, 1970, 5, '分布式事务与 Saga 模式'),

    (3183, 3206, 6, '组件库 SSR 注意事项'),
    (3208, 3507, 6, 'SSR 水合一致性与 DOM'),
    (3835, 3877, 6, '抖音链接调用方式'),
    (3879, 4820, 6, 'LangChain 与 LangGraph 区别'),

    (13869, 13933, 7, '名字读音'),
]

# ---------- 2. 噪声行 ----------
NOISE_EXACT = {
    '', '=', 'B', 'A', 'C', 'D', '#', 'Q', 'O', 'の', '①', 'く', '<', '>', '>>',
    'AI 生成可能有误 注意核实', '内容由 AI生成，不能完全保障真安', '查看完整内容',
    '提取文字〉', '提取文字', '上一题', '题解', '自测', '讨论', '再测一次',
    '知识点：', '面试鸭 -刷题页', '面试鸭-刷题页', '面试鸭', '面试鸭-刷题页',
    '•0.', '•o.', '.o.', '•ll', '•il', '•ll 5G', '•il 5G', '•ll 5G O', '•il 5G O', '5G',
    '••', '•••', '...', '..', '.. O', '... O', '口', '止', '口止', '丛', '支', 'all',
    '1个待取件', '2个待取件', '个待取件',
    '快速〉', '快速）', 'タ 快速）', 'タ快速', '快速', 'タ 快速',
    '乙 帮我写作', '帮我写作', '令AI创作', '★AI創作', '★AI创作', 'AI 创作', 'AI创作',
    '园拍题答疑', '艮拍题答疑', '日拍題答疑', '拍题答疑', '日豆包P图', 'Q豆包P图', '豆包P图',
    '发消息或按住说话', '& Ф »', 'Ф', '»', '表格', '记事本', '搜索',
    '机器学习面试题', 'Python 面试题', '云原生面试题', 'Docker 面试题',
    '深度学习面试题', 'Kafka 面试题', 'Go 面试题', 'Redis 面试题', 'Java 面试题',
    'MySQL 面试题', 'Python 面武題', '面试鸭官方', '作者：面试鸭官方',
    '凸 买前问豆包', '买前问豆包', 'Q拍題答疑', '◎', '↓', '↑', 'VIP', 'VIP 会员',
}
NOISE_RE = [
    re.compile(r'^发消息或按住说话'),
    re.compile(r'^下一题'),
    re.compile(r'^上一題'),
    re.compile(r'^下一題'),
    re.compile(r'^内容由 ?AI'),
    re.compile(r'^\d{1,2}:\d{2}\s'),          # 时间 08:10
    re.compile(r'^\d{1,2}:\d{2}$'),
    re.compile(r'^[•·]{1,2}[il]{1,2}\s*5G'),  # 信号栏 •ll 5G / •il 5G O
    re.compile(r'^\d+个待取件'),
    re.compile(r'^.*面[武试]题（\d+/\d+）'),      # 来源栏带题号
    re.compile(r'^.*面[武试]题$'),               # 来源栏无题号
    re.compile(r'^面试鸭'),
    re.compile(r'^作者：'),
]

# ---------- 3. 代码行判定 ----------
CODE_KEY = re.compile(
    r'(print\s*\(|def |class |import |from .+ import |return |self\.|fmt\.|'
    r'func |type .+ struct|struct |package |go func|var |const |let |'
    r'\bfor\b.*\bin\b|\bwhile\b|\bif\b.*:|\belse:|\belif |'
    r'^\s*#|^\s*//|console\.log|\(\)|\[\]|\{\})'
)


# 只要行内出现这些词，就判定为截图 UI 残留（正文中不会出现）
NOISE_CONTAIN = (
    '帮我写作', '拍题答疑', '拍題答疑', '发消息或按住', '夋消息或按住', 'AI创作', 'AI 创作',
    'AI創作', '买前问豆包', '豆包P图', '豆包P图', '快速〉', '快速）', '待取件',
    'AI 生成可能有误', '内容由 AI生成', '查看完整内容', '提取文字',
    'Al创作', 'A1创作', 'の', 'ヲ', 'タ 快速', '乡快速', '艮拍题', '园拍题', '日拍題', 'Q拍題',
    '上一题', '上一題', '下一题', '下一題', '面试鸭', '面武題', '再测一次',
    '作者：', 'VIP', '收藏', '分享',
)


def is_noise(s):
    if s in NOISE_EXACT:
        return True
    for w in NOISE_CONTAIN:
        if w in s:
            return True
    for r in NOISE_RE:
        if r.match(s):
            return True
    # 信号栏：行首少量非中文字符后接 5G
    if re.match(r'^[^\u4e00-\u9fa5]{0,8}5G', s) and len(s) <= 16:
        return True
    return False


def is_code(s):
    if not s:
        return False
    if s.startswith('    '):
        return True
    if s.startswith('#') or s.startswith('//'):
        return True
    return bool(CODE_KEY.search(s))


def norm_title(s):
    return re.sub(r'[〉>•．.…·\s]+', '', s)


def clean_block_lines(raw_lines, title=''):
    """去掉噪声行 + 行号行 + 与块标题重复的行，返回清洗后的行列表。"""
    nt = norm_title(title)
    out = []
    for s in raw_lines:
        if is_noise(s):
            continue
        if re.match(r'^\d{1,3}$', s):      # 纯数字行号残留
            continue
        ns = norm_title(s)
        # 截图标题栏重复出现（同一问答的多张截图都带同一标题）
        if nt and ns and (ns == nt or (len(ns) >= 4 and nt.startswith(ns))):
            continue
        # 截图标题栏：块首几行内形如「xxx〉」「xxx）」的短行
        if len(out) <= 3 and len(s) <= 30 and re.search(r'[〉）]\s*$', s):
            continue
        out.append(s)
    # 去掉首尾空行
    while out and not out[0]:
        out.pop(0)
    while out and not out[-1]:
        out.pop()
    return out


def fence(lines):
    """把连续的代码行包成 ``` 围栏；小标题行转 ####。"""
    out = []
    i = 0
    n = len(lines)
    while i < n:
        s = lines[i]
        # 答题结构小标题
        if s in ('回答重点', '扩展知识', '面试官追问', '答案解析', '官方解析', '延伸'):
            out.append('')
            out.append('#### ' + s)
            out.append('')
            i += 1
            continue
        if is_code(s):
            j = i
            while j < n and (is_code(lines[j]) or lines[j] == ''):
                if lines[j] == '' and not (j + 1 < n and is_code(lines[j + 1])):
                    break
                j += 1
            seg = [x for x in lines[i:j] if x != '']
            if len(seg) == 1 and len(seg[0]) < 60 and '`' not in seg[0]:
                # 单行碎片代码 -> 行内代码，避免出现大量单行围栏
                out.append('`' + seg[0] + '`')
                i = j
                continue
            if len(seg) >= 1:
                lang = 'go' if any(re.search(r'\b(func|package|fmt\.|struct)\b', x) for x in seg) else 'python'
                out.append('')
                out.append('```' + lang)
                out.extend(seg)
                out.append('```')
                out.append('')
                i = j
                continue
        out.append(s)
        i += 1
    return out


def main():
    text = io.open(SRC, encoding='utf-8').read()
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')

    out = []
    out.append('# AI 问答与刷题笔记（2026-09）')
    out.append('')
    out.append('> 由手机截图 OCR 提取整理，按主题归并。OCR 可能存在错字，代码为截图还原，仅供参考。')
    out.append('')

    covered = 0
    for ti, topic in enumerate(TOPICS):
        blocks = [b for b in BLOCKS if b[2] == ti]
        if not blocks:
            continue
        out.append('## %d. %s' % (ti + 1, topic))
        out.append('')
        prev_title = None
        for (s, e, _ti, title) in sorted(blocks, key=lambda x: x[0]):
            raw = [x.strip() for x in lines[s - 1:e]]
            covered += (e - s + 1)
            body = clean_block_lines(raw, title)
            if not body:
                continue
            if title != prev_title:
                out.append('### ' + title)
                out.append('')
                prev_title = title
            out.extend(fence(body))
            out.append('')
    # 压缩连续空行，标题前后保证恰好一个空行
    norm = []
    for l in out:
        if l == '' and norm and norm[-1] == '':
            continue
        norm.append(l)
    text = '\n'.join(norm)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.rstrip('\n') + '\n', covered, len(lines)


if __name__ == '__main__':
    content, covered, total = main()
    dst = sys.argv[1] if len(sys.argv) > 1 else '/tmp/14.clean.md'
    io.open(dst, 'w', encoding='utf-8', newline='\n').write(content)
    print('total lines: %d, covered: %d (%.1f%%), out lines: %d'
          % (total, covered, covered * 100.0 / total, content.count('\n')))

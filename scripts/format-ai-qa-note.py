# -*- coding: utf-8 -*-
"""对已清洗的笔记做二次排版：合并 OCR 断行、统一列表符号、结构化刷题题目。"""
import io
import re
import sys

LIST_RE = re.compile(r'^([-•·*]\s+|\d+[.、]\s+|[（(]\d+[)）]\s*)')
FENCE_MARK = '```'
END_PUNCT = '。？！：；…》）)］】」”"\''


def is_list_start(s):
    return bool(LIST_RE.match(s))


def is_inline_code_line(s):
    return bool(re.match(r'^`.*`$', s))


def is_cjk(ch):
    return bool(ch) and ('\u4e00' <= ch <= '\u9fff')


def join_pair(a, b):
    if not a or not b:
        return a + b
    la, fb = a[-1], b[0]
    a_ascii = bool(re.match(r'[A-Za-z0-9]', la))
    b_ascii = bool(re.match(r'[A-Za-z0-9]', fb))
    a_cjk, b_cjk = is_cjk(la), is_cjk(fb)
    # 中英/英中之间补一个空格，避免 "go-ru-tin相关配套" 这类粘连
    if (a_ascii and b_ascii) or (a_ascii and b_cjk) or (a_cjk and b_ascii):
        return a + ' ' + b
    return a + b


def is_block_start(s):
    if not s:
        return True
    if s.startswith('#') or s.startswith('>') or s.startswith(FENCE_MARK):
        return True
    if s.startswith('**') or s.startswith('|'):
        return True
    return is_list_start(s)


def merge_wrapped(lines):
    """合并被 OCR 截断的换行（代码块与标题内不处理）。"""
    out = []
    infence = False
    for raw in lines:
        s = raw.rstrip()
        if s.startswith(FENCE_MARK):
            infence = not infence
            out.append(s)
            continue
        if infence or s.startswith('#') or s.startswith(FENCE_MARK):
            out.append(s)
            continue
        if not out or out[-1] == '' or is_block_start(s) or is_inline_code_line(s):
            out.append(s)
            continue
        prev = out[-1]
        if prev.startswith(FENCE_MARK) or is_block_start(prev) or is_inline_code_line(prev):
            out.append(s)
            continue
        if prev.rstrip()[-1:] in END_PUNCT:
            out.append(s)
            continue
        out[-1] = join_pair(prev, s)
    return out


def norm_list(lines):
    """• / ・ 等统一成 - ，并规范化缩进。"""
    out = []
    infence = False
    for s in lines:
        if s.startswith(FENCE_MARK):
            infence = not infence
            out.append(s)
            continue
        if infence:
            out.append(s)
            continue
        m = re.match(r'^[•·]\s*(.*)$', s)
        if m:
            out.append('- ' + m.group(1))
            continue
        m = re.match(r'^(\d+)[.、]\s+(.*)$', s)
        if m and m.group(2):
            out.append('%s. %s' % (m.group(1), m.group(2)))
            continue
        out.append(s)
    return out


# ---------- 刷题题目结构化 ----------
Q_STEM = re.compile(r'^(\d+)[.、]\s+(.+)$')
OPT = re.compile(r'^([A-D])[\s.、]+\s*(.+)$')
ANS = re.compile(r'^正确答案：\s*([A-D])\s*你?的?答案：\s*([A-D])?')
ANS2 = re.compile(r'^正确答案：\s*([A-D])')
EXPLAIN = re.compile(r'^官方解析[:：]\s*(.*)$')


def format_quiz(lines):
    """把「题干 + 选项 + 正确答案 + 官方解析」整理成统一块。"""
    out = []
    i = 0
    n = len(lines)
    infence = False
    while i < n:
        s = lines[i]
        if s.startswith(FENCE_MARK):
            infence = not infence
            out.append(s)
            i += 1
            continue
        if infence or not s:
            out.append(s)
            i += 1
            continue

        m = Q_STEM.match(s)
        # 题干：编号开头，且后续 6 行内出现选项
        if m and not s.startswith('###'):
            look = lines[i + 1:i + 7]
            opts = [x for x in look if OPT.match(x)]
            if len(opts) >= 2:
                stem = m.group(2)
                i += 1
                # 题干被 OCR 断行时，合并后续非选项行（直到出现问号或选项）
                guard = 0
                while (i < n and lines[i] and guard < 4
                       and not OPT.match(lines[i])
                       and not ANS.match(lines[i]) and not ANS2.match(lines[i])
                       and not EXPLAIN.match(lines[i])
                       and not lines[i].startswith('知识点')
                       and not lines[i].startswith(FENCE_MARK)
                       and not Q_STEM.match(lines[i])
                       and not stem.endswith(('？', '?'))):
                    stem = join_pair(stem, lines[i])
                    i += 1
                    guard += 1
                out.append('')
                out.append('**%s. %s**' % (m.group(1), stem))
                out.append('')
                # 选项
                cnt = 0
                while i < n and OPT.match(lines[i]):
                    om = OPT.match(lines[i])
                    out.append('- %s. %s' % (om.group(1), om.group(2)))
                    cnt += 1
                    i += 1
                # OCR 吃掉选项字母时（如 "D 两个指向…" 变成 "两个指向…"），补齐为 D
                if (cnt < 4 and i < n and lines[i]
                        and not (ANS.match(lines[i]) or ANS2.match(lines[i]))
                        and not EXPLAIN.match(lines[i])
                        and not lines[i].startswith('知识点')
                        and len(lines[i]) < 80
                        and any(ANS.match(x) or ANS2.match(x) for x in lines[i:i + 3])):
                    d = lines[i]
                    i += 1
                    guard = 0
                    while (i < n and lines[i] and guard < 3
                           and not (ANS.match(lines[i]) or ANS2.match(lines[i]))
                           and not EXPLAIN.match(lines[i])):
                        d = join_pair(d, lines[i])
                        i += 1
                        guard += 1
                    out.append('- D. %s' % d)
                out.append('')
                # 「选项文本 + 正确答案 + 官方解析」被 OCR 挤在同一行时，先拆开
                if i < n and '正确答案：' in lines[i] and not (ANS.match(lines[i]) or ANS2.match(lines[i])):
                    cur = lines[i]
                    k = cur.find('正确答案：')
                    pre, cur = cur[:k].strip(), cur[k:]
                    if pre:
                        if out and out[-1].startswith('- '):
                            out[-1] = join_pair(out[-1], pre)
                        else:
                            out.append('- D. %s' % pre)
                    lines[i] = cur
                if i < n and '官方解析' in lines[i] and not EXPLAIN.match(lines[i]):
                    cur = lines[i]
                    k = cur.find('官方解析')
                    head, tail = cur[:k].strip(), cur[k:]
                    if head:
                        lines[i] = head
                        lines.insert(i + 1, tail)
                    else:
                        lines[i] = tail
                # 答案
                if i < n:
                    am = ANS.match(lines[i]) or ANS2.match(lines[i])
                    if am:
                        right = am.group(1)
                        mine = am.group(2) if am.lastindex and am.lastindex >= 2 else None
                        txt = '> 正确答案：%s' % right
                        if mine:
                            txt += '（你的答案：%s）' % mine
                        out.append(txt)
                        out.append('')
                        i += 1
                # 解析
                if i < n:
                    em = EXPLAIN.match(lines[i])
                    if em:
                        body = em.group(1)
                        i += 1
                        while (i < n and lines[i] and not is_block_start(lines[i])
                               and not OPT.match(lines[i])
                               and not lines[i].startswith('知识点')):
                            body = join_pair(body, lines[i])
                            i += 1
                        out.append('**解析**：%s' % body)
                        out.append('')
                continue
        # 知识点标签：转成斜体小字
        if s.startswith('知识点：') or s.startswith('知识点:'):
            out.append('')
            out.append('*%s*' % s)
            out.append('')
            i += 1
            continue
        out.append(s)
        i += 1
    return out


def tidy(text):
    lines = text.split('\n')
    # 顺序关键：先抽题目结构（否则选项行会被断行合并吞掉），再统一列表，最后合并断行
    lines = format_quiz(lines)
    lines = norm_list(lines)
    lines = merge_wrapped(lines)
    out = []
    for l in lines:
        if l == '' and out and out[-1] == '':
            continue
        out.append(l)
    res = '\n'.join(out)
    res = re.sub(r'\n{3,}', '\n\n', res)
    return res.rstrip('\n') + '\n'


if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    t = io.open(src, encoding='utf-8').read()
    r = tidy(t)
    io.open(dst, 'w', encoding='utf-8', newline='\n').write(r)
    print('in: %d lines -> out: %d lines' % (t.count('\n'), r.count('\n')))

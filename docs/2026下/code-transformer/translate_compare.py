# -*- coding: utf-8 -*-
"""
机器翻译实战 + 新旧算法对比

用「英语 -> 德语」翻译任务，在同一份数据、同样的训练预算下，
对比两个模型：
  1. LSTM Seq2Seq + Attention   —— Transformer (2017) 之前的主流架构
  2. Transformer                 —— 《Attention Is All You Need》

评估指标：BLEU（机器翻译标准指标，越高越好）

通过这个脚本你可以直观看到：
  - 同样的数据/训练轮数，Transformer 的 BLEU 比 LSTM 更高（进步）
  - 训练 loss 下降更快（并行 + 长距离依赖建模更强）

运行方式：
    python translate_compare.py                 # 默认配置，对比两个模型
    python translate_compare.py --epochs 30     # 调整训练轮数

依赖：仅 torch + numpy（复用同目录下的 transformer_pytorch.py）
"""

import argparse
import math
from collections import Counter

import torch
import torch.nn as nn
import torch.nn.functional as F

from transformer_pytorch import Transformer, make_pad_mask, make_causal_mask


# ===========================================================================
# 0. 数据：小型英德平行语料（内置，保证离线可跑）
# ===========================================================================
# 每行一条 "英文 \t 德文"。刻意包含大量「词序不同」的句子，
# 因为德语动词常放到句尾（SOV），这正是 Transformer 相对 LSTM 的优势场景。
RAW_DATA = """\
hello	hallo
good morning	guten morgen
good evening	guten abend
good night	gute nacht
goodbye	auf wiedersehen
see you later	bis später
thank you	danke
thank you very much	vielen dank
please	bitte
yes	ja
no	nein
sorry	entschuldigung
welcome	willkommen
I love you	ich liebe dich
I like you	ich mag dich
I miss you	ich vermisse dich
I need you	ich brauche dich
I am happy	ich bin glücklich
I am sad	ich bin traurig
I am tired	ich bin müde
I am hungry	ich habe hunger
I am thirsty	ich habe durst
I am a student	ich bin ein student
I am a teacher	ich bin ein lehrer
you are my friend	du bist mein freund
you are beautiful	du bist schön
we are family	wir sind familie
they are students	sie sind studenten
I eat bread	ich esse brot
I drink water	ich trinke wasser
I read a book	ich lese ein buch
I write a letter	ich schreibe einen brief
I go to school	ich gehe zur schule
I go home	ich gehe nach hause
I work hard	ich arbeite hart
I sleep well	ich schlafe gut
I speak english	ich spreche englisch
I speak german	ich spreche deutsch
I like music	ich mag musik
I like coffee	ich mag kaffee
I like tea	ich mag tee
she is my mother	sie ist meine mutter
he is my father	er ist mein vater
she is my sister	sie ist meine schwester
he is my brother	er ist mein bruder
the cat is black	die katze ist schwarz
the dog is white	der hund ist weiß
the house is big	das haus ist groß
the book is small	das buch ist klein
the car is fast	das auto ist schnell
the train is slow	der zug ist langsam
the food is good	das essen ist gut
the coffee is hot	der kaffee ist heiß
the water is cold	das wasser ist kalt
today is monday	heute ist montag
tomorrow is tuesday	morgen ist dienstag
yesterday was sunday	gestern war sonntag
it is sunny today	heute ist es sonnig
it is raining today	heute regnet es
the weather is nice	das wetter ist schön
the weather is bad	das wetter ist schlecht
I like this city	ich mag diese stadt
I live in a city	ich lebe in einer stadt
I live in berlin	ich wohne in berlin
I work in an office	ich arbeite in einem büro
where are you	wo bist du
where do you live	wo wohnst du
what is your name	wie heißt du
how are you	wie geht es dir
how old are you	wie alt bist du
what time is it	wie spät ist es
do you speak english	sprichst du englisch
do you like music	magst du musik
can you help me	kannst du mir helfen
do you understand me	verstehst du mich
I understand you	ich verstehe dich
I know the answer	ich kenne die antwort
I do not know	ich weiß nicht
I do not understand	ich verstehe nicht
I have a question	ich habe eine frage
I have a dream	ich habe einen traum
I have two brothers	ich habe zwei brüder
I have three sisters	ich habe drei schwestern
I have a cat and a dog	ich habe eine katze und einen hund
I want to go home	ich will nach hause gehen
I want to eat	ich will essen
I want to sleep	ich will schlafen
I want to learn german	ich will deutsch lernen
I want to buy a car	ich will ein auto kaufen
I need to go now	ich muss jetzt gehen
I need your help	ich brauche deine hilfe
I will call you later	ich werde dich später anrufen
I will come tomorrow	ich werde morgen kommen
I will go to the store tomorrow	ich werde morgen in den laden gehen
I have never seen this movie	ich habe diesen film nie gesehen
she is reading a very interesting book	sie liest ein sehr interessantes buch
we are going to visit our grandparents	wir werden unsere großeltern besuchen
the cat is sleeping on the sofa	die katze schläft auf dem sofa
my brother plays football every day	mein bruder spielt jeden tag fußball
I like to read books in the evening	ich lese abends gern bücher
he is watching television now	er schaut jetzt fernsehen
they are playing in the garden	sie spielen im garten
the children are very happy today	die kinder sind heute sehr glücklich
my mother cooks delicious food	meine mutter kocht leckeres essen
I bought a new phone yesterday	ich habe gestern ein neues telefon gekauft
we went to the beach last summer	wir sind letzten sommer an den strand gegangen
she will travel to germany next year	sie wird nächstes jahr nach deutschland reisen
he works in a big company	er arbeitet in einer großen firma
the movie was very interesting	der film war sehr interessant
I want to be a doctor	ich will ein arzt werden
she wants to be a teacher	sie will eine lehrerin werden
"""

# 特殊 token
PAD, UNK, BOS, EOS = 0, 1, 2, 3


class Vocabulary:
    """按空格分词的最简词表。教学用途，真实任务应换成 BPE/WordPiece。"""

    def __init__(self):
        self.token2idx = {"<pad>": PAD, "<unk>": UNK, "<bos>": BOS, "<eos>": EOS}
        self.idx2token = {v: k for k, v in self.token2idx.items()}

    def add_sentence(self, sent):
        for tok in sent.split():
            if tok not in self.token2idx:
                idx = len(self.token2idx)
                self.token2idx[tok] = idx
                self.idx2token[idx] = tok

    def encode(self, sent, add_bos=False, add_eos=False):
        toks = [self.token2idx.get(t, UNK) for t in sent.split()]
        if add_bos:
            toks = [BOS] + toks
        if add_eos:
            toks = toks + [EOS]
        return toks

    def decode(self, idxs):
        return " ".join(self.idx2token.get(i, "<unk>") for i in idxs)

    def __len__(self):
        return len(self.token2idx)


def build_template_pairs():
    """模板生成有规律的英德句对，聚焦「德语动词句尾」的长距离词序依赖。

    英语:  S + will/can + V + O   （动词紧跟在助动词后）
    德语:  S + 助动词 + O + V     （主动词被推到句尾）

    这正是 Transformer 相对 LSTM 的核心优势场景：主动词离主语越远，
    越需要「长距离依赖」建模能力。LSTM 只能顺序传递信息，距离越远越容易丢；
    Transformer 的 self-attention 可以直接「看」到任意位置。
    """
    pairs = []
    # (英文主语, 德语代词, will 的变位, can 的变位)
    subjects = [
        ("I", "ich", "werde", "kann"),
        ("you", "du", "wirst", "kannst"),
        ("he", "er", "wird", "kann"),
        ("she", "sie", "wird", "kann"),
        ("we", "wir", "werden", "können"),
        ("they", "sie", "werden", "können"),
    ]
    verbs = [
        ("buy", "kaufen"), ("read", "lesen"), ("eat", "essen"),
        ("see", "sehen"), ("write", "schreiben"), ("drink", "trinken"),
        ("open", "öffnen"), ("find", "finden"), ("bring", "bringen"),
        ("watch", "schauen"),
    ]
    objects = [
        ("the book", "das buch"), ("a car", "ein auto"),
        ("the house", "das haus"), ("the water", "das wasser"),
        ("a letter", "einen brief"), ("the door", "die tür"),
        ("an apple", "einen apfel"), ("the window", "das fenster"),
        ("the movie", "den film"), ("the food", "das essen"),
    ]

    for en_s, de_s, will_c, can_c in subjects:
        for en_v, de_v in verbs:
            for en_o, de_o in objects:
                # 将来时 will：动词句尾
                pairs.append((f"{en_s} will {en_v} {en_o}",
                              f"{de_s} {will_c} {de_o} {de_v}"))
                # 情态 can：同样动词句尾
                pairs.append((f"{en_s} can {en_v} {en_o}",
                              f"{de_s} {can_c} {de_o} {de_v}"))

    # 长句：两个宾语并列，主动词被推到更远的句尾，拉长「主语→动词」的依赖距离。
    # 句子越长，LSTM 顺序传递越容易遗忘主语信息，Transformer 的自注意力优势越明显。
    obj_pairs = [
        ("the book", "a car", "das buch", "ein auto"),
        ("the house", "the water", "das haus", "das wasser"),
        ("a letter", "the door", "einen brief", "die tür"),
        ("an apple", "the window", "einen apfel", "das fenster"),
        ("the movie", "the food", "den film", "das essen"),
    ]
    for en_s, de_s, will_c, can_c in subjects:
        for en_v, de_v in verbs:
            for en_o1, en_o2, de_o1, de_o2 in obj_pairs:
                pairs.append((f"{en_s} will {en_v} {en_o1} and {en_o2}",
                              f"{de_s} {will_c} {de_o1} und {de_o2} {de_v}"))
                pairs.append((f"{en_s} can {en_v} {en_o1} and {en_o2}",
                              f"{de_s} {can_c} {de_o1} und {de_o2} {de_v}"))
    return pairs


def build_dataset():
    """内置语料 + 模板生成，建共享词表，返回 (train_pairs, test_pairs, vocab)。"""
    import random
    pairs = []
    for line in RAW_DATA.strip().split("\n"):
        en, de = line.split("\t")
        pairs.append((en, de))
    pairs += build_template_pairs()

    vocab = Vocabulary()
    for en, de in pairs:
        vocab.add_sentence(en)
        vocab.add_sentence(de)

    # 固定 seed 随机打乱，前 85% 训练 / 后 15% 测试。
    # 测试集是「训练没见过的具体组合，但遵循同样的词序规则」→ 测的是泛化能力。
    rng = random.Random(42)
    rng.shuffle(pairs)
    n_train = int(len(pairs) * 0.85)
    return pairs[:n_train], pairs[n_train:], vocab


def collate(pairs, vocab):
    """把一批 (en, de) 句子 encode 并 pad 成 tensor。"""
    src = [vocab.encode(en, add_eos=True) for en, _ in pairs]
    tgt = [vocab.encode(de, add_bos=True, add_eos=True) for _, de in pairs]

    src_len = max(len(s) for s in src)
    tgt_len = max(len(t) for t in tgt)

    src_t = torch.full((len(src), src_len), PAD, dtype=torch.long)
    tgt_t = torch.full((len(tgt), tgt_len), PAD, dtype=torch.long)
    for i, s in enumerate(src):
        src_t[i, : len(s)] = torch.tensor(s)
    for i, t in enumerate(tgt):
        tgt_t[i, : len(t)] = torch.tensor(t)
    return src_t, tgt_t


# ===========================================================================
# 1. Baseline：LSTM Seq2Seq + Attention（Luong attention）
# ===========================================================================
# Transformer 出现前，机器翻译的 SOTA 是「双向 LSTM 编码器 + 带注意力的解码器」。
# 它的问题是：只能一步步顺序处理，长距离依赖会随序列变长而衰减，训练无法并行。


class LuongAttention(nn.Module):
    def forward(self, query, keys, src_mask):
        # query: [batch, tgt_len, d]  keys: [batch, src_len, d]
        # score: [batch, tgt_len, src_len]
        score = torch.bmm(query, keys.transpose(1, 2))
        # src_mask: [batch, src_len]，True 表示 pad，屏蔽掉
        score = score.masked_fill(src_mask.unsqueeze(1), -1e9)
        attn = F.softmax(score, dim=-1)
        context = torch.bmm(attn, keys)          # [batch, tgt_len, d]
        return context, attn


class LSTMSeq2Seq(nn.Module):
    def __init__(self, vocab_size, d_model, num_layers=2, dropout=0.1):
        super().__init__()
        self.enc_embed = nn.Embedding(vocab_size, d_model)
        self.dec_embed = nn.Embedding(vocab_size, d_model)
        # 双向 LSTM 编码器
        self.encoder = nn.LSTM(d_model, d_model, num_layers,
                               batch_first=True, dropout=dropout, bidirectional=True)
        self.enc_proj = nn.Linear(d_model * 2, d_model)   # 双向 -> d_model
        # 解码器
        self.decoder = nn.LSTM(d_model, d_model, num_layers,
                               batch_first=True, dropout=dropout)
        self.attn = LuongAttention()
        self.generator = nn.Linear(d_model * 2, vocab_size)  # [lstm_out, context]
        self.dropout = nn.Dropout(dropout)

    def encode(self, src, src_mask):
        # src: [batch, src_len]
        emb = self.dropout(self.enc_embed(src))
        out, _ = self.encoder(emb)                # [batch, src_len, 2d]
        out = self.enc_proj(out)                  # [batch, src_len, d]
        return out

    def decode(self, tgt, enc_out, src_mask):
        # tgt: [batch, tgt_len]，训练时整序列（teacher forcing）
        emb = self.dropout(self.dec_embed(tgt))
        out, _ = self.decoder(emb)                # [batch, tgt_len, d]
        context, _ = self.attn(out, enc_out, src_mask)
        cat = torch.cat([out, context], dim=-1)   # [batch, tgt_len, 2d]
        return self.generator(cat)

    def forward(self, src, tgt, src_mask):
        enc_out = self.encode(src, src_mask)
        return self.decode(tgt, enc_out, src_mask)


# ===========================================================================
# 2. BLEU 计算（简化的标准实现，参考 multi-bleu.perl）
# ===========================================================================
def _ngrams(tokens, n):
    return Counter(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))


def compute_bleu(references, hypotheses, max_n=4):
    """references: list[list[str]]  每个 hyp 对应一个参考（token 列表）。
    hypotheses: list[list[str]] 预测（token 列表）。"""
    precisions = []
    for n in range(1, max_n + 1):
        total, matched = 0, 0
        for ref, hyp in zip(references, hypotheses):
            hyp_ng = _ngrams(hyp, n)
            total += sum(hyp_ng.values())
            ref_ng = _ngrams(ref, n)
            matched += sum((hyp_ng & ref_ng).values())
        precisions.append(matched / total if total > 0 else 0.0)

    # 几何平均
    geo = 1.0
    for p in precisions:
        geo *= p if p > 0 else 1e-12
    geo = geo ** (1.0 / max_n)

    # brevity penalty（惩罚过短的翻译）
    c = sum(len(h) for h in hypotheses)
    r = sum(len(ref) for ref in references)
    bp = 1.0 if c > r else math.exp(1 - r / c) if c > 0 else 0.0
    return 100.0 * bp * geo


# ===========================================================================
# 3. 训练 / 推理 / 评估
# ===========================================================================
def greedy_decode(model, model_type, src_t, vocab, max_len):
    """贪心解码一条 src，返回 token 列表（不含特殊 token）。"""
    model.eval()
    src_mask_bool = (src_t == PAD)                                # [1, src_len]

    with torch.no_grad():
        if model_type == "transformer":
            src_mask = make_pad_mask(src_t, PAD)
            enc_out = model.encode(src_t, src_mask)
            generated = [BOS]
            for _ in range(max_len):
                tgt_input = torch.tensor([generated], dtype=torch.long)
                tgt_mask = make_causal_mask(tgt_input.size(1))
                logits = model.decode(enc_out, tgt_input, src_mask, tgt_mask)
                nxt = logits[0, -1].argmax().item()
                generated.append(nxt)
                if nxt == EOS:
                    break
        else:  # lstm
            enc_out = model.encode(src_t, src_mask_bool)
            generated = [BOS]
            # LSTM 逐步解码，维护 hidden state
            h, c = None, None
            for _ in range(max_len):
                x = torch.tensor([[generated[-1]]], dtype=torch.long)
                emb = model.dec_embed(x)
                if h is None:
                    out, (h, c) = model.decoder(emb)           # 首次用零初始化
                else:
                    out, (h, c) = model.decoder(emb, (h, c))
                context, _ = model.attn(out, enc_out, src_mask_bool)
                logits = model.generator(torch.cat([out, context], dim=-1))
                nxt = logits[0, 0].argmax().item()
                generated.append(nxt)
                if nxt == EOS:
                    break

    return [vocab.idx2token.get(i, "<unk>") for i in generated
            if i not in (BOS, EOS, PAD)]


def beam_search_decode(model, model_type, src_t, vocab, beam_size=4,
                       max_len=50, length_penalty=0.6):
    """束搜索解码（beam search）。

    与贪心解码的区别：贪心每步只取概率最大的一个词，一旦选错就无法回头；
    束搜索每步保留「beam_size」条最可能的部分序列，最后选累计概率最高的完整句子。
    论文 7.1 节报告 beam search（size=4, length penalty=0.6）比贪心 BLEU 更高。

    返回 token 列表（不含特殊 token）。
    """
    model.eval()

    def _lp(score, n_tokens):
        """长度惩罚：除以 长度^alpha，避免模型偏向过短的翻译。"""
        return score / (n_tokens ** length_penalty)

    with torch.no_grad():
        if model_type == "transformer":
            # encoder 只跑一次，结果被所有 beam 共享
            src_mask = make_pad_mask(src_t, PAD)
            enc_out = model.encode(src_t, src_mask)

            beams = [(0.0, [BOS])]           # (累计 log prob, token 序列)
            completed = []

            for _ in range(max_len):
                new_beams = []
                for score, tokens in beams:
                    if tokens[-1] == EOS:
                        completed.append((score, tokens))
                        continue
                    tgt_input = torch.tensor([tokens], dtype=torch.long)
                    tgt_mask = make_causal_mask(tgt_input.size(1))
                    logits = model.decode(enc_out, tgt_input, src_mask, tgt_mask)
                    log_probs = F.log_softmax(logits[0, -1], dim=-1)      # [vocab]
                    # 每个 beam 展开 top 2*beam_size 个候选，最后统一截断
                    top_lp, top_idx = log_probs.topk(beam_size * 2)
                    for lp, idx in zip(top_lp.tolist(), top_idx.tolist()):
                        new_beams.append((score + lp, tokens + [idx]))
                # 按累计 log prob 排序，保留 top beam_size
                new_beams.sort(key=lambda x: x[0], reverse=True)
                beams = new_beams[:beam_size]
                if all(b[1][-1] == EOS for b in beams):
                    break

            best = max(beams + completed, key=lambda x: _lp(x[0], len(x[1])))[1]

        else:  # lstm
            enc_out = model.encode(src_t, (src_t == PAD))
            # 每个 beam 还要维护自己的 LSTM hidden state
            beams = [(0.0, [BOS], None)]     # (score, tokens, hidden)
            completed = []
            for _ in range(max_len):
                new_beams = []
                for score, tokens, hidden in beams:
                    if tokens[-1] == EOS:
                        completed.append((score, tokens))
                        continue
                    x = torch.tensor([[tokens[-1]]], dtype=torch.long)
                    emb = model.dec_embed(x)
                    if hidden is None:
                        out, hidden = model.decoder(emb)
                    else:
                        out, hidden = model.decoder(emb, hidden)
                    context, _ = model.attn(out, enc_out, (src_t == PAD))
                    logits = model.generator(torch.cat([out, context], dim=-1))
                    log_probs = F.log_softmax(logits[0, 0], dim=-1)
                    top_lp, top_idx = log_probs.topk(beam_size * 2)
                    for lp, idx in zip(top_lp.tolist(), top_idx.tolist()):
                        new_beams.append((score + lp, tokens + [idx], hidden))
                new_beams.sort(key=lambda x: x[0], reverse=True)
                beams = new_beams[:beam_size]
                if all(b[1][-1] == EOS for b in beams):
                    break

            best = max(beams + completed, key=lambda x: _lp(x[0], len(x[1])))[1]

    return [vocab.idx2token.get(i, "<unk>") for i in best
            if i not in (BOS, EOS, PAD)]


def train_model(model, model_type, train_pairs, test_pairs, vocab, hp):
    """训练一个模型，返回 (model, history)。
    history = {'loss': [...], 'bleu': [...]}，每个元素对应一个 epoch。"""
    # Transformer 论文用 Adam(betas=(0.9,0.98), eps=1e-9)，两个模型统一用这组。
    optimizer = torch.optim.Adam(model.parameters(), lr=hp.lr, betas=(0.9, 0.98), eps=1e-9)
    loss_fn = nn.CrossEntropyLoss(ignore_index=PAD)

    # Transformer 用 Noam warmup 学习率（lr 先升后降），LSTM 用固定 lr。
    # 这是 Transformer 训练的关键技巧：一开始 lr 太大会导致训练发散/震荡。
    use_noam = (model_type == "transformer")
    step = 0
    warmup = hp.warmup_steps

    history = {"loss": [], "bleu": []}

    model.train()
    for epoch in range(1, hp.epochs + 1):
        total_loss, n = 0.0, 0
        for i in range(0, len(train_pairs), hp.batch_size):
            batch = train_pairs[i:i + hp.batch_size]
            src_t, tgt_t = collate(batch, vocab)

            tgt_in, tgt_out = tgt_t[:, :-1], tgt_t[:, 1:]
            src_mask_bool = (src_t == PAD)                     # [batch, src_len]

            if model_type == "transformer":
                src_mask = make_pad_mask(src_t, PAD)
                tgt_mask = make_causal_mask(tgt_in.size(1)) | make_pad_mask(tgt_in, PAD)
                logits = model(src_t, tgt_in, src_mask, tgt_mask)
            else:
                logits = model(src_t, tgt_in, src_mask_bool)

            loss = loss_fn(logits.reshape(-1, len(vocab)), tgt_out.reshape(-1))
            optimizer.zero_grad()
            loss.backward()
            if use_noam:
                # Noam 学习率：lr = d_model^(-0.5) * min(step^(-0.5), step * warmup^(-1.5))
                step += 1
                lr = hp.d_model ** (-0.5) * min(step ** (-0.5), step * warmup ** (-1.5))
                for g in optimizer.param_groups:
                    g['lr'] = lr
            optimizer.step()
            total_loss += loss.item()
            n += 1

        # 每个 epoch 记录 train loss + 测试集 BLEU（用于画曲线）
        avg_loss = total_loss / n
        bleu = evaluate(model, model_type, test_pairs, vocab)
        history["loss"].append(avg_loss)
        history["bleu"].append(bleu)

        if epoch % 5 == 0 or epoch == hp.epochs:
            print(f"    [{model_type}] epoch {epoch:3d}/{hp.epochs}  "
                  f"loss={avg_loss:.4f}  BLEU={bleu:.2f}")

    return model, history


def evaluate(model, model_type, test_pairs, vocab, decoder="greedy", beam_size=4):
    """在测试集上做解码 + 算 BLEU。
    decoder: 'greedy' 贪心解码 / 'beam' 束搜索解码。"""
    refs, hyps = [], []
    for en, de in test_pairs:
        src_t, tgt_t = collate([(en, de)], vocab)
        if decoder == "beam":
            pred_tokens = beam_search_decode(model, model_type, src_t[0].unsqueeze(0),
                                             vocab, beam_size=beam_size,
                                             max_len=tgt_t.size(1) + 5)
        else:
            pred_tokens = greedy_decode(model, model_type, src_t[0].unsqueeze(0), vocab,
                                        max_len=tgt_t.size(1) + 5)
        refs.append(de.split())
        hyps.append(pred_tokens)
    return compute_bleu(refs, hyps)


def show_samples(model, model_type, test_pairs, vocab, n=5):
    """打印几个真实翻译样例，直观感受两个模型的差异。"""
    model.eval()
    print(f"\n  --- {model_type} 翻译样例 ---")
    for en, de in test_pairs[:n]:
        src_t, _ = collate([(en, de)], vocab)
        pred = greedy_decode(model, model_type, src_t[0].unsqueeze(0), vocab, max_len=30)
        print(f"    输入(en): {en}")
        print(f"    目标(de): {de}")
        print(f"    预测(de): {' '.join(pred)}")
        print()


def plot_training_curves(histories, save_path="training_curves.png"):
    """画训练曲线：左边 train loss，右边 BLEU，两条曲线对比 LSTM vs Transformer。"""
    try:
        import matplotlib
        matplotlib.use("Agg")          # 无界面后端，直接存文件
        import matplotlib.pyplot as plt
    except ImportError:
        print("\n[!] 未安装 matplotlib，跳过画图。安装：pip install matplotlib")
        return

    epochs = list(range(1, len(histories["lstm"]["loss"]) + 1))

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    # 左图：训练 loss
    ax = axes[0]
    ax.plot(epochs, histories["lstm"]["loss"], label="LSTM Seq2Seq", color="#e74c3c", marker="o", markersize=3)
    ax.plot(epochs, histories["transformer"]["loss"], label="Transformer", color="#2980b9", marker="o", markersize=3)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Train Loss")
    ax.set_title("Training Loss")
    ax.legend()
    ax.grid(True, alpha=0.3)

    # 右图：测试集 BLEU
    ax = axes[1]
    ax.plot(epochs, histories["lstm"]["bleu"], label="LSTM Seq2Seq", color="#e74c3c", marker="s", markersize=3)
    ax.plot(epochs, histories["transformer"]["bleu"], label="Transformer", color="#2980b9", marker="s", markersize=3)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("BLEU")
    ax.set_title("BLEU on Test Set")
    ax.legend()
    ax.grid(True, alpha=0.3)

    fig.suptitle("Transformer vs LSTM Seq2Seq (English -> German)", fontsize=13)
    fig.tight_layout()
    fig.savefig(save_path, dpi=150)
    print(f"\n# 训练曲线已保存到 {save_path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--d_model", type=int, default=128)
    ap.add_argument("--batch_size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-3)
    ap.add_argument("--warmup_steps", type=int, default=400,
                    help="Transformer Noam 学习率的 warmup 步数")
    hp = ap.parse_args()

    train_pairs, test_pairs, vocab = build_dataset()
    print(f"# 数据：训练 {len(train_pairs)} 句 / 测试 {len(test_pairs)} 句 / 词表 {len(vocab)} 词")

    # 两个模型用同一组超参，保证公平对比
    def make_transformer():
        return Transformer(len(vocab), len(vocab), d_model=hp.d_model, num_heads=4,
                           num_layers=2, d_ff=hp.d_model * 2, dropout=0.1, max_len=64)

    def make_lstm():
        return LSTMSeq2Seq(len(vocab), d_model=hp.d_model, num_layers=2, dropout=0.1)

    results, histories = {}, {}
    for name, factory in [("lstm", make_lstm), ("transformer", make_transformer)]:
        torch.manual_seed(0)   # 相同随机种子，公平对比
        print(f"\n======== 训练 {name.upper()} ========")
        model = factory()
        model, history = train_model(model, name, train_pairs, test_pairs, vocab, hp)
        results[name] = (history["bleu"][-1], model)
        histories[name] = history
        print(f"  >>> {name} 最终 BLEU = {history['bleu'][-1]:.2f}")

    print("\n================ 对比结果 ================")
    lstm_bleu, _ = results["lstm"]
    tf_bleu, _ = results["transformer"]
    print(f"  LSTM Seq2Seq + Attention : BLEU {lstm_bleu:6.2f}")
    print(f"  Transformer              : BLEU {tf_bleu:6.2f}")
    print(f"  提升                       : {tf_bleu - lstm_bleu:+.2f} 分")
    print("==========================================")

    # 贪心 vs 束搜索（beam search）对比
    print("\n================ 解码方式对比 (Transformer) ================")
    tf_model = results["transformer"][1]
    greedy_bleu = evaluate(tf_model, "transformer", test_pairs, vocab, decoder="greedy")
    beam_bleu = evaluate(tf_model, "transformer", test_pairs, vocab, decoder="beam", beam_size=4)
    print(f"  Transformer + 贪心解码   : BLEU {greedy_bleu:6.2f}")
    print(f"  Transformer + 束搜索(4)  : BLEU {beam_bleu:6.2f}")
    print(f"  束搜索提升                : {beam_bleu - greedy_bleu:+.2f} 分")
    print("============================================================")

    # 画训练曲线
    plot_training_curves(histories, save_path="training_curves.png")

    # 展示样例，直观对比
    show_samples(results["lstm"][1], "lstm", test_pairs, vocab)
    show_samples(results["transformer"][1], "transformer", test_pairs, vocab)


if __name__ == "__main__":
    main()

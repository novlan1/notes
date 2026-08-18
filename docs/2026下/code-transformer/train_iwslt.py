# -*- coding: utf-8 -*-
"""
在真实 IWSLT2016 德语-英语语料上训练 Transformer（机器翻译）

数据：约 20 万句德英平行句对（Hugging Face `iwslt2017` 数据集）
分词：SentencePiece BPE（和原论文、旧仓库 prepro.py 一致的做法）
设备：优先 Apple MPS（Apple Silicon GPU），回退 CPU

运行方式：
    # 快速验证（只取 5000 句，1 个 epoch，几分钟跑完）
    python train_iwslt.py --max_samples 5000 --epochs 1

    # 全量训练（约 20 万句）
    python train_iwslt.py --epochs 10

依赖：torch, datasets, sentencepiece, numpy
"""

import argparse
import math
import os

import torch
import torch.nn as nn
import torch.nn.functional as F

from transformer_pytorch import Transformer, make_pad_mask, make_causal_mask

PAD, UNK, BOS, EOS = 0, 1, 2, 3


def get_device():
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


# ---------------------------------------------------------------------------
# 数据加载 + BPE 分词
# ---------------------------------------------------------------------------
DATA_DIR = "multi30k_data"


def load_data(max_samples=None):
    """加载 multi30k 德语-英语翻译数据集（WMT16 图像描述，约 3 万句）。

    方向：英语 -> 德语（德语 SOV 词序能体现长距离依赖，是 Transformer 优势场景）。
    返回 (train_pairs, valid_pairs)，每条为 (en, de)。
    """
    from datasets import load_dataset
    print("# 加载 multi30k 英德翻译数据集（~3 万句，真实翻译数据）...")
    ds = load_dataset("bentrevett/multi30k")

    def extract(split):
        pairs = []
        for item in ds[split]:
            pairs.append((item["en"], item["de"]))
            if max_samples and len(pairs) >= max_samples:
                break
        return pairs

    train = extract("train")
    valid = extract("validation")
    print(f"# 训练 {len(train)} 句 / 验证 {len(valid)} 句")
    return train, valid


def build_bpe(train_pairs, vocab_size):
    """用 SentencePiece 训练一个联合 BPE 模型（德语+英语共享词表）。"""
    import sentencepiece as spm
    os.makedirs(DATA_DIR, exist_ok=True)
    corpus = os.path.join(DATA_DIR, "corpus.txt")
    with open(corpus, "w", encoding="utf-8") as f:
        for en, de in train_pairs:
            f.write(en + "\n" + de + "\n")

    model_prefix = os.path.join(DATA_DIR, "bpe")
    spm.SentencePieceTrainer.Train(
        f"--input={corpus} --model_prefix={model_prefix} "
        f"--vocab_size={vocab_size} --model_type=bpe "
        f"--pad_id=0 --unk_id=1 --bos_id=2 --eos_id=3"
    )
    sp = spm.SentencePieceProcessor()
    sp.Load(model_prefix + ".model")
    return sp


def encode(sp, sent, add_bos=False, add_eos=False):
    toks = sp.EncodeAsIds(sent)
    if add_bos:
        toks = [BOS] + toks
    if add_eos:
        toks = toks + [EOS]
    return toks


def collate(pairs, sp):
    src = [encode(sp, en, add_eos=True) for en, _ in pairs]      # 英语源
    tgt = [encode(sp, de, add_bos=True, add_eos=True) for _, de in pairs]  # 德语目标
    src_len = max(len(s) for s in src)
    tgt_len = max(len(t) for t in tgt)
    src_t = torch.full((len(src), src_len), PAD, dtype=torch.long)
    tgt_t = torch.full((len(tgt), tgt_len), PAD, dtype=torch.long)
    for i, s in enumerate(src):
        src_t[i, :len(s)] = torch.tensor(s)
    for i, t in enumerate(tgt):
        tgt_t[i, :len(t)] = torch.tensor(t)
    return src_t, tgt_t


# ---------------------------------------------------------------------------
# BLEU
# ---------------------------------------------------------------------------
def compute_bleu(refs, hyps, max_n=4):
    from collections import Counter
    def ng(tokens, n):
        return Counter(tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1))
    precisions = []
    for n in range(1, max_n + 1):
        total = matched = 0
        for r, h in zip(refs, hyps):
            hn = ng(h, n)
            total += sum(hn.values())
            matched += sum((hn & ng(r, n)).values())
        precisions.append(matched / total if total > 0 else 0.0)
    geo = 1.0
    for p in precisions:
        geo *= p if p > 0 else 1e-12
    geo **= (1.0 / max_n)
    c = sum(len(h) for h in hyps)
    r = sum(len(x) for x in refs)
    bp = 1.0 if c > r else math.exp(1 - r / c) if c > 0 else 0.0
    return 100.0 * bp * geo


# ---------------------------------------------------------------------------
# 训练 / 推理
# ---------------------------------------------------------------------------
def greedy_decode(model, sp, src_t, max_len=60):
    """贪心解码（快）：每步只取概率最大的词。用于训练中的快速评估。"""
    model.eval()
    src_mask = make_pad_mask(src_t, PAD)
    with torch.no_grad():
        enc_out = model.encode(src_t, src_mask)
        generated = [BOS]
        for _ in range(max_len):
            tgt_in = torch.tensor([generated], dtype=torch.long, device=src_t.device)
            tgt_mask = make_causal_mask(tgt_in.size(1)).to(src_t.device)
            logits = model.decode(enc_out, tgt_in, src_mask, tgt_mask)
            nxt = logits[0, -1].argmax().item()
            generated.append(nxt)
            if nxt == EOS:
                break
    return [i for i in generated if i not in (BOS, EOS, PAD)]


def beam_search_decode(model, sp, src_t, beam_size=4, max_len=60, length_penalty=0.6):
    """批量化的束搜索解码：beam_size 个 beam 拼成一个 batch 一次前向，比串行快 beam_size 倍。

    这是标准实现。关键点：
      - ys: [beam_size, len] 存 beam_size 条部分序列
      - 每步 batch 前向，得到 [beam_size, vocab] 的 logits
      - 用 topk 同时从所有 beam 展开，再截断回 beam_size 条
    """
    model.eval()
    device = src_t.device
    vocab_size = sp.GetPieceSize()
    src_mask = make_pad_mask(src_t, PAD)

    with torch.no_grad():
        # encoder 跑一次，结果复制 beam_size 份
        enc_out = model.encode(src_t, src_mask).expand(beam_size, -1, -1)   # [beam, src_len, d]
        src_mask = src_mask.expand(beam_size, -1, -1, -1)                   # [beam, 1, 1, src_len]

        ys = torch.full((beam_size, 1), BOS, dtype=torch.long, device=device)
        scores = torch.zeros(beam_size, device=device)
        finished = torch.zeros(beam_size, dtype=torch.bool, device=device)

        for _ in range(max_len):
            tgt_mask = make_causal_mask(ys.size(1)).to(device)
            logits = model.decode(enc_out, ys, src_mask, tgt_mask)     # [beam_size, len, vocab]
            last_lp = F.log_softmax(logits[:, -1], dim=-1)             # [beam_size, vocab]

            # 每个 beam 加上自身累计分数，展开成 [beam_size * vocab] 的候选
            cand_scores = (scores.unsqueeze(1) + last_lp).view(-1)
            top_scores, top_idx = cand_scores.topk(beam_size * 2)
            beam_idx = top_idx // vocab_size      # 候选来自哪个 beam
            token_idx = top_idx % vocab_size      # 候选 token

            new_ys, new_scores, new_finished = [], [], []
            for i in range(top_idx.size(0)):
                bi, ti = beam_idx[i].item(), token_idx[i].item()
                if finished[bi]:
                    continue                       # 已结束的 beam 不再扩展
                new_ys.append(torch.cat([ys[bi], token_idx[i:i + 1]], dim=0))
                new_scores.append(top_scores[i])
                new_finished.append(ti == EOS)
                if len(new_ys) >= beam_size:
                    break

            ys = torch.stack(new_ys)
            scores = torch.stack(new_scores)
            finished = torch.tensor(new_finished, dtype=torch.bool, device=device)

            if finished.all():
                break

        # 选累计分数最高（带长度惩罚）的一条
        lengths = torch.tensor([len(y) for y in ys], dtype=torch.float, device=device)
        ranked = scores / (lengths ** length_penalty)
        best = ys[ranked.argmax()]

    return [i for i in best.tolist() if i not in (BOS, EOS, PAD)]


def train(model, sp, train_pairs, valid_pairs, hp, device):
    optimizer = torch.optim.Adam(model.parameters(), lr=hp.lr, betas=(0.9, 0.98), eps=1e-9)
    loss_fn = nn.CrossEntropyLoss(ignore_index=PAD)
    step = 0
    vocab_size = model.generator.out_features

    for epoch in range(1, hp.epochs + 1):
        model.train()
        total_loss, n = 0.0, 0
        for i in range(0, len(train_pairs), hp.batch_size):
            batch = train_pairs[i:i + hp.batch_size]
            src_t, tgt_t = collate(batch, sp)
            src_t, tgt_t = src_t.to(device), tgt_t.to(device)
            tgt_in, tgt_out = tgt_t[:, :-1], tgt_t[:, 1:]

            src_mask = make_pad_mask(src_t, PAD)
            tgt_mask = make_causal_mask(tgt_in.size(1)).to(device) | make_pad_mask(tgt_in, PAD)
            logits = model(src_t, tgt_in, src_mask, tgt_mask)

            loss = loss_fn(logits.reshape(-1, vocab_size), tgt_out.reshape(-1))
            optimizer.zero_grad()
            loss.backward()
            # Noam warmup 学习率
            step += 1
            lr = hp.d_model ** (-0.5) * min(step ** (-0.5), step * hp.warmup ** (-1.5))
            for g in optimizer.param_groups:
                g["lr"] = lr
            optimizer.step()
            total_loss += loss.item()
            n += 1

        # 每个 epoch 在验证集上算 BLEU（用贪心解码，快；beam search 放最后做一次）
        bleu = evaluate(model, sp, valid_pairs, device, decoder="greedy")
        print(f"  epoch {epoch:3d}/{hp.epochs}  loss={total_loss/n:.4f}  valid BLEU={bleu:.2f}")

    return step


def evaluate(model, sp, valid_pairs, device, decoder="greedy", beam_size=4, max_eval=200):
    """在验证集上做解码 + 算 BLEU。
    decoder: 'greedy'（快，训练中评估用）/ 'beam'（慢，最终评估用）。

    注意：解码用小 batch（≤beam_size），在 Apple 芯片上 CPU 反而比 MPS 快 3 倍
    （MPS 的 GPU kernel 启动开销 > 小矩阵计算本身），所以这里临时把模型切到 CPU。
    """
    model.eval()
    model.to("cpu")   # 解码切 CPU（小 batch 时 CPU 更快）
    refs, hyps = [], []
    try:
        for en, de in valid_pairs[:max_eval]:   # (en 源, de 目标)
            src_t = torch.tensor([encode(sp, en, add_eos=True)], dtype=torch.long)
            if decoder == "beam":
                pred = beam_search_decode(model, sp, src_t, beam_size=beam_size)
            else:
                pred = greedy_decode(model, sp, src_t)
            refs.append(de.split())
            hyps.append([sp.IdToPiece(i).replace("▁", "") for i in pred if i > EOS])
    finally:
        model.to(device)   # 还原回训练设备（MPS）
    return compute_bleu(refs, hyps)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max_samples", type=int, default=None, help="限制训练样本数（快速验证用）")
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch_size", type=int, default=64)
    ap.add_argument("--vocab_size", type=int, default=16000)
    ap.add_argument("--d_model", type=int, default=256)
    ap.add_argument("--num_heads", type=int, default=4)
    ap.add_argument("--num_layers", type=int, default=4)
    ap.add_argument("--d_ff", type=int, default=1024)
    ap.add_argument("--warmup", type=int, default=4000)
    ap.add_argument("--lr", type=float, default=1.0)  # Noam 里 lr 会被调度覆盖，此值仅初始化
    ap.add_argument("--eval_samples", type=int, default=200, help="验证集评估样本数")
    ap.add_argument("--skip_beam", action="store_true", help="跳过最终 beam search 评估（更快）")
    hp = ap.parse_args()

    device = get_device()
    print(f"# 使用设备：{device}")

    train_pairs, valid_pairs = load_data(hp.max_samples)
    print(f"# 训练 BPE 分词器（vocab_size={hp.vocab_size}）...")
    sp = build_bpe(train_pairs, hp.vocab_size)
    vocab_size = sp.GetPieceSize()
    print(f"# 词表大小：{vocab_size}")

    model = Transformer(vocab_size, vocab_size, d_model=hp.d_model, num_heads=hp.num_heads,
                        num_layers=hp.num_layers, d_ff=hp.d_ff, dropout=0.1, max_len=128)
    model = model.to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"# 模型参数量：{n_params/1e6:.1f}M")

    train(model, sp, train_pairs, valid_pairs, hp, device)

    # 训练结束：用 beam search 做一次最终评估 + 展示翻译样例
    if not hp.skip_beam:
        print("\n# 最终评估（beam search）...")
        beam_bleu = evaluate(model, sp, valid_pairs, device, decoder="beam",
                             beam_size=4, max_eval=hp.eval_samples)
        greedy_bleu = evaluate(model, sp, valid_pairs, device, decoder="greedy",
                               max_eval=hp.eval_samples)
        print(f"  贪心解码 BLEU : {greedy_bleu:.2f}")
        print(f"  束搜索 BLEU   : {beam_bleu:.2f}")

        print("\n# 翻译样例：")
        model.eval()
        model.to("cpu")   # 样例解码同样切 CPU（更快）
        for en, de in valid_pairs[:5]:
            src_t = torch.tensor([encode(sp, en, add_eos=True)], dtype=torch.long)
            pred = beam_search_decode(model, sp, src_t)
            pred_text = " ".join(sp.IdToPiece(i).replace("▁", "") for i in pred if i > EOS)
            print(f"  输入(en): {en}")
            print(f"  目标(de): {de}")
            print(f"  预测(de): {pred_text}")
            print()


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
现代 PyTorch 版 Transformer（教学向）

对应论文《Attention Is All You Need》(Vaswani et al., 2017)
https://arxiv.org/abs/1706.03762

这是一个 Encoder-Decoder 架构的完整实现，代码按论文公式 1:1 对应，
每一块都有中文注释。文件自包含，直接运行即可训练一个小型演示任务。

运行方式：
    pip install torch
    python transformer_pytorch.py

依赖：仅 torch（任意 2.x 版本均可，无需 CUDA）。
"""

import math

import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# 1. 位置编码 (Positional Encoding)   —— 论文 3.5 节
# ---------------------------------------------------------------------------
# Transformer 没有 RNN/CNN，本身对序列顺序无感知，
# 因此把「位置」信息以正弦/余弦函数的形式直接加到输入词向量上。
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

        # pe: [max_len, d_model]，第 pos 行 = 位置 pos 的编码向量
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()   # [max_len, 1]
        # 论文公式：div_term = 1 / 10000^(2i / d_model)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)   # 偶数维用 sin
        pe[:, 1::2] = torch.cos(position * div_term)   # 奇数维用 cos
        pe = pe.unsqueeze(0)                            # [1, max_len, d_model]
        # register_buffer：不参与梯度，但会随模型一起 save/load、move 到 GPU
        self.register_buffer("pe", pe)

    def forward(self, x):
        # x: [batch, seq_len, d_model]
        x = x + self.pe[:, : x.size(1)]
        return self.dropout(x)


# ---------------------------------------------------------------------------
# 2. 缩放点积注意力 (Scaled Dot-Product Attention)   —— 论文 3.2.1 节
# ---------------------------------------------------------------------------
#    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
#
# mask 的作用：把「不该被看到的位置」置为 -inf，softmax 后概率归零。
# 两种常见 mask：
#   - padding mask：屏蔽 <pad> 填充位置
#   - causal mask (下三角)：解码时只能看到「当前及之前」的位置（自回归）
def scaled_dot_product_attention(q, k, v, mask=None, dropout=None):
    """
    q: [batch, heads, q_len, d_k]
    k: [batch, heads, k_len, d_k]
    v: [batch, heads, v_len, d_v]
    mask: [batch, heads, q_len, k_len] 或可广播形状，True 表示「被屏蔽」
    """
    d_k = q.size(-1)
    # scores: [batch, heads, q_len, k_len]
    scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)

    if mask is not None:
        # masked_fill：mask 为 True 的地方填一个极小值(-1e9)，softmax 后变成 0
        scores = scores.masked_fill(mask, -1e9)

    attn = F.softmax(scores, dim=-1)
    if dropout is not None:
        attn = dropout(attn)

    output = torch.matmul(attn, v)   # [batch, heads, q_len, d_v]
    return output, attn


# ---------------------------------------------------------------------------
# 3. 多头注意力 (Multi-Head Attention)   —— 论文 3.2.2 节
# ---------------------------------------------------------------------------
# 把 Q/K/V 投影到 h 个不同的子空间，并行做注意力，再拼接。
# 好处：让模型同时关注不同位置、不同表示子空间的信息。
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model 必须能被 num_heads 整除"
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        # 论文里 Q/K/V/O 是四组可学习线性变换
        self.w_q = nn.Linear(d_model, d_model)
        self.w_k = nn.Linear(d_model, d_model)
        self.w_v = nn.Linear(d_model, d_model)
        self.w_o = nn.Linear(d_model, d_model)

        self.dropout = nn.Dropout(dropout)

    def forward(self, q, k, v, mask=None):
        batch = q.size(0)

        # 1) 线性投影，然后按 head 切分：
        #    [batch, q_len, d_model] -> [batch, q_len, heads, d_k] -> [batch, heads, q_len, d_k]
        q = self.w_q(q).view(batch, -1, self.num_heads, self.d_k).transpose(1, 2)
        k = self.w_k(k).view(batch, -1, self.num_heads, self.d_k).transpose(1, 2)
        v = self.w_v(v).view(batch, -1, self.num_heads, self.d_k).transpose(1, 2)

        # 2) 缩放点积注意力
        out, _ = scaled_dot_product_attention(q, k, v, mask, self.dropout)

        # 3) 拼接多个 head，再过一次线性变换
        #    [batch, heads, q_len, d_k] -> [batch, q_len, d_model]
        out = out.transpose(1, 2).contiguous().view(batch, -1, self.num_heads * self.d_k)
        return self.w_o(out)


# ---------------------------------------------------------------------------
# 4. 前馈网络 (Position-wise Feed-Forward Network)   —— 论文 3.3 节
# ---------------------------------------------------------------------------
#    FFN(x) = max(0, xW1 + b1) W2 + b2
# 每个位置独立作用（position-wise），中间维度 d_ff 通常是 d_model 的 4 倍。
class PositionwiseFeedForward(nn.Module):
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.w_1 = nn.Linear(d_model, d_ff)
        self.w_2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        return self.w_2(self.dropout(F.relu(self.w_1(x))))


# ---------------------------------------------------------------------------
# 5. 编码器层 (Encoder Layer)   —— 论文 3.1 节
# ---------------------------------------------------------------------------
# 每个 Encoder 层 = 多头自注意力 + 前馈网络，各自带残差连接 + LayerNorm。
# 这里用论文原版的「后归一化 (post-norm)」：x + Sublayer(x)，再接 LayerNorm。
class EncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.ffn = PositionwiseFeedForward(d_model, d_ff, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, mask):
        # 自注意力：Q=K=V=x
        x = self.norm1(x + self.dropout(self.self_attn(x, x, x, mask)))
        x = self.norm2(x + self.dropout(self.ffn(x)))
        return x


# ---------------------------------------------------------------------------
# 6. 解码器层 (Decoder Layer)   —— 论文 3.1 节
# ---------------------------------------------------------------------------
# 每个 Decoder 层比 Encoder 多一个「交叉注意力」：
#   - masked self-attention：只能看已生成的位置（causal mask）
#   - cross-attention：Q 来自 decoder，K/V 来自 encoder 输出
class DecoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.cross_attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.ffn = PositionwiseFeedForward(d_model, d_ff, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, enc_out, src_mask, tgt_mask):
        # 1) 掩码自注意力（目标序列内部，带 causal mask）
        x = self.norm1(x + self.dropout(self.self_attn(x, x, x, tgt_mask)))
        # 2) 交叉注意力（query=decoder，key/value=encoder 输出）
        x = self.norm2(x + self.dropout(self.cross_attn(x, enc_out, enc_out, src_mask)))
        # 3) 前馈
        x = self.norm3(x + self.dropout(self.ffn(x)))
        return x


# ---------------------------------------------------------------------------
# 7. 完整 Transformer (Encoder + Decoder)
# ---------------------------------------------------------------------------
class Transformer(nn.Module):
    def __init__(self, src_vocab, tgt_vocab, d_model=512, num_heads=8,
                 num_layers=6, d_ff=2048, dropout=0.1, max_len=5000):
        super().__init__()
        # 词嵌入 + 位置编码
        self.encoder_embed = nn.Embedding(src_vocab, d_model)
        self.decoder_embed = nn.Embedding(tgt_vocab, d_model)
        self.pos_enc = PositionalEncoding(d_model, max_len, dropout)

        # N 层堆叠
        self.encoder = nn.ModuleList([
            EncoderLayer(d_model, num_heads, d_ff, dropout) for _ in range(num_layers)
        ])
        self.decoder = nn.ModuleList([
            DecoderLayer(d_model, num_heads, d_ff, dropout) for _ in range(num_layers)
        ])

        # 输出投影：d_model -> 词表大小，softmax 后得到每个词的预测概率
        self.generator = nn.Linear(d_model, tgt_vocab)

        self.d_model = d_model
        self._init_weights()

    def _init_weights(self):
        # 论文提到用 xavier 初始化，embedding 乘以 sqrt(d_model)
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, src, tgt, src_mask, tgt_mask):
        # src: [batch, src_len], tgt: [batch, tgt_len]
        enc_out = self.encode(src, src_mask)
        return self.decode(enc_out, tgt, src_mask, tgt_mask)

    def encode(self, src, src_mask):
        x = self.encoder_embed(src) * math.sqrt(self.d_model)
        x = self.pos_enc(x)
        for layer in self.encoder:
            x = layer(x, src_mask)
        return x

    def decode(self, enc_out, tgt, src_mask, tgt_mask):
        x = self.decoder_embed(tgt) * math.sqrt(self.d_model)
        x = self.pos_enc(x)
        for layer in self.decoder:
            x = layer(x, enc_out, src_mask, tgt_mask)
        return self.generator(x)   # [batch, tgt_len, tgt_vocab]


# ---------------------------------------------------------------------------
# 8. mask 构造工具
# ---------------------------------------------------------------------------
def make_pad_mask(seq, pad_idx):
    """padding mask：位置为 <pad> 的置 True（屏蔽）。
    形状 [batch, 1, 1, seq_len]，可广播到注意力分数的最后两维。"""
    return (seq == pad_idx).unsqueeze(1).unsqueeze(2)


def make_causal_mask(seq_len):
    """causal mask：下三角，屏蔽「未来」位置。
    形状 [1, 1, seq_len, seq_len]。"""
    mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
    return mask.unsqueeze(0).unsqueeze(0)


# ---------------------------------------------------------------------------
# 9. 一个能直接跑的小型演示任务：序列反转 (reverse)
# ---------------------------------------------------------------------------
# 用 encoder-decoder 学「把输入序列倒过来输出」，用来快速验证模型能正常训练。
# 换成真实机器翻译只需：准备 (src, tgt) 平行句对 + 各自词表即可。
def make_reverse_batch(batch_size, seq_len, vocab_size, pad_idx=0, bos_idx=1, eos_idx=2):
    """生成随机 batch：src 是随机序列，tgt 是 src 的反转（前后加 <bos>/<eos>）。"""
    # 普通 token 从 3 开始，避开 0(<pad>) 1(<bos>) 2(<eos>)
    src = torch.randint(3, vocab_size, (batch_size, seq_len))
    tgt = torch.flip(src, dims=[1])
    # 目标序列开头加 <bos>、结尾加 <eos>，与推理时的自回归解码保持一致
    bos = torch.full((batch_size, 1), bos_idx, dtype=torch.long)
    eos = torch.full((batch_size, 1), eos_idx, dtype=torch.long)
    tgt = torch.cat([bos, tgt, eos], dim=1)   # [batch, seq_len+2]
    return src, tgt


def train_demo():
    torch.manual_seed(0)

    # 小规模超参（只为快速跑通，真实任务可调大）
    vocab_size, d_model, num_heads = 32, 64, 4
    num_layers, d_ff, seq_len = 2, 128, 10
    batch_size, steps = 64, 2500
    warmup_steps = 400      # Noam 学习率 warmup 步数

    model = Transformer(vocab_size, vocab_size, d_model, num_heads,
                        num_layers, d_ff, dropout=0.1, max_len=64)
    # 论文用 Adam(betas=(0.9, 0.98), eps=1e-9)；初始 lr 由 Noam 公式在每一步覆盖
    optimizer = torch.optim.Adam(model.parameters(), lr=0, betas=(0.9, 0.98), eps=1e-9)
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)   # 忽略 pad

    model.train()
    for step in range(1, steps + 1):
        src, tgt = make_reverse_batch(batch_size, seq_len, vocab_size)

        # decoder 的输入是 tgt 去掉最后一个词（shift right），预测目标是 tgt 去掉第一个词
        tgt_input = tgt[:, :-1]       # [batch, seq_len-1]
        tgt_label = tgt[:, 1:]        # [batch, seq_len-1]

        src_mask = make_pad_mask(src, pad_idx=0)
        tgt_mask = make_causal_mask(tgt_input.size(1)) | make_pad_mask(tgt_input, pad_idx=0)

        logits = model(src, tgt_input, src_mask, tgt_mask)   # [batch, seq_len-1, vocab]
        loss = loss_fn(logits.reshape(-1, vocab_size), tgt_label.reshape(-1))

        optimizer.zero_grad()
        loss.backward()
        # Noam warmup 学习率：lr = d_model^(-0.5) * min(step^(-0.5), step * warmup^(-1.5))
        # 学习率先升后降，避免一开始 lr 太大导致训练震荡/发散
        lr = d_model ** (-0.5) * min(step ** (-0.5), step * warmup_steps ** (-1.5))
        for g in optimizer.param_groups:
            g['lr'] = lr
        optimizer.step()

        if step % 100 == 0:
            print(f"step {step:4d}  loss = {loss.item():.4f}  lr = {lr:.6f}")

    # 简单推理演示：看模型能否学会反转
    model.eval()
    with torch.no_grad():
        src, tgt = make_reverse_batch(1, seq_len, vocab_size)
        # 贪心解码：从 <bos>=1 开始，逐词生成，直到遇到 <eos>=2
        generated = [1]
        enc_out = model.encode(src, make_pad_mask(src, pad_idx=0))
        for _ in range(seq_len + 2):   # 最长 = seq_len 个词 + <bos> + <eos>
            tgt_input = torch.tensor([generated]).long()
            tgt_mask = make_causal_mask(tgt_input.size(1))
            logits = model.decode(enc_out, tgt_input, make_pad_mask(src, pad_idx=0), tgt_mask)
            next_token = logits[0, -1].argmax().item()
            generated.append(next_token)
            if next_token == 2:   # <eos>
                break

    print("\n输入 :", src[0].tolist())
    print("目标 :", tgt[0].tolist())
    print("预测 :", generated)
    print("\n如果 loss 降到接近 0，说明模型结构正确、训练流程跑通。")


if __name__ == "__main__":
    train_demo()

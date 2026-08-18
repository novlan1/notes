# -*- coding: utf-8 -*-
"""
导出 transformer_pytorch.py 中 Transformer 模型的所有可学习参数到文件。

会生成两个文件（都保存在本脚本所在目录）：
  1. model_params.txt —— 人类可读：每个参数的名称 / 形状 / 参数量 / 完整数值
  2. model_params.pt  —— torch state_dict，可用 torch.load 加载做进一步分析

用法：
    python3 save_params.py                  # 导出「初始化后」的参数
    python3 save_params.py --train-steps 2500   # 先训练 2500 步再导出训练后参数

说明：
  - 代码里 Q/K/V 的投影层命名为 w_q / w_k / w_v（外加输出投影 w_o）。
  - pos_enc（位置编码）内部的 pe 用 register_buffer 注册，不参与梯度更新，
    会在文件里单独列出并标注「非可学习 buffer」。
"""
import argparse
import os

import numpy as np
import torch
import torch.nn as nn

from transformer_pytorch import (
    Transformer,
    make_causal_mask,
    make_pad_mask,
    make_reverse_batch,
)

# 与 transformer_pytorch.py 里 train_demo 完全一致的小规模超参
VOCAB_SIZE, D_MODEL, NUM_HEADS = 32, 64, 4
NUM_LAYERS, D_FF, SEQ_LEN = 2, 128, 10
BATCH_SIZE = 64
WARMUP_STEPS = 400


def build_model() -> Transformer:
    """用与 train_demo 相同的随机种子和超参构建模型。"""
    torch.manual_seed(0)
    return Transformer(VOCAB_SIZE, VOCAB_SIZE, D_MODEL, NUM_HEADS,
                       NUM_LAYERS, D_FF, dropout=0.1, max_len=64)


def train_model(model: Transformer, steps: int) -> None:
    """按论文 Noam warmup 学习率训练 steps 步（逻辑与 train_demo 相同）。"""
    optimizer = torch.optim.Adam(model.parameters(), lr=0, betas=(0.9, 0.98), eps=1e-9)
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)
    model.train()
    for step in range(1, steps + 1):
        src, tgt = make_reverse_batch(BATCH_SIZE, SEQ_LEN, VOCAB_SIZE)
        tgt_input, tgt_label = tgt[:, :-1], tgt[:, 1:]
        src_mask = make_pad_mask(src, pad_idx=0)
        tgt_mask = make_causal_mask(tgt_input.size(1)) | make_pad_mask(tgt_input, pad_idx=0)

        logits = model(src, tgt_input, src_mask, tgt_mask)
        loss = loss_fn(logits.reshape(-1, VOCAB_SIZE), tgt_label.reshape(-1))

        optimizer.zero_grad()
        loss.backward()
        lr = D_MODEL ** (-0.5) * min(step ** (-0.5), step * WARMUP_STEPS ** (-1.5))
        for g in optimizer.param_groups:
            g['lr'] = lr
        optimizer.step()

        if step % 500 == 0:
            print(f"  训练进度 step {step:4d}/{steps}  loss = {loss.item():.4f}")


def format_tensor(t: torch.Tensor) -> str:
    """把张量格式化成完整、紧凑、可读的字符串（6 位小数、定点表示、不省略）。"""
    arr = t.detach().cpu().numpy()
    if arr.ndim == 0:
        return f"{float(arr):.6f}"
    with np.printoptions(precision=6, threshold=np.inf, linewidth=120, suppress=True):
        return str(arr)


def write_params(model: Transformer, out_txt: str, out_pt: str) -> None:
    params = list(model.named_parameters())
    buffers = list(model.named_buffers())
    total_params = sum(p.numel() for _, p in params)

    lines = []
    lines.append("=" * 80)
    lines.append("Transformer 模型参数导出")
    lines.append("=" * 80)
    lines.append(f"模型超参: vocab={VOCAB_SIZE}  d_model={D_MODEL}  num_heads={NUM_HEADS}  "
                 f"num_layers={NUM_LAYERS}  d_ff={D_FF}")
    lines.append(f"可学习参数张量数量: {len(params)}")
    lines.append(f"可学习参数总量: {total_params}")
    lines.append(f"非学习 buffer 数量: {len(buffers)}")
    lines.append("")

    lines.append("=" * 80)
    lines.append("一、可学习参数（named_parameters，参与梯度更新）")
    lines.append("=" * 80)
    for i, (name, p) in enumerate(params, 1):
        lines.append("")
        lines.append(f"[{i:2d}] {name}")
        lines.append(f"     shape={list(p.shape)}  dtype={p.dtype}  "
                     f"numel={p.numel()}  requires_grad={p.requires_grad}")
        lines.append("     value =")
        for line in format_tensor(p).splitlines():
            lines.append("     " + line)

    if buffers:
        lines.append("")
        lines.append("=" * 80)
        lines.append("二、非学习 buffer（named_buffers，不参与梯度，但随 state_dict 保存）")
        lines.append("=" * 80)
        for name, b in buffers:
            lines.append("")
            lines.append(f"  {name}   （pos_enc 位置编码，register_buffer 注册）")
            lines.append(f"     shape={list(b.shape)}  dtype={b.dtype}  "
                         f"numel={b.numel()}  requires_grad={b.requires_grad}")
            lines.append("     value =")
            for line in format_tensor(b).splitlines():
                lines.append("     " + line)

    lines.append("")
    lines.append("=" * 80)
    lines.append(f"完整 state_dict 已同时保存到: {out_pt}")
    lines.append("=" * 80)

    with open(out_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    torch.save(model.state_dict(), out_pt)


def main() -> None:
    parser = argparse.ArgumentParser(description="导出 Transformer 模型参数")
    parser.add_argument("--train-steps", type=int, default=0,
                        help="导出前先训练多少步（默认 0 = 只导出初始化参数）")
    args = parser.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    out_txt = os.path.join(here, "model_params.txt")
    out_pt = os.path.join(here, "model_params.pt")

    model = build_model()
    if args.train_steps > 0:
        print(f"开始训练 {args.train_steps} 步 ...")
        train_model(model, args.train_steps)
        print("训练完成")

    write_params(model, out_txt, out_pt)
    print("参数已导出:")
    print(f"  {out_txt}")
    print(f"  {out_pt}")


if __name__ == "__main__":
    main()

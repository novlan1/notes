"""
17. SVD 奇异值分解（图像压缩）
- 数据：matplotlib 内置示例图 grace_hopper.jpg（600×512 灰度）
- 演示：对图像矩阵做 SVD，保留前 k 个奇异值重建，对比压缩率与视觉质量
"""
import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cbook
import matplotlib.image as mpimg

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 1. 加载图并转灰度（单矩阵，正好对应 A = U Σ V^T）
img_rgb = mpimg.imread(cbook.get_sample_data('grace_hopper.jpg'))
img = img_rgb.mean(axis=2) / 255.0         # RGB → 灰度 (600, 512)，归一化到 [0, 1]
print('原始图像矩阵:', img.shape)          # (600, 512)
m, n = img.shape
print(f'原始元素个数: {m}×{n} = {m * n}')

# 2. 对矩阵做 SVD（full_matrices=False 得到经济型分解，Vt = V^T）
U, S, Vt = np.linalg.svd(img, full_matrices=False)
print('奇异值个数:', S.shape[0])

# 3. 用前 k 个奇异值重建：A_k = U[:, :k] · diag(S[:k]) · Vt[:k, :]
def reconstruct(k):
    approx = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]
    return np.clip(approx, 0, 1)           # 数值误差可能越界，裁剪回 [0, 1]

def compression_ratio(k):
    # 原矩阵存 m×n 个数；压缩后存 k 个奇异值 + U 前 k 列 + V 前 k 行
    return m * n / (k * (m + n + 1))

ks = [5, 20, 50, 100]
for k in ks:
    print(f'k={k:3d}: 压缩率 {compression_ratio(k):6.1f}x，保留能量 {S[:k].sum() / S.sum():.1%}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)

fig, axes = plt.subplots(2, 3, figsize=(15, 10))

# 第一行第一列：原图
axes[0, 0].imshow(img, cmap='gray')
axes[0, 0].set_title('原始图像 (600×512)')

# 其余：不同 k 重建
approx_axes = [axes[0, 1], axes[0, 2], axes[1, 0], axes[1, 1]]
for ax, k in zip(approx_axes, ks):
    ax.imshow(reconstruct(k), cmap='gray')
    ax.set_title(f'k = {k}（压缩 {compression_ratio(k):.1f}x）')

# 右下：奇异值衰减曲线
axes[1, 2].plot(np.arange(1, len(S) + 1), S, color='#1f77b4', linewidth=1.5)
axes[1, 2].set_yscale('log')
axes[1, 2].set_xlabel('奇异值序号')
axes[1, 2].set_ylabel('奇异值大小（对数坐标）')
axes[1, 2].set_title('奇异值衰减曲线')
axes[1, 2].grid(alpha=0.3)

plt.tight_layout()
out = os.path.join(IMG_DIR, '17.svd.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

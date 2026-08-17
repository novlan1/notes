"""
16. GMM + EM 算法
- 笔记章节：第 39/41/44 章（GMM + EM 算法 + 手算例子）
- 用途：高斯混合模型（GMM）通过 EM 算法估计参数，常用于聚类 / 密度估计 / 异常检测

原笔记代码（44.5 节）极简 demo：3 个一维点 + GMM=2 + 输出 E 步责任度
本脚本扩展为：1) 验证原 demo 的 E/M 步可还原；2) 对比不同 K 下的 BIC 选最优组件数
"""
import os
import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.datasets import make_blobs
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============ 案例一：原笔记的 3 个一维点 demo ============
print('=' * 50)
print('案例一：原笔记 3 个一维点 + GMM=2')
print('=' * 50)

X = np.array([[1], [2], [6]])
gmm = GaussianMixture(n_components=2, random_state=1)
gmm.fit(X)
print('E 步责任度（每个样本属于各高斯的概率）:')
print(gmm.predict_proba(X))
print('均值:', gmm.means_.flatten())
print('混合系数:', gmm.weights_)

# ============ 案例二：BIC 选最优 K ============
print()
print('=' * 50)
print('案例二：make_blobs 2 维 4 簇数据，BIC 选最优组件数')
print('=' * 50)

x_2d, y_true = make_blobs(n_samples=300, n_features=2, centers=4, cluster_std=0.6, random_state=42)

bics = []
n_range = range(1, 8)
for n in n_range:
    g = GaussianMixture(n_components=n, random_state=42, n_init=3)
    g.fit(x_2d)
    bics.append(g.bic(x_2d))
best_n = n_range[int(np.argmin(bics))]
print(f'BIC 选最优组件数: {best_n}（BIC 越小越好）')

# 用最优 K 跑一次，输出责任度
g_best = GaussianMixture(n_components=best_n, random_state=42, n_init=3)
labels = g_best.fit_predict(x_2d)
print(f'用 K={best_n} 聚类后, 软分配 γ（前 5 个样本）:')
print(g_best.predict_proba(x_2d[:5]).round(3))

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：BIC 随 K 变化
axes[0].plot(list(n_range), bics, 'o-', linewidth=2, markersize=8)
axes[0].axvline(best_n, color='red', linestyle='--', label=f'BIC 最优 K={best_n}')
axes[0].set_xlabel('K（高斯组件数）')
axes[0].set_ylabel('BIC')
axes[0].set_title('GMM：BIC 选最优组件数（BIC 越小越好）')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：GMM 聚类结果（按硬分配着色）
axes[1].scatter(x_2d[:, 0], x_2d[:, 1], c=labels, cmap='viridis', s=20, alpha=0.6)
# 画簇中心
centers = g_best.means_
axes[1].scatter(centers[:, 0], centers[:, 1], c='red', s=200, marker='X',
                edgecolors='k', linewidth=1.5, label='高斯中心')
axes[1].set_xlabel('x1')
axes[1].set_ylabel('x2')
axes[1].set_title(f'GMM 聚类结果（K={best_n}）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/16.gmm_em.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

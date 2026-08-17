"""
15. 轮廓系数（Silhouette Coefficient）
- 笔记章节：第 38 章
- 用途：无监督聚类的评估指标，衡量「簇内紧 / 簇间远」的程度
- 取值范围：[-1, 1]，越接近 1 越好

原笔记代码（38.3 节）极简 demo：make_blobs + KMeans + silhouette_score
本脚本扩展为：用同一组数据，K=2/3/4 各跑一次 KMeans，看轮廓系数随 K 的变化
"""
import os
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 1. 造数据：2 簇（与原 demo 一致）
X, _ = make_blobs(n_samples=100, centers=2, random_state=42)

# 2. 对比 K=2/3/4
K_range = [2, 3, 4]
results = {}
for k in K_range:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)
    score = silhouette_score(X, labels)
    results[k] = (labels, score)
    print(f'K={k} → 轮廓系数 = {score:.4f}')

best_k = max(results, key=lambda k: results[k][1])
print(f'最优 K = {best_k}（轮廓系数最大）')

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))

for ax, (k, (labels, score)) in zip(axes, results.items()):
    colors = plt.cm.tab10(labels)
    ax.scatter(X[:, 0], X[:, 1], c=colors, s=30, alpha=0.7, edgecolors='k', linewidth=0.3)
    ax.set_title(f'K = {k}\n轮廓系数 = {score:.4f}' + (' ← 最优' if k == best_k else ''))
    ax.set_xlabel('x1')
    ax.set_ylabel('x2')
    ax.grid(alpha=0.3)

plt.suptitle('轮廓系数：评估 K-Means 聚类质量（分数越高越好）', fontsize=13, y=1.02)
plt.tight_layout()

out = 'img/15.silhouette.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

"""
12b. K-means + 轮廓系数（笔记第 29 章原 demo 扩展）
- 笔记 demo：make_blobs 4 簇 + KMeans(4) + silhouette_score
- 扩展：扫描 K=2~8 找最优 K，叠加轮廓系数
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

# 1. 造 4 簇数据
x, y_true = make_blobs(n_samples=1000, n_features=2, random_state=42,
                        centers=[[-1, -1], [4, 4], [8, 8], [2, 2]],
                        cluster_std=[0.4, 0.2, 0.3, 0.2])

# 2. 笔记原 demo：KMeans(4)
model = KMeans(n_clusters=4, n_init=10, random_state=42)
y_pred = model.fit_predict(x)
print(f'K=4 轮廓系数: {silhouette_score(x, y_pred):.4f}')
print('簇中心:\n', model.cluster_centers_)

# 3. 扩展：扫描 K 找最优（综合考虑 SSE + 轮廓系数）
K_range = range(2, 9)
sse = []
silhouettes = []
for k in K_range:
    m = KMeans(n_clusters=k, n_init=10, random_state=42)
    labels = m.fit_predict(x)
    sse.append(m.inertia_)
    silhouettes.append(silhouette_score(x, labels))

best_k_sil = K_range[int(np.argmax(silhouettes))]
print(f'轮廓系数最优 K = {best_k_sil}')

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

# 左图：K=4 聚类结果
axes[0].scatter(x[:, 0], x[:, 1], c=y_pred, cmap='viridis', s=20, alpha=0.6)
axes[0].scatter(model.cluster_centers_[:, 0], model.cluster_centers_[:, 1],
                c='red', s=200, marker='X', edgecolors='k', linewidth=1.5, label='簇中心')
axes[0].set_title(f'K-Means 聚类结果（K=4，轮廓系数={silhouette_score(x, y_pred):.2f}）')
axes[0].set_xlabel('x1')
axes[0].set_ylabel('x2')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 中图：肘部法则
axes[1].plot(list(K_range), sse, 'o-', linewidth=2, markersize=8)
axes[1].axvline(4, color='red', linestyle='--', label='K=4（真实）')
axes[1].set_xlabel('K（簇数）')
axes[1].set_ylabel('SSE（簇内平方和）')
axes[1].set_title('肘部法则：选 K')
axes[1].legend()
axes[1].grid(alpha=0.3)

# 右图：轮廓系数 vs K
axes[2].plot(list(K_range), silhouettes, 'o-', linewidth=2, markersize=8, color='green')
axes[2].axvline(best_k_sil, color='red', linestyle='--', label=f'最优 K={best_k_sil}')
axes[2].set_xlabel('K（簇数）')
axes[2].set_ylabel('轮廓系数')
axes[2].set_title('轮廓系数 vs K（越大越好）')
axes[2].legend()
axes[2].grid(alpha=0.3)

plt.tight_layout()
out = 'img/12b.kmeans_silhouette.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

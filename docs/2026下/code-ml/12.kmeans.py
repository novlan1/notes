"""
12. K-means 聚类
- 造 4 簇数据
- 演示 K-Means 聚类 + 簇中心
- 演示「肘部法则」选 K：SSE 随 K 的变化
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
x, y = make_blobs(n_samples=500, n_features=2, random_state=42,
                  centers=[[-1, -1], [4, 4], [8, 8], [2, 2]],
                  cluster_std=[0.4, 0.2, 0.3, 0.2])

# 2. 训练 K=4
model = KMeans(n_clusters=4, n_init=10, random_state=42)
y_pred = model.fit_predict(x)
print(f'轮廓系数: {silhouette_score(x, y_pred):.4f}（越接近 1 越好）')
print('簇中心:\n', model.cluster_centers_)

# 3. 肘部法则：SSE 随 K 变化
K_range = range(2, 11)
sse = []
for k in K_range:
    m = KMeans(n_clusters=k, n_init=10, random_state=42)
    m.fit(x)
    sse.append(m.inertia_)

# 找肘部（变化率最大的点）
deltas = np.diff(sse)
elbow_k = K_range[np.argmin(deltas) + 1]   # 二阶差分最小
print(f'肘部法则建议 K = {elbow_k}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：聚类结果 + 簇中心
axes[0].scatter(x[:, 0], x[:, 1], c=y_pred, cmap='viridis', s=20, alpha=0.6)
axes[0].scatter(model.cluster_centers_[:, 0], model.cluster_centers_[:, 1],
                c='red', s=200, marker='X', edgecolors='k', linewidth=1.5, label='簇中心')
axes[0].set_xlabel('x1')
axes[0].set_ylabel('x2')
axes[0].set_title(f'K-Means 聚类结果（K=4, 轮廓系数={silhouette_score(x, y_pred):.2f}）')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：肘部法则
axes[1].plot(K_range, sse, 'o-', linewidth=2, markersize=8)
axes[1].axvline(elbow_k, color='red', linestyle='--', label=f'肘部 K={elbow_k}')
axes[1].set_xlabel('K（簇数）')
axes[1].set_ylabel('SSE（簇内平方和）')
axes[1].set_title('肘部法则：选最优 K（SSE 下降变缓的拐点）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = os.path.join(IMG_DIR, '12.kmeans.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

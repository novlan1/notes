"""
13. PCA 主成分分析
- 数据集：鸢尾花（4 维）
- 演示：降到 2 维可视化 + 解释方差比
"""
import os
from sklearn.decomposition import PCA
from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_iris(return_X_y=True)

# PCA 对特征尺度敏感，先标准化
scaler = StandardScaler()
X_std = scaler.fit_transform(X)

# 1. 降到 2 维（便于可视化）
pca2 = PCA(n_components=2)
X_2d = pca2.fit_transform(X_std)
print('降到 2 维:', X_2d.shape)
print('各主成分解释方差比:', pca2.explained_variance_ratio_)
print('累计解释方差比:', pca2.explained_variance_ratio_.sum())

# 2. 保留 95% 方差自动定维
pca95 = PCA(n_components=0.95)
X_95 = pca95.fit_transform(X_std)
print('\n保留 95% 方差自动定维:', X_95.shape)
print('各主成分解释方差比:', pca95.explained_variance_ratio_)

# 3. 解释方差比 vs 主成分数
ratios = []
for n in range(1, 5):
    p = PCA(n_components=n).fit(X_std)
    ratios.append(p.explained_variance_ratio_.sum())

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：PCA 降维后 2D 散点图
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
labels = ['setosa (0)', 'versicolor (1)', 'virginica (2)']
for cls in range(3):
    axes[0].scatter(X_2d[y == cls, 0], X_2d[y == cls, 1], c=colors[cls], s=50, alpha=0.7, label=labels[cls], edgecolors='k', linewidth=0.3)
axes[0].set_xlabel(f'PC1 ({pca2.explained_variance_ratio_[0]:.1%})')
axes[0].set_ylabel(f'PC2 ({pca2.explained_variance_ratio_[1]:.1%})')
axes[0].set_title('PCA 降维：鸢尾花 4 维 → 2 维')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：累计解释方差比
n_range = [1, 2, 3, 4]
axes[1].bar(n_range, ratios, color='#1f77b4', alpha=0.7, label='累计解释方差比')
axes[1].axhline(0.95, color='red', linestyle='--', label='95% 阈值')
for n, r in zip(n_range, ratios):
    axes[1].text(n, r + 0.01, f'{r:.1%}', ha='center', va='bottom', fontsize=10)
axes[1].set_xticks(n_range)
axes[1].set_xticklabels([f'PC{i}' for i in n_range])
axes[1].set_ylim(0, 1.1)
axes[1].set_ylabel('累计解释方差比')
axes[1].set_title('PCA：累计解释方差比')
axes[1].legend()
axes[1].grid(alpha=0.3, axis='y')

plt.tight_layout()
out = os.path.join(IMG_DIR, '13.pca.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

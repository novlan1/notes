"""
14. LDA 线性判别分析
- 数据集：鸢尾花（4 维 → 2 维，监督降维）
- 演示：与 PCA 的关键差异（fit 需要 y、监督降维、最大化类间方差）
- 演示：降维后用逻辑回归分类的效果
"""
import os
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.decomposition import PCA
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_iris(return_X_y=True)

# LDA 是监督降维：fit 需要标签 y；n_components 最大为 (类别数 - 1)
lda = LinearDiscriminantAnalysis(n_components=2)
X_lda = lda.fit_transform(X, y)   # 注意：fit 需要 y（与 PCA 不同）
print('LDA 降维:', X_lda.shape)
print('解释方差比:', lda.explained_variance_ratio_)

# 降到 2 维后用逻辑回归分类
x_train, x_test, y_train, y_test = train_test_split(X_lda, y, test_size=0.2, random_state=22)
clf = LogisticRegression(max_iter=1000).fit(x_train, y_train)
acc = accuracy_score(y_test, clf.predict(x_test))
print(f'LDA 降维后接逻辑回归准确率: {acc:.4f}')

# ============ 对比：PCA 降维（无监督）============
scaler = StandardScaler()
X_std = scaler.fit_transform(X)
pca = PCA(n_components=2).fit(X_std)
X_pca = pca.transform(X_std)
x_train_p, x_test_p, y_train_p, y_test_p = train_test_split(X_pca, y, test_size=0.2, random_state=22)
clf_p = LogisticRegression(max_iter=1000).fit(x_train_p, y_train_p)
acc_p = accuracy_score(y_test_p, clf_p.predict(x_test_p))
print(f'PCA 降维后接逻辑回归准确率: {acc_p:.4f}')

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
labels = ['setosa (0)', 'versicolor (1)', 'virginica (2)']

# 左图：LDA 降维结果（监督）
for cls in range(3):
    axes[0].scatter(X_lda[y == cls, 0], X_lda[y == cls, 1], c=colors[cls], s=50, alpha=0.7, label=labels[cls], edgecolors='k', linewidth=0.3)
axes[0].set_xlabel(f'LD1 ({lda.explained_variance_ratio_[0]:.1%})')
axes[0].set_ylabel(f'LD2 ({lda.explained_variance_ratio_[1]:.1%})')
axes[0].set_title(f'LDA 降维（监督）→ 分类准确率={acc:.2%}')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：PCA 降维结果（无监督）
for cls in range(3):
    axes[1].scatter(X_pca[y == cls, 0], X_pca[y == cls, 1], c=colors[cls], s=50, alpha=0.7, label=labels[cls], edgecolors='k', linewidth=0.3)
axes[1].set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%})')
axes[1].set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%})')
axes[1].set_title(f'PCA 降维（无监督）→ 分类准确率={acc_p:.2%}')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/14.lda.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

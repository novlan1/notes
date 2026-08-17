"""
8. Adaboost vs 单决策树桩
- 数据集：乳腺癌
- 演示：弱分类器（决策树桩）组合成强分类器的效果
"""
import os
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import AdaBoostClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_breast_cancer(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# 1. 单棵决策树桩（弱分类器）
stump = DecisionTreeClassifier(max_depth=1, random_state=22)
stump.fit(x_train, y_train)
stump_score = accuracy_score(y_test, stump.predict(x_test))
print(f'单决策树桩准确率: {stump_score:.4f}')

# 2. AdaBoost：默认弱分类器是深度=1 的决策树桩
n_range = [10, 20, 50, 100, 200]
ada_scores = []
for n in n_range:
    ada = AdaBoostClassifier(n_estimators=n, random_state=22)
    ada.fit(x_train, y_train)
    ada_scores.append(accuracy_score(y_test, ada.predict(x_test)))
    print(f'AdaBoost(n={n}) 准确率: {ada_scores[-1]:.4f}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：单决策树桩 vs AdaBoost 准确率对比
labels = ['单决策树桩'] + [f'AdaBoost(n={n})' for n in n_range]
scores = [stump_score] + ada_scores
colors = ['#1f77b4'] + ['#ff7f0e'] * len(n_range)
bars = axes[0].bar(range(len(labels)), scores, color=colors)
axes[0].set_xticks(range(len(labels)))
axes[0].set_xticklabels(labels, rotation=20, ha='right')
axes[0].set_ylabel('测试集准确率')
axes[0].set_ylim(0.85, 1.0)
axes[0].set_title('单决策树桩 vs AdaBoost（弱分类器组合 → 强分类器）')
for bar, s in zip(bars, scores):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.003,
                 f'{s:.4f}', ha='center', va='bottom', fontsize=9)
axes[0].grid(alpha=0.3, axis='y')

# 右图：AdaBoost 训练集 vs 测试集准确率随 n_estimators 变化
ada_train_scores = []
for n in n_range:
    ada = AdaBoostClassifier(n_estimators=n, random_state=22)
    ada.fit(x_train, y_train)
    ada_train_scores.append(accuracy_score(y_train, ada.predict(x_train)))
axes[1].plot(n_range, ada_train_scores, 'o-', label='训练集', linewidth=2)
axes[1].plot(n_range, ada_scores, 'o-', label='测试集', linewidth=2)
axes[1].set_xlabel('n_estimators（弱分类器数量）')
axes[1].set_ylabel('准确率')
axes[1].set_title('AdaBoost：n_estimators 对拟合的影响')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = os.path.join(IMG_DIR, '8.adaboost.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

"""
9. GBDT 梯度提升树
- 数据集：乳腺癌
- 演示：每棵树拟合前一轮的残差
- 对比 learning_rate 和 n_estimators 对拟合的影响
"""
import os
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_breast_cancer(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# 1. 基础 GBDT
gbdt = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=22)
gbdt.fit(x_train, y_train)
print(f'GBDT 准确率: {accuracy_score(y_test, gbdt.predict(x_test)):.4f}')

# 2. learning_rate 扫描
lr_range = [0.01, 0.05, 0.1, 0.2, 0.5]
train_scores, test_scores = [], []
for lr in lr_range:
    m = GradientBoostingClassifier(n_estimators=100, learning_rate=lr, max_depth=3, random_state=22)
    m.fit(x_train, y_train)
    train_scores.append(accuracy_score(y_train, m.predict(x_train)))
    test_scores.append(accuracy_score(y_test, m.predict(x_test)))
    print(f'lr={lr} → 训练 {train_scores[-1]:.4f}  测试 {test_scores[-1]:.4f}')

# 3. n_estimators 扫描（固定 lr=0.1）
n_range = [10, 30, 50, 100, 200, 300]
train_scores_n, test_scores_n = [], []
for n in n_range:
    m = GradientBoostingClassifier(n_estimators=n, learning_rate=0.1, max_depth=3, random_state=22)
    m.fit(x_train, y_train)
    train_scores_n.append(accuracy_score(y_train, m.predict(x_train)))
    test_scores_n.append(accuracy_score(y_test, m.predict(x_test)))

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：learning_rate 影响
axes[0].plot(lr_range, train_scores, 'o-', label='训练集', linewidth=2)
axes[0].plot(lr_range, test_scores, 'o-', label='测试集', linewidth=2)
axes[0].set_xlabel('learning_rate')
axes[0].set_ylabel('准确率')
axes[0].set_title('GBDT：learning_rate 的影响（lr 越大越激进）')
axes[0].set_xscale('log')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：n_estimators 影响
axes[1].plot(n_range, train_scores_n, 'o-', label='训练集', linewidth=2)
axes[1].plot(n_range, test_scores_n, 'o-', label='测试集', linewidth=2)
axes[1].set_xlabel('n_estimators（树的数量）')
axes[1].set_ylabel('准确率')
axes[1].set_title('GBDT：n_estimators 的影响（轮数太多可能过拟合）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/9.gbdt.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()

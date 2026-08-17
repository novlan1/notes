"""
10. XGBoost 多分类
- 依赖：pip install xgboost
- macOS 额外依赖：brew install libomp（XGBoost 用 OpenMP 并行）
- 数据集：鸢尾花（3 分类）
- 演示：XGBoost（二阶导数 + 正则化 + 并行特征分裂）的效果
"""
import os
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_iris(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# XGBoost：GBDT 的高效实现（二阶导数 + 正则化 + 并行特征分裂）
model = XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=22)
model.fit(x_train, y_train)
print(f'XGBoost 准确率: {accuracy_score(y_test, model.predict(x_test)):.4f}')

# 扫描 max_depth 和 n_estimators
depths = [2, 3, 4, 5, 6, 8]
train_scores, test_scores = [], []
for d in depths:
    m = XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=d, random_state=22)
    m.fit(x_train, y_train)
    train_scores.append(accuracy_score(y_train, m.predict(x_train)))
    test_scores.append(accuracy_score(y_test, m.predict(x_test)))
    print(f'max_depth={d} → 训练 {train_scores[-1]:.4f}  测试 {test_scores[-1]:.4f}')

# 特征重要性
feat_names = load_iris().feature_names
importances = model.feature_importances_

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：max_depth 影响
axes[0].plot(depths, train_scores, 'o-', label='训练集', linewidth=2)
axes[0].plot(depths, test_scores, 'o-', label='测试集', linewidth=2)
axes[0].set_xlabel('max_depth（树的深度）')
axes[0].set_ylabel('准确率')
axes[0].set_title('XGBoost：max_depth 的影响（深度大 → 易过拟合）')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：特征重要性
axes[1].barh(feat_names, importances, color='#2ca02c')
axes[1].set_xlabel('重要性')
axes[1].set_title('XGBoost：特征重要性')
axes[1].grid(alpha=0.3, axis='x')

plt.tight_layout()
out = os.path.join(IMG_DIR, '10.xgboost.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
